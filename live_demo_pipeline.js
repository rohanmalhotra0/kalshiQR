/**
 * Client-side pipeline for live demo. Port of pipeline_steps.py logic.
 * Runs entirely in the browser — no server needed.
 */

(function (global) {
  'use strict';

  // Seeded RNG for reproducibility
  function mulberry32(seed) {
    return function () {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function industryRiskFromPersonal(industry, companySize, jobLevel) {
    const industryRiskMap = { tech: 0.6, finance: 0.4, healthcare: 0.3, government: 0.2 };
    const sizeRiskMap = { startup: 0.9, small: 0.6, medium: 0.4, large: 0.3, enterprise: 0.2 };
    const levelMult = { entry: 1.2, manager: 1.0, exec: 0.7 };
    const ind = industryRiskMap[industry?.toLowerCase()] ?? 0.5;
    const size = sizeRiskMap[companySize?.toLowerCase()] ?? 0.5;
    const risk = 0.5 * ind + 0.5 * size;
    const mult = levelMult[jobLevel?.toLowerCase()] ?? 1.0;
    return Math.max(0, Math.min(1, risk * mult));
  }

  function sigmoid(x) {
    const c = Math.max(-500, Math.min(500, x));
    return 1 / (1 + Math.exp(-c));
  }

  function predictJobLossProb(params, unemployment, industryRisk, interestRate) {
    const x =
      params.beta0 +
      params.beta_unemployment * unemployment +
      params.beta_industry * industryRisk +
      params.beta_interest_rate * interestRate;
    return sigmoid(x);
  }

  function probToWeeklyHazard(pMonthly) {
    const p = Math.max(1e-8, Math.min(1 - 1e-8, pMonthly));
    return -Math.log(1 - p) / 4.33;
  }

  function getLambda(params, unemployment, industryRisk, interestRate) {
    const p = predictJobLossProb(params, unemployment, industryRisk, interestRate);
    const lam = probToWeeklyHazard(p);
    return Math.min(lam, 0.005);
  }

  function simulateMacroPath(weeks, rng, u0 = 4, mean = 4, sigma = 0.5, rho = 0.95) {
    const u = new Float64Array(weeks);
    u[0] = u0;
    for (let t = 1; t < weeks; t++) {
      const z = Math.sqrt(-2 * Math.log(rng())) * Math.cos(2 * Math.PI * rng());
      u[t] = mean + rho * (u[t - 1] - mean) + sigma * z;
      u[t] = Math.max(2, Math.min(15, u[t]));
    }
    return u;
  }

  const MEAN_UNEMPLOYMENT_DURATION = 20;

  function runMonteCarlo(getLam, contractPrice, nContracts, hedgeThreshold, config, rng) {
    const { n_paths, horizon_weeks, salary_weekly } = config;
    const hedgeCost = contractPrice * nContracts;
    const results = [];
    const incomes = new Float64Array(n_paths);
    const totalWealths = new Float64Array(n_paths);

    for (let i = 0; i < n_paths; i++) {
      const uPath = simulateMacroPath(horizon_weeks, rng, 4, 4, 0.3 + 0.2 * rng());

      const employed = new Uint8Array(horizon_weeks);
      employed.fill(1);
      let jobLossWeek = null;
      let totalLoss = 0;
      let t = 0;

      while (t < horizon_weeks) {
        if (employed[t]) {
          const lam = getLam(t, uPath);
          const jump = rng() < 1 - Math.exp(-lam);
          if (jump) {
            jobLossWeek = jobLossWeek ?? t;
            const duration = Math.max(1, Math.min(
              Math.ceil(-MEAN_UNEMPLOYMENT_DURATION * Math.log(rng() + 1e-10)),
              horizon_weeks - t
            ));
            const endUnemp = Math.min(t + duration, horizon_weeks);
            for (let w = t; w < endUnemp; w++) employed[w] = 0;
            totalLoss += duration * salary_weekly;
            t = endUnemp;
            continue;
          }
        }
        t++;
      }

      let income = 0;
      for (let w = 0; w < horizon_weeks; w++) if (employed[w]) income += salary_weekly;

      const uMax = Math.max(...uPath);
      const hedgePays = uMax > hedgeThreshold;
      const payoff = hedgePays ? nContracts : 0;
      const total = income + payoff - hedgeCost;

      results.push({ income, hedge_payoff: payoff, total_wealth: total, job_loss_week: jobLossWeek, loss: totalLoss });
      incomes[i] = income;
      totalWealths[i] = total;
    }

    return { results, incomes, totalWealths };
  }

  function optimalHedgeRatio(losses, hedgeBinary) {
    const n = losses.length;
    const meanL = losses.reduce((a, b) => a + b, 0) / n;
    const meanH = hedgeBinary.reduce((a, b) => a + b, 0) / n;
    let cov = 0, varH = 0;
    for (let i = 0; i < n; i++) {
      cov += (losses[i] - meanL) * (hedgeBinary[i] - meanH);
      varH += (hedgeBinary[i] - meanH) ** 2;
    }
    cov /= n;
    varH /= n;
    if (varH < 1e-10) return 0;
    return cov / varH;
  }

  function covAndVar(losses, hedgeBinary) {
    const n = losses.length;
    const meanL = losses.reduce((a, b) => a + b, 0) / n;
    const meanH = hedgeBinary.reduce((a, b) => a + b, 0) / n;
    let cov = 0, varH = 0;
    for (let i = 0; i < n; i++) {
      cov += (losses[i] - meanL) * (hedgeBinary[i] - meanH);
      varH += (hedgeBinary[i] - meanH) ** 2;
    }
    return { cov: cov / n, varH: varH / n };
  }

  function runPipelineSteps(opts) {
    const {
      n_paths = 1500,
      horizon_years = 10,
      salary = 120000,
      contract_price = 0.30,
      seed = 42,
      industry = 'tech',
      company_size = 'startup',
      job_level = 'entry',
      tenure_years = 1.0,
    } = opts;

    const rng = mulberry32(seed);
    const rate = 4.0;
    const steps = [];

    const indRisk = industryRiskFromPersonal(industry, company_size, job_level);

    steps.push({
      title: 'Step 1: Your profile',
      formula: 'We start with your job, salary, and how far ahead you want to plan.',
      inputs: { industry, company_size, job_level, tenure_years, salary, horizon_years, n_paths },
      output: `Salary $${salary.toLocaleString()}/yr, horizon ${horizon_years} years, ${n_paths.toLocaleString()} simulation paths`,
    });

    steps.push({
      title: 'Step 2: Your job-loss risk level',
      formula: 'Tech startups and entry-level roles tend to have higher layoff risk than government or executive roles.',
      inputs: { industry, company_size, job_level },
      output: `Your risk score: ${indRisk.toFixed(2)} (0 = safest, 1 = riskiest)`,
    });

    const params = {
      beta0: -6.5,
      beta_unemployment: 0.05,
      beta_industry: 0.12,
      beta_interest_rate: 0.01,
    };

    steps.push({
      title: 'Step 3: How we estimate job-loss chance',
      formula: 'Job loss is more likely when unemployment is high, interest rates change, and your industry is risky. We use a standard model (logistic regression) to combine these.',
      params,
      output: `β = (${params.beta0.toFixed(4)}, ${params.beta_unemployment.toFixed(4)}, ${params.beta_industry.toFixed(4)}, ${params.beta_interest_rate.toFixed(4)})`,
    });

    const uSample = 4.0;
    const x = params.beta0 + params.beta_unemployment * uSample + params.beta_industry * indRisk + params.beta_interest_rate * rate;
    const pMonthly = sigmoid(x);

    steps.push({
      title: 'Step 4: Your monthly job-loss chance (example)',
      formula: 'Plugging in typical numbers (4% unemployment, 4% interest rate), we get your chance of losing your job in any given month.',
      calc: { x, p_monthly: pMonthly },
      output: `About ${(pMonthly * 100).toFixed(2)}% chance per month (very low — most people keep their job)`,
    });

    let lam = probToWeeklyHazard(pMonthly);
    const lamCapped = Math.min(lam, 0.005);

    steps.push({
      title: 'Step 5: Weekly job-loss chance',
      formula: 'We convert monthly chance to weekly so we can simulate week-by-week. This drives how often job loss happens in our simulation.',
      calc: { lambda_raw: lam, lambda_capped: lamCapped },
      output: `About ${(lamCapped * 100).toFixed(2)}% chance per week`,
    });

    const COVERAGE_MONTHS = 6;
    const nContracts = Math.floor(salary * COVERAGE_MONTHS / 12);
    const hedgeThreshold = 8.0;
    const horizonWeeks = horizon_years * 52;
    const salaryWeekly = salary / 52;

    const getLam = (t, uPath) => getLambda(params, uPath[t], indRisk, rate);

    const config = { n_paths, horizon_weeks: horizonWeeks, salary_weekly: salaryWeekly };
    const { results, incomes, totalWealths } = runMonteCarlo(
      getLam,
      contract_price,
      nContracts,
      hedgeThreshold,
      config,
      rng
    );

    const baseline = horizonWeeks * salaryWeekly;
    const jobLosses = results.map((r) => r.job_loss_week);
    const nJobLoss = jobLosses.filter((w) => w != null).length;
    const jobLossRate = (100 * nJobLoss) / n_paths;
    const meanIncomeNo = incomes.reduce((a, b) => a + b, 0) / n_paths;
    const meanIncomeHedge = totalWealths.reduce((a, b) => a + b, 0) / n_paths;
    const hedgePayoutCount = results.filter((r) => r.hedge_payoff > 0).length;
    const hedgeTriggerPct = (100 * hedgePayoutCount) / n_paths;

    steps.push({
      title: 'Step 6: Simulating thousands of possible careers',
      formula: `We run ${n_paths.toLocaleString()} different scenarios. In each one, unemployment moves up and down, you might lose your job (and get rehired after ~5 months), and we track your total income.`,
      inputs: { n_paths, horizon_weeks: horizonWeeks, baseline_income: baseline },
      output: {
        job_loss_rate_pct: jobLossRate,
        mean_income_no_hedge: meanIncomeNo,
        mean_income_with_hedge: meanIncomeHedge,
        hedge_trigger_pct: hedgeTriggerPct,
      },
    });

    const losses = results.map((r) => r.loss);
    const hedgeBinary = results.map((r) => (r.hedge_payoff > 0 ? 1 : 0));
    const { cov: covLh, varH } = covAndVar(losses, hedgeBinary);
    const hStar = optimalHedgeRatio(losses, hedgeBinary);

    steps.push({
      title: 'Step 7: How well does the hedge match your risk?',
      formula: 'We compare your income loss to when the hedge pays. If they line up (you lose income when unemployment spikes), the hedge helps. The math: covariance of loss and hedge payout, divided by hedge variance.',
      calc: {
        cov_loss_hedge: losses.reduce((s, l, i) => s + (l - losses.reduce((a, b) => a + b, 0) / n_paths) * (hedgeBinary[i] - hedgeBinary.reduce((a, b) => a + b, 0) / n_paths), 0) / n_paths,
        var_hedge: varH,
        h_star: hStar,
      },
      output: `Optimal hedge ratio: ${hStar.toFixed(1)} (how many contracts best offset your risk)`,
    });

    const totalCost = nContracts * contract_price;

    steps.push({
      title: 'Step 8: What to buy',
      formula: 'We recommend enough contracts to cover ~6 months of pay (typical unemployment spell). You pay upfront; if unemployment gets high enough, you get a payout.',
      output: {
        'Contracts to buy': nContracts,
        'Price per contract': `$${contract_price.toFixed(2)}`,
        'Total upfront cost': `$${Math.round(totalCost).toLocaleString()}`,
        'Payout if triggered': nContracts.toLocaleString(),
        'Triggers when unemployment exceeds': `${hedgeThreshold}%`,
        'Chance it triggers in our simulation': `${hedgeTriggerPct.toFixed(1)}%`,
      },
    });

    return { steps };
  }

  function renderStepsHtml(steps) {
    const parts = [];
    for (const s of steps) {
      let html = `<div class="step-card"><h2>${s.title}</h2><div class="formula">${s.formula}</div>`;

      if (s.inputs && typeof s.inputs === 'object') {
        html += '<div class="inputs">';
        for (const [k, v] of Object.entries(s.inputs)) {
          const disp = typeof v === 'number' && v >= 1000 ? v.toLocaleString() : v;
          html += `<strong>${k}:</strong> ${disp} `;
        }
        html += '</div>';
      }

      if (s.params) {
        html += '<div class="calc">';
        for (const [k, v] of Object.entries(s.params)) {
          html += `<strong>${k}:</strong> ${typeof v === 'number' ? v.toFixed(4) : v} `;
        }
        html += '</div>';
      }

      if (s.calc) {
        html += '<div class="calc">';
        for (const [k, v] of Object.entries(s.calc)) {
          html += `<strong>${k}:</strong> ${typeof v === 'number' ? v.toFixed(6) : v} `;
        }
        html += '</div>';
      }

      if (typeof s.output === 'object') {
        html += '<div class="output">';
        for (const [k, v] of Object.entries(s.output)) {
          let disp = v;
          if (typeof v === 'number') {
            disp = v >= 100 && Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 2 });
          }
          html += `${k}: ${disp}<br>`;
        }
        html += '</div>';
      } else {
        html += `<div class="output">→ ${s.output}</div>`;
      }

      html += '</div>';
      parts.push(html);
    }
    return parts.join('\n');
  }

  global.LiveDemoPipeline = {
    runPipelineSteps,
    renderStepsHtml,
  };
})(typeof window !== 'undefined' ? window : this);
