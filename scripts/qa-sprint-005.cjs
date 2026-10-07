const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { createServer } = require("./serve.cjs");
const out = path.join(__dirname, "../docs/qa-sprint-005");
const evidence = { checks: [], viewports: [], errors: [], limitations: ["Android fisico e instalacao nativa nao executados", "beforeinstallprompt/appinstalled simulados apenas para verificar layout e controlador"] };
const record = (name, detail) => { evidence.checks.push({ name, passed: true, detail }); console.log(`PASS ${name}`); };
let url;
async function dump(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open("plataforma-pecuaria");
    request.onerror = () => reject(request.error.message);
    request.onsuccess = () => {
      const db = request.result;
      const data = { version: db.version, stores: {} };
      const names = [...db.objectStoreNames];
      const tx = db.transaction(names, "readonly");
      for (const name of names) tx.objectStore(name).getAll().onsuccess = (event) => { data.stores[name] = event.target.result; };
      tx.oncomplete = () => { db.close(); resolve(data); };
      tx.onerror = () => reject(tx.error.message);
    };
  }));
}
async function ready(page) {
  await page.waitForFunction(() => document.querySelector("#save-status").classList.contains("saved"));
}
async function shot(page, name) {
  if (await page.locator("#history.active .history-item").count()) {
    await page.waitForSelector("#history-detail-content:not(.hidden)");
  }
  await page.evaluate(() => Promise.all([...document.images].map((image) => image.decode())));
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const size = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  assert.ok(size.scrollWidth <= size.width, `${name} overflow ${JSON.stringify(size)}`);
  evidence.viewports.push({ name, ...size });
  await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true });
}
async function property(page, name) {
  await page.click("#property-tab"); await page.click("#new-property");
  await page.fill("#property-form-name", name);
  await page.fill("#property-municipality", "Uberaba"); await page.fill("#property-state", "MG");
  await page.click("#save-property");
  await page.waitForSelector("#property-form.hidden", { state: "attached" });
  return page.locator(".property-card").filter({ hasText: name }).getAttribute("data-property-id");
}
async function weighing(page, name, propertyId) {
  await page.click("#calculator-tab");
  await page.fill("#weighing-name", name);
  if (propertyId) await page.selectOption("#property-select", propertyId);
  await page.fill("#arroba-price", "300,00"); await page.fill("#yield-rate", "50");
  for (const [index, weight] of [450, 510].entries()) {
    await page.click("#add-animal");
    await page.locator('#animal-rows [data-field="tag"]').nth(index).fill(`B${index + 1}`);
    await page.locator('#animal-rows [data-field="weight"]').nth(index).fill(String(weight));
  }
  assert.equal(await page.textContent("#total-animals"), "2");
  assert.equal(await page.textContent("#total-weight"), "960 kg");
  assert.equal(await page.textContent("#average-weight"), "480 kg");
  assert.equal(await page.textContent("#total-arrobas"), "32 @");
  assert.match(await page.textContent("#estimated-value"), /9\.600,00/);
}
async function finalize(page) {
  await page.click("#finalize-weighing"); await page.waitForSelector("#finalize-dialog[open]");
  await page.click("#confirm-finalize"); await page.waitForSelector("#finalize-feedback:not(.hidden)");
}
async function main() {
  fs.mkdirSync(out, { recursive: true });
  let baseline = true;
  const server = createServer({ baseline: () => baseline, scope: "app/" });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${server.address().port}/app/`;
  const browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  try {
    const migration = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    let page = await migration.newPage();
    await page.goto(url); await ready(page);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload(); await ready(page);
    await page.locator(".topbar").screenshot({ path: path.join(out, "before-header.png") });
    const id = await property(page, "Boa Vista"); await shot(page, "before-properties");
    await weighing(page, "Pesagem de referencia", id); await finalize(page);
    await page.click("#history-tab"); await page.locator(".history-item").first().click();
    await shot(page, "before-history");
    await page.click("#calculator-tab"); await page.fill("#weighing-name", "Rascunho preservado");
    await page.waitForTimeout(800);
    await shot(page, "before-calculator");
    const before = await dump(page);
    assert.equal(before.stores.drafts.length, 1);
    assert.ok((await page.evaluate(() => caches.keys())).includes("plataforma-pecuaria-shell-v2"));
    baseline = false;
    await page.evaluate(async () => { const reg = await navigator.serviceWorker.ready; await reg.update(); });
    await page.waitForFunction(async () => Boolean((await navigator.serviceWorker.getRegistration()).waiting));
    const observer = await migration.newPage();
    await observer.goto(new URL("/qa-observer", url).href);
    await page.close();
    await observer.waitForFunction(async (scope) => {
      const reg = await navigator.serviceWorker.getRegistration(scope);
      return reg && !reg.waiting && reg.active?.state === "activated";
    }, url);
    await observer.waitForTimeout(500);
    page = await migration.newPage(); await page.goto(url); await ready(page);
    await page.waitForFunction(async () => (await caches.keys()).includes("plataforma-pecuaria-shell-v3") && !(await caches.keys()).includes("plataforma-pecuaria-shell-v2"));
    const after = await dump(page);
    assert.deepEqual(after, before);
    await page.waitForTimeout(500);
    assert.deepEqual(await page.evaluate(() => caches.keys()), ["plataforma-pecuaria-shell-v3"]);
    record("cache-v2-to-v3-preserves-all-stores", { version: after.version, counts: Object.fromEntries(Object.entries(after.stores).map(([k,v]) => [k,v.length])), caches: await page.evaluate(() => caches.keys()) });
    await shot(page, "after-calculator"); await page.locator(".topbar").screenshot({ path: path.join(out, "after-header.png") });
    await page.click("#property-tab"); await shot(page, "after-properties");
    await page.click("#history-tab"); await page.locator(".history-item").first().click(); await shot(page, "after-history");
    // An unrelated navigation must not replace the cached application entry.
    await page.goto(url + "README.md");
    const cached = await page.evaluate(async () => (await (await caches.open("plataforma-pecuaria-shell-v3")).match(new URL("index.html", location.href))).text());
    assert.match(cached, /brand-symbol/); assert.match(cached, /<html/);
    record("index-cache-protection", "README navigation did not replace index HTML");
    await migration.close();

    for (const [width, height] of [[1280,900],[768,1024],[360,800]]) {
      const context = await browser.newContext({ viewport: { width, height }, acceptDownloads: true });
      let page = await context.newPage();
      page.on("pageerror", (error) => evidence.errors.push(error.message));
      await page.goto(url); await ready(page); await page.evaluate(() => navigator.serviceWorker.ready);
      await page.reload(); await ready(page);
      await shot(page, `${width}-calculator-empty`);
      await page.click("#history-tab"); await shot(page, `${width}-history-empty`);
      await page.click("#property-tab"); await page.click("#new-property");
      await page.fill("#property-form-name", "Boa Vista"); await page.fill("#property-municipality", "Uberaba"); await page.fill("#property-state", "MG");
      await shot(page, `${width}-property-form`);
      await page.click("#save-property"); await page.waitForSelector("#property-form.hidden", {state:"attached"});
      const id = await page.locator(".property-card").first().getAttribute("data-property-id");
      await shot(page, `${width}-properties`);
      await weighing(page, "Pesagem de referencia", id);
      assert.ok(await page.locator(".bar-fill").last().evaluate((el) => el.getBoundingClientRect().width > 0));
      await shot(page, `${width}-calculator-filled`);
      const downloadPromise = page.waitForEvent("download"); await page.click("#export-current-csv");
      const download = await downloadPromise; const csv = fs.readFileSync(await download.path(), "utf8");
      assert.ok(csv.includes("450") && csv.includes("510"));
      if (width === 1280) fs.writeFileSync(path.join(out, "reference.csv"), csv);
      await page.locator("#weighing-name").focus();
      assert.equal(await page.locator("#weighing-name").evaluate((el) => getComputedStyle(el).outlineStyle), "solid");
      // Same event task: edit and confirm before the 500ms autosave debounce.
      await page.evaluate(() => {
        const name = document.querySelector("#weighing-name"); name.value = "Referencia finalizada"; name.dispatchEvent(new Event("input", {bubbles:true}));
        document.querySelector("#finalize-weighing").click(); document.querySelector("#confirm-finalize").click();
      });
      await page.waitForSelector("#finalize-feedback:not(.hidden)"); await page.waitForTimeout(800);
      let data = await dump(page);
      assert.equal(data.stores.drafts.length, 0); assert.equal(data.stores["weighing-sessions"].length, 1);
      const snapshot = JSON.stringify(data.stores["weighing-sessions"]);
      await page.fill("#weighing-name", "Edicao legitima"); await page.waitForTimeout(800);
      assert.equal((await dump(page)).stores.drafts.length, 1);
      await page.click("#load-demo"); await shot(page, `${width}-demo`);
      await page.reload(); await ready(page);
      assert.equal(await page.inputValue("#weighing-name"), "Edicao legitima");
      assert.equal(JSON.stringify((await dump(page)).stores["weighing-sessions"]), snapshot);
      await page.click("#history-tab"); await page.selectOption("#history-property-filter", id);
      await page.locator(".history-item").first().click(); await shot(page, `${width}-history`);
      await page.locator(".history-detail").screenshot({ path: path.join(out, `${width}-history-detail.png`) });
      await page.emulateMedia({media:"print"});
      const visibleButtons = await page.locator("button").evaluateAll((items) => items.filter((item) => item.getClientRects().length).length);
      assert.equal(visibleButtons, 0);
      assert.match(await page.textContent("#history-report-property"), /Boa Vista/);
      if (width === 1280) {
        await page.screenshot({path:path.join(out,"romaneio-print.png"),fullPage:true});
        await page.pdf({path:path.join(out,"romaneio.pdf"),format:"A4",printBackground:true});
      }
      await page.emulateMedia({media:"screen"});
      await page.click("#property-tab"); await page.getByRole("button",{name:"Arquivar",exact:true}).click();
      await page.waitForSelector('.property-card[data-status="archived"]'); await shot(page, `${width}-archived`);
      await page.getByRole("button",{name:"Reativar",exact:true}).click(); await page.waitForSelector('.property-card[data-status="active"]');
      await page.click("#calculator-tab"); await page.fill("#arroba-price", "-1");
      await page.locator('#animal-rows [data-field="weight"]').first().fill("0"); await shot(page, `${width}-error`);
      assert.ok((await page.textContent("#arroba-price-message")).length > 0);
      await page.click("#clear-weighing"); await page.waitForTimeout(300);
      // Exercise actual controller with a simulated availability event, not native installation.
      await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
      assert.equal(await page.locator(".pwa-controls").evaluate((el) => el.getBoundingClientRect().height), 0);
      const collapsedHeight = await page.locator(".topbar").evaluate((el) => el.getBoundingClientRect().height);
      await page.evaluate(() => {
        const event = new Event("beforeinstallprompt",{cancelable:true}); event.prompt = async () => {};
        event.userChoice = Promise.resolve({outcome:"dismissed"}); window.dispatchEvent(event);
      });
      await shot(page, `${width}-install-available`); await page.click("#install-app");
      assert.equal(await page.locator(".pwa-controls").evaluate((el) => el.getBoundingClientRect().height), 0);
      await context.setOffline(true); await page.close();
      page = await context.newPage(); await page.goto(url); await ready(page);
      assert.equal(await page.locator(".brand-symbol").evaluate((el) => el.complete && el.naturalWidth > 0), true);
      assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), "rgb(245, 247, 244)");
      await weighing(page, "Pesagem offline", id); await finalize(page);
      await page.click("#history-tab"); await page.selectOption("#history-property-filter", id);
      await page.locator(".history-item").first().click(); await shot(page, `${width}-offline-history`);
      data = await dump(page); assert.equal(data.stores["weighing-sessions"].length, 2);
      await page.click("#delete-history-session"); await page.click("#confirm-delete");
      await page.waitForFunction(() => document.querySelectorAll(".history-item").length === 1);
      data = await dump(page); assert.equal(data.stores["weighing-sessions"].length, 1); assert.equal(data.stores["weighing-items"].length, 2);
      record(`workflow-${width}`, {reference:"960kg / 480kg / 32@ / R$9600",csv:true,autosaveRace:true,editAfterFinalization:true,demoReload:true,historyFilter:true,printButtonsHidden:true,archiveReactivate:true,offlineReopenFinalizeHistory:true,deletion:true,collapsedHeaderHeight:collapsedHeight});
      await context.close();
    }
    assert.deepEqual(evidence.errors, []);
  } finally {
    await browser.close(); await new Promise((resolve) => server.close(resolve));
    fs.writeFileSync(path.join(out,"results.json"), JSON.stringify(evidence,null,2)+"\n");
  }
  console.log(`Completed ${evidence.checks.length} scenario groups, ${evidence.viewports.length} layout checks.`);
}
main().catch((error) => { console.error(error); process.exitCode=1; });
