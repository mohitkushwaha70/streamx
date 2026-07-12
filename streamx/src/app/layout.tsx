import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/ui/provider';

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'StreamX - Watch Movies, Series & Anime',
    template: '%s | StreamX',
  },
  description:
    'StreamX is your premium destination for movies, TV series, and anime. Watch unlimited content in HD and 4K quality.',
  keywords: ['streaming', 'movies', 'tv series', 'anime', 'watch online', 'streaming platform'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'StreamX',
    title: 'StreamX - Watch Movies, Series & Anime',
    description:
      'StreamX is your premium destination for movies, TV series, and anime. Watch unlimited content in HD and 4K quality.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StreamX - Watch Movies, Series & Anime',
    description:
      'StreamX is your premium destination for movies, TV series, and anime.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geist.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
