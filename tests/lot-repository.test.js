const test = require("node:test");
const assert = require("node:assert/strict");
const { fixture } = require("./herd-test-helpers.js");
test("lot CRUD, listagem e ciclo de status preservam ID", async () => {
  const f = fixture(); const repo = f.lot;
  const result = await repo.create("a", "p", { name: "Igual", tagSuffix: "A" });
  assert.equal(result.status, "saved"); const id = result.lot.id;
  assert.deepEqual((await repo.get("a", "p", id)).lot, result.lot);
  assert.equal((await repo.update("a", "p", id, { name: "Editado" })).lot.id, id);
  assert.equal((await repo.list("a", "p")).lots.length, 1);
  assert.equal((await repo.archive("a", "p", id)).status, "saved");
  assert.equal((await repo.list("a", "p")).lots.length, 0);
  assert.equal((await repo.list("a", "p", { includeArchived: true })).lots.length, 1);
  assert.equal((await repo.reactivate("a", "p", id)).lot.id, id);
  assert.deepEqual(f.database.lastTransaction, ["accounts", "properties", "paddocks", "lots", "animals"]);
});
test("lot isola conta e propriedade mesmo com nomes/brincos iguais", async () => {
  const f = fixture(); const repo = f.lot;
  const p = (await repo.create("a", "p", { name: "Igual", tagSuffix: "A" })).lot;
  const q = (await repo.create("a", "q", { name: "Igual", tagSuffix: "A" })).lot;
  const r = (await repo.create("b", "r", { name: "Igual", tagSuffix: "A" })).lot;
  assert.notEqual(p.id, q.id); assert.notEqual(q.id, r.id);
  assert.deepEqual((await repo.list("a", "p")).lots.map((e) => e.id), [p.id]);
  assert.equal((await repo.list("b", "p")).lots.length, 0);
  for (const [account, property] of [["a", "q"], ["b", "p"], ["b", "r"]]) {
    assert.equal((await repo.get(account, property, p.id)).status, "missing");
    assert.equal((await repo.update(account, property, p.id, { name: "X" })).status === "saved", false);
    assert.equal((await repo.archive(account, property, p.id)).status === "saved", false);
    assert.equal((await repo.reactivate(account, property, p.id)).status === "saved", false);
  }
});
test("lot bloqueia transferencia, conta forjada, propriedade ausente e colisao ID", async () => {
  const f = fixture(); const repo = f.lot;
  const entity = (await repo.create("a", "p", { name: "Igual", tagSuffix: "A" })).lot;
  for (const data of [{ propertyId: "q" }, { accountId: "b" }, { id: "forged" }, { status: "archived" }]) {
    assert.equal((await repo.update("a", "p", entity.id, data)).status, "invalid");
  }
  assert.equal((await repo.create("b", "p", { name: "Igual", tagSuffix: "A" })).status, "invalid");
  assert.equal((await repo.create("a", "missing", { name: "Igual", tagSuffix: "A" })).status, "invalid");
  repo.options.idFactory = () => entity.id;
  assert.equal((await repo.create("a", "p", { name: "Igual", tagSuffix: "B" })).status, "failed");
  assert.deepEqual((await repo.get("a", "p", entity.id)).lot, entity);
  f.database.stores.properties.get("p").status = "archived";
  assert.equal((await repo.update("a", "p", entity.id, { name: "x" })).status, "invalid");
});
