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
      <p className="note" style={{ marginBottom: '1rem' }}>
        Pipeline, equations, and dynamic model settings used in production.
      </p>

      <div className="card" style={{ marginBottom: '0.8rem' }}>
        <h3>Pipeline Diagram</h3>
        <div className="pipeline-flow">
          <div className="pipeline-box">Personal Data</div>
          <div className="pipeline-arrow">↓</div>
          <div className="pipeline-box">Hazard Model</div>
          <div className="pipeline-arrow">↓</div>
          <div className="pipeline-box">Job Loss Simulation</div>
          <div className="pipeline-arrow">↓</div>
          <div className="pipeline-box">Monte Carlo</div>
          <div className="pipeline-arrow">↓</div>
          <div className="pipeline-box">Optimal Hedge</div>
        </div>
        <p className="note" style={{ marginTop: '0.7rem' }}>
          Research-style TikZ source used for paper-quality diagrams:
        </p>
        <pre className="math-code">
{String.raw`\begin{tikzpicture}[
node distance=2cm,
box/.style={rectangle, draw, rounded corners, minimum width=3cm, minimum height=1cm, align=center}
]
\node (personal) [box] {Personal Data\\(salary, industry, tenure)};
\node (hazard) [box, below of=personal] {Hazard Model\\$\lambda_t = \alpha + \beta_1 U_t + \beta_2 r_t$};
\node (simulation) [box, below of=hazard] {Job Loss Simulation\\$N_t \sim Poisson(\lambda_t)$};
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
        <p className="note">{String.raw`\[\lambda_t = \alpha + \beta_1 U_t + \beta_2 r_t + \beta_3 I_t\]`}</p>
        <p className="note">
          where <code>U_t</code> is unemployment rate, <code>r_t</code> is interest rate, and <code>I_t</code> is industry risk.
        </p>
        <p className="note" style={{ marginTop: '0.6rem' }}>{String.raw`\[N_t \sim Poisson(\lambda_t)\]`}</p>
        <p className="note">{String.raw`\[E_t = \begin{cases}1 & \text{employed} \\ 0 & \text{unemployed}\end{cases}\]`}</p>
        <p className="note" style={{ marginTop: '0.6rem' }}>{String.raw`\[dW_t = S E_t dt\]`}</p>
        <p className="note">where <code>S</code> is salary.</p>
        <p className="note" style={{ marginTop: '0.6rem' }}>{String.raw`\[W_t^{(1)}, W_t^{(2)}, ..., W_t^{(N)} \quad,\quad N = 5000\]`}</p>
        <p className="note">We simulate 5000 career paths over a 10-year horizon by default.</p>
        <p className="note" style={{ marginTop: '0.6rem' }}>{String.raw`\[h^* = \frac{Cov(L,H)}{Var(H)}\]`}</p>
        <p className="note">
          where <code>L</code> is income loss and <code>H</code> is hedge payoff.
        </p>
      </div>

      <div className="card">
        <h3>Dynamic input example</h3>
        <p className="note">For the default dashboard-like case (Tech, Startup, Entry, salary 120000, paths 5000, horizon 10):</p>
        <p className="note" style={{ marginTop: '0.6rem' }}>{String.raw`\[S = 120000\]`}</p>
        <p className="note">{String.raw`\[T = 10 \text{ years}\]`}</p>
        <p className="note">{String.raw`\[N = 5000\]`}</p>
        <p className="note">{String.raw`\[W_t^{(1)}, W_t^{(2)}, ..., W_t^{(5000)}\]`}</p>
      </div>

      <Footer />
    </div>
  );
}
