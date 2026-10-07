const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { createServer } = require("./serve.cjs");
const out = path.join(__dirname, "../docs/qa-sprint-006");
const evidence = { checks: [], viewports: [], errors: [], limitations: ["Android fisico nao executado; QA em Chromium/Edge desktop com viewports emulados."] };
const record = (name, detail) => { evidence.checks.push({ name, passed: true, detail }); console.log(`PASS ${name}`); };
let url;
async function dump(page) {
  return page.evaluate(async () => {
    const database = window.LocalDatabase.createLocalDatabase();
    const db = await database.open();
    const data = { version: db.version, stores: {} };
    for (const name of db.objectStoreNames) data.stores[name] = await database.getAll(name);
    database.close(); return data;
  });
}
async function ready(page) { await page.waitForSelector("#save-status.saved"); }
async function shot(page, name) {
  await page.evaluate(() => Promise.all([...document.images].map((image) => image.decode())));
  const size = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  assert.ok(size.scrollWidth <= size.width, `${name}: overflow`);
  evidence.viewports.push({ name, ...size });
  const dialogOpen = await page.locator("#herd-dialog[open]").count();
  await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: !dialogOpen });
}
async function property(page, name) {
  await page.click("#property-tab"); await page.click("#new-property");
  await page.fill("#property-form-name", name); await page.click("#save-property");
  await page.waitForSelector("#property-form.hidden", { state: "attached" });
  return page.locator(".property-card").filter({ hasText: name }).getAttribute("data-property-id");
}
async function herd(page, id) {
  await page.click("#herd-tab");
  await page.selectOption("#herd-property", id);
  await page.waitForFunction((value) => document.querySelector("#herd-property").value === value, id);
  await page.waitForTimeout(150);
}
async function fields(page, data) {
  for (const [key, value] of Object.entries(data)) {
    const field = page.locator(`#herd-field-${key}`);
    if (await field.evaluate((node) => node.tagName) === "SELECT") await field.selectOption(value);
    else await field.fill(String(value));
  }
}
async function saveForm(page) {
  await page.locator('#herd-form button[type="submit"]').click();
  await page.waitForSelector("#herd-dialog:not([open])", { state: "attached" });
  await page.waitForFunction(() => document.querySelector("#herd-feedback").textContent.includes("Registro salvo"));
}
async function create(page, kind, data) {
  await page.click(`#new-${kind}-record`); await fields(page, data); await saveForm(page);
  const db = await dump(page);
  const pid = await page.inputValue("#herd-property");
  return db.stores[`${kind}s`].find((item) => item.propertyId === pid && (kind === "animal" ? item.tag === (data.tag || "") : item.name === data.name));
}
const card = (page, id) => page.locator(`[data-record-id="${id}"]`);
async function edit(page, record, data) {
  await card(page, record.id).getByRole("button", { name: "Editar", exact: true }).click();
  await fields(page, data); await saveForm(page);
}
async function weighing(page, name, propertyId, lotId) {
  await page.click("#calculator-tab");
  await page.click("#clear-weighing"); await ready(page);
  await page.fill("#weighing-name", name);
  if (propertyId) await page.selectOption("#property-select", propertyId);
  if (lotId) await page.selectOption("#registered-lot", lotId);
  await page.fill("#arroba-price", "300,00"); await page.fill("#yield-rate", "50");
  for (const [index, weight] of [450, 510].entries()) {
    await page.click("#add-animal");
    await page.locator('#animal-rows [data-field="tag"]').nth(index).fill(String(101 + index));
    await page.locator('#animal-rows [data-field="weight"]').nth(index).fill(String(weight));
  }
  assert.equal(await page.textContent("#total-animals"), "2");
  assert.equal(await page.textContent("#total-weight"), "960 kg");
  assert.equal(await page.textContent("#average-weight"), "480 kg");
  assert.equal(await page.textContent("#total-arrobas"), "32 @");
  assert.match(await page.textContent("#estimated-value"), /9\.600,00/);
}
async function finalize(page) {
  await page.click("#finalize-weighing"); await page.click("#confirm-finalize");
  await page.waitForSelector("#finalize-feedback:not(.hidden)");
}
async function main() {
  fs.mkdirSync(out, { recursive: true });
  let baseline = true;
  const server = createServer({ baseline: () => baseline, baselineRef: "05fd9e8", scope: "app/" });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${server.address().port}/app/`;
  const executablePath = process.env.QA_BROWSER_PATH || [
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  ].find((file) => fs.existsSync(file));
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true });
  evidence.browser = await browser.version();
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    let page = await context.newPage();
    context.on("page", (opened) => opened.on("pageerror", (error) => evidence.errors.push(error.message)));
    page.on("pageerror", (error) => evidence.errors.push(error.message));
    await page.goto(url); await ready(page); await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload(); await ready(page);
    const boa = await property(page, "Boa Vista");
    await weighing(page, "Historico legado", boa); await finalize(page);
    await page.fill("#weighing-name", "Draft legado preservado"); await page.waitForTimeout(800);
    const before = await dump(page);
    assert.equal(before.version, 3); assert.equal(before.stores.drafts.length, 1);
    baseline = false;
    await page.evaluate(async () => (await navigator.serviceWorker.ready).update());
    await page.waitForFunction(async () => Boolean((await navigator.serviceWorker.getRegistration()).waiting));
    const observer = await context.newPage(); await observer.goto(new URL("/qa-observer", url).href);
    await page.close();
    await observer.waitForFunction(async () => {
      const reg = (await navigator.serviceWorker.getRegistrations())[0];
      return reg && !reg.waiting && !reg.installing && reg.active?.state === "activated";
    });
    page = await context.newPage(); await page.goto(url); await ready(page);
    await observer.close();
    const after = await dump(page);
    assert.equal(after.version, 4);
    for (const [name, data] of Object.entries(before.stores)) assert.deepEqual(after.stores[name], data, `migration ${name}`);
    for (const name of ["paddocks", "lots", "animals"]) assert.deepEqual(after.stores[name], []);
    assert.deepEqual(await page.evaluate(() => caches.keys()), ["plataforma-pecuaria-shell-v4"]);
    record("Migration V3 -> V4 e cache v3 -> v4", { preserved: Object.keys(before.stores), version: after.version });

    await herd(page, boa);
    const p1 = await create(page, "paddock", { name: "Piquete 01", areaHectares: "12,5" });
    const p2 = await create(page, "paddock", { name: "Piquete 02", areaHectares: "8" });
    await page.reload(); await ready(page); await herd(page, boa);
    assert.match(await card(page, p1.id).textContent(), /12,5 ha/);
    assert.equal(await page.textContent("#herd-count-paddock"), "2"); record("QA A - pastos persistem", { p1, p2 });
    const lot = await create(page, "lot", { name: "Novilhas 2026", category: "Novilhas", paddockId: p1.id });
    await page.reload(); await ready(page); await herd(page, boa);
    assert.match(await card(page, lot.id).textContent(), /Piquete 01/); record("QA B - lote persiste", lot);
    const a1 = await create(page, "animal", { tag: "101", sex: "female", category: "Novilha", lotId: lot.id });
    const a2 = await create(page, "animal", { tag: "102", sex: "female", category: "Novilha", lotId: lot.id });
    assert.match(await card(page, lot.id).textContent(), /Animais ativos cadastrados: 2/); record("QA C - animais e contador", [a1, a2]);
    await edit(page, lot, { paddockId: p2.id });
    for (const animal of [a1, a2]) assert.match(await card(page, animal.id).textContent(), /Local atual: Piquete 02/);
    assert.deepEqual((await dump(page)).stores.animals, [a1, a2].sort((a, b) => a.id.localeCompare(b.id)));
    record("QA D - local derivado sem gravar animal", { lotId: lot.id, paddockId: p2.id });

    const sao = await property(page, "São Romão"); await herd(page, sao);
    const otherP = await create(page, "paddock", { name: "Piquete 01" });
    const otherL = await create(page, "lot", { name: "Novilhas 2026", paddockId: otherP.id });
    await create(page, "animal", { tag: "101", lotId: otherL.id });
    assert.equal(await page.locator(".herd-card").count(), 3);
    assert.equal(await card(page, a1.id).count(), 0); record("QA E - segunda propriedade isolada", { boa, sao });
    const rejected = await page.evaluate(async ({ boa, animalId, lotId, otherL, otherP }) => {
      const db = LocalDatabase.createLocalDatabase();
      const account = (await db.getAll("accounts"))[0];
      const animal = AnimalRepository.createAnimalRepository({ database: db });
      const lots = LotRepository.createLotRepository({ database: db });
      const results = [await animal.changeLot(account.id, boa, animalId, otherL), await lots.changePaddock(account.id, boa, lotId, otherP)];
      db.close(); return results.map((r) => ({ status: r.status, errors: r.errors }));
    }, { boa, animalId: a1.id, lotId: lot.id, otherL: otherL.id, otherP: otherP.id });
    assert.ok(rejected.every((r) => r.status === "invalid")); record("QA F - vinculos forjados bloqueados no IndexedDB real", rejected);
    await herd(page, boa);
    await card(page, p2.id).getByRole("button", { name: "Arquivar", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("#herd-feedback").textContent.includes("lote ativo"));
    await edit(page, lot, { paddockId: p1.id });
    await card(page, p2.id).getByRole("button", { name: "Arquivar", exact: true }).click();
    await card(page, p2.id).getByRole("button", { name: "Reativar", exact: true }).waitFor();
    await card(page, lot.id).getByRole("button", { name: "Arquivar", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("#herd-feedback").textContent.includes("animais ativos"));
    record("QA G - arquivamento condicionado aos vinculos", "Pasto ocupado e lote ocupado bloqueados; pasto livre arquivado.");
    await weighing(page, "Pesagem vinculada", boa, lot.id);
    await page.waitForTimeout(800); await page.reload(); await ready(page);
    assert.equal(await page.inputValue("#registered-lot"), lot.id);
    await page.selectOption("#property-select", sao);
    assert.equal(await page.inputValue("#registered-lot"), ""); assert.equal(await page.textContent("#total-animals"), "2");
    await page.selectOption("#property-select", boa); await page.selectOption("#registered-lot", lot.id);
    await finalize(page); await page.waitForTimeout(800);
    let data = await dump(page);
    const saved = data.stores["weighing-sessions"].find((s) => s.weighingName === "Pesagem vinculada");
    assert.equal(data.stores.drafts.length, 0);
    assert.equal(saved.lotId, lot.id); assert.equal(saved.lotNameSnapshot, "Novilhas 2026");
    assert.equal(saved.paddockId, p1.id); assert.equal(saved.paddockNameSnapshot, "Piquete 01");
    assert.equal(saved.totalWeight, 960); assert.equal(saved.totalArrobas, 32); assert.equal(saved.estimatedValue, 9600);
    assert.ok(data.stores["weighing-items"].every((item) => item.animalId === null));
    record("QA H - pesagem vinculada, reload do draft e autosave pendente", saved);
    await page.reload(); await ready(page); assert.equal(await page.textContent("#total-animals"), "0");
    await herd(page, boa);
    await card(page, p2.id).getByRole("button", { name: "Reativar", exact: true }).click();
    await card(page, p2.id).getByRole("button", { name: "Arquivar", exact: true }).waitFor();
    await edit(page, lot, { name: "Novilhas Selecionadas", paddockId: p2.id });
    assert.deepEqual((await dump(page)).stores["weighing-sessions"].find((s) => s.id === saved.id), saved);
    await page.click("#history-tab"); await page.locator(`[data-session-id="${saved.id}"]`).click();
    await page.waitForFunction(() => document.querySelector("#history-report-name").textContent === "Pesagem vinculada");
    assert.equal(await page.textContent("#history-report-lot"), "Novilhas 2026");
    assert.equal(await page.textContent("#history-report-paddock"), "Piquete 01"); record("QA I - snapshots imutaveis", saved.id);
    await weighing(page, "Outra propriedade", sao, otherL.id); await finalize(page);
    await page.click("#history-tab"); await page.selectOption("#history-lot-filter", lot.id);
    assert.equal(await page.locator(".history-item").count(), 1);
    await page.selectOption("#history-lot-filter", otherL.id); assert.equal(await page.locator(".history-item").count(), 1);
    await page.selectOption("#history-lot-filter", "unlinked"); assert.equal(await page.locator(".history-item").count(), 1);
    await page.selectOption("#history-lot-filter", "all"); record("Filtro de lotes por ID e legado sem vinculo", "3 sessoes; filtros isolados.");

    await herd(page, boa);
    await page.click("#new-animal-record"); await page.locator('#herd-form button[type="submit"]').click();
    await page.waitForFunction(() => document.querySelector("#herd-field-tag-error").textContent.length > 0);
    assert.match(await page.textContent("#herd-field-tag-error"), /Informe/);
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await page.click("#new-paddock-record"); await fields(page, { name: "Invalido", areaHectares: "-1" });
    await page.locator('#herd-form button[type="submit"]').click();
    await page.waitForFunction(() => document.querySelector("#herd-field-areaHectares-error").textContent.length > 0);
    assert.match(await page.textContent("#herd-field-areaHectares-error"), /maior que zero/);
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    const payload = '<img src=x onerror="window.__injected=true">';
    await edit(page, a1, { notes: payload, breed: payload });
    assert.match(await card(page, a1.id).textContent(), /<img/);
    assert.equal(await card(page, a1.id).locator("img").count(), 0);
    assert.equal(await page.evaluate(() => window.__injected), undefined);
    await edit(page, a1, { notes: "", breed: "Nelore" });
    await page.fill("#herd-search", "102"); assert.equal(await page.locator("#herd-animals .herd-card").count(), 1);
    await page.fill("#herd-search", ""); record("Validacao UI, busca e injecao HTML", "Erros junto aos campos; payload somente texto.");

    const integrity = await page.evaluate(async () => {
      const database = LocalDatabase.createLocalDatabase({ name: "qa-sprint-006-integrity" });
      for (const id of ["a", "b"]) await database.put("accounts", { id });
      for (const id of ["a", "b"]) await database.put("properties", { id: `p-${id}`, accountId: id, name: id, status: "active" });
      const paddocks = PaddockRepository.createPaddockRepository({ database });
      const lots = LotRepository.createLotRepository({ database });
      const p = (await paddocks.create("a", "p-a", { name: "Atomic" })).paddock;
      const race = await Promise.all([paddocks.archive("a", "p-a", p.id), lots.create("a", "p-a", { name: "Race", paddockId: p.id })]);
      const foreign = (await paddocks.create("b", "p-b", { name: "Foreign" })).paddock;
      const crossAccount = await lots.create("a", "p-a", { name: "Cross", paddockId: foreign.id });
      const isolated = await paddocks.list("a", "p-b", { includeArchived: true });
      const before = await database.get("paddocks", foreign.id);
      let rollback = false;
      try {
        await database.writeTransaction(["paddocks"], async ({ store, requestToPromise }) => {
          await requestToPromise(store("paddocks").put({ ...before, name: "Must rollback" }));
          throw new Error("Injected failure");
        });
      } catch { rollback = JSON.stringify(await database.get("paddocks", foreign.id)) === JSON.stringify(before); }
      database.close();
      return { race: race.map((r) => r.status).sort(), crossAccount: crossAccount.status, isolated: isolated.paddocks.length, rollback };
    });
    assert.deepEqual(integrity, { race: ["invalid", "saved"], crossAccount: "invalid", isolated: 0, rollback: true });
    record("Integridade real: concorrencia, duas contas e rollback", integrity);

    for (const viewport of [{ width: 360, height: 800 }, { width: 768, height: 1024 }, { width: 1280, height: 900 }]) {
      await page.setViewportSize(viewport); await herd(page, boa); await shot(page, `${viewport.width}-rebanho`);
      for (const kind of ["paddock", "lot", "animal"]) {
        await page.click(`#new-${kind}-record`); await shot(page, `${viewport.width}-novo-${kind}`);
        if (kind === "animal") {
          const save = page.locator('#herd-form button[type="submit"]');
          await save.scrollIntoViewIfNeeded();
          const bounds = await save.boundingBox();
          assert.ok(bounds && bounds.y >= 0 && bounds.y + bounds.height <= viewport.height);
          await shot(page, `${viewport.width}-animal-acoes`);
        }
        await page.getByRole("button", { name: "Cancelar", exact: true }).click();
      }
      await weighing(page, "Rascunho responsivo", boa, lot.id); await shot(page, `${viewport.width}-calculadora`);
      await page.click("#history-tab"); await page.locator(`[data-session-id="${saved.id}"]`).click(); await shot(page, `${viewport.width}-historico`);
    }
    record("QA responsivo", evidence.viewports);
    await page.emulateMedia({ media: "print" });
    assert.equal(await page.locator("#print-history-report").isVisible(), false);
    await page.pdf({ path: path.join(out, "romaneio.pdf"), format: "A4", printBackground: true });
    await page.emulateMedia({ media: "screen" }); record("Impressao", "Botoes ocultos; PDF historico com lote e pasto.");

    await context.setOffline(true);
    await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
    await herd(page, boa);
    const offlineP = await create(page, "paddock", { name: "Piquete Offline" });
    const offlineL = await create(page, "lot", { name: "Lote Offline", paddockId: offlineP.id });
    const offlineA = await create(page, "animal", { tag: "OFF-01", lotId: offlineL.id });
    await edit(page, offlineP, { areaHectares: "9,5" });
    await edit(page, offlineA, { lotId: "" });
    await card(page, offlineL.id).getByRole("button", { name: "Arquivar", exact: true }).click();
    await card(page, offlineL.id).getByRole("button", { name: "Reativar", exact: true }).click();
    await card(page, offlineL.id).getByRole("button", { name: "Arquivar", exact: true }).waitFor();
    await edit(page, offlineA, { lotId: offlineL.id });
    await edit(page, offlineL, { paddockId: "" }); await edit(page, offlineL, { paddockId: offlineP.id });
    await page.close(); page = await context.newPage(); await page.goto(url); await ready(page);
    await herd(page, boa);
    assert.match(await card(page, offlineA.id).textContent(), /Piquete Offline/);
    await weighing(page, "Finalizada offline", boa, offlineL.id); await finalize(page);
    await page.close(); page = await context.newPage(); await page.goto(url); await ready(page);
    assert.equal(await page.textContent("#total-animals"), "0");
    await page.click("#history-tab"); await page.locator(".history-item").filter({ hasText: "Finalizada offline" }).click();
    await page.waitForFunction(() => document.querySelector("#history-report-name").textContent === "Finalizada offline");
    assert.equal(await page.textContent("#history-report-lot"), "Lote Offline");
    assert.equal(await page.textContent("#history-report-paddock"), "Piquete Offline");
    data = await dump(page);
    record("QA J - offline sem servidor, CRUD, fechar/reabrir, pesar/finalizar/historico", {
      offline: await page.evaluate(() => !navigator.onLine), serverListening: server.listening,
      animal: data.stores.animals.find((a) => a.id === offlineA.id),
      session: data.stores["weighing-sessions"].find((s) => s.weighingName === "Finalizada offline"),
    });
    await shot(page, "offline-historico");
    assert.deepEqual(evidence.errors, []);
    await context.close();
  } finally {
    await browser.close();
    if (server.listening) await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
  }
}
main().then(() => {
  evidence.passed = true; fs.writeFileSync(path.join(out, "evidence.json"), JSON.stringify(evidence, null, 2));
}).catch((error) => {
  evidence.passed = false; evidence.failure = error.stack;
  fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, "evidence.json"), JSON.stringify(evidence, null, 2));
  console.error(error); process.exitCode = 1;
});
