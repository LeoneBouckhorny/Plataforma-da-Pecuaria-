const HerdRepository = ((ref) => {
  const DB = ref || require("./local-database.js");
  const stores = ["accounts", "properties", "paddocks", "lots", "animals"];
  const scoped = (entity, accountId, propertyId) => Boolean(entity)
    && entity.accountId === accountId && entity.propertyId === propertyId;
  const invalid = (field, message) => ({ status: "invalid", errors: { [field]: message } });

  class Repository {
    constructor(kind, core, options = {}) {
      this.kind = kind;
      this.storeName = `${kind}s`;
      this.core = core;
      this.database = options.database || DB.createLocalDatabase();
      this.options = options;
    }
    async get(accountId, propertyId, id) {
      try {
        const property = await this.database.get("properties", propertyId);
        if (!accountId || !propertyId || !property || property.accountId !== accountId) return { status: "missing" };
        const entity = await this.database.get(this.storeName, id);
        return scoped(entity, accountId, propertyId)
          ? { status: "loaded", [this.kind]: this.core.normalize(entity) } : { status: "missing" };
      } catch (error) { return { status: "failed", error }; }
    }
    async list(accountId, propertyId, options = {}) {
      try {
        const property = await this.database.get("properties", propertyId);
        if (!accountId || !propertyId || !property || property.accountId !== accountId) {
          return { status: "loaded", [this.storeName]: [] };
        }
        const all = await this.database.getAllByIndex(this.storeName, "propertyId", propertyId);
        return { status: "loaded", [this.storeName]: all.filter((entity) => scoped(entity, accountId, propertyId)
          && (options.includeArchived || entity.status === "active")).map(this.core.normalize)
          .sort((a, b) => a.status.localeCompare(b.status) || this.core.formatIdentification(a).localeCompare(this.core.formatIdentification(b), "pt-BR")) };
      } catch (error) { return { status: "failed", error, [this.storeName]: [] }; }
    }
    async mutate(accountId, propertyId, id, data, action) {
      try {
        // One overlapping read/write transaction protects references and archive guards.
        return await this.database.writeTransaction(stores, async ({ store, requestToPromise: request }) => {
          const account = await request(store("accounts").get(accountId));
          const property = await request(store("properties").get(propertyId));
          if (!account || !property || property.accountId !== accountId) {
            return invalid("propertyId", "Propriedade não encontrada nesta operação.");
          }
          if (property.status !== "active") return invalid("propertyId", "Reative a propriedade antes de alterar o rebanho.");
          const target = store(this.storeName);
          const existing = id ? await request(target.get(id)) : null;
          if (action !== "create" && !scoped(existing, accountId, propertyId)) return { status: "missing" };
          let result;
          if (action === "create") result = this.core.create(accountId, propertyId, data, this.options);
          else if (action === "update") result = this.core.update(existing, data, this.options);
          else result = this.core.validate(this.core[action](existing, this.options));
          if (!result.valid) return { status: "invalid", errors: result.errors };
          const entity = result[this.kind];
          const parentField = this.kind === "lot" ? "paddockId" : this.kind === "animal" ? "lotId" : null;
          if (parentField && entity[parentField]) {
            const parentStore = this.kind === "lot" ? "paddocks" : "lots";
            const parent = await request(store(parentStore).get(entity[parentField]));
            if (!scoped(parent, accountId, propertyId)) return invalid(parentField, "O vínculo deve pertencer à mesma operação e propriedade.");
            if (entity.status === "active" && parent.status !== "active") {
              return invalid(parentField, "O vínculo está arquivado. Reative-o ou escolha outro vínculo.");
            }
          }
          if (action === "archive" && this.kind !== "animal") {
            const childStore = this.kind === "paddock" ? "lots" : "animals";
            const childField = this.kind === "paddock" ? "paddockId" : "lotId";
            const children = await request(store(childStore).index("propertyId").getAll(propertyId));
            if (children.some((child) => scoped(child, accountId, propertyId) && child.status === "active" && child[childField] === id)) {
              return invalid("status", this.kind === "paddock"
                ? "Este pasto possui lote ativo. Mova ou desvincule o lote antes de arquivar."
                : "Este lote possui animais ativos. Mova ou desvincule os animais antes de arquivar.");
            }
          }
          await request(action === "create" ? target.add(entity) : target.put(entity));
          return { status: "saved", [this.kind]: entity };
        });
      } catch (error) { return { status: "failed", error }; }
    }
    create(accountId, propertyId, data) { return this.mutate(accountId, propertyId, null, data, "create"); }
    update(accountId, propertyId, id, data) { return this.mutate(accountId, propertyId, id, data, "update"); }
    archive(accountId, propertyId, id) { return this.mutate(accountId, propertyId, id, {}, "archive"); }
    reactivate(accountId, propertyId, id) { return this.mutate(accountId, propertyId, id, {}, "reactivate"); }
  }
  return { Repository };
})(typeof window !== "undefined" ? window.LocalDatabase : undefined);
if (typeof module !== "undefined") module.exports = HerdRepository;
if (typeof window !== "undefined") window.HerdRepository = HerdRepository;
