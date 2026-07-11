const CACHE = 'teacher-static-v4';

// Only cache third-party CDN assets that never change
const CDN_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(CDN_ASSETS.map(url => c.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Never intercept Supabase or AI requests
  if (url.includes('supabase.co') || url.includes('pollinations.ai')) return;

  // Core app files: always fetch fresh from network, never serve from cache
  if (url.includes('index.html') || url.includes('app.js') || url.includes('style.css') || e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/teacher/index.html')));
    return;
  }

  // CDN assets: serve from cache, fallback to network
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
