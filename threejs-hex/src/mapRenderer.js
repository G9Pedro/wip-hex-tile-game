import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { TERRAIN_COLORS, TERRAIN_HEIGHT, WATER_TILES, EFFECTIVE_SIZE, HEX_SIZE } from './config.js';
import { hexToWorld, tileKey } from './hex.js';

const HEX_SEGMENTS = 6;

export class MapRenderer {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.numberLabels = new THREE.Group();
    this.scene.add(this.numberLabels);
    this.tileMeshMap = new Map();
    this.highlightRing = null;
    this.hoverRing = null;
    this._buildHighlightRings();
  }

  _buildHighlightRings() {
    const shape = new THREE.Shape();
    const outer = HEX_SIZE * 1.02;
    const inner = HEX_SIZE * 0.88;
    for (let i = 0; i <= 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const method = i === 0 ? 'moveTo' : 'lineTo';
      shape[method](Math.cos(angle) * outer, Math.sin(angle) * outer);
    }
    const hole = new THREE.Path();
    for (let i = 0; i <= 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const method = i === 0 ? 'moveTo' : 'lineTo';
      hole[method](Math.cos(angle) * inner, Math.sin(angle) * inner);
    }
    shape.holes.push(hole);

    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);

    this.highlightRing = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: 0x4ade80, transparent: true, opacity: 0.8, depthTest: false,
    }));
    this.highlightRing.visible = false;
    this.highlightRing.renderOrder = 999;
    this.scene.add(this.highlightRing);

    this.hoverRing = new THREE.Mesh(geo.clone(), new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.35, depthTest: false,
    }));
    this.hoverRing.visible = false;
    this.hoverRing.renderOrder = 998;
    this.scene.add(this.hoverRing);
  }

  renderMap(mapData) {
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
      const color = TERRAIN_COLORS[type] || 0x888888;
      const baseH = TERRAIN_HEIGHT[type] || 0.3;
      const isWater = WATER_TILES.has(type);

      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: isWater ? 0.2 : 0.75,
        metalness: isWater ? 0.3 : 0.05,
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

        const key = tileKey(r, c);
        this.tileMeshMap.set(key, { worldX: x, worldZ: z, height: h, type });
      }
      mesh.instanceMatrix.needsUpdate = true;
      this.group.add(mesh);
    }

    if (numbers) this._addNumbers(rows, cols, numbers);
  }

  _addNumbers(rows, cols, numbers) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const n = numbers[r]?.[c];
        if (!n || n === 0) continue;

        const info = this.tileMeshMap.get(tileKey(r, c));
        if (!info) continue;

        const div = document.createElement('div');
        div.className = 'tile-number';
        if (n >= 6 && n <= 8) div.classList.add('hot');
        else if (n === 5 || n === 9) div.classList.add('warm');
        div.textContent = String(n);

        const label = new CSS2DObject(div);
        label.position.set(info.worldX, info.height + 0.15, info.worldZ);
        this.numberLabels.add(label);
      }
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
    const info = this.tileMeshMap.get(tileKey(row, col));
    return info ? info.height : 0.3;
  }

  getCenter() {
    let sx = 0, sz = 0, n = 0;
    for (const { worldX, worldZ } of this.tileMeshMap.values()) {
      sx += worldX; sz += worldZ; n++;
    }
    return n > 0 ? { x: sx / n, z: sz / n } : { x: 0, z: 0 };
  }

  _clear() {
    while (this.group.children.length) {
      const c = this.group.children[0];
      c.geometry?.dispose();
      c.material?.dispose();
      this.group.remove(c);
    }
    while (this.numberLabels.children.length) {
      this.numberLabels.remove(this.numberLabels.children[0]);
    }
    this.tileMeshMap.clear();
  }
}
