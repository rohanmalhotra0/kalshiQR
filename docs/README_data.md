# Model Data Inputs

## Setup

```bash
pip install -r requirements.txt
```

Set API keys (copy `config.example.env` to `.env` or export):

```bash
export FRED_API_KEY=your_key   # Required. Get free at https://fred.stlouisfed.org/docs/api/api_key.html
export BLS_API_KEY=your_key    # Optional. 25 req/day without; 500 with key from https://www.bls.gov/developers/
```

## Usage

```python
from data_fetcher import (
    PersonalRiskFactors,
    load_model_inputs,
    fetch_fred_data,
    fetch_bls_jolts,
)

# Personal risk factors (your inputs)
personal = PersonalRiskFactors(
    industry="tech",
    company_size="startup",
    job_level="entry",
    tenure_years=1,
    salary=120_000,
)

# Load all data
data = load_model_inputs(
    fred_api_key="YOUR_FRED_KEY",
    bls_api_key=None,  # optional
    personal=personal,
    start_year="2020",
    end_year="2024",
)

# Access outputs
print(data["personal"].to_dict())
print(data["fred"].tail())        # FRED: unemployment, jobless claims, rates, GDP
print(data["bls"].tail())        # BLS JOLTS: layoffs, hires
print(data["macro_state"].tail())  # Merged X_t = (U_t, r_t, GDP_t, Layoffs_t)
```

## Data Sources

| Source | Data | Series IDs |
|--------|------|------------|
| FRED | Unemployment rate | UNRATE |
| FRED | Initial jobless claims | ICSA |
| FRED | Federal funds rate | FEDFUNDS |
| FRED | Real GDP growth | A191RL1Q225SBEA |
| FRED | Yield curve (10Y-2Y spread) | T10Y2Y |
| FRED | Avg unemployment duration (weeks) | UEMPMEAN |
| BLS JOLTS | Layoffs & discharges | JTSLDL |
| BLS JOLTS | Hires | JTSHIR |
| Kalshi | P(recession), P(unemployment > x) | kalshi_client.py (live) |
| BLS / Glassdoor / Levels.fyi | Salary by job level | Manual / OES (placeholder) |

## Run Example

```bash
export FRED_API_KEY=your_key
python data_fetcher.py
```

## Full Model (Hazard + Stochastic + Hedge)

```bash
# With defaults (no API key):
python run_model.py

# With FRED data:
export FRED_API_KEY=your_key
python run_model.py

# Full Monte Carlo pipeline (10k paths, 10 years):
python run_model.py pipeline
```

Modules:
- `hazard_model.py` – logistic regression for P(JobLoss), outputs λ
- `stochastic_model.py` – Poisson process, employment, income paths
- `hedge_model.py` – Kalshi binary contract payoff (H = price × contracts)
- `kalshi_client.py` – Kalshi API (markets, orderbook) for unemployment/recession prices
- `generate_dashboard.py` – HTML dashboard with Plotly charts
- `app.py` – Flask web app: form inputs → run simulation → dashboard
- `monte_carlo.py` – Monte Carlo with macro sim, risk metrics, optimal h*
- `pipeline.py` – full system: data → hazard → MC → risk → hedge
