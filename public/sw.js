const CACHE_NAME = 'smart-list-v1';

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Intercepta as requisições (Estratégia: Tenta a rede primeiro, depois o cache)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});