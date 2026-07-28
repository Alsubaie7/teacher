const CACHE = 'teacher-static-v5';

// أصول خارجية لا تتغيّر
const CDN_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
];

/* صفحة الإقلاع المخزّنة: بدونها كان الرجوع عند انقطاع الشبكة يقصد
   '/teacher/index.html' وهو عنوان لم يُخزَّن قط، فيخرج التطبيق المثبَّت
   بصفحة خطأ فارغة. تُشتق من نطاق العامل ليصحّ محلياً وعلى GitHub Pages. */
const SHELL = new URL('./index.html', self.registration.scope).pathname;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled([
        ...CDN_ASSETS.map(url => c.add(url)),
        c.add(new Request(SHELL, { cache: 'reload' })),
      ]))
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
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = req.url;

  // لا تعترض Supabase ولا خدمة المساعد
  if (url.includes('supabase.co') || url.includes('pollinations.ai')) return;

  /* ملفات التطبيق الأساسية: الشبكة أولاً كي تصل التحديثات فوراً، مع
     تحديث النسخة المخزّنة في كل نجاح لتبقى صالحة وقت الانقطاع. */
  const isCore = url.includes('index.html') || url.includes('app.js')
              || url.includes('style.css') || req.mode === 'navigate';
  if (isCore) {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req.mode === 'navigate' ? SHELL : req, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match(SHELL))
          || new Response('<!doctype html><meta charset="utf-8"><p style="font-family:sans-serif;text-align:center;padding:2rem">لا يوجد اتصال، ولم تُحفظ نسخة بعد.</p>',
                          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }))
    );
    return;
  }

  /* بقية الأصول: من المخزن أولاً ثم الشبكة. صفحات الكتب والعروض تُخدم
     ولا تُخزَّن — مجموعها ٨٠ ميجابايت وكان حفظها التلقائي يستنفد حصة
     التخزين ويُفشل حفظ هيكل التطبيق نفسه. */
  const bulky = url.includes('/books/') || url.includes('/presentations/');
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      if (!bulky && res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});
