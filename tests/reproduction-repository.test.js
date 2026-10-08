const test = require("node:test");
const assert = require("node:assert/strict");
const { fixture } = require("./herd-test-helpers.js");
const { createReproductionRepository } = require("../src/reproduction-repository.js");
const data = { reproductionType: "natural_service", occurredAt: "2026-10-07T12:00:00Z" };
async function setup() {
  const fixtureData = fixture();
  const paddockRecord = (await fixtureData.paddock.create("a", "p", { name: "Pasto A" })).paddock;
  const lotRecord = (await fixtureData.lot.create("a", "p", { name: "Matrizes", tagSuffix: "A", paddockId: paddockRecord.id })).lot;
  const matrix = (await fixtureData.animal.create("a", "p", { tagNumber: 23, lotId: lotRecord.id, sex: "female", name: "Matriz" })).animal;
  const bull = (await fixtureData.animal.create("a", "p", { tagNumber: 24, lotId: lotRecord.id, sex: "male", name: "Touro original" })).animal;
  assert.ok(matrix); assert.ok(bull);
  return { ...fixtureData, matrix, bull, lotRecord, paddockRecord, reproduction: createReproductionRepository({ database: fixtureData.database }) };
}
test("cobertura captura IDs e snapshots reais e nao altera cadastro", async () => {
  const fixtureData = await setup(); const before = structuredClone(fixtureData.database.stores.animals);
  const result = await fixtureData.reproduction.register("a", "p", fixtureData.matrix.id, { ...data, sireAnimalId: fixtureData.bull.id, sireNameSnapshot: "forjado", type: "note", animalId: "fake", accountId: "b", lotNameSnapshot: "fake" });
  assert.equal(result.status, "saved"); const event = result.event;
  assert.equal(event.type, "reproduction"); assert.equal(event.animalId, fixtureData.matrix.id); assert.equal(event.accountId, "a");
  assert.equal(event.sireNameSnapshot, "Touro original"); assert.equal(event.sireTagSnapshot, "0024A"); assert.equal(event.sireAnimalId, fixtureData.bull.id);
  assert.equal(event.lotNameSnapshot, "Matrizes"); assert.equal(event.paddockNameSnapshot, "Pasto A");
  assert.deepEqual(fixtureData.database.stores.animals, before);
  await fixtureData.animal.update("a", "p", fixtureData.bull.id, { name: "Renomeado" });
  await fixtureData.lot.update("a", "p", fixtureData.lotRecord.id, { name: "Outro lote" });
  assert.deepEqual((await fixtureData.reproduction.list("a", "p")).events[0], event);
});
test("reprodutor externo e inseminacao nao inferem vinculo por texto", async () => {
  const fixtureData = await setup();
  for (const reproductionType of ["natural_service", "artificial_insemination"]) {
    const result = await fixtureData.reproduction.register("a", "p", fixtureData.matrix.id, { ...data, reproductionType, externalSire: fixtureData.bull.tag, semenBatch: "ABC123", technician: "Técnico" });
    assert.equal(result.status, "saved"); assert.equal(result.event.sireAnimalId, null); assert.equal(result.event.externalSire, "0024A");
    assert.equal(result.event.semenBatch, reproductionType === "artificial_insemination" ? "ABC123" : null);
  }
});
test("sire inexistente, cross-property, cross-account, female e unknown bloqueados", async () => {
  const fixtureData = await setup();
  for (const change of [{ id: "missing" }, { propertyId: "q" }, { accountId: "b" }, { sex: "female" }, { sex: "unknown" }]) {
    fixtureData.database.stores.animals.set(fixtureData.bull.id, { ...fixtureData.bull, ...change });
    const before = structuredClone(fixtureData.database.stores);
    const sireAnimalId = change.id || fixtureData.bull.id;
    assert.equal((await fixtureData.reproduction.register("a", "p", fixtureData.matrix.id, { ...data, sireAnimalId })).status, "invalid");
    assert.deepEqual(fixtureData.database.stores, before);
  }
});
test("todos os cinco eventos de matriz bloqueados para male", async () => {
  const fixtureData = await setup(); const before = structuredClone(fixtureData.database.stores);
  for (const reproductionType of Object.keys(require("../src/animal-event-core.js").REPRODUCTION_TYPES)) {
    assert.equal((await fixtureData.reproduction.register("a", "p", fixtureData.bull.id, { ...data, reproductionType, result: "pregnant", calfCount: 1 })).status, "invalid");
  }
  assert.deepEqual(fixtureData.database.stores, before);
});
test("unknown permitido com aviso e sem alterar sexo ou criar bezerros", async () => {
  const fixtureData = await setup(); fixtureData.database.stores.animals.get(fixtureData.matrix.id).sex = "unknown";
  const before = structuredClone(fixtureData.database.stores.animals);
  const result = await fixtureData.reproduction.register("a", "p", fixtureData.matrix.id, { ...data, reproductionType: "calving", calfCount: 1, femaleCalves: 1 });
  assert.equal(result.status, "saved"); assert.match(result.warning, /Sexo não informado/); assert.deepEqual(fixtureData.database.stores.animals, before);
});
test("matriz e sire arquivados bloqueiam novo registro e preservam historico", async () => {
  const fixtureData = await setup(); const input = { ...data, sireAnimalId: fixtureData.bull.id };
  const saved = await fixtureData.reproduction.register("a", "p", fixtureData.matrix.id, input);
  await fixtureData.animal.archive("a", "p", fixtureData.bull.id);
  assert.equal((await fixtureData.reproduction.register("a", "p", fixtureData.matrix.id, input)).status, "invalid");
  await fixtureData.animal.archive("a", "p", fixtureData.matrix.id);
  assert.equal((await fixtureData.reproduction.register("a", "p", fixtureData.matrix.id, data)).status, "invalid");
  assert.deepEqual((await fixtureData.reproduction.list("a", "p")).events, [saved.event]);
});
test("isolamento de leitura/escrita e propriedade arquivada", async () => {
  const fixtureData = await setup(); await fixtureData.reproduction.register("a", "p", fixtureData.matrix.id, data);
  for (const [accountId, propertyId] of [["b", "p"], ["a", "q"], ["b", "r"]]) {
    assert.equal((await fixtureData.reproduction.register(accountId, propertyId, fixtureData.matrix.id, data)).status, "invalid");
    assert.equal((await fixtureData.reproduction.list(accountId, propertyId)).events.length, 0);
  }
  fixtureData.database.stores.properties.get("p").status = "archived";
  assert.equal((await fixtureData.reproduction.register("a", "p", fixtureData.matrix.id, data)).status, "invalid");
});
test("filtros usam contexto do evento, nao lote atual", async () => {
  const fixtureData = await setup(); await fixtureData.reproduction.register("a", "p", fixtureData.matrix.id, data);
  await fixtureData.animal.changeAnimalLot("a", "p", fixtureData.matrix.id, null);
  assert.equal((await fixtureData.reproduction.list("a", "p", { lotId: fixtureData.lotRecord.id })).events.length, 1);
  const result = await fixtureData.reproduction.register("a", "p", fixtureData.matrix.id, data);
  assert.equal(result.event.lotId, null); assert.equal(result.event.paddockId, null);
});
test("falha na escrita nao altera evento nem animal; colisao de ID nao sobrescreve", async () => {
  const fixtureData = await setup(); const before = structuredClone(fixtureData.database.stores);
  fixtureData.database.failStore = "animal-events";
  assert.equal((await fixtureData.reproduction.register("a", "p", fixtureData.matrix.id, data)).status, "failed");
  assert.deepEqual(fixtureData.database.stores, before); fixtureData.database.failStore = null;
  const repository = createReproductionRepository({ database: fixtureData.database, idFactory: () => "same" });
  assert.equal((await repository.register("a", "p", fixtureData.matrix.id, data)).status, "saved");
  const saved = structuredClone(fixtureData.database.stores);
  assert.equal((await repository.register("a", "p", fixtureData.matrix.id, data)).status, "failed");
  assert.deepEqual(fixtureData.database.stores, saved);
});
test("valores invalidos e referencias de localizacao corrompidas nao gravam", async () => {
  const fixtureData = await setup(); const before = structuredClone(fixtureData.database.stores);
  for (const input of [{ reproductionType: "bad" }, { reproductionType: "pregnancy_diagnosis" }, { reproductionType: "calving", calfCount: -1 }, { occurredAt: "" }]) assert.equal((await fixtureData.reproduction.register("a", "p", fixtureData.matrix.id, { ...data, ...input })).status, "invalid");
  assert.deepEqual(fixtureData.database.stores, before);
  fixtureData.database.stores.paddocks.get(fixtureData.paddockRecord.id).propertyId = "q";
  assert.equal((await fixtureData.reproduction.register("a", "p", fixtureData.matrix.id, data)).status, "invalid");
});
