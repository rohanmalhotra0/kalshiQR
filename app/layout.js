import './globals.css';
import NavBar from '@/components/NavBar';

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
        <div className="page">
          <NavBar />
          {children}
        </div>
      </body>
    </html>
  );
}
