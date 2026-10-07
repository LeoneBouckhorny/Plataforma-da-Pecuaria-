const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../src/animal-event-core.js");
const base = { accountId: "a", propertyId: "p", animalId: "x" };
const options = { now: "2026-09-21T12:00:00.000Z", idFactory: () => "e" };
for (const data of [{ type: "registered" }, { type: "lot_changed", fromLotId: "a", toLotId: "b" },
  { type: "status_changed", fromStatus: "active", toStatus: "archived" }, { type: "note", notes: " Teste " }]) {
  test(`evento valido ${data.type}`, () => {
    const result = C.createEvent({ ...base, ...data }, options);
    assert.equal(result.valid, true); assert.equal(result.event.id, "e");
    assert.equal(result.event.occurredAt, options.now);
    assert.deepEqual(C.normalizeEvent(result.event), result.event);
  });
}
for (const occurredAt of ["", "2026-02-30T12:00:00Z", "2026-01-01", "2026-01-01T24:00:00Z", "invalid"]) test(`timestamp rejeitado ${occurredAt}`, () => {
  assert.equal(C.createEvent({ ...base, type: "registered", occurredAt }, options).valid, false);
});
test("eventos rejeitam tipo livre, nota vazia e mudancas ficticias", () => {
  for (const data of [{ type: "sale" }, { type: "note", notes: "  " }, { type: "lot_changed", fromLotId: "a", toLotId: "a" },
    { type: "status_changed", fromStatus: "active", toStatus: "active" }]) assert.equal(C.createEvent({ ...base, ...data }, options).valid, false);
});
test("note editavel preserva identidade e nao transforma tipo", () => {
  const event = C.createEvent({ ...base, type: "note", notes: "Antes" }, options).event;
  const changed = C.updateNoteEvent(event, { notes: "Depois", id: "forged", animalId: "other" }, options).event;
  assert.equal(changed.id, event.id); assert.equal(changed.animalId, event.animalId); assert.equal(changed.notes, "Depois");
  assert.equal(C.updateNoteEvent(event, { type: "registered" }).valid, false);
  assert.equal(C.updateNoteEvent({ ...event, type: "registered" }, { notes: "x" }).valid, false);
});
test("snapshots sao valores e ordenacao tem desempate estavel", () => {
  const lot = { id: "l", name: "Original" }; const pasture = { id: "p", name: "P1" };
  const snapshot = C.locationSnapshot("to", lot, pasture); lot.name = "Novo";
  assert.equal(snapshot.toLotNameSnapshot, "Original"); assert.equal(snapshot.toPaddockId, "p");
  assert.equal(C.locationSnapshot("from", null, null).fromLotId, null);
  const items = [{ id: "b", occurredAt: options.now }, { id: "a", occurredAt: options.now }, { id: "new", occurredAt: "2027-01-01T00:00:00Z" }];
  assert.deepEqual(C.sortTimeline(items).map((e) => e.id), ["new", "a", "b"]);
  assert.equal(items[0].id, "b");
});
