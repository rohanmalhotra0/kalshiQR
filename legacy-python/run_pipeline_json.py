import argparse
import json
import os
import sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT / 'legacy-python') not in sys.path:
    sys.path.insert(0, str(ROOT / 'legacy-python'))

from pipeline import run_pipeline


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--industry', default='tech')
    p.add_argument('--company_size', default='startup')
    p.add_argument('--job_level', default='entry')
    p.add_argument('--tenure_years', type=float, default=1.0)
    p.add_argument('--salary', type=float, default=120000)
    p.add_argument('--n_paths', type=int, default=3000)
    p.add_argument('--horizon_years', type=int, default=10)
    args = p.parse_args()

    out = run_pipeline(
        fred_api_key=os.environ.get('FRED_API_KEY'),
        n_paths=args.n_paths,
        horizon_years=args.horizon_years,
        salary=args.salary,
        industry=args.industry,
        company_size=args.company_size,
        job_level=args.job_level,
        tenure_years=args.tenure_years,
        seed=42,
    )

    rn = out['risk_without_hedge']
    rh = out['risk_with_hedge']
    results = out.get('results', [])
    incomes_no = np.array(out.get('incomes_no_hedge', []), dtype=float)
    incomes_with = np.array(out.get('incomes_with_hedge', []), dtype=float)
    trigger_rate = 100 * sum(1 for r in results if getattr(r, 'hedge_payoff', 0) > 0) / len(results) if results else 0

    histogram = None
    percentiles = None
    survival = None
    max_unemployment = None
    monte_carlo_sample = None
    if len(incomes_no) > 0 and len(incomes_with) > 0:
        bins = 24
        min_v = float(min(np.min(incomes_no), np.min(incomes_with)))
        max_v = float(max(np.max(incomes_no), np.max(incomes_with)))
        hist_no, edges = np.histogram(incomes_no, bins=bins, range=(min_v, max_v))
        hist_with, _ = np.histogram(incomes_with, bins=bins, range=(min_v, max_v))
        centers = ((edges[:-1] + edges[1:]) / 2.0).tolist()
        histogram = {
            "x": [float(v) for v in centers],
            "no_hedge": [int(v) for v in hist_no.tolist()],
            "with_hedge": [int(v) for v in hist_with.tolist()],
        }

        pcts = np.array([1, 5, 10, 25, 50, 75, 90, 95, 99], dtype=float)
        percentiles = {
            "p": [float(v) for v in pcts.tolist()],
            "no_hedge": [float(v) for v in np.percentile(incomes_no, pcts).tolist()],
            "with_hedge": [float(v) for v in np.percentile(incomes_with, pcts).tolist()],
        }

        sample_n = min(140, len(incomes_no))
        sample_idx = np.linspace(0, len(incomes_no) - 1, sample_n).astype(int)
        monte_carlo_sample = {
            "path": [int(i + 1) for i in sample_idx.tolist()],
            "no_hedge": [float(v) for v in incomes_no[sample_idx].tolist()],
            "with_hedge": [float(v) for v in incomes_with[sample_idx].tolist()],
        }

    if len(results) > 0:
        horizon_years = int(out.get('inputs', {}).get('horizon_years', args.horizon_years))
        years = list(range(0, horizon_years + 1))
        first_losses = [getattr(r, 'job_loss_week', None) for r in results]
        still_employed = []
        for y in years:
            cut = y * 52
            alive = sum(1 for w in first_losses if (w is None or w > cut))
            still_employed.append(100.0 * alive / len(first_losses))
        survival = {
            "year": [int(v) for v in years],
            "still_employed_pct": [float(v) for v in still_employed],
        }

        u_max = np.array([float(np.max(getattr(r, 'unemployment_path', np.array([0.0])))) for r in results], dtype=float)
        if len(u_max) > 0:
            hist_u, edges_u = np.histogram(u_max, bins=18, range=(float(np.min(u_max)), float(np.max(u_max))))
            centers_u = ((edges_u[:-1] + edges_u[1:]) / 2.0).tolist()
            max_unemployment = {
                "x": [float(v) for v in centers_u],
                "count": [int(v) for v in hist_u.tolist()],
            }

    payload = {
        'inputs': out.get('inputs', {}),
        'contracts': int(out.get('n_contracts') or out.get('optimal_contracts') or 0),
        'contractPrice': float(out.get('contract_price', 0.30)),
        'hedgeThreshold': float(out.get('hedge_threshold', 8.0)),
        'triggerRate': float(trigger_rate),
        'meanNo': float(rn.mean),
        'meanHedge': float(rh.mean),
        'worstNo': float(rn.expected_shortfall_5pct),
        'worstHedge': float(rh.expected_shortfall_5pct),
        'tailNo': float(rn.tail_prob_50pct_drop) * 100,
        'tailHedge': float(rh.tail_prob_50pct_drop) * 100,
        'varianceReduction': float(out.get('variance_reduction_pct', 0.0)),
        'riskLevel': float(getattr(out.get('params'), 'beta0', -6.5)),
        'baselineIncome': float(args.salary * args.horizon_years),
        'histogram': histogram,
        'percentiles': percentiles,
        'survival': survival,
        'maxUnemployment': max_unemployment,
        'monteCarloSample': monte_carlo_sample,
    }
    payload['totalCost'] = int(round(payload['contracts'] * payload['contractPrice']))
    payload['payout'] = int(payload['contracts'])

    print(json.dumps(payload))


if __name__ == '__main__':
    main()
