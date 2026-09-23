const test = require("node:test");
const assert = require("node:assert/strict");
const LocalDatabase = require("../src/local-database.js");

function createStore(name, options = {}) {
  const indexes = new Set();

  return {
    name,
    keyPath: options.keyPath,
    indexNames: {
      contains: (indexName) => indexes.has(indexName),
    },
    createdIndexes: [],
    createIndex(indexName, keyPath, options) {
      indexes.add(indexName);
      this.createdIndexes.push({ indexName, keyPath, options });
    },
  };
}

function createFakeDb(initialStores = []) {
  const stores = new Map(initialStores.map((name) => [name, createStore(name)]));

  return {
    stores,
    transaction: { objectStore: (name) => stores.get(name) },
    objectStoreNames: {
      contains: (storeName) => stores.has(storeName),
    },
    createObjectStore(storeName, options = {}) {
      const store = createStore(storeName, options);
      stores.set(storeName, store);
      return store;
    },
  };
}

test("migração inicial cria stores atuais, preservando histórico e índices", () => {
  const db = createFakeDb();

  LocalDatabase.runMigrations(db, 0, db.transaction);

  assert.equal(db.stores.has(LocalDatabase.DRAFT_STORE), true);
  assert.equal(db.stores.has(LocalDatabase.WEIGHING_SESSIONS_STORE), true);
  assert.equal(db.stores.has(LocalDatabase.WEIGHING_ITEMS_STORE), true);
  assert.equal(db.stores.has(LocalDatabase.ACCOUNTS_STORE), true);
  assert.equal(db.stores.has(LocalDatabase.PROPERTIES_STORE), true);
  assert.equal(db.stores.has(LocalDatabase.APP_SETTINGS_STORE), true);
  assert.equal(db.stores.get(LocalDatabase.ACCOUNTS_STORE).keyPath, "id");
  assert.equal(db.stores.get(LocalDatabase.PROPERTIES_STORE).keyPath, "id");
  assert.equal(db.stores.get(LocalDatabase.APP_SETTINGS_STORE).keyPath, "key");
  assert.deepEqual(db.stores.get(LocalDatabase.WEIGHING_ITEMS_STORE).createdIndexes, [{
    indexName: LocalDatabase.SESSION_ID_INDEX,
    keyPath: "sessionId",
    options: { unique: false },
  }, { indexName: "animalId", keyPath: "animalId", options: { unique: false } }]);
  assert.deepEqual(db.stores.get(LocalDatabase.PROPERTIES_STORE).createdIndexes, [
    {
      indexName: LocalDatabase.ACCOUNT_ID_INDEX,
      keyPath: "accountId",
      options: { unique: false },
    },
    {
      indexName: LocalDatabase.STATUS_INDEX,
      keyPath: "status",
      options: { unique: false },
    },
  ]);
});

test("V4 para V5 preserva objetos existentes, cria eventos e adiciona indice sem recriar itens", () => {
  const previous = ["accounts", "properties", "app-settings", "drafts", "paddocks", "lots", "animals", "weighing-sessions", "weighing-items"];
  const db = createFakeDb(previous); const before = new Map(db.stores);
  db.stores.get("weighing-items").createIndex("sessionId", "sessionId", { unique: false });
  LocalDatabase.runMigrations(db, 4, db.transaction);
  for (const name of previous) assert.equal(db.stores.get(name), before.get(name));
  assert.deepEqual(db.stores.get("animal-events").createdIndexes.map((i) => i.indexName), ["accountId", "propertyId", "animalId", "type", "occurredAt"]);
  assert.ok(db.stores.get("weighing-items").indexNames.contains("sessionId"));
  assert.ok(db.stores.get("weighing-items").indexNames.contains("animalId"));
});

test("migration V3 para V4 mantem as seis stores anteriores e adiciona indices do rebanho", () => {
  const previous = ["drafts", "weighing-sessions", "weighing-items", "accounts", "properties", "app-settings"];
  const db = createFakeDb(previous);
  const before = new Map(db.stores);
  LocalDatabase.runMigrations(db, 3, db.transaction);
  assert.equal(LocalDatabase.DB_VERSION, 5);
  for (const name of previous) assert.equal(db.stores.get(name), before.get(name));
  for (const name of ["paddocks", "lots", "animals"]) {
    assert.equal(db.stores.get(name).keyPath, "id");
    assert.deepEqual(db.stores.get(name).createdIndexes.map((index) => index.indexName), ["accountId", "propertyId", "status"]);
  }
  const after = new Map(db.stores);
  LocalDatabase.runMigrations(db, 5, db.transaction);
  assert.deepEqual(db.stores, after);
});

test("migração V1 para V2 preserva drafts e cria stores históricos", () => {
  const db = createFakeDb([LocalDatabase.DRAFT_STORE]);

  LocalDatabase.runMigrations(db, 1, db.transaction);

  assert.equal(db.stores.has(LocalDatabase.DRAFT_STORE), true);
  assert.equal(db.stores.has(LocalDatabase.WEIGHING_SESSIONS_STORE), true);
  assert.equal(db.stores.has(LocalDatabase.WEIGHING_ITEMS_STORE), true);
  assert.equal(db.stores.has(LocalDatabase.ACCOUNTS_STORE), true);
  assert.equal(db.stores.has(LocalDatabase.PROPERTIES_STORE), true);
  assert.equal(db.stores.has(LocalDatabase.APP_SETTINGS_STORE), true);
  assert.equal(db.stores.get(LocalDatabase.WEIGHING_ITEMS_STORE).createdIndexes.length, 2);
});

test("migração V2 cria índice sessionId quando store de itens já existe", () => {
  const db = createFakeDb([
    LocalDatabase.DRAFT_STORE,
    LocalDatabase.WEIGHING_SESSIONS_STORE,
    LocalDatabase.WEIGHING_ITEMS_STORE,
  ]);
  const transaction = {
    objectStore(storeName) {
      return db.stores.get(storeName);
    },
  };

  LocalDatabase.runMigrations(db, 1, transaction);

  assert.deepEqual(db.stores.get(LocalDatabase.WEIGHING_ITEMS_STORE).createdIndexes, [{
    indexName: LocalDatabase.SESSION_ID_INDEX,
    keyPath: "sessionId",
    options: { unique: false },
  }, { indexName: "animalId", keyPath: "animalId", options: { unique: false } }]);
});

test("migração V2 para V3 preserva stores existentes e cria conta/propriedade/settings", () => {
  const db = createFakeDb([
    LocalDatabase.DRAFT_STORE,
    LocalDatabase.WEIGHING_SESSIONS_STORE,
    LocalDatabase.WEIGHING_ITEMS_STORE,
  ]);

  LocalDatabase.runMigrations(db, 2, db.transaction);

  assert.equal(db.stores.has(LocalDatabase.DRAFT_STORE), true);
  assert.equal(db.stores.has(LocalDatabase.WEIGHING_SESSIONS_STORE), true);
  assert.equal(db.stores.has(LocalDatabase.WEIGHING_ITEMS_STORE), true);
  assert.equal(db.stores.has(LocalDatabase.ACCOUNTS_STORE), true);
  assert.equal(db.stores.has(LocalDatabase.PROPERTIES_STORE), true);
  assert.equal(db.stores.has(LocalDatabase.APP_SETTINGS_STORE), true);
  assert.equal(db.stores.get(LocalDatabase.PROPERTIES_STORE).createdIndexes.length, 2);
});
