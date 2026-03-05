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
        <svg viewBox="0 0 720 560" style={{ width: '100%', maxWidth: 720, display: 'block', margin: '0.4rem auto 0' }}>
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto">
              <path d="M0,0 L10,4 L0,8 Z" fill="rgba(90,90,90,0.9)" />
            </marker>
          </defs>

          <rect x="190" y="20" width="340" height="70" rx="12" fill="rgba(255,255,255,0.9)" stroke="rgba(130,130,130,0.65)" />
          <text x="360" y="50" textAnchor="middle" fontSize="16" fill="rgba(40,40,40,0.95)">Personal Data</text>
          <text x="360" y="72" textAnchor="middle" fontSize="13" fill="rgba(95,95,95,0.95)">(salary, industry, tenure)</text>

          <rect x="190" y="125" width="340" height="70" rx="12" fill="rgba(255,255,255,0.9)" stroke="rgba(130,130,130,0.65)" />
          <text x="360" y="155" textAnchor="middle" fontSize="16" fill="rgba(40,40,40,0.95)">Hazard Model</text>
          <text x="360" y="177" textAnchor="middle" fontSize="13" fill="rgba(95,95,95,0.95)">λₜ = α + β₁Uₜ + β₂rₜ</text>

          <rect x="190" y="230" width="340" height="70" rx="12" fill="rgba(255,255,255,0.9)" stroke="rgba(130,130,130,0.65)" />
          <text x="360" y="260" textAnchor="middle" fontSize="16" fill="rgba(40,40,40,0.95)">Job Loss Simulation</text>
          <text x="360" y="282" textAnchor="middle" fontSize="13" fill="rgba(95,95,95,0.95)">Nₜ ~ Poisson(λₜ)</text>

          <rect x="190" y="335" width="340" height="70" rx="12" fill="rgba(255,255,255,0.9)" stroke="rgba(130,130,130,0.65)" />
          <text x="360" y="365" textAnchor="middle" fontSize="16" fill="rgba(40,40,40,0.95)">Monte Carlo Paths</text>
          <text x="360" y="387" textAnchor="middle" fontSize="13" fill="rgba(95,95,95,0.95)">N = 5000</text>

          <rect x="190" y="440" width="340" height="70" rx="12" fill="rgba(255,255,255,0.9)" stroke="rgba(130,130,130,0.65)" />
          <text x="360" y="470" textAnchor="middle" fontSize="16" fill="rgba(40,40,40,0.95)">Optimal Hedge</text>
          <text x="360" y="492" textAnchor="middle" fontSize="13" fill="rgba(95,95,95,0.95)">h* = Cov(L,H) / Var(H)</text>

          <line x1="360" y1="90" x2="360" y2="121" stroke="rgba(90,90,90,0.9)" strokeWidth="2" markerEnd="url(#arrow)" />
          <line x1="360" y1="195" x2="360" y2="226" stroke="rgba(90,90,90,0.9)" strokeWidth="2" markerEnd="url(#arrow)" />
          <line x1="360" y1="300" x2="360" y2="331" stroke="rgba(90,90,90,0.9)" strokeWidth="2" markerEnd="url(#arrow)" />
          <line x1="360" y1="405" x2="360" y2="436" stroke="rgba(90,90,90,0.9)" strokeWidth="2" markerEnd="url(#arrow)" />
        </svg>
        <p className="note" style={{ marginTop: '0.7rem' }}>
          The browser cannot execute TikZ directly. This is the rendered on-page equivalent; the TikZ source below is copy-ready for Overleaf/papers.
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
