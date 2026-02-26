import * as THREE from 'three';
import { SceneManager } from './scene.js';
import { MapRenderer } from './mapRenderer.js';
import { StructureRenderer } from './structureRenderer.js';
import { GameState } from './gameState.js';
import { AIAgent } from './aiAgent.js';
import { GameUI } from './ui.js';
import { hexToWorld, worldToHex, tileKey } from './hex.js';
import { RESOURCE_TILES, WATER_TILES, TERRAIN_COLORS } from './config.js';

class App {
  constructor() {
    const canvas = document.getElementById('game-canvas');
    const cssOverlay = document.getElementById('css2d-overlay');

    this.scene = new SceneManager(canvas, cssOverlay);
    this.mapRenderer = new MapRenderer(this.scene.scene);
    this.structureRenderer = new StructureRenderer(this.scene.scene, this.mapRenderer);
    this.gameState = new GameState();
    this.aiAgent = null;
    this.ui = new GameUI();

    this._hoverTile = null;
    this._aiRunning = false;
    this._groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._mouse = new THREE.Vector2();
    this._intersection = new THREE.Vector3();

    this._bindEvents(canvas);
    this._bindUI();
    this._animate();
  }

  _bindEvents(canvas) {
    canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
    canvas.addEventListener('click', (e) => this._onClick(e));
  }

  _bindUI() {
    this.ui.onStart(async (opts) => {
      await this._startGame(opts);
    });

    this.ui.onEndTurn(() => {
      if (this._aiRunning) return;
      this._doEndTurn();
    });

    this.ui.onStructureSelect((type) => {
      this.mapRenderer.hideSelect();
    });

    this.ui.onCancel(() => {
      this.mapRenderer.hideSelect();
    });
  }

  async _startGame(opts) {
    this.ui.showLoading(true);

    let mapData;
    try {
      if (opts.mapValue === 'generate') {
        mapData = await this._generateMap(opts);
      } else {
        mapData = await this._loadMap(opts.mapValue);
      }
    } catch (err) {
      console.error('Failed to load map:', err);
      this.ui.showLoading(false);
      return;
    }

    this.gameState.init(mapData, opts.humanCount, opts.aiCount, opts.difficulty);
    this.aiAgent = new AIAgent(opts.difficulty);

    this.mapRenderer.renderMap(mapData);
    this.structureRenderer.clear();

    const center = this.mapRenderer.getCenter();
    this.scene.lookAt(center.x, center.z);

    this.ui.showLoading(false);
    this.ui.showHUD();
    this._updateUI();

    if (this.gameState.currentPlayer.isAI) {
      this._runAITurn();
    }
  }

  async _loadMap(url) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  }

  async _generateMap(opts) {
    const body = {
      seed: opts.genSeed,
      width: opts.genWidth,
      height: opts.genHeight,
      name: `gen_${Date.now()}`,
    };
    const resp = await fetch('/api/generate-map', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const result = await resp.json();
    return this._loadMap(result.path);
  }

  _onMouseMove(e) {
    this._mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this._mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.scene.raycaster.setFromCamera(this._mouse, this.scene.camera);
    if (this.scene.raycaster.ray.intersectPlane(this._groundPlane, this._intersection)) {
      const { row, col } = worldToHex(this._intersection.x, this._intersection.z);
      if (this.gameState.isValidTile(row, col)) {
        this._hoverTile = { row, col };
        this.mapRenderer.showHover(row, col);
        this._updateTileInfo(row, col);
      } else {
        this._hoverTile = null;
        this.mapRenderer.hideHover();
        this.ui.setTileInfo('');
      }
    }
  }

  _onClick(_e) {
    if (this._aiRunning) return;
    if (!this._hoverTile) return;

    const { row, col } = this._hoverTile;
    const type = this.ui.selectedStructure;
    const player = this.gameState.currentPlayer;

    if (player.isAI) return;

    if (type) {
      if (this.gameState.canPlace(type, row, col, player.id)) {
        const s = this.gameState.placeStructure(type, row, col, player.id);
        this.structureRenderer.addStructure(s.id, s.type, row, col, player.rgb);
        this.ui.clearSelection();
        this._updateUI();
      }
    } else {
      this.mapRenderer.showSelect(row, col);
    }
  }

  _updateTileInfo(row, col) {
    const type = this.gameState.getTileType(row, col);
    const num = this.gameState.getTileNumber(row, col);
    const res = RESOURCE_TILES[type];
    let text = `${type}`;
    if (res) text += ` → ${res}`;
    if (num > 0) text += ` [${num}]`;

    const existing = this.gameState.getStructureAt(row, col);
    if (existing) {
      const owner = this.gameState.players[existing.playerId];
      text += ` | ${existing.type} (${owner?.name})`;
    }

    this.ui.setTileInfo(text);
  }

  _doEndTurn() {
    const roll = this.gameState.rollDice();
    this.ui.showDiceRoll(roll);

    const gains = this.gameState.distributeResources(roll);
    this.ui.showResourceGains(gains, this.gameState.players);

    this.gameState.endTurn();
    this._updateUI();

    if (this.gameState.currentPlayer.isAI) {
      setTimeout(() => this._runAITurn(), 1200);
    }
  }

  async _runAITurn() {
    this._aiRunning = true;
    this.ui.setActionsEnabled(false);

    await this.aiAgent.takeTurn(this.gameState, {
      onThinkStart: () => this.ui.showAIThinking(true),
      onThinkEnd: () => this.ui.showAIThinking(false),
      onPlace: (type, row, col) => {
        const player = this.gameState.currentPlayer;
        if (this.gameState.canPlace(type, row, col, player.id)) {
          const s = this.gameState.placeStructure(type, row, col, player.id);
          this.structureRenderer.addStructure(s.id, s.type, row, col, player.rgb);
          this._updateUI();
        }
      },
    });

    this._doAIEndTurn();
  }

  _doAIEndTurn() {
    const roll = this.gameState.rollDice();
    this.ui.showDiceRoll(roll);

    const gains = this.gameState.distributeResources(roll);
    this.ui.showResourceGains(gains, this.gameState.players);

    this.gameState.endTurn();
    this._aiRunning = false;
    this._updateUI();

    if (this.gameState.currentPlayer.isAI) {
      setTimeout(() => this._runAITurn(), 1500);
    } else {
      this.ui.setActionsEnabled(true);
    }
  }

  _updateUI() {
    const gs = this.gameState;
    this.ui.updateTurn(gs.turn, gs.currentPlayer);
    this.ui.updatePlayers(gs.players, gs.currentPlayerIndex);
    this.ui.updateAffordability(gs.currentPlayer);
    this.ui.setActionsEnabled(!gs.currentPlayer.isAI);
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    this.scene.render();
  }
}

new App();
