"""
Monte Carlo simulation for job-loss hedging model.

For each path:
  1. Simulate macro environment (unemployment)
  2. Compute job-loss hazard λ(t)
  3. Simulate Poisson event
  4. Compute salary path
  5. Apply hedge payoff

Risk metrics: variance, expected shortfall, tail probability.
Optimal hedge: h* = Cov(Loss, Hedge) / Var(Hedge)
"""

from dataclasses import dataclass, field
from typing import Callable, Optional
import numpy as np


@dataclass
class MonteCarloConfig:
    """Simulation configuration."""
    n_paths: int = 10_000
    horizon_weeks: int = 520   # 10 years
    salary_weekly: float = 120_000 / 52
    seed: Optional[int] = None


@dataclass
class PathResult:
    """Result for a single simulated path."""
    income: float           # total income (salary only)
    hedge_payoff: float    # payoff from hedge
    total_wealth: float    # income + hedge_payoff - hedge_cost
    job_loss_week: Optional[int]
    unemployment_path: np.ndarray
    loss: float            # income lost due to job loss


def simulate_macro_path(
    weeks: int,
    u0: float = 4.0,
    mean: float = 4.0,
    sigma: float = 0.8,
    rho: float = 0.95,
    seed: Optional[int] = None,
) -> np.ndarray:
    """
    Simulate unemployment path: AR(1) with mean reversion.
    U_t in percent (e.g., 4.0 = 4%).
    """
    if seed is not None:
        np.random.seed(seed)
    u = np.zeros(weeks)
    u[0] = u0
    for t in range(1, weeks):
        u[t] = mean + rho * (u[t - 1] - mean) + sigma * np.random.randn()
        u[t] = np.clip(u[t], 2.0, 15.0)
    return u


def run_monte_carlo(
    get_lambda_fn: Callable[[int, np.ndarray], float],
    contract_price: float,
    n_contracts: int,
    hedge_threshold: float = 6.0,
    config: Optional[MonteCarloConfig] = None,
) -> tuple[list[PathResult], np.ndarray, np.ndarray]:
    """
    Run full Monte Carlo simulation.

    Args:
        get_lambda_fn: (t, unemployment_path) -> λ(t)
        contract_price: market price per contract
        n_contracts: number of hedge contracts
        hedge_threshold: hedge pays if mean(unemployment) > threshold
        config: simulation config

    Returns:
        results: list of PathResult
        incomes: array of total incomes (no hedge)
        total_wealths: array of income + hedge_payoff - hedge_cost
    """
    cfg = config or MonteCarloConfig()
    np.random.seed(cfg.seed)

    hedge_cost = contract_price * n_contracts
    results = []
    incomes = np.zeros(cfg.n_paths)
    total_wealths = np.zeros(cfg.n_paths)

    for i in range(cfg.n_paths):
        seed_i = cfg.seed + i if cfg.seed is not None else None

        # Step 1: Simulate macro
        u_path = simulate_macro_path(
            cfg.horizon_weeks,
            sigma=0.3 + 0.2 * np.random.rand(),
            seed=seed_i,
        )

        # Step 2 & 3 & 4: Poisson + salary
        employed = np.ones(cfg.horizon_weeks)
        income = 0.0
        job_loss_week = None

        for t in range(cfg.horizon_weeks):
            lam = get_lambda_fn(t, u_path) * 1.0
            if employed[t - 1] if t > 0 else 1:
                jump = np.random.poisson(lam) > 0
                if jump:
                    employed[t:] = 0
                    job_loss_week = t
                    break
                income += cfg.salary_weekly
            else:
                break

        # Income lost (from job loss to end)
        if job_loss_week is not None:
            loss = (cfg.horizon_weeks - job_loss_week) * cfg.salary_weekly
        else:
            loss = 0.0

        # Step 5: Hedge payoff
        # Hedge pays when unemployment exceeds threshold (correlated with job loss)
        # Use max unemployment over horizon - more sensitive to spikes
        u_max = np.max(u_path)
        hedge_pays = u_max > hedge_threshold
        payoff = (n_contracts * 1.0) if hedge_pays else 0.0

        total = income + payoff - hedge_cost

        results.append(PathResult(
            income=income,
            hedge_payoff=payoff,
            total_wealth=total,
            job_loss_week=job_loss_week,
            unemployment_path=u_path,
            loss=loss,
        ))
        incomes[i] = income
        total_wealths[i] = total

    return results, incomes, total_wealths


# =============================================================================
# Risk Metrics
# =============================================================================

@dataclass
class RiskMetrics:
    """Risk metrics from simulation."""
    mean: float
    variance: float
    std: float
    expected_shortfall_5pct: float   # avg of worst 5%
    tail_prob_50pct_drop: float      # P(income drop > 50%)
    tail_prob_job_loss: float


def compute_risk_metrics(
    incomes: np.ndarray,
    baseline_income: float,
    job_loss_weeks: list[Optional[int]],
) -> RiskMetrics:
    """
    Compute risk metrics.

    baseline_income: expected income with no job loss (weeks * salary_weekly)
    """
    n = len(incomes)
    mean = float(np.mean(incomes))
    variance = float(np.var(incomes))
    std = float(np.std(incomes))

    # Expected shortfall: average of worst 5%
    sorted_inc = np.sort(incomes)
    worst_5pct = int(max(1, 0.05 * n))
    expected_shortfall_5pct = float(np.mean(sorted_inc[:worst_5pct]))

    # Tail probability: P(income drop > 50%)
    drop_50 = baseline_income * 0.5
    tail_prob_50pct_drop = float(np.mean(incomes < drop_50))

    # Job loss probability
    tail_prob_job_loss = float(np.mean(np.array(job_loss_weeks) is not None))

    return RiskMetrics(
        mean=mean,
        variance=variance,
        std=std,
        expected_shortfall_5pct=expected_shortfall_5pct,
        tail_prob_50pct_drop=tail_prob_50pct_drop,
        tail_prob_job_loss=tail_prob_job_loss,
    )


# =============================================================================
# Optimal Hedge Ratio
# =============================================================================

def optimal_hedge_ratio(
    losses: np.ndarray,
    hedge_payoffs: np.ndarray,
) -> float:
    """
    h* = Cov(Loss, Hedge) / Var(Hedge)

    Minimizes variance of (Loss - h * Hedge).
    """
    cov = np.cov(losses, hedge_payoffs)[0, 1]
    var_h = np.var(hedge_payoffs)
    if var_h < 1e-10:
        return 0.0
    return float(cov / var_h)


def optimal_num_contracts(
    losses: np.ndarray,
    hedge_binary: np.ndarray,
) -> float:
    """
    Optimal number of contracts: h* = Cov(Loss, Hedge) / Var(Hedge).

    hedge_binary: 1 if hedge pays, 0 otherwise (per-contract payoff).
    Returns optimal n_contracts.
    """
    return optimal_hedge_ratio(losses, hedge_binary)
