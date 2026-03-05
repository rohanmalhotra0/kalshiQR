"""
Data fetcher for job-loss hedging model.

Fetches:
1. Personal risk factors (user inputs)
2. Macroeconomic variables (FRED API)
3. Layoff/industry data (BLS JOLTS)
4. Hedge market variables (Kalshi, Polymarket - placeholder)
5. Market expectations (yield curve, fed futures proxy via FRED)
6. Salary reference data (BLS, Levels.fyi, Glassdoor - placeholder)
7. Unemployment duration (BLS via FRED)
"""

from dataclasses import dataclass
from typing import Optional
import pandas as pd


# =============================================================================
# 1. Personal Risk Factors
# =============================================================================

@dataclass
class PersonalRiskFactors:
    """Inputs that estimate your job-loss probability."""
    industry: str = "tech"
    company_size: str = "startup"  # startup, small, medium, large, enterprise
    job_level: str = "entry"       # entry, manager, exec
    tenure_years: float = 1.0
    salary: float = 120_000
    location: str = "US"
    skill_demand: str = "high"     # high, medium, low

    def to_dict(self) -> dict:
        return {
            "industry": self.industry,
            "company_size": self.company_size,
            "job_level": self.job_level,
            "tenure_years": self.tenure_years,
            "salary": self.salary,
            "location": self.location,
            "skill_demand": self.skill_demand,
        }


# =============================================================================
# 2. Macroeconomic Variables (FRED)
# =============================================================================

# FRED series IDs for macro data
FRED_SERIES = {
    "unemployment": "UNRATE",           # Civilian Unemployment Rate
    "jobless_claims": "ICSA",           # Initial Jobless Claims (SA)
    "fed_funds_rate": "FEDFUNDS",       # Federal Funds Rate
    "gdp_growth": "A191RL1Q225SBEA",    # Real GDP % change (quarterly)
    "gdp_level": "GDP",                 # GDP level
    "corporate_profits": "CP",          # Corporate Profits
    # Market expectations / yield curve
    "yield_curve_spread": "T10Y2Y",     # 10Y-2Y Treasury spread (recession indicator)
    "treasury_10y": "DGS10",            # 10-Year Treasury
    "treasury_2y": "DGS2",              # 2-Year Treasury
    # Unemployment duration (for reemployment modeling)
    "unemployment_duration_mean": "UEMPMEAN",   # Avg weeks unemployed (SA)
    "unemployment_duration_median": "UEMPMED",  # Median weeks unemployed
}


