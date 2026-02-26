import {
  ALL_RESOURCES, RESOURCE_TILES, STRUCTURE_DEFS, DICE_PROBABILITY, WATER_TILES, LAND_TILES, PLAYER_COLORS,
} from './config.js';
import {
  tileKey, parseKey, getFootprint, getNeighbors, computeSettlementNumber, hexDistance,
} from './hex.js';

let _nextId = 1;

export class Player {
  constructor(id, name, rgb, isAI = false) {
    this.id = id;
    this.name = name;
    this.rgb = rgb;
    this.isAI = isAI;
    this.vp = 0;
    this.resources = {};
    for (const r of ALL_RESOURCES) this.resources[r] = 0;
  }

  canAfford(cost) {
    for (const [r, amt] of Object.entries(cost)) {
      if ((this.resources[r] || 0) < amt) return false;
    }
    return true;
  }

  spend(cost) {
    for (const [r, amt] of Object.entries(cost)) this.resources[r] -= amt;
  }

  gain(resource, amount) {
    this.resources[resource] = (this.resources[resource] || 0) + amount;
  }
}

export class GameState {
  constructor() {
    this.mapData = null;
    this.players = [];
    this.currentPlayerIndex = 0;
    this.turn = 1;
    this.phase = 'setup';
    this.structures = new Map();
    this.tileOwnership = new Map();
    this.lastRoll = null;
    this.setupRound = 0;
    this.setupPlaced = new Set();
  }

  init(mapData, humanCount, aiCount, _difficulty) {
    this.mapData = mapData;
    this.players = [];
    const total = humanCount + aiCount;
    for (let i = 0; i < total; i++) {
      const rgb = PLAYER_COLORS[i % PLAYER_COLORS.length];
      const isAI = i >= humanCount;
      const name = isAI ? `AI ${i - humanCount + 1}` : `Player ${i + 1}`;
      const p = new Player(i, name, rgb, isAI);
      for (const r of ALL_RESOURCES) p.resources[r] = 8;
      this.players.push(p);
    }
    this.currentPlayerIndex = 0;
    this.turn = 1;
    this.phase = 'playing';
    this.structures.clear();
    this.tileOwnership.clear();
    this.lastRoll = null;
  }

  get currentPlayer() { return this.players[this.currentPlayerIndex]; }
  get rows() { return this.mapData?.rows || 0; }
  get cols() { return this.mapData?.cols || 0; }

  getTileType(r, c) {
    return this.mapData?.tiles?.[r]?.[c] || null;
  }

  getTileNumber(r, c) {
    return this.mapData?.numbers?.[r]?.[c] || 0;
  }

  isValidTile(r, c) {
    return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
  }

  isLand(r, c) {
    const t = this.getTileType(r, c);
    return t && LAND_TILES.has(t);
  }

  isWater(r, c) {
    const t = this.getTileType(r, c);
    return t && WATER_TILES.has(t);
  }

  getStructureAt(row, col) {
    const key = tileKey(row, col);
    for (const s of this.structures.values()) {
      if (s.centerKey === key) return s;
    }
    return null;
  }

  hasAdjacentOwned(row, col, playerId) {
    const neighbors = getNeighbors(row, col);
    for (const { row: nr, col: nc } of neighbors) {
      const key = tileKey(nr, nc);
      for (const s of this.structures.values()) {
        if (s.playerId === playerId && (s.centerKey === key || s.keys?.includes(key))) return true;
      }
    }
    const key = tileKey(row, col);
    for (const s of this.structures.values()) {
      if (s.playerId === playerId && (s.centerKey === key || s.keys?.includes(key))) return true;
    }
    return false;
  }

  canPlace(type, row, col, playerId) {
    if (!this.isValidTile(row, col)) return false;
    if (this.getStructureAt(row, col)) return false;

    const def = STRUCTURE_DEFS[type];
    if (!def) return false;

    const player = this.players[playerId];
    if (!player.canAfford(def.cost)) return false;

    const isWaterStructure = type === 'ship';
    if (isWaterStructure && !this.isWater(row, col)) return false;
    if (!isWaterStructure && !this.isLand(row, col)) return false;

    if (type === 'port') {
      const neighbors = getNeighbors(row, col);
      const hasWater = neighbors.some(n => this.isWater(n.row, n.col));
      const hasLand = neighbors.some(n => this.isLand(n.row, n.col));
      if (!hasWater || !hasLand) return false;
    }

    const ownedCount = [...this.structures.values()].filter(s => s.playerId === playerId).length;
    if (ownedCount > 0 && !this.hasAdjacentOwned(row, col, playerId)) return false;

    return true;
  }

  placeStructure(type, row, col, playerId) {
    const def = STRUCTURE_DEFS[type];
    const player = this.players[playerId];
    player.spend(def.cost);

    const id = _nextId++;
    const centerKey = tileKey(row, col);
    const footprint = def.footprint ? getFootprint(row, col) : [{ row, col }];
    const keys = footprint.map(f => tileKey(f.row, f.col));

    let yieldResource = null;
    let yieldResources = [];
    let settlementNumber = 0;

    if (def.footprint) {
      settlementNumber = computeSettlementNumber(footprint, this.mapData.numbers);
      const availRes = new Set();
      for (const { row: fr, col: fc } of footprint) {
        const tt = this.getTileType(fr, fc);
        const res = RESOURCE_TILES[tt];
        if (res) availRes.add(res);
      }

      if (type === 'outpost' || type === 'factory') {
        yieldResource = availRes.size > 0 ? [...availRes][0] : null;
      } else if (type === 'farm') {
        yieldResources = [...availRes].slice(0, 2);
      }
    }

    const structure = {
      id, type, row, col, centerKey, keys, playerId,
      settlementNumber, yieldResource, yieldResources,
    };

    this.structures.set(id, structure);
    if (def.vp > 0) player.vp += def.vp;

    return structure;
  }

  rollDice() {
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    this.lastRoll = d1 + d2;
    return this.lastRoll;
  }

  distributeResources(roll) {
    const gains = {};
    for (const player of this.players) gains[player.id] = {};

    for (const s of this.structures.values()) {
      const player = this.players[s.playerId];
      if (!player) continue;

      if (s.type === 'factory' && s.yieldResource) {
        player.gain(s.yieldResource, 1);
        gains[player.id][s.yieldResource] = (gains[player.id][s.yieldResource] || 0) + 1;
        continue;
      }

      if (!s.settlementNumber || s.settlementNumber !== roll) continue;

      if (s.yieldResource) {
        player.gain(s.yieldResource, 1);
        gains[player.id][s.yieldResource] = (gains[player.id][s.yieldResource] || 0) + 1;
      }
      for (const res of s.yieldResources || []) {
        player.gain(res, 1);
        gains[player.id][res] = (gains[player.id][res] || 0) + 1;
      }
    }

    return gains;
  }

  endTurn() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    if (this.currentPlayerIndex === 0) this.turn++;
    this.lastRoll = null;
  }

  getValidPlacements(type, playerId) {
    const valid = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.canPlace(type, r, c, playerId)) {
          valid.push({ row: r, col: c });
        }
      }
    }
    return valid;
  }
}
