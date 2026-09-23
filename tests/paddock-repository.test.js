const test = require("node:test");
const assert = require("node:assert/strict");
const { fixture } = require("./herd-test-helpers.js");
test("paddock CRUD, listagem e ciclo de status preservam ID", async () => {
  const f = fixture(); const repo = f.paddock;
  const result = await repo.create("a", "p", { name: "Igual" });
  assert.equal(result.status, "saved"); const id = result.paddock.id;
  assert.deepEqual((await repo.get("a", "p", id)).paddock, result.paddock);
  assert.equal((await repo.update("a", "p", id, { name: "Editado" })).paddock.id, id);
  assert.equal((await repo.list("a", "p")).paddocks.length, 1);
  assert.equal((await repo.archive("a", "p", id)).status, "saved");
  assert.equal((await repo.list("a", "p")).paddocks.length, 0);
  assert.equal((await repo.list("a", "p", { includeArchived: true })).paddocks.length, 1);
  assert.equal((await repo.reactivate("a", "p", id)).paddock.id, id);
  assert.deepEqual(f.database.lastTransaction, ["accounts", "properties", "paddocks", "lots", "animals"]);
});
test("paddock isola conta e propriedade mesmo com nomes/brincos iguais", async () => {
  const f = fixture(); const repo = f.paddock;
  const p = (await repo.create("a", "p", { name: "Igual" })).paddock;
  const q = (await repo.create("a", "q", { name: "Igual" })).paddock;
  const r = (await repo.create("b", "r", { name: "Igual" })).paddock;
  assert.notEqual(p.id, q.id); assert.notEqual(q.id, r.id);
  assert.deepEqual((await repo.list("a", "p")).paddocks.map((e) => e.id), [p.id]);
  assert.equal((await repo.list("b", "p")).paddocks.length, 0);
  for (const [account, property] of [["a", "q"], ["b", "p"], ["b", "r"]]) {
    assert.equal((await repo.get(account, property, p.id)).status, "missing");
    assert.equal((await repo.update(account, property, p.id, { name: "X" })).status === "saved", false);
    assert.equal((await repo.archive(account, property, p.id)).status === "saved", false);
    assert.equal((await repo.reactivate(account, property, p.id)).status === "saved", false);
  }
});
test("paddock bloqueia transferencia, conta forjada, propriedade ausente e colisao ID", async () => {
  const f = fixture(); const repo = f.paddock;
  const entity = (await repo.create("a", "p", { name: "Igual" })).paddock;
  for (const data of [{ propertyId: "q" }, { accountId: "b" }, { id: "forged" }, { status: "archived" }]) {
    assert.equal((await repo.update("a", "p", entity.id, data)).status, "invalid");
  }
  assert.equal((await repo.create("b", "p", { name: "Igual" })).status, "invalid");
  assert.equal((await repo.create("a", "missing", { name: "Igual" })).status, "invalid");
  repo.options.idFactory = () => entity.id;
  assert.equal((await repo.create("a", "p", { name: "Igual" })).status, "failed");
  assert.deepEqual((await repo.get("a", "p", entity.id)).paddock, entity);
  f.database.stores.properties.get("p").status = "archived";
  assert.equal((await repo.update("a", "p", entity.id, { name: "x" })).status, "invalid");
});
