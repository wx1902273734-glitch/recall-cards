const CACHE_NAME = 'recall-cards-ui-v2';
const APP_SHELL = ['./','./index.html','./pulse.html','./pulse.css','./pulse.js','./pulse.webmanifest','./styles.css','./app.js','./content.js','./cloud.js','./pwa.js','./manifest.webmanifest','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png','./vendor/marked.js','./vendor/purify.js'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)));
      }
      return response;
    }).catch(async () => (await caches.match(event.request, {ignoreSearch:true})) || caches.match(url.pathname === '/pulse.html' ? './pulse.html' : './index.html')));
    return;
  }
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok && event.request.method === 'GET') caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
    return response;
  }).catch(() => caches.match(event.request)));
});
