const test = require("node:test");
const assert = require("node:assert/strict");
const DraftRepository = require("../src/draft-repository.js");
const LocalDataCore = require("../src/local-data-core.js");
const LocalDatabase = require("../src/local-database.js");

class FakeDatabase {
  constructor() {
    this.records = new Map();
  }

  async get(storeName, key) {
    assert.equal(storeName, LocalDatabase.DRAFT_STORE);
    const value = this.records.get(key);
    return value ? structuredClone(value) : undefined;
  }

  async put(storeName, value) {
    assert.equal(storeName, LocalDatabase.DRAFT_STORE);
    this.records.set(value.key, structuredClone(value));
    return value;
  }

  async delete(storeName, key) {
    assert.equal(storeName, LocalDatabase.DRAFT_STORE);
    this.records.delete(key);
  }

  close() {}
}

const realDraft = {
  weighingName: "Draft Real",
  weighingDate: "2026-08-12",
  propertyName: "Fazenda Real",
  settings: {
    arrobaPrice: "300,00",
    yieldRate: "50",
    lightLimit: "300",
    mediumLimit: "480",
  },
  animals: [
    { id: "real-1", tag: "REAL-001", weight: "455", category: "Boi", note: "" },
  ],
  usePaddocks: false,
  paddocks: [],
};

test("salvar demonstração não substitui draft real existente", async () => {
  const database = new FakeDatabase();
  const repository = DraftRepository.createDraftRepository({ database });

  await repository.saveDraft(realDraft);
  const demoResult = await repository.saveDraft({
    weighingName: "Demonstração",
    weighingDate: "2026-08-12",
    propertyName: "",
    settings: realDraft.settings,
    animals: [
      { id: "demo-1", tag: "EX-001", weight: "999", category: "Boi", note: "", demo: true },
      { id: "demo-2", tag: "EX-002", weight: "510", category: "Boi", note: "", demo: true },
    ],
    demoMode: true,
  });
  const loaded = await repository.loadDraft();

  assert.equal(demoResult.status, "skipped");
  assert.equal(loaded.status, "loaded");
  assert.equal(loaded.draft.data.weighingName, "Draft Real");
  assert.equal(loaded.draft.data.propertyName, "Fazenda Real");
  assert.equal(loaded.draft.data.animals.length, 1);
  assert.equal(loaded.draft.data.animals[0].tag, "REAL-001");
  assert.equal(loaded.draft.data.animals[0].weight, "455");
});

test("remover draft depois da finalização não altera registro histórico separado", async () => {
  const database = new FakeDatabase();
  const repository = DraftRepository.createDraftRepository({ database });
  const historicalSession = {
    id: "session-1",
    weighingName: "Draft Real",
    totalAnimals: 1,
    totalWeight: 455,
  };

  await repository.saveDraft(realDraft);
  await repository.deleteDraft();
  const loaded = await repository.loadDraft();

  assert.equal(loaded.status, "empty");
  assert.deepEqual(historicalSession, {
    id: "session-1",
    weighingName: "Draft Real",
    totalAnimals: 1,
    totalWeight: 455,
  });
  assert.equal(LocalDataCore.DRAFT_KEY, "calculator-current");
});

test("loadDraft aplica accountId atual em rascunho legado sem adivinhar propertyId", async () => {
  const database = new FakeDatabase();
  const repository = DraftRepository.createDraftRepository({ database });
  const legacyDraft = LocalDataCore.createDraft(realDraft, { updatedAt: "2026-08-10T12:00:00.000Z" });
  legacyDraft.schemaVersion = LocalDataCore.LEGACY_SCHEMA_VERSION;
  delete legacyDraft.data.accountId;
  delete legacyDraft.data.propertyId;
  database.records.set(LocalDataCore.DRAFT_KEY, legacyDraft);

  const loaded = await repository.loadDraft({ accountId: "account-atual" });

  assert.equal(loaded.status, "loaded");
  assert.equal(loaded.draft.data.accountId, "account-atual");
  assert.equal(loaded.draft.data.propertyId, null);
  assert.equal(loaded.draft.data.propertyName, "Fazenda Real");
  assert.equal(loaded.draft.data.animals[0].id, "real-1");
});
