const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { createServer } = require("./serve.cjs");
const out = path.join(__dirname, "../docs/qa-sprint-011");
const evidence = { startedAt: new Date().toISOString(), checks: [], viewports: [], errors: [], limitations: ["Android fisico pendente; reabertura de pagina no mesmo contexto Chromium, sem reinicio do aparelho."] };
function record(name, detail) { evidence.checks.push({ name, passed: true, detail }); console.log(`PASS ${name}`); }
async function until(check, label) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) { if (await check()) return; await new Promise((resolve) => setTimeout(resolve, 50)); }
  throw new Error(`Timeout: ${label}`);
}
async function ready(page) { await page.waitForSelector("#save-status.saved"); }
async function dump(page) { return page.evaluate(async () => {
  const database = LocalDatabase.createLocalDatabase(); const connection = await database.open(); const result = { version: connection.version, stores: {} };
  for (const name of connection.objectStoreNames) result.stores[name] = await database.getAll(name);
  database.close(); return result;
}); }
async function openProperty(page, id, section = "reproduction") {
  await page.click("#property-tab"); await page.locator(`[data-property-id="${id}"]`).getByRole("button", { name: "Abrir propriedade" }).click();
  await page.click(`[data-property-section="${section}"]`);
  if (section === "reproduction") await until(async () => /registro\(s\)/.test(await page.textContent("#reproduction-feedback")), "reproduction loaded");
  else await page.waitForFunction(() => document.querySelector("#herd").dataset.loaded === "true");
}
async function openAnimal(page, seed, animal) {
  await openProperty(page, seed.propertyId, "herd");
  await page.locator(`[data-record-id="${seed.paddockId}"]`).getByRole("button", { name: "Abrir pasto" }).click();
  await page.locator(`[data-record-id="${seed.lotId}"]`).getByRole("button", { name: "Abrir lote" }).click();
  await page.locator(`[data-record-id="${animal.id}"]`).getByRole("button", { name: "Ver ficha" }).click(); await page.waitForSelector("#animal-timeline");
}
async function form(page, animalId, type, occurredAt = "2026-10-07T12:00", fromDetail = false) {
  await page.click(fromDetail ? "#animal-add-reproduction" : "#new-reproduction"); await page.waitForSelector("#reproduction-reproductionType");
  if (!fromDetail) await page.selectOption("#reproduction-animalId", animalId);
  await page.selectOption("#reproduction-reproductionType", type); await page.fill("#reproduction-occurredAt", occurredAt);
}
async function save(page) { await page.locator('#reproduction-form button[type="submit"]').click(); await page.waitForSelector("#reproduction-dialog:not([open])", { state: "attached" }); }
async function cancel(page) { await page.locator("#reproduction-form").getByRole("button", { name: "Cancelar", exact: true }).click(); }
async function overflow(page, name, screenshot = false) {
  const size = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
    dialogs: [...document.querySelectorAll("dialog[open]")].map((dialog) => ({ width: dialog.clientWidth, scrollWidth: dialog.scrollWidth })) }));
  assert.ok(size.scrollWidth <= size.width, `${name}: ${JSON.stringify(size)}`);
  assert.ok(size.dialogs.every((dialog) => dialog.scrollWidth <= dialog.width), `${name}: dialog overflow`);
  evidence.viewports.push({ name, ...size });
  if (screenshot) await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: false });
}
async function main() {
  fs.mkdirSync(out, { recursive: true }); let baseline = true;
  const server = createServer({ baseline: () => baseline, baselineRef: "1bd9bfe", scope: "app/" });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve)); const url = `http://127.0.0.1:${server.address().port}/app/`;
  const executablePath = process.env.QA_BROWSER_PATH || ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe"].find(fs.existsSync);
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true }); evidence.browser = browser.version();
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: "America/Sao_Paulo" });
    context.on("page", (page) => page.on("pageerror", (error) => evidence.errors.push(error.stack || error.message)));
    let page = await context.newPage(); await page.goto(url); await ready(page); await page.evaluate(() => navigator.serviceWorker.ready); await page.reload(); await ready(page);
    const seed = await page.evaluate(async () => {
      const database = LocalDatabase.createLocalDatabase(); const options = { database }; const account = (await database.getAll("accounts"))[0];
      const properties = PropertyRepository.createPropertyRepository(options);
      const property = (await properties.createProperty(account.id, { name: "Boa Vista" })).property;
      const other = (await properties.createProperty(account.id, { name: "Outra propriedade" })).property;
      const paddock = (await PaddockRepository.createPaddockRepository(options).create(account.id, property.id, { name: "Piquete 01" })).paddock;
      const lot = (await LotRepository.createLotRepository(options).create(account.id, property.id, { name: "Matrizes A", tagSuffix: "A", paddockId: paddock.id })).lot;
      const animals = AnimalRepository.createAnimalRepository(options); const created = [];
      for (const [tagNumber, sex, name] of [[23, "female", "Matriz principal"], [24, "female", "Matriz cobertura"], [25, "male", "Touro original"], [26, "unknown", "Sexo a confirmar"], [27, "female", "Matriz arquivada"], [28, "male", "Touro arquivado"]]) {
        const result = await animals.create(account.id, property.id, { tagNumber, sex, name, lotId: lot.id });
        if (result.status !== "saved") throw new Error(JSON.stringify(result)); created.push(result.animal);
      }
      await animals.archive(account.id, property.id, created[4].id); await animals.archive(account.id, property.id, created[5].id);
      await HealthRepository.createHealthRepository(options).register(account.id, property.id, [created[0].id], { healthType: "vaccination", occurredAt: "2026-07-01T12:00:00Z", productName: "Produto legado", route: "intramuscular" });
      database.close(); return { accountId: account.id, propertyId: property.id, otherPropertyId: other.id, paddockId: paddock.id, lotId: lot.id, animals: created };
    });
    const before = await dump(page); baseline = false; await page.evaluate(async () => (await navigator.serviceWorker.ready).update());
    await until(() => page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration()).waiting)), "waiting v9");
    const observer = await context.newPage(); await observer.goto(new URL("/qa-observer", url).href); await page.close();
    await until(() => observer.evaluate(async () => { const keys = await caches.keys(); const registration = (await navigator.serviceWorker.getRegistrations())[0];
      return registration?.active?.state === "activated" && !registration.waiting && keys.includes("plataforma-pecuaria-shell-v9") && !keys.includes("plataforma-pecuaria-shell-v8.1"); }), "v9 active");
    page = await context.newPage(); await page.goto(url); await ready(page); await observer.close();
    assert.deepEqual(await dump(page), before); assert.equal(before.version, 5);
    record("Upgrade real v8.1 -> v9 preserva todas as stores e DB5", { stores: Object.keys(before.stores) });
    await openAnimal(page, seed, seed.animals[0]); assert.match(await page.textContent("#animal-reproduction-summary"), /Sem registro/);
    await form(page, seed.animals[0].id, "estrus", "2026-08-15T12:00", true);
    await page.fill("#reproduction-notes", '<img src=x onerror="alert(1)"> Cio observado'); await save(page);
    await until(async () => await page.locator('#animal-timeline [data-event-type="reproduction"]').count() === 1, "immediate timeline");
    assert.equal(await page.locator("#animal-timeline img").count(), 0);
    await form(page, seed.animals[0].id, "artificial_insemination", "2026-09-01T12:00", true);
    await page.fill("#reproduction-externalSire", "Touro X"); await page.fill("#reproduction-semenBatch", "ABC123"); await page.fill("#reproduction-technician", "Técnico QA"); await save(page);
    await form(page, seed.animals[0].id, "pregnancy_diagnosis", "2026-09-20T12:00", true);
    await page.locator('#reproduction-form button[type="submit"]').click(); await page.waitForSelector('#reproduction-result[aria-invalid="true"]');
    await page.selectOption("#reproduction-result", "pregnant"); await save(page);
    await form(page, seed.animals[0].id, "calving", "2026-10-07T12:00", true);
    await page.fill("#reproduction-calfCount", "1"); await page.fill("#reproduction-femaleCalves", "2");
    await page.locator('#reproduction-form button[type="submit"]').click(); await page.waitForSelector('#reproduction-calfCount[aria-invalid="true"]');
    await page.fill("#reproduction-femaleCalves", "1"); await save(page);
    await until(async () => await page.locator('#animal-timeline [data-event-type="reproduction"]').count() === 4, "four events");
    assert.deepEqual(await page.locator('#animal-timeline [data-event-type="reproduction"] h4').allTextContents(), ["Parto", "Diagnóstico de gestação", "Inseminação artificial", "Cio"]);
    assert.match(await page.textContent("#animal-reproduction-summary"), /Prenhe/); await page.click("#close-animal-detail");
    record("Ficha: cio, inseminacao, diagnostico estruturado, parto e timeline imediata", { order: ["calving", "pregnancy_diagnosis", "artificial_insemination", "estrus"], validation: ["diagnostico vazio", "contagens incoerentes"], safeDOM: true });
    await openProperty(page, seed.propertyId); await form(page, seed.animals[1].id, "natural_service");
    assert.deepEqual(await page.locator("#reproduction-sireAnimalId option").evaluateAll((options) => options.map((option) => option.value).filter(Boolean)), [seed.animals[2].id]);
    const matrixOptions = await page.locator("#reproduction-animalId option").evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
    assert.deepEqual(matrixOptions.sort(), seed.animals.slice(0, 4).filter((animal) => animal.sex !== "male").map((animal) => animal.id).sort());
    await page.selectOption("#reproduction-sireAnimalId", seed.animals[2].id); assert.equal(await page.isVisible("#reproduction-externalSire"), false); await save(page);
    const original = (await dump(page)).stores["animal-events"].find((event) => event.reproductionType === "natural_service");
    await page.evaluate(async (seed) => {
      const database = LocalDatabase.createLocalDatabase(); const result = await AnimalRepository.createAnimalRepository({ database }).update(seed.accountId, seed.propertyId, seed.animals[2].id, { name: "Touro renomeado" });
      if (result.status !== "saved") throw new Error("Rename failed"); database.close();
    }, seed);
    assert.deepEqual((await dump(page)).stores["animal-events"].find((event) => event.id === original.id), original); assert.equal(original.sireNameSnapshot, "Touro original");
    await openProperty(page, seed.propertyId); assert.match(await page.textContent("#reproduction-list"), /Touro original/);
    await page.selectOption("#reproduction-filter-reproductionType", "pregnancy_diagnosis"); await page.selectOption("#reproduction-filter-result", "pregnant");
    await page.selectOption("#reproduction-filter-lotId", seed.lotId); await page.fill("#reproduction-filter-from", "2026-09-20"); await page.fill("#reproduction-filter-to", "2026-09-20");
    assert.equal(await page.locator("#reproduction-list article").count(), 1);
    await page.selectOption("#reproduction-filter-result", "not_pregnant"); assert.equal(await page.locator("#reproduction-list article").count(), 0);
    await openProperty(page, seed.otherPropertyId); assert.equal(await page.locator("#reproduction-list article").count(), 0);
    record("Reprodutor explicito, snapshots apos renomear, arquivados fora das opcoes, filtros e isolamento", { sire: original.sireAnimalId, snapshot: original.sireNameSnapshot });
    await openAnimal(page, seed, seed.animals[2]); await page.click("#animal-add-reproduction");
    await page.waitForSelector("#reproduction-dialog[open]"); await until(async () => (await page.textContent("#reproduction-form")).includes("Machos não podem"), "male blocked");
    assert.equal(await page.locator('#reproduction-form button[type="submit"]').count(), 0);
    await page.locator("#reproduction-form").getByRole("button", { name: "Fechar", exact: true }).click(); await page.click("#close-animal-detail");
    const maleResult = await page.evaluate(async (seed) => { const database = LocalDatabase.createLocalDatabase();
      const result = await ReproductionRepository.createReproductionRepository({ database }).register(seed.accountId, seed.propertyId, seed.animals[2].id, { reproductionType: "pregnancy_diagnosis", result: "pregnant", occurredAt: new Date().toISOString() }); database.close(); return result.status;
    }, seed); assert.equal(maleResult, "invalid");
    await openProperty(page, seed.propertyId); await form(page, seed.animals[3].id, "pregnancy_diagnosis");
    assert.match(await page.textContent("#reproduction-sex-warning"), /Sexo não informado/); await page.selectOption("#reproduction-result", "inconclusive"); await save(page);
    assert.equal((await dump(page)).stores.animals.find((animal) => animal.id === seed.animals[3].id).sex, "unknown");
    record("Macho bloqueado na UI e repository; unknown permitido com aviso sem alterar sexo");
    for (const [width, height] of [[360, 800], [768, 1024], [1280, 900]]) {
      await page.setViewportSize({ width, height }); await openProperty(page, seed.propertyId);
      await page.locator('[data-property-section="reproduction"]').hover();
      await until(async () => await page.locator('[data-property-section="reproduction"]').evaluate((node) => getComputedStyle(node).backgroundColor) === "rgb(18, 83, 61)", "active tab hover transition");
      await overflow(page, `${width}-property`, width === 1280);
      for (const type of ["pregnancy_diagnosis", "calving", "natural_service"]) {
        await form(page, seed.animals[0].id, type);
        if (type === "pregnancy_diagnosis") await page.selectOption("#reproduction-result", "pregnant");
        if (type === "calving") { await page.fill("#reproduction-calfCount", "1"); await page.fill("#reproduction-femaleCalves", "1"); }
        if (type === "natural_service") await page.selectOption("#reproduction-sireAnimalId", seed.animals[2].id);
        await overflow(page, `${width}-${type}`, (width === 360 && type === "calving") || (width === 768 && type === "natural_service"));
        await page.locator('#reproduction-form button[type="submit"]').scrollIntoViewIfNeeded(); await overflow(page, `${width}-${type}-actions`); await cancel(page);
      }
      await openAnimal(page, seed, seed.animals[0]); await overflow(page, `${width}-detail`);
      await page.locator('#animal-timeline [data-event-type="reproduction"]').first().scrollIntoViewIfNeeded(); await overflow(page, `${width}-timeline`, width === 360); await page.click("#close-animal-detail");
    }
    record("UI 360x800 / 768x1024 / 1280x900 sem overflow global ou em dialogos");
    const integrity = await page.evaluate(async (seed) => {
      const database = LocalDatabase.createLocalDatabase(); const before = await database.getAll("animal-events");
      const write = database.writeTransaction.bind(database);
      database.writeTransaction = (names, action) => write(names, (helpers) => action({ ...helpers, store: (name) => {
        const store = helpers.store(name); return name === "animal-events" ? new Proxy(store, { get(target, key) {
          if (key === "add") return () => { throw new Error("Injected failure"); }; const value = Reflect.get(target, key); return typeof value === "function" ? value.bind(target) : value;
        } }) : store;
      } }));
      const result = await ReproductionRepository.createReproductionRepository({ database }).register(seed.accountId, seed.propertyId, seed.animals[0].id, { reproductionType: "estrus", occurredAt: new Date().toISOString() });
      const after = await database.getAll("animal-events"); database.close(); return { status: result.status, unchanged: JSON.stringify(before) === JSON.stringify(after) };
    }, seed); assert.deepEqual(integrity, { status: "failed", unchanged: true }); record("Falha de escrita real IndexedDB sem alteracao parcial", integrity);
    const offlineBefore = await dump(page); await context.setOffline(true); await new Promise((resolve) => server.close(resolve)); await page.close();
    page = await context.newPage(); await page.goto(url); await ready(page); await openProperty(page, seed.propertyId);
    for (const type of ["estrus", "natural_service", "artificial_insemination", "pregnancy_diagnosis", "calving"]) {
      await form(page, seed.animals[0].id, type);
      if (["natural_service", "artificial_insemination"].includes(type)) await page.fill("#reproduction-externalSire", "Doador externo offline");
      if (type === "pregnancy_diagnosis") await page.selectOption("#reproduction-result", "not_pregnant");
      if (type === "calving") { await page.fill("#reproduction-calfCount", "1"); await page.fill("#reproduction-maleCalves", "1"); }
      await save(page);
    }
    await page.close(); page = await context.newPage(); await page.goto(url); await ready(page); await openProperty(page, seed.propertyId);
    assert.equal(await page.locator("#reproduction-list article").count(), 11);
    const final = await dump(page); assert.equal(final.version, 5); assert.deepEqual(final.stores.animals, offlineBefore.stores.animals);
    for (const old of before.stores["animal-events"]) assert.deepEqual(final.stores["animal-events"].find((event) => event.id === old.id), old);
    await openAnimal(page, seed, seed.animals[0]); assert.equal(await page.locator('#animal-timeline [data-event-type="reproduction"]').count(), 9);
    await page.click("#animal-change-status"); await until(async () => await page.locator("#animal-add-reproduction").count() === 0, "archived matrix");
    assert.equal(await page.locator('#animal-timeline [data-event-type="reproduction"]').count(), 9);
    await page.click("#close-animal-detail");
    record("Offline sem servidor: reabrir, registrar cinco tipos, reabrir e consultar; arquivamento preserva historico", { events: 11, matrixTimeline: 9, animalsUnchangedByReproduction: true, legacyPreserved: true });
    assert.deepEqual(evidence.errors, []); evidence.completedAt = new Date().toISOString(); evidence.passed = true;
    console.log(JSON.stringify(evidence, null, 2));
  } finally {
    fs.writeFileSync(path.join(out, "evidence.json"), JSON.stringify(evidence, null, 2) + "\n");
    await browser.close(); if (server.listening) await new Promise((resolve) => server.close(resolve));
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
