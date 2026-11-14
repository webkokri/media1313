/* MEDIA 1313 — push notification service worker. It only handles notifications; it does not cache or intercept pages. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { title: 'MEDIA 1313', body: event.data ? event.data.text() : '' }; }
  const abs = (u) => { try { return new URL(u, self.location.origin).href; } catch { return undefined; } };
  event.waitUntil(self.registration.showNotification(d.title || 'MEDIA 1313', {
    body: d.body || '',
    icon: abs('/favicon.svg'), badge: abs('/favicon.svg'),
    image: d.image ? abs(d.image) : undefined,
    tag: d.tag || 'm1313', renotify: !!d.tag,
    data: { url: abs(d.url || '/') },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.location.origin + '/';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if (c.url.startsWith(self.location.origin) && 'focus' in c) { await c.focus(); if ('navigate' in c) { try { await c.navigate(url); } catch { /* cross-origin */ } } return; } }
    await self.clients.openWindow(url);
  })());
});
