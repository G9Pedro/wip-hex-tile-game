import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import {
  TERRAIN_COLORS, TERRAIN_HEIGHT, WATER_TILES, EFFECTIVE_SIZE, HEX_SIZE, TILE_VARIANTS,
} from './config.js';
import { hexToWorld, tileKey } from './hex.js';
import { tileVariantIndex } from './assetLoader.js';

const SQRT3 = Math.sqrt(3);
const HEX_SEGMENTS = 6;

export class MapRenderer {
  constructor(scene) {
    this.scene = scene;
    this.baseGroup = new THREE.Group();
    this.spriteGroup = new THREE.Group();
    this.numberGroup = new THREE.Group();
    this.scene.add(this.baseGroup);
    this.scene.add(this.spriteGroup);
    this.scene.add(this.numberGroup);
    this.tileMeshMap = new Map();
    this.highlightRing = null;
    this.hoverRing = null;
    this._buildHighlightRings();
  }

  _buildHighlightRings() {
    const shape = new THREE.Shape();
    const outer = HEX_SIZE * 1.05;
    const inner = HEX_SIZE * 0.85;
    for (let i = 0; i <= 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const fn = i === 0 ? 'moveTo' : 'lineTo';
      shape[fn](Math.cos(angle) * outer, Math.sin(angle) * outer);
    }
    const hole = new THREE.Path();
    for (let i = 0; i <= 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const fn = i === 0 ? 'moveTo' : 'lineTo';
      hole[fn](Math.cos(angle) * inner, Math.sin(angle) * inner);
    }
    shape.holes.push(hole);
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);

