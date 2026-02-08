// ============================================================================
// THE HOLD - Service Worker
// Provides offline shell and caching for PWA functionality
// ============================================================================

/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// ============================================================================
// Configuration
// ============================================================================

const CACHE_NAME = 'the-hold-v1';
const STATIC_ASSETS = [
  '/',
  '/moment',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// ============================================================================
// Install Event - Cache static assets
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).catch((err) => {
      console.error('[SW] Failed to cache assets:', err);
    })
  );
  
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// ============================================================================
// Activate Event - Clean up old caches
// ============================================================================

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

// ============================================================================
// Fetch Event - Cache strategies
// ============================================================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip WebSocket requests
  if (request.headers.get('upgrade') === 'websocket') {
    return;
  }
  
  // Skip API requests (don't cache dynamic data)
  if (url.pathname.startsWith('/api/')) {
    return;
  }
  
  // Skip WebSocket connections
  if (url.protocol === 'wss:' || url.protocol === 'ws:') {
    return;
  }
  
  // Strategy: Cache First for static assets
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  
  // Strategy: Network First for HTML pages
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // Default: Network with cache fallback
  event.respondWith(networkWithCacheFallback(request));
});

// ============================================================================
// Cache Strategies
// ============================================================================

/**
 * Cache First strategy - Serve from cache, fallback to network
 */
async function cacheFirst(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Return offline fallback for navigation requests
    if (request.mode === 'navigate') {
      return cache.match('/');
    }
    throw err;
  }
}

/**
 * Network First strategy - Try network, fallback to cache
 */
async function networkFirst(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    // Return offline page if available
    const offlinePage = await cache.match('/');
    if (offlinePage) {
      return offlinePage;
    }
    throw err;
  }
}

/**
 * Network with cache fallback - Try network, cache for next time
 */
async function networkWithCacheFallback(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw err;
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Check if URL is a static asset
 */
function isStaticAsset(url: URL): boolean {
  const staticExtensions = [
    '.js',
    '.css',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.ico',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
    '.json',
  ];
  
  return staticExtensions.some((ext) => 
    url.pathname.endsWith(ext)
  );
}

// ============================================================================
// Message Handling (for communication with main thread)
// ============================================================================

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ============================================================================
// Push Notifications (placeholder for future)
// ============================================================================

self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'THE HOLD', {
      body: data.body || 'A quiet moment awaits.',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: data.tag || 'default',
      requireInteraction: false,
      silent: true, // Keep it quiet
    })
  );
});

// ============================================================================
// Notification Click Handler
// ============================================================================

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    self.clients.openWindow('/')
  );
});

// Export for TypeScript
export {};
