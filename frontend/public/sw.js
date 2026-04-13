const CACHE_NAME = 'amber-grid-v1';

self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker Installed');
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker Activated');
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'AMBER ALERT', body: 'New case reported in your area!' };
  const options = {
    body: data.body,
    icon: '/icon.png',
    badge: '/icon.png',
    vibrate: [200, 100, 200],
    tag: 'amber-alert',
    renotify: true,
    data: {
      url: '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
