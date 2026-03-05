export function parseInputs(searchParams = {}) {
  const pick = (k, d) => (searchParams?.[k] ?? d);
  const salary = Math.max(30000, Number(pick('salary', 120000)) || 120000);
  const n_paths = Math.max(500, Math.min(5000, Number(pick('n_paths', 3000)) || 3000));
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

const HAZARD_PARAMS = {
  beta0: -6.5,
  beta_unemployment: 0.05,
  beta_industry: 0.12,
  beta_interest_rate: 0.01,
};

function sigmoid(x) {
  const clamped = Math.max(-500, Math.min(500, x));
  return 1 / (1 + Math.exp(-clamped));
}

function industryRiskFromPersonal(industry, companySize, jobLevel) {
  const industryRiskMap = { tech: 0.6, finance: 0.4, healthcare: 0.3, government: 0.2 };
  const sizeRiskMap = { startup: 0.9, small: 0.6, medium: 0.4, large: 0.3, enterprise: 0.2 };
  const levelMult = { entry: 1.2, manager: 1.0, exec: 0.7 };
  const ind = industryRiskMap[String(industry || '').toLowerCase()] ?? 0.5;
  const size = sizeRiskMap[String(companySize || '').toLowerCase()] ?? 0.5;
  const mult = levelMult[String(jobLevel || '').toLowerCase()] ?? 1.0;
  return Math.max(0, Math.min(1, (0.5 * ind + 0.5 * size) * mult));
}

function predictJobLossProb(unemployment, industryRisk, interestRate) {
  const x =
    HAZARD_PARAMS.beta0 +
    HAZARD_PARAMS.beta_unemployment * unemployment +
    HAZARD_PARAMS.beta_industry * industryRisk +
    HAZARD_PARAMS.beta_interest_rate * interestRate;
  return sigmoid(x);
}

function weeklyHazardFromMonthlyProb(pMonthly) {
  const p = Math.max(1e-8, Math.min(1 - 1e-8, pMonthly));
  return -Math.log(1 - p) / 4.33;
}

function getLambda(unemployment, industryRisk, interestRate) {
  const p = predictJobLossProb(unemployment, industryRisk, interestRate);
  return Math.min(weeklyHazardFromMonthlyProb(p), 0.005);
}

function createRng(seed = 42) {
  let a = (seed >>> 0) + 0x6d2b79f5;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rng) {
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function simulateMacroPath(weeks, rng, u0 = 4.0, mean = 4.0, rho = 0.95) {
  const sigma = 0.3 + 0.2 * rng();
  const path = new Array(weeks).fill(0);
  path[0] = u0;
  for (let t = 1; t < weeks; t += 1) {
    const candidate = mean + rho * (path[t - 1] - mean) + sigma * normal(rng);
    path[t] = Math.max(2.0, Math.min(15.0, candidate));
  }
  return path;
}

function percentileAverage(values, pct) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = Math.max(1, Math.floor(sorted.length * pct));
  let sum = 0;
  for (let i = 0; i < n; i += 1) sum += sorted[i];
  return sum / n;
}

export function calculateDashboard(inputs) {
  const weeks = inputs.horizon_years * 52;
  const salaryWeekly = inputs.salary / 52;
  const baseline = weeks * salaryWeekly;
  const contracts = Math.round((inputs.salary * 6) / 12);
  const contractPrice = 0.3;
  const hedgeThreshold = 8.0;
  const interestRate = 4.0;
  const meanUnemploymentDuration = 20.0;
  const industryRisk = industryRiskFromPersonal(inputs.industry, inputs.company_size, inputs.job_level);

  const incomesNo = new Array(inputs.n_paths);
  const incomesWith = new Array(inputs.n_paths);
  const lossEvents = new Array(inputs.n_paths);
  const hedgePaid = new Array(inputs.n_paths);
  const hedgeCost = contractPrice * contracts;

  for (let i = 0; i < inputs.n_paths; i += 1) {
    const rng = createRng(42 + i);
    const unemploymentPath = simulateMacroPath(weeks, rng);
    const employed = new Array(weeks).fill(1);
    let t = 0;
    let hadJobLoss = false;

    while (t < weeks) {
      if (employed[t] === 1) {
        const lambda = getLambda(unemploymentPath[t], industryRisk, interestRate);
        const jumpProb = 1 - Math.exp(-lambda);
        if (rng() < jumpProb) {
          hadJobLoss = true;
          const duration = Math.max(1, Math.min(weeks - t, Math.ceil(-Math.log(Math.max(1 - rng(), 1e-12)) * meanUnemploymentDuration)));
          const endUnemp = Math.min(weeks, t + duration);
          for (let w = t; w < endUnemp; w += 1) employed[w] = 0;
          t = endUnemp;
          continue;
        }
      }
      t += 1;
    }

    let income = 0;
    for (let w = 0; w < weeks; w += 1) {
      if (employed[w] === 1) income += salaryWeekly;
    }

    const uMax = Math.max(...unemploymentPath);
    const payoff = uMax > hedgeThreshold ? contracts : 0;
    const totalWithHedge = income + payoff - hedgeCost;

    incomesNo[i] = income;
    incomesWith[i] = totalWithHedge;
    lossEvents[i] = hadJobLoss;
    hedgePaid[i] = payoff > 0;
  }

  const meanNo = incomesNo.reduce((a, b) => a + b, 0) / incomesNo.length;
  const meanHedge = incomesWith.reduce((a, b) => a + b, 0) / incomesWith.length;
  const worstNo = percentileAverage(incomesNo, 0.05);
  const worstHedge = percentileAverage(incomesWith, 0.05);
  const tailThreshold = baseline * 0.5;
  const tailNo = (100 * incomesNo.filter((x) => x < tailThreshold).length) / incomesNo.length;
  const tailHedge = (100 * incomesWith.filter((x) => x < tailThreshold).length) / incomesWith.length;
  const triggerRate = (100 * hedgePaid.filter(Boolean).length) / hedgePaid.length;
  const varianceReduction = tailNo > 0 ? ((tailNo - tailHedge) / tailNo) * 100 : 0;

  return {
    contracts,
    contractPrice,
    totalCost: Math.round(hedgeCost),
    payout: contracts,
    hedgeThreshold,
    triggerRate,
    meanNo: Math.round(meanNo),
    meanHedge: Math.round(meanHedge),
    worstNo: Math.round(worstNo),
    worstHedge: Math.round(worstHedge),
    tailNo,
    tailHedge,
    varianceReduction,
    riskLevel: HAZARD_PARAMS.beta0,
    jobLossRate: (100 * lossEvents.filter(Boolean).length) / lossEvents.length,
  };
}
