const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { createServer } = require("./serve.cjs");
const out = path.join(__dirname, "../docs/qa-sprint-010/routes");
const evidence = { checks: [], viewports: [], errors: [], android: "pendente" };
async function until(check) {
  const end = Date.now() + 30000;
  while (Date.now() < end) { if (await check()) return; await new Promise((r) => setTimeout(r, 50)); }
  throw new Error("Timeout");
}
async function ready(page) { await page.waitForSelector("#save-status.saved"); }
async function events(page) { return page.evaluate(async () => {
  const d = LocalDatabase.createLocalDatabase(); const rows = await d.getAll("animal-events"); d.close(); return rows;
}); }
async function health(page, id) {
  await page.click("#property-tab"); await page.locator(`[data-property-id="${id}"]`).getByRole("button", { name: "Abrir propriedade" }).click();
  await page.click('[data-property-section="health"]'); await until(async () => /registro\(s\)/.test(await page.textContent("#health-feedback")));
}
async function form(page) {
  await page.click("#new-health"); await page.waitForSelector("#health-route");
  await page.selectOption("#health-healthType", "vaccination"); await page.fill("#health-productName", "Produto informado");
  assert.equal(await page.inputValue("#health-route"), "");
}
async function save(page) { await page.locator('#health-form button[type="submit"]').click(); await page.waitForSelector("#health-dialog:not([open])", { state: "attached" }); }
async function main() {
  fs.mkdirSync(out, { recursive: true }); let baseline = true;
  const server = createServer({ baseline: () => baseline, baselineRef: "78e937d", scope: "app/" });
  await new Promise((r) => server.listen(0, "127.0.0.1", r)); const url = `http://127.0.0.1:${server.address().port}/app/`;
  const executablePath = process.env.QA_BROWSER_PATH || ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe"].find(fs.existsSync);
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true }); evidence.browser = browser.version();
  try {
    const context = await browser.newContext(); context.on("page", (p) => p.on("pageerror", (e) => evidence.errors.push(e.message)));
    let page = await context.newPage(); await page.goto(url); await ready(page); await page.evaluate(() => navigator.serviceWorker.ready); await page.reload(); await ready(page);
    const seed = await page.evaluate(async () => {
      const d = LocalDatabase.createLocalDatabase(); const options = { database: d }; const account = (await d.getAll("accounts"))[0];
      const property = (await PropertyRepository.createPropertyRepository(options).createProperty(account.id, { name: "Vias QA" })).property;
      const animal = (await AnimalRepository.createAnimalRepository(options).create(account.id, property.id, { name: "Animal QA" })).animal;
      const result = await HealthRepository.createHealthRepository(options).register(account.id, property.id, [animal.id],
        { healthType: "vaccination", occurredAt: new Date().toISOString(), productName: "Produto antigo", route: "Texto livre antigo SC" });
      if (result.status !== "saved") throw new Error("Legacy fixture failed");
      d.close(); return { propertyId: property.id, oldEvent: result.events[0] };
    });
    const before = await events(page); baseline = false; await page.evaluate(async () => (await navigator.serviceWorker.ready).update());
    await until(() => page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration()).waiting)));
    const observer = await context.newPage(); await observer.goto(new URL("/qa-observer", url).href); await page.close();
    await until(() => observer.evaluate(async () => { const keys = await caches.keys(); return keys.includes("plataforma-pecuaria-shell-v8.1") && !keys.includes("plataforma-pecuaria-shell-v8"); }));
    page = await context.newPage(); await page.goto(url); await ready(page); await observer.close();
    assert.deepEqual(await events(page), before); await health(page, seed.propertyId);
    assert.match(await page.textContent("#health-list"), /Texto livre antigo SC/);
    await form(page); assert.equal(await page.locator("#health-route").evaluate((n) => n.tagName), "SELECT");
    assert.equal(await page.locator("#health-route option").count(), 13); assert.equal(await page.isVisible("#health-routeOther"), false);
    await page.selectOption("#health-route", "other"); await page.fill("#health-routeOther", "Texto a descartar");
    await page.selectOption("#health-route", "intramuscular"); assert.equal(await page.inputValue("#health-routeOther"), "");
    assert.equal(await page.isVisible("#health-routeOther"), false); await save(page);
    let rows = await events(page); assert.equal(rows.find((e) => e.type === "health" && e.id !== seed.oldEvent.id).route, "intramuscular");
    assert.deepEqual(rows.find((e) => e.id === seed.oldEvent.id), seed.oldEvent);
    await until(async () => (await page.textContent("#health-list")).includes("Intramuscular (IM)"));
    await page.locator("#health-list article").filter({ hasText: "Intramuscular (IM)" }).getByRole("button", { name: "Ver ficha" }).click();
    await page.waitForSelector("#animal-timeline"); assert.match(await page.textContent("#animal-timeline"), /Intramuscular \(IM\)/);
    assert.match(await page.textContent("#animal-timeline"), /Texto livre antigo SC/); await page.click("#close-animal-detail");
    evidence.checks.push("Upgrade v8 -> v8.1 e leitura nao alteram eventos antigos; enum, limpeza de complemento, codigo e rotulo na lista/timeline corretos");
    await context.setOffline(true); await new Promise((r) => server.close(r)); await page.close();
    page = await context.newPage(); await page.goto(url); await ready(page); await health(page, seed.propertyId); await form(page);
    await page.selectOption("#health-route", "other"); await page.fill("#health-routeOther", "Via personalizada <b>literal</b>");
    for (const [width, height] of [[360, 800], [1280, 900]]) {
      await page.setViewportSize({ width, height }); await page.locator("#health-routeOther").scrollIntoViewIfNeeded();
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth); assert.ok(scrollWidth <= width);
      evidence.viewports.push({ width, height, scrollWidth }); await page.screenshot({ path: path.join(out, `${width}-route.png`) });
    }
    await save(page); rows = await events(page); const custom = rows.find((e) => e.route === "other");
    assert.equal(custom.routeOther, "Via personalizada <b>literal</b>");
    await page.close(); page = await context.newPage(); await page.goto(url); await ready(page); await health(page, seed.propertyId);
    assert.match(await page.textContent("#health-list"), /Outra: Via personalizada <b>literal<\/b>/); assert.equal(await page.locator("#health-list b").count(), 0);
    assert.deepEqual((await events(page)).find((e) => e.id === seed.oldEvent.id), seed.oldEvent);
    assert.equal(await page.evaluate(() => LocalDatabase.DB_VERSION), 5);
    evidence.checks.push("Offline sem servidor: Outra + complemento salva e persiste ao reabrir; DOM seguro; legado intacto e DB5");
    assert.deepEqual(evidence.errors, []); console.log(JSON.stringify(evidence, null, 2));
  } finally {
    fs.writeFileSync(path.join(out, "evidence.json"), JSON.stringify(evidence, null, 2) + "\n");
    await browser.close(); if (server.listening) await new Promise((r) => server.close(r));
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
