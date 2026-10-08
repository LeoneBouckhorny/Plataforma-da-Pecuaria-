const test = require("node:test");
const assert = require("node:assert/strict");
const Core = require("../src/animal-event-core.js");
const History = require("../src/animal-history-core.js");
const base = { type: "reproduction", accountId: "a", propertyId: "p", animalId: "matrix", occurredAt: "2026-10-07T12:00:00Z" };
const create = (data) => Core.createEvent({ ...base, ...data });
for (const reproductionType of Object.keys(Core.REPRODUCTION_TYPES)) test(`reproduction valido: ${reproductionType}`, () => {
  const result = create({ reproductionType, result: "pregnant", calfCount: "1", femaleCalves: "1" });
  assert.equal(result.valid, true); assert.equal(result.event.type, "reproduction");
});
test("tipo invalido e data ausente/invalida bloqueados", () => {
  for (const data of [{ reproductionType: "other" }, { reproductionType: "__proto__" }, { reproductionType: "estrus", occurredAt: undefined }, { reproductionType: "estrus", occurredAt: "2026-02-30T12:00:00Z" }]) assert.equal(create(data).valid, false);
});
for (const result of Object.keys(Core.PREGNANCY_RESULTS)) test(`diagnostico estruturado: ${result}`, () => {
  assert.equal(create({ reproductionType: "pregnancy_diagnosis", result }).event.result, result);
});
test("diagnostico exige resultado enumerado", () => {
  for (const result of [null, "", "Prenhe", "__proto__"]) assert.ok(create({ reproductionType: "pregnancy_diagnosis", result }).errors.result);
});
test("parto aceita total inteiro e contagens opcionais sem inferir sexo", () => {
  const event = create({ reproductionType: "calving", calfCount: "2", maleCalves: "0" }).event;
  assert.equal(event.calfCount, 2); assert.equal(event.maleCalves, 0); assert.equal(event.femaleCalves, null);
});
test("parto rejeita total ausente, zero, fracionario, negativo, infinito ou inseguro", () => {
  for (const calfCount of [null, "", 0, -1, "1.5", "1,5", "abc", Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.ok(create({ reproductionType: "calving", calfCount }).errors.calfCount);
});
test("parto valida contagens e soma inclusive quando apenas uma informada", () => {
  for (const extra of [{ maleCalves: -1 }, { femaleCalves: "0.5" }, { maleCalves: 2 }, { maleCalves: 1, femaleCalves: 1 }]) assert.equal(create({ reproductionType: "calving", calfCount: 1, ...extra }).valid, false);
});
test("cobertura nao aceita identificacoes externa e cadastrada simultaneas", () => {
  assert.ok(create({ reproductionType: "natural_service", sireAnimalId: "bull", externalSire: "Externo" }).errors.externalSire);
});
test("timeline e resumo sao derivados por data, sem modificar animal ou eventos", () => {
  const events = [create({ reproductionType: "pregnancy_diagnosis", result: "pregnant" }).event,
    create({ reproductionType: "pregnancy_diagnosis", result: "not_pregnant", occurredAt: "2026-09-01T12:00:00Z" }).event,
    create({ reproductionType: "artificial_insemination", occurredAt: "2026-08-01T12:00:00Z" }).event,
    create({ reproductionType: "calving", calfCount: 1, occurredAt: "2026-03-01T12:00:00Z" }).event];
  const animal = { id: "matrix" }; const before = structuredClone({ animal, events });
  const history = History.buildHistory(animal, events, []);
  assert.equal(history.timeline.length, 4); assert.equal(history.reproductionSummary.lastDiagnosis.result, "pregnant");
  assert.equal(history.reproductionSummary.lastService.reproductionType, "artificial_insemination");
  assert.equal(history.reproductionSummary.lastCalving.calfCount, 1); assert.deepEqual({ animal, events }, before);
  assert.deepEqual(Core.reproductionSummary([]), { lastDiagnosis: null, lastService: null, lastCalving: null });
});
test("filtros combinam tipo, resultado, lote snapshot e periodo local inclusivo", () => {
  const event = create({ reproductionType: "pregnancy_diagnosis", result: "pregnant", lotId: "lot" }).event;
  const events = [event, { ...event, id: "other", type: "health" }];
  assert.equal(Core.filterReproductionEvents(events, { reproductionType: "pregnancy_diagnosis", result: "pregnant", lotId: "lot", from: "2026-10-07", to: "2026-10-07" }).length, 1);
  for (const filters of [{ reproductionType: "estrus" }, { result: "inconclusive" }, { lotId: "none" }, { from: "2026-10-08" }, { to: "2026-10-06" }]) assert.equal(Core.filterReproductionEvents(events, filters).length, 0);
});
test("reproduction nao pode ser editado por updateNoteEvent", () => {
  assert.equal(Core.updateNoteEvent(create({ reproductionType: "estrus" }).event, { notes: "alterar" }).valid, false);
});
