const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../src/paddock-core.js");
const options = { idFactory: () => "id", now: "2026-09-21T12:00:00Z" };
test("paddock normaliza nome, notes e area decimal sem obrigar area", () => {
  const result = core.createPaddock("a", "p", { name: "  Piquete  01 ", notes: " Teste ", areaHectares: "12,5" }, options);
  assert.equal(result.valid, true);
  assert.equal(result.paddock.areaHectares, 12.5);
  assert.equal(result.paddock.name, "Piquete 01");
  assert.equal(result.paddock.notes, "Teste");
  assert.equal(core.createPaddock("a", "p", { name: "P" }, options).paddock.areaHectares, null);
});
for (const area of ["0", "-1", "x", "Infinity", "1,2.3", "1e3"]) test(`paddock rejeita area ${area}`, () => {
  assert.equal(core.createPaddock("a", "p", { name: "P", areaHectares: area }, options).valid, false);
});
test("paddock exige nome e preserva ID no ciclo editar/arquivar/reativar", () => {
  assert.equal(core.createPaddock("a", "p", { name: " " }, options).valid, false);
  const original = core.createPaddock("a", "p", { name: "P" }, options).paddock;
  const edited = core.updatePaddock(original, { name: "Novo", areaHectares: "8.5" }, options).paddock;
  assert.equal(edited.id, original.id);
  assert.equal(edited.areaHectares, 8.5);
  assert.equal(core.archivePaddock(edited).status, "archived");
  assert.equal(core.reactivatePaddock(core.archivePaddock(edited)).status, "active");
  assert.equal(core.formatIdentification(edited), "Novo");
  assert.equal(core.updatePaddock(original, { propertyId: "q" }).valid, false);
});
