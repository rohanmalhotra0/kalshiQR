'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Footer from '@/components/Footer';

const defaults = {
  industry: 'tech',
  company_size: 'startup',
  job_level: 'entry',
  tenure_years: 1,
  salary: 120000,
  n_paths: 5000,
  horizon_years: 10,
};

export default function QuizPage() {
  const [inputs, setInputs] = useState(defaults);
  const router = useRouter();

  function update(name, value) {
    setInputs((prev) => ({ ...prev, [name]: value }));
  }

  function run() {
    const params = new URLSearchParams();
    Object.entries(inputs).forEach(([k, v]) => params.set(k, String(v)));
    const bounded = Math.min(5000, Math.max(500, Number(inputs.n_paths) || 5000));
    params.set('n_paths', String(bounded));
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <h1 className="section-title" style={{ marginBottom: '0.25rem' }}>Hedge your income against job loss</h1>
      <p className="note" style={{ marginBottom: '1.5rem' }}>Enter your profile to personalize contract sizing.</p>

      <div className="form-grid">
        <div className="row">
          <div>
            <label>Industry</label>
            <select value={inputs.industry} onChange={(e) => update('industry', e.target.value)}>
              <option value="tech">Tech</option>
              <option value="finance">Finance</option>
              <option value="healthcare">Healthcare</option>
              <option value="government">Government</option>
            </select>
          </div>
          <div>
            <label>Company Size</label>
            <select value={inputs.company_size} onChange={(e) => update('company_size', e.target.value)}>
              <option value="startup">Startup</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>

        <div className="row">
          <div>
            <label>Job Level</label>
            <select value={inputs.job_level} onChange={(e) => update('job_level', e.target.value)}>
              <option value="entry">Entry</option>
              <option value="manager">Manager</option>
              <option value="exec">Executive</option>
            </select>
          </div>
          <div>
            <label>Tenure (years)</label>
            <input type="number" value={inputs.tenure_years} min={0} max={30} step={0.5} onChange={(e) => update('tenure_years', e.target.value)} />
          </div>
        </div>

        <div className="row">
          <div>
            <label>Salary ($)</label>
            <input type="number" value={inputs.salary} min={30000} max={1000000} step={5000} onChange={(e) => update('salary', e.target.value)} />
          </div>
          <div>
            <label>Paths</label>
            <input type="number" value={inputs.n_paths} min={500} max={5000} step={500} onChange={(e) => update('n_paths', e.target.value)} />
          </div>
        </div>

        <div>
          <label>Horizon (years)</label>
          <input type="number" value={inputs.horizon_years} min={1} max={30} onChange={(e) => update('horizon_years', e.target.value)} />
        </div>

        <div className="row">
          <button className="cta-btn" onClick={run} style={{ border: 'none' }}>Run with my inputs</button>
          <button className="card" onClick={() => router.push('/dashboard')} style={{ cursor: 'pointer', fontWeight: 600 }}>View sample ($120k)</button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
