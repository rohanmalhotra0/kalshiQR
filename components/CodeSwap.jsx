'use client';

import { useEffect, useMemo, useState } from 'react';

const CARDS = [
  {
    title: 'Hazard Model',
    code: `def sigmoid(x):\n    return 1.0 / (1.0 + np.exp(-x))\n\ndef predict_job_loss_prob(params, u, ind_risk, r):\n    x = params.beta0 + params.beta_unemployment * u\n    return float(sigmoid(np.array([x]))[0])`,
    file: 'hazard_model.py',
  },
  {
    title: 'Monte Carlo',
    code: `for t in range(horizon_weeks):\n    if employed[t]:\n        lam = get_lambda_fn(t, u_path)\n        if np.random.poisson(lam) > 0:\n            employed[t:t+duration] = 0`,
    file: 'monte_carlo.py',
  },
  {
    title: 'Optimal Hedge',
    code: `def optimal_hedge_ratio(losses, hedge_payoffs):\n    cov = np.cov(losses, hedge_payoffs)[0, 1]\n    var = np.var(hedge_payoffs)\n    return cov / var if var > 1e-10 else 0`,
    file: 'pipeline.py',
  },
  {
    title: 'Pipeline',
    code: `personal data -> macro -> hazard model\n-> monte carlo -> income distribution\n-> contract sizing`,
    file: 'pipeline.py',
  },
];

export default function CodeSwap() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setIdx((v) => (v + 1) % CARDS.length), 2200);
    return () => window.clearInterval(timer);
  }, []);

  const order = useMemo(() => [CARDS[idx], CARDS[(idx + 1) % 4], CARDS[(idx + 2) % 4]], [idx]);
  const stacked = useMemo(() => [...order].reverse(), [order]);

  return (
    <div style={{ position: 'relative', height: 290, maxWidth: 560, margin: '0 auto' }}>
      {stacked.map((card, i) => (
        <div
          key={card.title}
          className="card"
          style={{
            position: 'absolute',
            inset: 0,
            transform: `translateY(${i * 14}px) scale(${1 - i * 0.03})`,
            opacity: i === 2 ? 1 : i === 1 ? 0.72 : 0.45,
            zIndex: 3 - i,
          }}
        >
          <h3>{card.title}</h3>
          <pre style={{ background: 'var(--surface2)', borderRadius: 8, padding: '0.75rem', overflow: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.73rem' }}>{card.code}</pre>
          <p className="note" style={{ marginTop: '0.4rem' }}>{card.file}</p>
        </div>
      ))}
    </div>
  );
}
