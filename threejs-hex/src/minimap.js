import { TERRAIN_COLORS, WATER_TILES } from './config.js';

function hexToRgb(hex) {
  return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
}

export class Minimap {
  constructor(container) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'minimap-canvas';
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.mapData = null;
    this.viewport = { x: 0, z: 0, w: 40, h: 30 };
  }

  renderMap(mapData) {
    this.mapData = mapData;
    const { rows, cols, tiles } = mapData;
    const scale = 2;
    this.canvas.width = cols * scale;
    this.canvas.height = rows * scale;

    const ctx = this.ctx;
    const imgData = ctx.createImageData(cols * scale, rows * scale);
    const d = imgData.data;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const type = tiles[r][c];
        const color = TERRAIN_COLORS[type] || 0x444444;
        const [cr, cg, cb] = hexToRgb(color);
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const px = (c * scale + dx);
            const py = (r * scale + dy);
            const idx = (py * cols * scale + px) * 4;
            d[idx] = cr;
            d[idx + 1] = cg;
            d[idx + 2] = cb;
            d[idx + 3] = 255;
          }
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  updateViewport(centerX, centerZ, viewW, viewH, hexSize) {
    if (!this.mapData) return;
    const { rows, cols } = this.mapData;
    const scale = 2;
    const sqrt3 = Math.sqrt(3);

    const colF = centerX / (sqrt3 * hexSize);
    const rowF = centerZ / (1.5 * hexSize);

    const vw = viewW / (sqrt3 * hexSize);
    const vh = viewH / (1.5 * hexSize);

    this.ctx.putImageData(
      this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height), 0, 0
    );

    this.renderMap(this.mapData);

    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(
      (colF - vw / 2) * scale,
      (rowF - vh / 2) * scale,
      vw * scale,
      vh * scale
    );
  }
}
