import Footer from '@/components/Footer';

export default function AboutPage() {
  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <h1 className="section-title">About Us</h1>
      <p className="note" style={{ marginBottom: '1rem' }}>Offset — Our Team</p>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3>Kalshi Development Team</h3>
        <p>
          This semester, we're reimagining how retail investors interact with risk. In partnership with Kalshi, we're building a user-focused hedging dashboard designed for everyday users.
        </p>
        <p style={{ marginTop: '0.75rem' }}>
          The project blends personal finance, market mechanics, and product design to give consumers more agency over uncertainty.
        </p>
        <p style={{ marginTop: '1rem' }}>
          <a className="cta-btn" href="https://www.nyubnf.com/teams" target="_blank" rel="noreferrer">View all teams →</a>
        </p>
      </div>

      <Footer />
    </div>
  );
}
