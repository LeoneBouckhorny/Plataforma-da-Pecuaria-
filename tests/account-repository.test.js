const test = require("node:test");
const assert = require("node:assert/strict");
const AccountRepository = require("../src/account-repository.js");
const LocalDatabase = require("../src/local-database.js");

class FakeDatabase {
  constructor() {
    this.stores = {
      [LocalDatabase.ACCOUNTS_STORE]: new Map(),
      [LocalDatabase.APP_SETTINGS_STORE]: new Map(),
    };
  }

  async get(storeName, key) {
    const value = this.stores[storeName].get(key);
    return value ? structuredClone(value) : undefined;
  }

  async put(storeName, value) {
    const key = storeName === LocalDatabase.APP_SETTINGS_STORE ? value.key : value.id;
    this.stores[storeName].set(key, structuredClone(value));
    return value;
  }

  async getAll(storeName) {
    return Array.from(this.stores[storeName].values()).map((value) => structuredClone(value));
  }

  close() {}
}

test("cria operação local e grava active-account-id", async () => {
  const database = new FakeDatabase();
  const repository = AccountRepository.createAccountRepository({
    database,
    idFactory: (prefix) => `${prefix}-1`,
    now: "2026-09-04T12:00:00.000Z",
  });

  const result = await repository.ensureLocalAccount();
  const setting = await database.get(LocalDatabase.APP_SETTINGS_STORE, AccountRepository.ACTIVE_ACCOUNT_SETTING_KEY);

  assert.equal(result.status, "created");
  assert.equal(result.account.id, "account-1");
  assert.equal(result.account.name, "Minha operação");
  assert.equal(setting.value, "account-1");
  assert.equal(database.stores[LocalDatabase.ACCOUNTS_STORE].size, 1);
});

test("ensureLocalAccount chamado duas vezes não duplica conta", async () => {
  const database = new FakeDatabase();
  let ids = 0;
  const repository = AccountRepository.createAccountRepository({
    database,
    idFactory: (prefix) => `${prefix}-${++ids}`,
  });

  const first = await repository.ensureLocalAccount();
  const second = await repository.ensureLocalAccount();

  assert.equal(first.account.id, second.account.id);
  assert.equal(database.stores[LocalDatabase.ACCOUNTS_STORE].size, 1);
});

test("reutiliza conta ativa existente quando setting ainda não existe", async () => {
  const database = new FakeDatabase();
  await database.put(LocalDatabase.ACCOUNTS_STORE, {
    id: "account-existente",
    name: "Fazendas Leone",
    status: "active",
    createdAt: "2026-09-04T10:00:00.000Z",
    updatedAt: "2026-09-04T10:00:00.000Z",
  });
  const repository = AccountRepository.createAccountRepository({ database });

  const result = await repository.ensureLocalAccount();
  const setting = await database.get(LocalDatabase.APP_SETTINGS_STORE, AccountRepository.ACTIVE_ACCOUNT_SETTING_KEY);

  assert.equal(result.status, "loaded");
  assert.equal(result.account.id, "account-existente");
  assert.equal(setting.value, "account-existente");
  assert.equal(database.stores[LocalDatabase.ACCOUNTS_STORE].size, 1);
});

test("atualiza nome da operação sem trocar ID", async () => {
  const database = new FakeDatabase();
  const repository = AccountRepository.createAccountRepository({
    database,
    idFactory: (prefix) => `${prefix}-1`,
    now: "2026-09-04T12:00:00.000Z",
  });

  await repository.ensureLocalAccount();
  repository.now = "2026-09-04T13:00:00.000Z";
  const result = await repository.updateAccountName("  Fazendas   Leone  ");

  assert.equal(result.status, "saved");
  assert.equal(result.account.id, "account-1");
  assert.equal(result.account.name, "Fazendas Leone");
  assert.equal(result.account.updatedAt, "2026-09-04T13:00:00.000Z");
});
