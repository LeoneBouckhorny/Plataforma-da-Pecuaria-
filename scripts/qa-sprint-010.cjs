const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { createServer } = require("./serve.cjs");
const out = path.join(__dirname, "../docs/qa-sprint-010");
const evidence = { startedAt: new Date().toISOString(), checks: [], viewports: [], errors: [], limitations: ["Android fisico pendente; reabertura de pagina no mesmo contexto Chromium, sem reinicio do aparelho."] };
function record(name, detail) { evidence.checks.push({ name, passed: true, detail }); console.log(`PASS ${name}`); }
async function until(check, label) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) { if (await check()) return; await new Promise((resolve) => setTimeout(resolve, 50)); }
  throw new Error(`Timeout: ${label}`);
}
async function ready(page) { await page.waitForSelector("#save-status.saved"); }
async function dump(page) {
  return page.evaluate(async () => {
    const d = LocalDatabase.createLocalDatabase(); const db = await d.open(); const result = { version: db.version, stores: {} };
    for (const name of db.objectStoreNames) result.stores[name] = await d.getAll(name);
    d.close(); return result;
  });
}
async function openProperty(page, id, section = "health") {
  await page.click("#property-tab"); await page.locator(`[data-property-id="${id}"]`).getByRole("button", { name: "Abrir propriedade" }).click();
  await page.click(`[data-property-section="${section}"]`);
  if (section === "health") await until(async () => /registro\(s\)/.test(await page.textContent("#health-feedback")), "health loaded");
  else await page.waitForFunction(() => document.querySelector("#herd").dataset.loaded === "true");
}
async function openLot(page, seed) {
  await openProperty(page, seed.propertyId, "herd");
  await page.locator(`[data-record-id="${seed.paddockId}"]`).getByRole("button", { name: "Abrir pasto" }).click();
  await page.locator(`[data-record-id="${seed.lotId}"]`).getByRole("button", { name: "Abrir lote" }).click();
}
async function fillHealth(page, healthType, product = "Produto informado", notes = "") {
  await page.selectOption("#health-healthType", healthType); await page.fill("#health-occurredAt", "2026-09-23T12:00");
  await page.fill("#health-productName", product); await page.fill("#health-doseValue", "2,5"); await page.fill("#health-doseUnit", "mL");
  await page.fill("#health-route", "Via informada"); await page.fill("#health-productBatch", "L-2026"); await page.fill("#health-responsible", "Responsável QA");
  await page.fill("#health-nextDueDate", "2026-10-23"); await page.fill("#health-withdrawalUntil", "2026-10-01"); await page.fill("#health-notes", notes);
}
async function saveHealth(page) {
  await page.locator('#health-form button[type="submit"]').click(); await page.waitForSelector("#health-dialog:not([open])", { state: "attached" });
}
async function overflow(page, name, screenshot = false) {
  const size = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  assert.ok(size.scrollWidth <= size.width, `${name}: ${JSON.stringify(size)}`); evidence.viewports.push({ name, ...size });
  if (screenshot) await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: !(await page.locator("dialog[open]").count()) });
}
async function main() {
  fs.mkdirSync(out, { recursive: true }); let baseline = true;
  const server = createServer({ baseline: () => baseline, baselineRef: "f268996", scope: "app/" });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve)); const url = `http://127.0.0.1:${server.address().port}/app/`;
  const executablePath = process.env.QA_BROWSER_PATH || ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe"].find(fs.existsSync);
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true }); evidence.browser = browser.version();
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    context.on("page", (page) => page.on("pageerror", (error) => evidence.errors.push(error.stack || error.message)));
    let page = await context.newPage(); await page.goto(url); await ready(page); await page.evaluate(() => navigator.serviceWorker.ready); await page.reload(); await ready(page);
    const seed = await page.evaluate(async () => {
      const d = LocalDatabase.createLocalDatabase(); const options = { database: d };
      const account = (await d.getAll("accounts"))[0];
      const properties = PropertyRepository.createPropertyRepository(options);
      const property = (await properties.createProperty(account.id, { name: "Boa Vista" })).property;
      const other = (await properties.createProperty(account.id, { name: "Outra propriedade" })).property;
      const paddock = (await PaddockRepository.createPaddockRepository(options).create(account.id, property.id, { name: "Piquete 01" })).paddock;
      const result = await FastLotRegistrationRepository.createFastLotRegistrationRepository(options).createLotWithAnimals(account.id, property.id,
        { name: "Novilhas A", tagSuffix: "A", paddockId: paddock.id, maleCount: 0, femaleCount: 5, startNumber: 1 });
      if (result.status !== "saved") throw new Error(JSON.stringify(result));
      d.close(); return { accountId: account.id, propertyId: property.id, otherPropertyId: other.id, paddockId: paddock.id, lotId: result.lot.id, animals: result.animals };
    });
    const before = await dump(page); baseline = false; await page.evaluate(async () => (await navigator.serviceWorker.ready).update());
    await until(() => page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration()).waiting)), "waiting v8");
    const observer = await context.newPage(); await observer.goto(new URL("/qa-observer", url).href); await page.close();
    await until(() => observer.evaluate(async () => { const keys = await caches.keys(); const r = (await navigator.serviceWorker.getRegistrations())[0];
      return r && !r.waiting && !r.installing && r.active?.state === "activated" && keys.includes("plataforma-pecuaria-shell-v8") && !keys.includes("plataforma-pecuaria-shell-v7"); }), "v8 active");
    page = await context.newPage(); await page.goto(url); await ready(page); await observer.close();
    assert.deepEqual(await dump(page), before); record("Upgrade v7 -> v8 preserva todas as stores e DB5", { version: before.version });
    await openLot(page, seed); await page.getByRole("button", { name: "Registrar manejo sanitário", exact: true }).click();
    await page.waitForSelector("#health-healthType"); assert.equal(await page.locator(".health-animal-options input").count(), 5);
    await page.locator(`.health-animal-options input[value="${seed.animals[3].id}"]`).uncheck();
    await fillHealth(page, "vaccination", "", "<img src=x onerror=window.__injected=1>");
    await page.locator('#health-form button[type="submit"]').click();
    await page.waitForSelector('#health-productName[aria-invalid="true"]');
    assert.equal((await dump(page)).stores["animal-events"].filter((e) => e.type === "health").length, 0);
    await page.fill("#health-productName", "Vacina informada");
    for (const [width, height] of [[360, 800], [768, 1024], [1280, 900]]) {
      await page.setViewportSize({ width, height }); await overflow(page, `${width}-form`, width === 360);
      await page.locator('#health-form button[type="submit"]').scrollIntoViewIfNeeded(); await overflow(page, `${width}-form-actions`);
    }
    await saveHealth(page);
    let all = (await dump(page)).stores["animal-events"].filter((e) => e.type === "health");
    assert.equal(all.length, 4); assert.equal(new Set(all.map((e) => e.operationId)).size, 1);
    assert.ok(all.every((e) => e.animalId !== seed.animals[3].id && e.lotNameSnapshot === "Novilhas A" && e.paddockNameSnapshot === "Piquete 01"));
    assert.equal(await page.evaluate(() => window.__injected), undefined);
    record("Coletivo 1,2,3,5 exclui4, valida produto e compartilha operationId", { events: all.length, operationId: all[0].operationId });
    await page.locator(`[data-record-id="${seed.animals[3].id}"]`).getByRole("button", { name: "Ver ficha" }).click();
    await page.waitForSelector("#animal-timeline"); assert.equal(await page.locator('#animal-timeline [data-event-type="health"]').count(), 0);
    await page.click("#animal-add-health"); await page.waitForSelector("#health-healthType"); assert.equal(await page.locator(".health-animal-options input").count(), 1);
    await fillHealth(page, "deworming", "Vermífugo informado"); await saveHealth(page);
    await page.waitForSelector('#animal-timeline [data-event-type="health"]');
    assert.match(await page.textContent("#animal-timeline"), /Vermifugação/); assert.match(await page.textContent("#animal-timeline"), /Carência até: 01\/10\/2026/);
    await page.setViewportSize({ width: 768, height: 1024 }); await overflow(page, "768-timeline", true); await page.click("#close-animal-detail");
    await openProperty(page, seed.propertyId); assert.equal(await page.locator("#health-list article").count(), 5);
    await page.click("#new-health"); await page.waitForSelector("#health-healthType");
    await page.selectOption("#health-target-lot", seed.lotId);
    assert.equal(await page.locator(".health-animal-options input:checked").count(), 5);
    for (const check of await page.locator(".health-animal-options input").all()) await check.uncheck();
    assert.equal(await page.locator('#health-form button[type="submit"]').isDisabled(), true);
    await page.locator("#health-form").getByRole("button", { name: "Cancelar", exact: true }).click();
    assert.equal((await dump(page)).stores["animal-events"].filter((e) => e.type === "health").length, 5);
    await page.selectOption("#health-filter-healthType", "vaccination"); assert.equal(await page.locator("#health-list article").count(), 4);
    assert.equal(await page.locator("#health-list img").count(), 0); assert.match(await page.textContent("#health-list"), /<img src=x/);
    await page.selectOption("#health-filter-healthType", ""); await page.selectOption("#health-filter-lotId", seed.lotId);
    await page.fill("#health-filter-from", "2026-09-24"); assert.equal(await page.locator("#health-list article").count(), 0);
    await page.fill("#health-filter-from", "2026-09-23"); await page.fill("#health-filter-to", "2026-09-23"); assert.equal(await page.locator("#health-list article").count(), 5);
    for (const [width, height] of [[360, 800], [768, 1024], [1280, 900]]) {
      await page.setViewportSize({ width, height }); await overflow(page, `${width}-sanidade`, width !== 768);
    }
    await openProperty(page, seed.otherPropertyId); assert.equal(await page.locator("#health-list article").count(), 0);
    record("Individual4, timeline, filtros, DOM seguro e isolamento", { propertyHealthEvents: 5 });
    const integrity = await page.evaluate(async (seed) => {
      const d = LocalDatabase.createLocalDatabase(); const options = { database: d };
      await LotRepository.createLotRepository(options).update(seed.accountId, seed.propertyId, seed.lotId, { name: "Lote renomeado" });
      await PaddockRepository.createPaddockRepository(options).update(seed.accountId, seed.propertyId, seed.paddockId, { name: "Pasto renomeado" });
      const result = await FastLotRegistrationRepository.createFastLotRegistrationRepository(options).createLotWithAnimals(seed.accountId, seed.propertyId,
        { name: "Rollback QA", tagSuffix: "Q", maleCount: 30, femaleCount: 0, startNumber: 1 });
      if (result.status !== "saved") throw new Error("Fixture failed");
      const before = await d.getAll("animal-events"); const write = d.writeTransaction.bind(d);
      d.writeTransaction = (names, operation) => write(names, (helpers) => {
        let count = 0; return operation({ ...helpers, store: (name) => {
          const original = helpers.store(name);
          return name === "animal-events" ? new Proxy(original, { get: (target, key) => key === "add" ? (...args) => {
            if (++count === 18) throw new Error("Injected eighteenth write"); return target.add(...args);
          } : typeof target[key] === "function" ? target[key].bind(target) : target[key] }) : original;
        } });
      });
      const failed = await HealthRepository.createHealthRepository(options).register(seed.accountId, seed.propertyId, result.animals.map((a) => a.id),
        { healthType: "other", occurredAt: new Date().toISOString(), notes: "Rollback" });
      d.writeTransaction = write; const after = await d.getAll("animal-events"); d.close();
      return { status: failed.status, identical: JSON.stringify(before) === JSON.stringify(after), health: after.filter((e) => e.type === "health") };
    }, seed);
    assert.equal(integrity.status, "failed"); assert.equal(integrity.identical, true);
    assert.ok(integrity.health.every((e) => e.lotNameSnapshot === "Novilhas A" && e.paddockNameSnapshot === "Piquete 01"));
    record("Snapshots imutaveis e rollback real no evento18/30", { status: integrity.status, identical: integrity.identical });
    await context.setOffline(true); await new Promise((resolve) => server.close(resolve)); await page.close();
    page = await context.newPage(); await page.goto(url); await ready(page); await openLot(page, seed);
    await page.getByRole("button", { name: "Registrar manejo sanitário", exact: true }).click(); await page.waitForSelector("#health-healthType");
    await page.locator(`.health-animal-options input[value="${seed.animals[3].id}"]`).uncheck(); await fillHealth(page, "medication", "Medicamento informado"); await saveHealth(page);
    await page.locator(`[data-record-id="${seed.animals[3].id}"]`).getByRole("button", { name: "Ver ficha" }).click(); await page.waitForSelector("#animal-add-health");
    await page.click("#animal-add-health"); await page.waitForSelector("#health-healthType"); await fillHealth(page, "other", "", "Manejo manual informado"); await saveHealth(page);
    await until(async () => (await page.locator('#animal-timeline [data-event-type="health"]').count()) === 2, "offline timeline");
    await page.close(); page = await context.newPage(); await page.goto(url); await ready(page); await openProperty(page, seed.propertyId);
    assert.equal(await page.locator("#health-list article").count(), 10);
    await page.locator("#health-list article").filter({ hasText: "Manejo manual informado" }).getByRole("button", { name: "Ver ficha" }).click();
    await page.waitForSelector("#animal-add-health"); assert.equal(await page.locator('#animal-timeline [data-event-type="health"]').count(), 2);
    await page.click("#animal-change-status"); await until(async () => (await page.locator("#animal-add-health").count()) === 0, "archived");
    assert.equal(await page.locator('#animal-timeline [data-event-type="health"]').count(), 2); await page.click("#close-animal-detail");
    await openLot(page, seed); await page.getByRole("button", { name: "Registrar manejo sanitário", exact: true }).click(); await page.waitForSelector("#health-healthType");
    assert.equal(await page.locator(".health-animal-options input").count(), 4);
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    const final = await dump(page); assert.equal(final.version, 5);
    record("Offline sem servidor: coletivo, individual, reabrir, consultar e arquivado", { healthEvents: final.stores["animal-events"].filter((e) => e.type === "health").length, archivedHistory: 2 });
    assert.deepEqual(evidence.errors, []);
  } finally {
    fs.writeFileSync(path.join(out, "evidence.json"), JSON.stringify(evidence, null, 2) + "\n");
    await browser.close(); if (server.listening) await new Promise((resolve) => server.close(resolve));
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
