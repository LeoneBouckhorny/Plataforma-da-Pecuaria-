const test = require("node:test");
const assert = require("node:assert/strict");
const { fixture } = require("./herd-test-helpers.js");
async function setup() {
  const f = fixture();
  f.p = (await f.paddock.create("a", "p", { name: "Pasto" })).paddock;
  f.l1 = (await f.lot.create("a", "p", { name: "Novilhas", paddockId: f.p.id })).lot;
  f.l2 = (await f.lot.create("a", "p", { name: "Recria" })).lot;
  f.a = (await f.animal.create("a", "p", { tag: "101", lotId: f.l1.id })).animal;
  return f;
}
test("cadastro registered, mudancas A-B A-null null-B e mesmo lote sem evento", async () => {
  const f = await setup();
  let events = await f.database.getAll("animal-events");
  assert.equal(events.length, 1); assert.equal(events[0].type, "registered"); assert.equal(events[0].toPaddockNameSnapshot, "Pasto");
  assert.equal((await f.animal.updateAnimal("a", "p", f.a.id, { lotId: f.l2.id })).status, "invalid");
  for (const id of [f.l2.id, null, f.l1.id]) assert.equal((await f.animal.changeAnimalLot("a", "p", f.a.id, id)).status, "saved");
  await f.animal.changeAnimalLot("a", "p", f.a.id, f.l1.id);
  await f.animal.updateAnimal("a", "p", f.a.id, { name: "Corrigido" });
  events = await f.database.getAll("animal-events");
  assert.equal(events.length, 4); assert.equal(events[1].fromLotNameSnapshot, "Novilhas");
  assert.equal(events[1].toLotNameSnapshot, "Recria"); assert.equal(events[2].toLotId, null);
  await f.lot.update("a", "p", f.l1.id, { name: "Renomeado" }); await f.paddock.update("a", "p", f.p.id, { name: "Novo" });
  assert.deepEqual(await f.database.getAll("animal-events"), events);
});
test("status gera eventos somente em transicoes reais e mover pasto nao gera evento individual", async () => {
  const f = await setup();
  await f.animal.archiveAnimal("a", "p", f.a.id); await f.animal.archiveAnimal("a", "p", f.a.id);
  await f.animal.reactivateAnimal("a", "p", f.a.id); await f.animal.reactivateAnimal("a", "p", f.a.id);
  await f.lot.changePaddock("a", "p", f.l1.id, null);
  const events = await f.database.getAll("animal-events");
  assert.equal(events.length, 3);
  assert.deepEqual(events.filter((e) => e.type === "status_changed").map((e) => [e.fromStatus, e.toStatus]), [["active", "archived"], ["archived", "active"]]);
});
for (const action of ["create", "change", "archive", "reactivate"]) for (const failStore of ["animals", "animal-events"]) {
  test(`rollback ${action} se falhar ${failStore}`, async () => {
    const f = await setup();
    if (action === "reactivate") await f.animal.archive("a", "p", f.a.id);
    const before = structuredClone(f.database.stores);
    f.database.failStore = failStore;
    const result = action === "create" ? await f.animal.create("a", "p", { tag: "102" })
      : action === "change" ? await f.animal.changeAnimalLot("a", "p", f.a.id, f.l2.id)
        : await f.animal[action]("a", "p", f.a.id);
    assert.equal(result.status, "failed"); assert.deepEqual(f.database.stores, before);
  });
}