    this.highlightRing = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: 0x4a90e2, transparent: true, opacity: 0.85, depthTest: false,
    }));
    this.highlightRing.visible = false;
    this.highlightRing.renderOrder = 999;
    this.scene.add(this.highlightRing);

    this.hoverRing = new THREE.Mesh(geo.clone(), new THREE.MeshBasicMaterial({
      color: 0x80ccff, transparent: true, opacity: 0.4, depthTest: false,
    }));
    this.hoverRing.visible = false;
    this.hoverRing.renderOrder = 998;
    this.scene.add(this.hoverRing);
  }

  renderMap(mapData, tileTextures, numberTextures) {
    this._clear();
    const { rows, cols, tiles, dy, numbers } = mapData;

    const tilesByType = {};
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const type = tiles[r][c];
        if (!tilesByType[type]) tilesByType[type] = [];
        const elevation = (dy?.[r]?.[c] || 0) * 0.015;
        tilesByType[type].push({ r, c, elevation });
      }
    }

    const hexGeo = new THREE.CylinderGeometry(EFFECTIVE_SIZE, EFFECTIVE_SIZE, 1, HEX_SEGMENTS);
    hexGeo.rotateY(Math.PI / 6);

    for (const [type, arr] of Object.entries(tilesByType)) {
      const color = TERRAIN_COLORS[type] || 0x444444;
      const baseH = TERRAIN_HEIGHT[type] || 0.3;
      const isWater = WATER_TILES.has(type);

      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: isWater ? 0.15 : 0.7,
        metalness: isWater ? 0.35 : 0.05,
        flatShading: true,
      });

      const mesh = new THREE.InstancedMesh(hexGeo, mat, arr.length);
      mesh.userData.tileType = type;
      const dummy = new THREE.Matrix4();

      for (let i = 0; i < arr.length; i++) {
        const { r, c, elevation } = arr[i];
        const h = baseH + elevation;
        const { x, z } = hexToWorld(r, c);
        dummy.makeScale(1, h, 1);
        dummy.setPosition(x, h / 2, z);
        mesh.setMatrixAt(i, dummy);
        this.tileMeshMap.set(tileKey(r, c), { worldX: x, worldZ: z, height: h, type });
      }
      mesh.instanceMatrix.needsUpdate = true;
      this.baseGroup.add(mesh);
    }

    if (tileTextures) {
      this._addSpriteLayer(rows, cols, tiles, dy, tileTextures);
    }

    if (numbers) {
      this._buildNumberData(rows, cols, numbers);
    }
  }

  _addSpriteLayer(rows, cols, tiles, dy, tileTextures) {
    const spriteW = SQRT3 * HEX_SIZE * 1.02;
    const spriteH = 2.0 * HEX_SIZE * 1.02;
    const planeGeo = new THREE.PlaneGeometry(spriteW, spriteH);
    planeGeo.rotateX(-Math.PI / 2);

    const grouped = {};
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const type = tiles[r][c];
        const numVariants = TILE_VARIANTS[type] || 1;
        const vi = tileVariantIndex(r, c, numVariants);
        const texKey = `${type}_${vi}`;

        const tex = tileTextures[type]?.[vi] || tileTextures[type]?.[0];
        if (!tex) continue;

        if (!grouped[texKey]) grouped[texKey] = { tex, entries: [] };
        const elevation = (dy?.[r]?.[c] || 0) * 0.015;
        const baseH = TERRAIN_HEIGHT[type] || 0.3;
        grouped[texKey].entries.push({ r, c, h: baseH + elevation });
      }
    }

    for (const { tex, entries } of Object.values(grouped)) {
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.InstancedMesh(planeGeo, mat, entries.length);
      const dummy = new THREE.Matrix4();

      for (let i = 0; i < entries.length; i++) {
        const { r, c, h } = entries[i];
        const { x, z } = hexToWorld(r, c);
        dummy.identity();
        dummy.setPosition(x, h + 0.005, z);
        mesh.setMatrixAt(i, dummy);
      }
      mesh.instanceMatrix.needsUpdate = true;
      this.spriteGroup.add(mesh);
    }
  }

  _buildNumberData(rows, cols, numbers) {
    this._numberData = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const n = numbers[r]?.[c];
        if (!n || n === 0) continue;
        const info = this.tileMeshMap.get(tileKey(r, c));
        if (!info) continue;
        this._numberData.push({ r, c, n, wx: info.worldX, wz: info.worldZ, h: info.height });
      }
    }
    this._visibleLabels = new Map();
  }

  updateVisibleNumbers(camX, camZ, camDist) {
    if (!this._numberData) return;
    const showRadius = Math.min(30, camDist * 0.55);
    const showNumbers = camDist < 90;

    if (!showNumbers) {
      for (const [, obj] of this._visibleLabels) this.numberGroup.remove(obj);
      this._visibleLabels.clear();
      return;
    }

    const needed = new Set();
    for (const nd of this._numberData) {
      const dx = nd.wx - camX, dz = nd.wz - camZ;
      if (dx * dx + dz * dz < showRadius * showRadius) needed.add(`${nd.r},${nd.c}`);
    }

    for (const [key, obj] of this._visibleLabels) {
      if (!needed.has(key)) {
        this.numberGroup.remove(obj);
        this._visibleLabels.delete(key);
      }
    }

    for (const nd of this._numberData) {
      const key = `${nd.r},${nd.c}`;
      if (!needed.has(key) || this._visibleLabels.has(key)) continue;

      const div = document.createElement('div');
      div.className = 'tile-number';
      if (nd.n >= 6 && nd.n <= 8) div.classList.add('hot');
      else if (nd.n === 5 || nd.n === 9) div.classList.add('warm');
      div.textContent = String(nd.n);

      const label = new CSS2DObject(div);
      label.position.set(nd.wx, nd.h + 0.2, nd.wz);
      this.numberGroup.add(label);
      this._visibleLabels.set(key, label);
    }
  }

  showHover(row, col) {
    const info = this.tileMeshMap.get(tileKey(row, col));
    if (!info) { this.hoverRing.visible = false; return; }
    this.hoverRing.position.set(info.worldX, info.height + 0.02, info.worldZ);
    this.hoverRing.visible = true;
  }
  hideHover() { this.hoverRing.visible = false; }

  showSelect(row, col) {
    const info = this.tileMeshMap.get(tileKey(row, col));
    if (!info) { this.highlightRing.visible = false; return; }
    this.highlightRing.position.set(info.worldX, info.height + 0.03, info.worldZ);
    this.highlightRing.visible = true;
  }
  hideSelect() { this.highlightRing.visible = false; }

  getTileHeight(row, col) {
    return this.tileMeshMap.get(tileKey(row, col))?.height ?? 0.3;
  }

  getCenter() {
    let sx = 0, sz = 0, n = 0;
    for (const { worldX, worldZ } of this.tileMeshMap.values()) { sx += worldX; sz += worldZ; n++; }
    return n > 0 ? { x: sx / n, z: sz / n } : { x: 0, z: 0 };
  }

  _clear() {
    const dispose = (g) => {
      while (g.children.length) {
        const c = g.children[0];
        c.geometry?.dispose();
        if (c.material) {
          if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
          else c.material.dispose();
        }
        g.remove(c);
      }
    };
    dispose(this.baseGroup);
    dispose(this.spriteGroup);
    dispose(this.numberGroup);
    this.tileMeshMap.clear();
    this._visibleLabels?.clear();
  }
}
