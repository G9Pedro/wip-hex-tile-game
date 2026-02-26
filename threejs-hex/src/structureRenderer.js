import * as THREE from 'three';
import { hexToWorld } from './hex.js';

const _c = new THREE.Color();
function ph(rgb) { return _c.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255).getHex(); }

function mat(rgb) {
  return new THREE.MeshStandardMaterial({ color: ph(rgb), roughness: 0.35, metalness: 0.15,
    emissive: ph(rgb), emissiveIntensity: 0.25 });
}
function accent(rgb) {
  return new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.1,
    emissive: ph(rgb), emissiveIntensity: 0.15 });
}
function baseMat(rgb) {
  return new THREE.MeshBasicMaterial({ color: ph(rgb), transparent: true, opacity: 0.6, depthTest: false });
}

const B = {
  outpost(m, a) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.5, 6), m));
    const r = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.32, 6), a);
    r.position.y = 0.4; g.add(r);
    return g;
  },
  farm(m, a) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.3, 0.4), m));
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.45), a);
    r.position.y = 0.18; g.add(r);
    return g;
  },
  trade_town(m, a) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.55, 8), m));
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 4), a);
    f.position.y = 0.47; g.add(f);
    const fl = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.02), a);
    fl.position.set(0, 0.55, 0); g.add(fl);
    return g;
  },
  factory(m, a) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.5), m));
    const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.4, 8), a);
    ch.position.set(0.15, 0.4, 0.15); g.add(ch);
    return g;
  },
  castle(m, a) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.65, 0.6), m));
    for (const [px, pz] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.3, 8), a);
      t.position.set(px, 0.47, pz); g.add(t);
    }
    return g;
  },
  road(m) {
    return new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 8), m);
  },
  wall(m) {
    return new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.1), m);
  },
  ship(m, a) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.22), m));
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 4), a);
    mast.position.y = 0.29; g.add(mast);
    return g;
  },
  port(m, a) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.38, 0.1, 6), m));
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 4), a);
    p.position.set(0.18, 0.22, 0.18); g.add(p);
    return g;
  },
  merc_camp(m) {
    return new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.42, 6), m);
  },
};

export class StructureRenderer {
  constructor(scene, mapRenderer) {
    this.scene = scene;
    this.mapRenderer = mapRenderer;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.meshes = new Map();
  }

  setTextures() {}

  addStructure(id, type, row, col, playerRgb) {
    const { x, z } = hexToWorld(row, col);
    const h = this.mapRenderer.getTileHeight(row, col);

    const m = mat(playerRgb);
    const a = accent(playerRgb);
    const builder = B[type] || B.outpost;
    const obj = builder(m, a);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.52, 6),
      baseMat(playerRgb)
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.01;

    const wrapper = new THREE.Group();
    wrapper.add(obj);
    wrapper.add(ring);
    wrapper.scale.setScalar(1.5);
    wrapper.position.set(x, h + 0.02, z);

    this.group.add(wrapper);
    this.meshes.set(id, wrapper);
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
