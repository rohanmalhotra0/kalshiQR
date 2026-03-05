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
