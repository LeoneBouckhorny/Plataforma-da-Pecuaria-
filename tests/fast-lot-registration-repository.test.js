const test = require("node:test");
const assert = require("node:assert/strict");
const { fixture } = require("./herd-test-helpers.js");
const { createFastLotRegistrationRepository } = require("../src/fast-lot-registration-repository.js");
const data = { name: "Novilhas", tagSuffix: "A", maleCount: 10, femaleCount: 15, startNumber: 1, categories: ["Recria", "Engorda"], breeds: ["Nelore"] };
function setup() { const f = fixture(); return { ...f, fast: createFastLotRegistrationRepository({ database: f.database }) }; }
test("normal cria apenas lote; edicao nunca gera animais nem persiste contadores", async () => {
  const f = setup(); const result = await f.lot.create("a", "p", data);
  assert.equal(result.status, "saved"); assert.equal(f.database.stores.animals.size, 0); assert.equal(f.database.stores["animal-events"].size, 0);
  await f.lot.update("a", "p", result.lot.id, { ...data, categories: ["Nova"], breeds: ["Caracu"] });
  const lot = (await f.lot.get("a", "p", result.lot.id)).lot;
  assert.deepEqual(lot.categories, ["Nova"]); assert.deepEqual(lot.breeds, ["Caracu"]);
  for (const key of ["maleCount", "femaleCount", "animalCount", "category"]) assert.equal(key in lot, false);
  assert.equal(f.database.stores.animals.size, 0); assert.equal(f.database.stores["animal-events"].size, 0);
});
test("rapido: 1 lote, 25 animais UUID e 25 registered com snapshots", async () => {
  const f = setup(); const paddock = (await f.paddock.create("a", "p", { name: "P01" })).paddock;
  const result = await f.fast.createLotWithAnimals("a", "p", { ...data, paddockId: paddock.id });
  assert.equal(result.status, "saved"); assert.equal(result.animals.length, 25);
  assert.equal(f.database.stores.lots.size, 1); assert.equal(f.database.stores["animal-events"].size, 25);
  assert.equal(new Set(result.animals.map((a) => a.id)).size, 25);
  assert.equal(result.animals[0].tag, "0001A"); assert.equal(result.animals.at(-1).tag, "0025A");
  assert.equal(result.animals.filter((a) => a.sex === "male").length, 10);
  assert.ok(result.animals.every((a) => a.tagOriginLotId === result.lot.id && a.lotId === result.lot.id && !a.category && a.breed === "Nelore" && !("paddockId" in a)));
  for (const event of f.database.stores["animal-events"].values()) {
    assert.equal(event.type, "registered"); assert.equal(event.toPaddockNameSnapshot, "P01");
    assert.equal(event.toLotId, result.lot.id); assert.ok(result.animals.some((a) => a.id === event.animalId));
  }
  assert.deepEqual(f.database.lastTransaction, ["accounts", "properties", "paddocks", "lots", "animals", "animal-events"]);
});
for (const status of ["active", "archived"]) test(`conflito legado 0017a ${status} bloqueia intervalo inteiro`, async () => {
  const f = setup(); f.database.stores.animals.set("old", { id: "old", accountId: "a", propertyId: "p", tag: " 0017a ", status });
  const before = structuredClone(f.database.stores);
  const result = await f.fast.createLotWithAnimals("a", "p", data);
  assert.equal(result.status, "invalid"); assert.match(result.errors.startNumber, /0017A/); assert.deepEqual(f.database.stores, before);
});
for (const storeName of ["lots", "animals", "animal-events"]) test(`rollback falha em ${storeName}`, async () => {
  const f = setup(); const before = structuredClone(f.database.stores); const original = f.database.writeTransaction.bind(f.database);
  f.database.writeTransaction = (names, operation) => original(names, (helpers) => {
    let count = 0;
    return operation({ ...helpers, store: (name) => {
      const store = helpers.store(name);
      return name === storeName ? { ...store, add: (record) => {
        if (++count === (name === "lots" ? 1 : 10)) throw new Error("Injected nth write failure");
        return store.add(record);
      } } : store;
    } });
  });
  assert.equal((await f.fast.createLotWithAnimals("a", "p", data)).status, "failed");
  assert.deepEqual(f.database.stores, before);
});
test("suffix arquivado reservado; mesmo suffix permitido em outra propriedade", async () => {
  const f = setup(); const lot = (await f.lot.create("a", "p", data)).lot; await f.lot.archive("a", "p", lot.id);
  assert.equal((await f.fast.createLotWithAnimals("a", "p", data)).status, "invalid");
  assert.equal((await f.fast.createLotWithAnimals("a", "q", data)).status, "saved");
});
test("cross account/property, pasto ausente ou arquivado bloqueiam tudo", async () => {
  const f = setup(); const foreign = (await f.paddock.create("b", "r", { name: "P" })).paddock;
  const own = (await f.paddock.create("a", "p", { name: "P" })).paddock; await f.paddock.archive("a", "p", own.id);
  const before = structuredClone(f.database.stores);
  for (const paddockId of [foreign.id, own.id, "missing"]) assert.equal((await f.fast.createLotWithAnimals("a", "p", { ...data, paddockId })).status, "invalid");
  assert.equal((await f.fast.createLotWithAnimals("b", "p", data)).status, "invalid");
  assert.deepEqual(f.database.stores, before);
});
test("gerado pode mover lote, tag e origem nao mudam e suffix fica bloqueado", async () => {
  const f = setup(); const created = await f.fast.createLotWithAnimals("a", "p", data);
  const destination = (await f.lot.create("a", "p", { name: "B", tagSuffix: "B" })).lot;
  const a = created.animals[22]; const moved = (await f.animal.changeAnimalLot("a", "p", a.id, destination.id)).animal;
  assert.equal(moved.tag, "0023A"); assert.equal(moved.tagOriginLotId, created.lot.id); assert.equal(moved.lotId, destination.id);
  assert.equal((await f.lot.update("a", "p", created.lot.id, { tagSuffix: "C" })).status, "invalid");
  assert.equal(f.database.stores["animal-events"].size, 26);
});
test("ler e editar category legado preserva categorias sem migration", async () => {
  const f = setup(); const legacy = { id: "legacy", accountId: "a", propertyId: "p", name: "Antigo", category: "Novilhas", status: "active" };
  f.database.stores.lots.set(legacy.id, legacy);
  const read = (await f.lot.get("a", "p", legacy.id)).lot;
  assert.deepEqual(read.categories, ["Novilhas"]); assert.deepEqual(read.breeds, []); assert.deepEqual(f.database.stores.lots.get(legacy.id), legacy);
  const updated = (await f.lot.update("a", "p", legacy.id, { name: "Novo" })).lot;
  assert.deepEqual(updated.categories, ["Novilhas"]); assert.equal("category" in updated, false);
});
