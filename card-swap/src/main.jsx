import React from 'react';
import ReactDOM from 'react-dom/client';
import CardSwap, { Card } from './CardSwap';

const cards = [
  {
    title: 'Hazard Model',
    code: `def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-x))

def predict_job_loss_prob(params, u, ind_risk, r):
    x = params.beta0 + params.beta_unemployment * u
         + params.beta_industry * ind_risk
         + params.beta_interest_rate * r
    return float(sigmoid(np.array([x]))[0])`,
    file: 'hazard_model.py',
  },
  {
    title: 'Monte Carlo',
    code: `for t in range(horizon_weeks):
    if employed[t]:
        lam = get_lambda_fn(t, u_path)
        jump = np.random.poisson(lam) > 0
        if jump:
            duration = np.random.exponential(20)
            employed[t:t+duration] = 0
            total_loss += duration * salary_weekly
income = sum(salary_weekly for w in employed if w)`,
    file: 'monte_carlo.py',
  },
  {
    title: 'Optimal Hedge',
    code: `def optimal_hedge_ratio(losses, hedge_payoffs):
    """h* = Cov(Loss, Hedge) / Var(Hedge)"""
    cov = np.cov(losses, hedge_payoffs)[0, 1]
    var = np.var(hedge_payoffs)
    return cov / var if var > 1e-10 else 0`,
    file: 'monte_carlo.py',
  },
  {
    title: 'Pipeline',
    code: `personal data → macro (FRED/BLS)
    → hazard model → job-loss λ
    → Poisson + Monte Carlo
    → income distribution
    → optimal hedge ratio
    → hedge portfolio`,
    file: 'pipeline.py',
  },
];

function App() {
  return (
    <div style={{ height: '320px', position: 'relative', width: '100%', maxWidth: '560px', margin: '0 auto' }}>
      <CardSwap
        width={480}
        height={280}
        cardDistance={50}
        verticalDistance={60}
        delay={2500}
        pauseOnHover={true}
        skewAmount={6}
        easing="elastic"
      >
        {cards.map((c, i) => (
          <Card key={i}>
            <h3>{c.title}</h3>
            <pre>{c.code}</pre>
            <span className="file">{c.file}</span>
          </Card>
        ))}
      </CardSwap>
    </div>
  );
}

const root = document.getElementById('card-swap-root');
if (root) {
  ReactDOM.createRoot(root).render(React.createElement(App));
}
