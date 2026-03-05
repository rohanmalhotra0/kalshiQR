"""
End-to-end model run: data -> hazard -> stochastic -> hedge.

Example usage:
    python run_model.py
"""

import os
from config import load_config
load_config()

# Optional: load data if FRED key available
def run_with_data():
    try:
        from data_fetcher import load_model_inputs, PersonalRiskFactors
    except ImportError:
        print("Install pandas, fredapi, requests for data loading. Using defaults.")
        return run_with_defaults()
    from hazard_model import (
        build_training_data,
        fit_hazard_model,
        get_lambda,
        industry_risk_from_personal,
    )
    from stochastic_model import simulate_paths, constant_lambda
    from hedge_model import KalshiContract, hedge_value, hedge_payoff

    fred_key = os.environ.get("FRED_API_KEY", "")
    if not fred_key:
        print("Set FRED_API_KEY to run with live data. Running with defaults.")
        return run_with_defaults()

    personal = PersonalRiskFactors(
        industry="tech",
        company_size="startup",
        tenure_years=1,
        salary=120_000,
    )
    data = load_model_inputs(
        fred_api_key=fred_key,
        personal=personal,
        start_year="2020",
        end_year="2024",
    )

    # Fit hazard model
    X, y = build_training_data(data["macro_state"])
    params = fit_hazard_model(X, y)
    print("Hazard model params:", params.to_dict())

    # Get λ from current macro (use latest row)
    macro = data["macro_state"]
    if not macro.empty:
        row = macro.iloc[-1]
        unemp = float(row.get("U_t", row.get("UNRATE", 4.0)))
        rate = float(row.get("r_t", row.get("FEDFUNDS", 4.0)))
    else:
        unemp, rate = 4.0, 4.0
    ind_risk = industry_risk_from_personal(personal.industry, personal.company_size, personal.job_level)
    lam = get_lambda(params, unemp, ind_risk, rate)
    print(f"Current λ (weekly hazard): {lam:.6f}")

    # Simulate
    salary_weekly = personal.salary / 52
    results = simulate_paths(constant_lambda(lam), salary_weekly, weeks=260, n_paths=1000, seed=42)
    job_losses = sum(1 for r in results if r.job_loss_week is not None)
    print(f"Simulated 1000 paths, 260 weeks: {job_losses} job losses ({100*job_losses/1000:.1f}%)")

    # Hedge example
    contract = KalshiContract(
        event="unemployment_above_6",
        threshold=6.0,
        market_price=0.30,
    )
    n_contracts = 60  # hedge ~6 months salary at $1/contract
    cost = hedge_value(contract.market_price, n_contracts)
    print(f"\nHedge: {n_contracts} contracts @ ${contract.market_price:.2f} = ${cost:.0f} cost")
    print(f"If unemployment > 6%: payoff ${hedge_payoff(True, n_contracts):.0f}")


def run_with_defaults():
    """Run without FRED data using default hazard params."""
    from hazard_model import (
        HazardModelParams,
        get_lambda,
        industry_risk_from_personal,
    )
    from stochastic_model import simulate_paths, constant_lambda
    from hedge_model import KalshiContract, hedge_value, hedge_payoff

    params = HazardModelParams(
        beta0=-5.0,
        beta_unemployment=0.06,
        beta_industry=0.2,
        beta_interest_rate=0.01,
    )
    unemp, ind_risk, rate = 4.0, 0.7, 4.0  # 4% unemp, startup risk, 4% rate
    lam = get_lambda(params, unemp, ind_risk, rate)
    print(f"λ (weekly hazard): {lam:.6f}")

    salary_weekly = 120_000 / 52
    results = simulate_paths(constant_lambda(lam), salary_weekly, weeks=260, n_paths=1000, seed=42)
    job_losses = sum(1 for r in results if r.job_loss_week is not None)
    print(f"Simulated 1000 paths: {job_losses} job losses ({100*job_losses/1000:.1f}%)")

    contract = KalshiContract(event="unemployment_above_6", threshold=6.0, market_price=0.30)
    n = 60
    print(f"\nHedge: {n} contracts @ ${contract.market_price:.2f} = ${hedge_value(0.30, n):.0f}")
    print(f"If event: payoff ${hedge_payoff(True, n):.0f}")


def run_full_pipeline():
    """Run full Monte Carlo pipeline with risk metrics and optimal hedge."""
    from pipeline import run_pipeline

    out = run_pipeline(
        fred_api_key=os.environ.get("FRED_API_KEY"),
        n_paths=5000,
        horizon_years=10,
        seed=42,
    )
    rn, rh = out["risk_without_hedge"], out["risk_with_hedge"]
    print("=== Full Pipeline (5000 paths, 10 years) ===")
    print("Without hedge: mean=${:,.0f}, var={:,.0f}, ES5%=${:,.0f}, P(drop>50%)={:.1%}".format(
        rn.mean, rn.variance, rn.expected_shortfall_5pct, rn.tail_prob_50pct_drop))
    print("With hedge:    mean=${:,.0f}, var={:,.0f}, ES5%=${:,.0f}, P(drop>50%)={:.1%}".format(
        rh.mean, rh.variance, rh.expected_shortfall_5pct, rh.tail_prob_50pct_drop))
    print("Optimal hedge ratio h*: {:.0f} contracts".format(out["optimal_hedge_ratio"]))
    print("Variance reduction: {:.1f}%".format(out["variance_reduction_pct"]))
    print("Tail probability reduction: {:.1f}pp".format(out["tail_prob_reduction_pct"]))


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "pipeline":
        run_full_pipeline()
    elif os.environ.get("FRED_API_KEY"):
        run_with_data()
    else:
        run_with_defaults()
