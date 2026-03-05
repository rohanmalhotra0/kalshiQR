import './globals.css';
import NavBar from '@/components/NavBar';

export const metadata = {
  title: 'NYU BnF x Kalshi',
  description: 'Hedge your income against job loss with prediction-market sizing.',
  icons: {
    icon: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="page">
          <NavBar />
          {children}
        </div>
      </body>
    </html>
  );
}
