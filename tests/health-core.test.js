const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../src/animal-event-core.js");
const History = require("../src/animal-history-core.js");
const base = { accountId: "a", propertyId: "p", animalId: "x", type: "health", occurredAt: "2026-09-23T12:00:00Z", productName: "Produto informado", notes: "Manejo informado" };
test("vias padronizadas persistem codigos e exibem rotulos", () => {
  const routes = { subcutaneous: "Subcutânea (SC)", intramuscular: "Intramuscular (IM)", intravenous: "Intravenosa (IV)",
    intradermal: "Intradérmica (ID)", oral: "Oral", intranasal: "Intranasal", topical: "Tópica", pour_on: "Pour-on",
    intramammary: "Intramamária", intrauterine: "Intrauterina", ocular: "Ocular", other: "Outra" };
  assert.deepEqual(C.HEALTH_ROUTES, routes);
  for (const [route, label] of Object.entries(routes)) {
    const result = C.createEvent({ ...base, healthType: "vaccination", route });
    assert.equal(result.valid, true); assert.equal(result.event.route, route);
    assert.equal(C.formatHealthRoute(result.event), label);
  }
  assert.equal(C.createEvent({ ...base, healthType: "vaccination", route: " INTRAMUSCULAR " }).event.route, "intramuscular");
});
test("outra permite complemento e outras vias descartam complemento residual", () => {
  const result = C.createEvent({ ...base, healthType: "other", route: "other", routeOther: " Via personalizada " });
  assert.equal(result.event.routeOther, "Via personalizada"); assert.equal(C.formatHealthRoute(result.event), "Outra: Via personalizada");
  assert.equal(C.createEvent({ ...base, healthType: "other", route: "oral", routeOther: "Texto antigo" }).event.routeOther, null);
});
test("novas vias livres sao recusadas; ausencia nao infere via pelo produto", () => {
  for (const route of ["Intramuscular (IM)", "SC", "toString", "inventada"]) assert.equal(C.createEvent({ ...base, healthType: "vaccination", route }).valid, false);
  const result = C.createEvent({ ...base, healthType: "vaccination", productName: "Produto oral" });
  assert.equal(result.valid, true); assert.equal(result.event.route, null);
});
test("leitura e validacao de evento legado preservam texto livre sem conversao", () => {
  const old = { ...C.createEvent({ ...base, healthType: "vaccination" }).event, route: "Via antiga SC informada" };
  delete old.routeOther;
  const before = structuredClone(old); const result = C.validateEvent(old);
  assert.equal(result.valid, true); assert.equal(result.event.route, old.route);
  assert.equal(C.formatHealthRoute(result.event), old.route); assert.deepEqual(old, before);
  assert.equal(Object.hasOwn(result.event, "routeOther"), false);
});
for (const healthType of Object.keys(C.HEALTH_TYPES)) test(`health valido: ${healthType}`, () => {
  const result = C.createEvent({ ...base, healthType }); assert.equal(result.valid, true);
  assert.deepEqual(C.normalizeEvent(result.event), result.event);
  assert.equal(C.updateNoteEvent(result.event, { notes: "alterada" }).valid, false);
});
test("health exige tipo conhecido e data explicita valida", () => {
  for (const data of [{ healthType: "unknown" }, { healthType: "toString" }, { healthType: "vaccination", occurredAt: undefined }, { healthType: "vaccination", occurredAt: "2026-02-30T12:00:00Z" }]) {
    assert.equal(C.createEvent({ ...base, ...data }).valid, false);
  }
});
for (const healthType of ["vaccination", "deworming", "medication"]) test(`${healthType} exige produto`, () => {
  assert.equal(C.createEvent({ ...base, healthType, productName: " " }).valid, false);
});
test("other exige descricao, nao produto", () => {
  assert.equal(C.createEvent({ ...base, healthType: "other", productName: "" }).valid, true);
  assert.equal(C.createEvent({ ...base, healthType: "other", notes: " " }).valid, false);
});
test("dose opcional, positiva, aceita virgula/ponto e unidade livre", () => {
  for (const doseValue of ["2,5", "2.5", 2.5]) {
    const result = C.createEvent({ ...base, healthType: "vaccination", doseValue, doseUnit: "mL" });
    assert.equal(result.valid, true); assert.equal(result.event.doseValue, 2.5);
  }
  for (const doseValue of ["zero", 0, -1, "1e2", Infinity, "1,2.3"]) assert.equal(C.createEvent({ ...base, healthType: "other", doseValue, doseUnit: "dose" }).valid, false);
  assert.equal(C.createEvent({ ...base, healthType: "other", doseValue: 1 }).valid, false);
  assert.equal(C.createEvent({ ...base, healthType: "other" }).valid, true);
});
test("datas opcionais validas sem calcular carencia ou proxima aplicacao", () => {
  const result = C.createEvent({ ...base, healthType: "other", nextDueDate: "2026-10-23", withdrawalUntil: "2026-10-01" });
  assert.equal(result.valid, true); assert.equal(result.event.withdrawalUntil, "2026-10-01");
  for (const key of ["nextDueDate", "withdrawalUntil"]) assert.equal(C.createEvent({ ...base, healthType: "other", [key]: "2026-02-30" }).valid, false);
});
test("filtros por tipo, lote snapshot e periodo local nao mutam eventos", () => {
  const date = new Date(2026, 8, 23, 12).toISOString();
  const events = [{ id: "1", type: "health", healthType: "vaccination", lotId: "old", occurredAt: date },
    { id: "2", type: "health", healthType: "other", lotId: null, occurredAt: date }, { id: "3", type: "note", occurredAt: date }];
  assert.deepEqual(C.filterHealthEvents(events, { healthType: "vaccination", lotId: "old", from: "2026-09-23", to: "2026-09-23" }).map((e) => e.id), ["1"]);
  assert.equal(C.filterHealthEvents(events, { lotId: "none" })[0].id, "2");
  assert.equal(C.filterHealthEvents(events, { from: "2026-09-24" }).length, 0);
  assert.equal(events.length, 3);
});
test("timeline inclui health com todos os detalhes sem afetar pesagens", () => {
  const event = C.createEvent({ ...base, healthType: "medication", lotNameSnapshot: "Original", paddockNameSnapshot: "P01", operationId: "operation" }).event;
  const result = History.buildHistory({ id: "x" }, [event], []);
  assert.equal(result.timeline[0].healthType, "medication"); assert.equal(result.timeline[0].lotNameSnapshot, "Original");
  assert.equal(result.weighingCount, 0); assert.equal(result.lastWeight, null);
});
