import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zara Watchlist',
  description: 'Track Zara stock with instant alerts.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-body">{children}</body>
    </html>
  );
}
