/* SabManage service worker: fast repeat visits and a clear offline screen.
   App data always comes live from the server; nothing private is cached. */
const VERSION = 'ep-2026-10-19b';
const SHELL = ['/offline.html', '/icon.svg', '/img/icons/icon-192.png', '/img/icons/icon-512.png', '/sounds/alert.mp3'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/offline.html')));
    return;
  }
  if (/^\/(img\/|sounds\/|icon\.svg|site\.css|site\.js)/.test(url.pathname)) {
    e.respondWith(caches.open(VERSION).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
  }
});

/* Team alerts: show a phone notification even when the app is closed.
   In the Android app these notifications ring with the SabManage tune on the alarm channel. */
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'SabManage', body: e.data ? e.data.text() : '' }; }
  const show = self.registration.showNotification(d.title || 'SabManage alert', {
    body: d.body || '', icon: '/img/icons/icon-192.png', badge: '/img/icons/icon-192.png',
    tag: 'alert-' + (d.id || Date.now()), renotify: true, requireInteraction: !!d.urgent,
    vibrate: d.urgent ? [700, 250, 700, 250, 1000, 400, 700, 250, 700] : [400, 150, 400],
    timestamp: Date.now(), data: { url: d.url || '/app' }
  });
  const tell = self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => list.forEach(c => c.postMessage({ type: 'sm-alert', id: d.id })));
  e.waitUntil(Promise.all([show, tell]));
});
self.addEventListener('notificationclick', e => {
  e.notification.close(); const url = (e.notification.data && e.notification.data.url) || '/app';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const patient = url.indexOf('#p-') >= 0; /* an alert from the doctor opens that patient's own link */
    for (const c of list) { const u = new URL(c.url); if (patient ? c.url.indexOf(url.slice(url.indexOf('#p-'))) >= 0 : u.pathname.startsWith('/app') && u.hash.indexOf('#p-') !== 0) { c.postMessage({ type: 'sm-alert' }); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
