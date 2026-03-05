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

const rotatingHeadlines = [
  'Hedge your income against job loss',
  'Run Monte Carlo risk scenarios',
  'Size contracts from your inputs',
  'See downside protection clearly',
];

const fmtCurrency = (v) => `$${Math.round(v).toLocaleString()}`;
const fmtPct = (v) => `${Number(v).toFixed(1)}%`;

function useTypewriterRotation(lines, typingMs = 34, deletingMs = 20, holdMs = 1300) {
  const [lineIdx, setLineIdx] = useState(0);
  const [value, setValue] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const full = lines[lineIdx] ?? '';
    let nextDelay = typingMs;

    if (!deleting && value.length < full.length) {
      nextDelay = typingMs;
    } else if (!deleting && value.length === full.length) {
      nextDelay = holdMs;
    } else if (deleting) {
      nextDelay = deletingMs;
    }

    const id = setTimeout(() => {
      if (!deleting && value.length < full.length) {
        setValue(full.slice(0, value.length + 1));
        return;
      }
      if (!deleting && value.length === full.length) {
        setDeleting(true);
        return;
      }
      if (deleting && value.length > 0) {
        setValue(full.slice(0, value.length - 1));
        return;
      }
      setDeleting(false);
      setLineIdx((prev) => (prev + 1) % lines.length);
    }, nextDelay);

    return () => clearTimeout(id);
  }, [value, deleting, lineIdx, lines, typingMs, deletingMs, holdMs]);

  return value;
}

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

function HistogramChart({ histogram, meanNo, meanHedge, baselineIncome }) {
  if (!histogram?.x?.length) return null;

  const w = 700;
  const h = 220;
  const maxY = Math.max(
    1,
    ...histogram.no_hedge,
    ...histogram.with_hedge,
  );
  const barW = w / histogram.x.length;
  const pointsNo = histogram.x.map((x, i) => [x, histogram.no_hedge[i]]);
  const pointsWith = histogram.x.map((x, i) => [x, histogram.with_hedge[i]]);
  const minX = Math.min(...histogram.x);
  const maxX = Math.max(...histogram.x);
  const noPath = toPath(pointsNo, w, h, minX, maxX, 0, maxY);
  const withPath = toPath(pointsWith, w, h, minX, maxX, 0, maxY);
  const xOf = (v) => ((v - minX) / Math.max(1e-9, maxX - minX)) * w;
  const safeMeanNo = Number.isFinite(meanNo) ? meanNo : minX;
  const safeMeanHedge = Number.isFinite(meanHedge) ? meanHedge : minX;
  const safeBaseline = Number.isFinite(baselineIncome) ? baselineIncome : maxX;

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <h3>Income Distribution (Monte Carlo)</h3>
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
        <path d={noPath} stroke="rgba(90,90,90,0.95)" strokeWidth="2" fill="none" />
        <path d={withPath} stroke="rgba(0,168,84,0.95)" strokeWidth="2" fill="none" />
        <line x1={xOf(safeMeanNo)} x2={xOf(safeMeanNo)} y1="0" y2={h} stroke="rgba(90,90,90,0.7)" strokeDasharray="5 4" />
        <line x1={xOf(safeMeanHedge)} x2={xOf(safeMeanHedge)} y1="0" y2={h} stroke="rgba(0,168,84,0.8)" strokeDasharray="4 3" />
        <line x1={xOf(safeBaseline)} x2={xOf(safeBaseline)} y1="0" y2={h} stroke="rgba(150,150,150,0.65)" />
      </svg>
      <p className="note" style={{ marginTop: '0.7rem' }}>
        Across all simulated paths, average income is {fmtCurrency(safeMeanNo)} without hedge vs {fmtCurrency(safeMeanHedge)} with hedge.
        The solid gray vertical marker is full-employment baseline income at {fmtCurrency(safeBaseline)}.
      </p>
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

  const p10No = percentiles.no_hedge[2];
  const p10With = percentiles.with_hedge[2];
  const p50No = percentiles.no_hedge[4];
  const p50With = percentiles.with_hedge[4];
  const p90No = percentiles.no_hedge[6];
  const p90With = percentiles.with_hedge[6];

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
      <p className="note" style={{ marginTop: '0.45rem' }}>
        At P10: {fmtCurrency(p10No)} to {fmtCurrency(p10With)}; at median: {fmtCurrency(p50No)} to {fmtCurrency(p50With)}; at P90: {fmtCurrency(p90No)} to {fmtCurrency(p90With)}.
        Higher green values mean better outcomes at that percentile.
      </p>
    </div>
  );
}

