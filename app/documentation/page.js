'use client';

import Footer from '@/components/Footer';
import { useEffect } from 'react';
import Link from 'next/link';

export default function DocumentationPage() {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.MathJax?.typesetPromise) {
      window.MathJax.typesetPromise();
    }
  }, []);

  return (
    <div className="container" style={{ maxWidth: 960 }}>
      <h1 className="section-title">Documentation</h1>
      <p className="note" style={{ marginBottom: '1rem' }}>Clean technical overview of the research pipeline and equations.</p>
      <div className="doc-switch" style={{ marginBottom: '1rem' }}>
        <Link href="/documentation" className="doc-switch-link active">Overview</Link>
        <Link href="/variables" className="doc-switch-link">Variables</Link>
      </div>

      <div className="card" style={{ marginBottom: '0.8rem' }}>
        <h3>Pipeline Diagram</h3>
        <p className="note" style={{ marginBottom: '0.7rem' }}>
          The model follows a sequential pipeline:
        </p>
        <div className="pipeline-flow">
          <div className="pipeline-box">[Personal Data]</div>
          <div className="pipeline-arrow">↓</div>
          <div className="pipeline-box">[Hazard Model]</div>
          <div className="pipeline-arrow">↓</div>
          <div className="pipeline-box">[Poisson Job Loss]</div>
          <div className="pipeline-arrow">↓</div>
          <div className="pipeline-box">[Monte Carlo Simulation]</div>
          <div className="pipeline-arrow">↓</div>
          <div className="pipeline-box">[Optimal Hedge Size]</div>
        </div>
        <p className="note" style={{ marginTop: '0.7rem' }}>
          Personal information determines a job-loss hazard rate. This hazard drives a stochastic job-loss simulation. Thousands of
          career paths are simulated using Monte Carlo, and the optimal hedge is computed from the resulting income distribution.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '0.8rem' }}>
        <h3>How the model works</h3>
        <h4 style={{ marginBottom: '0.4rem' }}>Job-Loss Hazard</h4>
        <p className="note" style={{ marginBottom: '0.5rem' }}>The job-loss intensity depends on macroeconomic conditions.</p>
        <p className="note">{String.raw`\[\lambda_t = \alpha + \beta_1 U_t + \beta_2 r_t + \beta_3 I_t\]`}</p>
        <p className="note">
          where <code>U_t</code> is unemployment rate, <code>r_t</code> is interest rate, and <code>I_t</code> is industry risk factor.
        </p>

        <h4 style={{ marginTop: '0.9rem', marginBottom: '0.4rem' }}>Employment Process</h4>
        <p className="note" style={{ marginBottom: '0.5rem' }}>Job loss is modeled as a Poisson jump process.</p>
        <p className="note">{String.raw`\[N_t \sim Poisson(\lambda_t)\]`}</p>
        <p className="note">{String.raw`\[E_t = \begin{cases}1 & \text{employed} \\ 0 & \text{unemployed}\end{cases}\]`}</p>

        <h4 style={{ marginTop: '0.9rem', marginBottom: '0.4rem' }}>Income Process</h4>
        <p className="note" style={{ marginBottom: '0.5rem' }}>Income evolves according to</p>
        <p className="note">{String.raw`\[dW_t = S E_t dt\]`}</p>
        <p className="note">where <code>S</code> is salary.</p>

        <h4 style={{ marginTop: '0.9rem', marginBottom: '0.4rem' }}>Monte Carlo Simulation</h4>
        <p className="note" style={{ marginBottom: '0.5rem' }}>The system simulates thousands of career paths.</p>
        <p className="note">{String.raw`\[W_t^{(1)}, W_t^{(2)}, ..., W_t^{(N)}\]`}</p>
        <p className="note" style={{ marginTop: '0.5rem' }}>{String.raw`\[N = 5000\]`}</p>
        <p className="note">{String.raw`\[T = 10\]`}</p>
        <p className="note">Default parameters are 5000 simulation paths and a 10-year horizon.</p>

        <h4 style={{ marginTop: '0.9rem', marginBottom: '0.4rem' }}>Optimal Hedge Ratio</h4>
        <p className="note" style={{ marginBottom: '0.5rem' }}>The hedge position is chosen to minimize variance.</p>
        <p className="note">{String.raw`\[h^* = \frac{Cov(L,H)}{Var(H)}\]`}</p>
        <p className="note">
          where <code>L</code> is income loss and <code>H</code> is hedge payoff.
        </p>
      </div>

      <div className="card">
        <h3>Dynamic input example</h3>
        <p className="note" style={{ marginBottom: '0.5rem' }}>For the default dashboard configuration:</p>
        <p className="note">Industry: Tech</p>
        <p className="note">Company Size: Startup</p>
        <p className="note">Job Level: Entry</p>
        <p className="note">Salary: $120,000</p>
        <p className="note">Paths: 5000</p>
        <p className="note" style={{ marginBottom: '0.6rem' }}>Horizon: 10 years</p>

        <p className="note">{String.raw`\[S = 120000\]`}</p>
        <p className="note">{String.raw`\[N = 5000\]`}</p>
        <p className="note">{String.raw`\[T = 10\]`}</p>
        <p className="note" style={{ marginTop: '0.6rem' }}>{String.raw`\[W_t^{(1)}, W_t^{(2)}, ..., W_t^{(5000)}\]`}</p>
        <p className="note" style={{ marginTop: '0.5rem' }}>
          Monte Carlo output produces the simulated income distribution used to determine hedge size.
        </p>
      </div>

      <div className="card" style={{ marginTop: '0.8rem' }}>
        <h3>Step-by-step full walkthrough </h3>
        <p className="note" style={{ marginBottom: '0.7rem' }}>
          This is a worked example with explicit numbers so each stage is easy to follow. The arithmetic below is illustrative; production
          output is computed by the Python pipeline with calibrated data.
        </p>

        <h4 style={{ marginBottom: '0.35rem' }}>Step 1: Start with user inputs</h4>
        <p className="note">Industry = Tech, Company Size = Startup, Job Level = Entry</p>
        <p className="note">Salary = 120000 per year, Horizon = 10 years, Paths = 5000</p>
        <p className="note" style={{ marginBottom: '0.7rem' }}>{String.raw`\[S = 120000,\quad T = 10,\quad N = 5000\]`}</p>

        <h4 style={{ marginBottom: '0.35rem' }}>Step 2: Compute hazard intensity</h4>
        <p className="note">Suppose this month we observe unemployment and rates:</p>
        <p className="note">{String.raw`\[U_t = 0.050,\quad r_t = 0.045,\quad I_t = 0.70\]`}</p>
        <p className="note">Use example coefficients:</p>
        <p className="note">{String.raw`\[\alpha = 0.002,\ \beta_1 = 0.04,\ \beta_2 = 0.01,\ \beta_3 = 0.03\]`}</p>
        <p className="note">Then:</p>
        <p className="note" style={{ marginBottom: '0.7rem' }}>
          {String.raw`\[\lambda_t = 0.002 + 0.04(0.050) + 0.01(0.045) + 0.03(0.70) = 0.02545\]`}
        </p>

        <h4 style={{ marginBottom: '0.35rem' }}>Step 3: Turn hazard into job-loss event probability</h4>
        <p className="note">For a Poisson jump process in one period:</p>
        <p className="note">{String.raw`\[P(\text{job loss this period}) = 1 - e^{-\lambda_t}\]`}</p>
        <p className="note" style={{ marginBottom: '0.7rem' }}>{String.raw`\[1 - e^{-0.02545} \approx 0.0251\ (\text{about }2.51\%)\]`}</p>

        <h4 style={{ marginBottom: '0.35rem' }}>Step 4: Simulate one path's employment state</h4>
        <p className="note">Draw a random number for the period (example: 0.018).</p>
        <p className="note">Since 0.018 &lt; 0.0251, a job-loss event is triggered on this sample path.</p>
        <p className="note" style={{ marginBottom: '0.7rem' }}>
          If unemployment duration is sampled as 4 months, then for those months:
          {String.raw` \[E_t = 0\]`}
          and otherwise
          {String.raw` \[E_t = 1\]`}.
        </p>

        <h4 style={{ marginBottom: '0.35rem' }}>Step 5: Convert employment state into income path</h4>
        <p className="note">Monthly salary is 120000 / 12 = 10000.</p>
        <p className="note">{String.raw`\[dW_t = S E_t dt\]`}</p>
        <p className="note">So employed month income is 10000; unemployed month income is 0.</p>
        <p className="note" style={{ marginBottom: '0.7rem' }}>
          If 4 months are unemployed in year 1, then year-1 income is 80000 instead of 120000 (loss = 40000).
        </p>

        <h4 style={{ marginBottom: '0.35rem' }}>Step 6: Repeat for all Monte Carlo paths</h4>
        <p className="note">Run the same process for 5000 paths:</p>
        <p className="note">{String.raw`\[W_t^{(1)}, W_t^{(2)}, \ldots, W_t^{(5000)}\]`}</p>
        <p className="note" style={{ marginBottom: '0.7rem' }}>
          This produces a full income distribution (mean, percentiles, tails, and trigger probability).
        </p>

        <h4 style={{ marginBottom: '0.35rem' }}>Step 7: Size the hedge from simulated losses</h4>
        <p className="note">Use the minimum-variance hedge ratio:</p>
        <p className="note">{String.raw`\[h^* = \frac{Cov(L,H)}{Var(H)}\]`}</p>
        <p className="note">
          Example arithmetic:
          {String.raw` \[Cov(L,H)=2.4\times 10^8,\quad Var(H)=4.0\times 10^3 \Rightarrow h^*=60000\]`}
        </p>
        <p className="note">That hedge size is then translated into contracts, upfront cost, and payout profile on the dashboard.</p>
      </div>

      <div className="card" style={{ marginTop: '0.8rem' }}>
        <h3>How We Determine α, β1, β2, β3</h3>
        <p className="note" style={{ marginBottom: '0.55rem' }}>Model:</p>
        <p className="note">{String.raw`\[\lambda_t = \alpha + \beta_1 U_t + \beta_2 r_t + \beta_3 I_t\]`}</p>
        <p className="note" style={{ marginTop: '0.45rem' }}>
          where <code>U_t</code> is unemployment rate, <code>r_t</code> is interest rate, and <code>I_t</code> is industry risk indicator.
          Coefficients measure sensitivity of job-loss risk to each variable.
        </p>

        <h4 style={{ marginTop: '0.9rem', marginBottom: '0.35rem' }}>Step 1 — Collect historical data</h4>
        <p className="note" style={{ marginBottom: '0.45rem' }}>
          Build monthly rows with outcome and features:
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', padding: '0.4rem 0.35rem' }}>Month</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', padding: '0.4rem 0.35rem' }}>JobLoss</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', padding: '0.4rem 0.35rem' }}>Unemployment U_t</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', padding: '0.4rem 0.35rem' }}>Interest Rate r_t</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', padding: '0.4rem 0.35rem' }}>Industry Risk I_t</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Jan 2021</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>0</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>6.2%</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>0.25%</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>0.3</td>
              </tr>
              <tr>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Feb 2021</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>1</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>6.1%</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>0.25%</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>0.3</td>
              </tr>
              <tr>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Mar 2021</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>0</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>6.0%</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>0.25%</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>0.3</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="note" style={{ marginTop: '0.5rem' }}>
          Labeling rule: <code>JobLoss = 1</code> if a layoff occurred, otherwise <code>JobLoss = 0</code>.
        </p>
        <p className="note">
          Typical sources: BLS layoffs data, FRED unemployment, Fed funds rate, and JOLTS industry layoffs.
        </p>

        <h4 style={{ marginTop: '0.9rem', marginBottom: '0.35rem' }}>Step 2 — Run logistic regression</h4>
        <p className="note" style={{ marginBottom: '0.45rem' }}>
          Estimate:
        </p>
        <p className="note">{String.raw`\[P(\text{JobLoss})=\sigma(\beta_0+\beta_1U_t+\beta_2r_t+\beta_3I_t)\]`}</p>
        <p className="note">{String.raw`\[\sigma(x)=\frac{1}{1+e^{-x}}\]`}</p>
        <p className="note" style={{ marginTop: '0.45rem', marginBottom: '0.35rem' }}>Example regression output:</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', padding: '0.4rem 0.35rem' }}>Variable</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', padding: '0.4rem 0.35rem' }}>Coefficient</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Intercept</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>0.002</td>
              </tr>
              <tr>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Unemployment</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>0.04</td>
              </tr>
              <tr>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Interest Rate</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>0.01</td>
              </tr>
              <tr>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Industry Risk</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>0.03</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="note" style={{ marginTop: '0.55rem' }}>
          So:
          {String.raw` \[\alpha = 0.002,\ \beta_1 = 0.04,\ \beta_2 = 0.01,\ \beta_3 = 0.03\]`}
        </p>
      </div>

      <Footer />
    </div>
  );
}
