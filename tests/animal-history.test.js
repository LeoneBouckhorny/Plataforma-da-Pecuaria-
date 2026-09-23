const test = require("node:test");
const assert = require("node:assert/strict");
const { fixture } = require("./herd-test-helpers.js");
const Weighing = require("../src/weighing-history-core.js");
const { createWeighingRepository } = require("../src/weighing-repository.js");
const { createAnimalHistoryRepository } = require("../src/animal-history-repository.js");
const { createAnimalEventRepository } = require("../src/animal-event-repository.js");
const Draft = require("../src/local-data-core.js");
function snapshot(animalId, overrides = {}, items) {
  return Weighing.buildSnapshot({ accountId: "a", propertyId: "p", weighingDate: "2026-09-21",
    settings: { arrobaPrice: "300", yieldRate: "50", lightLimit: "300", mediumLimit: "480" },
    animals: items || [{ id: "row1", animalId, tag: "101", weight: "450" }], ...overrides }).snapshot;
}
test("vinculo explicito captura snapshots e timeline combina eventos, nascimento e pesagens", async () => {
  const f = fixture(); const a = (await f.animal.create("a", "p", { tag: "101", name: "Original", birthDate: "2025-08-10" })).animal;
  const repo = createWeighingRepository({ database: f.database }); const history = createAnimalHistoryRepository({ database: f.database });
  const notes = createAnimalEventRepository({ database: f.database });
  await notes.createNoteEvent("a", "p", a.id, { notes: "Nota", occurredAt: "2026-09-20T10:00:00Z" });
  assert.equal((await repo.saveCompletedSession(snapshot(a.id))).status, "saved");
  const second = snapshot(a.id, { weighingDate: "2026-09-22" }, [{ id: "row", animalId: a.id, tag: "101", weight: "475" }]);
  await repo.saveCompletedSession(second);
  const beforeItems = await f.database.getAll("weighing-items");
  await f.animal.update("a", "p", a.id, { tag: "184", name: "Matriz 184" });
  const result = await history.getAnimalHistory("a", "p", a.id);
  assert.equal(result.lastWeight, 475); assert.equal(result.weighingCount, 2); assert.equal(result.lastWeighingDate, "2026-09-22");
  assert.ok(result.timeline.some((e) => e.type === "birth" && e.derived));
  assert.equal(result.timeline.filter((e) => e.type === "weighing").length, 2);
  assert.equal(result.timeline[0].type, "weighing");
  assert.deepEqual(await f.database.getAll("weighing-items"), beforeItems);
  assert.ok(beforeItems.every((item) => item.animalTagSnapshot === "101" && item.animalNameSnapshot === "Original"));
  assert.equal((await f.database.getAll("animal-events")).length, 2);
  assert.equal("lastWeight" in result.animal, false);
  await f.animal.archive("a", "p", a.id);
  assert.equal((await history.getAnimalHistory("a", "p", a.id)).weighingCount, 2);
});
test("nao infere animalId por tag no draft, finalizacao, legado ou historico", async () => {
  const f = fixture(); const a = (await f.animal.create("a", "p", { tag: "101" })).animal;
  const draft = Draft.normalizeDraftData({ animals: [{ id: "item", tag: "101", weight: "450" }] });
  assert.equal(draft.animals[0].animalId, null);
  assert.equal(Draft.deserializeDraft(Draft.serializeDraft({ animals: [{ id: "item", animalId: a.id, tag: "101", weight: "450" }] })).draft.data.animals[0].animalId, a.id);
  const repo = createWeighingRepository({ database: f.database });
  await repo.saveCompletedSession(snapshot(null));
  assert.equal((await f.database.getAll("weighing-items"))[0].animalId, null);
  const history = await createAnimalHistoryRepository({ database: f.database }).getAnimalHistory("a", "p", a.id);
  assert.equal(history.weighingCount, 0); assert.equal(history.lastWeight, null);
});
test("cadastro legado e nascimento sao derivados sem inserir eventos", async () => {
  const f = fixture();
  f.database.stores.animals.set("legacy", { id: "legacy", accountId: "a", propertyId: "p", createdAt: "2024-01-01T12:00:00Z", birthDate: "2023-01-01" });
  const repo = createAnimalHistoryRepository({ database: f.database });
  const h = await repo.getAnimalHistory("a", "p", "legacy");
  assert.deepEqual(h.timeline.map((e) => e.type), ["legacy_registered", "birth"]);
  assert.ok(h.timeline.every((e) => e.derived));
  f.database.stores.animals.get("legacy").birthDate = "2022-01-01";
  assert.match((await repo.getAnimalHistory("a", "p", "legacy")).timeline.find((e) => e.type === "birth").occurredAt, /^2022/);
  assert.equal(f.database.stores["animal-events"].size, 0);
});
test("duplicidade de animalId bloqueia finalizacao mesmo com tags diferentes", async () => {
  const f = fixture(); const a = (await f.animal.create("a", "p", { tag: "101" })).animal;
  const snap = snapshot(a.id); snap.items.push({ ...snap.items[0], id: "other", tagSnapshot: "outra" });
  const result = await createWeighingRepository({ database: f.database }).saveCompletedSession(snap);
  assert.equal(result.status, "invalid"); assert.match(result.errors.join(" "), /mesmo animal/);
  assert.equal(f.database.stores["weighing-items"].size, 0);
});
for (const scenario of ["missing", "other-property", "other-account", "archived", "wrong-lot"]) test(`finalizacao revalida ${scenario}`, async () => {
  const f = fixture();
  const l = (await f.lot.create("a", "p", { name: "L" })).lot;
  const a = (await f.animal.create(scenario === "other-account" ? "b" : "a", scenario === "other-account" ? "r" : scenario === "other-property" ? "q" : "p", { tag: "101" })).animal;
  if (scenario === "archived") await f.animal.archive("a", "p", a.id);
  const snap = snapshot(scenario === "missing" ? "missing" : a.id, scenario === "wrong-lot" ? { lotId: l.id } : {});
  assert.equal((await createWeighingRepository({ database: f.database }).saveCompletedSession(snap)).status, "failed");
  assert.equal(f.database.stores["weighing-sessions"].size, 0); assert.equal(f.database.stores["weighing-items"].size, 0);
});
test("historico nao vaza eventos/pesagens entre animais homonimos ou conta/propriedade", async () => {
  const f = fixture(); const repo = createWeighingRepository({ database: f.database });
  const history = createAnimalHistoryRepository({ database: f.database });
  const a = (await f.animal.create("a", "p", { tag: "101" })).animal;
  const b = (await f.animal.create("a", "q", { tag: "101" })).animal;
  await repo.saveCompletedSession(snapshot(a.id)); await repo.saveCompletedSession(snapshot(b.id, { propertyId: "q" }));
  const forged = snapshot(a.id, { propertyId: "q" });
  f.database.stores["weighing-sessions"].set(forged.session.id, forged.session);
  f.database.stores["weighing-items"].set(forged.items[0].id, forged.items[0]);
  assert.equal((await history.getAnimalHistory("a", "p", a.id)).weighingCount, 1);
  assert.equal((await history.getAnimalHistory("a", "q", b.id)).weighingCount, 1);
  assert.equal((await history.getAnimalHistory("b", "p", a.id)).status, "missing");
  assert.equal((await history.getAnimalHistory("a", "q", a.id)).status, "missing");
});
