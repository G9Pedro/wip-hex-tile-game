# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Hex Map Game — a Python + vanilla JavaScript web application. The Python server (`server.py`) serves static files and exposes map generation API endpoints. The frontend is vanilla ES modules (no build step, no bundler, no JS package manager). See `README.md` for game rules and features.

### Running the dev server

```
python3 server.py
```

Starts a `ThreadingHTTPServer` on **port 8000**. Serves HTML/JS/CSS and provides two POST API endpoints:

- `/api/generate-preview` — lightweight tile preview
- `/api/generate-map` — full map generation + save to `maps/` directory

### Key caveats

- **No JS build step**: The frontend uses raw ES modules served directly. There is no `package.json`, npm, or bundler.
- **No linter/formatter configured**: The project has no ESLint, Pylint, or similar tooling set up.
- **No automated test suite**: There are no unit or integration tests in the repository.
- **Python dependencies**: Only `numpy` and `Pillow` (see `requirements.txt`). Install with `pip install -r requirements.txt`.
- **Pre-generated maps** exist in `maps/` (`map.json`, `lake.json`, `split.json`) and are loaded by the UI on startup.
- **Port 8000 is hardcoded** in `server.py` (`PORT = 8000`).
- The server auto-changes its working directory to the script's location (`os.chdir`), so it must be run from the repo root or it still works.
