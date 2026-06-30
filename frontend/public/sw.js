// Service Worker — Bilet Uygulaması PWA (Phase 13.8)
// Stratejik cache: Statik assets hızlı, API istekleri network-first

const CACHE_NAME = 'bilet-app-v1';
const STATIC_ASSETS = [
  '/',
  '/event',
  '/profile',
  '/manifest.json',
];

// Install: Statik sayfaları cache'le
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Eski cache'leri temizle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: API isteklerinde Network-First, statik içerikte Cache-First
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API isteklerini network-first yönet
  if (url.pathname.startsWith('/api/') || url.port === '5000') {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'İnternet bağlantısı yok. Lütfen tekrar deneyin.' }),
          { headers: { 'Content-Type': 'application/json' }, status: 503 }
        );
      })
    );
    return;
  }

  // Statik içeriği cache-first yönet
  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request).then((response) => {
        if (response.ok && request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});

// Push Notifications: Rezervasyon güncellemeleri için
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'Bilet Sistemi';
  const body = data.body || 'Yeni bir güncelleme var.';
  const icon = '/icon-192.png';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' },
    })
  );
});

// Notification click: Bildirimi tıklayınca ilgili sayfayı aç
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
