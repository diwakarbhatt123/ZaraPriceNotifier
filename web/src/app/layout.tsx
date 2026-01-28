import type { Metadata } from 'next';
import { Space_Grotesk, Sora } from 'next/font/google';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display'
});

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-body'
});

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
      <body className={`${spaceGrotesk.variable} ${sora.variable} font-body`}>{children}</body>
    </html>
  );
}
