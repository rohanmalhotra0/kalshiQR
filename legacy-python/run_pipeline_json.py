import argparse
import json
import os
import sys
from pathlib import Path

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
    trigger_rate = 100 * sum(1 for r in results if getattr(r, 'hedge_payoff', 0) > 0) / len(results) if results else 0

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
    }
    payload['totalCost'] = int(round(payload['contracts'] * payload['contractPrice']))
    payload['payout'] = int(payload['contracts'])

    print(json.dumps(payload))


if __name__ == '__main__':
    main()
