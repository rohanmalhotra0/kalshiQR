import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div>
          <p className="site-footer-brand">Offset</p>
          <p className="site-footer-tagline">Hedge your income against job loss</p>
        </div>
        <div className="site-footer-links">
          <Link href="/paper">Paper</Link>
          <Link href="/quiz">Dashboard</Link>
          <Link href="/documentation">Documentation</Link>
          <a href="https://github.com/nyu-bnf/modelKalshi" target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </div>
    </footer>
  );
}
