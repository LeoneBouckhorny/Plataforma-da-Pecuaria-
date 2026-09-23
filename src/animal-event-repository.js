const AnimalEventRepository = ((dbRef, coreRef) => {
  const DB = dbRef || require("./local-database.js");
  const Core = coreRef || require("./animal-event-core.js");
  const matches = (entity, accountId, propertyId, animalId) => entity && entity.accountId === accountId
    && entity.propertyId === propertyId && (animalId === undefined || entity.animalId === animalId);
  class Repository {
    constructor(options = {}) { this.database = options.database || DB.createLocalDatabase(); this.options = options; }
    async validAnimal(accountId, propertyId, animalId) {
      const animal = await this.database.get("animals", animalId);
      const property = await this.database.get("properties", propertyId);
      return matches(animal, accountId, propertyId) && property?.accountId === accountId;
    }
    async getEvent(accountId, propertyId, animalId, id) {
      try {
        if (!await this.validAnimal(accountId, propertyId, animalId)) return { status: "missing" };
        const event = await this.database.get("animal-events", id);
        return matches(event, accountId, propertyId, animalId) ? { status: "loaded", event: Core.normalizeEvent(event) } : { status: "missing" };
      } catch (error) { return { status: "failed", error }; }
    }
    async listAnimalEvents(accountId, propertyId, animalId) {
      try {
        if (!await this.validAnimal(accountId, propertyId, animalId)) return { status: "missing", events: [] };
        const events = await this.database.getAllByIndex("animal-events", "animalId", animalId);
        return { status: "loaded", events: Core.sortTimeline(events.filter((event) => matches(event, accountId, propertyId, animalId)).map(Core.normalizeEvent)) };
      } catch (error) { return { status: "failed", error, events: [] }; }
    }
    async saveNote(accountId, propertyId, animalId, id, data) {
      try {
        return await this.database.writeTransaction(["accounts", "properties", "animals", "animal-events"], async ({ store, requestToPromise: request }) => {
          const account = await request(store("accounts").get(accountId));
          const property = await request(store("properties").get(propertyId));
          const animal = await request(store("animals").get(animalId));
          if (!account || property?.accountId !== accountId || !matches(animal, accountId, propertyId)) return { status: "missing" };
          if (property.status !== "active") return { status: "invalid", errors: { propertyId: "Reative a propriedade antes de registrar observações." } };
          const target = store("animal-events");
          const existing = id ? await request(target.get(id)) : null;
          if (id && !matches(existing, accountId, propertyId, animalId)) return { status: "missing" };
          if (data.type !== undefined && data.type !== "note") return { status: "invalid", errors: { type: "Somente observações podem ser editadas." } };
          const result = id ? Core.updateNoteEvent(existing, data, this.options) : Core.createEvent({ accountId, propertyId, animalId,
            type: "note", occurredAt: data.occurredAt, notes: data.notes }, this.options);
          if (!result.valid) return { status: "invalid", errors: result.errors };
          await request(id ? target.put(result.event) : target.add(result.event));
          return { status: "saved", event: result.event };
        });
      } catch (error) { return { status: "failed", error }; }
    }
    createNoteEvent(accountId, propertyId, animalId, data) { return this.saveNote(accountId, propertyId, animalId, null, data); }
    updateNoteEvent(accountId, propertyId, animalId, id, data) { return this.saveNote(accountId, propertyId, animalId, id, data); }
  }
  return { Repository, createAnimalEventRepository: (options) => new Repository(options) };
})(typeof window !== "undefined" ? window.LocalDatabase : undefined, typeof window !== "undefined" ? window.AnimalEventCore : undefined);
if (typeof module !== "undefined") module.exports = AnimalEventRepository;
if (typeof window !== "undefined") window.AnimalEventRepository = AnimalEventRepository;
