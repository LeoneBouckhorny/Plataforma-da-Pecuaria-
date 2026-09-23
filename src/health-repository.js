const HealthRepository = ((dbRef, coreRef, propertyRef) => {
  const DB = dbRef || require("./local-database.js");
  const Core = coreRef || require("./animal-event-core.js");
  const P = propertyRef || require("./property-core.js");
  const scoped = (record, accountId, propertyId) => record && record.accountId === accountId && record.propertyId === propertyId;
  const invalid = (key, message) => ({ status: "invalid", errors: { [key]: message } });
  class Repository {
    constructor(options = {}) { this.database = options.database || DB.createLocalDatabase(); this.options = options; }
    async list(accountId, propertyId, filters = {}) {
      try {
        const property = await this.database.get("properties", propertyId);
        if (!accountId || property?.accountId !== accountId) return { status: "missing", events: [] };
        const events = await this.database.getAllByIndex("animal-events", "propertyId", propertyId);
        return { status: "loaded", events: Core.filterHealthEvents(events.filter((event) => scoped(event, accountId, propertyId)).map(Core.normalizeEvent), filters) };
      } catch (error) { return { status: "failed", error, events: [] }; }
    }
    async register(accountId, propertyId, animalIds, data, context = {}) {
      try {
        if (!Array.isArray(animalIds) || !animalIds.length || animalIds.some((id) => typeof id !== "string" || !id)
          || new Set(animalIds).size !== animalIds.length) return invalid("animalIds", "Selecione ao menos um animal, sem repetições.");
        return await this.database.writeTransaction(["accounts", "properties", "paddocks", "lots", "animals", "animal-events"], async ({ store, requestToPromise: request }) => {
          const account = await request(store("accounts").get(accountId));
          const property = await request(store("properties").get(propertyId));
          if (!account || property?.accountId !== accountId || property.status !== "active") return invalid("propertyId", "Selecione uma propriedade ativa desta operação.");
          const operationId = P.createStableId("health-operation", this.options);
          const events = [];
          for (const animalId of animalIds) {
            const animal = await request(store("animals").get(animalId));
            if (!scoped(animal, accountId, propertyId) || animal.status !== "active") return invalid("animalIds", "Um animal não está mais ativo nesta propriedade. Reabra a seleção.");
            if (context.lotId && animal.lotId !== context.lotId) return invalid("animalIds", "Um animal mudou de lote. Reabra a seleção antes de registrar.");
            const lot = animal.lotId ? await request(store("lots").get(animal.lotId)) : null;
            if (animal.lotId && !scoped(lot, accountId, propertyId)) return invalid("animalIds", "O lote do animal não pertence a esta propriedade.");
            const paddock = lot?.paddockId ? await request(store("paddocks").get(lot.paddockId)) : null;
            if (lot?.paddockId && !scoped(paddock, accountId, propertyId)) return invalid("animalIds", "O pasto do animal não pertence a esta propriedade.");
            const input = {};
            for (const key of ["healthType", "occurredAt", "productName", "doseValue", "doseUnit", "route", "productBatch", "responsible", "nextDueDate", "withdrawalUntil", "notes"]) input[key] = data[key];
            const result = Core.createEvent({ ...input, type: "health", accountId, propertyId, animalId, operationId,
              lotId: lot?.id, lotNameSnapshot: lot?.name, paddockId: paddock?.id, paddockNameSnapshot: paddock?.name }, this.options);
            if (!result.valid) return { status: "invalid", errors: result.errors };
            events.push(result.event);
          }
          // Validate every recipient and snapshot before writing; failures abort the whole operation.
          for (const event of events) await request(store("animal-events").add(event));
          return { status: "saved", operationId, events };
        });
      } catch (error) { return { status: "failed", error }; }
    }
  }
  return { Repository, createHealthRepository: (options) => new Repository(options) };
})(typeof window !== "undefined" ? window.LocalDatabase : undefined, typeof window !== "undefined" ? window.AnimalEventCore : undefined,
  typeof window !== "undefined" ? window.PropertyCore : undefined);
if (typeof module !== "undefined") module.exports = HealthRepository;
if (typeof window !== "undefined") window.HealthRepository = HealthRepository;
