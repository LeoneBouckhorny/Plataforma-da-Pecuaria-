const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

function readText(filePath) {
  return fs.readFileSync(path.join(root, filePath), "utf8");
}

function extractAppShell() {
  const serviceWorker = readText("sw.js");
  const match = serviceWorker.match(/const APP_SHELL = \[([\s\S]*?)\];/);
  assert.ok(match, "APP_SHELL deve estar declarado no sw.js");

  return Array.from(match[1].matchAll(/"([^"]+)"/g), (item) => item[1]);
}

function shellPathToFile(resourcePath) {
  assert.ok(resourcePath.startsWith("./"), `${resourcePath} deve ser relativo ao escopo`);
  assert.ok(!resourcePath.startsWith("/"), `${resourcePath} nao deve apontar para raiz do dominio`);
  assert.ok(!/^[a-z][a-z0-9+.-]*:/i.test(resourcePath), `${resourcePath} nao deve ser URL absoluta`);

  if (resourcePath === "./") {
    return root;
  }

  return path.join(root, resourcePath.slice(2));
}

function readPngSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  const signature = buffer.subarray(0, 8).toString("hex");
  assert.equal(signature, "89504e470d0a1a0a", `${filePath} deve ser PNG`);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

test("app shell do service worker aponta apenas para arquivos locais existentes", () => {
  const appShell = extractAppShell();

  [
    "./",
    "./index.html",
    "./styles.css",
    "./app.js",
    "./manifest.webmanifest",
    "./src/calculator-core.js",
    "./src/local-data-core.js",
    "./src/local-database.js",
    "./src/draft-repository.js",
    "./src/weighing-history-core.js",
    "./src/weighing-repository.js",
    "./src/csv-export-core.js",
    "./src/pwa-controller.js",
    "./assets/icons/icon-180.png",
    "./assets/icons/icon-192.png",
    "./assets/icons/icon-512.png",
    "./assets/icons/icon-maskable-512.png",
  ].forEach((expectedPath) => {
    assert.ok(appShell.includes(expectedPath), `${expectedPath} deve estar no APP_SHELL`);
  });

  appShell.forEach((resourcePath) => {
    assert.ok(fs.existsSync(shellPathToFile(resourcePath)), `${resourcePath} deve existir fisicamente`);
  });
});

test("icones PWA possuem dimensoes corretas", () => {
  [
    ["assets/icons/icon-180.png", 180],
    ["assets/icons/icon-192.png", 192],
    ["assets/icons/icon-512.png", 512],
    ["assets/icons/icon-maskable-512.png", 512],
  ].forEach(([filePath, expectedSize]) => {
    const fullPath = path.join(root, filePath);
    const size = readPngSize(fullPath);
    assert.deepEqual(size, { width: expectedSize, height: expectedSize });
  });
});

test("manifest referencia somente icones existentes no app shell", () => {
  const manifest = JSON.parse(readText("manifest.webmanifest"));
  const appShell = extractAppShell();

  manifest.icons.forEach((icon) => {
    assert.ok(appShell.includes(icon.src), `${icon.src} deve estar no APP_SHELL`);
    assert.ok(fs.existsSync(shellPathToFile(icon.src)), `${icon.src} deve existir`);
  });
});
