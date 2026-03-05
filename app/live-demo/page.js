'use client';

import Footer from '@/components/Footer';
import { parseInputs } from '@/lib/model';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function LiveDemoClient() {
  const searchParams = useSearchParams();
  const inputs = useMemo(() => parseInputs(Object.fromEntries(searchParams.entries())), [searchParams]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const qs = new URLSearchParams(
      Object.entries(inputs).reduce((acc, [k, v]) => {
        acc[k] = String(v);
        return acc;
      }, {}),
    );

    let cancelled = false;
    setLoading(true);
    setError('');

    fetch(`/api/simulate?${qs.toString()}`)
      .then(async (res) => {
        const contentType = res.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');
        const body = isJson ? await res.json() : await res.text();

        if (!res.ok) {
          const details = isJson
            ? (body?.details || body?.error || 'Simulation request failed')
            : `Simulation endpoint returned ${res.status} ${res.statusText}.`;
          throw new Error(details);
        }
        if (!isJson) {
          throw new Error('Simulation endpoint did not return JSON.');
        }

        if (!cancelled) {
          setResult(body);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Failed to run simulation');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [inputs]);

  return (
    <div className="container" style={{ maxWidth: 900 }}>
      <h1 className="section-title">Live Demo</h1>
      <p className="note" style={{ marginBottom: '1rem' }}>Step-by-step explanation using your current inputs.</p>
      {loading && <p className="note">Running Python model simulation...</p>}
      {error && <p className="note" style={{ color: '#b42318' }}>Model error: {error}</p>}
      {!loading && !error && result && (
        <>

      <div className="card" style={{ marginBottom: '0.75rem' }}>
        <h3>Step 1: Profile risk</h3>
        <p>
          We estimate a weekly job-loss hazard with a logistic model using unemployment, personal risk factors, and interest rate.
          Current model intercept: <strong>{result.riskLevel.toFixed(3)}</strong>.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '0.75rem' }}>
        <h3>Step 2: Income scenarios</h3>
        <p>
          We simulate {inputs.n_paths.toLocaleString()} paths over {inputs.horizon_years} years with Poisson job-loss events and unemployment dynamics.
          Mean income (no hedge): <strong>${Math.round(result.meanNo).toLocaleString()}</strong>.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '0.75rem' }}>
        <h3>Step 3: Contract sizing</h3>
        <p>
          Contract count is input-driven to cover about 6 months of income: <strong>{result.contracts.toLocaleString()}</strong> contracts
          for ${inputs.salary.toLocaleString()} salary.
        </p>
      </div>

      <div className="card">
        <h3>Step 4: Final recommendation</h3>
        <p>
          Buy {result.contracts.toLocaleString()} contracts at ${result.contractPrice.toFixed(2)} each (total ${result.totalCost.toLocaleString()}).
          Tail risk improves from <strong>{result.tailNo.toFixed(1)}%</strong> to <strong>{result.tailHedge.toFixed(1)}%</strong>.
        </p>
      </div>
      </>
      )}

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
