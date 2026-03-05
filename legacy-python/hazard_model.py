"""
Hazard model for job loss probability.

P(JobLoss) = σ(β₀ + β₁·unemployment + β₂·industry + β₃·interest_rate)

Training data: historical layoffs, macro variables.
Output: λ (weekly hazard rate) for Poisson process.
"""

from dataclasses import dataclass
from typing import Optional
import numpy as np
import pandas as pd


def sigmoid(x: np.ndarray) -> np.ndarray:
    """Logistic function σ(x) = 1 / (1 + exp(-x))."""
    return 1.0 / (1.0 + np.exp(-np.clip(x, -500, 500)))


@dataclass
class HazardModelParams:
    """Fitted coefficients for logistic hazard model."""
    beta0: float
    beta_unemployment: float
    beta_industry: float
    beta_interest_rate: float

    def to_dict(self) -> dict:
        return {
            "beta0": self.beta0,
            "beta_unemployment": self.beta_unemployment,
            "beta_industry": self.beta_industry,
            "beta_interest_rate": self.beta_interest_rate,
        }


def build_training_data(
    macro_state: pd.DataFrame,
    layoff_col: str = "Layoffs_t",
    unemployment_col: str = "U_t",
    interest_col: str = "r_t",
) -> tuple[np.ndarray, np.ndarray]:
    """
    Build X, y for hazard model training.

    Uses layoff rate as proxy for job-loss risk. Creates binary target:
    y=1 when layoffs are above median (high-risk period), else y=0.

    Args:
        macro_state: DataFrame with U_t, r_t, Layoffs_t, etc.
        layoff_col: Column for layoffs
        unemployment_col: Column for unemployment rate
        interest_col: Column for interest rate

    Returns:
        X: (n, 3) array [unemployment, industry_proxy, interest_rate]
        y: (n,) binary target
    """
    df = macro_state.dropna(how="any")
    if df.empty or len(df) < 10:
        return np.zeros((0, 3)), np.zeros(0)

    # Industry proxy: use layoff level normalized as "industry risk" for now
    # In practice, merge industry-specific layoff data
    unemp = df[unemployment_col].values if unemployment_col in df.columns else np.zeros(len(df))
    layoffs = df[layoff_col].values if layoff_col in df.columns else np.zeros(len(df))
    rate = df[interest_col].values if interest_col in df.columns else np.zeros(len(df))

    # Normalize layoffs to [0,1] as industry-risk proxy
    layoffs_norm = (layoffs - layoffs.min()) / (layoffs.max() - layoffs.min() + 1e-8)

    X = np.column_stack([unemp, layoffs_norm, rate])
    # Binary target: high layoff period (above median)
    y = (layoffs >= np.median(layoffs)).astype(float)
    return X, y


def fit_hazard_model(
    X: np.ndarray,
    y: np.ndarray,
    max_iter: int = 1000,
) -> HazardModelParams:
    """
    Fit logistic regression: P(JobLoss) = σ(X @ β).

    Uses Newton-Raphson / gradient descent for MLE.
    """
    if len(X) == 0 or len(y) == 0:
        # Default: ~20-30% job loss over 10y => λ ≈ 0.0005/week
        return HazardModelParams(
            beta0=-6.5,
            beta_unemployment=0.05,
            beta_industry=0.12,
            beta_interest_rate=0.01,
        )

    n, k = X.shape
    X = np.column_stack([np.ones(n), X])  # add intercept
    beta = np.zeros(k + 1)

    for _ in range(max_iter):
        p = sigmoid(X @ beta)
        grad = X.T @ (y - p)
        # Hessian diagonal approx for stability
        w = p * (1 - p) + 1e-6
        H = X.T @ (w.reshape(-1, 1) * X) + 1e-4 * np.eye(k + 1)
        try:
            delta = np.linalg.solve(H, grad)
        except np.linalg.LinAlgError:
            break
        beta += delta
        if np.abs(delta).max() < 1e-6:
            break

    return HazardModelParams(
        beta0=float(beta[0]),
        beta_unemployment=float(beta[1]),
        beta_industry=float(beta[2]),
        beta_interest_rate=float(beta[3]),
    )


def predict_job_loss_prob(
    params: HazardModelParams,
    unemployment: float,
    industry_risk: float,
    interest_rate: float,
) -> float:
    """
    P(JobLoss) = σ(β₀ + β₁·unemployment + β₂·industry + β₃·interest_rate).

    industry_risk: 0-1 scale (e.g., startup=0.8, large_corp=0.2).
    """
    x = (
        params.beta0
        + params.beta_unemployment * unemployment
        + params.beta_industry * industry_risk
        + params.beta_interest_rate * interest_rate
    )
    return float(sigmoid(np.array([x]))[0])


def prob_to_weekly_hazard(p_monthly: float) -> float:
    """
    Convert monthly job-loss probability to weekly Poisson intensity λ.

    P(no job loss in 4.33 weeks) = 1 - p_monthly
    exp(-λ * 4.33) = 1 - p_monthly  =>  λ = -log(1 - p_monthly) / 4.33
    """
    p = np.clip(p_monthly, 1e-8, 1 - 1e-8)
    return float(-np.log(1 - p) / 4.33)


def get_lambda(
    params: HazardModelParams,
    unemployment: float,
    industry_risk: float,
    interest_rate: float,
    period: str = "weekly",
) -> float:
    """
    Get job-loss hazard rate λ for Poisson process.

    Args:
        period: "weekly" or "monthly". Weekly λ is intensity per week.
    """
    p = predict_job_loss_prob(params, unemployment, industry_risk, interest_rate)
    if period == "weekly":
        lam = prob_to_weekly_hazard(p)
        # Cap at 0.5% weekly (realistic: annual job loss ~5-20%)
        # λ ≈ 0.001-0.005 weekly => 1 - exp(-0.005*52) ≈ 23% max annual
        return float(min(lam, 0.005))
    return p  # monthly probability directly


def industry_risk_from_personal(
    industry: str,
    company_size: str,
    job_level: str = "entry",
) -> float:
    """
    Map personal factors to industry_risk score [0, 1].
    Higher = more job-loss risk.
    """
    industry_risk_map = {"tech": 0.6, "finance": 0.4, "healthcare": 0.3, "government": 0.2}
    size_risk_map = {"startup": 0.9, "small": 0.6, "medium": 0.4, "large": 0.3, "enterprise": 0.2}
    level_mult = {"entry": 1.2, "manager": 1.0, "exec": 0.7}
    ind = industry_risk_map.get(industry.lower(), 0.5)
    size = size_risk_map.get(company_size.lower(), 0.5)
    risk = 0.5 * ind + 0.5 * size
    mult = level_mult.get(job_level.lower(), 1.0)
    return float(np.clip(risk * mult, 0, 1))
