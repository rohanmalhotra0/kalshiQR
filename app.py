"""
Flask app for job-loss hedging model.
Run: python app.py
Open: http://localhost:5000
"""

import os
from pathlib import Path

from config import load_config
load_config()

from flask import Flask, render_template_string, request

app = Flask(__name__)


FORM_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Job Loss Hedging — Inputs</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0f0f12;
      --surface: #18181c;
      --text: #e4e4e7;
      --text-muted: #8b8b94;
      --accent: #6366f1;
      --border: #2d2d35;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }
    .container { max-width: 640px; margin: 0 auto; padding: 2rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .subtitle { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 2rem; }
    .form-grid { display: grid; gap: 1.25rem; }
    label { display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.35rem; text-transform: uppercase; letter-spacing: 0.05em; }
    input, select { width: 100%; padding: 0.75rem 1rem; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-family: inherit; font-size: 1rem; }
    input:focus, select:focus { outline: none; border-color: var(--accent); }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    button { width: 100%; padding: 1rem; background: var(--accent); border: none; border-radius: 8px; color: white; font-size: 1rem; font-weight: 600; cursor: pointer; margin-top: 0.5rem; font-family: inherit; }
    button:hover { filter: brightness(1.1); }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .note { font-size: 0.8rem; color: var(--text-muted); margin-top: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Job Loss Hedging Model</h1>
    <p class="subtitle">Enter your profile to run a Monte Carlo simulation</p>

    <form method="POST" action="/" class="form-grid">
      <div>
        <label>Industry</label>
        <select name="industry">
          <option value="tech" {{ 'selected' if (inputs.get('industry') or 'tech')=='tech' else '' }}>Tech</option>
          <option value="finance" {{ 'selected' if (inputs.get('industry') or '')=='finance' else '' }}>Finance</option>
          <option value="healthcare" {{ 'selected' if (inputs.get('industry') or '')=='healthcare' else '' }}>Healthcare</option>
          <option value="government" {{ 'selected' if (inputs.get('industry') or '')=='government' else '' }}>Government</option>
        </select>
      </div>
      <div>
        <label>Company Size</label>
        <select name="company_size">
          <option value="startup" {{ 'selected' if (inputs.get('company_size') or 'startup')=='startup' else '' }}>Startup</option>
          <option value="small" {{ 'selected' if (inputs.get('company_size') or '')=='small' else '' }}>Small</option>
          <option value="medium" {{ 'selected' if (inputs.get('company_size') or '')=='medium' else '' }}>Medium</option>
          <option value="large" {{ 'selected' if (inputs.get('company_size') or '')=='large' else '' }}>Large</option>
          <option value="enterprise" {{ 'selected' if (inputs.get('company_size') or '')=='enterprise' else '' }}>Enterprise</option>
        </select>
      </div>
      <div>
        <label>Job Level</label>
        <select name="job_level">
          <option value="entry" {{ 'selected' if (inputs.get('job_level') or 'entry')=='entry' else '' }}>Entry</option>
          <option value="manager" {{ 'selected' if (inputs.get('job_level') or '')=='manager' else '' }}>Manager</option>
          <option value="exec" {{ 'selected' if (inputs.get('job_level') or '')=='exec' else '' }}>Executive</option>
        </select>
      </div>
      <div>
        <label>Tenure (years)</label>
        <input type="number" name="tenure_years" value="{{ inputs.get('tenure_years', 1) }}" min="0" max="30" step="0.5">
      </div>
      <div>
        <label>Salary ($)</label>
        <input type="number" name="salary" value="{{ inputs.get('salary', 120000) }}" min="30000" max="1000000" step="5000">
      </div>
      <div class="row">
        <div>
          <label>Paths</label>
          <input type="number" name="n_paths" value="{{ inputs.get('n_paths', 5000) }}" min="1000" max="50000" step="1000">
        </div>
        <div>
          <label>Horizon (years)</label>
          <input type="number" name="horizon_years" value="{{ inputs.get('horizon_years', 10) }}" min="1" max="30">
        </div>
      </div>
      <button type="submit" name="run">Run Simulation</button>
    </form>

    <p class="note">Simulation may take 15–30 seconds. Results will show income distributions, risk metrics, and optimal hedge.</p>
  </div>
</body>
</html>
"""


@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "GET":
        return render_template_string(FORM_HTML, inputs={})

    # POST: run simulation
    inputs = {
        "industry": request.form.get("industry", "tech"),
        "company_size": request.form.get("company_size", "startup"),
        "job_level": request.form.get("job_level", "entry"),
        "tenure_years": float(request.form.get("tenure_years", 1) or 1),
        "salary": float(request.form.get("salary", 120000) or 120000),
        "n_paths": int(request.form.get("n_paths", 5000) or 5000),
        "horizon_years": int(request.form.get("horizon_years", 10) or 10),
    }

    try:
        from pipeline import run_pipeline
        from generate_dashboard import generate_html

        out = run_pipeline(
            fred_api_key=os.environ.get("FRED_API_KEY"),
            n_paths=inputs["n_paths"],
            horizon_years=inputs["horizon_years"],
            salary=inputs["salary"],
            industry=inputs["industry"],
            company_size=inputs["company_size"],
            job_level=inputs["job_level"],
            tenure_years=inputs["tenure_years"],
            seed=42,
        )
        return generate_html(out)
    except Exception as e:
        import traceback
        err_msg = str(e) + "\n" + traceback.format_exc()
        return render_template_string(FORM_HTML, inputs=inputs).replace(
            "</form>",
            f'<p style="color:#ef4444;margin:1rem 0;font-size:0.9rem;">Error: {e}</p></form>',
        )


if __name__ == "__main__":
    port = 5001
    print(f"Starting server at http://localhost:{port}")
    app.run(debug=False, port=port)
