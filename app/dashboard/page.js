'use client';

import Footer from '@/components/Footer';
import { parseInputs } from '@/lib/model';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const loadingPhases = [
  'Building macro path scenarios',
  'Running hazard and Poisson job-loss simulation',
  'Aggregating tail risk and hedge outcomes',
  'Preparing charts and recommendation',
];

function toPath(points, width, height, minX, maxX, minY, maxY) {
  if (!points.length) return '';
  const spanX = Math.max(1e-9, maxX - minX);
  const spanY = Math.max(1e-9, maxY - minY);
  return points
    .map(([x, y], idx) => {
      const px = ((x - minX) / spanX) * width;
      const py = height - ((y - minY) / spanY) * height;
      return `${idx === 0 ? 'M' : 'L'}${px.toFixed(2)},${py.toFixed(2)}`;
    })
    .join(' ');
}

function HistogramChart({ histogram }) {
  if (!histogram?.x?.length) return null;

  const w = 700;
  const h = 220;
  const maxY = Math.max(
    1,
    ...histogram.no_hedge,
    ...histogram.with_hedge,
  );
  const barW = w / histogram.x.length;

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <h3>Income Distribution (Monte Carlo)</h3>
      <p className="note" style={{ marginBottom: '0.75rem' }}>
        Gray bars show no-hedge outcomes; green bars show with-hedge outcomes.
      </p>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 220 }}>
        {histogram.no_hedge.map((v, i) => {
          const bh = (v / maxY) * h;
          return (
            <rect
              key={`n-${histogram.x[i]}`}
              x={i * barW + 1}
              y={h - bh}
              width={Math.max(1, barW * 0.45)}
              height={bh}
              fill="rgba(160,160,160,0.65)"
            />
          );
        })}
        {histogram.with_hedge.map((v, i) => {
          const bh = (v / maxY) * h;
          return (
            <rect
              key={`h-${histogram.x[i]}`}
              x={i * barW + barW * 0.5}
              y={h - bh}
              width={Math.max(1, barW * 0.45)}
              height={bh}
              fill="rgba(0,168,84,0.72)"
            />
          );
        })}
      </svg>
    </div>
  );
}

function PercentileChart({ percentiles }) {
  if (!percentiles?.p?.length) return null;
  const w = 700;
  const h = 220;
  const pointsNo = percentiles.p.map((p, i) => [p, percentiles.no_hedge[i]]);
  const pointsWith = percentiles.p.map((p, i) => [p, percentiles.with_hedge[i]]);
  const allY = [...percentiles.no_hedge, ...percentiles.with_hedge];
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  const noPath = toPath(pointsNo, w, h, 1, 99, minY, maxY);
  const withPath = toPath(pointsWith, w, h, 1, 99, minY, maxY);

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <h3>Percentile Curve</h3>
      <p className="note" style={{ marginBottom: '0.75rem' }}>
        Curves compare how hedge shifts outcomes across the distribution.
      </p>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 220 }}>
        <path d={noPath} stroke="rgb(140,140,140)" strokeWidth="3" fill="none" />
        <path d={withPath} stroke="rgb(0,168,84)" strokeWidth="3" fill="none" />
      </svg>
      <p className="note">
        <span style={{ color: 'rgb(140,140,140)', fontWeight: 700 }}>No hedge</span>{' '}
        vs{' '}
        <span style={{ color: 'rgb(0,168,84)', fontWeight: 700 }}>With hedge</span>
      </p>
    </div>
  );
}

function DashboardClient() {
  const searchParams = useSearchParams();
  const inputs = useMemo(() => parseInputs(Object.fromEntries(searchParams.entries())), [searchParams]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const qs = new URLSearchParams(
      Object.entries(inputs).reduce((acc, [k, v]) => {
        acc[k] = String(v);
        return acc;
      }, {}),
    );

    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setPhase(0);

    const phaseTicker = setInterval(() => {
      setPhase((prev) => (prev + 1) % loadingPhases.length);
    }, 1600);
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    fetch(`/api/simulate?${qs.toString()}`, { signal: controller.signal })
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
          if (err.name === 'AbortError') {
            setError('Simulation timed out. Try a smaller path count (e.g. 1000-3000) and run again.');
          } else {
            setError(err.message || 'Failed to run simulation');
          }
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
        clearInterval(phaseTicker);
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      clearInterval(phaseTicker);
      controller.abort();
    };
  }, [inputs]);

  return (
    <div className="container" style={{ maxWidth: 1100 }}>
      <h1 className="section-title">Dashboard</h1>
      <p className="note">
        Inputs: industry={inputs.industry}, company={inputs.company_size}, level={inputs.job_level}, salary=${inputs.salary.toLocaleString()}, paths={inputs.n_paths}, horizon={inputs.horizon_years}y
      </p>

      {loading && (
        <div className="card loading-shell" style={{ marginTop: '1rem' }}>
          <div className="loading-spinner" />
          <div>
            <h3 style={{ marginBottom: '0.4rem' }}>Running model...</h3>
            <p className="note">{loadingPhases[phase]}</p>
            <p className="note" style={{ marginTop: '0.3rem' }}>
              This can take a bit for larger path counts.
            </p>
          </div>
        </div>
      )}
      {error && (
        <div className="card" style={{ marginTop: '1rem', borderColor: '#fda29b' }}>
          <h3 style={{ color: '#b42318' }}>Model error</h3>
          <p className="note" style={{ color: '#b42318' }}>{error}</p>
        </div>
      )}
      {!loading && !error && result && (
        <>
          <div className="metric-grid">
            <div className="metric"><div className="label">Average income (no hedge)</div><div className="value">${Math.round(result.meanNo).toLocaleString()}</div></div>
            <div className="metric"><div className="label">Average income (with hedge)</div><div className="value">${Math.round(result.meanHedge).toLocaleString()}</div></div>
            <div className="metric"><div className="label">Worst 5% outcomes</div><div className="value">${Math.round(result.worstNo).toLocaleString()} → ${Math.round(result.worstHedge).toLocaleString()}</div></div>
            <div className="metric"><div className="label">Big drop chance</div><div className="value">{result.tailNo.toFixed(1)}% → {result.tailHedge.toFixed(1)}%</div></div>
            <div className="metric"><div className="label">Contracts to buy</div><div className="value">{result.contracts.toLocaleString()}</div></div>
            <div className="metric"><div className="label">Upfront hedge cost</div><div className="value">${result.totalCost.toLocaleString()}</div></div>
          </div>

          <HistogramChart histogram={result.histogram} />
          <PercentileChart percentiles={result.percentiles} />

          <div className="card" style={{ marginTop: '1.25rem' }}>
            <p>
              <strong>Bottom line:</strong> Buy <strong>{result.contracts.toLocaleString()} contracts</strong> that pay out if US unemployment exceeds {result.hedgeThreshold.toFixed(1)}%.
              Upfront cost is <strong>${result.totalCost.toLocaleString()}</strong>. If triggered, payout is <strong>${result.payout.toLocaleString()}</strong>.
              In this model run, trigger chance is about <strong>{result.triggerRate.toFixed(1)}%</strong>.
            </p>
          </div>

          <div className="card" style={{ marginTop: '1rem' }}>
            <h3>Model assumptions</h3>
            <p className="note">Metrics and charts are generated by the Python hazard + Poisson + Monte Carlo pipeline via `/api/simulate`.</p>
          </div>
        </>
      )}

      <Footer />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="container"><p className="note">Loading dashboard...</p></div>}>
      <DashboardClient />
    </Suspense>
  );
}
