'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import Footer from '@/components/Footer';

export default function VariablesPage() {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.MathJax?.typesetPromise) {
      window.MathJax.typesetPromise();
    }
  }, []);

  return (
    <div className="container" style={{ maxWidth: 960 }}>
      <h1 className="section-title">Variables and Coefficients</h1>
      <p className="note" style={{ marginBottom: '1rem' }}>
        Plain-English definitions of every core model variable and how each one is estimated or computed.
      </p>
      <div className="doc-switch" style={{ marginBottom: '1rem' }}>
        <Link href="/documentation" className="doc-switch-link">Overview</Link>
        <Link href="/variables" className="doc-switch-link active">Variables</Link>
      </div>

      <div className="card" style={{ marginBottom: '0.8rem' }}>
        <h3>Core hazard equation</h3>
        <p className="note">{String.raw`\[\lambda_t = \alpha + \beta_1 U_t + \beta_2 r_t + \beta_3 I_t\]`}</p>
        <p className="note" style={{ marginTop: '0.5rem' }}>
          This equation maps macro conditions and industry risk into a period-by-period job-loss intensity.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '0.8rem' }}>
        <h3>Variable dictionary (English + source)</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', padding: '0.45rem 0.35rem' }}>Variable</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', padding: '0.45rem 0.35rem' }}>Meaning in plain English</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', padding: '0.45rem 0.35rem' }}>How we get it</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>{String.raw`\(\lambda_t\)`}</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Job-loss intensity at time t.</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Computed from alpha, betas, and current inputs U_t, r_t, I_t.</td>
              </tr>
              <tr>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>{String.raw`\(\alpha\)`}</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Baseline job-loss level when features are zeroed.</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Intercept from logistic regression on historical data.</td>
              </tr>
              <tr>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>{String.raw`\(\beta_1\)`}</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Sensitivity to unemployment rate.</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Estimated regression coefficient on U_t.</td>
              </tr>
              <tr>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>{String.raw`\(\beta_2\)`}</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Sensitivity to interest rates.</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Estimated regression coefficient on r_t.</td>
              </tr>
              <tr>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>{String.raw`\(\beta_3\)`}</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Sensitivity to industry-specific risk.</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Estimated regression coefficient on I_t.</td>
              </tr>
              <tr>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>{String.raw`\((U_t)\)`}</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Macro unemployment level at time t.</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Pulled from BLS/FRED unemployment series.</td>
              </tr>
              <tr>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>{String.raw`\((r_t)\)`}</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Interest-rate environment at time t.</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Pulled from Fed funds/FRED rate series.</td>
              </tr>
              <tr>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>{String.raw`\((I_t)\)`}</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Industry risk index at time t.</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Built from industry layoff intensity (JOLTS/BLS).</td>
              </tr>
              <tr>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>{String.raw`\((N_t)\)`}</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Job-loss jump count process.</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>{String.raw`Simulated as \(\text{Poisson}(\lambda_t)\).`}</td>
              </tr>
              <tr>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>{String.raw`\((E_t)\)`}</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Employment state (1 employed, 0 unemployed).</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Derived from simulated jump timing and unemployment duration.</td>
              </tr>
              <tr>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>{String.raw`\((S)\)`}</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Annual salary.</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Direct dashboard input from the user.</td>
              </tr>
              <tr>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>{String.raw`\((W_t)\)`}</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Income process through time.</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>{String.raw`Integrated from \(dW_t = S E_t dt\).`}</td>
              </tr>
              <tr>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>{String.raw`\((N)\)`}</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Number of Monte Carlo paths.</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>User input (`n_paths`), bounded in the UI.</td>
              </tr>
              <tr>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>{String.raw`\((T)\)`}</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Simulation horizon in years.</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>User input (`horizon_years`).</td>
              </tr>
              <tr>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>{String.raw`\((L)\)`}</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Income loss from unemployment scenarios.</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Difference between baseline and simulated no-hedge income.</td>
              </tr>
              <tr>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>{String.raw`\((H)\)`}</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Hedge payoff from contracts in stress scenarios.</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Computed from contract count, trigger condition, and payout rule.</td>
              </tr>
              <tr>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>{String.raw`\((h^*)\)`}</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>Optimal hedge ratio / position size.</td>
                <td style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem' }}>{String.raw`Computed by \(h^*=\frac{Cov(L,H)}{Var(H)}\).`}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '0.8rem' }}>
        <h3>How alpha and betas are estimated</h3>
        <h4 style={{ marginBottom: '0.35rem' }}>Step 1 - Build training dataset</h4>
        <p className="note">Each row is a month with a layoff label and feature values.</p>
        <p className="note" style={{ marginTop: '0.45rem' }}>
          {String.raw`\[\text{JobLoss}_t \in \{0,1\},\ U_t,\ r_t,\ I_t\]`}
        </p>
        <p className="note" style={{ marginTop: '0.5rem' }}>
          Example row format: Jan-2021, JobLoss=0, U_t=6.2%, r_t=0.25%, I_t=0.3.
        </p>

        <h4 style={{ marginTop: '0.9rem', marginBottom: '0.35rem' }}>Step 2 - Fit logistic regression</h4>
        <p className="note">{String.raw`\[P(\text{JobLoss})=\sigma(\beta_0+\beta_1U_t+\beta_2r_t+\beta_3I_t)\]`}</p>
        <p className="note">{String.raw`\[\sigma(x)=\frac{1}{1+e^{-x}}\]`}</p>
        <p className="note" style={{ marginTop: '0.5rem' }}>Example estimated coefficients:</p>
        <p className="note">{String.raw`\[\alpha=0.002,\ \beta_1=0.04,\ \beta_2=0.01,\ \beta_3=0.03\]`}</p>
      </div>

      <div className="card">
        <h3>Dashboard output variables</h3>
        <p className="note">
          <code>contracts</code> = recommended contract count from model sizing, <code>contractPrice</code> = price per contract,
          <code> totalCost</code> = contracts * contractPrice, <code>payout</code> = payout if trigger occurs, and
          <code> triggerRate</code> = share of simulated paths that trigger.
        </p>
      </div>

      <Footer />
    </div>
  );
}
