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

      <div className="card contact-card">
        <h3>Contact Us</h3>
        <p className="note" style={{ marginBottom: '1rem' }}>
          Reach the team through the channels below.
        </p>
        <div className="contact-grid">
          <div className="contact-item">
            <p className="contact-label">Organization</p>
            <p className="contact-value">Offset</p>
          </div>
          <div className="contact-item">
            <p className="contact-label">Website</p>
            <p className="contact-value">
              <a href="https://www.nyubnf.com" target="_blank" rel="noreferrer">nyubnf.com</a>
            </p>
          </div>
          <div className="contact-item">
            <p className="contact-label">Project Repository</p>
            <p className="contact-value">
              <a href="https://github.com/nyu-bnf/modelKalshi" target="_blank" rel="noreferrer">github.com/nyu-bnf/modelKalshi</a>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
