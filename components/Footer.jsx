import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{ marginTop: '3rem', borderTop: '1px solid var(--border)', padding: '1.5rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
      <p>
        <Link href="/paper">Paper</Link> · <Link href="/quiz">Quiz</Link> · <Link href="/live-demo">Live Demo</Link> ·{' '}
        <a href="https://github.com/nyu-bnf/modelKalshi" target="_blank" rel="noreferrer">GitHub</a>
      </p>
      <p style={{ marginTop: '0.35rem' }}>NYU BnF x Kalshi — Hedge your income against job loss</p>
    </footer>
  );
}