function SurvivalChart({ survival }) {
  if (!survival?.year?.length) return null;
  const w = 700;
  const h = 220;
  const points = survival.year.map((x, i) => [x, survival.still_employed_pct[i]]);
  const path = toPath(points, w, h, 0, Math.max(...survival.year), 0, 100);

  const start = survival.still_employed_pct[0];
  const end = survival.still_employed_pct[survival.still_employed_pct.length - 1];
  const years = survival.year[survival.year.length - 1];

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <h3>Employment Survival by Year</h3>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 220 }}>
        <line x1="0" x2={w} y1={h} y2={h} stroke="rgba(150,150,150,0.4)" />
        <line x1="0" x2={w} y1={h * 0.5} y2={h * 0.5} stroke="rgba(150,150,150,0.25)" />
        <line x1="0" x2={w} y1={0} y2={0} stroke="rgba(150,150,150,0.25)" />
        <path d={path} stroke="rgb(245,158,11)" strokeWidth="3" fill="none" />
      </svg>
      <p className="note" style={{ marginTop: '0.7rem' }}>
        This starts at {fmtPct(start)} and ends at {fmtPct(end)} by year {years}.
        Interpreting this plainly: about {fmtPct(100 - end)} of simulated careers see at least one job-loss event by the end of the horizon.
      </p>
    </div>
  );
}

function TriggerChart({ maxUnemployment, hedgeThreshold, triggerRate }) {
  if (!maxUnemployment?.x?.length) return null;
  const w = 700;
  const h = 220;
  const maxY = Math.max(1, ...maxUnemployment.count);
  const points = maxUnemployment.x.map((x, i) => [x, maxUnemployment.count[i]]);
  const minX = Math.min(...maxUnemployment.x);
  const maxX = Math.max(...maxUnemployment.x);
  const curve = toPath(points, w, h, minX, maxX, 0, maxY);
  const barW = w / maxUnemployment.x.length;
  const xOf = (v) => ((v - minX) / Math.max(1e-9, maxX - minX)) * w;

  const peakIdx = maxUnemployment.count.reduce((best, v, i, arr) => (v > arr[best] ? i : best), 0);
  const peakX = maxUnemployment.x[peakIdx];

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <h3>Hedge Trigger Distribution</h3>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 220 }}>
        {maxUnemployment.count.map((v, i) => {
          const bh = (v / maxY) * h;
          return (
            <rect
              key={`u-${maxUnemployment.x[i]}`}
              x={i * barW + 1}
              y={h - bh}
              width={Math.max(1, barW - 2)}
              height={bh}
              fill="rgba(0,168,84,0.35)"
            />
          );
        })}
        <path d={curve} stroke="rgba(0,168,84,0.95)" strokeWidth="2.2" fill="none" />
        <line x1={xOf(hedgeThreshold)} x2={xOf(hedgeThreshold)} y1="0" y2={h} stroke="rgba(0,168,84,0.95)" strokeDasharray="6 5" />
      </svg>
      <p className="note" style={{ marginTop: '0.7rem' }}>
        The most common max-unemployment region in this run is around {peakX.toFixed(2)}%.
        The hedge pays when max unemployment crosses {hedgeThreshold.toFixed(1)}%, which happens in about {fmtPct(triggerRate)} of paths.
      </p>
    </div>
  );
}

