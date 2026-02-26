import {
  STRUCTURE_DEFS, ALL_RESOURCES, RESOURCE_EMOJI, RESOURCE_COLORS,
} from './config.js';

const STRUCT_ICONS = {
  road: '/Structures/Roads/road_start.png',
  ship: '/Structures/Ships/ship_0.png',
  port: '/Structures/Settlements/port_0.png',
  outpost: '/Structures/Settlements/outpost_0.png',
  farm: '/Structures/Settlements/farm_0.png',
  trade_town: '/Structures/Settlements/trade_town_0.png',
  factory: '/Structures/Settlements/factory_0.png',
  wall: '/Structures/Walls/wall_h.png',
  merc_camp: '/Structures/Settlements/mercenary_camp_0.png',
  castle: '/Structures/Settlements/castle_0.png',
};

export class GameUI {
  constructor() {
    this.setupScreen = document.getElementById('setup-screen');
    this.hud = document.getElementById('hud');
    this.turnLabel = document.getElementById('turn-label');
    this.playerLabel = document.getElementById('current-player-label');
    this.diceResult = document.getElementById('dice-result');
    this.diceValue = document.getElementById('dice-value');
    this.playerList = document.getElementById('player-list');
    this.structureList = document.getElementById('structure-list');
    this.tileInfo = document.getElementById('tile-info');
    this.btnEndTurn = document.getElementById('btn-end-turn');
    this.btnCancel = document.getElementById('btn-cancel');
    this.resourcePopup = document.getElementById('resource-popup');
    this.resourcePopupContent = document.getElementById('resource-popup-content');
    this.aiIndicator = document.getElementById('ai-indicator');
    this.loadingIndicator = document.getElementById('loading-indicator');
    this.startBtn = document.getElementById('start-btn');
    this.mapSelect = document.getElementById('map-select');
    this.genOptions = document.getElementById('gen-options');

    this._selectedStructure = null;
    this._onStructureSelect = null;
    this._onEndTurn = null;
    this._onCancel = null;
    this._onStart = null;

    this._initSetup();
    this._initActions();
    this._buildStructureButtons();
  }

  _initSetup() {
    this.mapSelect.addEventListener('change', () => {
      this.genOptions.classList.toggle('hidden', this.mapSelect.value !== 'generate');
    });
    this.startBtn.addEventListener('click', () => {
      this._onStart?.({
        mapValue: this.mapSelect.value,
        humanCount: parseInt(document.getElementById('human-count').value) || 1,
        aiCount: parseInt(document.getElementById('ai-count').value) || 2,
        difficulty: document.getElementById('ai-difficulty').value,
        genWidth: parseInt(document.getElementById('gen-width').value) || 80,
        genHeight: parseInt(document.getElementById('gen-height').value) || 80,
        genSeed: document.getElementById('gen-seed').value,
      });
    });
  }

  _initActions() {
    this.btnEndTurn.addEventListener('click', () => this._onEndTurn?.());
    this.btnCancel.addEventListener('click', () => {
      this._selectedStructure = null;
      this._updateStructureButtons();
      this._onCancel?.();
    });
  }

  _buildStructureButtons() {
    this.structureList.innerHTML = '';
    let lastCat = '';

    for (const [key, def] of Object.entries(STRUCTURE_DEFS)) {
      if (def.category !== lastCat) {
        lastCat = def.category;
        const h = document.createElement('div');
        h.className = 'struct-category';
        h.textContent = lastCat;
        this.structureList.appendChild(h);
      }

      const btn = document.createElement('button');
      btn.className = 'structure-btn';
      btn.dataset.type = key;

      const icon = STRUCT_ICONS[key] || '';
      btn.innerHTML = `
        ${icon ? `<img src="${icon}" alt="${def.label}" />` : ''}
        <div class="struct-info">
          <div class="struct-name">${def.label}</div>
          <div class="structure-cost">${this._formatCost(def.cost)}</div>
        </div>
      `;

      btn.addEventListener('click', () => {
        if (btn.classList.contains('disabled')) return;
        this._selectedStructure = this._selectedStructure === key ? null : key;
        this._updateStructureButtons();
        this._onStructureSelect?.(this._selectedStructure);
      });
      this.structureList.appendChild(btn);
    }
  }

  _formatCost(cost) {
    return Object.entries(cost).map(([r, amt]) => `${RESOURCE_EMOJI[r] || r}${amt}`).join(' ');
  }

