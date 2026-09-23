const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
test("PWA atual inclui todos os modulos do rebanho tambem referenciados no HTML", () => {
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  for (const name of ["herd-core", "paddock-core", "lot-core", "animal-core", "herd-repository", "paddock-repository", "lot-repository", "animal-repository", "herd-controller", "fast-lot-registration-core", "fast-lot-registration-repository", "herd-hierarchy-core"]) {
    assert.ok(sw.includes(`"./src/${name}.js"`));
    assert.ok(html.includes(`src="src/${name}.js"`));
    assert.ok(fs.existsSync(path.join(root, "src", `${name}.js`)));
  }
  assert.match(sw, /CACHE_VERSION = "v8"/);
});
