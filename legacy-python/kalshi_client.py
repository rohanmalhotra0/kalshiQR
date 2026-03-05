"""
Kalshi API client for public market data (no auth required).

Base URL: https://api.elections.kalshi.com/trade-api/v2

Endpoints:
- GET /markets - list markets (filter by series_ticker, status)
- GET /markets/{ticker} - single market
- GET /markets/{ticker}/orderbook - orderbook
"""

from dataclasses import dataclass
from typing import Optional
import requests

BASE_URL = "https://api.elections.kalshi.com/trade-api/v2"

# Hedge-relevant series
SERIES_UNEMPLOYMENT = "KXU3"       # Unemployment U-3 (above X%)
SERIES_RECESSION = "KXRECSSNBER"  # Recession (NBER definition)


@dataclass
class KalshiMarket:
    """Parsed market data."""
    ticker: str
    title: str
    event_ticker: str
    yes_bid: int
    yes_ask: int
    last_price: int
    volume: int
    volume_24h: int
    status: str
    close_time: str
    strike_type: Optional[str] = None
    floor_strike: Optional[float] = None
    custom_strike: Optional[dict] = None

    @property
    def yes_price_cents(self) -> int:
        """Mid price in cents (0-100)."""
        if self.yes_bid and self.yes_ask:
            return (self.yes_bid + self.yes_ask) // 2
        return self.last_price or self.yes_ask or self.yes_bid or 0

    @property
    def implied_probability(self) -> float:
        """Implied probability (0-1)."""
        return self.yes_price_cents / 100.0


def _get(path: str, params: Optional[dict] = None) -> dict:
    """GET request to Kalshi API."""
    url = f"{BASE_URL}{path}"
    resp = requests.get(url, params=params, timeout=15)
    resp.raise_for_status()
    return resp.json()


def get_markets(
    series_ticker: Optional[str] = None,
    status: str = "open",
    limit: int = 100,
    cursor: Optional[str] = None,
) -> tuple[list[dict], Optional[str]]:
    """
    GET /markets

    Returns:
        (markets, next_cursor)
    """
    params = {"limit": limit}
    if series_ticker:
        params["series_ticker"] = series_ticker
    if status:
        params["status"] = status
    if cursor:
        params["cursor"] = cursor

    data = _get("/markets", params)
    return data.get("markets", []), data.get("cursor")


def get_market(ticker: str) -> dict:
    """GET /markets/{ticker}"""
    data = _get(f"/markets/{ticker}")
    return data.get("market", data)


def get_orderbook(ticker: str) -> dict:
    """GET /markets/{ticker}/orderbook"""
    data = _get(f"/markets/{ticker}/orderbook")
    return data.get("orderbook", {})


def parse_market(raw: dict) -> KalshiMarket:
    """Parse API response to KalshiMarket."""
    return KalshiMarket(
        ticker=raw.get("ticker", ""),
        title=raw.get("title", ""),
        event_ticker=raw.get("event_ticker", ""),
        yes_bid=raw.get("yes_bid", 0) or 0,
        yes_ask=raw.get("yes_ask", 0) or 0,
        last_price=raw.get("last_price", 0) or 0,
        volume=raw.get("volume", 0) or 0,
        volume_24h=raw.get("volume_24h", 0) or 0,
        status=raw.get("status", ""),
        close_time=raw.get("close_time", ""),
        strike_type=raw.get("strike_type"),
        floor_strike=raw.get("floor_strike"),
        custom_strike=raw.get("custom_strike"),
    )


def fetch_unemployment_markets(
    threshold: Optional[float] = None,
    status: str = "open",
) -> list[KalshiMarket]:
    """
    Fetch unemployment (U-3) markets from KXU3 series.
    Markets are "above X%" format.

    If threshold is set, return markets matching that threshold, or closest if exact not found.
    """
    markets, _ = get_markets(series_ticker=SERIES_UNEMPLOYMENT, status=status, limit=100)
    parsed = [parse_market(m) for m in markets]
    if threshold is not None:
        exact = [m for m in parsed if m.floor_strike == threshold]
        if exact:
            return exact
        # Return closest above threshold (for P(unemployment > X))
        above = [m for m in parsed if m.floor_strike is not None and m.floor_strike >= threshold]
        if above:
            return [min(above, key=lambda m: m.floor_strike)]
    return parsed


def fetch_recession_markets(status: str = "open") -> list[KalshiMarket]:
    """Fetch recession (NBER) markets from KXRECSSNBER series."""
    markets, _ = get_markets(series_ticker=SERIES_RECESSION, status=status, limit=10)
    return [parse_market(m) for m in markets]


def fetch_hedge_prices(
    unemployment_threshold: Optional[float] = None,
) -> dict:
    """
    Fetch prices for hedge-relevant contracts.

    Returns:
        dict with:
            - prob_unemployment_above_x: P(unemployment > threshold) from KXU3
            - recession_probability: P(recession) from KXRECSSNBER
            - unemployment_markets: list of KalshiMarket
            - recession_markets: list of KalshiMarket
    """
    result = {
        "prob_unemployment_above_x": None,
        "recession_probability": None,
        "unemployment_markets": [],
        "recession_markets": [],
    }

    try:
        u_markets = fetch_unemployment_markets(threshold=unemployment_threshold)
        result["unemployment_markets"] = u_markets
        if u_markets:
            # Use first (most liquid) market
            m = max(u_markets, key=lambda x: x.volume_24h or x.volume)
            result["prob_unemployment_above_x"] = m.implied_probability
    except Exception as e:
        result["unemployment_error"] = str(e)

    try:
        r_markets = fetch_recession_markets()
        result["recession_markets"] = r_markets
        if r_markets:
            m = r_markets[0]
            result["recession_probability"] = m.implied_probability
    except Exception as e:
        result["recession_error"] = str(e)

    return result


if __name__ == "__main__":
    print("=== Kalshi Hedge Prices ===\n")

    prices = fetch_hedge_prices(unemployment_threshold=5.5)
    if prices.get("unemployment_markets"):
        m = prices["unemployment_markets"][0]
        print(f"P(unemployment > {m.floor_strike}%): {m.implied_probability:.1%} ({m.ticker})")
    else:
        print("No unemployment markets found")

    if prices.get("recession_probability") is not None:
        print(f"P(recession): {prices['recession_probability']:.1%}")

    print("\n=== Recession market orderbook (sample) ===")
    if prices.get("recession_markets"):
        ticker = prices["recession_markets"][0].ticker
        ob = get_orderbook(ticker)
        yes = ob.get("yes", [])[:5]
        print(f"YES bids: {yes}")
