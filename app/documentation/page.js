import Footer from '@/components/Footer';

export default function DocumentationPage() {
  return (
    <div className="container" style={{ maxWidth: 960 }}>
      <h1 className="section-title">Documentation</h1>
      <p className="note" style={{ marginBottom: '1rem' }}>
        End-to-end technical documentation for the production model pipeline used by
        <code> /dashboard</code>.
      </p>

      <div className="card" style={{ marginBottom: '0.8rem' }}>
        <h3>1) System architecture</h3>
        <p style={{ marginBottom: '0.55rem' }}>
          User inputs are collected in the dashboard input form, sent as query params to <code>/api/simulate</code>, and then passed to the
          Python model runner at <code>legacy-python/run_pipeline_json.py</code>.
        </p>
        <p className="note">
          High-level flow: personal profile → hazard model → Poisson job-loss process → Monte Carlo income distribution →
          hedge metrics + chart data → UI recommendation.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '0.8rem' }}>
        <h3>2) Model inputs</h3>
        <p style={{ marginBottom: '0.55rem' }}>
          Primary runtime inputs:
        </p>
        <p className="note">
          <code>industry</code>, <code>company_size</code>, <code>job_level</code>, <code>tenure_years</code>, <code>salary</code>,{' '}
          <code>n_paths</code>, <code>horizon_years</code>.
        </p>
        <p className="note" style={{ marginTop: '0.5rem' }}>
          Optional data enrichment via environment keys: <code>FRED_API_KEY</code> and <code>BLS_API_KEY</code>.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '0.8rem' }}>
        <h3>3) Hazard model (job-loss intensity)</h3>
        <p style={{ marginBottom: '0.55rem' }}>
          The hazard component models monthly job-loss probability with logistic regression:
        </p>
        <p className="note" style={{ marginBottom: '0.55rem' }}>
          <code>P(loss) = sigmoid(beta0 + beta_u * unemployment + beta_i * industry_risk + beta_r * interest_rate)</code>
        </p>
        <p className="note">
          This probability is converted to weekly Poisson intensity using:
          <code> lambda = -log(1 - p_monthly) / 4.33</code>, then capped for realism.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '0.8rem' }}>
        <h3>4) Monte Carlo engine</h3>
        <p style={{ marginBottom: '0.55rem' }}>
          For each path, the simulator:
        </p>
        <p className="note">
          (a) simulates unemployment (mean-reverting AR process), (b) samples job-loss jump events via Poisson intensity,
          (c) draws unemployment duration from an exponential distribution, (d) computes salary path, and (e) applies hedge
          payoff when unemployment stress threshold is breached.
        </p>
        <p className="note" style={{ marginTop: '0.5rem' }}>
          Current hedge trigger in pipeline: unemployment spike above <code>8.0%</code>.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '0.8rem' }}>
        <h3>5) Hedge sizing and risk metrics</h3>
        <p style={{ marginBottom: '0.55rem' }}>
          Contract count defaults to 6-month income coverage:
          <code> contracts = salary * 6 / 12</code>.
        </p>
        <p className="note">
          Dashboard reports mean income, expected shortfall (worst 5%), probability of {'>'}50% income drop, trigger rate,
          and variance/tail-risk change between no-hedge and with-hedge distributions.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '0.8rem' }}>
        <h3>6) Charts returned by Python</h3>
        <p style={{ marginBottom: '0.55rem' }}>
          The API response includes chart-ready arrays generated server-side:
        </p>
        <p className="note">
          <code>histogram</code> (bin centers + counts for no-hedge / with-hedge) and <code>percentiles</code> (1, 5, 10, 25, 50, 75, 90, 95, 99).
        </p>
      </div>

      <div className="card" style={{ marginBottom: '0.8rem' }}>
        <h3>7) API contract</h3>
        <p className="note" style={{ marginBottom: '0.45rem' }}>
          Endpoint: <code>GET /api/simulate</code>
        </p>
        <p className="note" style={{ marginBottom: '0.45rem' }}>
          Returns JSON: inputs, contracts, contractPrice, totalCost, payout, triggerRate, mean/worst/tail metrics, histogram, percentiles.
        </p>
        <p className="note">
          On failure, returns <code>500</code> with <code>{'{ error, details }'}</code>.
        </p>
      </div>

      <div className="card">
        <h3>8) Limitations and interpretation</h3>
        <p className="note" style={{ marginBottom: '0.45rem' }}>
          This is a research model, not financial advice. Outputs are scenario-based and sensitive to hazard coefficients,
          unemployment dynamics, and hedge trigger assumptions.
        </p>
        <p className="note">
          Use for decision support and stress testing, not as a guaranteed forecast of personal outcomes.
        </p>
      </div>

      <Footer />
    </div>
  );
}
