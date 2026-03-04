"""
Full system pipeline for job-loss hedging.

personal data
    ↓
macro data (FRED/BLS)
    ↓
hazard model
    ↓
job-loss probability
    ↓
Poisson stochastic model
    ↓
Monte Carlo simulation
    ↓
income distribution
    ↓
Kalshi market data
    ↓
optimal hedge ratio
    ↓
hedge portfolio
"""

# Load config first so FRED_API_KEY, BLS_API_KEY are available
from config import load_config
load_config()

from typing import Optional
import numpy as np


def run_pipeline(
    fred_api_key: Optional[str] = None,
    n_paths: int = 10_000,
    horizon_years: int = 10,
    salary: float = 120_000,
    contract_price: float = 0.30,
    n_contracts: Optional[int] = None,
    seed: Optional[int] = 42,
    industry: str = "tech",
    company_size: str = "startup",
    job_level: str = "entry",
    tenure_years: float = 1.0,
) -> dict:
    """
    Run full pipeline: data -> hazard -> Monte Carlo -> risk -> optimal hedge.

    Returns dict with all results.
    """
    from hazard_model import (
        HazardModelParams,
        get_lambda,
        industry_risk_from_personal,
        build_training_data,
        fit_hazard_model,
    )
    from monte_carlo import (
        MonteCarloConfig,
        run_monte_carlo,
        compute_risk_metrics,
        optimal_hedge_ratio,
        RiskMetrics,
    )

    # Personal data
    ind_risk = industry_risk_from_personal(industry, company_size, job_level)
    rate = 4.0  # baseline interest rate

    # Hazard model (use defaults if no FRED data)
    params = HazardModelParams(
        beta0=-5.0,
        beta_unemployment=0.06,
        beta_industry=0.2,
        beta_interest_rate=0.01,
    )
    if fred_api_key:
        try:
            from data_fetcher import load_model_inputs, PersonalRiskFactors
            personal = PersonalRiskFactors(
                industry=industry,
                company_size=company_size,
                job_level=job_level,
                tenure_years=tenure_years,
                salary=salary,
            )
            data = load_model_inputs(fred_api_key=fred_api_key, personal=personal)
            X, y = build_training_data(data["macro_state"])
            fitted = fit_hazard_model(X, y)
            # Sanity check: reject params that would give >5% weekly hazard (absurd job loss)
            test_lam = get_lambda(fitted, 5.0, 0.5, 4.0)
            if test_lam < 0.05:
                params = fitted
        except Exception:
            pass

    # Hedge size: ~6 months salary at $1/contract
    if n_contracts is None:
        n_contracts = int(salary * 0.5)

    # Lambda as function of (t, unemployment_path)
    def get_lam(t: int, u_path: np.ndarray) -> float:
        return get_lambda(params, u_path[t], ind_risk, rate)

    # Monte Carlo config
    cfg = MonteCarloConfig(
        n_paths=n_paths,
        horizon_weeks=horizon_years * 52,
        salary_weekly=salary / 52,
        seed=seed,
    )

    # Run once with hedge; income = without hedge, total_wealth = with hedge
    results, incomes_no_hedge, total_with_hedge = run_monte_carlo(
        get_lam,
        contract_price=contract_price,
        n_contracts=n_contracts,
        hedge_threshold=7.0,
        config=cfg,
    )
    baseline = cfg.horizon_weeks * cfg.salary_weekly
    job_losses = [r.job_loss_week for r in results]

    risk_no = compute_risk_metrics(incomes_no_hedge, baseline, job_losses)
    risk_hedge = compute_risk_metrics(total_with_hedge, baseline, job_losses)

    # Optimal hedge ratio: h* = Cov(Loss, Hedge) / Var(Hedge)
    losses = np.array([r.loss for r in results])
    hedge_binary = np.array([1.0 if r.hedge_payoff > 0 else 0.0 for r in results])
    h_star = optimal_hedge_ratio(losses, hedge_binary)

    # Variance reduction
    var_reduction = (risk_no.variance - risk_hedge.variance) / (risk_no.variance + 1e-10) * 100
    tail_reduction = (risk_no.tail_prob_50pct_drop - risk_hedge.tail_prob_50pct_drop) * 100

    return {
        "params": params,
        "risk_without_hedge": risk_no,
        "risk_with_hedge": risk_hedge,
        "optimal_hedge_ratio": h_star,
        "optimal_contracts": h_star,
        "variance_reduction_pct": var_reduction,
        "tail_prob_reduction_pct": tail_reduction,
        "incomes_no_hedge": incomes_no_hedge,
        "incomes_with_hedge": total_with_hedge,
        "results": results,
        "contract_price": contract_price,
        "hedge_threshold": 7.0,
        "inputs": {
            "industry": industry,
            "company_size": company_size,
            "job_level": job_level,
            "tenure_years": tenure_years,
            "salary": salary,
            "n_paths": n_paths,
            "horizon_years": horizon_years,
        },
    }


if __name__ == "__main__":
    import os
    out = run_pipeline(
        fred_api_key=os.environ.get("FRED_API_KEY"),
        n_paths=5000,
        horizon_years=10,
        seed=42,
    )
    rn, rh = out["risk_without_hedge"], out["risk_with_hedge"]
    print("=== Risk Metrics ===")
    print(f"Without hedge: mean=${rn.mean:,.0f}, var={rn.variance:,.0f}, ES5%=${rn.expected_shortfall_5pct:,.0f}, P(drop>50%)={rn.tail_prob_50pct_drop:.1%}")
    print(f"With hedge:    mean=${rh.mean:,.0f}, var={rh.variance:,.0f}, ES5%=${rh.expected_shortfall_5pct:,.0f}, P(drop>50%)={rh.tail_prob_50pct_drop:.1%}")
    print(f"\nOptimal hedge ratio h*: {out['optimal_hedge_ratio']:.2f}")
    print(f"Variance reduction: {out['variance_reduction_pct']:.1f}%")
    print(f"Tail probability reduction: {out['tail_prob_reduction_pct']:.1f}pp")
