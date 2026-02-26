import * as THREE from 'three';
import { SceneManager } from './scene.js';
import { MapRenderer } from './mapRenderer.js';
import { StructureRenderer } from './structureRenderer.js';
import { GameState } from './gameState.js';
import { AIAgent } from './aiAgent.js';
import { GameUI } from './ui.js';
import { Minimap } from './minimap.js';
import { loadTileTextures, loadStructureTextures } from './assetLoader.js';
import { hexToWorld, worldToHex, tileKey } from './hex.js';
import { RESOURCE_TILES, STRUCTURE_DEFS } from './config.js';

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
    this.minimap = new Minimap(document.getElementById('minimap-container'));

    this.tileTextures = null;
    this.structureTextures = null;

    this._hoverTile = null;
    this._aiRunning = false;
    this._mouse = new THREE.Vector2();

    this._bindEvents(canvas);
    this._bindUI();
    this._animate();
  }

  _bindEvents(canvas) {
    canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
    canvas.addEventListener('click', (e) => this._onClick(e));
  }

  _bindUI() {
    this.ui.onStart(async (opts) => this._startGame(opts));
    this.ui.onEndTurn(() => { if (!this._aiRunning) this._doEndTurn(); });
    this.ui.onStructureSelect(() => this.mapRenderer.hideSelect());
    this.ui.onCancel(() => this.mapRenderer.hideSelect());
  }

  async _startGame(opts) {
    this.ui.showLoading(true);

    try {
      const [mapData, tileTex, structTex] = await Promise.all([
        opts.mapValue === 'generate' ? this._generateMap(opts) : this._loadMap(opts.mapValue),
        this.tileTextures || loadTileTextures(),
        this.structureTextures || loadStructureTextures(),
      ]);

      this.tileTextures = tileTex;
      this.structureTextures = structTex;

      this.gameState.init(mapData, opts.humanCount, opts.aiCount, opts.difficulty);
      this.aiAgent = new AIAgent(opts.difficulty);

      this.structureRenderer.setTextures(this.structureTextures);
      this.structureRenderer.clear();
      this.mapRenderer.renderMap(mapData, this.tileTextures);
      this.minimap.renderMap(mapData);

      const center = this.mapRenderer.getCenter();
      this.scene.lookAt(center.x, center.z);

      this.ui.showLoading(false);
      this.ui.showHUD();
      this._updateUI();

      if (this.gameState.currentPlayer.isAI) this._runAITurn();
    } catch (err) {
      console.error('Failed to start:', err);
      this.ui.showLoading(false);
    }
  }

  async _loadMap(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  async _generateMap(opts) {
    const body = { seed: opts.genSeed, width: opts.genWidth, height: opts.genHeight, name: `gen_${Date.now()}` };
    const r = await fetch('/api/generate-map', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const result = await r.json();
    return this._loadMap(result.path);
  }

  _onMouseMove(e) {
    this._mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this._mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.scene.raycaster.setFromCamera(this._mouse, this.scene.camera);
    const tile = this.mapRenderer.raycastTile(this.scene.raycaster);
    if (tile && this.gameState.isValidTile(tile.row, tile.col)) {
      this._hoverTile = tile;
      this.mapRenderer.showHover(tile.row, tile.col);
      this._updateTileInfo(tile.row, tile.col);
    } else {
      this._hoverTile = null;
      this.mapRenderer.hideHover();
      this.ui.setTileInfo('');
    }
  }

  _onClick(e) {
    if (this._aiRunning) return;

    this._mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this._mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.scene.raycaster.setFromCamera(this._mouse, this.scene.camera);

    const tile = this.mapRenderer.raycastTile(this.scene.raycaster);
    if (tile && this.gameState.isValidTile(tile.row, tile.col)) {
      this._hoverTile = tile;
    }

    if (!this._hoverTile) return;
    const { row, col } = this._hoverTile;
    const type = this.ui.selectedStructure;
    const player = this.gameState.currentPlayer;
    if (player.isAI) return;

    if (type) {
      const canP = this.gameState.canPlace(type, row, col, player.id);
      console.log('[CLICK]', { type, row, col, playerId: player.id, canPlace: canP,
        tileType: this.gameState.getTileType(row, col),
        isLand: this.gameState.isLand(row, col),
        affordable: player.canAfford(STRUCTURE_DEFS[type]?.cost || {}) });
      if (canP) {
        const s = this.gameState.placeStructure(type, row, col, player.id);
        console.log('[PLACED]', s.id, s.type, 'at', row, col, 'resources:', { ...player.resources });
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
    let text = type;
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
    if (this.gameState.currentPlayer.isAI) setTimeout(() => this._runAITurn(), 1200);
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

    const roll = this.gameState.rollDice();
    this.ui.showDiceRoll(roll);
    const gains = this.gameState.distributeResources(roll);
    this.ui.showResourceGains(gains, this.gameState.players);
    this.gameState.endTurn();
    this._aiRunning = false;
    this._updateUI();
    if (this.gameState.currentPlayer.isAI) setTimeout(() => this._runAITurn(), 1500);
    else this.ui.setActionsEnabled(true);
  }

  _updateUI() {
    const gs = this.gameState;
    this.ui.updateTurn(gs.turn, gs.currentPlayer);
    this.ui.updatePlayers(gs.players, gs.currentPlayerIndex);
    this.ui.updateAffordability(gs.currentPlayer);
    this.ui.setActionsEnabled(!gs.currentPlayer.isAI);

    const cam = this.scene.camera;
    const t = this.scene.controls.target;
    const dist = cam.position.distanceTo(t);
    const vw = 2 * dist * Math.tan(cam.fov * Math.PI / 360) * cam.aspect;
    const vh = 2 * dist * Math.tan(cam.fov * Math.PI / 360);
    this.minimap.updateViewport(t.x, t.z, vw, vh, 1.0);
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    const cam = this.scene.camera;
    const target = this.scene.controls.target;
    const dist = cam.position.distanceTo(target);
    this.mapRenderer.updateVisibleNumbers(target.x, target.z, dist);
    this.scene.render();
  }
}

new App();
