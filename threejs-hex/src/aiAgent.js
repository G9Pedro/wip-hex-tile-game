import {
  STRUCTURE_DEFS, RESOURCE_TILES, DICE_PROBABILITY, ALL_RESOURCES, WATER_TILES, LAND_TILES,
} from './config.js';
import { getFootprint, getNeighbors, hexDistance, tileKey, computeSettlementNumber } from './hex.js';

export class AIAgent {
  constructor(difficulty = 'medium') {
    this.difficulty = difficulty;
    this.thinkDelay = { easy: 400, medium: 600, hard: 800 }[difficulty] || 600;
  }

  async takeTurn(gameState, callbacks) {
    const player = gameState.currentPlayer;
    if (!player.isAI) return;

    callbacks.onThinkStart?.();
    await this._delay(this.thinkDelay);

    const actions = this._planActions(gameState, player);

    for (const action of actions) {
      await this._delay(300);
      callbacks.onPlace?.(action.type, action.row, action.col);
    }

    await this._delay(400);
    callbacks.onThinkEnd?.();
  }

  _planActions(gameState, player) {
    const actions = [];
    const ownedStructures = [...gameState.structures.values()].filter(s => s.playerId === player.id);
    const turnNum = gameState.turn;

    const priority = this._getStructurePriority(ownedStructures, player, turnNum);

    for (const structType of priority) {
      const def = STRUCTURE_DEFS[structType];
      if (!def || !player.canAfford(def.cost)) continue;

      const scored = this._scoreAllPlacements(gameState, player, structType);
      if (scored.length === 0) continue;

      scored.sort((a, b) => b.score - a.score);

      const pick = this._selectWithNoise(scored);
      if (pick) {
        actions.push({ type: structType, row: pick.row, col: pick.col });
        player.spend(def.cost);
      }
    }

    return actions;
  }

  _getStructurePriority(owned, player, turn) {
    const hasOutpost = owned.some(s => s.type === 'outpost');
    const outpostCount = owned.filter(s => s.type === 'outpost').length;
    const farmCount = owned.filter(s => s.type === 'farm').length;
    const roadCount = owned.filter(s => s.type === 'road').length;

    if (!hasOutpost) return ['outpost', 'road'];

    if (turn < 5) {
      if (roadCount < 2) return ['road', 'outpost', 'farm'];
      if (outpostCount < 2) return ['outpost', 'road', 'farm'];
      return ['farm', 'road', 'outpost'];
    }

    if (turn < 12) {
      return ['farm', 'outpost', 'trade_town', 'road', 'factory', 'wall'];
    }

    return ['castle', 'factory', 'farm', 'trade_town', 'merc_camp', 'outpost', 'road', 'wall'];
  }

  _scoreAllPlacements(gameState, player, type) {
    const results = [];

    for (let r = 0; r < gameState.rows; r++) {
      for (let c = 0; c < gameState.cols; c++) {
        if (!gameState.canPlace(type, r, c, player.id)) continue;

        const score = this._scorePlacement(gameState, player, type, r, c);
        if (score > 0) results.push({ row: r, col: c, score });
      }
    }

    return results;
  }

  _scorePlacement(gameState, player, type, row, col) {
    let score = 0;

    if (STRUCTURE_DEFS[type].footprint) {
      score += this._scoreProduction(gameState, player, type, row, col);
    }

    score += this._scoreStrategic(gameState, player, type, row, col);

    if (type === 'road') {
      score += this._scoreRoadExpansion(gameState, player, row, col);
    }

    return Math.max(0, score);
  }

  _scoreProduction(gameState, player, type, row, col) {
    const footprint = getFootprint(row, col);
    const num = computeSettlementNumber(footprint, gameState.mapData.numbers);
    if (num === 0) return 0;

    const prob = DICE_PROBABILITY[num] || 0;
    let score = prob * 8;

    const resources = new Set();
    for (const { row: fr, col: fc } of footprint) {
      const tt = gameState.getTileType(fr, fc);
      const res = RESOURCE_TILES[tt];
      if (res) resources.add(res);
    }

    const ownedRes = this._getOwnedResources(gameState, player);
    let newRes = 0;
    for (const r of resources) {
      if (!ownedRes.has(r)) newRes++;
    }
    score += newRes * 12;
    score += resources.size * 3;

    if (type === 'farm') score += resources.size * 5;
    if (type === 'factory') score += 15;
    if (type === 'castle') score += 25;

    return score;
  }

  _scoreStrategic(gameState, player, type, row, col) {
    let score = 0;

    const opponents = [...gameState.structures.values()]
      .filter(s => s.playerId !== player.id);

    if (type === 'castle' || type === 'merc_camp') {
      for (const opp of opponents) {
        const d = hexDistance(row, col, opp.row, opp.col);
        if (d < 8) score += (8 - d) * 2;
      }
    }

    if (type === 'wall') {
      for (const opp of opponents) {
        const d = hexDistance(row, col, opp.row, opp.col);
        if (d < 4) score += 10;
      }
    }

    return score;
  }

  _scoreRoadExpansion(gameState, player, row, col) {
    let score = 5;
    const neighbors = getNeighbors(row, col);

    for (const { row: nr, col: nc } of neighbors) {
      const tt = gameState.getTileType(nr, nc);
      const res = RESOURCE_TILES[tt];
      if (res) {
        const n = gameState.getTileNumber(nr, nc);
        const prob = DICE_PROBABILITY[n] || 0;
        score += prob * 1.5;
      }
    }

    const ownedStructures = [...gameState.structures.values()].filter(s => s.playerId === player.id);
    if (ownedStructures.length > 0) {
      const minDist = Math.min(...ownedStructures.map(s => hexDistance(row, col, s.row, s.col)));
      if (minDist > 6) score *= 0.3;
    }

    return score;
  }

  _getOwnedResources(gameState, player) {
    const owned = new Set();
    for (const s of gameState.structures.values()) {
      if (s.playerId !== player.id) continue;
      if (s.yieldResource) owned.add(s.yieldResource);
      if (s.yieldResources) s.yieldResources.forEach(r => owned.add(r));
    }
    return owned;
  }

  _selectWithNoise(scored) {
    if (scored.length === 0) return null;

    const noise = { easy: 0.5, medium: 0.2, hard: 0.05 }[this.difficulty] || 0.2;

    if (Math.random() < noise && scored.length > 1) {
      const idx = Math.floor(Math.random() * Math.min(3, scored.length));
      return scored[idx];
    }
    return scored[0];
  }

  _delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}
