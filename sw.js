const CACHE = 'mychat-shell-v2';

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(['./', './forme.html'])).catch(() => {})
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    ])
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy)).catch(() => {});
      return response;
    }).catch(() => caches.match(event.request).then(hit => hit || caches.match('./forme.html')))
  );
});

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (_) { data = { text: event.data ? event.data.text() : 'New message' }; }

  const title = data.title || data.sender || 'MYChat';
  const options = {
    body: data.text || 'New message',
    icon: data.icon || './icon-192.png',
    badge: data.badge || './icon-192.png',
    tag: data.room ? `mychat-${data.room}` : 'mychat-message',
    renotify: true,
    silent: false,
    vibrate: [180, 80, 180],
    data: {
      url: data.url || './forme.html',
      room: data.room || '',
      messageId: data.messageId || ''
    }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || './forme.html', self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(target).catch(() => {});
          return client.focus();
        }
      }
      return clients.openWindow ? clients.openWindow(target) : undefined;
    })
  );
});
