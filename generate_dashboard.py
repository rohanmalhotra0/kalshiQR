"""
Generate HTML dashboard with Plotly charts for the job-loss hedging model.
Run: python generate_dashboard.py
Output: dashboard.html (open in browser or host online)
"""

GITHUB_REPO_URL = "https://github.com/nyu-bnf/modelKalshi"

import json
from typing import Optional
import os
from pathlib import Path

# Load config before imports that need env vars
from config import load_config
load_config()

import numpy as np


def run_simulation(
    n_paths: int = 5000,
    horizon_years: int = 10,
    industry: str = "tech",
    company_size: str = "startup",
    job_level: str = "entry",
    tenure_years: float = 1.0,
    salary: float = 120_000,
):
    """Run pipeline and return data for dashboard."""
    from pipeline import run_pipeline

    return run_pipeline(
        fred_api_key=os.environ.get("FRED_API_KEY"),
        n_paths=n_paths,
        horizon_years=horizon_years,
        salary=salary,
        industry=industry,
        company_size=company_size,
        job_level=job_level,
        tenure_years=tenure_years,
        seed=42,
    )


def generate_html(out: dict, inputs: Optional[dict] = None) -> str:
    """Build HTML with Plotly charts."""
    rn = out["risk_without_hedge"]
    rh = out["risk_with_hedge"]
    incomes_no = out["incomes_no_hedge"]
    incomes_hedge = out["incomes_with_hedge"]
    results = out["results"]
    params = out["params"]

    # Histogram data (shared bins for comparison)
    all_vals = np.concatenate([incomes_no, incomes_hedge])
    bins = 60
    counts_no, edges = np.histogram(np.clip(incomes_no, 0, None), bins=bins, range=(0, all_vals.max() or 1))
    counts_hedge, _ = np.histogram(np.clip(incomes_hedge, 0, None), bins=bins, range=(0, all_vals.max() or 1))
    edges_no = [float(x) for x in edges[:-1]]
    edges_hedge = edges_no
    counts_no = [int(x) for x in counts_no]
    counts_hedge = [int(x) for x in counts_hedge]

    # Sample unemployment paths (first 20)
    sample_paths = []
    for i in range(min(20, len(results))):
        u = results[i].unemployment_path
        sample_paths.append({"weeks": list(range(len(u))), "unemployment": [float(x) for x in u]})

    # Job loss timing distribution (bins by year)
    job_loss_weeks = [r.job_loss_week for r in results if r.job_loss_week is not None]
    horizon_weeks = len(results[0].unemployment_path) if results else 520
    n_years = max(1, horizon_weeks // 52)
    if job_loss_weeks:
        jl_counts, jl_edges = np.histogram(job_loss_weeks, bins=n_years * 4, range=(0, horizon_weeks))
        jl_centers = [float((jl_edges[i] + jl_edges[i + 1]) / 2 / 52) for i in range(len(jl_edges) - 1)]
        jl_counts = [int(x) for x in jl_counts]
    else:
        jl_centers, jl_counts = [], []

    # Stats for chart footnotes
    n_paths = len(incomes_no)
    pct_zero_no = 100 * np.mean(incomes_no == 0)
    pct_zero_hedge = 100 * np.mean(incomes_hedge == 0)
    median_no = float(np.median(incomes_no))
    median_hedge = float(np.median(incomes_hedge))
    n_job_losses = len(job_loss_weeks)
    pct_job_loss = 100 * n_job_losses / n_paths if n_paths else 0
    avg_year_loss = float(np.mean(job_loss_weeks) / 52) if job_loss_weeks else 0
    all_u = np.concatenate([r.unemployment_path for r in results])
    mean_u = float(np.mean(all_u))

    inputs = inputs or out.get("inputs", {})
    inputs_str = ", ".join(f"{k}={v}" for k, v in inputs.items()) if inputs else ""
    contract_price = out.get("contract_price", 0.30)
    hedge_threshold = out.get("hedge_threshold", 7.0)
    h_star = int(round(out["optimal_hedge_ratio"]))
    total_cost = h_star * contract_price

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Job Loss Hedging Model — Dashboard</title>
  <script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {{
      --bg: #0f0f12;
      --surface: #18181c;
      --surface2: #222228;
      --text: #e4e4e7;
      --text-muted: #8b8b94;
      --accent: #6366f1;
      --accent2: #22c55e;
      --accent3: #f59e0b;
      --border: #2d2d35;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: 'DM Sans', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      line-height: 1.6;
    }}
    .container {{ max-width: 1200px; margin: 0 auto; padding: 2rem; }}
    header {{
      margin-bottom: 2.5rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--border);
    }}
    h1 {{
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, var(--text) 0%, var(--text-muted) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }}
    .subtitle {{
      color: var(--text-muted);
      font-size: 0.9rem;
      margin-top: 0.25rem;
    }}
    .metrics-row {{
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 1rem;
      align-items: stretch;
    }}
    .metrics-row .metric-card {{
      flex: 1;
      min-width: 140px;
    }}
    .hedge-summary {{
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      margin-bottom: 2rem;
      font-size: 0.95rem;
      line-height: 1.6;
    }}
    .hedge-summary strong {{ color: var(--accent2); }}
    .metric-card {{
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem;
      transition: border-color 0.2s;
    }}
    .metric-card:hover {{ border-color: var(--accent); }}
    .metric-card h3 {{
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
    }}
    .metric-card .value {{
      font-family: 'JetBrains Mono', monospace;
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--accent); }}
    .metric-card.green .value {{ color: var(--accent2); }}
    .metric-card.amber .value {{ color: var(--accent3); }}
    .chart-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(480px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }}
    .chart-card {{
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem;
      overflow: hidden;
    }}
    .chart-card h2 {{
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: var(--text);
    }}
    .chart {{ width: 100%; height: 320px; }}
    .chart-note {{
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border);
      line-height: 1.5;
    }}
    .chart-note strong {{ color: var(--text); }}
    footer {{
      padding: 2rem 0;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.8rem;
      border-top: 1px solid var(--border);
    }}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Job Loss Hedging Model</h1>
      <p class="subtitle">Monte Carlo simulation — {len(incomes_no):,} paths, {len(results[0].unemployment_path) // 52} year horizon</p>
      <p class="subtitle" style="margin-top:0.25rem;font-size:0.8rem;">{inputs_str}</p>
    </header>

    <div class="metrics-row">
      <div class="metric-card"><h3>Mean (no hedge)</h3><div class="value">${rn.mean:,.0f}</div></div>
      <div class="metric-card"><h3>Mean (with hedge)</h3><div class="value green">${rh.mean:,.0f}</div></div>
      <div class="metric-card"><h3>ES 5% (worst case)</h3><div class="value">${rn.expected_shortfall_5pct:,.0f} → ${rh.expected_shortfall_5pct:,.0f}</div></div>
      <div class="metric-card"><h3>P(drop &gt; 50%)</h3><div class="value amber">{rn.tail_prob_50pct_drop:.1%} → {rh.tail_prob_50pct_drop:.1%}</div></div>
      <div class="metric-card"><h3>Optimal h*</h3><div class="value">{h_star:,} contracts</div></div>
      <div class="metric-card"><h3>Hazard β₀</h3><div class="value">{params.beta0:.3f}</div></div>
    </div>

    <div class="hedge-summary">
      <strong>Hedge recommendation:</strong> Buy <strong>{h_star:,} contracts</strong> of the Kalshi unemployment market (e.g., &quot;Will US unemployment exceed {hedge_threshold:.1f}%?&quot;). At <strong>${contract_price:.2f} per contract</strong>, total upfront cost is <strong>${total_cost:,.0f}</strong>. Each contract pays $1 if the event occurs, $0 otherwise — so if unemployment exceeds the threshold, you receive ${h_star:,} to offset income loss.
    </div>

    <div class="chart-grid">
      <div class="chart-card">
        <h2>Income Distribution (No Hedge)</h2>
        <div id="chart1" class="chart"></div>
        <p class="chart-note"><strong>Mean:</strong> ${rn.mean:,.0f} · <strong>Median:</strong> ${median_no:,.0f} · <strong>Paths with $0 income:</strong> {pct_zero_no:.1f}% — Simulated paths that experienced job loss and had no hedge payout.</p>
      </div>
      <div class="chart-card">
        <h2>Income Distribution (With Hedge)</h2>
        <div id="chart2" class="chart"></div>
        <p class="chart-note"><strong>Mean:</strong> ${rh.mean:,.0f} · <strong>Median:</strong> ${median_hedge:,.0f} · <strong>Paths with $0 income:</strong> {pct_zero_hedge:.1f}% — Hedge payouts reduce zero-income outcomes when unemployment exceeds threshold.</p>
      </div>
      <div class="chart-card">
        <h2>Income Comparison</h2>
        <div id="chart3" class="chart"></div>
        <p class="chart-note"><strong>Variance reduction:</strong> {out['variance_reduction_pct']:.1f}% · <strong>Tail risk (P(drop&gt;50%)):</strong> {rn.tail_prob_50pct_drop:.1%} → {rh.tail_prob_50pct_drop:.1%} — Overlaid distributions show how the hedge shifts mass from low-income to higher-income outcomes.</p>
      </div>
      <div class="chart-card">
        <h2>Job Loss Timing</h2>
        <div id="chart4" class="chart"></div>
        <p class="chart-note"><strong>Paths with job loss:</strong> {n_job_losses:,} ({pct_job_loss:.1f}%) · <strong>Avg year of loss:</strong> {avg_year_loss:.1f} — When job loss occurred across the {n_paths:,} simulated career paths.</p>
      </div>
      <div class="chart-card" style="grid-column: 1 / -1;">
        <h2>Sample Unemployment Paths</h2>
        <div id="chart5" class="chart" style="height: 360px;"></div>
        <p class="chart-note"><strong>Mean unemployment across all paths:</strong> {mean_u:.2f}% · First 20 of {n_paths:,} simulated macro paths — Unemployment drives the job-loss hazard rate λ in each week.</p>
      </div>
    </div>

    <footer>
      <p><a href="currentModel.pdf" style="color:var(--accent);">Paper (PDF)</a> · <a href="{GITHUB_REPO_URL}" style="color:var(--accent);">GitHub</a> · <a href="./" style="color:var(--accent);">← Change inputs & run again</a></p>
      <p style="margin-top:0.5rem;">Made by NYU BnF</p>
    </footer>
  </div>

  <script>
    const chart1 = {{
      data: [{{
        x: {json.dumps(edges_no)},
        y: {json.dumps(counts_no)},
        type: 'bar',
        marker: {{ color: '#6366f1', opacity: 0.8 }},
        name: 'No hedge'
      }}],
      layout: {{
        margin: {{ t: 20, r: 20, b: 50, l: 50 }},
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: {{ color: '#e4e4e7', family: 'DM Sans' }},
        xaxis: {{ title: 'Income ($)', gridcolor: '#2d2d35', zerolinecolor: '#2d2d35', tickformat: ',.0f' }},
        yaxis: {{ title: 'Number of simulated paths', gridcolor: '#2d2d35', zerolinecolor: '#2d2d35' }},
        showlegend: false,
        bargap: 0.1
      }},
      config: {{ responsive: true }}
    }};

    const chart2 = {{
      data: [{{
        x: {json.dumps(edges_hedge)},
        y: {json.dumps(counts_hedge)},
        type: 'bar',
        marker: {{ color: '#22c55e', opacity: 0.8 }},
        name: 'With hedge'
      }}],
      layout: {{
        margin: {{ t: 20, r: 20, b: 50, l: 50 }},
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: {{ color: '#e4e4e7', family: 'DM Sans' }},
        xaxis: {{ title: 'Income ($)', gridcolor: '#2d2d35', zerolinecolor: '#2d2d35', tickformat: ',.0f' }},
        yaxis: {{ title: 'Number of simulated paths', gridcolor: '#2d2d35', zerolinecolor: '#2d2d35' }},
        showlegend: false,
        bargap: 0.1
      }},
      config: {{ responsive: true }}
    }};

    const chart3 = {{
      data: [
        {{ x: {json.dumps(edges_no)}, y: {json.dumps(counts_no)}, type: 'bar', name: 'No hedge', marker: {{ color: '#6366f1', opacity: 0.6 }} }},
        {{ x: {json.dumps(edges_hedge)}, y: {json.dumps(counts_hedge)}, type: 'bar', name: 'With hedge', marker: {{ color: '#22c55e', opacity: 0.6 }} }}
      ],
      layout: {{
        margin: {{ t: 20, r: 20, b: 50, l: 50 }},
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: {{ color: '#e4e4e7', family: 'DM Sans' }},
        xaxis: {{ title: 'Income ($)', gridcolor: '#2d2d35', zerolinecolor: '#2d2d35', tickformat: ',.0f' }},
        yaxis: {{ title: 'Number of simulated paths', gridcolor: '#2d2d35', zerolinecolor: '#2d2d35' }},
        barmode: 'group',
        bargap: 0.2,
        bargroupgap: 0.05,
        legend: {{ x: 0.7, y: 1, bgcolor: 'rgba(0,0,0,0)' }}
      }},
      config: {{ responsive: true }}
    }};

    const chart4 = {{
      data: [{{
        x: {json.dumps(jl_centers)},
        y: {json.dumps(list(jl_counts))},
        type: 'bar',
        marker: {{ color: '#f59e0b', opacity: 0.8 }},
        name: 'Job losses'
      }}],
      layout: {{
        margin: {{ t: 20, r: 20, b: 50, l: 50 }},
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: {{ color: '#e4e4e7', family: 'DM Sans' }},
        xaxis: {{ title: 'Year of job loss', gridcolor: '#2d2d35', zerolinecolor: '#2d2d35' }},
        yaxis: {{ title: 'Number of simulated paths', gridcolor: '#2d2d35', zerolinecolor: '#2d2d35' }},
        showlegend: false,
        bargap: 0.05
      }},
      config: {{ responsive: true }}
    }};

    const paths = {json.dumps(sample_paths)};
    const chart5Data = paths.map((p, i) => ({{
      x: p.weeks,
      y: p.unemployment,
      type: 'scatter',
      mode: 'lines',
      name: `Path ${{i + 1}}`,
      line: {{ width: 1, opacity: 0.5 }}
    }}));

    const chart5 = {{
      data: chart5Data,
      layout: {{
        margin: {{ t: 20, r: 20, b: 50, l: 50 }},
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: {{ color: '#e4e4e7', family: 'DM Sans' }},
        xaxis: {{ title: 'Week', gridcolor: '#2d2d35', zerolinecolor: '#2d2d35' }},
        yaxis: {{ title: 'Unemployment (%)', gridcolor: '#2d2d35', zerolinecolor: '#2d2d35' }},
        showlegend: false
      }},
      config: {{ responsive: true }}
    }};

    Plotly.newPlot('chart1', chart1.data, chart1.layout, chart1.config);
    Plotly.newPlot('chart2', chart2.data, chart2.layout, chart2.config);
    Plotly.newPlot('chart3', chart3.data, chart3.layout, chart3.config);
    Plotly.newPlot('chart4', chart4.data, chart4.layout, chart4.config);
    Plotly.newPlot('chart5', chart5.data, chart5.layout, chart5.config);
  </script>
</body>
</html>
"""


def main():
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--industry", default="tech")
    p.add_argument("--company-size", default="startup")
    p.add_argument("--job-level", default="entry")
    p.add_argument("--tenure", type=float, default=1.0)
    p.add_argument("--salary", type=float, default=120_000)
    p.add_argument("--paths", type=int, default=5000)
    p.add_argument("--horizon", type=int, default=10)
    args = p.parse_args()

    print("Running Monte Carlo simulation...")
    out = run_simulation(
        n_paths=args.paths,
        horizon_years=args.horizon,
        industry=args.industry,
        company_size=args.company_size,
        job_level=args.job_level,
        tenure_years=args.tenure,
        salary=args.salary,
    )
    print("Generating dashboard...")

    html = generate_html(out)
    out_path = Path(__file__).parent / "dashboard.html"
    out_path.write_text(html, encoding="utf-8")

    print(f"Done. Open {out_path}")
    print("  Or run: python -m http.server 8000  (then visit http://localhost:8000/dashboard.html)")


if __name__ == "__main__":
    main()
