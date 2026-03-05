'use client';

import Link from 'next/link';
import Footer from '@/components/Footer';
import HeroWaves from '@/components/HeroWaves';
import { useEffect, useState } from 'react';

const rotatingHeadlines = [
  'Hedge your income against job loss',
  'Run Monte Carlo risk scenarios',
  'Size contracts from your inputs',
  'See downside protection clearly',
];

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

export default function HomePage() {
  const typedHeadline = useTypewriterRotation(rotatingHeadlines);

  return (
    <div className="landing-page-shell">
      <HeroWaves className="landing-waves" />
      <div className="landing-content">
        <section className="hero">
          <div className="hero-content">
            <h1>
              {typedHeadline}
              <span style={{ opacity: 0.7 }}>|</span>
            </h1>
            <p>
              Use prediction markets to protect your finances. Run a simulation and get a personalized contract recommendation in seconds.
            </p>
            <Link href="/quiz" className="cta-btn">Open Dashboard</Link>
            <div className="features" style={{ maxWidth: 900, margin: '2rem auto 0' }}>
              <div className="card">
                <h3>Monte Carlo Simulation</h3>
                <p className="note">5,000+ paths over 10 years</p>
              </div>
              <div className="card">
                <h3>Optimal Hedge Ratio</h3>
                <p className="note">Data-driven contract sizing</p>
              </div>
              <div className="card">
                <h3>Kalshi Integration</h3>
                <p className="note">Unemployment and recession markets</p>
              </div>
            </div>
          </div>
        </section>

        <section className="container" style={{ maxWidth: 760 }}>
          <h2 className="section-title" style={{ textAlign: 'center', color: '#3f3f3f' }}>FAQs</h2>
          <details className="faq-item">
            <summary>What is this?</summary>
            <p>We help you hedge your income against job loss using prediction markets. Enter your profile and get a contract recommendation sized to your salary.</p>
          </details>
          <details className="faq-item">
            <summary>How does the hedge work?</summary>
            <p>You buy contracts that pay out if US unemployment exceeds a threshold. If your job risk and macro stress align, payouts can offset lost income.</p>
          </details>
          <details className="faq-item">
            <summary>Is this financial advice?</summary>
            <p>No. This is a research tool from NYU BnF. Always do your own research and seek professional advice if needed.</p>
          </details>
        </section>
        <div className="container"><Footer /></div>
      </div>
    </div>
  );
}
