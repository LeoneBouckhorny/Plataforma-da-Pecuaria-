const test = require("node:test");
const assert = require("node:assert/strict");
const Core = require("../src/herd-hierarchy-core.js");
const row = (id, fields = {}) => ({ id, accountId: "a", propertyId: "p", status: "active", ...fields });
function data() { return { paddocks: [row("p1"), row("p2")], lots: [row("A", { paddockId: "p1" }), row("B", { paddockId: "p1" }), row("C", { paddockId: "p2" }), row("D", { paddockId: null })],
  animals: [row("a1", { lotId: "A", sex: "male" }), row("a2", { lotId: "A", sex: "female" }), row("b1", { lotId: "B", sex: "unknown" }), row("none", { lotId: null })] }; }
test("agrupa lotes por pasto e animais por lote, incluindo sem vinculo", () => {
  const tree = Core.build(data(), "a", "p");
  assert.deepEqual(tree.paddocks[0].lots.map((n) => n.lot.id), ["A", "B"]);
  assert.deepEqual(tree.paddocks[1].lots.map((n) => n.lot.id), ["C"]);
  assert.deepEqual(tree.lots[0].animals.map((a) => a.id), ["a1", "a2"]);
  assert.equal(tree.unassignedLots[0].lot.id, "D"); assert.equal(tree.unassignedAnimals[0].id, "none");
  assert.deepEqual(tree.lots[0].counts, { total: 2, male: 1, female: 1, unknown: 0 });
  assert.equal(tree.paddocks[0].activeAnimals, 3);
});
test("movimento atualiza agrupamento sem tocar registros", () => {
  const d = data(); d.lots[1].paddockId = "p2"; d.animals[1].lotId = "B";
  const before = structuredClone(d); const tree = Core.build(d, "a", "p");
  assert.deepEqual(tree.paddocks[1].lots.map((n) => n.lot.id), ["B", "C"]);
  assert.equal(tree.lots[0].animals.length, 1); assert.equal(tree.lots[1].animals.length, 2); assert.deepEqual(d, before);
});
test("arquivados acessiveis, contadores ativos e isolamento real", () => {
  const d = data(); d.animals[0].status = "archived"; d.lots[1].status = "archived";
  d.animals.push(row("foreign", { propertyId: "q", lotId: "A" }), row("forged", { accountId: "b", lotId: "A" }));
  const tree = Core.build(d, "a", "p");
  assert.equal(tree.paddocks[0].activeLots, 1); assert.equal(tree.paddocks[0].activeAnimals, 1);
  assert.equal(tree.lots[0].animals.length, 2); assert.equal(tree.lots[0].counts.total, 1);
});
