const CACHE_VERSION = "v5";
const CACHE_PREFIX = "plataforma-pecuaria-shell-";
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./styles/tokens.css",
  "./styles/base.css",
  "./styles/components.css",
  "./styles/layout.css",
  "./styles/print.css",
  "./assets/branding/symbol.svg",
  "./assets/branding/symbol-inverse.svg",
  "./assets/branding/logo-horizontal.svg",
  "./assets/branding/logo-horizontal-inverse.svg",
  "./assets/icons/favicon-32.png",
  "./assets/ui/plus.svg",
  "./assets/ui/x.svg",
  "./assets/ui/printer.svg",
  "./assets/ui/download.svg",
  "./assets/ui/check.svg",
  "./assets/ui/trash-2.svg",
  "./app.js",
  "./manifest.webmanifest",
  "./src/calculator-core.js",
  "./src/property-core.js",
  "./src/local-data-core.js",
  "./src/local-database.js",
  "./src/account-repository.js",
  "./src/property-repository.js",
  "./src/herd-core.js",
  "./src/paddock-core.js",
  "./src/lot-core.js",
  "./src/animal-core.js",
  "./src/herd-repository.js",
  "./src/paddock-repository.js",
  "./src/lot-repository.js",
  "./src/animal-repository.js",
  "./src/herd-controller.js",
  "./src/animal-event-core.js",
  "./src/animal-event-repository.js",
  "./src/animal-history-core.js",
  "./src/animal-history-repository.js",
  "./src/animal-detail-controller.js",
  "./src/draft-repository.js",
  "./src/weighing-history-core.js",
  "./src/weighing-repository.js",
  "./src/csv-export-core.js",
  "./src/pwa-controller.js",
  "./assets/icons/icon-180.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-512.png",
];

const APP_SHELL_URLS = new Set(APP_SHELL.map((resource) => new URL(resource, self.location.href).href));
const INDEX_URL = new URL("./index.html", self.location.href).href;
const ROOT_URL = new URL("./", self.location.href).href;
const APP_ENTRY_PATHS = new Set([
  new URL(ROOT_URL).pathname,
  new URL(INDEX_URL).pathname,
]);

function isHttpRequest(url) {
  return url.protocol === "http:" || url.protocol === "https:";
}

function isCacheableResponse(response) {
  return response && response.ok && response.type !== "opaque";
}

function isAppEntryNavigation(url) {
  const requestUrl = new URL(url, self.location.href);
  return requestUrl.origin === self.location.origin && APP_ENTRY_PATHS.has(requestUrl.pathname);
}

async function cacheResponse(cache, request, response) {
  if (isCacheableResponse(response)) {
    await cache.put(request, response.clone());
  }
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (isAppEntryNavigation(request.url) && isCacheableResponse(response)) {
      await cache.put(INDEX_URL, response.clone());
    }
    return response;
  } catch (_error) {
    return (await cache.match(INDEX_URL)) || (await cache.match(ROOT_URL)) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });

  const refresh = fetch(request)
    .then(async (response) => {
      await cacheResponse(cache, request, response);
      return response;
    })
    .catch(() => null);

  if (cached) {
    return cached;
  }

  return (await refresh) || Response.error();
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (!isHttpRequest(requestUrl) || requestUrl.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }

  if (APP_SHELL_URLS.has(requestUrl.href)) {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});
