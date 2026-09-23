const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

function readText(filePath) {
  return fs.readFileSync(path.join(root, filePath), "utf8");
}

function isRelativeScopedPath(value) {
  return typeof value === "string"
    && value.startsWith("./")
    && !value.startsWith("/")
    && !/^[a-z][a-z0-9+.-]*:/i.test(value);
}

function createServiceWorkerSandbox() {
  const sandbox = {
    URL,
    Set,
    self: {
      location: {
        href: "https://fazenda.example/app/index.html",
        origin: "https://fazenda.example",
      },
      addEventListener() {},
      clients: {
        claim() {},
      },
    },
  };

  vm.createContext(sandbox);
  vm.runInContext(readText("sw.js"), sandbox);
  return sandbox;
}

function callServiceWorkerFunction(sandbox, functionName, argument) {
  return vm.runInContext(`${functionName}(${JSON.stringify(argument)})`, sandbox);
}

test("manifest PWA possui configuracao instalavel e caminhos relativos", () => {
  const manifest = JSON.parse(readText("manifest.webmanifest"));

  assert.equal(manifest.id, "./");
  assert.equal(manifest.name, "Plataforma da Pecuária");
  assert.equal(manifest.short_name, "Pecuária");
  assert.equal(manifest.lang, "pt-BR");
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.orientation, "any");
  assert.equal(manifest.theme_color, "#0B3D2E");
  assert.equal(manifest.background_color, "#F5F7F4");
  assert.equal(manifest.prefer_related_applications, false);
  assert.ok(manifest.description.includes("Calculadora"));

  assert.ok(Array.isArray(manifest.icons));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192" && icon.purpose === "any"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "any"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable"));

  manifest.icons.forEach((icon) => {
    assert.equal(icon.type, "image/png");
    assert.ok(isRelativeScopedPath(icon.src), `${icon.src} deve ser relativo ao escopo`);
  });
});

test("HTML referencia manifest, icone Apple e controlador PWA", () => {
  const html = readText("index.html");

  assert.match(html, /<link rel="manifest" href="\.\/manifest\.webmanifest">/);
  assert.match(html, /<meta name="theme-color" content="#0B3D2E">/);
  assert.match(html, /<link rel="apple-touch-icon" href="\.\/assets\/icons\/icon-180\.png">/);
  assert.match(html, /id="install-app"/);
  assert.match(html, /id="connection-status"/);
  assert.match(html, /<script src="src\/property-core\.js"><\/script>/);
  assert.match(html, /<script src="src\/account-repository\.js"><\/script>/);
  assert.match(html, /<script src="src\/property-repository\.js"><\/script>/);
  assert.match(html, /<script src="src\/pwa-controller\.js"><\/script>/);
  assert.doesNotMatch(html, /<install[\s>]/i);
});

test("controlador PWA registra service worker relativo e nao usa API experimental", () => {
  const controller = readText("src/pwa-controller.js");

  assert.match(controller, /serviceWorker"\s+in\s+navigator/);
  assert.match(controller, /navigator\.serviceWorker\.register\("\.\/sw\.js",\s*\{\s*scope:\s*"\.\/"\s*\}\)/);
  assert.match(controller, /beforeinstallprompt/);
  assert.match(controller, /appinstalled/);
  assert.match(controller, /display-mode:\s*standalone/);
  assert.match(controller, /navigator\.onLine/);
  assert.match(controller, /Sem conexão — seus dados locais continuam disponíveis\./);
  assert.doesNotMatch(controller, /navigator\.install/);
  assert.doesNotMatch(controller, /localStorage|sessionStorage|WebSocket|fetch\(/);
});

test("service worker possui cache versionado e regras de seguranca", () => {
  const serviceWorker = readText("sw.js");

  assert.match(serviceWorker, /const CACHE_VERSION = "v6"/);
  assert.match(serviceWorker, /const CACHE_PREFIX = "plataforma-pecuaria-shell-"/);
  assert.match(serviceWorker, /const CACHE_NAME = `\$\{CACHE_PREFIX\}\$\{CACHE_VERSION\}`/);
  assert.match(serviceWorker, /cache\.addAll\(APP_SHELL\)/);
  assert.match(serviceWorker, /cacheName\.startsWith\(CACHE_PREFIX\)/);
  assert.match(serviceWorker, /self\.clients\.claim\(\)/);
  assert.match(serviceWorker, /event\.request\.method !== "GET"/);
  assert.match(serviceWorker, /requestUrl\.origin !== self\.location\.origin/);
  assert.match(serviceWorker, /event\.request\.mode === "navigate"/);
  assert.match(serviceWorker, /networkFirstNavigation\(event\.request\)/);
  assert.match(serviceWorker, /staleWhileRevalidate\(event\.request\)/);
  assert.match(serviceWorker, /"\.\/src\/property-core\.js"/);
  assert.match(serviceWorker, /"\.\/src\/account-repository\.js"/);
  assert.match(serviceWorker, /"\.\/src\/property-repository\.js"/);
  assert.doesNotMatch(serviceWorker, /skipWaiting/);
  assert.doesNotMatch(serviceWorker, /workbox/i);
  assert.doesNotMatch(serviceWorker, /localStorage|sessionStorage|openDatabase|indexedDB/);
});

test("navegacao so permite atualizar fallback do index para entrada principal", () => {
  const serviceWorker = readText("sw.js");
  const sandbox = createServiceWorkerSandbox();
  const isAppEntry = (url) => callServiceWorkerFunction(sandbox, "isAppEntryNavigation", url);

  assert.match(serviceWorker, /function isAppEntryNavigation\(url\)/);
  assert.match(serviceWorker, /isAppEntryNavigation\(request\.url\) && isCacheableResponse\(response\)/);

  assert.equal(isAppEntry("https://fazenda.example/app/"), true);
  assert.equal(isAppEntry("https://fazenda.example/app/?origem=pwa#topo"), true);
  assert.equal(isAppEntry("https://fazenda.example/app/index.html"), true);
  assert.equal(isAppEntry("https://fazenda.example/app/index.html?origem=pwa#topo"), true);
  assert.equal(isAppEntry("./"), true);
  assert.equal(isAppEntry("./index.html?versao=local#inicio"), true);

  assert.equal(isAppEntry("./README.md"), false);
  assert.equal(isAppEntry("./manifest.webmanifest"), false);
  assert.equal(isAppEntry("./styles.css"), false);
  assert.equal(isAppEntry("./app.js"), false);
  assert.equal(isAppEntry("./assets/icons/icon-192.png"), false);
  assert.equal(isAppEntry("https://cdn.example/app/index.html"), false);
});