def fetch_fred_data(
    api_key: str,
    series: Optional[list[str]] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> pd.DataFrame:
    """
    Fetch macroeconomic data from FRED.

    Args:
        api_key: FRED API key (free at https://fred.stlouisfed.org)
        series: List of series IDs. Default: unemployment, jobless_claims, fed_funds_rate, gdp_growth
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)

    Returns:
        DataFrame with columns for each series. Index is datetime.
    """
    try:
        from fredapi import Fred
    except ImportError:
        raise ImportError("Install fredapi: pip install fredapi")

    fred = Fred(api_key=api_key)
    # Default: unemployment, jobless claims, fed funds rate, GDP growth
    series = series or [
        FRED_SERIES["unemployment"],
        FRED_SERIES["jobless_claims"],
        FRED_SERIES["fed_funds_rate"],
        FRED_SERIES["gdp_growth"],
    ]

    dfs = []
    for sid in series:
        try:
            s = fred.get_series(sid, observation_start=start_date, observation_end=end_date)
            s.name = sid
            dfs.append(s)
        except Exception as e:
            print(f"Warning: Could not fetch {sid}: {e}")

    if not dfs:
        return pd.DataFrame()

    df = pd.concat(dfs, axis=1)
    df.index = pd.to_datetime(df.index)
    return df


# =============================================================================
# 3. Layoff / Industry Data (BLS JOLTS)
# =============================================================================

# BLS JOLTS series IDs
JOLTS_SERIES = {
    "layoffs_rate": "JTSLDL",    # Layoffs and discharges, total nonfarm (level)
    "hires_rate": "JTSHIR",      # Hires, total nonfarm (level)
    "quits_rate": "JTSQUL",      # Quits, total nonfarm (level)
    "job_openings": "JTSJOL",    # Job openings, total nonfarm
}


def fetch_bls_jolts(
    series_ids: Optional[list[str]] = None,
    start_year: Optional[str] = None,
    end_year: Optional[str] = None,
    api_key: Optional[str] = None,
) -> pd.DataFrame:
    """
    Fetch JOLTS (Job Openings and Labor Turnover Survey) data from BLS.

    Args:
        series_ids: List of BLS series IDs (e.g. JTSLDL, JTSHIR). Default: layoffs, hires
        start_year: Start year (e.g. "2020")
        end_year: End year (e.g. "2024")
        api_key: Optional BLS API key (registration at bls.gov for 500 req/day; 25/day without)

    Returns:
        DataFrame with BLS data. Index is period (YYYY-MM).
    """
    import requests
    import json
    from datetime import datetime

    series_ids = series_ids or ["JTSLDL", "JTSHIR"]
    now = datetime.now()
    end_year = end_year or str(now.year)
    start_year = start_year or str(now.year - 5)

    payload = {
        "seriesid": series_ids,
        "startyear": start_year,
        "endyear": end_year,
    }
    if api_key:
        payload["registrationkey"] = api_key

    headers = {"Content-type": "application/json"}
    resp = requests.post(
        "https://api.bls.gov/publicAPI/v2/timeseries/data/",
        data=json.dumps(payload),
        headers=headers,
        timeout=30,
    )

    if resp.status_code != 200:
        raise RuntimeError(f"BLS API error: {resp.status_code} - {resp.text[:200]}")

    data = resp.json()
    if data.get("status") != "REQUEST_SUCCEEDED":
        raise RuntimeError(f"BLS API failed: {data.get('message', 'Unknown error')}")

    rows = []
    for s in data.get("Results", {}).get("series", []):
        sid = s["seriesID"]
        for d in s.get("data", []):
            year = d["year"]
            period = d["period"]
            if period.startswith("M"):
                month = period[1:]
                date_str = f"{year}-{month}"
                try:
                    val = float(d["value"])
                    rows.append({"date": date_str, "series": sid, "value": val})
                except (ValueError, KeyError):
                    pass

    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    pivot = df.pivot(index="date", columns="series", values="value").sort_index()
    return pivot


# =============================================================================
# 4. Macro State Vector X_t
# =============================================================================

def build_macro_state(
    fred_df: pd.DataFrame,
    bls_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Build the macroeconomic state vector X_t = (U_t, r_t, GDP_t, Layoffs_t).

    Merges FRED and BLS data on date, resamples to common frequency (monthly).
    """
    if fred_df.empty and bls_df.empty:
        return pd.DataFrame()

    # Map FRED columns to our naming
    col_map = {
        "UNRATE": "U_t",           # unemployment
        "FEDFUNDS": "r_t",         # interest rate
        "GDP": "GDP_t",
        "A191RL1Q225SBEA": "GDP_growth",
        "ICSA": "jobless_claims",
        "CP": "corporate_profits",
    }
    # Also handle JOLTS
    jolts_map = {"JTSLDL": "Layoffs_t", "JTSHIR": "Hires_t", "JTSQUL": "Quits_t"}

    dfs = []
    if not fred_df.empty:
        f = fred_df.rename(columns=col_map)
        f = f.resample("MS").last().ffill()  # end-of-month
        dfs.append(f)
    if not bls_df.empty:
        b = bls_df.rename(columns=jolts_map)
        dfs.append(b)

    out = pd.concat(dfs, axis=1)
    out = out.sort_index().ffill().bfill()
    return out


# =============================================================================
# 5. Hedge Market Variables & Market Expectations
# =============================================================================

@dataclass
class HedgeMarketVariables:
    """
    Market-implied probabilities from prediction markets.
    Sources: Kalshi API, Polymarket, Fed futures (CME FedWatch).
    """
    prob_unemployment_above_x: Optional[float] = None   # P(unemployment > x%), e.g. 5.5%
    recession_probability: Optional[float] = None
    interest_rate_up: Optional[float] = None
    cpi_surprise: Optional[float] = None

    def to_dict(self) -> dict:
        return {
            "prob_unemployment_above_x": self.prob_unemployment_above_x,
            "recession_probability": self.recession_probability,
            "interest_rate_up": self.interest_rate_up,
            "cpi_surprise": self.cpi_surprise,
        }


def fetch_market_expectations(
    fred_api_key: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> pd.DataFrame:
    """
    Fetch forward-looking market expectations from FRED.

    Includes:
    - Yield curve spread (T10Y2Y): 10Y-2Y spread; inversion signals recession risk
    - Treasury rates: used to infer rate expectations
    - Fed futures: CME FedWatch provides implied probabilities (no direct API);
      use yield curve as proxy for rate expectations

    Kalshi/Polymarket: Add API integration when available.
    """
    return fetch_fred_data(
        api_key=fred_api_key,
        series=[
            FRED_SERIES["yield_curve_spread"],
            FRED_SERIES["treasury_10y"],
            FRED_SERIES["treasury_2y"],
            FRED_SERIES["fed_funds_rate"],
        ],
        start_date=start_date,
        end_date=end_date,
    )


# =============================================================================
# 6. Unemployment Duration (Reemployment Modeling)
# =============================================================================

def fetch_unemployment_duration(
    fred_api_key: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> pd.DataFrame:
    """
    Fetch average unemployment duration from BLS (via FRED).

    UEMPMEAN = mean weeks unemployed (seasonally adjusted).
    Typical value: ~20 weeks. Used for reemployment hazard modeling.
    """
    return fetch_fred_data(
        api_key=fred_api_key,
        series=[
            FRED_SERIES["unemployment_duration_mean"],
            FRED_SERIES["unemployment_duration_median"],
        ],
        start_date=start_date,
        end_date=end_date,
    )


# =============================================================================
# 7. Salary Reference Data
# =============================================================================

@dataclass
class SalaryReference:
    """
    Salary distribution by job level for calibration.
    Sources: BLS wage tables, Glassdoor, Levels.fyi (tech).
    """
    job_level: str
    median_salary: float
    p25: Optional[float] = None
    p75: Optional[float] = None
    source: str = "manual"  # BLS, Glassdoor, Levels.fyi, manual

    def to_dict(self) -> dict:
        return {
            "job_level": self.job_level,
            "median_salary": self.median_salary,
            "p25": self.p25,
            "p75": self.p75,
            "source": self.source,
        }


def fetch_kalshi_hedge_prices(
    unemployment_threshold: Optional[float] = 5.5,
) -> HedgeMarketVariables:
    """
    Fetch hedge-relevant prices from Kalshi API (public, no auth).

    Returns HedgeMarketVariables with live market prices.
    """
    try:
        from kalshi_client import fetch_hedge_prices
        prices = fetch_hedge_prices(unemployment_threshold=unemployment_threshold)
        return HedgeMarketVariables(
            prob_unemployment_above_x=prices.get("prob_unemployment_above_x"),
            recession_probability=prices.get("recession_probability"),
            interest_rate_up=None,
            cpi_surprise=None,
        )
    except Exception as e:
        print(f"Warning: Could not fetch Kalshi prices: {e}")
        return HedgeMarketVariables()


def get_salary_reference(
    industry: str = "tech",
    job_level: str = "entry",
    location: str = "US",
) -> SalaryReference:
    """
    Get salary reference for a role. Placeholder for BLS/Glassdoor/Levels.fyi.

    BLS: Occupational Employment and Wage Statistics (OES) - use BLS query tools.
    Glassdoor / Levels.fyi: No public API; scrape or manual input.

    Returns default values; replace with real data when integrated.
    """
    # Default: approximate tech entry-level US
    defaults = {
        ("tech", "entry"): (120_000, 90_000, 150_000),
        ("tech", "manager"): (180_000, 140_000, 220_000),
        ("tech", "exec"): (300_000, 220_000, 450_000),
    }
    key = (industry, job_level)
    med, p25, p75 = defaults.get(key, (120_000, 90_000, 150_000))
    return SalaryReference(
        job_level=job_level,
        median_salary=med,
        p25=p25,
        p75=p75,
        source="manual",
    )


# =============================================================================
# 8. Main Data Loader
# =============================================================================

def load_model_inputs(
    fred_api_key: str,
    bls_api_key: Optional[str] = None,
    personal: Optional[PersonalRiskFactors] = None,
    start_year: Optional[str] = None,
    end_year: Optional[str] = None,
    include_market_expectations: bool = True,
    include_unemployment_duration: bool = True,
    include_kalshi_hedge: bool = True,
    unemployment_hedge_threshold: float = 5.5,
) -> dict:
    """
    Load all inputs for the job-loss hedging model.

    Returns:
        dict with keys:
            - personal: PersonalRiskFactors
            - fred: DataFrame (macro from FRED)
            - bls: DataFrame (JOLTS layoffs/hires)
            - macro_state: DataFrame (merged X_t)
            - market_expectations: DataFrame (yield curve, treasury rates)
            - unemployment_duration: DataFrame (mean/median weeks unemployed)
            - salary_reference: SalaryReference (by job level)
            - hedge: HedgeMarketVariables (placeholder for Kalshi/Polymarket)
    """
    personal = personal or PersonalRiskFactors()
    start = start_year or "2019"
    end = end_year or "2025"
    start_d = f"{start}-01-01"
    end_d = f"{end}-12-31" if end else None

    fred_df = fetch_fred_data(
        api_key=fred_api_key,
        start_date=start_d,
        end_date=end_d,
    )

    bls_df = fetch_bls_jolts(
        series_ids=["JTSLDL", "JTSHIR"],
        start_year=start,
        end_year=end,
        api_key=bls_api_key,
    )

    macro_state = build_macro_state(fred_df, bls_df)

    market_exp = pd.DataFrame()
    if include_market_expectations:
        try:
            market_exp = fetch_market_expectations(
                fred_api_key=fred_api_key,
                start_date=start_d,
                end_date=end_d,
            )
        except Exception as e:
            print(f"Warning: Could not fetch market expectations: {e}")

    unemp_dur = pd.DataFrame()
    if include_unemployment_duration:
        try:
            unemp_dur = fetch_unemployment_duration(
                fred_api_key=fred_api_key,
                start_date=start_d,
                end_date=end_d,
            )
        except Exception as e:
            print(f"Warning: Could not fetch unemployment duration: {e}")

    salary_ref = get_salary_reference(
        industry=personal.industry,
        job_level=personal.job_level,
        location=personal.location,
    )

    hedge = HedgeMarketVariables()
    if include_kalshi_hedge:
        try:
            hedge = fetch_kalshi_hedge_prices(unemployment_threshold=unemployment_hedge_threshold)
        except Exception as e:
            print(f"Warning: Could not fetch Kalshi hedge: {e}")

    return {
        "personal": personal,
        "fred": fred_df,
        "bls": bls_df,
        "macro_state": macro_state,
        "market_expectations": market_exp,
        "unemployment_duration": unemp_dur,
        "salary_reference": salary_ref,
        "hedge": hedge,
    }


# =============================================================================
# CLI / Example
# =============================================================================

if __name__ == "__main__":
    import os
    from config import load_config
    load_config()

    fred_key = os.environ.get("FRED_API_KEY", "")
    if not fred_key:
        print("Set FRED_API_KEY to run. Get free key at https://fred.stlouisfed.org/docs/api/api_key.html")
        exit(1)

    bls_key = os.environ.get("BLS_API_KEY")  # optional

    personal = PersonalRiskFactors(
        industry="tech",
        company_size="startup",
        tenure_years=1,
        salary=120_000,
    )

    data = load_model_inputs(
        fred_api_key=fred_key,
        bls_api_key=bls_key,
        personal=personal,
        start_year="2020",
        end_year="2024",
    )

    print("Personal risk factors:", personal.to_dict())
    print("\nFRED data shape:", data["fred"].shape)
    print("FRED columns:", list(data["fred"].columns))
    print("\nBLS JOLTS shape:", data["bls"].shape)
    print("BLS columns:", list(data["bls"].columns))
    print("\nMacro state shape:", data["macro_state"].shape)
    print("\nMarket expectations (yield curve, last 5):")
    print(data["market_expectations"].tail() if not data["market_expectations"].empty else "  (empty)")
    print("\nUnemployment duration (mean weeks, last 5):")
    print(data["unemployment_duration"].tail() if not data["unemployment_duration"].empty else "  (empty)")
    print("\nSalary reference:", data["salary_reference"].to_dict())
    print("\nKalshi hedge (live):", data["hedge"].to_dict())
