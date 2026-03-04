"""
Hedge payoff model for Kalshi-style binary contracts.

Example: Unemployment > 6%
- Payoff: $1 if true, $0 if false
- Market price: 0.30 = 30% implied probability
- Hedge value: H = contract_price * contracts
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class KalshiContract:
    """
    Binary event contract (e.g., Kalshi).

    Payoff: $1 if event occurs, $0 otherwise.
    Market price = implied probability of event.
    """
    event: str                    # e.g., "unemployment_above_6"
    threshold: float              # e.g., 6.0 for unemployment > 6%
    market_price: float           # 0-1, implied P(event)
    payoff_if_true: float = 1.0   # typically $1
    payoff_if_false: float = 0.0

    def payoff(self, outcome: bool) -> float:
        """Payoff given whether event occurred."""
        return self.payoff_if_true if outcome else self.payoff_if_false

    def expected_payoff(self, true_probability: float) -> float:
        """E[payoff] = P(true) * payoff_true + P(false) * payoff_false."""
        return true_probability * self.payoff_if_true + (1 - true_probability) * self.payoff_if_false


def hedge_value(
    contract_price: float,
    num_contracts: int,
) -> float:
    """
    Cost of hedge position: H = contract_price * contracts.

    Example: price=0.30, contracts=100 => H = $30 cost.
    If event occurs, receive $100. If not, receive $0.
    """
    return contract_price * num_contracts


def hedge_payoff(
    outcome: bool,
    num_contracts: int,
    payoff_per_contract: float = 1.0,
) -> float:
    """
    Realized payoff from hedge when event resolves.

    outcome: True if event occurred (e.g., unemployment > 6%)
    """
    return (payoff_per_contract * num_contracts) if outcome else 0.0


def optimal_contracts(
    income_loss_if_job_loss: float,
    prob_job_loss: float,
    contract_price: float,
    prob_event_given_job_loss: float,
) -> float:
    """
    Rough hedge sizing: match expected loss magnitude.

    income_loss_if_job_loss: e.g., 6 months salary
    prob_job_loss: P(job loss)
    contract_price: market price of contract
    prob_event_given_job_loss: P(hedge pays | job loss) - correlation
    """
    expected_loss = income_loss_if_job_loss * prob_job_loss
    # How much hedge payoff when we need it
    effective_coverage = prob_event_given_job_loss
    if effective_coverage < 1e-6:
        return 0.0
    target_payoff = expected_loss  # simplify: hedge expected loss
    # E[hedge payoff] = n * P(event) when event ~ job loss
    # For binary: n contracts pay n if event. We want n * prob_event ~ target
    n = target_payoff / (prob_event_given_job_loss + 1e-8)
    return max(0, n)
