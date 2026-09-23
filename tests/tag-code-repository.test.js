const test = require("node:test");
const assert = require("node:assert/strict");
const { fixture } = require("./herd-test-helpers.js");
const Animal = require("../src/animal-core.js");
const Lot = require("../src/lot-core.js");
const draft = require("../src/local-data-core.js");
async function setup() {
  const f = fixture();
  f.a = (await f.lot.create("a", "p", { name: "Novilhas", tagSuffix: " a " })).lot;
  f.b = (await f.lot.create("a", "p", { name: "Garrotes", tagSuffix: "B" })).lot;
  return f;
}
test("novos lotes exigem A-Z; duplicidade inclui caixa e arquivados, nao outra propriedade", async () => {
  const f = await setup();
  for (const tagSuffix of [undefined, "", "AA", "1", "á", "A1", "*"]) {
    assert.equal((await f.lot.create("a", "p", { name: "X", tagSuffix })).status, "invalid");
  }
  for (const tagSuffix of ["A", "a", " A "]) {
    const result = await f.lot.create("a", "p", { name: "X", tagSuffix });
    assert.equal(result.status, "invalid"); assert.match(result.errors.tagSuffix, /Novilhas/);
  }
  await f.lot.archive("a", "p", f.a.id);
  assert.equal((await f.lot.create("a", "p", { name: "X", tagSuffix: "A" })).status, "invalid");
  assert.equal((await f.lot.create("a", "q", { name: "X", tagSuffix: "a" })).status, "saved");
});
test("emissao canonica, movimento, arquivo e correcao preservam origem e UUID", async () => {
  const f = await setup();
  assert.equal((await f.lot.update("a", "p", f.a.id, { tagSuffix: "C" })).status, "saved");
  const animal = (await f.animal.create("a", "p", { tagNumber: "23", lotId: f.a.id })).animal;
  assert.equal(animal.tag, "0023C"); assert.equal(animal.tagNumber, "0023");
  assert.equal(animal.tagOriginLotId, f.a.id); assert.equal(animal.tagSuffix, "C");
  await f.animal.changeAnimalLot("a", "p", animal.id, f.b.id);
  const moved = (await f.animal.get("a", "p", animal.id)).animal;
  for (const key of ["tag", "tagNumber", "tagSuffix", "tagOriginLotId", "id"]) assert.equal(moved[key], animal[key]);
  assert.equal(moved.lotId, f.b.id);
  await f.animal.archive("a", "p", animal.id);
  assert.equal((await f.lot.update("a", "p", f.a.id, { tagSuffix: "D" })).status, "invalid");
  const corrected = (await f.animal.update("a", "p", animal.id, { tagNumber: "32" })).animal;
  assert.equal(corrected.tag, "0032C"); assert.equal(corrected.id, animal.id);
  assert.equal(corrected.tagOriginLotId, f.a.id);
  await f.animal.changeAnimalLot("a", "p", animal.id, null);
  assert.equal((await f.animal.get("a", "p", animal.id)).animal.tag, "0032C");
});
test("codigo final unico inclusive arquivado e legado; numero igual em outro sufixo permitido", async () => {
  const f = await setup();
  const animal = (await f.animal.create("a", "p", { tagNumber: "23", lotId: f.a.id })).animal;
  for (const archived of [false, true]) {
    if (archived) await f.animal.archive("a", "p", animal.id);
    const before = structuredClone(f.database.stores);
    const result = await f.animal.create("a", "p", { tagNumber: "0023", lotId: f.a.id });
    assert.equal(result.status, "invalid"); assert.match(result.errors.tagNumber, /0023A/);
    assert.deepEqual(f.database.stores, before);
  }
  assert.equal((await f.animal.create("a", "p", { tagNumber: "23", lotId: f.b.id })).animal.tag, "0023B");
  f.database.stores.animals.set("legacy", Animal.normalize({ id: "legacy", accountId: "a", propertyId: "p", tag: " 0024a ", status: "archived" }));
  assert.equal((await f.animal.create("a", "p", { tagNumber: "24", lotId: f.a.id })).status, "invalid");
  const other = (await f.animal.create("a", "p", { tagNumber: "25", lotId: f.a.id })).animal;
  assert.equal((await f.animal.update("a", "p", other.id, { tagNumber: "24" })).status, "invalid");
});
test("origem e sufixo nao forjaveis; novo numero requer lote ativo do mesmo escopo", async () => {
  const f = await setup();
  for (const [accountId, propertyId] of [["a", "q"], ["b", "r"]]) {
    const foreign = (await f.lot.create(accountId, propertyId, { name: "X", tagSuffix: "A" })).lot;
    assert.equal((await f.animal.create("a", "p", { tagNumber: 23, lotId: foreign.id })).status, "invalid");
  }
  for (const lotId of [null, "missing"]) assert.equal((await f.animal.create("a", "p", { tagNumber: 23, lotId })).status, "invalid");
  await f.lot.archive("a", "p", f.b.id);
  assert.equal((await f.animal.create("a", "p", { tagNumber: 23, lotId: f.b.id })).status, "invalid");
  const animal = (await f.animal.create("a", "p", { tagNumber: 23, lotId: f.a.id })).animal;
  for (const data of [{ tagSuffix: "B" }, { tagOriginLotId: f.b.id }, { tag: "0002B" }, { tagNumber: "" }]) {
    assert.equal((await f.animal.update("a", "p", animal.id, data)).status, "invalid");
  }
  assert.equal((await f.animal.create("a", "p", { tag: "0023A" })).status, "invalid");
  assert.equal((await f.animal.create("a", "p", { name: "Sem brinco" })).status, "saved");
});
test("legado legivel, editavel, sem conversao nem sufixo inventado", async () => {
  const f = fixture();
  const lot = Lot.normalize({ id: "legacy-lot", accountId: "a", propertyId: "p", name: "Antigo" });
  const animal = Animal.normalize({ id: "legacy-animal", accountId: "a", propertyId: "p", lotId: lot.id, tag: "184" });
  delete lot.tagSuffix;
  for (const key of ["tagNumber", "tagSuffix", "tagOriginLotId"]) delete animal[key];
  f.database.stores.lots.set(lot.id, lot); f.database.stores.animals.set(animal.id, animal);
  const before = structuredClone(f.database.stores);
  assert.equal((await f.lot.get("a", "p", lot.id)).lot.tagSuffix, null);
  assert.equal((await f.animal.get("a", "p", animal.id)).animal.tag, "184");
  assert.deepEqual(f.database.stores, before);
  assert.equal((await f.lot.update("a", "p", lot.id, { name: "Antigo editado" })).status, "saved");
  assert.equal((await f.animal.update("a", "p", animal.id, { name: "Nome" })).animal.tag, "184");
  assert.equal((await f.animal.create("a", "p", { tagNumber: "23", lotId: lot.id })).status, "invalid");
  assert.equal((await f.lot.update("a", "p", lot.id, { tagSuffix: "A" })).status, "saved");
  assert.equal((await f.animal.update("a", "p", animal.id, { tagNumber: "184" })).status, "invalid");
});
test("0023A textual no draft nao vincula automaticamente", () => {
  assert.equal(draft.normalizeDraftData({ animals: [{ tag: "0023A", weight: "450" }] }).animals[0].animalId, null);
});
test("duplicados preexistentes nao bloqueiam manutencao sem troca de identificacao", async () => {
  const f = await setup();
  for (const id of ["old1", "old2"]) f.database.stores.animals.set(id, Animal.normalize({ id, accountId: "a", propertyId: "p", tag: "0023A" }));
  assert.equal((await f.animal.update("a", "p", "old1", { name: "Corrigido" })).status, "saved");
  assert.equal((await f.animal.changeAnimalLot("a", "p", "old1", f.b.id)).status, "saved");
  assert.equal((await f.animal.archive("a", "p", "old1")).status, "saved");
  assert.equal((await f.animal.create("a", "p", { tagNumber: 23, lotId: f.a.id })).status, "invalid");
});
test("falha de escrita padronizada nao grava animal ou evento parcialmente", async () => {
  for (const failStore of ["animals", "animal-events"]) {
    const f = await setup(); const before = structuredClone(f.database.stores); f.database.failStore = failStore;
    assert.equal((await f.animal.create("a", "p", { tagNumber: "23", lotId: f.a.id })).status, "failed");
    assert.deepEqual(f.database.stores, before);
  }
});
