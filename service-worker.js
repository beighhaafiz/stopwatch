self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('[Service Worker] Activated!');
});

self.addEventListener('fetch', event => {
  // Just let it fetch everything normally
});
