const INDUSTRY_RISK = {
  tech: 1.0,
  finance: 0.9,
  healthcare: 0.75,
  government: 0.65,
};

const SIZE_RISK = {
  startup: 1.15,
  small: 1.05,
  medium: 0.95,
  large: 0.85,
  enterprise: 0.8,
};

const LEVEL_RISK = {
  entry: 1.1,
  manager: 0.9,
  exec: 0.75,
};

export function parseInputs(searchParams = {}) {
  const pick = (k, d) => (searchParams?.[k] ?? d);
  const salary = Math.max(30000, Number(pick('salary', 120000)) || 120000);
  const n_paths = Math.max(500, Math.min(5000, Number(pick('n_paths', 5000)) || 5000));
  const horizon_years = Math.max(1, Math.min(30, Number(pick('horizon_years', 10)) || 10));
  return {
    industry: pick('industry', 'tech'),
    company_size: pick('company_size', 'startup'),
    job_level: pick('job_level', 'entry'),
    tenure_years: Math.max(0, Number(pick('tenure_years', 1)) || 1),
    salary,
    n_paths,
    horizon_years,
  };
}

export function calculateDashboard(inputs) {
  const baseRisk =
    (INDUSTRY_RISK[inputs.industry] ?? 1) *
    (SIZE_RISK[inputs.company_size] ?? 1) *
    (LEVEL_RISK[inputs.job_level] ?? 1) *
    (inputs.tenure_years < 2 ? 1.08 : 0.94);

  const contracts = Math.round((inputs.salary * 6) / 12);
  const contractPrice = 0.3;
  const totalCost = Math.round(contracts * contractPrice);

  const baselineIncome = inputs.salary * inputs.horizon_years;
  const meanNo = Math.round(baselineIncome * (1 - 0.022 * baseRisk));
  const meanHedge = Math.round(meanNo - totalCost + contracts * 0.175);
  const worstNo = Math.round(meanNo * (0.9 - 0.05 * baseRisk));
  const worstHedge = Math.round(worstNo + contracts * 0.16 - totalCost);
  const tailNo = Math.max(0, 3 + 8 * (baseRisk - 0.8));
  const tailHedge = Math.max(0, tailNo - 1.1);
  const varianceReduction = Number(((tailNo - tailHedge) / Math.max(tailNo, 0.1) * 100).toFixed(1));

  return {
    contracts,
    contractPrice,
    totalCost,
    payout: contracts,
    hedgeThreshold: 8.0,
    triggerRate: 17.8,
    meanNo,
    meanHedge,
    worstNo,
    worstHedge,
    tailNo,
    tailHedge,
    varianceReduction,
    riskLevel: Number((-6.5 + (baseRisk - 1) * 0.8).toFixed(3)),
  };
}
