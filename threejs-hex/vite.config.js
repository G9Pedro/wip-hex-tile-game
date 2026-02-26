import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8000',
      '/maps': 'http://localhost:8000',
      '/Tiles': 'http://localhost:8000',
      '/Structures': 'http://localhost:8000',
      '/Tile_icons': 'http://localhost:8000',
    },
  },
});
