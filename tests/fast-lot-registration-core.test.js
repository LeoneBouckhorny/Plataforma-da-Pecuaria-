const test = require("node:test");
const assert = require("node:assert/strict");
const Core = require("../src/fast-lot-registration-core.js");
const Lots = require("../src/lot-core.js");
const input = { maleCount: 12, femaleCount: 13, startNumber: 1, tagSuffix: "A" };
test("12 + 13 = 25, intervalo 1..25; 23 + 20 = 42", () => {
  const plan = Core.createPlan(input);
  assert.equal(plan.valid, true); assert.equal(plan.total, 25); assert.equal(plan.end, 25);
  assert.equal(Core.createPlan({ ...input, startNumber: 23, maleCount: 10, femaleCount: 10 }).end, 42);
});
test("zero total rejeitado; 9999 com um valido e com dois invalido", () => {
  assert.equal(Core.createPlan({ ...input, maleCount: 0, femaleCount: 0 }).valid, false);
  assert.equal(Core.createPlan({ ...input, startNumber: 9999, maleCount: 1, femaleCount: 0 }).valid, true);
  assert.equal(Core.createPlan({ ...input, startNumber: 9999, maleCount: 1, femaleCount: 1 }).valid, false);
});
for (const key of ["maleCount", "femaleCount"]) for (const value of [-1, 1.5, "x", "", "1e2", Infinity, "9007199254740992"]) {
  test(`contagem rejeitada ${key}=${value}`, () => {
    const plan = Core.createPlan({ ...input, [key]: value });
    assert.equal(plan.valid, false); assert.ok(plan.errors[key]); assert.deepEqual(plan.animals, []);
  });
}
for (const value of [0, -1, 10000, "23A", "23.5", ""]) test(`inicio rejeitado ${value}`, () => {
  assert.equal(Core.createPlan({ ...input, startNumber: value }).valid, false);
});
test("sexo deterministico, codigo 4 digitos, sem nomes artificiais", () => {
  const plan = Core.createPlan({ ...input, maleCount: 2, femaleCount: 2 });
  assert.deepEqual(plan.animals.map((a) => [a.tag, a.sex]), [["0001A", "male"], ["0002A", "male"], ["0003A", "female"], ["0004A", "female"]]);
  assert.ok(plan.animals.every((a) => a.name === ""));
});
test("uma categoria/raca herdada, multiplas nao inventam valor individual", () => {
  const single = Core.createPlan({ ...input, categories: ["Novilhas"], breeds: ["Nelore"] });
  assert.ok(single.animals.every((a) => a.category === "Novilhas" && a.breed === "Nelore"));
  const mixed = Core.createPlan({ ...input, categories: ["Engorda", "Reprodutoras"], breeds: ["Nelore", "Brahman"] });
  assert.ok(mixed.animals.every((a) => a.category === "" && a.breed === ""));
});
test("arrays normalizam strings, duplicidade e legado sem duas fontes", () => {
  assert.deepEqual(Lots.normalize({ category: " Novilhas " }).categories, ["Novilhas"]);
  assert.deepEqual(Lots.normalize({ category: "Antiga", categories: [] }).categories, []);
  const normalized = Lots.normalize({ categories: [" Engorda ", "engorda", " Regional  livre ", null], breeds: ["Nelore", "nelore", "Regional"] });
  assert.deepEqual(normalized.categories, ["Engorda", "Regional livre"]);
  assert.deepEqual(normalized.breeds, ["Nelore", "Regional"]); assert.equal("category" in normalized, false);
  assert.deepEqual(Lots.normalize({}).breeds, []);
});
test("sugestoes oficiais e categoria/raca personalizada", () => {
  for (const name of ["Nelore", "Brahman", "Tabapuã", "Guzerá", "Sindi", "Indubrasil", "Angus", "Senepol", "Mestiço", "Outra"]) assert.ok(Lots.BREED_SUGGESTIONS.includes(name));
  assert.ok(Lots.CATEGORY_SUGGESTIONS.includes("Reprodutoras"));
  const plan = Core.createPlan({ ...input, categories: ["Regional"], breeds: ["Caracu"] });
  assert.equal(plan.animals[0].category, "Regional"); assert.equal(plan.animals[0].breed, "Caracu");
});
test("100 animais funcionam; intervalo total 9999 nao tem limite arbitrario", () => {
  assert.equal(Core.createPlan({ ...input, maleCount: 50, femaleCount: 50 }).animals.length, 100);
  assert.equal(Core.createPlan({ ...input, maleCount: 9999, femaleCount: 0 }).animals.length, 9999);
  assert.equal(Core.createPlan({ ...input, maleCount: 10000, femaleCount: 0 }).valid, false);
});
