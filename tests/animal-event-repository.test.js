const test = require("node:test");
const assert = require("node:assert/strict");
const { fixture, identified } = require("./herd-test-helpers.js");
const { createAnimalEventRepository } = require("../src/animal-event-repository.js");
const note = { notes: "Apartada para avaliacao.", occurredAt: "2026-09-21T12:00:00Z" };
test("note CRUD permitido, sem edicao de eventos automaticos ou exclusao", async () => {
  const f = fixture(); const animal = (await identified(f, "a", "p", { tag: "101" })).animal;
  const repo = createAnimalEventRepository({ database: f.database });
  const created = await repo.createNoteEvent("a", "p", animal.id, note);
  assert.equal(created.status, "saved");
  assert.equal((await repo.getEvent("a", "p", animal.id, created.event.id)).event.notes, note.notes);
  const changed = await repo.updateNoteEvent("a", "p", animal.id, created.event.id, { ...note, notes: "Editada" });
  assert.equal(changed.event.id, created.event.id); assert.equal(changed.event.notes, "Editada");
  const events = (await repo.listAnimalEvents("a", "p", animal.id)).events;
  assert.equal(events.length, 2);
  assert.equal((await repo.updateNoteEvent("a", "p", animal.id, events.find((e) => e.type === "registered").id, note)).status, "invalid");
  assert.equal((await repo.createNoteEvent("a", "p", animal.id, { ...note, type: "registered" })).status, "invalid");
  assert.equal((await repo.createNoteEvent("a", "p", animal.id, { ...note, notes: " " })).status, "invalid");
  assert.equal(repo.deleteEvent, undefined);
});
test("eventos isolados por conta propriedade e animal incluindo IDs forjados", async () => {
  const f = fixture(); const repo = createAnimalEventRepository({ database: f.database });
  const a = (await identified(f, "a", "p", { tag: "101" })).animal;
  const b = (await identified(f, "a", "q", { tag: "101" })).animal;
  const c = (await identified(f, "b", "r", { tag: "101" })).animal;
  const created = await repo.createNoteEvent("a", "p", a.id, note);
  for (const [account, property, id] of [["a", "q", a.id], ["b", "p", a.id], ["a", "p", b.id], ["a", "p", c.id], ["a", "p", "missing"]]) {
    assert.equal((await repo.createNoteEvent(account, property, id, note)).status, "missing");
    assert.equal((await repo.getEvent(account, property, id, created.event.id)).status, "missing");
    assert.equal((await repo.updateNoteEvent(account, property, id, created.event.id, note)).status, "missing");
    assert.equal((await repo.listAnimalEvents(account, property, id)).events.length, 0);
  }
  assert.equal((await repo.listAnimalEvents("a", "q", b.id)).events.length, 1);
});
