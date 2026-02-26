import * as THREE from 'three';
import { hexToWorld } from './hex.js';
import { tileVariantIndex } from './assetLoader.js';

const _c = new THREE.Color();
function pHex(rgb) { return _c.setRGB(rgb[0]/255, rgb[1]/255, rgb[2]/255).getHex(); }

function makeGlowMat(rgb) {
  return new THREE.MeshBasicMaterial({
    color: pHex(rgb),
    transparent: true,
    opacity: 0.9,
  });
}

function makeStructMat(rgb) {
  return new THREE.MeshStandardMaterial({
    color: pHex(rgb),
    emissive: pHex(rgb),
    emissiveIntensity: 0.4,
    roughness: 0.4,
    metalness: 0.1,
  });
}

const BUILDERS = {
  outpost(mat, gmat) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.5), mat));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.4, 4), mat);
    roof.position.y = 0.47; roof.rotation.y = Math.PI/4;
    g.add(roof);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.08, 16), gmat);
    base.position.y = -0.25;
    g.add(base);
    return g;
  },
  farm(mat, gmat) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 0.5), mat));
    const roof = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.6), mat);
    roof.position.y = 0.22; g.add(roof);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.08, 16), gmat);
    base.position.y = -0.17; g.add(base);
    return g;
  },
  trade_town(mat, gmat) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), mat));
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.22), mat);
    flag.position.y = 0.52; g.add(flag);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.08, 16), gmat);
    base.position.y = -0.27; g.add(base);
    return g;
  },
  factory(mat, gmat) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), mat));
    const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8), mat);
    ch.position.set(0.2, 0.5, 0.2); g.add(ch);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.08, 16), gmat);
    base.position.y = -0.25; g.add(base);
    return g;
  },
  castle(mat, gmat) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.75, 0.8), mat));
    for (const [px, pz] of [[-0.3,-0.3],[0.3,-0.3],[-0.3,0.3],[0.3,0.3]]) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.45, 8), mat);
      t.position.set(px, 0.6, pz); g.add(t);
    }
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.08, 16), gmat);
    base.position.y = -0.37; g.add(base);
    return g;
  },
  road(mat, gmat) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.12, 8), mat));
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.06, 12), gmat);
    base.position.y = -0.05; g.add(base);
    return g;
  },
  wall(mat, gmat) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.15), mat));
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.06, 12), gmat);
    base.position.y = -0.3; g.add(base);
    return g;
  },
  ship(mat, gmat) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.3), mat));
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), mat);
    mast.position.y = 0.4; g.add(mast);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.06, 12), gmat);
    base.position.y = -0.1; g.add(base);
    return g;
  },
  port(mat, gmat) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.13, 0.7), mat));
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6), mat);
    post.position.set(0.25, 0.3, 0.25); g.add(post);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.06, 12), gmat);
    base.position.y = -0.06; g.add(base);
    return g;
  },
  merc_camp(mat, gmat) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.55, 6), mat));
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.06, 12), gmat);
    base.position.y = -0.27; g.add(base);
    return g;
  },
};

export class StructureRenderer {
  constructor(scene, mapRenderer) {
    this.scene = scene;
    this.mapRenderer = mapRenderer;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.meshes = new Map();
    this.structureTextures = null;

  }

  setTextures(textures) { this.structureTextures = textures; }

  addStructure(id, type, row, col, playerRgb) {
    const { x, z } = hexToWorld(row, col);
    const h = this.mapRenderer.getTileHeight(row, col);
    console.log('[STRUCT ADD]', { id, type, row, col, x, z, h });

    const geo = new THREE.BoxGeometry(1.5, 2, 1.5);
    const mat = new THREE.MeshBasicMaterial({ color: pHex(playerRgb) });
    const marker = new THREE.Mesh(geo, mat);
    marker.position.set(x, h + 1.5, z);

    const mat2 = makeStructMat(playerRgb);
    const gmat = makeGlowMat(playerRgb);
    const builder = BUILDERS[type] || BUILDERS.outpost;
    const structObj = builder(mat2, gmat);
    structObj.scale.setScalar(1.4);
    structObj.position.set(x, h + 0.5, z);

    const wrapper = new THREE.Group();
    wrapper.add(marker);
    wrapper.add(structObj);

    this.group.add(wrapper);
    this.meshes.set(id, wrapper);
    console.log('[STRUCT ADDED] group children:', this.group.children.length);
    return wrapper;
  }

  removeStructure(id) {
    const obj = this.meshes.get(id);
    if (obj) { this.group.remove(obj); this.meshes.delete(id); }
  }

  clear() {
    for (const [, obj] of this.meshes) this.group.remove(obj);
    this.meshes.clear();
  }
}
