export const HEX_SIZE = 1.0;
export const HEX_GAP = 0.06;
export const EFFECTIVE_SIZE = HEX_SIZE - HEX_GAP;

export const TERRAIN_COLORS = {
  deep_water:   0x225189,
  water:        0x397bb7,
  shallow_water:0x7abcc2,
  grass:        0x6fad42,
  forest:       0x3e6b43,
  jungle:       0x84a649,
  hills:        0x538c47,
  mountains:    0x61626b,
  snow:         0xe1eff6,
  taiga:        0x4d7b65,
  dirt:         0x9a6d4f,
  clay:         0x7c5542,
  sand:         0xfbdc7f,
  dunes:        0xe0c26d,
  swamp:        0x365b4a,
  swamp_pads:   0x365b4a,
  swamp_reeds:  0x365b4a,
  wheat:        0xb6a444,
};

export const TILE_VARIANTS = {
  clay: 3, deep_water: 2, dirt: 2, dunes: 2,
  forest: 4, grass: 4, hills: 2, jungle: 4,
  mountains: 2, river_l: 1, river_r: 1, sand: 2,
  shallow_water: 2, snow: 2, swamp: 2, swamp_pads: 1,
  swamp_reeds: 3, taiga: 3, water: 2, wheat: 4,
};

export const TERRAIN_HEIGHT = {
  deep_water:   0.08,
  water:        0.12,
  shallow_water:0.18,
  grass:        0.30,
  forest:       0.38,
  jungle:       0.40,
  hills:        0.52,
  mountains:    0.90,
  snow:         0.70,
  taiga:        0.34,
  dirt:         0.28,
  clay:         0.30,
  sand:         0.22,
  dunes:        0.28,
  swamp:        0.20,
  swamp_pads:   0.20,
  swamp_reeds:  0.20,
  wheat:        0.30,
};

export const WATER_TILES = new Set(['deep_water', 'water', 'shallow_water']);
export const LAND_TILES = new Set([
  'grass','forest','jungle','hills','mountains','snow','taiga',
  'dirt','clay','sand','dunes','swamp','swamp_pads','swamp_reeds','wheat',
]);

export const RESOURCE_TILES = {
  wheat:     'grain',
  forest:    'timber',
  clay:      'brick',
  hills:     'livestock',
  mountains: 'ore',
  jungle:    'spices',
  swamp:     'herbs',
  swamp_pads:'herbs',
  swamp_reeds:'herbs',
  taiga:     'furs',
};

export const ALL_RESOURCES = ['grain','timber','brick','livestock','ore','spices','herbs','furs'];

export const RESOURCE_COLORS = {
  grain:     '#eab308',
  timber:    '#22c55e',
  brick:     '#c2410c',
  livestock: '#a3e635',
  ore:       '#94a3b8',
  spices:    '#e879f9',
  herbs:     '#34d399',
  furs:      '#a16207',
};

export const RESOURCE_EMOJI = {
  grain:     '🌾',
  timber:    '🪵',
  brick:     '🧱',
  livestock: '🐑',
  ore:       '⛏️',
  spices:    '🌶️',
  herbs:     '🌿',
  furs:      '🦊',
};

export const STRUCTURE_DEFS = {
  road:       { label: 'Road',       category: 'transport', cost: { timber:3, brick:2 }, vp: 0 },
  ship:       { label: 'Ship',       category: 'transport', cost: { timber:6, livestock:2, spices:1 }, vp: 0 },
  port:       { label: 'Port',       category: 'transport', cost: { timber:4, brick:4, ore:2 }, vp: 0 },
  outpost:    { label: 'Outpost',    category: 'production',cost: { timber:4, brick:4, grain:3, livestock:3 }, vp: 0, footprint: true },
  farm:       { label: 'Farm',       category: 'production',cost: { timber:6, grain:6, livestock:4, ore:4, furs:2 }, vp: 0, footprint: true },
  trade_town: { label: 'Trade Town', category: 'production',cost: { ore:10, timber:8, livestock:4, spices:1, herbs:1 }, vp: 0, footprint: true },
  factory:    { label: 'Factory',    category: 'production',cost: { ore:15, timber:10, brick:10, grain:1, livestock:1, spices:1, herbs:1, furs:1 }, vp: 0, footprint: true },
  wall:       { label: 'Wall',       category: 'strategy',  cost: { timber:4 }, vp: 0 },
  merc_camp:  { label: 'Merc Camp',  category: 'strategy',  cost: { ore:8, livestock:4, grain:3 }, vp: 0 },
  castle:     { label: 'Castle',     category: 'strategy',  cost: { brick:20, ore:15, timber:15, grain:5, livestock:5 }, vp: 1, footprint: true },
};

export const DICE_PROBABILITY = {
  2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1,
};

export const PLAYER_COLORS = [
  [40, 120, 255],
  [255, 60, 60],
  [60, 200, 60],
  [230, 60, 230],
  [255, 165, 0],
  [0, 210, 210],
  [255, 215, 0],
  [140, 80, 200],
  [255, 128, 128],
  [128, 255, 128],
];
