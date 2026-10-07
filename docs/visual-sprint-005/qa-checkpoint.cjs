// Standalone visual checkpoint QA. No application data or service worker is used.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");
const sharp = require("sharp");
const out = path.join(__dirname, "screenshots");
const results = { scope: "Isolated visual checkpoint, not full Sprint 005 QA", viewports: [], contrasts: [], assets: [], errors: [] };

function luminance(hex) {
  const rgb = hex.match(/[a-f\d]{2}/gi).map((v) => parseInt(v, 16) / 255)
    .map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
async function main() {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  try {
    const page = await browser.newPage({ deviceScaleFactor: 1 });
    page.on("pageerror", (error) => results.errors.push(error.message));
    page.on("request", (request) => {
      if (/^https?:/.test(request.url())) results.errors.push(`External request: ${request.url()}`);
    });
    for (const [width, height] of [[1280, 900], [768, 1024], [360, 800]]) {
      await page.setViewportSize({ width, height });
      await page.goto(pathToFileURL(path.join(__dirname, "index.html")).href);
      await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode())));
      const state = await page.evaluate(() => ({
        width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        imagesLoaded: [...document.images].every((img) => img.complete && img.naturalWidth > 0),
        font: getComputedStyle(document.body).fontFamily,
      }));
      assert.ok(state.scrollWidth <= state.width, `Overflow at ${width}`);
      assert.equal(state.imagesLoaded, true);
      results.viewports.push(state);
      await page.screenshot({ path: path.join(out, `checkpoint-${width}.png`), fullPage: true });
      if (width === 1280) {
        await page.locator("#header-desktop").screenshot({ path: path.join(out, "header-desktop.png") });
        await page.locator("#header-mobile").screenshot({ path: path.join(out, "header-mobile.png") });
        await page.locator(".logo-grid").screenshot({ path: path.join(out, "logos.png") });
        await page.locator(".icons-grid").screenshot({ path: path.join(out, "pwa-icons.png") });
        await page.locator("#card-sample").screenshot({ path: path.join(out, "card.png") });
        await page.locator("#primary-sample").hover();
        await page.locator(".button-row").screenshot({ path: path.join(out, "button-hover.png") });
        await page.mouse.move(0, 0);
        await page.locator("#primary-sample").focus();
        const outline = await page.locator("#primary-sample").evaluate((el) => getComputedStyle(el).outlineStyle);
        assert.notEqual(outline, "none");
        await page.locator(".components").screenshot({ path: path.join(out, "button-focus-card.png") });
        await page.locator("#primary-sample").click();
        assert.match(await page.locator("#review-feedback").textContent(), /Nenhuma pesagem/);
        await page.locator('#header-desktop .app-nav button').nth(1).click();
        assert.equal(await page.locator('#header-desktop .app-nav button').nth(1).getAttribute("aria-current"), "page");
        results.interactions = { focusVisible: true, primaryFeedback: true, navigationSelection: true };
      }
    }
  } finally { await browser.close(); }
  for (const [label, fg, bg] of [
    ["primary", "#FFFFFF", "#0B3D2E"], ["primary hover", "#FFFFFF", "#12533D"],
    ["body", "#1F2937", "#F5F7F4"], ["muted", "#58645F", "#F5F7F4"],
    ["green wordmark", "#166534", "#FFFFFF"], ["inverse accent", "#22C55E", "#0B3D2E"],
    ["active badge", "#166534", "#EDF2EE"], ["focus", "#215E85", "#FFFFFF"],
  ]) {
    const a = luminance(fg), b = luminance(bg);
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    assert.ok(ratio >= 4.5, `${label}: ${ratio}`);
    results.contrasts.push({ label, ratio: Number(ratio.toFixed(2)), pass: true });
  }
  for (const [name, size] of [["icon-180.png",180],["icon-192.png",192],["icon-512.png",512],["icon-maskable-512.png",512],["favicon-32.png",32]]) {
    const meta = await sharp(path.join(__dirname, "assets", name)).metadata();
    assert.equal(meta.width, size); assert.equal(meta.height, size);
    results.assets.push({ name, width: meta.width, height: meta.height });
  }
  const { data, info } = await sharp(path.join(__dirname, "assets/icon-maskable-512.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let pixelsOutsideSafeCircle = 0, symbolPixels = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4;
    assert.equal(data[i+3], 255);
    if (Math.abs(data[i]-11) + Math.abs(data[i+1]-61) + Math.abs(data[i+2]-46) > 12) {
      symbolPixels++;
      if (Math.hypot(x + 0.5 - 256, y + 0.5 - 256) > 204.8) pixelsOutsideSafeCircle++;
    }
  }
  assert.ok(symbolPixels > 10000);
  assert.equal(pixelsOutsideSafeCircle, 0);
  results.maskable = { symbolPixels, pixelsOutsideSafeCircle, opaque: true };
  assert.deepEqual(results.errors, []);
  fs.writeFileSync(path.join(__dirname, "qa-results.json"), JSON.stringify(results, null, 2) + "\n");
  console.log(JSON.stringify(results, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
