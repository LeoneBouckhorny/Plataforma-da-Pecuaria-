const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const layers = ["tokens", "base", "components", "layout", "print"];
const cssFiles = ["styles.css", ...layers.map((name) => `styles/${name}.css`)];
const tokens = read("styles/tokens.css");
const shell = [...read("sw.js").matchAll(/"(\.\/[^"\n]+)"/g)].map((match) => match[1]);

test("design system centraliza a paleta oficial e os estados semanticos", () => {
  for (const [name, value] of Object.entries({ primary: "#0B3D2E", accent: "#22C55E", text: "#1F2937", earth: "#B88B6F", background: "#F5F7F4" })) {
    assert.ok(tokens.includes(`--color-${name}: ${value};`));
  }
  for (const name of ["primary-hover", "primary-active", "accent-hover", "accent-active", "text-muted", "text-inverse", "surface", "surface-secondary", "border", "border-strong", "success", "warning", "danger", "info", "disabled", "focus"]) {
    assert.ok(tokens.includes(`--color-${name}:`), name);
  }
  for (const name of ["space-1", "space-6", "radius-sm", "radius-lg", "shadow-sm", "shadow-md", "font-family", "font-bold", "line-body", "control-height", "transition-fast"]) assert.ok(tokens.includes(`--${name}:`));
});

test("camadas CSS existem e nao duplicam cores fora dos tokens", () => {
  for (const layer of layers) {
    assert.ok(read("styles.css").includes(`./styles/${layer}.css`));
    assert.ok(shell.includes(`./styles/${layer}.css`));
    if (layer !== "tokens") assert.doesNotMatch(read(`styles/${layer}.css`), /#[\da-f]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(/i);
  }
  const definitions = new Set([...tokens.matchAll(/(--[a-z\d-]+)\s*:/g)].map((m) => m[1]));
  definitions.add("--action-icon");
  for (const file of cssFiles) for (const match of read(file).matchAll(/var\((--[a-z\d-]+)/g)) assert.ok(definitions.has(match[1]), `${file}: ${match[1]}`);
});

test("URLs de CSS e HTML sao locais relativas e os assets existem no shell", () => {
  for (const file of cssFiles) {
    for (const match of read(file).matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
      assert.doesNotMatch(match[1], /^(?:\/|[a-z]+:)/i);
      const relative = path.relative(root, path.resolve(root, path.dirname(file), match[1])).split(path.sep).join("/");
      assert.ok(fs.existsSync(path.join(root, relative)), relative);
      assert.ok(shell.includes(`./${relative}`), `${relative} absent from cache`);
    }
  }
  for (const match of read("index.html").matchAll(/(?:src|href)="([^"]+)"/g)) {
    assert.doesNotMatch(match[1], /^(?:\/|[a-z]+:)/i);
    assert.ok(fs.existsSync(path.join(root, match[1])));
  }
});

test("branding preserva exatamente o simbolo e os PNG aprovados", () => {
  for (const name of ["symbol.svg", "symbol-inverse.svg", "logo-horizontal.svg", "logo-horizontal-inverse.svg"]) {
    assert.equal(read(`assets/branding/${name}`), read(`docs/visual-sprint-005/assets/${name}`));
    assert.ok(shell.includes(`./assets/branding/${name}`));
  }
  for (const name of ["icon-180.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "favicon-32.png"]) {
    assert.deepEqual(fs.readFileSync(path.join(root, "assets/icons", name)), fs.readFileSync(path.join(root, "docs/visual-sprint-005/assets", name)));
    assert.ok(shell.includes(`./assets/icons/${name}`));
  }
});

test("header pequeno usa simbolo e nome sem assinatura ilegivel", () => {
  const header = read("index.html").match(/<header[\s\S]*?<\/header>/)[0];
  assert.match(header, /assets\/branding\/symbol\.svg/);
  assert.doesNotMatch(header, /logo-horizontal|impulsionam/i);
  assert.match(read("styles/layout.css"), /\.pwa-controls:not\(:has\(> :not\(\.hidden\)\)\)\s*\{\s*display: none/);
});

test("focus-visible usa tokens oficiais e controles possuem tamanho de toque", () => {
  assert.match(read("styles/base.css"), /:focus-visible\s*\{[^}]*var\(--color-focus\)/);
  assert.match(read("styles/components.css"), /\.tab-button:focus-visible\s*\{[^}]*var\(--color-focus-inverse\)/);
  assert.match(tokens, /--control-height: 44px/);
  assert.match(read("styles/components.css"), /button:disabled/);
});

test("tipografia possui fallback offline sem fonte externa", () => {
  assert.match(tokens, /Montserrat, system-ui, -apple-system, "Segoe UI", sans-serif/);
  const content = cssFiles.map(read).join("\n") + read("index.html");
  assert.doesNotMatch(content, /fonts\.google|fonts\.gstatic|cdn\.|@font-face|https?:\/\//i);
});

test("icones de acao usam a mesma linguagem local Lucide com licenca", () => {
  for (const name of ["plus", "x", "printer", "download", "check", "trash-2"]) {
    const svg = read(`assets/ui/${name}.svg`);
    assert.match(svg, /viewBox="0 0 24 24"/);
    assert.match(svg, /stroke-width="2"/);
    assert.doesNotMatch(svg, /<script|<image|href=/i);
    assert.ok(shell.includes(`./assets/ui/${name}.svg`));
  }
  assert.match(read("assets/ui/LICENSE"), /ISC License/);
});

test("manifest e favicon seguem paleta e dimensoes da marca", () => {
  const manifest = JSON.parse(read("manifest.webmanifest"));
  assert.ok(tokens.includes(`--color-primary: ${manifest.theme_color};`));
  assert.ok(tokens.includes(`--color-background: ${manifest.background_color};`));
  assert.match(read("index.html"), /sizes="32x32" href="\.\/assets\/icons\/favicon-32\.png"/);
  const png = fs.readFileSync(path.join(root, "assets/icons/favicon-32.png"));
  assert.equal(png.readUInt32BE(16), 32); assert.equal(png.readUInt32BE(20), 32);
  assert.match(read("sw.js"), /CACHE_VERSION = "v4"/);
  assert.match(read("src/local-database.js"), /DB_VERSION = 4/);
});

test("pares de contraste dos tokens atendem AA para texto e bordas de campos", () => {
  const colors = Object.fromEntries([...tokens.matchAll(/--color-([a-z-]+):\s*(#[a-f\d]{6})/gi)].map((m) => [m[1], m[2]]));
  function luminance(hex) {
    const c = hex.slice(1).match(/../g).map((v) => parseInt(v,16)/255).map((v) => v <= 0.04045 ? v/12.92 : ((v+0.055)/1.055)**2.4);
    return c[0]*0.2126 + c[1]*0.7152 + c[2]*0.0722;
  }
  const pairs = [["text","background",4.5],["text-muted","surface",4.5],["text-inverse","primary",4.5],["text-inverse","primary-hover",4.5],["text-inverse","primary-active",4.5],["accent","primary",4.5],["danger","danger-surface",4.5],["warning","warning-surface",4.5],["info","info-surface",4.5],["success","success-surface",4.5],["border-strong","surface",3]];
  for (const [foreground, background, minimum] of pairs) {
    const a=luminance(colors[foreground]), b=luminance(colors[background]);
    const ratio=(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
    assert.ok(ratio >= minimum, `${foreground}/${background}: ${ratio}`);
  }
});
