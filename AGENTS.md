# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Hex Map Game with two frontends:

1. **Original (root)**: Python server + vanilla JS Canvas 2D. Run via `python3 server.py` on port 8000.
2. **Three.js 3D (`threejs-hex/`)**: Vite + Three.js real-time 3D version with AI agents. Run via `npm run dev` in `threejs-hex/` on port 3000.

The Python server is required for both — it serves map generation API endpoints (`/api/generate-preview`, `/api/generate-map`) and pre-generated map JSON files from `maps/`.

### Running the services

```bash
# 1. Start the Python backend (port 8000) — required
python3 server.py &

# 2a. Run the original 2D frontend: open http://localhost:8000
# 2b. Run the Three.js 3D frontend:
cd threejs-hex && npm run dev   # port 3000, proxies /api and /maps to port 8000
```

### Key caveats

- **No linter/formatter or test suite** configured in either frontend.
- **Python dependencies**: `numpy` + `Pillow` (`pip install -r requirements.txt`).
- **Three.js dependencies**: `three` + `vite` (`npm install` in `threejs-hex/`).
- **Port 8000 is hardcoded** in `server.py`.
- The Vite config (`threejs-hex/vite.config.js`) proxies `/api` and `/maps` to the Python server on 8000.
- Pre-generated maps in `maps/` (`map.json`, `lake.json`, `split.json`) can be loaded directly.
- For large maps (170x190+), number labels use LOD — only rendered when camera is close enough.
- The AI agent system supports easy/medium/hard difficulty with strategic placement scoring.
