const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (name) => fs.readFileSync(path.join(__dirname, "..", name), "utf8");
test("Reproducao usa shell v9, modulos locais e IndexedDB V5", () => {
  const sw = read("sw.js"); const html = read("index.html");
  assert.match(sw, /CACHE_VERSION = "v9"/); assert.match(read("src/local-database.js"), /DB_VERSION = 5/);
  for (const module of ["reproduction-repository", "reproduction-controller"]) {
    assert.ok(sw.includes(`./src/${module}.js`)); assert.ok(html.includes(`src/${module}.js`));
  }
  assert.match(html, /data-property-section="reproduction"/);
  assert.doesNotMatch(sw, /skipWaiting\s*\(/);
});
test("UI reprodutiva usa DOM seguro e nao persiste estado reprodutivo no Animal", () => {
  for (const source of [read("src/reproduction-controller.js"), read("src/reproduction-repository.js"), read("src/animal-detail-controller.js")]) {
    assert.doesNotMatch(source, /innerHTML|outerHTML|insertAdjacentHTML|localStorage|sessionStorage|reproductiveStatus/);
  }
});
