const test = require("node:test");
const assert = require("node:assert/strict");
const { fixture } = require("./herd-test-helpers.js");
const Draft = require("../src/local-data-core.js");
const Herd = require("../src/herd-core.js");
const History = require("../src/weighing-history-core.js");
const { createWeighingRepository } = require("../src/weighing-repository.js");
function source(overrides = {}) {
  return { accountId: "a", propertyId: "p", settings: { arrobaPrice: "300", yieldRate: "50", lightLimit: "300", mediumLimit: "480" },
    animals: [{ id: "a1", tag: "101", weight: "450" }, { id: "a2", tag: "102", weight: "510" }], ...overrides };
}
test("draft antigo normaliza lotId null, novo preserva ID/nome e temporarios", () => {
  assert.equal(Draft.normalizeDraftData({ propertyName: "Lote A" }).lotId, null);
  const data = source({ lotId: "lot", lotName: "Lote A", usePaddocks: true, paddocks: [{ id: "tmp", name: "P1", max: "20", current: "2" }] });
  const normalized = Draft.deserializeDraft(Draft.serializeDraft(data)).draft.data;
  assert.equal(normalized.lotId, "lot"); assert.equal(normalized.lotName, "Lote A");
  assert.deepEqual(normalized.paddocks, data.paddocks);
  assert.equal(normalized.animals[0].id, "a1");
});
test("selecao por ID limpa lote de outra propriedade/conta ou arquivado", () => {
  const lot = { id: "l", accountId: "a", propertyId: "p", status: "active" };
  assert.equal(Herd.selectLot([lot], "a", "p", "l"), lot);
  assert.equal(Herd.selectLot([lot], "a", "q", "l"), null);
  assert.equal(Herd.selectLot([lot], "b", "p", "l"), null);
  assert.equal(Herd.selectLot([{ ...lot, status: "archived" }], "a", "p", "l"), null);
});
test("historico captura lote/pasto atuais atomicamente e nao muda apos renomear/mover", async () => {
  const f = fixture();
  const p = (await f.paddock.create("a", "p", { name: "P1" })).paddock;
  const l = (await f.lot.create("a", "p", { name: "Novilhas", paddockId: p.id })).lot;
  await f.animal.create("a", "p", { tag: "101", lotId: l.id });
  const repo = createWeighingRepository({ database: f.database });
  const snapshot = History.buildSnapshot(source({ lotId: l.id, lotName: "Nome stale", paddockName: "Stale" })).snapshot;
  const saved = await repo.saveCompletedSession(snapshot);
  assert.equal(saved.status, "saved");
  assert.equal(saved.session.lotNameSnapshot, "Novilhas");
  assert.equal(saved.session.paddockNameSnapshot, "P1");
  assert.equal(saved.session.paddockId, p.id);
  assert.equal(saved.session.totalAnimals, 2); assert.equal(saved.session.totalWeight, 960);
  assert.equal(saved.session.averageWeight, 480); assert.equal(saved.session.totalArrobas, 32);
  assert.equal(saved.session.estimatedValue, 9600);
  await f.lot.update("a", "p", l.id, { name: "Novo", paddockId: null });
  await f.paddock.update("a", "p", p.id, { name: "Outro" });
  assert.deepEqual((await repo.getSession(saved.session.id)).session, saved.session);
  assert.ok((await repo.getItems(saved.session.id)).items.every((item) => item.animalId === null));
});
test("pesagem rejeita lote cross-property e arquivado sem gravar sessao/itens", async () => {
  const f = fixture(); const repo = createWeighingRepository({ database: f.database });
  const l = (await f.lot.create("a", "q", { name: "L" })).lot;
  assert.equal((await repo.saveCompletedSession(History.buildSnapshot(source({ lotId: l.id })).snapshot)).status, "failed");
  await f.lot.archive("a", "q", l.id);
  assert.equal((await repo.saveCompletedSession(History.buildSnapshot(source({ propertyId: "q", lotId: l.id })).snapshot)).status, "failed");
  assert.equal(f.database.stores["weighing-sessions"].size, 0);
  assert.equal(f.database.stores["weighing-items"].size, 0);
});
test("historico filtra lotes homonimos por ID e combina filtro propriedade/sem vinculo", async () => {
  const f = fixture(); const repo = createWeighingRepository({ database: f.database });
  const p = (await f.lot.create("a", "p", { name: "Lote A" })).lot;
  const q = (await f.lot.create("a", "q", { name: "Lote A" })).lot;
  for (const lot of [p, q]) assert.equal((await repo.saveCompletedSession(History.buildSnapshot(source({ propertyId: lot.propertyId, lotId: lot.id })).snapshot)).status, "saved");
  await repo.saveCompletedSession(History.buildSnapshot(source({ propertyId: null })).snapshot);
  assert.equal((await repo.listSessions({ lotId: p.id })).sessions.length, 1);
  assert.equal((await repo.listSessions({ propertyId: "q", lotId: p.id })).sessions.length, 0);
  assert.equal((await repo.listSessions({ propertyId: "q", lotId: q.id })).sessions.length, 1);
  assert.equal((await repo.listSessions({ lotId: null })).sessions.length, 1);
  assert.equal(History.normalizeSession({}).lotId, null);
  assert.equal(History.normalizeSession({}).paddockId, null);
});
