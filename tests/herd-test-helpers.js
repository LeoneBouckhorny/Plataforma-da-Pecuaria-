class MemoryDatabase {
  constructor() {
    this.stores = Object.fromEntries(["accounts", "properties", "paddocks", "lots", "animals", "weighing-sessions", "weighing-items"].map((name) => [name, new Map()]));
    this.stores.accounts.set("a", { id: "a" });
    this.stores.accounts.set("b", { id: "b" });
    for (const [id, accountId] of [["p", "a"], ["q", "a"], ["r", "b"]]) {
      this.stores.properties.set(id, { id, accountId, name: id, status: "active" });
    }
  }
  async get(name, key) { return structuredClone(this.stores[name].get(key)); }
  async getAll(name) { return structuredClone([...this.stores[name].values()]); }
  async getAllByIndex(name, index, key) { return (await this.getAll(name)).filter((item) => item[index] === key); }
  async writeTransaction(names, action) {
    const backup = structuredClone(this.stores);
    this.lastTransaction = names;
    const store = (name) => ({
      get: (key) => ({ result: structuredClone(this.stores[name].get(key)) }),
      put: (value) => ({ result: this.stores[name].set(value.id, structuredClone(value)) }),
      add: (value) => {
        if (this.stores[name].has(value.id)) throw new Error("ConstraintError");
        return { result: this.stores[name].set(value.id, structuredClone(value)) };
      },
      index: (index) => ({ getAll: (key) => ({ result: structuredClone([...this.stores[name].values()].filter((item) => item[index] === key)) }) }),
    });
    try { return await action({ store, requestToPromise: (request) => Promise.resolve(request.result) }); }
    catch (error) { this.stores = backup; throw error; }
  }
}
function fixture() {
  const database = new MemoryDatabase();
  let sequence = 0;
  const options = { database, idFactory: (prefix) => `${prefix}-${++sequence}`, now: "2026-09-21T12:00:00.000Z" };
  return { database,
    paddock: require("../src/paddock-repository.js").createPaddockRepository(options),
    lot: require("../src/lot-repository.js").createLotRepository(options),
    animal: require("../src/animal-repository.js").createAnimalRepository(options) };
}
module.exports = { MemoryDatabase, fixture };
