
// eDrive PWA & Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/11.3.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.3.1/firebase-messaging-compat.js');

const CACHE_NAME = "edrive-pwa-v1.3";
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
];

// Initialize Firebase in Service Worker
firebase.initializeApp({
  apiKey: "AIzaSyCah7Ns_8cUe8lrCjjs2BK1Su8_xat4KXY",
  authDomain: "edrive1-4fbdd.firebaseapp.com",
  projectId: "edrive1-4fbdd",
  storageBucket: "edrive1-4fbdd.firebasestorage.app",
  messagingSenderId: "705923588483",
  appId: "1:705923588483:web:9df969f62b9d49845856b6",
});

const messaging = firebase.messaging();

// Handle Background Notifications
messaging.onBackgroundMessage((payload) => {
  console.log('eDrive FCM SW: Background message received', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"%3E%3Crect width="192" height="192" rx="45" fill="%23c1ff22"/%3E%3Ctext x="96" y="145" font-family="Arial, sans-serif" font-weight="900" font-style="italic" font-size="145" text-anchor="middle" fill="black"%3Ee%3C/text%3E%3C/svg%3E',
    badge: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"%3E%3Crect width="32" height="32" rx="8" fill="%23c1ff22"/%3E%3Ctext x="16" y="24" font-family="Arial, sans-serif" font-weight="900" font-style="italic" font-size="22" text-anchor="middle" fill="black"%3Ee%3C/text%3E%3C/svg%3E',
    tag: 'edrive-notification',
    renotify: true,
    data: {
      url: '/'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Install a service worker
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('eDrive: Application Shell Caching...');
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Cache and return requests
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response;
      }
      return fetch(event.request);
    })
  );
});

// Update a service worker
self.addEventListener("activate", event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('eDrive: Purging old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Handle Notification Clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
