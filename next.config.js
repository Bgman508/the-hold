/** @type {import('next').NextConfig} */

/**
 * Security Headers for THE HOLD
 * 
 * Principles:
 * - Defense in depth
 * - No external trackers
 * - No PII exposure
 * - Anonymous-first design
 */

const securityHeaders = [
  // ==========================================================================
  // CONTENT SECURITY POLICY
  // ==========================================================================
  {
    key: 'Content-Security-Policy',
    value: [
      // Default: deny everything
      "default-src 'self'",
      
      // Scripts: only self and inline (for Next.js)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      
      // Styles: self and inline
      "style-src 'self' 'unsafe-inline'",
      
      // Images: self and data URIs
      "img-src 'self' data: blob:",
      
      // Fonts: self and Google Fonts
      "font-src 'self' https://fonts.gstatic.com",
      
      // Connect: self and WebSocket
      "connect-src 'self' wss: ws:",
      
      // Media: self only
      "media-src 'self'",
      
      // Objects: none (no Flash, etc.)
      "object-src 'none'",
      
      // Frames: deny framing
      "frame-src 'none'",
      
      // Frame ancestors: prevent clickjacking
      "frame-ancestors 'none'",
      
      // Base URI: restrict
      "base-uri 'self'",
      
      // Form action: self only
      "form-action 'self'",
      
      // Upgrade insecure requests
      'upgrade-insecure-requests',
    ].join('; '),
  },
  
  // ==========================================================================
  // STRICT TRANSPORT SECURITY (HSTS)
  // ==========================================================================
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  
  // ==========================================================================
  // X-FRAME-OPTIONS (Clickjacking protection)
  // ==========================================================================
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  
  // ==========================================================================
  // X-CONTENT-TYPE-OPTIONS (MIME sniffing protection)
  // ==========================================================================
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  
  // ==========================================================================
  // REFERRER POLICY (Privacy)
  // ==========================================================================
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  
  // ==========================================================================
  // X-XSS-PROTECTION (Legacy browser protection)
  // ==========================================================================
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  
  // ==========================================================================
  // PERMISSIONS POLICY (Feature restrictions)
  // ==========================================================================
  {
    key: 'Permissions-Policy',
    value: [
      'accelerometer=()',
      'autoplay=()',
      'camera=()',
      'display-capture=()',
      'document-domain=()',
      'encrypted-media=()',
      'fullscreen=(self)',
      'geolocation=()',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'midi=()',
      'payment=()',
      'picture-in-picture=()',
      'publickey-credentials-get=()',
      'screen-wake-lock=()',
      'sync-xhr=()',
      'usb=()',
      'web-share=()',
      'xr-spatial-tracking=()',
    ].join(', '),
  },
  
  // ==========================================================================
  // CROSS-ORIGIN POLICIES
  // ==========================================================================
  {
    key: 'Cross-Origin-Embedder-Policy',
    value: 'require-corp',
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'same-origin',
  },
  
  // ==========================================================================
  // CACHE CONTROL (Sensitive data protection)
  // ==========================================================================
  {
    key: 'Cache-Control',
    value: 'no-store, max-age=0',
  },
];

/**
 * API-specific security headers (less restrictive for API routes)
 */
const apiSecurityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
];

const nextConfig = {
  // ==========================================================================
  // OUTPUT (Docker standalone mode)
  // ==========================================================================
  output: 'standalone',

  // ==========================================================================
  // SECURITY HEADERS
  // ==========================================================================
  async headers() {
    return [
      // Apply security headers to all routes
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      // API routes get lighter headers
      {
        source: '/api/:path*',
        headers: apiSecurityHeaders,
      },
    ];
  },

  // ==========================================================================
  // REWRITES (Internal routing)
  // ==========================================================================
  async rewrites() {
    return [
      // WebSocket upgrade path
      {
        source: '/ws/:path*',
        destination: '/api/ws/:path*',
      },
    ];
  },

  // ==========================================================================
  // REDIRECTS (Security enforcement)
  // ==========================================================================
  async redirects() {
    return [
      // Redirect HTTP to HTTPS in production
      {
        source: '/:path*',
        has: [
          {
            type: 'header',
            key: 'x-forwarded-proto',
            value: 'http',
          },
        ],
        permanent: true,
        destination: 'https://:path*',
      },
    ];
  },

  // ==========================================================================
  // POWERED BY HEADER (Remove for security)
  // ==========================================================================
  poweredByHeader: false,

  // ==========================================================================
  // COMPRESSION
  // ==========================================================================
  compress: true,

  // ==========================================================================
  // IMAGES (Security)
  // ==========================================================================
  images: {
    // Only allow images from same origin
    remotePatterns: [],
    // Disable unoptimized images in production
    unoptimized: process.env.NODE_ENV === 'development',
  },

  // ==========================================================================
  // WEBPACK CONFIGURATION
  // ==========================================================================
  webpack: (config, { isServer }) => {
    // Security: Disable source maps in production
    if (!isServer && process.env.NODE_ENV === 'production') {
      config.devtool = false;
    }

    // Security: Prevent accidental exposure of env vars
    config.module.rules.push({
      test: /\.env$/,
      use: 'null-loader',
    });

    // Service Worker configuration
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },

  // ==========================================================================
  // ENVIRONMENT VARIABLES (Exposed to browser)
  // ==========================================================================
  env: {
    // WebSocket port for client-side connections
    NEXT_PUBLIC_WS_PORT: process.env.NEXT_PUBLIC_WS_PORT || '3001',
  },

  // ==========================================================================
  // EXPERIMENTAL FEATURES
  // ==========================================================================
  experimental: {
    // Server Actions (secure by default)
    serverActions: {
      bodySizeLimit: '1mb',
    },
    // Optimize CSS
    optimizeCss: true,
  },

  // ==========================================================================
  // TYPESCRIPT
  // ==========================================================================
  typescript: {
    // Don't fail build on type errors in dev
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },

  // ==========================================================================
  // ESLINT
  // ==========================================================================
  eslint: {
    // Don't fail build on lint errors in dev
    ignoreDuringBuilds: process.env.NODE_ENV === 'development',
  },

  // ==========================================================================
  // PWA CONFIGURATION
  // ==========================================================================
  // Register service worker
  async generateBuildId() {
    return 'the-hold-build';
  },
};

module.exports = nextConfig;
