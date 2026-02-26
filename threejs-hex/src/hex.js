import { HEX_SIZE } from './config.js';

const SQRT3 = Math.sqrt(3);

const EVEN_NEIGHBORS = [[0,1],[0,-1],[-1,0],[-1,1],[1,0],[1,1]];
const ODD_NEIGHBORS  = [[0,1],[0,-1],[-1,-1],[-1,0],[1,-1],[1,0]];

export function hexToWorld(row, col) {
  const x = SQRT3 * HEX_SIZE * (col + 0.5 * (row & 1));
  const z = 1.5 * HEX_SIZE * row;
  return { x, z };
}

export function worldToHex(wx, wz) {
  const row = Math.round(wz / (1.5 * HEX_SIZE));
  const col = Math.round((wx / (SQRT3 * HEX_SIZE)) - 0.5 * (row & 1));
  return { row, col };
}

export function getNeighbors(row, col) {
  const offsets = (row & 1) ? ODD_NEIGHBORS : EVEN_NEIGHBORS;
  return offsets.map(([dr, dc]) => ({ row: row + dr, col: col + dc }));
}

export function hexDistance(r1, c1, r2, c2) {
  const ax = c1 - (r1 - (r1 & 1)) / 2;
  const az = r1;
  const bx = c2 - (r2 - (r2 & 1)) / 2;
  const bz = r2;
  const dx = bx - ax;
  const dz = bz - az;
  return Math.max(Math.abs(dx), Math.abs(dz), Math.abs(dx + dz));
}

export function tileKey(row, col) {
  return `${row},${col}`;
}

export function parseKey(key) {
  const [r, c] = key.split(',').map(Number);
  return { row: r, col: c };
}

export function getFootprint(row, col) {
  const center = { row, col };
  return [center, ...getNeighbors(row, col)];
}

export function computeSettlementNumber(footprint, numbers) {
  const nums = [];
  for (const { row, col } of footprint) {
    const n = numbers[row]?.[col];
    if (n && n > 0 && n !== 7) nums.push(n);
  }
  if (nums.length === 0) return 0;
  const freq = {};
  for (const n of nums) freq[n] = (freq[n] || 0) + 1;
  let maxFreq = 0, mode = 0;
  for (const [n, f] of Object.entries(freq)) {
    if (f > maxFreq || (f === maxFreq && Math.abs(+n - 7) < Math.abs(mode - 7))) {
      maxFreq = f;
      mode = +n;
    }
  }
  return Math.max(2, Math.min(12, mode));
}
