import Link from 'next/link';

const links = [
  ['Paper', '/paper'],
  ['Dashboard', '/quiz'],
  ['Documentation', '/documentation'],
  ['About Us', '/about'],
];

export default function NavBar() {
  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
      <Link href="/" style={{ fontWeight: 700, textDecoration: 'none' }}>NYU BnF x Kalshi</Link>
      <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap' }}>
        {links.map(([label, href]) => (
          <Link key={href} href={href} style={{ textDecoration: 'none', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
