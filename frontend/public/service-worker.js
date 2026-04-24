// EssayPro Service Worker — cache offline básico
const CACHE_NAME = 'essaypro-v1';
const CACHE_TIMEOUT = 5000; // 5s timeout para requests de rede

// Assets estáticos que sempre ficam em cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/static/css/main.css',
];

// Rotas da app que devem funcionar offline (shell pages)
const APP_ROUTES = [
  '/dashboard',
  '/correction-queue',
  '/my-essays',
  '/login',
];

// Instalar: pre-cachear o shell da app
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache do index.html para todas as rotas da app
      return cache.addAll(['/', '/index.html']).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Ativar: limpar caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: estratégia por tipo de request
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests não-GET e requests da API
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.origin !== self.location.origin && !url.hostname.includes('render.com')) return;

  // Arquivos estáticos (.js, .css, .png, .woff): Cache First
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2|ttf)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Navegação (HTML/rotas da app): Network First com fallback para cache
  if (request.mode === 'navigate') {
    event.respondWith(
      Promise.race([
        fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), CACHE_TIMEOUT)
        ),
      ]).catch(() =>
        // Fallback: retornar index.html cacheado (app funciona com JS)
        caches.match('/index.html').then((cached) => {
          if (cached) return cached;
          return new Response(
            '<html><body><h2>Sem conexão</h2><p>Verifique sua internet e tente novamente.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
      )
    );
    return;
  }
});

// Mensagem do cliente para limpar cache manualmente
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      event.ports[0]?.postMessage({ cleared: true });
    });
  }
});
