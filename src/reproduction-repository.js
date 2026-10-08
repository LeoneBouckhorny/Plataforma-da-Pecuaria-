const ReproductionRepository = ((dbRef, coreRef) => {
  const DB = dbRef || require("./local-database.js");
  const Core = coreRef || require("./animal-event-core.js");
  const scoped = (record, accountId, propertyId) => record && record.accountId === accountId && record.propertyId === propertyId;
  const invalid = (key, message) => ({ status: "invalid", errors: { [key]: message } });
  class Repository {
    constructor(options = {}) { this.database = options.database || DB.createLocalDatabase(); this.options = options; }
    async list(accountId, propertyId, filters = {}) {
      try {
        const property = await this.database.get("properties", propertyId);
        if (!accountId || property?.accountId !== accountId) return { status: "missing", events: [] };
        const events = await this.database.getAllByIndex("animal-events", "propertyId", propertyId);
        return { status: "loaded", events: Core.filterReproductionEvents(events.filter((event) => scoped(event, accountId, propertyId)).map(Core.normalizeEvent), filters) };
      } catch (error) { return { status: "failed", error, events: [] }; }
    }
    async register(accountId, propertyId, animalId, data = {}) {
      try {
        if (typeof animalId !== "string" || !animalId) return invalid("animalId", "Selecione um animal.");
        return await this.database.writeTransaction(["accounts", "properties", "animals", "lots", "paddocks", "animal-events"], async ({ store, requestToPromise: request }) => {
          const account = await request(store("accounts").get(accountId));
          const property = await request(store("properties").get(propertyId));
          if (!account || property?.accountId !== accountId || property.status !== "active") return invalid("propertyId", "Selecione uma propriedade ativa desta operação.");
          const animal = await request(store("animals").get(animalId));
          if (!scoped(animal, accountId, propertyId) || animal.status !== "active") return invalid("animalId", "Selecione um animal ativo desta propriedade.");
          if (!["female", "unknown"].includes(animal.sex)) return invalid("animalId", "Machos não podem receber eventos reprodutivos de matriz.");
          const lot = animal.lotId ? await request(store("lots").get(animal.lotId)) : null;
          if (animal.lotId && !scoped(lot, accountId, propertyId)) return invalid("animalId", "O lote do animal não pertence a esta propriedade.");
          const paddock = lot?.paddockId ? await request(store("paddocks").get(lot.paddockId)) : null;
          if (lot?.paddockId && !scoped(paddock, accountId, propertyId)) return invalid("animalId", "O pasto do animal não pertence a esta propriedade.");
          const input = { reproductionType: data.reproductionType, occurredAt: data.occurredAt, notes: data.notes };
          let sire = null;
          if (data.reproductionType === "natural_service") {
            input.externalSire = data.externalSire;
            const sireId = String(data.sireAnimalId ?? "").trim();
            if (sireId) {
              sire = await request(store("animals").get(sireId));
              if (!scoped(sire, accountId, propertyId) || sire.status !== "active" || sire.sex !== "male") return invalid("sireAnimalId", "Selecione um reprodutor macho ativo desta propriedade.");
            }
          }
          if (data.reproductionType === "artificial_insemination") {
            for (const key of ["externalSire", "semenBatch", "technician"]) input[key] = data[key];
          }
          if (data.reproductionType === "pregnancy_diagnosis") input.result = data.result;
          if (data.reproductionType === "calving") for (const key of ["calfCount", "maleCalves", "femaleCalves"]) input[key] = data[key];
          const result = Core.createEvent({ ...input, type: "reproduction", accountId, propertyId, animalId,
            sireAnimalId: sire?.id, sireNameSnapshot: sire?.name, sireTagSnapshot: sire?.tag,
            lotId: lot?.id, lotNameSnapshot: lot?.name, paddockId: paddock?.id, paddockNameSnapshot: paddock?.name }, this.options);
          if (!result.valid) return { status: "invalid", errors: result.errors };
          await request(store("animal-events").add(result.event));
          return { status: "saved", event: result.event, warning: animal.sex === "unknown" ? "Sexo não informado: evento registrado sem alterar o cadastro do animal." : null };
        });
      } catch (error) { return { status: "failed", error }; }
    }
  }
  return { Repository, createReproductionRepository: (options) => new Repository(options) };
})(typeof window !== "undefined" ? window.LocalDatabase : undefined, typeof window !== "undefined" ? window.AnimalEventCore : undefined);
if (typeof module !== "undefined") module.exports = ReproductionRepository;
if (typeof window !== "undefined") window.ReproductionRepository = ReproductionRepository;
