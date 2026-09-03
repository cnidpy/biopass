/* Doorway Cortex Bio-Pass — service worker (Web Push) */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Bio-Pass', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Doorway Cortex Bio-Pass';
  const options = {
    body: data.body || '',
    tag: data.tag || 'biopass',
    renotify: true,
    requireInteraction: !!data.requireInteraction,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/', ...(data.data || {}) },
    vibrate: data.requireInteraction ? [200, 100, 200, 100, 200] : [120],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(target);
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
