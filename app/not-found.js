import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <h1 className="section-title">Page not found</h1>
      <p className="note" style={{ marginBottom: '1rem' }}>The page you are looking for does not exist.</p>
      <Link href="/" className="cta-btn">Go home</Link>
    </div>
  );
}
