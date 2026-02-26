import * as THREE from 'three';
import { hexToWorld } from './hex.js';
import { tileVariantIndex } from './assetLoader.js';

const _color = new THREE.Color();

function playerHex(rgb) {
  return _color.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255).getHex();
}

function createOutlinedSprite(texture, rgb, scale = 2.2) {
  const mat = new THREE.SpriteMaterial({
    map: texture,
    alphaTest: 0.1,
    sizeAttenuation: true,
    depthTest: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(scale, scale, 1);
  sprite.renderOrder = 100;

  const ringGeo = new THREE.RingGeometry(scale * 0.35, scale * 0.42, 6);
  const ringMat = new THREE.MeshBasicMaterial({
    color: playerHex(rgb),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8,
    depthTest: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.renderOrder = 99;

  const group = new THREE.Group();
  group.add(sprite);
  group.add(ring);
  return group;
}

function createFallbackStructure(rgb, type) {
  const mat = new THREE.MeshStandardMaterial({
    color: playerHex(rgb),
    roughness: 0.5,
    emissive: playerHex(rgb),
    emissiveIntensity: 0.15,
  });

  const builders = {
    outpost() {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), mat));
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.35, 4), mat);
      roof.position.y = 0.42;
      roof.rotation.y = Math.PI / 4;
      g.add(roof);
      return g;
    },
    farm() {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.32, 0.5), mat));
      const roof = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.6), mat);
      roof.position.y = 0.2;
      g.add(roof);
      return g;
    },
    castle() {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.7, 0.75), mat));
      for (const [px, pz] of [[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]]) {
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8), mat);
        t.position.set(px, 0.55, pz);
        g.add(t);
      }
      return g;
    },
    road() { return new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 8), mat); },
    wall() { return new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.14), mat); },
    ship() {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.3), mat));
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 6), mat);
      mast.position.y = 0.36;
      g.add(mast);
      return g;
    },
    port() {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.7), mat));
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 6), mat);
      post.position.set(0.22, 0.28, 0.22);
      g.add(post);
      return g;
    },
    trade_town() {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), mat));
      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.22), mat);
      flag.position.y = 0.5;
      g.add(flag);
      return g;
    },
    factory() {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), mat));
      const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.45, 8), mat);
      ch.position.set(0.18, 0.47, 0.18);
      g.add(ch);
      return g;
    },
    merc_camp() { return new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.5, 6), mat); },
  };

  return (builders[type] || builders.outpost)();
}

export class StructureRenderer {
  constructor(scene, mapRenderer) {
    this.scene = scene;
    this.mapRenderer = mapRenderer;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.meshes = new Map();
    this.structureTextures = null;
  }

  setTextures(textures) {
    this.structureTextures = textures;
  }

  addStructure(id, type, row, col, playerRgb) {
    const { x, z } = hexToWorld(row, col);
    const h = this.mapRenderer.getTileHeight(row, col);

    const texArr = this.structureTextures?.[type];
    const vi = texArr ? tileVariantIndex(row, col, texArr.length) : 0;
    const tex = texArr?.[vi];

    let obj;
    if (tex) {
      obj = createOutlinedSprite(tex, playerRgb, 2.2);
      obj.position.set(x, h + 1.0, z);
    } else {
      obj = createFallbackStructure(playerRgb, type);
      obj.position.set(x, h + 0.3, z);
      obj.scale.setScalar(1.8);
    }

    obj.renderOrder = 100;
    this.group.add(obj);
    this.meshes.set(id, obj);
    return obj;
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
