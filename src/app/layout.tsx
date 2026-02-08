import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import './globals.css';

// Primary font: Cormorant Garamond (elegant serif)
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-cormorant',
  display: 'swap',
  preload: true,
});

// Secondary font: Inter (clean sans-serif for UI)
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});

// PWA Metadata
export const metadata: Metadata = {
  title: 'THE HOLD | A Quiet Space to Simply Be',
  description: 'An anonymous sanctuary for ephemeral connection. Enter, breathe, and simply be with others in shared silence.',
  keywords: ['sanctuary', 'meditation', 'mindfulness', 'connection', 'peace', 'quiet'],
  authors: [{ name: 'THE HOLD' }],
  creator: 'THE HOLD',
  publisher: 'THE HOLD',
  robots: 'index, follow',
  
  // PWA manifest
  manifest: '/manifest.json',
  
  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://thehold.app',
    siteName: 'THE HOLD',
    title: 'THE HOLD | A Quiet Space to Simply Be',
    description: 'An anonymous sanctuary for ephemeral connection.',
    images: [
      {
        url: '/icons/og-image.png',
        width: 1200,
        height: 630,
        alt: 'THE HOLD - A Quiet Space to Simply Be',
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'THE HOLD | A Quiet Space to Simply Be',
    description: 'An anonymous sanctuary for ephemeral connection.',
    images: ['/icons/og-image.png'],
  },
  
  // Icons
  icons: {
    icon: [
      { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/icons/safari-pinned-tab.svg', color: '#C4A77D' },
    ],
  },
  
  // Apple specific
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'THE HOLD',
  },
  
  // Verification
  verification: {
    // Add verification tokens here if needed
  },
  
  // Other
  category: 'wellness',
  classification: 'wellness, meditation, mindfulness',
};

// Viewport configuration
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  minimumScale: 1,
  userScalable: true,
  themeColor: '#0D0D0F',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html 
      lang="en" 
      className={`${cormorant.variable} ${inter.variable} dark`}
      suppressHydrationWarning
    >
      <head>
        {/* PWA Tags */}
        <meta name="application-name" content="THE HOLD" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="THE HOLD" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#0D0D0F" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Preconnect to Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased bg-bg-primary text-text-primary min-h-screen">
        {/* Ambient background glow */}
        <div 
          className="fixed inset-0 pointer-events-none z-0"
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-bg-primary via-bg-primary to-bg-secondary" />
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-[0.03] animate-breathe"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(196, 167, 125, 0.3) 0%, transparent 70%)',
            }}
          />
        </div>
        
        {/* Main content */}
        <main className="relative z-10 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
