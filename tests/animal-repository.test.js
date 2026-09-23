const test = require("node:test");
const assert = require("node:assert/strict");
const { fixture, identified } = require("./herd-test-helpers.js");
test("animal CRUD, listagem e ciclo de status preservam ID", async () => {
  const f = fixture(); const repo = f.animal;
  const result = await repo.create("a", "p", { name: "Igual" });
  assert.equal(result.status, "saved"); const id = result.animal.id;
  assert.deepEqual((await repo.get("a", "p", id)).animal, result.animal);
  assert.equal((await repo.update("a", "p", id, { name: "Editado" })).animal.id, id);
  assert.equal((await repo.list("a", "p")).animals.length, 1);
  assert.equal((await repo.archive("a", "p", id)).status, "saved");
  assert.equal((await repo.list("a", "p")).animals.length, 0);
  assert.equal((await repo.list("a", "p", { includeArchived: true })).animals.length, 1);
  assert.equal((await repo.reactivate("a", "p", id)).animal.id, id);
  assert.deepEqual(f.database.lastTransaction, ["accounts", "properties", "paddocks", "lots", "animals", "animal-events"]);
});
test("animal isola conta e propriedade mesmo com nomes/brincos iguais", async () => {
  const f = fixture(); const repo = f.animal;
  const p = (await identified(f, "a", "p", { name: "Igual", tag: "101" })).animal;
  const q = (await identified(f, "a", "q", { name: "Igual", tag: "101" })).animal;
  const r = (await identified(f, "b", "r", { name: "Igual", tag: "101" })).animal;
  assert.equal(p.tag, q.tag); assert.equal(q.tag, r.tag);
  assert.notEqual(p.id, q.id); assert.notEqual(q.id, r.id);
  assert.deepEqual((await repo.list("a", "p")).animals.map((e) => e.id), [p.id]);
  assert.equal((await repo.list("b", "p")).animals.length, 0);
  for (const [account, property] of [["a", "q"], ["b", "p"], ["b", "r"]]) {
    assert.equal((await repo.get(account, property, p.id)).status, "missing");
    assert.equal((await repo.update(account, property, p.id, { name: "X" })).status === "saved", false);
    assert.equal((await repo.archive(account, property, p.id)).status === "saved", false);
    assert.equal((await repo.reactivate(account, property, p.id)).status === "saved", false);
  }
});
test("animal bloqueia transferencia, conta forjada, propriedade ausente e colisao ID", async () => {
  const f = fixture(); const repo = f.animal;
  const entity = (await repo.create("a", "p", { name: "Igual" })).animal;
  for (const data of [{ propertyId: "q" }, { accountId: "b" }, { id: "forged" }, { status: "archived" }]) {
    assert.equal((await repo.update("a", "p", entity.id, data)).status, "invalid");
  }
  assert.equal((await repo.create("b", "p", { name: "Igual" })).status, "invalid");
  assert.equal((await repo.create("a", "missing", { name: "Igual" })).status, "invalid");
  repo.options.idFactory = () => entity.id;
  assert.equal((await repo.create("a", "p", { name: "Igual" })).status, "failed");
  assert.deepEqual((await repo.get("a", "p", entity.id)).animal, entity);
  f.database.stores.properties.get("p").status = "archived";
  assert.equal((await repo.update("a", "p", entity.id, { name: "x" })).status, "invalid");
});
