import Link from 'next/link';
import Footer from '@/components/Footer';
import HeroWaves from '@/components/HeroWaves';

export default function HomePage() {
  return (
    <div className="landing-page-shell">
      <HeroWaves className="landing-waves" />
      <div className="landing-content">
        <section className="hero">
          <div className="hero-content">
            <h1>Hedge your income against job loss</h1>
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
          <h2 className="section-title" style={{ textAlign: 'center', color: 'var(--accent)' }}>FAQs</h2>
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
