import Footer from '@/components/Footer';

export default function DocumentationPage() {
  return (
    <div className="container" style={{ maxWidth: 820 }}>
      <h1 className="section-title">Documentation</h1>
      <p className="note" style={{ marginBottom: '1rem' }}>Overview of the pipeline and implementation.</p>

      <div className="card" style={{ marginBottom: '0.8rem' }}>
        <h3>System pipeline</h3>
        <p>personal data → macro data → hazard model → simulation → income distribution → contract sizing.</p>
      </div>

      <div className="card" style={{ marginBottom: '0.8rem' }}>
        <h3>Contract rule</h3>
        <p>Unhardcoded sizing now always uses salary: <code>contracts = salary * 6 / 12</code>.</p>
      </div>

      <div className="card">
        <h3>Tech stack</h3>
        <p>Next.js App Router, React components, static export for GitHub Pages.</p>
      </div>

      <Footer />
    </div>
  );
}
