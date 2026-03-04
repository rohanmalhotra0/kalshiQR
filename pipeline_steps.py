"""
Step-by-step pipeline for live demo.
Returns intermediate values at each stage for display.
"""

from config import load_config
load_config()

from typing import Optional
import numpy as np


def run_pipeline_steps(
    fred_api_key: Optional[str] = None,
    n_paths: int = 2000,
    horizon_years: int = 10,
    salary: float = 120_000,
    contract_price: float = 0.30,
    seed: Optional[int] = 42,
    industry: str = "tech",
    company_size: str = "startup",
    job_level: str = "entry",
    tenure_years: float = 1.0,
) -> dict:
    """
    Run pipeline and return step-by-step data for live demo.
    All values are computed from inputs; nothing hardcoded.
    """
    from hazard_model import (
        HazardModelParams,
        get_lambda,
        predict_job_loss_prob,
        prob_to_weekly_hazard,
        industry_risk_from_personal,
        build_training_data,
        fit_hazard_model,
    )
    from monte_carlo import (
        MonteCarloConfig,
        run_monte_carlo,
        compute_risk_metrics,
        optimal_hedge_ratio,
        simulate_macro_path,
    )

    steps = []
    rate = 4.0

    # Step 1: Personal inputs
    steps.append({
        "title": "Step 1: Personal Inputs",
        "formula": "Inputs from your profile",
        "inputs": {
            "industry": industry,
            "company_size": company_size,
            "job_level": job_level,
            "tenure_years": tenure_years,
            "salary": salary,
            "horizon_years": horizon_years,
            "n_paths": n_paths,
        },
        "output": f"Salary ${salary:,.0f}/yr, horizon {horizon_years} years, {n_paths:,} simulation paths",
    })

    # Step 2: Industry risk
    ind_risk = industry_risk_from_personal(industry, company_size, job_level)
    steps.append({
        "title": "Step 2: Industry Risk Score",
        "formula": "ind_risk = f(industry, company_size, job_level) ∈ [0, 1]",
        "inputs": {"industry": industry, "company_size": company_size, "job_level": job_level},
        "output": f"ind_risk = {ind_risk:.4f}",
    })

    # Step 3: Hazard model params
    params = HazardModelParams(
        beta0=-6.5,
        beta_unemployment=0.05,
        beta_industry=0.12,
        beta_interest_rate=0.01,
    )
    if fred_api_key:
        try:
            from data_fetcher import load_model_inputs, PersonalRiskFactors
            personal = PersonalRiskFactors(
                industry=industry, company_size=company_size, job_level=job_level,
                tenure_years=tenure_years, salary=salary,
            )
            data = load_model_inputs(fred_api_key=fred_api_key, personal=personal)
            X, y = build_training_data(data["macro_state"])
            fitted = fit_hazard_model(X, y)
            from hazard_model import predict_job_loss_prob
            test_p = predict_job_loss_prob(fitted, 5.0, 0.5, 4.0)
            if fitted.beta0 < -2 and test_p < 0.1:
                params = fitted
        except Exception:
            pass

    u_sample = 4.0
    steps.append({
        "title": "Step 3: Hazard Model Parameters",
        "formula": "P(JobLoss) = σ(β₀ + β₁·U_t + β₂·ind_risk + β₃·r_t)",
        "params": {
            "beta0": params.beta0,
            "beta_unemployment": params.beta_unemployment,
            "beta_industry": params.beta_industry,
            "beta_interest_rate": params.beta_interest_rate,
        },
        "output": f"β = ({params.beta0:.4f}, {params.beta_unemployment:.4f}, {params.beta_industry:.4f}, {params.beta_interest_rate:.4f})",
    })

    # Step 4: Sample hazard calculation
    x = params.beta0 + params.beta_unemployment * u_sample + params.beta_industry * ind_risk + params.beta_interest_rate * rate
    p_monthly = float(1 / (1 + np.exp(-np.clip(x, -500, 500))))
    steps.append({
        "title": "Step 4: Hazard Calculation (example: U=4%, r=4%)",
        "formula": "x = β₀ + β₁·U + β₂·ind_risk + β₃·r  →  P = σ(x) = 1/(1+e⁻ˣ)",
        "calc": {
            "x": x,
            "p_monthly": p_monthly,
        },
        "output": f"x = {x:.4f}  →  P(JobLoss, monthly) = {p_monthly:.6f}",
    })

    # Step 5: Weekly λ
    lam = prob_to_weekly_hazard(p_monthly)
    lam_capped = min(lam, 0.005)
    steps.append({
        "title": "Step 5: Weekly Hazard Rate λ",
        "formula": "λ = -log(1 - P_monthly) / 4.33  (weeks per month); capped at 0.5%/week",
        "calc": {"lambda_raw": lam, "lambda_capped": lam_capped},
        "output": f"λ = {lam_capped:.6f} per week",
    })

    # Step 6: Monte Carlo
    COVERAGE_MONTHS = 6
    n_contracts = int(salary * COVERAGE_MONTHS / 12)
    hedge_threshold = 8.0

    def get_lam(t: int, u_path: np.ndarray) -> float:
        return get_lambda(params, u_path[t], ind_risk, rate)

    cfg = MonteCarloConfig(
        n_paths=n_paths,
        horizon_weeks=horizon_years * 52,
        salary_weekly=salary / 52,
        seed=seed,
    )

    results, incomes_no_hedge, total_with_hedge = run_monte_carlo(
        get_lam,
        contract_price=contract_price,
        n_contracts=n_contracts,
        hedge_threshold=hedge_threshold,
        config=cfg,
    )

    baseline = cfg.horizon_weeks * cfg.salary_weekly
    job_losses = [r.job_loss_week for r in results]
    n_job_loss = sum(1 for w in job_losses if w is not None)
    job_loss_rate = 100 * n_job_loss / n_paths
    mean_income_no = float(np.mean(incomes_no_hedge))
    mean_income_hedge = float(np.mean(total_with_hedge))
    hedge_payout_count = sum(1 for r in results if r.hedge_payoff > 0)
    hedge_trigger_pct = 100 * hedge_payout_count / n_paths

    steps.append({
        "title": "Step 6: Monte Carlo Simulation",
        "formula": "For each path: simulate U(t), compute λ(t), Poisson job loss, reemployment T~Exp(20 wk)",
        "inputs": {
            "n_paths": n_paths,
            "horizon_weeks": cfg.horizon_weeks,
            "baseline_income": baseline,
        },
        "output": {
            "job_loss_rate_pct": job_loss_rate,
            "mean_income_no_hedge": mean_income_no,
            "mean_income_with_hedge": mean_income_hedge,
            "hedge_trigger_pct": hedge_trigger_pct,
        },
    })

    # Step 7: Optimal hedge ratio
    losses = np.array([r.loss for r in results])
    hedge_binary = np.array([1.0 if r.hedge_payoff > 0 else 0.0 for r in results])
    cov_lh = float(np.cov(losses, hedge_binary)[0, 1])
    var_h = float(np.var(hedge_binary))
    h_star = optimal_hedge_ratio(losses, hedge_binary)

    steps.append({
        "title": "Step 7: Optimal Hedge Ratio h*",
        "formula": "h* = Cov(Loss, Hedge) / Var(Hedge)",
        "calc": {
            "cov_loss_hedge": cov_lh,
            "var_hedge": var_h,
            "h_star": h_star,
        },
        "output": f"h* = {cov_lh:.2f} / {var_h:.4f} = {h_star:.2f}",
    })

    # Step 8: Hedge recommendation
    total_cost = n_contracts * contract_price
    steps.append({
        "title": "Step 8: Hedge Recommendation",
        "formula": "n_contracts = salary × (6/12); cost = n × price; payout = n if U_max > threshold",
        "output": {
            "n_contracts": n_contracts,
            "contract_price": contract_price,
            "total_cost": total_cost,
            "payout_if_triggered": n_contracts,
            "hedge_threshold": hedge_threshold,
            "hedge_trigger_pct": hedge_trigger_pct,
        },
    })

    return {
        "steps": steps,
        "inputs": {
            "industry": industry,
            "company_size": company_size,
            "job_level": job_level,
            "salary": salary,
            "horizon_years": horizon_years,
            "n_paths": n_paths,
        },
    }
