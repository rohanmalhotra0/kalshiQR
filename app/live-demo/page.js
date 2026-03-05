'use client';

import Footer from '@/components/Footer';
import { calculateDashboard, parseInputs } from '@/lib/model';
import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

function LiveDemoClient() {
  const searchParams = useSearchParams();
  const inputs = useMemo(() => parseInputs(Object.fromEntries(searchParams.entries())), [searchParams]);
  const m = useMemo(() => calculateDashboard(inputs), [inputs]);

  return (
    <div className="container" style={{ maxWidth: 900 }}>
      <h1 className="section-title">Live Demo</h1>
      <p className="note" style={{ marginBottom: '1rem' }}>Step-by-step explanation using your current inputs.</p>

      <div className="card" style={{ marginBottom: '0.75rem' }}>
        <h3>Step 1: Profile risk</h3>
        <p>We combine industry, company size, level, and tenure to estimate baseline job-loss risk.</p>
      </div>

      <div className="card" style={{ marginBottom: '0.75rem' }}>
        <h3>Step 2: Income scenarios</h3>
        <p>We evaluate income paths over {inputs.horizon_years} years with {inputs.n_paths.toLocaleString()} simulation paths.</p>
      </div>

      <div className="card" style={{ marginBottom: '0.75rem' }}>
        <h3>Step 3: Contract sizing</h3>
        <p>Contract count scales with salary: <strong>{m.contracts.toLocaleString()}</strong> contracts for ${inputs.salary.toLocaleString()} salary.</p>
      </div>

      <div className="card">
        <h3>Step 4: Final recommendation</h3>
        <p>Buy {m.contracts.toLocaleString()} contracts at ${m.contractPrice.toFixed(2)} each, costing ${m.totalCost.toLocaleString()} total.</p>
      </div>

      <Footer />
    </div>
  );
}

export default function LiveDemoPage() {
  return (
    <Suspense fallback={<div className="container"><p className="note">Loading demo...</p></div>}>
      <LiveDemoClient />
    </Suspense>
  );
}
