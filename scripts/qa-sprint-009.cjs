const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { createServer } = require("./serve.cjs");
const out = path.join(__dirname, "../docs/qa-sprint-009");
const evidence = { startedAt: new Date().toISOString(), checks: [], viewports: [], errors: [], limitations: ["Android fisico nao executado; Chromium headless com viewports emulados."] };
const record = (name, detail) => { evidence.checks.push({ name, passed: true, detail }); console.log(`PASS ${name}`); };
async function until(check, label) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) { if (await check()) return; await new Promise((r) => setTimeout(r, 50)); }
  throw new Error(`Timeout: ${label}`);
}
async function ready(page) { await page.waitForSelector("#save-status.saved"); }
async function dump(page) { return page.evaluate(async () => {
  const d = LocalDatabase.createLocalDatabase(); const db = await d.open(); const data = { version: db.version, stores: {} };
  for (const name of db.objectStoreNames) data.stores[name] = await d.getAll(name);
  d.close(); return data;
}); }
async function property(page, name) {
  await page.click("#property-tab"); await page.click("#new-property"); await page.fill("#property-form-name", name);
  await page.click("#save-property"); await page.waitForSelector("#property-form.hidden", { state: "attached" });
  return page.locator(".property-card").filter({ hasText: name }).getAttribute("data-property-id");
}
async function herd(page, id) {
  await page.click("#property-tab"); await page.locator(`[data-property-id="${id}"]`).getByRole("button", { name: "Abrir propriedade" }).click();
  await page.click('[data-property-section="herd"]');
  await page.waitForFunction(() => document.querySelector("#herd").dataset.loaded === "true");
}
async function root(page) { if (await page.locator(".herd-context-nav").count()) await page.locator(".herd-context-nav").getByRole("button", { name: "Rebanho", exact: true }).click(); }
const card = (page, id) => page.locator(`[data-record-id="${id}"]`);
async function openPaddock(page, id) { await root(page); await card(page, id).getByRole("button", { name: "Abrir pasto" }).click(); }
async function openLot(page, lot) {
  if (lot.paddockId) await openPaddock(page, lot.paddockId);
  else { await root(page); await page.getByRole("button", { name: /^Lotes sem pasto/ }).click(); }
  await card(page, lot.id).getByRole("button", { name: "Abrir lote" }).click();
}
async function choose(page, key, values) {
  const group = page.getByRole("group", { name: key === "categories" ? "Categorias" : "Raças", exact: true });
  await group.locator("summary").click();
  for (const value of values) {
    const check = group.getByRole("checkbox", { name: value, exact: true });
    if (await check.count()) await check.check();
    else { await page.fill(`#herd-custom-${key}`, value); await group.getByRole("button", { name: "Adicionar" }).click(); }
  }
  await group.locator("summary").click();
}
async function fields(page, data) {
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) { await choose(page, key, value); continue; }
    const input = page.locator(`#herd-field-${key}`);
    if (await input.evaluate((n) => n.tagName) === "SELECT") await input.selectOption(value);
    else await input.fill(String(value));
  }
}
async function saved(page) {
  await page.waitForSelector("#herd-dialog:not([open])", { state: "attached" });
  await page.waitForFunction(() => document.querySelector("#herd-feedback").textContent.includes("Registro salvo"));
}
async function save(page) { await page.locator('#herd-form button[type="submit"]').click(); await saved(page); }
async function create(page, kind, data, pid) {
  await root(page); await page.click(`#new-${kind}-record`); await fields(page, data); await save(page);
  return (await dump(page)).stores[`${kind}s`].find((v) => v.propertyId === pid && v.name === data.name);
}
async function fastForm(page, data, counts) {
  await root(page); await page.click("#new-lot-record");
  assert.equal(await page.isChecked("#herd-fast-enabled"), false); assert.equal(await page.locator("#herd-fast-fields").isVisible(), false);
  await fields(page, data); await page.check("#herd-fast-enabled"); await fields(page, counts);
}
async function fastSave(page) {
  await page.locator('#herd-form button[type="submit"]').click(); await page.waitForSelector("#fast-lot-confirm[open]");
  const start = performance.now(); await page.locator('#fast-lot-confirm button[value="confirm"]').click(); await saved(page);
  return Math.round(performance.now() - start);
}
async function ficha(page, id) { await card(page, id).getByRole("button", { name: "Ver ficha" }).click(); await page.waitForSelector("#animal-timeline"); }
async function closeFicha(page) { await page.click("#close-animal-detail"); }
async function moveAnimal(page, id, destination) {
  await ficha(page, id); await page.click("#animal-change-lot"); await page.selectOption("#animal-event-lotId", destination || "");
  await page.locator('#animal-detail-form button[type="submit"]').click();
  await page.waitForSelector("#animal-detail-form.hidden", { state: "attached" }); await closeFicha(page);
  await page.waitForFunction(() => document.querySelector("#herd").dataset.loaded === "true");
}
async function moveLot(page, lot, destination) {
  await openLot(page, lot); await card(page, lot.id).getByRole("button", { name: "Alterar pasto" }).click();
  await fields(page, { paddockId: destination || "" }); await save(page); lot.paddockId = destination || null;
}
async function shot(page, name) {
  const size = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  assert.ok(size.scrollWidth <= size.width, `${name}: ${JSON.stringify(size)}`); evidence.viewports.push({ name, ...size });
  await page.screenshot({ path: path.join(out, name + ".png"), fullPage: !(await page.locator("dialog[open]").count()) });
}
async function main() {
  fs.mkdirSync(out, { recursive: true }); let baseline = true;
  const server = createServer({ baseline: () => baseline, baselineRef: "4e55c2d", scope: "app/" });
  await new Promise((r) => server.listen(0, "127.0.0.1", r)); const url = `http://127.0.0.1:${server.address().port}/app/`;
  const executablePath = process.env.QA_BROWSER_PATH || ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe"].find(fs.existsSync);
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true }); evidence.browser = browser.version();
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    context.on("page", (p) => p.on("pageerror", (error) => evidence.errors.push(error.stack || error.message)));
    let page = await context.newPage(); await page.goto(url); await ready(page); await page.evaluate(() => navigator.serviceWorker.ready); await page.reload(); await ready(page);
    const boa = await property(page, "Boa Vista"); const sao = await property(page, "São Romão"); await herd(page, boa);
    const p1 = await create(page, "paddock", { name: "Piquete 01", areaHectares: "12,5" }, boa);
    const p2 = await create(page, "paddock", { name: "Piquete 02" }, boa);
    const a = await create(page, "lot", { name: "Novilhas A", tagSuffix: "A", category: "Novilhas", paddockId: p1.id }, boa);
    const b = await create(page, "lot", { name: "Garrotes B", tagSuffix: "B", paddockId: p1.id }, boa);
    const old = await create(page, "animal", { name: "Original", tagNumber: "23", lotId: a.id }, boa);
    const alone = await create(page, "animal", { name: "Sem lote" }, boa);
    await page.click("#calculator-tab"); await page.selectOption("#property-select", sao); await page.fill("#weighing-name", "Draft São Romão");
    await page.click("#add-animal"); await page.locator('[data-field="weight"]').first().fill("450"); await page.waitForTimeout(750);
    const before = await dump(page);
    baseline = false; await page.evaluate(async () => (await navigator.serviceWorker.ready).update());
    await until(() => page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration()).waiting)), "waiting");
    const observer = await context.newPage(); await observer.goto(new URL("/qa-observer", url).href); await page.close();
    await until(() => observer.evaluate(async () => { const r = (await navigator.serviceWorker.getRegistrations())[0]; const keys = await caches.keys();
      return r && !r.waiting && !r.installing && r.active?.state === "activated" && keys.includes("plataforma-pecuaria-shell-v7") && !keys.includes("plataforma-pecuaria-shell-v6"); }), "v7 activated");
    page = await context.newPage(); await page.goto(url); await ready(page); await observer.close();
    assert.deepEqual(await dump(page), before); record("Upgrade v6 -> v7 sem migration, todas as stores identicas", { version: before.version });
    await herd(page, boa); assert.equal(await page.locator("#herd-lots").count(), 0);
    await openPaddock(page, p1.id); assert.equal(await page.locator("#herd-lots .herd-card").count(), 2);
    await page.fill("#herd-search", "0023A"); assert.equal(await page.locator("#herd-search-results .herd-card").count(), 1);
    await page.fill("#herd-search", "inexistente"); assert.equal(await page.locator("#herd-search-results .herd-card").count(), 0);
    await page.fill("#herd-search", "");
    await card(page, a.id).getByRole("button", { name: "Abrir lote" }).click(); assert.match(await card(page, a.id).textContent(), /Categorias: Novilhas/);
    assert.equal(await page.locator("#herd-animals .herd-card").count(), 1); await ficha(page, old.id); await closeFicha(page);
    await root(page); await page.getByRole("button", { name: /^Animais sem lote/ }).click(); assert.equal(await card(page, alone.id).count(), 1);
    await herd(page, sao); assert.equal(await page.locator("#herd-paddocks .herd-card").count(), 0);
    await page.click("#calculator-tab"); assert.equal(await page.inputValue("#property-select"), sao); assert.deepEqual((await dump(page)).stores.drafts, before.stores.drafts);
    await herd(page, boa); record("QA A hierarquia, legado, sem lote, isolamento e draft", { category: "Novilhas", breeds: [], draftUnchanged: true });
    const countBefore = (await dump(page)).stores.animals.length;
    const c = await create(page, "lot", { name: "Vacas C", tagSuffix: "C", paddockId: p2.id, categories: ["Vacas"], breeds: ["Caracu"] }, boa);
    assert.equal((await dump(page)).stores.animals.length, countBefore); assert.equal(await page.locator("#herd-animals .herd-card").count(), 0);
    await card(page, c.id).getByRole("button", { name: "Editar", exact: true }).click(); assert.equal(await page.locator("#herd-fast-enabled").count(), 0);
    await fields(page, { name: "Vacas C editado" }); await save(page); assert.equal((await dump(page)).stores.animals.length, countBefore);
    record("QA B normal e edicao sem geracao", { animalsBefore: countBefore, animalsAfter: countBefore });
    await fastForm(page, { name: "Novilhas 2027", tagSuffix: "D", paddockId: p1.id, categories: ["Recria", "Engorda"], breeds: ["Nelore"] }, { maleCount: "10", femaleCount: "15", startNumber: "1" });
    assert.match(await page.textContent("#herd-fast-preview"), /0001D até 0025D/);
    await page.locator('#herd-form button[type="submit"]').click(); await page.locator('#fast-lot-confirm button[value="cancel"]').click();
    assert.equal((await dump(page)).stores.animals.length, countBefore);
    await fastSave(page); let db = await dump(page); const d = db.stores.lots.find((v) => v.name === "Novilhas 2027");
    assert.match(await page.locator("#herd-feedback").getAttribute("class"), /success-inline/);
    const generated = db.stores.animals.filter((v) => v.lotId === d.id);
    assert.equal(generated.length, 25); assert.equal(await page.locator("#herd-animals .herd-card").count(), 25);
    assert.equal(db.stores["animal-events"].filter((v) => generated.some((a) => a.id === v.animalId)).length, 25);
    assert.ok(generated.every((v) => v.category === "" && v.breed === "Nelore" && v.tagOriginLotId === d.id));
    record("QA C rapido opcional, cancelar e criar 25", { tags: generated.map((v) => v.tag), males: generated.filter((v) => v.sex === "male").length });
    await fastForm(page, { name: "Misto", tagSuffix: "E", categories: ["Engorda", "Reprodutoras"], breeds: ["Nelore", "Brahman"] }, { maleCount: "1", femaleCount: "1", startNumber: "1" });
    await fastSave(page); db = await dump(page); const mixed = db.stores.lots.find((v) => v.name === "Misto");
    assert.deepEqual(mixed.categories, ["Engorda", "Reprodutoras"]); assert.deepEqual(mixed.breeds, ["Nelore", "Brahman"]);
    assert.ok(db.stores.animals.filter((v) => v.lotId === mixed.id).every((v) => !v.category && !v.breed));
    await root(page); await page.getByRole("button", { name: /^Lotes sem pasto/ }).click(); assert.equal(await card(page, mixed.id).count(), 1);
    record("QA D/E multiplas categorias e racas sem inferencia; sem pasto", mixed);
    const atomic = await page.evaluate(async ({ boa }) => {
      const database = LocalDatabase.createLocalDatabase(); const accountId = (await database.getAll("accounts"))[0].id;
      const read = async () => ({ lots: await database.getAll("lots"), animals: await database.getAll("animals"), events: await database.getAll("animal-events") });
      await database.put("animals", { id: "qa-legacy-conflict", accountId, propertyId: boa, tag: " 0017f ", name: "", status: "archived" });
      const before = await read(); const data = { name: "Conflict", tagSuffix: "F", maleCount: 10, femaleCount: 15, startNumber: 1 };
      const conflict = await FastLotRegistrationRepository.createFastLotRegistrationRepository({ database }).createLotWithAnimals(accountId, boa, data);
      const after = await read(); const failures = [];
      for (const storeName of ["animals", "animal-events"]) {
        const original = database.writeTransaction.bind(database); let count = 0;
        database.writeTransaction = (names, operation) => original(names, (helpers) => operation({ ...helpers, store: (name) => {
          const target = helpers.store(name);
          return new Proxy(target, { get(object, key) {
            if (key === "add" && name === storeName) return (value) => { if (++count === 10) throw new Error("QA nth write failure"); return target.add(value); };
            const value = object[key]; return typeof value === "function" ? value.bind(object) : value;
          } });
        } }));
        const result = await FastLotRegistrationRepository.createFastLotRegistrationRepository({ database }).createLotWithAnimals(accountId, boa, { ...data, tagSuffix: "G" });
        database.writeTransaction = original; failures.push({ storeName, status: result.status, identical: JSON.stringify(await read()) === JSON.stringify(before) });
      }
      const second = LocalDatabase.createLocalDatabase();
      const results = await Promise.all([database, second].map((db) => FastLotRegistrationRepository.createFastLotRegistrationRepository({ database: db }).createLotWithAnimals(accountId, boa, { ...data, tagSuffix: "H" })));
      const concurrentLot = results.find((v) => v.status === "saved").lot;
      const final = await read(); database.close(); second.close();
      return { conflict: conflict.status, message: conflict.errors?.startNumber, unchanged: JSON.stringify(before) === JSON.stringify(after), failures,
        concurrent: results.map((v) => v.status), animals: final.animals.filter((v) => v.lotId === concurrentLot.id).length,
        events: final.events.filter((v) => v.toLotId === concurrentLot.id).length };
    }, { boa });
    assert.equal(atomic.conflict, "invalid"); assert.match(atomic.message, /0017F/); assert.equal(atomic.unchanged, true);
    assert.ok(atomic.failures.every((v) => v.status === "failed" && v.identical));
    assert.deepEqual(atomic.concurrent.sort(), ["invalid", "saved"]); assert.equal(atomic.animals, 25); assert.equal(atomic.events, 25);
    record("QA F rollback real no decimo animal/evento, conflito legado e concorrencia", atomic);
    await herd(page, boa); await openLot(page, d); const moved = generated.find((v) => v.tag === "0023D");
    await moveAnimal(page, moved.id, b.id); assert.equal(await card(page, moved.id).count(), 0);
    await openLot(page, b); assert.equal(await card(page, moved.id).count(), 1); await ficha(page, moved.id);
    assert.match(await page.textContent("#animal-timeline"), /Novilhas 2027 → Garrotes B/); assert.match(await page.textContent("#animal-detail-title"), /0023D/); await closeFicha(page);
    await moveLot(page, b, p2.id); await openPaddock(page, p1.id); assert.equal(await card(page, b.id).count(), 0);
    await openPaddock(page, p2.id); assert.equal(await card(page, b.id).count(), 1);
    record("QA G movimentos e origem preservados", { tag: moved.tag, lotMovedTo: p2.id });
    await page.click("#calculator-tab"); await page.click("#clear-weighing"); await ready(page);
    await page.selectOption("#property-select", boa); await page.selectOption("#registered-lot", b.id); await page.click("#add-animal");
    await page.locator('[data-field="tag"]').first().fill("0023D"); await page.locator('[data-field="weight"]').first().fill("450");
    assert.equal(await page.locator('[data-field="animalId"]').first().inputValue(), "");
    await page.locator('[data-field="animalId"]').first().selectOption(moved.id);
    await page.click("#finalize-weighing"); await page.click("#confirm-finalize"); await page.waitForSelector("#finalize-feedback:not(.hidden)");
    await herd(page, boa); await openLot(page, b); await ficha(page, moved.id); assert.match(await page.textContent("#animal-last-weight"), /450/); await closeFicha(page);
    record("Pesagem e ficha dos gerados, sem auto-link textual", { tag: "0023D", weight: 450 });
    await fastForm(page, { name: "QA 100", tagSuffix: "I", paddockId: p2.id, categories: ["Novilhas"], breeds: ["Nelore"] }, { maleCount: "50", femaleCount: "50", startNumber: "1" });
    const elapsedMs = await fastSave(page); db = await dump(page); const hundred = db.stores.lots.find((v) => v.name === "QA 100");
    assert.equal(db.stores.animals.filter((v) => v.lotId === hundred.id).length, 100); assert.equal(await page.locator("#herd-animals .herd-card").count(), 100);
    record("QA performance 100 animais", { elapsedMs, measurement: "confirmar ate persistencia e render concluido; uma amostra local, nao benchmark", animals: 100, events: db.stores["animal-events"].filter((v) => v.toLotId === hundred.id).length });
    for (const [width, height] of [[360, 800], [768, 1024], [1280, 900]]) {
      await page.setViewportSize({ width, height }); await root(page); await shot(page, `${width}-rebanho`);
      await openPaddock(page, p1.id); await shot(page, `${width}-pasto`); await openLot(page, a); await shot(page, `${width}-lote-animais`);
      await ficha(page, old.id); await shot(page, `${width}-ficha`); await closeFicha(page);
      await root(page); await page.click("#new-lot-record"); await fields(page, { name: "Prévia", tagSuffix: "Z" }); await shot(page, `${width}-normal-fechado`);
      await page.check("#herd-fast-enabled"); await fields(page, { maleCount: "20", femaleCount: "30", startNumber: "1" });
      await page.locator("#herd-fast-preview").scrollIntoViewIfNeeded(); await shot(page, `${width}-rapido-preview`);
      await page.locator('#herd-form button[type="submit"]').click(); await shot(page, `${width}-confirmacao`);
      await page.locator('#fast-lot-confirm button[value="cancel"]').click(); await page.locator("#herd-form").getByRole("button", { name: "Cancelar", exact: true }).click();
    }
    record("Responsividade", { captures: evidence.viewports.length, overflow: false });
    await context.setOffline(true); await new Promise((r) => server.close(r)); await page.close(); page = await context.newPage(); await page.goto(url); await ready(page);
    await herd(page, boa); const offlineP = await create(page, "paddock", { name: "Piquete Offline" }, boa);
    const normalOffline = await create(page, "lot", { name: "Normal offline", tagSuffix: "Y" }, boa);
    await fastForm(page, { name: "Rapido offline", tagSuffix: "Z", paddockId: offlineP.id }, { maleCount: "5", femaleCount: "5", startNumber: "1" }); await fastSave(page);
    db = await dump(page); const offlineL = db.stores.lots.find((v) => v.name === "Rapido offline"); const offlineA = db.stores.animals.find((v) => v.lotId === offlineL.id);
    await moveAnimal(page, offlineA.id, normalOffline.id); await moveLot(page, offlineL, p1.id);
    await page.close(); page = await context.newPage(); await page.goto(url); await ready(page); await herd(page, boa);
    await openLot(page, normalOffline); await ficha(page, offlineA.id); assert.match(await page.textContent("#animal-timeline"), /Cadastro no sistema/); assert.match(await page.textContent("#animal-timeline"), /Mudança de lote/);
    await shot(page, "offline-ficha"); await closeFicha(page); await openLot(page, offlineL);
    assert.equal(await page.locator("#herd-animals .herd-card").count(), 9);
    db = await dump(page); assert.equal(db.version, 5); assert.equal(db.stores.animals.filter((v) => v.tagOriginLotId === offlineL.id).length, 10);
    record("QA H offline sem servidor: criar, mover, fechar/reabrir e fichas", { generated: 10, currentLot: 9, movedAnimal: 1, dbVersion: 5 });
    assert.deepEqual(evidence.errors, []); await context.close();
  } finally {
    fs.writeFileSync(path.join(out, "evidence.json"), JSON.stringify(evidence, null, 2));
    await browser.close(); if (server.listening) await new Promise((r) => server.close(r));
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
