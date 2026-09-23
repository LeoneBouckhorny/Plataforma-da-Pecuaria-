const test = require("node:test");
const assert = require("node:assert/strict");
const { fixture } = require("./herd-test-helpers.js");
const { createHealthRepository } = require("../src/health-repository.js");
const data = { healthType: "vaccination", occurredAt: "2026-09-23T12:00:00Z", productName: "Produto X", doseValue: "5", doseUnit: "mL" };
async function setup(count = 5) {
  const f = fixture(); const paddock = (await f.paddock.create("a", "p", { name: "P01" })).paddock;
  const lot = (await f.lot.create("a", "p", { name: "Novilhas A", tagSuffix: "A", paddockId: paddock.id })).lot;
  const animals = [];
  for (let i = 1; i <= count; i++) animals.push((await f.animal.create("a", "p", { tagNumber: i, lotId: lot.id })).animal);
  return { ...f, lotRepo: f.lot, paddockRepo: f.paddock, paddock, lot, animals, health: createHealthRepository({ database: f.database }) };
}
test("individual captura contexto real, nao aceita snapshots ou identidade forjados", async () => {
  const f = await setup(); const animal = f.animals[0];
  const result = await f.health.register("a", "p", [animal.id], { ...data, type: "note", accountId: "b", animalId: "fake", lotNameSnapshot: "fake", operationId: "fake" });
  assert.equal(result.status, "saved"); const e = result.events[0];
  assert.equal(e.animalId, animal.id); assert.equal(e.accountId, "a"); assert.equal(e.type, "health"); assert.notEqual(e.operationId, "fake");
  assert.equal(e.lotId, f.lot.id); assert.equal(e.lotNameSnapshot, "Novilhas A");
  assert.equal(e.paddockId, f.paddock.id); assert.equal(e.paddockNameSnapshot, "P01");
  await f.lotRepo.update("a", "p", f.lot.id, { name: "Renomeado" }); await f.paddockRepo.update("a", "p", f.paddock.id, { name: "Outro" });
  assert.equal((await f.health.list("a", "p")).events[0].lotNameSnapshot, "Novilhas A");
  assert.equal((await f.health.list("a", "p")).events[0].paddockNameSnapshot, "P01");
});
test("coletivo selecionado cria quatro UUIDs e operationId compartilhado; excluido nao recebe evento", async () => {
  const f = await setup(); const ids = [0, 1, 2, 4].map((i) => f.animals[i].id);
  const result = await f.health.register("a", "p", ids, data, { lotId: f.lot.id });
  assert.equal(result.status, "saved"); assert.equal(new Set(result.events.map((e) => e.id)).size, 4);
  assert.equal(new Set(result.events.map((e) => e.operationId)).size, 1);
  assert.match(result.operationId, /^[0-9a-f-]{36}$/i);
  assert.equal(result.events.some((e) => e.animalId === f.animals[3].id), false);
  const next = await f.health.register("a", "p", [f.animals[3].id], data); assert.notEqual(next.operationId, result.operationId);
});
test("isolamento e revalidacao rejeitam conta/propriedade/animal incorretos sem escrita", async () => {
  const f = await setup(); const before = structuredClone(f.database.stores);
  for (const [accountId, propertyId, ids] of [["b", "p", [f.animals[0].id]], ["a", "q", [f.animals[0].id]], ["a", "p", ["missing"]]]) {
    assert.equal((await f.health.register(accountId, propertyId, ids, data)).status, "invalid");
  }
  assert.deepEqual(f.database.stores, before);
  assert.equal((await f.health.list("b", "p")).status, "missing");
  assert.equal((await f.health.list("a", "q")).events.length, 0);
});
test("selecao vazia/repetida, produto invalido e propriedade arquivada nao gravam", async () => {
  const f = await setup(); const id = f.animals[0].id; const before = structuredClone(f.database.stores);
  for (const ids of [[], [id, id], [null]]) assert.equal((await f.health.register("a", "p", ids, data)).status, "invalid");
  assert.equal((await f.health.register("a", "p", [id], { ...data, productName: "" })).status, "invalid");
  assert.deepEqual(f.database.stores, before);
  f.database.stores.properties.get("p").status = "archived";
  assert.equal((await f.health.register("a", "p", [id], data)).status, "invalid");
});
test("archived preserva historico e nao pode receber novo manejo", async () => {
  const f = await setup(); const id = f.animals[0].id;
  await f.health.register("a", "p", [id], data); await f.animal.archive("a", "p", id);
  const before = structuredClone(f.database.stores);
  assert.equal((await f.health.register("a", "p", [id, f.animals[1].id], data)).status, "invalid");
  assert.deepEqual(f.database.stores, before); assert.equal((await f.health.list("a", "p")).events.length, 1);
});
test("animal movido apos selecao coletiva bloqueia toda a operacao", async () => {
  const f = await setup(); await f.animal.changeAnimalLot("a", "p", f.animals[0].id, null);
  const before = structuredClone(f.database.stores);
  assert.equal((await f.health.register("a", "p", f.animals.map((a) => a.id), data, { lotId: f.lot.id })).status, "invalid");
  assert.deepEqual(f.database.stores, before);
  const single = await f.health.register("a", "p", [f.animals[0].id], data);
  assert.equal(single.events[0].lotId, null); assert.equal(single.events[0].paddockId, null);
});
test("falha no evento18 de30 faz rollback integral", async () => {
  const f = await setup(30); const before = structuredClone(f.database.stores);
  const original = f.database.writeTransaction.bind(f.database);
  f.database.writeTransaction = (names, operation) => original(names, (helpers) => {
    let count = 0; return operation({ ...helpers, store: (name) => {
      const store = helpers.store(name); return name === "animal-events" ? { ...store, add: (record) => {
        if (++count === 18) throw new Error("Injected failure18"); return store.add(record);
      } } : store;
    } });
  });
  assert.equal((await f.health.register("a", "p", f.animals.map((a) => a.id), data)).status, "failed");
  assert.deepEqual(f.database.stores, before);
});
test("listagem aplica filtros ao evento e nao ao lote atual", async () => {
  const f = await setup(); const id = f.animals[0].id; await f.health.register("a", "p", [id], data);
  await f.animal.changeAnimalLot("a", "p", id, null);
  assert.equal((await f.health.list("a", "p", { lotId: f.lot.id, healthType: "vaccination" })).events.length, 1);
  assert.equal((await f.health.list("a", "p", { healthType: "medication" })).events.length, 0);
});
