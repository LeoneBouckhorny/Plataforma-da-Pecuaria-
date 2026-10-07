const test = require("node:test");
const assert = require("node:assert/strict");
const PropertyRepository = require("../src/property-repository.js");
const LocalDatabase = require("../src/local-database.js");
const PropertyCore = require("../src/property-core.js");

class FakeDatabase {
  constructor() {
    this.properties = new Map();
  }

  async get(storeName, key) {
    assert.equal(storeName, LocalDatabase.PROPERTIES_STORE);
    const value = this.properties.get(key);
    return value ? structuredClone(value) : undefined;
  }

  async put(storeName, value) {
    assert.equal(storeName, LocalDatabase.PROPERTIES_STORE);
    this.properties.set(value.id, structuredClone(value));
    return value;
  }

  async getAllByIndex(storeName, indexName, key) {
    assert.equal(storeName, LocalDatabase.PROPERTIES_STORE);
    assert.equal(indexName, LocalDatabase.ACCOUNT_ID_INDEX);
    return Array.from(this.properties.values())
      .filter((property) => property.accountId === key)
      .map((value) => structuredClone(value));
  }

  close() {}
}

function createRepository(database = new FakeDatabase()) {
  let ids = 0;
  return PropertyRepository.createPropertyRepository({
    database,
    idFactory: (prefix) => `${prefix}-${++ids}`,
    now: "2026-09-04T12:00:00.000Z",
  });
}

test("cria duas propriedades e lista por accountId", async () => {
  const database = new FakeDatabase();
  const repository = createRepository(database);

  const boaVista = await repository.createProperty("account-1", {
    name: "Boa Vista",
    municipality: "Uberaba",
    state: "mg",
  });
  const saoRomao = await repository.createProperty("account-1", {
    name: "São Romão",
    municipality: "Araxá",
    state: "mg",
  });
  await repository.createProperty("account-2", { name: "Outra Conta" });
  const list = await repository.listProperties("account-1", { includeArchived: true });

  assert.equal(boaVista.status, "saved");
  assert.equal(saoRomao.status, "saved");
  assert.deepEqual(list.properties.map((property) => property.name), ["Boa Vista", "São Romão"]);
  assert.ok(list.properties.every((property) => property.accountId === "account-1"));
});

test("edita propriedade sem trocar ID", async () => {
  const repository = createRepository();
  const created = await repository.createProperty("account-1", { name: "Boa Vista", state: "mg" });
  repository.now = "2026-09-04T13:00:00.000Z";

  const updated = await repository.updateProperty("account-1", created.property.id, {
    name: "Boa Vista - Unidade Principal",
    municipality: "Uberaba",
    state: "MG",
    notes: "novo curral",
  });

  assert.equal(updated.status, "saved");
  assert.equal(updated.property.id, created.property.id);
  assert.equal(updated.property.name, "Boa Vista - Unidade Principal");
  assert.equal(updated.property.notes, "novo curral");
});

test("arquiva e reativa propriedade sem apagar registro", async () => {
  const repository = createRepository();
  const created = await repository.createProperty("account-1", { name: "São Romão" });

  const archived = await repository.archiveProperty("account-1", created.property.id);
  const activeList = await repository.listProperties("account-1");
  const allList = await repository.listProperties("account-1", { includeArchived: true });
  const reactivated = await repository.reactivateProperty("account-1", created.property.id);

  assert.equal(archived.status, "saved");
  assert.equal(archived.property.status, PropertyCore.ARCHIVED_STATUS);
  assert.equal(activeList.properties.length, 0);
  assert.equal(allList.properties.length, 1);
  assert.equal(reactivated.property.status, PropertyCore.ACTIVE_STATUS);
});

test("não retorna nem altera propriedade de outra conta", async () => {
  const repository = createRepository();
  const created = await repository.createProperty("account-2", { name: "Fazenda 4" });

  const getWrongAccount = await repository.getProperty("account-1", created.property.id);
  const updateWrongAccount = await repository.updateProperty("account-1", created.property.id, { name: "Alterada" });
  const archiveWrongAccount = await repository.archiveProperty("account-1", created.property.id);

  assert.equal(getWrongAccount.status, "missing");
  assert.equal(updateWrongAccount.status, "missing");
  assert.equal(archiveWrongAccount.status, "missing");
});

test("nome vazio retorna erro compreensível", async () => {
  const repository = createRepository();
  const result = await repository.createProperty("account-1", { name: " " });

  assert.equal(result.status, "invalid");
  assert.equal(result.errors.name, "Informe o nome da propriedade.");
});
