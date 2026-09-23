const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../src/animal-core.js");
for (const data of [{ tag: "101" }, { name: "Estrela" }, { tag: " BR-550 ", name: "Estrela" }]) test(`animal aceita identificacao ${JSON.stringify(data)}`, () => {
  const result = core.createAnimal("a", "p", data);
  assert.equal(result.valid, true);
  assert.equal(result.animal.lotId, null);
  assert.equal(result.animal.sex, "unknown");
  assert.equal(result.animal.tag, (data.tag || "").trim());
});
test("animal rejeita identificacao vazia e sexo invalido", () => {
  assert.equal(core.createAnimal("a", "p", { tag: " ", name: " " }).valid, false);
  assert.equal(core.createAnimal("a", "p", { tag: "A102", sex: "invalid" }).valid, false);
});
for (const date of ["2025-02-29", "2026-13-01", "31/01/2026", "invalid", "2026-04-31"]) test(`animal rejeita nascimento ${date}`, () => {
  assert.equal(core.createAnimal("a", "p", { tag: "1", birthDate: date }).valid, false);
});
test("animal preserva campos livres sem paddockId ou idade persistidos", () => {
  const animal = core.createAnimal("a", "p", { tag: " A102 ", sex: "female", category: "Regional", breed: "Cruzada", birthDate: "2024-02-29", notes: "nota", paddockId: "forged" }).animal;
  assert.equal(animal.tag, "A102"); assert.equal(animal.sex, "female");
  assert.equal(animal.category, "Regional"); assert.equal(animal.breed, "Cruzada");
  assert.equal(animal.birthDate, "2024-02-29"); assert.equal(animal.notes, "nota");
  assert.equal("paddockId" in animal, false); assert.equal("age" in animal, false);
  const edited = core.changeLot(animal, "lot").animal;
  assert.equal(edited.lotId, "lot"); assert.equal(edited.id, animal.id);
  assert.equal(core.changeLot(edited, null).animal.lotId, null);
  assert.equal(core.archiveAnimal(edited).status, "archived");
  assert.equal(core.reactivateAnimal(core.archiveAnimal(edited)).status, "active");
  assert.equal(core.updateAnimal(animal, { propertyId: "q" }).valid, false);
});