  _updateStructureButtons() {
    for (const btn of this.structureList.querySelectorAll('.structure-btn')) {
      btn.classList.toggle('selected', btn.dataset.type === this._selectedStructure);
    }
    this.btnCancel.classList.toggle('hidden', !this._selectedStructure);
  }

  onStart(fn) { this._onStart = fn; }
  onStructureSelect(fn) { this._onStructureSelect = fn; }
  onEndTurn(fn) { this._onEndTurn = fn; }
  onCancel(fn) { this._onCancel = fn; }
  get selectedStructure() { return this._selectedStructure; }

  clearSelection() {
    this._selectedStructure = null;
    this._updateStructureButtons();
  }

  showLoading(show) {
    this.loadingIndicator.classList.toggle('hidden', !show);
    this.startBtn.classList.toggle('hidden', show);
  }

  showHUD() {
    this.setupScreen.classList.add('hidden');
    this.hud.classList.remove('hidden');
  }

  updateTurn(turn, player) {
    this.turnLabel.textContent = `Turn ${turn}`;
    this.playerLabel.textContent = player.name;
    this.playerLabel.style.background = `rgba(${player.rgb.join(',')}, 0.25)`;
    this.playerLabel.style.borderLeft = `3px solid rgb(${player.rgb.join(',')})`;
    this.playerLabel.style.paddingLeft = '8px';
  }

  updatePlayers(players, currentIndex) {
    this.playerList.innerHTML = '';
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      const card = document.createElement('div');
      card.className = `player-card glass-panel${i === currentIndex ? ' active' : ''}${p.isAI ? ' ai-player' : ''}`;

      const header = document.createElement('div');
      header.className = 'player-header';
      header.innerHTML = `
        <span class="player-name">
          <span class="player-color-dot" style="background:rgb(${p.rgb.join(',')})"></span>
          ${p.name}${p.isAI ? ' 🤖' : ''}
        </span>
        <span class="player-vp">⭐ ${p.vp}</span>
      `;

      const res = document.createElement('div');
      res.className = 'player-resources';
      for (const r of ALL_RESOURCES) {
        const item = document.createElement('div');
        item.className = 'resource-item';
        item.innerHTML = `<div class="count" style="color:${RESOURCE_COLORS[r]}">${p.resources[r]}</div><div class="label">${RESOURCE_EMOJI[r]}</div>`;
        res.appendChild(item);
      }

      card.appendChild(header);
      card.appendChild(res);
      this.playerList.appendChild(card);
    }
  }

  updateAffordability(player) {
    for (const btn of this.structureList.querySelectorAll('.structure-btn')) {
      const def = STRUCTURE_DEFS[btn.dataset.type];
      btn.classList.toggle('disabled', !player.canAfford(def.cost));
    }
  }

  showDiceRoll(value) {
    this.diceValue.textContent = `🎲 ${value}`;
    this.diceResult.classList.remove('hidden');
    this.diceResult.style.animation = 'none';
    void this.diceResult.offsetHeight;
    this.diceResult.style.animation = 'pop 0.3s ease-out';
    setTimeout(() => this.diceResult.classList.add('hidden'), 2500);
  }

  showResourceGains(gains, players) {
    let html = '<h4>Resources Gained</h4><div class="resource-row">';
    let any = false;
    for (const p of players) {
      const pg = gains[p.id];
      if (!pg) continue;
      const entries = Object.entries(pg).filter(([, v]) => v > 0);
      if (entries.length === 0) continue;
      any = true;
      for (const [r, amt] of entries) {
        html += `<div class="resource-gain" style="border-left:3px solid rgb(${p.rgb.join(',')})">
          ${p.name}: +${amt} ${RESOURCE_EMOJI[r]}</div>`;
      }
    }
    html += '</div>';
    if (!any) html = '<h4>No resources produced</h4>';
    this.resourcePopupContent.innerHTML = html;
    this.resourcePopup.classList.remove('hidden');
    setTimeout(() => this.resourcePopup.classList.add('hidden'), 2800);
  }

  showAIThinking(show) { this.aiIndicator.classList.toggle('hidden', !show); }
  setTileInfo(text) { this.tileInfo.textContent = text; }

  setActionsEnabled(enabled) {
    this.btnEndTurn.style.opacity = enabled ? '1' : '0.4';
    this.btnEndTurn.style.pointerEvents = enabled ? 'auto' : 'none';
    for (const btn of this.structureList.querySelectorAll('.structure-btn')) {
      btn.style.pointerEvents = enabled ? 'auto' : 'none';
    }
  }
}
