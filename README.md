# Job Loss Hedging Model (modelKalshi)

A Monte Carlo framework for hedging personal income risk using prediction market contracts (e.g., Kalshi). The model simulates job-loss events via a macro-sensitive hazard process and evaluates how unemployment-linked contracts reduce tail risk in income distributions.

**Paper:** [currentModel.pdf](currentModel.pdf) — *Hedging Personal Income Risk Using Prediction Markets* (Jayachandran, Lin, Malhotra)

---

## Overview

Household income risk is usually addressed through savings or insurance, but these offer limited protection against macroeconomic shocks that raise unemployment risk and reduce future earnings. Prediction markets like Kalshi offer tradable contracts tied to unemployment, recessions, and interest rates, providing a mechanism to hedge personal job-loss risk.

This project implements the full pipeline described in the paper:

```
personal data
    ↓
macro data (FRED/BLS)
    ↓
hazard model
    ↓
job-loss probability (λ)
    ↓
Poisson stochastic model
    ↓
Monte Carlo simulation
    ↓
income distribution
    ↓
Kalshi market data
    ↓
optimal hedge ratio (h*)
    ↓
hedge portfolio
```

---

## Model Summary (from `currentModel.tex`)

### Income Process

Employment state $E_t \in \{0, 1\}$ and cumulative wealth:

$$
dW_t = S E_t \, dt
$$

### Job Loss Model

Job loss is a Poisson process with intensity $\lambda_t$:

$$
N_t \sim \text{Poisson}(\lambda_t), \quad dE_t = -E_t \, dN_t
$$

The hazard rate depends on macro variables:

$$
P(\text{JobLoss}) = \sigma\left(\beta_0 + \beta_1 U_t + \beta_2 \cdot \text{industry} + \beta_3 r_t\right)
$$

where $U_t$ = unemployment, $r_t$ = interest rate, and industry captures sector-specific risk.

### Hedge & Optimal Ratio

Kalshi contracts are binary (\$1 if event occurs, \$0 otherwise). The minimum-variance hedge ratio:

$$
h^* = \frac{\text{Cov}(\text{Loss}, \text{Hedge})}{\text{Var}(\text{Hedge})}
$$

---

## Codebase Map

| Component | File | Description |
|-----------|------|-------------|
| **Pipeline** | `pipeline.py` | End-to-end run: personal inputs → hazard → MC → risk metrics |
| **Hazard model** | `hazard_model.py` | Logistic hazard $P(\text{JobLoss})$, industry risk, $\lambda$ from macro state |
| **Stochastic model** | `stochastic_model.py` | Poisson job loss, employment paths |
| **Monte Carlo** | `monte_carlo.py` | Simulate paths, income with/without hedge, risk metrics |
| **Hedge model** | `hedge_model.py` | Kalshi binary contracts, payoff, optimal $h^*$ |
| **Data fetcher** | `data_fetcher.py` | FRED, BLS JOLTS, macro state, salary reference |
| **Kalshi client** | `kalshi_client.py` | Kalshi public API (markets, orderbook) |
| **Config** | `config.py` | Load `.env` for `FRED_API_KEY`, `BLS_API_KEY` |
| **Dashboard** | `generate_dashboard.py` | Build HTML with Plotly charts |
| **Web app** | `app.py` | Flask form → run simulation → dashboard |

---

## Setup

```bash
python -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
```

Optional: create `.env` with `FRED_API_KEY` and `BLS_API_KEY` for live macro data. Without keys, the pipeline uses default hazard parameters.

---

## Usage

### Run pipeline (CLI)

```bash
python pipeline.py
# or with args:
python -c "
from pipeline import run_pipeline
out = run_pipeline(n_paths=5000, horizon_years=10, salary=120_000)
print(out['risk_without_hedge'], out['risk_with_hedge'])
"
```

### Generate dashboard

```bash
python generate_dashboard.py --paths 5000 --horizon 10 --salary 120000
# Opens dashboard.html
```

### Web app (interactive form)

```bash
python app.py
# Open http://localhost:5001
```

Enter industry, company size, job level, tenure, salary, paths, and horizon; submit to run the simulation and view the dashboard.

---

## Deployment

### GitHub Pages (static dashboard)

1. Push to GitHub and enable **Pages** in repo Settings → Pages → Source: **GitHub Actions**
2. The workflow (`.github/workflows/deploy.yml`) runs on push to `main`: generates the dashboard and deploys to Pages
3. Optional: add `FRED_API_KEY` and `BLS_API_KEY` as repo secrets for live macro data

### Render (full web app with form)

1. Connect this repo at [render.com](https://render.com)
2. Render will use `render.yaml` to deploy the Flask app
3. Add `FRED_API_KEY` and `BLS_API_KEY` in the Render dashboard for live data

---

## Outputs

- **Risk metrics:** Mean income, variance, Expected Shortfall (5%), $P(\text{drop} > 50\%)$
- **Optimal hedge ratio** $h^*$
- **Charts:** Income distribution (no hedge vs with hedge), job loss timing, sample unemployment paths

---

## License

MIT
