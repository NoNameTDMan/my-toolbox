/* My Toolbox v1.1.2 — GitHub Pages compatible offline shell.
 * Limit cache and cleanup to THIS site's path. github.io hosts many repositories
 * under one origin, so deleting all origin caches would harm unrelated apps.
 */
const CACHE_VERSION = 'v1.1.3-github-pages-civilization-safety-1';
const SCOPE_URL = new URL(self.registration.scope);
const CACHE_PREFIX = `my-toolbox:${encodeURIComponent(SCOPE_URL.pathname)}:`;
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;
const ASSETS = [
  './', './index.html', './styles.css', './app.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/icon-1024.png',
  './game-player.html', './recovery.html',
  './games/civilization/index.html', './games/civilization/style.css', './games/civilization/game.js',
  './games/civilization/manifest.webmanifest',
  './games/civilization/icon-180.png', './games/civilization/icon-192.png', './games/civilization/icon-512.png'
];
const SHELL_URLS = new Set(ASSETS.map(path => new URL(path, SCOPE_URL).href));
const GAME_DIR = new URL('./games/civilization/', SCOPE_URL).pathname;
const HOME_URL = new URL('./', SCOPE_URL).href;
const INDEX_URL = new URL('./index.html', SCOPE_URL).href;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Project pages share USER.github.io with other repositories. Never intercept
  // external requests or sibling GitHub Pages projects.
  if (url.origin !== SCOPE_URL.origin || !url.pathname.startsWith(SCOPE_URL.pathname)) return;
  const cleanURL = new URL(url.pathname, url.origin).href;
  // Future game assets added under this folder are cached on their first online request.
  if (!SHELL_URLS.has(cleanURL) && !url.pathname.startsWith(GAME_DIR)) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(cleanURL, response.clone()).catch(() => {});
      }
      return response;
    } catch (_error) {
      const cache = await caches.open(CACHE_NAME);
      const found = await cache.match(cleanURL);
      if (found) return found;
      if (request.mode === 'navigate' && (cleanURL === HOME_URL || cleanURL === INDEX_URL)) {
        return (await cache.match(INDEX_URL)) || Response.error();
      }
      return Response.error();
    }
  })());
});
