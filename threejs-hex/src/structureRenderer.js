import * as THREE from 'three';
import { hexToWorld } from './hex.js';

const _color = new THREE.Color();

function playerColor(rgb) {
  return _color.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255).getHex();
}

function makeMat(rgb, emissive = 0.15) {
  return new THREE.MeshStandardMaterial({
    color: playerColor(rgb),
    roughness: 0.5,
    metalness: 0.2,
    emissive: playerColor(rgb),
    emissiveIntensity: emissive,
  });
}

const BUILDERS = {
  outpost(mat) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), mat));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.3, 4), mat);
    roof.position.y = 0.35;
    roof.rotation.y = Math.PI / 4;
    g.add(roof);
    return g;
  },
  farm(mat) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.28, 0.45), mat));
    const roof = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.55), mat);
    roof.position.y = 0.18;
    g.add(roof);
    return g;
  },
  trade_town(mat) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), mat));
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.2), mat);
    flag.position.set(0, 0.45, 0);
    g.add(flag);
    return g;
  },
  factory(mat) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.55), mat));
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8), mat);
    chimney.position.set(0.15, 0.42, 0.15);
    g.add(chimney);
    return g;
  },
  castle(mat) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.6, 0.65), mat));
    const positions = [[-0.25, 0, -0.25], [0.25, 0, -0.25], [-0.25, 0, 0.25], [0.25, 0, 0.25]];
    for (const [px, , pz] of positions) {
      const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.35, 8), mat);
      turret.position.set(px, 0.47, pz);
      g.add(turret);
    }
    return g;
  },
  road(mat) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 8), mat);
    return m;
  },
  wall(mat) {
    return new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.12), mat);
  },
  ship(mat) {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.25), mat);
    g.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), mat);
    mast.position.y = 0.32;
    g.add(mast);
    return g;
  },
  port(mat) {
    const g = new THREE.Group();
    const platform = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.6), mat);
    g.add(platform);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6), mat);
    post.position.set(0.2, 0.25, 0.2);
    g.add(post);
    return g;
  },
  merc_camp(mat) {
    return new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.45, 6), mat);
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

  addStructure(id, type, row, col, playerRgb) {
    const builder = BUILDERS[type] || BUILDERS.outpost;
    const mat = makeMat(playerRgb);
    const obj = builder(mat);

    const { x, z } = hexToWorld(row, col);
    const h = this.mapRenderer.getTileHeight(row, col);
    const scale = 1.6;
    if (obj.isGroup) {
      obj.position.set(x, h + 0.01, z);
      obj.scale.setScalar(scale);
    } else if (obj.isObject3D) {
      obj.position.set(x, h + 0.01, z);
      obj.scale.setScalar(scale);
    }

    this.group.add(obj);
    this.meshes.set(id, obj);
    return obj;
  }

  removeStructure(id) {
    const obj = this.meshes.get(id);
    if (obj) {
      this.group.remove(obj);
      this.meshes.delete(id);
    }
  }

  clear() {
    for (const [, obj] of this.meshes) this.group.remove(obj);
    this.meshes.clear();
  }
}
