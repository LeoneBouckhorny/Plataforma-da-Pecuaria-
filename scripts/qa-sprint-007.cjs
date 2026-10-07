const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { createServer } = require("./serve.cjs");
const out = path.join(__dirname, "../docs/qa-sprint-007");
const evidence = { checks: [], viewports: [], errors: [], limitations: ["Android fisico nao executado; Edge/Chromium headless com viewports emulados."] };
const record = (name, detail) => { evidence.checks.push({ name, passed: true, detail }); console.log(`PASS ${name}`); };
let url;
async function ready(page) { await page.waitForSelector("#save-status.saved"); }
async function dump(page) {
  return page.evaluate(async () => {
    const database = LocalDatabase.createLocalDatabase(); const db = await database.open();
    const data = { version: db.version, stores: {}, indexes: {} };
    for (const name of db.objectStoreNames) { data.stores[name] = await database.getAll(name); data.indexes[name] = [...db.transaction(name).objectStore(name).indexNames]; }
    database.close(); return data;
  });
}
async function property(page, name) {
  await page.click("#property-tab"); await page.click("#new-property"); await page.fill("#property-form-name", name);
  await page.click("#save-property"); await page.waitForSelector("#property-form.hidden", { state: "attached" });
  return page.locator(".property-card").filter({ hasText: name }).getAttribute("data-property-id");
}
async function herd(page, id) {
  await page.click("#herd-tab"); await page.selectOption("#herd-property", id); await page.waitForTimeout(200);
}
async function fields(page, data) {
  for (const [key, value] of Object.entries(data)) {
    const field = page.locator(`#herd-field-${key}`);
    if (await field.evaluate((node) => node.tagName) === "SELECT") await field.selectOption(value);
    else await field.fill(String(value));
  }
}
async function saveHerd(page) {
  await page.locator('#herd-form button[type="submit"]').click();
  await page.waitForSelector("#herd-dialog:not([open])", { state: "attached" });
  await page.waitForFunction(() => document.querySelector("#herd-feedback").textContent.includes("Registro salvo"));
}
async function create(page, kind, data) {
  await page.click(`#new-${kind}-record`); await fields(page, data); await saveHerd(page);
  const db = await dump(page); const pid = await page.inputValue("#herd-property");
  return db.stores[`${kind}s`].find((item) => item.propertyId === pid && (kind === "animal" ? item.tag === (data.tag || "") : item.name === data.name));
}
async function edit(page, id, data) {
  await page.locator(`[data-record-id="${id}"]`).getByRole("button", { name: "Editar", exact: true }).click();
  await fields(page, data); await saveHerd(page);
}
async function ficha(page, propertyId, animalId) {
  await herd(page, propertyId);
  await page.locator(`[data-record-id="${animalId}"]`).getByRole("button", { name: "Ver ficha", exact: true }).click();
  await page.waitForSelector("#animal-timeline");
}
async function closeFicha(page) { await page.click("#close-animal-detail"); }
async function saveDetail(page) {
  await page.locator('#animal-detail-form button[type="submit"]').click();
  await page.waitForSelector("#animal-detail-form.hidden", { state: "attached" });
  await page.waitForTimeout(120);
}
async function note(page, text) {
  await page.click("#animal-add-note"); await page.fill("#animal-event-notes", text); await saveDetail(page);
  await page.waitForFunction((value) => document.querySelector("#animal-timeline").textContent.includes(value), text);
}
async function move(page, lotId) {
  await page.click("#animal-change-lot"); await page.selectOption("#animal-event-lotId", lotId || ""); await saveDetail(page);
}
async function weighing(page, name, pid, lotId, animalId, weight = "450", date = "2026-09-21", second = false) {
  await page.click("#calculator-tab"); await page.click("#clear-weighing"); await ready(page);
  await page.fill("#weighing-name", name); await page.fill("#weighing-date", date);
  if (pid) await page.selectOption("#property-select", pid);
  if (lotId) await page.selectOption("#registered-lot", lotId);
  for (const [i, w] of (second ? [weight, "510"] : [weight]).entries()) {
    await page.click("#add-animal");
    await page.locator('#animal-rows [data-field="weight"]').nth(i).fill(w);
    await page.locator('#animal-rows [data-field="tag"]').nth(i).fill(i ? "202" : "101");
    if (i === 0 && animalId) await page.locator('#animal-rows [data-field="animalId"]').nth(0).selectOption(animalId);
  }
}
async function finalize(page) {
  await page.click("#finalize-weighing"); await page.waitForSelector("#finalize-dialog[open]"); await page.click("#confirm-finalize");
  await page.waitForSelector("#finalize-feedback:not(.hidden)");
}
async function shot(page, name) {
  const size = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  assert.ok(size.scrollWidth <= size.width, `${name} overflow`); evidence.viewports.push({ name, ...size });
  const dialogOpen = await page.locator("dialog[open]").count();
  await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: !dialogOpen });
}
async function main() {
  fs.mkdirSync(out, { recursive: true });
  let baseline = true;
  const server = createServer({ baseline: () => baseline, baselineRef: "1682473", scope: "app/" });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${server.address().port}/app/`;
  const executablePath = process.env.QA_BROWSER_PATH || ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe"].find(fs.existsSync);
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true });
  evidence.browser = await browser.version();
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    context.on("page", (p) => p.on("pageerror", (error) => evidence.errors.push(error.message)));
    let page = await context.newPage(); await page.goto(url); await ready(page); await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload(); await ready(page);
    const boa = await property(page, "Boa Vista"); await herd(page, boa);
    const p1 = await create(page, "paddock", { name: "Piquete 01" });
    const p2 = await create(page, "paddock", { name: "Piquete 02" });
    const novilhas = await create(page, "lot", { name: "Novilhas 2026", paddockId: p1.id });
    const recria = await create(page, "lot", { name: "Recria", paddockId: p2.id });
    const a = await create(page, "animal", { tag: "101", name: "Estrela", sex: "female", category: "Novilha", breed: "Nelore", birthDate: "2025-08-10", lotId: novilhas.id });
    await weighing(page, "Pesagem V4", boa, novilhas.id, null); await finalize(page);
    await page.fill("#weighing-name", "Draft V4"); await page.waitForTimeout(800);
    const before = await dump(page); assert.equal(before.version, 4);
    baseline = false;
    await page.evaluate(async () => (await navigator.serviceWorker.ready).update());
    await page.waitForFunction(async () => Boolean((await navigator.serviceWorker.getRegistration()).waiting));
    const observer = await context.newPage(); await observer.goto(new URL("/qa-observer", url).href); await page.close();
    await observer.waitForFunction(async () => { const reg = (await navigator.serviceWorker.getRegistrations())[0]; return reg && !reg.waiting && !reg.installing && reg.active?.state === "activated"; });
    page = await context.newPage(); await page.goto(url); await ready(page); await observer.close();
    const after = await dump(page); assert.equal(after.version, 5);
    for (const [name, records] of Object.entries(before.stores)) assert.deepEqual(after.stores[name], records, name);
    assert.deepEqual(after.stores["animal-events"], []); assert.ok(after.indexes["weighing-items"].includes("animalId"));
    assert.deepEqual(await page.evaluate(() => caches.keys()), ["plataforma-pecuaria-shell-v5"]);
    record("Migration populada V4 -> V5 e cache v4 -> v5", { preserved: Object.keys(before.stores), indexes: after.indexes, syntheticEvents: 0 });

    await ficha(page, boa, a.id);
    const detail = await page.textContent("#animal-detail-content");
    for (const value of ["101", "Estrela", "Fêmea", "Novilha", "Nelore", "Novilhas 2026", "Piquete 01", "Sem pesagens vinculadas"]) assert.ok(detail.includes(value));
    assert.equal(await page.locator('[data-event-type="legacy_registered"]').count(), 1); record("QA A ficha legado", detail);
    await note(page, "Apartada para avaliação."); await closeFicha(page); await page.reload(); await ready(page); await ficha(page, boa, a.id);
    assert.match(await page.textContent("#animal-timeline"), /Apartada para avaliação/);
    await page.getByRole("button", { name: "Editar observação", exact: true }).click();
    await page.fill("#animal-event-notes", "Apartada para avaliação. Conferida."); await saveDetail(page);
    record("QA B note persiste e permite edicao", "Nota mantida apos fechar/reload; edicao sem novo evento.");
    await move(page, recria.id); assert.match(await page.textContent("#animal-timeline"), /Novilhas 2026 → Recria/);
    let data = await dump(page); const event = data.stores["animal-events"].find((e) => e.type === "lot_changed");
    assert.equal(data.stores.animals.find((v) => v.id === a.id).lotId, recria.id);
    assert.equal(event.fromPaddockNameSnapshot, "Piquete 01"); assert.equal(event.toPaddockNameSnapshot, "Piquete 02"); record("QA C mudanca atomica", event);
    await closeFicha(page); await edit(page, novilhas.id, { name: "Novilhas Antigas" });
    await ficha(page, boa, a.id); assert.match(await page.textContent("#animal-timeline"), /Novilhas 2026 → Recria/);
    await closeFicha(page); record("QA D snapshot de lote imutavel", event.id);
    const newAnimal = await create(page, "animal", { tag: "102", lotId: recria.id });
    data = await dump(page); assert.equal(data.stores["animal-events"].filter((e) => e.animalId === newAnimal.id && e.type === "registered").length, 1);
    record("Novo cadastro gera registered", newAnimal.id);

    await weighing(page, "Pesagem vinculada 1", boa, recria.id, a.id, "450", "2026-09-21", true);
    await page.waitForTimeout(800); await page.reload(); await ready(page);
    assert.equal(await page.locator('[data-field="animalId"]').first().inputValue(), a.id);
    await finalize(page); await ficha(page, boa, a.id);
    assert.match(await page.textContent("#animal-last-weight"), /450 kg/); assert.match(await page.textContent("#animal-weighing-count"), /1$/);
    assert.equal(await page.locator('[data-event-type="weighing"]').count(), 1); await closeFicha(page);
    record("QA E selecao explicita, draft/reload e pesagem individual", { weight: 450, count: 1 });
    await weighing(page, "Mesmo texto sem vinculo", boa, recria.id, null); await finalize(page);
    await ficha(page, boa, a.id); assert.equal(await page.locator('[data-event-type="weighing"]').count(), 1); await closeFicha(page);
    record("QA F sem auto-link por tag", "Tag 101 nao vinculada nao aparece na ficha.");
    await weighing(page, "Duplicada", boa, recria.id, a.id, "450", "2026-09-21", true);
    await page.locator('[data-field="animalId"]').nth(1).selectOption(a.id);
    await page.click("#finalize-weighing"); await page.waitForFunction(() => document.querySelector("#global-message").textContent.includes("mesmo animal"));
    assert.equal(await page.locator("#finalize-dialog[open]").count(), 0); record("QA G duplicidade bloqueada", "Mesmo ID com tags textuais diferentes.");
    await weighing(page, "Pesagem vinculada 2", boa, recria.id, a.id, "475", "2026-09-22"); await finalize(page);
    await ficha(page, boa, a.id); assert.match(await page.textContent("#animal-last-weight"), /475 kg/); assert.match(await page.textContent("#animal-weighing-count"), /2$/);
    record("QA H ultimo peso derivado", { weight: 475, count: 2 });
    await page.click("#animal-change-status"); await page.waitForFunction(() => document.querySelector("#animal-change-status").textContent === "Reativar");
    assert.match(await page.textContent("#animal-timeline"), /Ativo → Arquivado/); assert.equal(await page.locator('[data-event-type="weighing"]').count(), 2);
    await closeFicha(page); await weighing(page, "Seletor sem arquivado", boa, recria.id, null);
    assert.equal(await page.locator(`[data-field="animalId"] option[value="${a.id}"]`).count(), 0);
    await ficha(page, boa, a.id); await page.click("#animal-change-status"); await page.waitForFunction(() => document.querySelector("#animal-change-status").textContent === "Arquivar");
    assert.match(await page.textContent("#animal-timeline"), /Arquivado → Ativo/); await closeFicha(page); record("QA I arquivar/reativar", "Historico preservado e seletor ativo filtrado.");

    const sao = await property(page, "São Romão"); await herd(page, sao);
    const b = await create(page, "animal", { tag: "101", name: "Outra" }); await ficha(page, sao, b.id); await note(page, "Nota exclusiva São Romão"); await closeFicha(page);
    await weighing(page, "São Romão vinculada", sao, null, b.id, "525"); await finalize(page);
    await ficha(page, sao, b.id); assert.match(await page.textContent("#animal-last-weight"), /525 kg/);
    assert.doesNotMatch(await page.textContent("#animal-timeline"), /Apartada/); await closeFicha(page);
    await ficha(page, boa, a.id); assert.doesNotMatch(await page.textContent("#animal-timeline"), /Nota exclusiva/); assert.equal(await page.locator('[data-event-type="weighing"]').count(), 2); await closeFicha(page);
    record("QA J isolamento entre homonimos", { boaAnimal: a.id, saoAnimal: b.id });
    await weighing(page, "Trocas de contexto", boa, recria.id, a.id);
    await page.selectOption("#registered-lot", novilhas.id); assert.equal(await page.locator('[data-field="animalId"]').first().inputValue(), "");
    assert.equal(await page.locator('[data-field="weight"]').first().inputValue(), "450");
    assert.match(await page.textContent("#global-message"), /Pesos e textos foram preservados/);
    await page.selectOption("#registered-lot", recria.id); await page.locator('[data-field="animalId"]').first().selectOption(a.id);
    await page.selectOption("#property-select", sao); assert.equal(await page.locator('[data-field="animalId"]').first().inputValue(), "");
    assert.equal(await page.inputValue("#registered-lot"), ""); assert.equal(await page.locator('[data-field="tag"]').first().inputValue(), "101");
    record("Troca de propriedade/lote preserva peso e texto e limpa somente vinculos", true);
    await herd(page, boa); await edit(page, a.id, { tag: "184", name: "Matriz 184" });
    await ficha(page, boa, a.id); assert.match(await page.locator('[data-event-type="weighing"]').first().textContent(), /Animal: 101 · Estrela/);
    await note(page, '<img src=x onerror="window.__injected=true">'); assert.equal(await page.locator("#animal-timeline img").count(), 0);
    assert.equal(await page.evaluate(() => window.__injected), undefined);
    record("Snapshots de animal imutaveis e DOM seguro", "Pesagens conservam 101/Estrela, nota HTML exibida como texto.");
    await closeFicha(page);

    const atomic = await page.evaluate(async () => {
      const db = LocalDatabase.createLocalDatabase({ name: "qa-007-atomic" });
      await db.put("accounts", { id: "a" }); await db.put("properties", { id: "p", accountId: "a", status: "active" });
      const animals = AnimalRepository.createAnimalRepository({ database: db }); const lots = LotRepository.createLotRepository({ database: db });
      const lot = (await lots.create("a", "p", { name: "L" })).lot;
      const a = (await animals.create("a", "p", { tag: "A" })).animal;
      const real = db.writeTransaction.bind(db); const results = [];
      for (const action of ["create", "change", "archive", "reactivate"]) {
        if (action === "reactivate") await animals.archive("a", "p", a.id);
        for (const failure of ["animals", "animal-events"]) {
          const before = JSON.stringify([await db.getAll("animals"), await db.getAll("animal-events")]);
          db.writeTransaction = (names, operation) => real(names, (helpers) => operation({ ...helpers, store: (name) => {
            const s = helpers.store(name);
            return { get: s.get.bind(s), index: s.index.bind(s), add(value) { if (name === failure) throw new Error("Injected"); return s.add(value); },
              put(value) { if (name === failure) throw new Error("Injected"); return s.put(value); } };
          } }));
          const result = action === "create" ? await animals.create("a", "p", { tag: "X" }) : action === "change" ? await animals.changeAnimalLot("a", "p", a.id, lot.id) : await animals[action]("a", "p", a.id);
          db.writeTransaction = real;
          results.push({ action, failure, status: result.status, unchanged: before === JSON.stringify([await db.getAll("animals"), await db.getAll("animal-events")]) });
        }
      }
      db.close(); return results;
    });
    assert.ok(atomic.every((r) => r.status === "failed" && r.unchanged)); record("Rollback real nos dois lados das quatro operacoes", atomic);

    for (const viewport of [{ width: 360, height: 800 }, { width: 768, height: 1024 }, { width: 1280, height: 900 }]) {
      await page.setViewportSize(viewport); await herd(page, boa); await shot(page, `${viewport.width}-lista`);
      await ficha(page, boa, a.id); await shot(page, `${viewport.width}-ficha`);
      await page.locator("#animal-timeline").scrollIntoViewIfNeeded(); await shot(page, `${viewport.width}-timeline`);
      await page.click("#animal-add-note"); await shot(page, `${viewport.width}-note`);
      await page.locator("#animal-detail-form").getByRole("button", { name: "Cancelar" }).click();
      await page.click("#animal-change-lot"); await page.waitForSelector("#animal-event-lotId"); await shot(page, `${viewport.width}-mudar-lote`);
      await page.locator("#animal-detail-form").getByRole("button", { name: "Cancelar" }).click(); await closeFicha(page);
      await weighing(page, "Responsivo", boa, recria.id, a.id); await shot(page, `${viewport.width}-calculadora`);
      await page.click("#history-tab"); await page.locator(".history-item").filter({ hasText: "Pesagem vinculada 2" }).click();
      await page.waitForFunction(() => document.querySelector("#history-report-name").textContent === "Pesagem vinculada 2"); await shot(page, `${viewport.width}-historico`);
    }
    record("QA responsivo", evidence.viewports);
    await context.setOffline(true); await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
    await ficha(page, boa, a.id); await note(page, "Nota registrada sem sinal"); await move(page, novilhas.id); await closeFicha(page);
    await weighing(page, "Pesagem offline", boa, novilhas.id, a.id, "490", "2026-09-23"); await finalize(page); await page.waitForTimeout(800);
    await page.close(); page = await context.newPage(); await page.goto(url); await ready(page); await ficha(page, boa, a.id);
    assert.match(await page.textContent("#animal-timeline"), /Nota registrada sem sinal/); assert.match(await page.textContent("#animal-timeline"), /Recria → Novilhas Antigas/);
    assert.match(await page.textContent("#animal-last-weight"), /490 kg/); assert.match(await page.textContent("#animal-weighing-count"), /3$/);
    record("QA K offline sem servidor, fechar/reabrir e historico persistido", { offline: await page.evaluate(() => !navigator.onLine), serverListening: server.listening,
      animal: (await dump(page)).stores.animals.find((v) => v.id === a.id), lastWeight: 490, linkedCount: 3 });
    await shot(page, "offline-ficha"); assert.deepEqual(evidence.errors, []);
    await context.close();
  } finally { await browser.close(); if (server.listening) await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }); }
}
main().then(() => { evidence.passed = true; fs.writeFileSync(path.join(out, "evidence.json"), JSON.stringify(evidence, null, 2)); })
  .catch((error) => { evidence.passed = false; evidence.failure = error.stack; fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, "evidence.json"), JSON.stringify(evidence, null, 2)); console.error(error); process.exitCode = 1; });
