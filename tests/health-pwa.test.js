const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
test("Sanidade usa shell v8 com modulos locais e banco V5", () => {
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  for (const module of ["health-repository", "health-controller"]) {
    assert.ok(sw.includes(`"./src/${module}.js"`)); assert.ok(html.includes(`src="src/${module}.js"`));
  }
  assert.match(sw, /CACHE_VERSION = "v8"/);
  assert.match(fs.readFileSync(path.join(root, "src/local-database.js"), "utf8"), /DB_VERSION = 5/);
});
