'use client';

import Footer from '@/components/Footer';
import { useEffect } from 'react';

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
        <h3>Research Pipeline (TikZ)</h3>
        <p className="note" style={{ marginBottom: '0.6rem' }}>
          The following TikZ diagram is used in the research paper.
        </p>
        <pre className="math-code">
{String.raw`\begin{tikzpicture}[
node distance=2cm,
box/.style={rectangle, draw, rounded corners, minimum width=3cm, minimum height=1cm, align=center}
]

\node (personal) [box] {Personal Data\\(salary, industry, tenure)};

\node (hazard) [box, below of=personal]
{Hazard Model\\$\lambda_t = \alpha + \beta_1 U_t + \beta_2 r_t + \beta_3 I_t$};

\node (simulation) [box, below of=hazard]
{Job Loss Simulation\\$N_t \sim Poisson(\lambda_t)$};

\node (mc) [box, below of=simulation] {Monte Carlo Paths\\$N = 5000$};

\node (hedge) [box, below of=mc] {Optimal Hedge\\$h^* = \frac{Cov(L,H)}{Var(H)}$};

\draw[->] (personal) -- (hazard);
\draw[->] (hazard) -- (simulation);
\draw[->] (simulation) -- (mc);
\draw[->] (mc) -- (hedge);

\end{tikzpicture}`}
        </pre>
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

      <Footer />
    </div>
  );
}