function MonteCarloSampleChart({ sample }) {
  if (!sample?.path?.length) return null;
  const w = 700;
  const h = 220;
  const pointsNo = sample.path.map((x, i) => [x, sample.no_hedge[i]]);
  const pointsWith = sample.path.map((x, i) => [x, sample.with_hedge[i]]);
  const minY = Math.min(...sample.no_hedge, ...sample.with_hedge);
  const maxY = Math.max(...sample.no_hedge, ...sample.with_hedge);
  const minX = Math.min(...sample.path);
  const maxX = Math.max(...sample.path);
  const noPath = toPath(pointsNo, w, h, minX, maxX, minY, maxY);
  const withPath = toPath(pointsWith, w, h, minX, maxX, minY, maxY);

  const avgNo = sample.no_hedge.reduce((a, b) => a + b, 0) / sample.no_hedge.length;
  const avgWith = sample.with_hedge.reduce((a, b) => a + b, 0) / sample.with_hedge.length;
  const sampleDelta = avgWith - avgNo;
  const minNo = Math.min(...sample.no_hedge);
  const maxNo = Math.max(...sample.no_hedge);

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <h3>Monte Carlo Sample Paths (Outcomes)</h3>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 220 }}>
        <path d={noPath} stroke="rgba(120,120,120,0.75)" strokeWidth="2" fill="none" />
        <path d={withPath} stroke="rgba(0,168,84,0.9)" strokeWidth="2" fill="none" />
      </svg>
      <p className="note" style={{ marginTop: '0.7rem' }}>
        This chart shows sampled path-by-path outcomes from the simulation. In this sample, average income moves from {fmtCurrency(avgNo)} to {fmtCurrency(avgWith)} (delta {fmtCurrency(sampleDelta)}).
        The no-hedge sample spans from {fmtCurrency(minNo)} to {fmtCurrency(maxNo)}.
      </p>
    </div>
  );
}

function DashboardClient() {
  const searchParams = useSearchParams();
  const inputs = useMemo(() => parseInputs(Object.fromEntries(searchParams.entries())), [searchParams]);
  const typedTitle = useTypewriterRotation(rotatingHeadlines);
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
      <h1 className="section-title" style={{ marginBottom: '0.35rem' }}>
        {typedTitle}
        <span style={{ opacity: 0.7 }}>|</span>
      </h1>
      <p className="note" style={{ marginBottom: '0.8rem' }}>Dashboard</p>
     

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
            <div className="metric"><div className="label">Cost per contract</div><div className="value">${result.contractPrice.toFixed(2)}</div></div>
            <div className="metric"><div className="label">Upfront hedge cost</div><div className="value">${result.totalCost.toLocaleString()}</div></div>
          </div>

          <HistogramChart
            histogram={result.histogram}
            meanNo={result.meanNo}
            meanHedge={result.meanHedge}
            baselineIncome={result.baselineIncome}
          />
          <MonteCarloSampleChart sample={result.monteCarloSample} />
          <PercentileChart percentiles={result.percentiles} />
          <SurvivalChart survival={result.survival} />
          <TriggerChart
            maxUnemployment={result.maxUnemployment}
            hedgeThreshold={result.hedgeThreshold}
            triggerRate={result.triggerRate}
          />

          <div className="card" style={{ marginTop: '1.25rem' }}>
            <p>
              <strong>Bottom line:</strong> Buy <strong>{result.contracts.toLocaleString()} contracts</strong> that pay out if US unemployment exceeds {result.hedgeThreshold.toFixed(1)}%.
              Cost is <strong>${result.contractPrice.toFixed(2)} per contract</strong> (upfront <strong>${result.totalCost.toLocaleString()}</strong> total).
              If triggered, payout is <strong>${result.payout.toLocaleString()}</strong>.
              In this model run, trigger chance is about <strong>{result.triggerRate.toFixed(1)}%</strong>.
            </p>
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
