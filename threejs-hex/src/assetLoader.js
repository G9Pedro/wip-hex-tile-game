import * as THREE from 'three';
import { TILE_VARIANTS } from './config.js';

const loader = new THREE.TextureLoader();

function configTex(tex) {
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function loadTex(url) {
  return new Promise((resolve, reject) => {
    loader.load(url, tex => resolve(configTex(tex)), undefined, reject);
  });
}

export async function loadTileTextures() {
  const textures = {};
  const promises = [];

  for (const [type, count] of Object.entries(TILE_VARIANTS)) {
    textures[type] = [];
    for (let i = 0; i < count; i++) {
      const url = `/Tiles/${type}_${i}_tile.png`;
      const idx = i;
      const t = type;
      promises.push(
        loadTex(url)
          .then(tex => { textures[t][idx] = tex; })
          .catch(() => { textures[t][idx] = null; })
      );
    }
  }

  await Promise.all(promises);
  return textures;
}

export async function loadStructureTextures() {
  const structures = {};
  const defs = {
    outpost: { path: 'Settlements/outpost', count: 4 },
    farm: { path: 'Settlements/farm', count: 4 },
    factory: { path: 'Settlements/factory', count: 5 },
    trade_town: { path: 'Settlements/trade_town', count: 3 },
    castle: { path: 'Settlements/castle', count: 5 },
    port: { path: 'Settlements/port', count: 5 },
    merc_camp: { path: 'Settlements/mercenary_camp', count: 4 },
    ship: { path: 'Ships/ship', count: 4 },
    road: { path: 'Roads/road_start', count: 1 },
    wall: { path: 'Walls/wall_h', count: 1 },
  };

  const promises = [];
  for (const [key, def] of Object.entries(defs)) {
    structures[key] = [];
    for (let i = 0; i < def.count; i++) {
      const url = def.count === 1
        ? `/Structures/${def.path}.png`
        : `/Structures/${def.path}_${i}.png`;
      const k = key;
      const idx = i;
      promises.push(
        loadTex(url)
          .then(tex => { structures[k][idx] = tex; })
          .catch(() => { structures[k][idx] = null; })
      );
    }
  }

  await Promise.all(promises);
  return structures;
}

export async function loadNumberTextures() {
  const nums = {};
  const promises = [];
  for (let n = 2; n <= 12; n++) {
    promises.push(
      loadTex(`/Tile_icons/${n}.png`)
        .then(tex => { nums[n] = tex; })
        .catch(() => { nums[n] = null; })
    );
  }
  await Promise.all(promises);
  return nums;
}

export function tileVariantIndex(row, col, numVariants) {
  if (numVariants <= 1) return 0;
  const hash = ((row * 7919 + col * 6271) >>> 0) & 0xFFFF;
  return hash % numVariants;
}
