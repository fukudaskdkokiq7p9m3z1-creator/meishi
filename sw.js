// 名刺帳 Service Worker
// 役割: アプリ本体とOCR部品を端末に保存して、2回目以降は通信なしで動かす。
// 名刺のデータ（個人情報）はここでは一切扱わない。
const CACHE = 'meishi-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './apple-touch-icon.png', './icon-192.png', './icon-512.png'];
const OCR_HOSTS = ['cdn.jsdelivr.net', 'tessdata.projectnaptha.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !OCR_HOSTS.includes(url.hostname)) return;

  e.respondWith(
    caches.match(req).then((hit) => {
      const fresh = fetch(req).then((res) => {
        if (res && res.ok && (res.type === 'basic' || res.type === 'cors')) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
      // 自分のアプリ本体は「新しい版を取りに行きつつ、手元の版を先に表示」
      // OCR部品は大きいので、手元にあればそれを使う
      if (hit) { if (sameOrigin) fresh.catch(() => {}); return hit; }
      return fresh;
    })
  );
});
