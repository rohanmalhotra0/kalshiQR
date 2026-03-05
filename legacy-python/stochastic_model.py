"""
Stochastic model for employment and income.

N_t ~ Poisson(λ_t)
E_t = 1 if employed, 0 if unemployed
dW_t = S·E_t·dt

Job loss occurs when a Poisson jump happens.
"""

from dataclasses import dataclass
from typing import Callable, Optional
import numpy as np


@dataclass
class SimulationResult:
    """Output of a single income path simulation."""
    employed: np.ndarray   # E_t at each step
    wealth: np.ndarray    # W_t cumulative income
    job_loss_week: Optional[int] = None  # week when job was lost, or None


def simulate_income_path(
    lambda_fn: Callable[[int], float],
    salary: float,
    weeks: int,
    dt: float = 1.0,
    seed: Optional[int] = None,
) -> SimulationResult:
    """
    Simulate one income path with Poisson job-loss process.

    Args:
        lambda_fn: λ(t) = weekly hazard rate at week t
        salary: S = salary per week
        weeks: number of weeks to simulate
        dt: time step (1 = weekly)
        seed: random seed

    Returns:
        SimulationResult with employed[], wealth[], job_loss_week
    """
    if seed is not None:
        np.random.seed(seed)

    employed = np.ones(weeks, dtype=float)
    wealth = np.zeros(weeks)
    job_loss_week = None

    for t in range(weeks):
        if t > 0:
            wealth[t] = wealth[t - 1]
        if employed[t - 1] if t > 0 else 1:
            lam = lambda_fn(t) * dt
            jump = np.random.poisson(lam) > 0
            if jump:
                employed[t:] = 0
                job_loss_week = t
                break
            wealth[t] += salary * dt
        else:
            wealth[t] = wealth[t - 1] if t > 0 else 0

    # Fill wealth for full path
    for t in range(1, weeks):
        if employed[t] and job_loss_week is None:
            wealth[t] = wealth[t - 1] + salary * dt
        elif t > 0 and wealth[t] == 0:
            wealth[t] = wealth[t - 1]

    return SimulationResult(employed=employed, wealth=wealth, job_loss_week=job_loss_week)


def simulate_paths(
    lambda_fn: Callable[[int], float],
    salary: float,
    weeks: int,
    n_paths: int,
    seed: Optional[int] = None,
) -> list[SimulationResult]:
    """Simulate n_paths income paths."""
    results = []
    for i in range(n_paths):
        s = seed + i if seed is not None else None
        results.append(simulate_income_path(lambda_fn, salary, weeks, seed=s))
    return results


def constant_lambda(lam: float) -> Callable[[int], float]:
    """Return λ(t) = lam constant."""
    return lambda t: lam
