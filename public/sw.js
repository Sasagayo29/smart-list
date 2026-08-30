const CACHE_NAME = 'smart-list-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Ignora as chamadas de banco de dados (Supabase) para evitar travamentos no cache
  if (event.request.url.includes('supabase.co')) {
    return; 
  }

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cachedResponse = await caches.match(event.request);
      // Retorna o cache se existir, ou uma resposta vazia para evitar o erro "TypeError"
      return cachedResponse || new Response("Sem conexão e sem cache disponível.", { status: 503 });
    })
  );
});