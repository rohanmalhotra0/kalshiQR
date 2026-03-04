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

    # Histogram data: density (probability density) for comparison
    horizon_weeks = len(results[0].unemployment_path) if results else 520
    salary_in = out.get("inputs", {}).get("salary", 120_000)
    baseline = horizon_weeks * (salary_in / 52) if results else 1_200_000
    x_max = max(float(np.max(incomes_no)), float(np.max(incomes_hedge)), baseline * 1.02)
    bins = 60
    range_hist = (0, x_max)

    counts_no, edges = np.histogram(np.clip(incomes_no, 0, None), bins=bins, range=range_hist, density=True)
    counts_hedge, _ = np.histogram(np.clip(incomes_hedge, 0, None), bins=bins, range=range_hist, density=True)
    bin_centers = [(edges[i] + edges[i + 1]) / 2 for i in range(len(edges) - 1)]
    density_no = [float(x) for x in counts_no]
    density_hedge = [float(x) for x in counts_hedge]

    # CDF data
    sorted_no = np.sort(incomes_no)
    sorted_hedge = np.sort(incomes_hedge)
    cdf_no_x = [float(x) for x in sorted_no]
    cdf_no_y = [float(i / len(sorted_no)) for i in range(len(sorted_no))]
    cdf_hedge_x = [float(x) for x in sorted_hedge]
    cdf_hedge_y = [float(i / len(sorted_hedge)) for i in range(len(sorted_hedge))]

    # Sample unemployment paths (first 20)
    sample_paths = []
    for i in range(min(20, len(results))):
        u = results[i].unemployment_path
        sample_paths.append({"weeks": list(range(len(u))), "unemployment": [float(x) for x in u]})

    # Job loss timing distribution (bins by year)
    job_loss_weeks = [r.job_loss_week for r in results if r.job_loss_week is not None]
    n_years = max(1, horizon_weeks // 52)
    if job_loss_weeks:
        jl_counts, jl_edges = np.histogram(job_loss_weeks, bins=n_years * 4, range=(0, horizon_weeks), density=True)
        jl_centers = [float((jl_edges[i] + jl_edges[i + 1]) / 2 / 52) for i in range(len(jl_edges) - 1)]
        jl_density = [float(x) for x in jl_counts]
    else:
        jl_centers, jl_density = [], []

    # Survival curve: P(still employed at week t)
    survival_weeks = list(range(0, horizon_weeks + 1, 52))  # yearly points
    survival_probs = []
    for t in survival_weeks:
        pct = 100 * sum(1 for r in results if r.job_loss_week is None or r.job_loss_week > t) / len(results)
        survival_probs.append(pct)
    survival_years = [w / 52 for w in survival_weeks]

    # Hedge payoff: max unemployment per path
    max_u_per_path = [float(np.max(r.unemployment_path)) for r in results]
    u_hist, u_edges = np.histogram(max_u_per_path, bins=50, range=(2, 15), density=True)
    u_centers = [(u_edges[i] + u_edges[i + 1]) / 2 for i in range(len(u_edges) - 1)]
    u_density = [float(x) for x in u_hist]

    # Stats for chart footnotes
    n_paths = len(incomes_no)
    pct_zero_no = 100 * np.mean(incomes_no == 0)
    pct_zero_hedge = 100 * np.mean(incomes_hedge == 0)
    median_no = float(np.median(incomes_no))
    median_hedge = float(np.median(incomes_hedge))
    n_job_losses = len(job_loss_weeks)
    pct_job_loss = 100 * n_job_losses / n_paths if n_paths else 0
    avg_year_loss = float(np.mean(job_loss_weeks) / 52) if job_loss_weeks else 0
    median_year_loss = float(np.median(job_loss_weeks) / 52) if job_loss_weeks else 0
    all_u = np.concatenate([r.unemployment_path for r in results])
    mean_u = float(np.mean(all_u))

    inputs = inputs or out.get("inputs", {})
    inputs_str = ", ".join(f"{k}={v}" for k, v in inputs.items()) if inputs else ""
    contract_price = out.get("contract_price", 0.30)
    hedge_threshold = out.get("hedge_threshold", 8.0)
    # Use pipeline output only; derive from salary if missing (same formula as pipeline)
    n_contracts = out.get("n_contracts") or out.get("optimal_contracts")
    if not n_contracts:
        salary = out.get("inputs", {}).get("salary")
        n_contracts = int(salary * 6 / 12) if salary else 0  # 6 months coverage
    h_star = int(n_contracts) if n_contracts else 0
    total_cost = h_star * contract_price
    hedge_payout_rate = 100 * sum(1 for r in results if r.hedge_payoff > 0) / len(results) if results else 0

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Job Loss Hedging Model — Dashboard</title>
  <link rel="icon" type="image/png" href="favicon.png" sizes="32x32">
  <link rel="apple-touch-icon" href="apple-touch-icon.png" sizes="180x180">
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
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
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
    .model-assumptions {{
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.9rem 1.25rem;
      margin-bottom: 1.5rem;
      font-size: 0.85rem;
      color: var(--text-muted);
      line-height: 1.5;
    }}
    .model-assumptions strong {{ color: var(--text); }}
    .metric-card {{
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1.25rem 1rem;
      transition: border-color 0.2s, box-shadow 0.2s;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }}
    .metric-card:hover {{
      border-color: rgba(99, 102, 241, 0.5);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }}
    .metric-card h3 {{
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      margin: 0;
      line-height: 1.2;
    }}
    .metric-card .value {{
      font-family: 'JetBrains Mono', monospace;
      font-size: 1.35rem;
      font-weight: 600;
      color: var(--accent);
      line-height: 1.3;
      letter-spacing: -0.02em;
    }}
    .metric-card.green .value {{ color: var(--accent2); }}
    .metric-card.amber .value {{ color: var(--accent3); }}
    .metric-card .metric-desc {{
      font-size: 0.7rem;
      color: var(--text-muted);
      margin: 0;
      line-height: 1.4;
      opacity: 0.85;
    }}
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
    .navbar {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 2rem;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
    }}
    .navbar a {{ color: var(--text-muted); text-decoration: none; font-size: 0.9rem; }}
    .navbar a:hover {{ color: var(--accent); }}
    .navbar .brand {{ font-weight: 600; color: var(--text); }}
    .navbar-links {{ display: flex; gap: 1.5rem; }}
    @media (max-width: 900px) {{
      .metrics-row {{ grid-template-columns: repeat(2, 1fr); }}
    }}
    @media (max-width: 500px) {{
      .metrics-row {{ grid-template-columns: 1fr; }}
      .metric-card .value {{ font-size: 1.2rem; }}
    }}
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
  <nav class="navbar">
    <a href="./" class="brand">Job Loss Hedging</a>
    <div class="navbar-links">
      <a href="paper.html">Paper</a>
      <a href="quiz.html">Quiz</a>
      <a href="live-demo.html">Live Demo</a>
      <a href="documentation.html">Documentation</a>
      <a href="about.html">Our Teams</a>
    </div>
  </nav>

  <div class="container">
    <header>
      <h1>Job Loss Hedging Model</h1>
      <p class="subtitle">Monte Carlo simulation — {len(incomes_no):,} paths, {len(results[0].unemployment_path) // 52} year horizon</p>
      <p class="subtitle" style="margin-top:0.25rem;font-size:0.8rem;">{inputs_str}</p>
    </header>

    <div class="model-assumptions">
      <strong>Model structure:</strong> Employment state E_t ∈ {{0,1}} with transitions employed → unemployed → employed. Unemployment duration T ~ Exp(μ), μ = 20 weeks (BLS). Job loss via Poisson hazard λ_t driven by macro unemployment. Hedge: binary Kalshi contracts on unemployment threshold.
    </div>

    <div class="metrics-row">
      <div class="metric-card">
        <h3>Mean (no hedge)</h3>
        <div class="value">${rn.mean:,.0f}</div>
        <p class="metric-desc">Average total income over the horizon without hedge contracts.</p>
      </div>
      <div class="metric-card">
        <h3>Mean (with hedge)</h3>
        <div class="value green">${rh.mean:,.0f}</div>
        <p class="metric-desc">Average total income with hedge (cost + payouts).</p>
      </div>
      <div class="metric-card">
        <h3>ES 5% (worst case)</h3>
        <div class="value">${rn.expected_shortfall_5pct:,.0f} → ${rh.expected_shortfall_5pct:,.0f}</div>
        <p class="metric-desc"><strong>ES</strong> = Expected Shortfall. Average income in the worst 5% of outcomes.</p>
      </div>
      <div class="metric-card">
        <h3>P(drop &gt; 50%)</h3>
        <div class="value amber">{rn.tail_prob_50pct_drop:.1%} → {rh.tail_prob_50pct_drop:.1%}</div>
        <p class="metric-desc">Probability income drops &gt;50% vs full employment.</p>
      </div>
      <div class="metric-card">
        <h3>Recommended contracts</h3>
        <div class="value">{h_star:,}</div>
        <p class="metric-desc">~6 months salary coverage. Each pays $1 if unemployment exceeds threshold.</p>
      </div>
      <div class="metric-card">
        <h3>Variance reduction</h3>
        <div class="value {'green' if out.get('variance_reduction_pct', 0) > 0 else 'amber'}">{out.get('variance_reduction_pct', 0):.1f}%</div>
        <p class="metric-desc">(Var no hedge − Var hedge) / Var no hedge. Negative = hedge adds variance.</p>
      </div>
      <div class="metric-card">
        <h3>Hazard β₀</h3>
        <div class="value">{params.beta0:.3f}</div>
        <p class="metric-desc">Hazard model intercept. More negative = lower baseline job-loss risk.</p>
      </div>
    </div>

    <div class="hedge-summary">
      <strong>Hedge:</strong> Buy <strong>{h_star:,} contracts</strong> (&quot;Will US unemployment exceed {hedge_threshold:.1f}%?&quot;) at ${contract_price:.2f} each → cost <strong>${total_cost:,.0f}</strong>, payout <strong>${h_star:,}</strong> if triggered. Triggers in <strong>{hedge_payout_rate:.1f}%</strong> of paths. Target: ~6 months salary.
    </div>

    <div class="chart-grid">
      <div class="chart-card" style="grid-column: 1 / -1;">
        <h2>Figure 1: Income Distribution (Probability Density)</h2>
        <div id="chart1" class="chart"></div>
        <p class="chart-note">Overlaid density histograms with vertical lines: Mean (no hedge) ${rn.mean:,.0f}, Mean (with hedge) ${rh.mean:,.0f}, Full employment ${baseline:,.0f}. P(drop&gt;50%) = {rn.tail_prob_50pct_drop:.1%} → {rh.tail_prob_50pct_drop:.1%}.</p>
      </div>
      <div class="chart-card">
        <h2>Figure 2: CDF — P(Income ≤ x)</h2>
        <div id="chart2" class="chart"></div>
        <p class="chart-note">Cumulative distribution. Read P(income &lt; 800k) or P(income &lt; 600k) directly from the curve.</p>
      </div>
      <div class="chart-card">
        <h2>Figure 3: Survival Curve — P(Still Employed)</h2>
        <div id="chart3" class="chart"></div>
        <p class="chart-note">Fraction of paths still employed at each year. Mean job loss year: {avg_year_loss:.1f}.</p>
      </div>
      <div class="chart-card">
        <h2>Figure 4: Hedge Payoff Activation</h2>
        <div id="chart4" class="chart"></div>
        <p class="chart-note">Distribution of max unemployment per path. Vertical line at threshold {hedge_threshold:.1f}%. Hedge pays in {hedge_payout_rate:.1f}% of paths.</p>
      </div>
      <div class="chart-card">
        <h2>Job Loss Timing (Density)</h2>
        <div id="chart5" class="chart"></div>
        <p class="chart-note"><strong>Paths with job loss:</strong> {n_job_losses:,} ({pct_job_loss:.1f}%) · Mean year: {avg_year_loss:.1f} · Median year: {median_year_loss:.1f}.</p>
      </div>
      <div class="chart-card" style="grid-column: 1 / -1;">
        <h2>Sample Unemployment Paths</h2>
        <div id="chart6" class="chart" style="height: 360px;"></div>
        <p class="chart-note"><strong>Mean unemployment:</strong> {mean_u:.2f}% · First 20 of {n_paths:,} paths.</p>
      </div>
    </div>

    <footer>
      <p><a href="currentModel.pdf" style="color:var(--accent);">Paper (PDF)</a> · <a href="{GITHUB_REPO_URL}" style="color:var(--accent);">GitHub</a> · <a href="quiz.html" style="color:var(--accent);">← Run quiz again</a></p>
      <p style="margin-top:0.5rem;">Made by NYU BnF</p>
    </footer>
  </div>

  <script>
    const commonLayout = {{
      margin: {{ t: 20, r: 20, b: 50, l: 55 }},
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: {{ color: '#e4e4e7', family: 'DM Sans' }},
      xaxis: {{ gridcolor: '#2d2d35', zerolinecolor: '#2d2d35', tickformat: ',.0f' }},
      yaxis: {{ gridcolor: '#2d2d35', zerolinecolor: '#2d2d35' }},
      legend: {{ x: 0.7, y: 1, bgcolor: 'rgba(0,0,0,0)' }}
    }};

    // Figure 1: Income distribution (density, overlaid, vertical lines)
    const chart1 = {{
      data: [
        {{ x: {json.dumps(bin_centers)}, y: {json.dumps(density_no)}, type: 'bar', name: 'No hedge', marker: {{ color: '#6366f1', opacity: 0.6 }} }},
        {{ x: {json.dumps(bin_centers)}, y: {json.dumps(density_hedge)}, type: 'bar', name: 'With hedge', marker: {{ color: '#22c55e', opacity: 0.6 }} }}
      ],
      layout: {{
        ...commonLayout,
        xaxis: {{ ...commonLayout.xaxis, title: 'Income ($)', range: [0, {x_max}] }},
        yaxis: {{ ...commonLayout.yaxis, title: 'Probability Density' }},
        barmode: 'overlay',
        bargap: 0.05,
        shapes: [
          {{ type: 'line', x0: {rn.mean}, x1: {rn.mean}, y0: 0, y1: 1, yref: 'paper', line: {{ dash: 'dash', color: '#818cf8', width: 1.5 }} }},
          {{ type: 'line', x0: {rh.mean}, x1: {rh.mean}, y0: 0, y1: 1, yref: 'paper', line: {{ dash: 'dot', color: '#4ade80', width: 1.5 }} }},
          {{ type: 'line', x0: {baseline}, x1: {baseline}, y0: 0, y1: 1, yref: 'paper', line: {{ dash: 'solid', color: '#a1a1aa', width: 1 }} }}
        ],
        annotations: [
          {{ x: {rn.mean}, y: 1, yref: 'paper', text: 'Mean (no hedge)', showarrow: false, font: {{ size: 9, color: '#818cf8' }}, xanchor: 'left' }},
          {{ x: {rh.mean}, y: 0.95, yref: 'paper', text: 'Mean (hedge)', showarrow: false, font: {{ size: 9, color: '#4ade80' }}, xanchor: 'left' }},
          {{ x: {baseline}, y: 0.9, yref: 'paper', text: 'Full employment', showarrow: false, font: {{ size: 9, color: '#a1a1aa' }}, xanchor: 'left' }}
        ]
      }},
      config: {{ responsive: true }}
    }};

    // Figure 2: CDF
    const chart2 = {{
      data: [
        {{ x: {json.dumps(cdf_no_x)}, y: {json.dumps(cdf_no_y)}, type: 'scatter', mode: 'lines', name: 'No hedge', line: {{ color: '#6366f1', width: 2 }} }},
        {{ x: {json.dumps(cdf_hedge_x)}, y: {json.dumps(cdf_hedge_y)}, type: 'scatter', mode: 'lines', name: 'With hedge', line: {{ color: '#22c55e', width: 2 }} }}
      ],
      layout: {{
        ...commonLayout,
        xaxis: {{ ...commonLayout.xaxis, title: 'Income ($)' }},
        yaxis: {{ ...commonLayout.yaxis, title: 'P(Income ≤ x)', range: [0, 1.02] }}
      }},
      config: {{ responsive: true }}
    }};

    // Figure 3: Survival curve
    const chart3 = {{
      data: [{{
        x: {json.dumps(survival_years)},
        y: {json.dumps(survival_probs)},
        type: 'scatter',
        mode: 'lines+markers',
        name: 'P(still employed)',
        line: {{ color: '#f59e0b', width: 2 }},
        marker: {{ size: 6 }}
      }}],
      layout: {{
        ...commonLayout,
        xaxis: {{ ...commonLayout.xaxis, title: 'Year', tickformat: ',.0f' }},
        yaxis: {{ ...commonLayout.yaxis, title: 'P(Still Employed) (%)', range: [0, 105] }},
        showlegend: false
      }},
      config: {{ responsive: true }}
    }};

    // Figure 4: Hedge payoff activation
    const chart4 = {{
      data: [{{
        x: {json.dumps(u_centers)},
        y: {json.dumps(u_density)},
        type: 'bar',
        name: 'Max unemployment',
        marker: {{ color: '#6366f1', opacity: 0.7 }}
      }}],
      layout: {{
        ...commonLayout,
        xaxis: {{ ...commonLayout.xaxis, title: 'Max unemployment (%)' }},
        yaxis: {{ ...commonLayout.yaxis, title: 'Probability Density' }},
        shapes: [{{ type: 'line', x0: {hedge_threshold}, x1: {hedge_threshold}, y0: 0, y1: 1, yref: 'paper', line: {{ dash: 'dash', color: '#22c55e', width: 2 }} }}],
        annotations: [{{ x: {hedge_threshold}, y: 1, yref: 'paper', text: 'Threshold', showarrow: false, font: {{ size: 9, color: '#22c55e' }}, xanchor: 'left' }}],
        showlegend: false
      }},
      config: {{ responsive: true }}
    }};

    // Job loss timing (density)
    const chart5 = {{
      data: [{{
        x: {json.dumps(jl_centers)},
        y: {json.dumps(jl_density)},
        type: 'bar',
        marker: {{ color: '#f59e0b', opacity: 0.8 }}
      }}],
      layout: {{
        ...commonLayout,
        xaxis: {{ ...commonLayout.xaxis, title: 'Year of job loss' }},
        yaxis: {{ ...commonLayout.yaxis, title: 'Probability Density' }},
        shapes: [
          {{ type: 'line', x0: {avg_year_loss}, x1: {avg_year_loss}, y0: 0, y1: 1, yref: 'paper', line: {{ dash: 'dash', color: '#f59e0b', width: 1.5 }} }},
          {{ type: 'line', x0: {median_year_loss}, x1: {median_year_loss}, y0: 0, y1: 1, yref: 'paper', line: {{ dash: 'dot', color: '#fbbf24', width: 1.5 }} }}
        ],
        showlegend: false
      }},
      config: {{ responsive: true }}
    }};

    const paths = {json.dumps(sample_paths)};
    const chart6 = {{
      data: paths.map((p, i) => ({{
        x: p.weeks,
        y: p.unemployment,
        type: 'scatter',
        mode: 'lines',
        name: `Path ${{i + 1}}`,
        line: {{ width: 1, opacity: 0.5 }}
      }})),
      layout: {{
        ...commonLayout,
        xaxis: {{ ...commonLayout.xaxis, title: 'Week' }},
        yaxis: {{ ...commonLayout.yaxis, title: 'Unemployment (%)' }},
        showlegend: false
      }},
      config: {{ responsive: true }}
    }};

    Plotly.newPlot('chart1', chart1.data, chart1.layout, chart1.config);
    Plotly.newPlot('chart2', chart2.data, chart2.layout, chart2.config);
    Plotly.newPlot('chart3', chart3.data, chart3.layout, chart3.config);
    Plotly.newPlot('chart4', chart4.data, chart4.layout, chart4.config);
    Plotly.newPlot('chart5', chart5.data, chart5.layout, chart5.config);
    Plotly.newPlot('chart6', chart6.data, chart6.layout, chart6.config);
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
