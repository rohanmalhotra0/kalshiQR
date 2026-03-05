import './globals.css';
import NavBar from '@/components/NavBar';
import Script from 'next/script';

export const metadata = {
  title: 'Offset',
  description: 'Hedge your income against job loss with prediction-market sizing.',
  icons: {
    icon: '/offsetLogo.jpg',
    apple: '/offsetLogo.jpg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Script
          id="mathjax-script"
          src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"
          strategy="afterInteractive"
        />
        <div className="page">
          <NavBar />
          {children}
        </div>
      </body>
    </html>
  );
}
