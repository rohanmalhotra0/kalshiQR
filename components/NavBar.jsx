import Link from 'next/link';

const links = [
  ['Paper', '/paper'],
  ['Dashboard', '/quiz'],
  ['Documentation', '/documentation'],
  ['About Us', '/about'],
];

export default function NavBar() {
  return (
    <nav className="site-nav">
      <div className="site-nav-inner">
        <Link href="/" className="site-brand-wrap">
          <img src="/offsetLogo.jpg" alt="Offset logo" className="site-brand-logo" />
          <span className="site-brand">Offset</span>
        </Link>
        <div className="site-nav-links">
        {links.map(([label, href]) => (
            <Link key={href} href={href} className="site-nav-link">
            {label}
          </Link>
        ))}
        </div>
      </div>
    </nav>
  );
}
