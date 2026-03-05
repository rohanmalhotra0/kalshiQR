# modelKalshi

ModelKalshi helps users hedge income risk from potential job loss using a simulation-based recommendation engine.

Users enter profile + macro assumptions, then the app runs the Python hazard/Poisson/Monte Carlo pipeline and returns suggested contract sizing with risk metrics.

## Product Overview

- **Goal:** size a hedge for labor-market stress scenarios using prediction-market style contracts.
- **Primary flow:** `Dashboard input form -> Dashboard results`.
- **Core output:** contracts to buy, upfront cost, projected payout behavior, and tail-risk comparisons.

## Tech Stack

- **Frontend:** Next.js App Router + React
- **Model runtime:** Python (`legacy-python/`)
- **Bridge:** Next API route `app/api/simulate/route.js`
- **Model entrypoint:** `legacy-python/run_pipeline_json.py` -> `legacy-python/pipeline.py`

## App Routes

- `/` landing page (hero + product summary)
- `/quiz` user input form
- `/dashboard` model results page
- `/documentation` project docs
- `/about` team/contact page
- `/paper` paper viewer

## How Calculations Work

1. Frontend collects inputs (industry, company size, level, tenure, salary, paths, horizon).
2. Dashboard pages call `/api/simulate` with query params.
3. API route spawns Python and runs:
   - hazard model
   - Poisson job-loss process
   - Monte Carlo simulation
   - hedge metrics aggregation
4. Python returns JSON metrics consumed by the UI.

## Local Development

### 1) Install dependencies

```bash
npm install
python3 -m venv .venv
.venv/bin/pip install -r legacy-python/requirements.txt
```

### 2) Run the app

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

## Production Deployment (Render)

This repo includes one-click Render config:

- `render.yaml` (Blueprint service definition)
- `Dockerfile` (Node + Python runtime in one container)
- `.dockerignore`

### Deploy steps

1. Push the repo to GitHub.
2. In Render, create a **Blueprint** from the repo.
3. Render reads `render.yaml` and provisions the service.
4. Set env vars in Render if needed:
   - `FRED_API_KEY`
   - `BLS_API_KEY`

## Environment Variables

- `PYTHON_PATH` (optional): explicit Python binary path for the API route
- `FRED_API_KEY` (optional): macro data integration
- `BLS_API_KEY` (optional): labor data integration

## Notes

- This product requires a server runtime for Python model execution.
- Static-only hosts (for example GitHub Pages) cannot run `/api/simulate` directly.
