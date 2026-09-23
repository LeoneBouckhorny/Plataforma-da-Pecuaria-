const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../src/lot-core.js");
test("lot aceita categoria regional e pasto opcional", () => {
  const result = core.createLot("a", "p", { name: " Novilhas 2026 ", category: " Regional livre " });
  assert.equal(result.valid, true);
  assert.equal(result.lot.paddockId, null);
  assert.deepEqual(result.lot.categories, ["Regional livre"]);
  assert.equal("category" in result.lot, false);
  assert.equal(core.createLot("a", "p", { name: " " }).valid, false);
});
test("lot muda pasto sem mudar identidade e arquiva/reativa", () => {
  const lot = core.createLot("a", "p", { name: "L", paddockId: "P1", notes: " nota " }).lot;
  const changed = core.changePaddock(lot, "P2").lot;
  assert.equal(changed.id, lot.id);
  assert.equal(changed.paddockId, "P2");
  assert.equal(core.changePaddock(changed, null).lot.paddockId, null);
  assert.equal(core.archiveLot(changed).status, "archived");
  assert.equal(core.reactivateLot(core.archiveLot(changed)).status, "active");
  assert.equal(core.updateLot(lot, { name: "Outro" }).lot.id, lot.id);
  assert.equal(core.updateLot(lot, { accountId: "b" }).valid, false);
  assert.equal("animalCount" in lot, false);
});
