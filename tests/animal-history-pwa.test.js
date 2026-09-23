const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
test("shell v6 inclui todos os modulos de historico individual sem CDN", () => {
  const root = path.join(__dirname, "..");
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  for (const name of ["animal-event-core", "animal-event-repository", "animal-history-core", "animal-history-repository", "animal-detail-controller"]) {
    assert.ok(sw.includes(`"./src/${name}.js"`)); assert.ok(html.includes(`src="src/${name}.js"`));
    assert.ok(fs.existsSync(path.join(root, "src", `${name}.js`)));
  }
  assert.match(sw, /CACHE_VERSION = "v6"/); assert.doesNotMatch(html, /https?:\/\//);
});
