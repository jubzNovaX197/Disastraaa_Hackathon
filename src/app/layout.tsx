import { brand } from '@/config/brand';
import { LiveIntelligenceProvider } from '@/context/LiveIntelligenceContext';
import { ThemeProvider } from '@/context/ThemeContext';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    template: `%s | ${brand.name}`,
    default:  `${brand.name} — ${brand.tagline}`,
  },
  description: brand.description,
  // keywords:    brand.keywords,
  keywords: [...brand.keywords],
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  ),
};

import { resolveServerEnvironment } from '@/lib/env';

export const viewport: Viewport = {
  themeColor:  [{ media: '(prefers-color-scheme: dark)', color: '#080C18' }, { media: '(prefers-color-scheme: light)', color: '#F8FAFC' }],
  colorScheme: 'dark light',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialEnvironment = await resolveServerEnvironment();

  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var saved = localStorage.getItem('disastraaa-theme');
                var prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
                var t = (saved === 'light' || saved === 'dark') ? saved : (prefersLight ? 'light' : 'dark');
                document.documentElement.classList.add(t);
                document.documentElement.setAttribute('data-theme', t);
                document.documentElement.style.colorScheme = t;
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-surface-base text-slate-100 font-sans antialiased transition-colors duration-200">
        <ThemeProvider>
          <LiveIntelligenceProvider initialEnvironment={initialEnvironment}>
            {children}
          </LiveIntelligenceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
