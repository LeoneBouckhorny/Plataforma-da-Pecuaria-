const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { createServer } = require("./serve.cjs");
const out = path.join(__dirname, "../docs/qa-sprint-008");
const evidence = { startedAt: new Date().toISOString(), checks: [], viewports: [], errors: [], limitations: ["Android fisico nao executado; Chromium com viewport emulado."] };
const record = (name, detail) => { evidence.checks.push({ name, passed: true, detail }); console.log(`PASS ${name}`); };
// Poll resolved booleans: waitForFunction treats an async predicate as a truthy Promise.
async function until(check, label) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timeout: ${label}`);
}
async function ready(page) { await page.waitForSelector("#save-status.saved"); }
async function dump(page) {
  return page.evaluate(async () => {
    const d = LocalDatabase.createLocalDatabase(); const db = await d.open(); const data = { version: db.version, stores: {} };
    for (const name of db.objectStoreNames) data.stores[name] = await d.getAll(name);
    d.close(); return data;
  });
}
async function property(page, name) {
  await page.click("#property-tab"); await page.click("#new-property"); await page.fill("#property-form-name", name);
  await page.click("#save-property"); await page.waitForSelector("#property-form.hidden", { state: "attached" });
  return page.locator(".property-card").filter({ hasText: name }).getAttribute("data-property-id");
}
async function openProperty(page, id, section = "overview") {
  await page.click("#property-tab");
  await page.locator(`[data-property-id="${id}"]`).getByRole("button", { name: "Abrir propriedade" }).click();
  await page.waitForFunction(() => document.querySelector("#property-count-weighings").textContent !== "...");
  if (section !== "overview") {
    await page.click(`[data-property-section="${section}"]`);
    if (section === "herd") await page.waitForFunction(() => document.querySelector("#herd").dataset.loaded === "true");
    if (section === "weighings") await page.waitForFunction(() => document.querySelector("#history").getAttribute("aria-busy") === "false");
  }
}
async function fields(page, data) {
  for (const [key, value] of Object.entries(data)) {
    const input = page.locator(`#herd-field-${key}`);
    if (await input.evaluate((node) => node.tagName) === "SELECT") await input.selectOption(value);
    else await input.fill(String(value));
  }
}
async function save(page) {
  await page.locator('#herd-form button[type="submit"]').click();
  await page.waitForSelector("#herd-dialog:not([open])", { state: "attached" });
  await page.waitForFunction(() => document.querySelector("#herd-feedback").textContent.includes("Registro salvo"));
}
async function create(page, kind, data, propertyId) {
  await page.click(`#new-${kind}-record`); await fields(page, data); await save(page);
  return (await dump(page)).stores[`${kind}s`].find((item) => item.propertyId === propertyId
    && (kind === "animal" ? item.name === data.name : item.name === data.name));
}
async function edit(page, id, data, success = true) {
  await page.locator(`[data-record-id="${id}"]`).getByRole("button", { name: "Editar", exact: true }).click();
  await fields(page, data);
  if (success) await save(page); else await page.locator('#herd-form button[type="submit"]').click();
}
async function ficha(page, id) {
  await page.locator(`[data-record-id="${id}"]`).getByRole("button", { name: "Ver ficha" }).click();
  await page.waitForSelector("#animal-timeline");
}
async function closeFicha(page) { await page.click("#close-animal-detail"); }
async function detailSave(page) {
  await page.locator('#animal-detail-form button[type="submit"]').click();
  await page.waitForSelector("#animal-detail-form.hidden", { state: "attached" });
  await page.waitForTimeout(100);
}
async function weighing(page, propertyId, lotId, animalId, name, tag = "0023A") {
  await page.click("#calculator-tab"); await page.click("#clear-weighing"); await ready(page);
  await page.fill("#weighing-name", name); await page.selectOption("#property-select", propertyId);
  await page.selectOption("#registered-lot", lotId);
  await page.click("#add-animal");
  await page.locator('#animal-rows [data-field="weight"]').first().fill("450");
  await page.locator('#animal-rows [data-field="tag"]').first().fill(tag);
  if (animalId) await page.locator('#animal-rows [data-field="animalId"]').first().selectOption(animalId);
}
async function finalize(page) {
  await page.click("#finalize-weighing"); await page.click("#confirm-finalize");
  await page.waitForSelector("#finalize-feedback:not(.hidden)");
  await page.waitForTimeout(750);
}
async function shot(page, name, selector) {
  const size = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  assert.ok(size.scrollWidth <= size.width, `${name}: overflow ${JSON.stringify(size)}`);
  evidence.viewports.push({ name, ...size });
  if (selector) await page.locator(selector).screenshot({ path: path.join(out, `${name}.png`) });
  else await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: !(await page.locator("dialog[open]").count()) });
}
async function main() {
  fs.mkdirSync(out, { recursive: true });
  let baseline = true;
  const server = createServer({ baseline: () => baseline, baselineRef: "19d825e", scope: "app/" });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}/app/`;
  const executablePath = process.env.QA_BROWSER_PATH || ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe"].find(fs.existsSync);
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true });
  evidence.browser = await browser.version();
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    context.on("page", (p) => p.on("pageerror", (error) => evidence.errors.push(error.stack || error.message)));
    let page = await context.newPage(); await page.goto(url); await ready(page); await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload(); await ready(page);
    const boa = await property(page, "Boa Vista"); const sao = await property(page, "São Romão");
    await page.click("#herd-tab"); await page.selectOption("#herd-property", boa); await page.waitForTimeout(150);
    const legacyLot = await create(page, "lot", { name: "Lote anterior" }, boa);
    const legacy = await create(page, "animal", { name: "Legado", tag: "101", lotId: legacyLot.id }, boa);
    await page.selectOption("#herd-property", sao); await page.waitForTimeout(150);
    const saoLot = await create(page, "lot", { name: "Lote São Romão" }, sao);
    const saoAnimal = await create(page, "animal", { name: "São Romão animal", tag: "BR-22", lotId: saoLot.id }, sao);
    await weighing(page, sao, saoLot.id, saoAnimal.id, "Draft São Romão", "BR-22"); await page.waitForTimeout(800);
    const before = await dump(page); assert.equal(before.version, 5);
    baseline = false;
    await page.evaluate(async () => (await navigator.serviceWorker.ready).update());
    await until(() => page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration()).waiting)), "novo worker instalado e aguardando");
    const observer = await context.newPage(); await observer.goto(new URL("/qa-observer", url).href); await page.close();
    await until(() => observer.evaluate(async () => {
      const r = (await navigator.serviceWorker.getRegistrations())[0];
      const keys = await caches.keys();
      return r && !r.waiting && !r.installing && r.active?.state === "activated"
        && keys.includes("plataforma-pecuaria-shell-v6") && !keys.includes("plataforma-pecuaria-shell-v5");
    }), "worker v6 ativado e cache antigo removido");
    const shell = await observer.evaluate(async () => {
      const cache = await caches.open("plataforma-pecuaria-shell-v6");
      const root = (await navigator.serviceWorker.getRegistrations())[0].scope;
      const html = await (await cache.match(new URL("index.html", root).href)).text();
      const controller = await (await cache.match(new URL("src/herd-controller.js", root).href)).text();
      return { keys: await caches.keys(), contextualHtml: html.includes('id="back-properties"'), contextualController: !controller.includes('this.selector.addEventListener') };
    });
    assert.equal(shell.contextualHtml, true); assert.equal(shell.contextualController, true);
    assert.deepEqual(shell.keys, ["plataforma-pecuaria-shell-v6"]);
    evidence.upgradeShell = shell;
    page = await context.newPage(); await page.goto(url); await ready(page); await observer.close();
    assert.deepEqual(await dump(page), before);
    assert.deepEqual(await page.evaluate(() => caches.keys()), ["plataforma-pecuaria-shell-v6"]);
    record("Upgrade real v5 -> v6, DB V5 sem migration", { allStoresPreserved: true, legacyTag: "101", legacySuffix: null });
    await openProperty(page, boa, "herd");
    assert.equal(await page.locator("#herd-tab").count(), 0);
    assert.equal(await page.locator(`[data-record-id="${saoAnimal.id}"]`).count(), 0);
    assert.match(await page.textContent("#herd-sections"), /Código de brinco não configurado/);
    await ficha(page, legacy.id); assert.match(await page.textContent("#animal-detail-title"), /101/); await closeFicha(page);
    await openProperty(page, sao, "herd"); assert.equal(await page.locator(`[data-record-id="${legacy.id}"]`).count(), 0);
    await openProperty(page, boa, "herd"); await page.click("#calculator-tab");
    assert.equal(await page.inputValue("#property-select"), sao);
    assert.equal(await page.inputValue("#registered-lot"), saoLot.id);
    assert.equal(await page.locator('[data-field="animalId"]').first().inputValue(), saoAnimal.id);
    assert.deepEqual((await dump(page)).stores.drafts, before.stores.drafts);
    record("QA A/B/I contexto por ID sem vazamento ou alteracao de draft", { boa, sao, draftUnchanged: true });
    await finalize(page);
    await openProperty(page, boa, "herd");
    const pasto = await create(page, "paddock", { name: "Pasto 01", areaHectares: "12,5" }, boa);
    const a = await create(page, "lot", { name: "Novilhas", tagSuffix: " a ", paddockId: pasto.id }, boa);
    const b = await create(page, "lot", { name: "Garrotes", tagSuffix: "B" }, boa);
    await page.click("#new-lot-record"); await fields(page, { name: "Duplicado", tagSuffix: "a" });
    await page.locator('#herd-form button[type="submit"]').click();
    await page.waitForFunction(() => document.querySelector("#herd-field-tagSuffix-error").textContent.includes("Novilhas"));
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    record("QA C sufixo unico normalizado", { suffix: a.tagSuffix, duplicateBlocked: true });
    await page.click("#new-animal-record"); await fields(page, { lotId: a.id, name: "Estrela" });
    for (const [number, expected] of [["1", "0001A"], ["9", "0009A"], ["23", "0023A"], ["999", "0999A"], ["9999", "9999A"]]) {
      await fields(page, { tagNumber: number }); assert.match(await page.textContent("#herd-tag-preview"), new RegExp(expected));
    }
    for (const number of ["0", "10000", "-1", "23.5", "A23"]) {
      await fields(page, { tagNumber: number }); await page.locator('#herd-form button[type="submit"]').click();
      await page.waitForFunction(() => document.querySelector("#herd-field-tagNumber-error").textContent.includes("1 a 9999"));
    }
    await fields(page, { tagNumber: "23" }); await save(page);
    const animal = (await dump(page)).stores.animals.find((v) => v.name === "Estrela");
    assert.equal(animal.tag, "0023A"); assert.equal(animal.tagOriginLotId, a.id);
    await page.click("#new-animal-record"); await fields(page, { lotId: a.id, tagNumber: "23" });
    await page.locator('#herd-form button[type="submit"]').click();
    await page.waitForFunction(() => document.querySelector("#herd-field-tagNumber-error").textContent.includes("0023A"));
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    record("QA D/E/F geracao preview validacao e duplicidade", animal);
    await ficha(page, animal.id); await page.click("#animal-add-note");
    await page.fill("#animal-event-notes", '<img src=x onerror="window.injected=true">'); await detailSave(page);
    assert.equal(await page.locator("#animal-timeline img").count(), 0);
    await page.click("#animal-change-lot"); await page.selectOption("#animal-event-lotId", b.id); await detailSave(page);
    assert.match(await page.textContent("#animal-timeline"), /Novilhas → Garrotes/); await closeFicha(page);
    await edit(page, a.id, { tagSuffix: "C" }, false);
    await page.waitForFunction(() => document.querySelector("#herd-field-tagSuffix-error").textContent.includes("não pode ser alterado"));
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    let current = (await dump(page)).stores.animals.find((v) => v.id === animal.id);
    assert.equal(current.tag, "0023A"); assert.equal(current.lotId, b.id); assert.equal(current.tagOriginLotId, a.id);
    record("QA G/H movimento nao altera origem; sufixo bloqueado", current);
    await weighing(page, boa, b.id, animal.id, "Vinculada"); await finalize(page);
    await weighing(page, boa, b.id, null, "Somente texto"); await finalize(page);
    await openProperty(page, boa, "herd"); await ficha(page, animal.id);
    assert.equal(await page.locator('[data-event-type="weighing"]').count(), 1);
    assert.match(await page.textContent("#animal-last-weight"), /450/); await closeFicha(page);
    await edit(page, animal.id, { tagNumber: "32" });
    const historical = (await dump(page)).stores["weighing-items"].find((v) => v.animalId === animal.id);
    assert.equal(historical.animalTagSnapshot, "0023A");
    await edit(page, animal.id, { tagNumber: "23" });
    record("QA J selecao explicita, sem auto-link e snapshot imutavel", historical);
    await openProperty(page, boa, "weighings");
    assert.equal(await page.locator("#history-list .history-item").count(), 2);
    assert.doesNotMatch(await page.textContent("#history-list"), /Draft São Romão/);
    await openProperty(page, sao, "weighings");
    assert.equal(await page.locator("#history-list .history-item").count(), 1);
    await page.click("#history-tab"); assert.equal(await page.locator("#history-list .history-item").count(), 3);
    await page.selectOption("#history-property-filter", sao);
    await page.click("#calculator-tab"); await page.click("#view-saved-weighing");
    await page.waitForFunction(() => document.querySelector("#history-report-name").textContent === "Somente texto");
    assert.equal(await page.inputValue("#history-property-filter"), "all");
    record("Pesagens contextuais e historico global", { boa: 2, sao: 1, global: 3 });
    await openProperty(page, boa);
    const immediate = await page.evaluate(() => {
      const prototype = WeighingRepository.Repository.prototype;
      const original = prototype.listSessions;
      let release;
      prototype.listSessions = function (options) {
        return new Promise((resolve) => { release = () => resolve(original.call(this, options)); });
      };
      document.querySelector('[data-property-section="weighings"]').click();
      const result = { rows: document.querySelectorAll("#history-list .history-item").length,
        text: document.querySelector("#history-list").textContent,
        busy: document.querySelector("#history").getAttribute("aria-busy") };
      prototype.listSessions = original;
      release();
      return result;
    });
    assert.equal(immediate.busy, "true"); assert.equal(immediate.rows, 2);
    assert.doesNotMatch(immediate.text, /Draft São Romão/);
    await page.waitForFunction(() => document.querySelector("#history").getAttribute("aria-busy") === "false");
    record("Regressao: filtro antes da leitura pendente", immediate);
    const concurrent = await page.evaluate(async ({ boa }) => {
      const d = LocalDatabase.createLocalDatabase(); const account = (await d.getAll("accounts"))[0].id;
      const lr = LotRepository.createLotRepository({ database: d });
      const ar = AnimalRepository.createAnimalRepository({ database: d });
      const other = LocalDatabase.createLocalDatabase();
      const lr2 = LotRepository.createLotRepository({ database: other });
      const ar2 = AnimalRepository.createAnimalRepository({ database: other });
      const lots = await Promise.all([lr.create(account, boa, { name: "Concorrente 1", tagSuffix: "D" }), lr2.create(account, boa, { name: "Concorrente 2", tagSuffix: "d" })]);
      const lot = lots.find((v) => v.status === "saved").lot;
      const animals = await Promise.all([ar.create(account, boa, { lotId: lot.id, tagNumber: "7" }), ar2.create(account, boa, { lotId: lot.id, tagNumber: "7" })]);
      const animal = animals.find((v) => v.status === "saved").animal;
      await ar.archive(account, boa, animal.id); await lr.archive(account, boa, lot.id);
      const reserved = await lr.create(account, boa, { name: "Reserved", tagSuffix: "D" });
      const locked = await lr.update(account, boa, lot.id, { tagSuffix: "E" });
      d.close(); other.close(); return { connections: 2, lots: lots.map((v) => v.status), animals: animals.map((v) => v.status), reserved: reserved.status, locked: locked.status };
    }, { boa });
    assert.deepEqual(concurrent.lots.sort(), ["invalid", "saved"]); assert.deepEqual(concurrent.animals.sort(), ["invalid", "saved"]);
    assert.equal(concurrent.reserved, "invalid"); assert.equal(concurrent.locked, "invalid"); record("Concorrencia real e reserva apos arquivo", concurrent);
    for (const [width, height] of [[360, 800], [768, 1024], [1280, 900]]) {
      await page.setViewportSize({ width, height }); await page.click("#property-tab"); await shot(page, `${width}-propriedades`);
      await openProperty(page, boa); await shot(page, `${width}-visao-geral`);
      await openProperty(page, boa, "herd"); await shot(page, `${width}-rebanho`);
      for (const kind of ["paddock", "lot", "animal"]) await shot(page, `${width}-${kind}s`, `#herd-${kind}s`);
      await page.click("#new-lot-record"); await fields(page, { name: "Exemplo", tagSuffix: "Z" }); await shot(page, `${width}-form-lote`);
      await page.getByRole("button", { name: "Cancelar", exact: true }).click();
      await page.click("#new-animal-record"); await fields(page, { lotId: b.id, tagNumber: "287" }); await shot(page, `${width}-form-animal`);
      await page.getByRole("button", { name: "Cancelar", exact: true }).click(); await ficha(page, animal.id); await shot(page, `${width}-ficha`); await closeFicha(page);
      await openProperty(page, boa, "weighings"); await page.locator("#history-list .history-item").first().click(); await shot(page, `${width}-pesagens`);
    }
    await page.emulateMedia({ media: "print" }); assert.equal(await page.locator("#back-properties").isVisible(), false);
    assert.equal(await page.locator("#history-detail-content").isVisible(), true); await page.emulateMedia({ media: "screen" });
    record("Responsividade e impressao contextual", { viewports: evidence.viewports.length, overflow: false });
    await context.setOffline(true); await new Promise((resolve) => server.close(resolve));
    await page.close(); page = await context.newPage(); await page.goto(url); await ready(page);
    await openProperty(page, boa, "herd");
    const offlineLot = await create(page, "lot", { name: "Offline", tagSuffix: "Z" }, boa);
    const offlineAnimal = await create(page, "animal", { name: "Offline 7", lotId: offlineLot.id, tagNumber: "7" }, boa);
    assert.equal(offlineAnimal.tag, "0007Z");
    await weighing(page, boa, offlineLot.id, offlineAnimal.id, "Pesagem offline", "0007Z"); await finalize(page);
    await page.close(); page = await context.newPage(); await page.goto(url); await ready(page);
    await openProperty(page, boa, "herd"); await ficha(page, offlineAnimal.id); assert.match(await page.textContent("#animal-last-weight"), /450/);
    await shot(page, "offline-ficha"); await closeFicha(page); await openProperty(page, boa, "weighings");
    assert.match(await page.textContent("#history-list"), /Pesagem offline/);
    assert.equal((await dump(page)).version, 5);
    record("QA K sem rede/servidor, fechar/reabrir, criar, finalizar e historico", { tag: "0007Z", persistedAfterReopen: true });
    assert.deepEqual(evidence.errors, []);
    await context.close();
  } finally {
    fs.writeFileSync(path.join(out, "evidence.json"), JSON.stringify(evidence, null, 2));
    await browser.close(); if (server.listening) await new Promise((resolve) => server.close(resolve));
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
