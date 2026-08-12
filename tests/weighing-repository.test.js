const test = require("node:test");
const assert = require("node:assert/strict");
const repoModule = require("../src/weighing-repository.js");
const historyCore = require("../src/weighing-history-core.js");
const LocalDatabase = require("../src/local-database.js");

class FakeDatabase {
  constructor() {
    this.sessions = new Map();
    this.items = new Map();
  }

  async writeTransaction(storeNames, operation) {
    const stores = {
      [LocalDatabase.WEIGHING_SESSIONS_STORE]: {
        put: (value) => ({ result: this.sessions.set(value.id, structuredClone(value)) }),
        delete: (key) => ({ result: this.sessions.delete(key) }),
      },
      [LocalDatabase.WEIGHING_ITEMS_STORE]: {
        put: (value) => ({ result: this.items.set(value.id, structuredClone(value)) }),
        index: () => ({
          openCursor: () => ({})
        }),
      },
    };

    return operation({
      store: (name) => stores[name],
      requestToPromise: (request) => Promise.resolve(request.result),
      deleteByIndex: async (_store, _indexName, key) => {
        let deleted = 0;
        Array.from(this.items.values()).forEach((item) => {
          if (item.sessionId === key) {
            this.items.delete(item.id);
            deleted += 1;
          }
        });
        return deleted;
      },
    });
  }

  async getAll(storeName) {
    if (storeName === LocalDatabase.WEIGHING_SESSIONS_STORE) {
      return Array.from(this.sessions.values()).map((value) => structuredClone(value));
    }
    return Array.from(this.items.values()).map((value) => structuredClone(value));
  }

  async get(storeName, key) {
    if (storeName === LocalDatabase.WEIGHING_SESSIONS_STORE) {
      return structuredClone(this.sessions.get(key));
    }
    return structuredClone(this.items.get(key));
  }

  async getAllByIndex(_storeName, _indexName, key) {
    return Array.from(this.items.values())
      .filter((item) => item.sessionId === key)
      .map((value) => structuredClone(value));
  }
}

function snapshot(sessionId, createdAt) {
  return historyCore.buildSnapshot({
    weighingName: `Sessão ${sessionId}`,
    weighingDate: "2026-08-12",
    propertyName: "Fazenda",
    settings: { arrobaPrice: "300", yieldRate: "50", lightLimit: "300", mediumLimit: "480" },
    animals: [{ id: "a1", tag: "1", weight: "450", category: "Boi", note: "" }],
    demoMode: false,
  }, {
    sessionId,
    createdAt,
    idFactory: (prefix) => `${prefix}-${sessionId}`,
  }).snapshot;
}

test("salva sessão e itens", async () => {
  const repository = repoModule.createWeighingRepository({ database: new FakeDatabase() });
  const result = await repository.saveCompletedSession(snapshot("s1", "2026-08-12T10:00:00.000Z"));

  assert.equal(result.status, "saved");
  const loaded = await repository.getSessionWithItems("s1");
  assert.equal(loaded.session.id, "s1");
  assert.equal(loaded.items.length, 1);
});

test("lista sessões mais recentes primeiro", async () => {
  const repository = repoModule.createWeighingRepository({ database: new FakeDatabase() });
  await repository.saveCompletedSession(snapshot("old", "2026-08-12T10:00:00.000Z"));
  await repository.saveCompletedSession(snapshot("new", "2026-08-12T11:00:00.000Z"));

  const result = await repository.listSessions();

  assert.deepEqual(result.sessions.map((session) => session.id), ["new", "old"]);
});

test("busca itens isolados por sessionId", async () => {
  const repository = repoModule.createWeighingRepository({ database: new FakeDatabase() });
  await repository.saveCompletedSession(snapshot("s1", "2026-08-12T10:00:00.000Z"));
  await repository.saveCompletedSession(snapshot("s2", "2026-08-12T11:00:00.000Z"));

  const result = await repository.getItems("s1");

  assert.equal(result.items.length, 1);
  assert.ok(result.items.every((item) => item.sessionId === "s1"));
});

test("exclui sessão e todos os itens vinculados", async () => {
  const database = new FakeDatabase();
  const repository = repoModule.createWeighingRepository({ database });
  await repository.saveCompletedSession(snapshot("s1", "2026-08-12T10:00:00.000Z"));

  const result = await repository.deleteSession("s1");
  const loaded = await repository.getSessionWithItems("s1");
  const orphanItems = Array.from(database.items.values()).filter((item) => item.sessionId === "s1");

  assert.equal(result.status, "deleted");
  assert.equal(loaded.status, "missing");
  assert.equal(orphanItems.length, 0);
});
