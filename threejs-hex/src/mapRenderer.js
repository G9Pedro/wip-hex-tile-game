import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { TERRAIN_COLORS, TERRAIN_HEIGHT, WATER_TILES, HEX_SIZE } from './config.js';
import { hexToWorld, tileKey } from './hex.js';

const SQRT3 = Math.sqrt(3);

export class MapRenderer {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.numberGroup = new THREE.Group();
    this.scene.add(this.numberGroup);
    this.tileMeshMap = new Map();
    this._buildRings();
  }

  _buildRings() {
    const shape = new THREE.Shape();
    const outer = HEX_SIZE * 1.03;
    const inner = HEX_SIZE * 0.88;
    for (let i = 0; i <= 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      i === 0 ? shape.moveTo(Math.cos(a) * outer, Math.sin(a) * outer)
              : shape.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    }
    const hole = new THREE.Path();
    for (let i = 0; i <= 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      i === 0 ? hole.moveTo(Math.cos(a) * inner, Math.sin(a) * inner)
              : hole.lineTo(Math.cos(a) * inner, Math.sin(a) * inner);
    }
    shape.holes.push(hole);
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);

    this.highlightRing = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: 0x4a90e2, transparent: true, opacity: 0.9, depthTest: false,
    }));
    this.highlightRing.visible = false;
    this.highlightRing.renderOrder = 999;
    this.scene.add(this.highlightRing);

    this.hoverRing = new THREE.Mesh(geo.clone(), new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.3, depthTest: false,
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
        const elev = (dy?.[r]?.[c] || 0) * 0.012;
        tilesByType[type].push({ r, c, elev });
      }
    }

    const hexGeo = new THREE.CylinderGeometry(HEX_SIZE * 0.98, HEX_SIZE * 0.98, 1, 6);
    hexGeo.rotateY(Math.PI / 6);

    for (const [type, arr] of Object.entries(tilesByType)) {
      const color = TERRAIN_COLORS[type] || 0x444444;
      const baseH = TERRAIN_HEIGHT[type] || 0.3;
      const isWater = WATER_TILES.has(type);

      const material = new THREE.MeshLambertMaterial({
        color,
        flatShading: true,
      });

      const mesh = new THREE.InstancedMesh(hexGeo, material, arr.length);
      mesh.userData.instances = [];
      const dummy = new THREE.Matrix4();

      for (let i = 0; i < arr.length; i++) {
        const { r, c, elev } = arr[i];
        const h = baseH + elev;
        const { x, z } = hexToWorld(r, c);
        dummy.makeScale(1, h, 1);
        dummy.setPosition(x, h / 2, z);
        mesh.setMatrixAt(i, dummy);
        this.tileMeshMap.set(tileKey(r, c), { worldX: x, worldZ: z, height: h, type });
        mesh.userData.instances.push({ r, c });
      }
      mesh.instanceMatrix.needsUpdate = true;
      this.group.add(mesh);
    }

    if (numbers) this._buildNumberData(rows, cols, numbers);
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
    const radius = Math.min(28, camDist * 0.5);
    const show = camDist < 80;

    if (!show) {
      for (const [, obj] of this._visibleLabels) this.numberGroup.remove(obj);
      this._visibleLabels.clear();
      return;
    }

    const needed = new Set();
    for (const nd of this._numberData) {
      const dx = nd.wx - camX, dz = nd.wz - camZ;
      if (dx * dx + dz * dz < radius * radius) needed.add(`${nd.r},${nd.c}`);
    }

    for (const [key, obj] of this._visibleLabels) {
      if (!needed.has(key)) { this.numberGroup.remove(obj); this._visibleLabels.delete(key); }
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
      label.position.set(nd.wx, nd.h + 0.12, nd.wz);
      this.numberGroup.add(label);
      this._visibleLabels.set(key, label);
    }
  }

  raycastTile(raycaster) {
    const hits = raycaster.intersectObjects(this.group.children, false);
    for (const hit of hits) {
      const inst = hit.object?.userData?.instances;
      if (inst && hit.instanceId != null && inst[hit.instanceId]) {
        return inst[hit.instanceId];
      }
    }
    return null;
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
    while (this.group.children.length) {
      const c = this.group.children[0];
      c.geometry?.dispose();
      if (c.material) (Array.isArray(c.material) ? c.material : [c.material]).forEach(m => m.dispose());
      this.group.remove(c);
    }
    while (this.numberGroup.children.length) this.numberGroup.remove(this.numberGroup.children[0]);
    this.tileMeshMap.clear();
    this._visibleLabels?.clear();
  }
}
