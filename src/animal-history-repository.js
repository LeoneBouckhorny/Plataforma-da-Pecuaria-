const AnimalHistoryRepository = ((dbRef, coreRef) => {
  const DB = dbRef || require("./local-database.js");
  const Core = coreRef || require("./animal-history-core.js");
  class Repository {
    constructor(options = {}) { this.database = options.database || DB.createLocalDatabase(); }
    async getAnimalHistory(accountId, propertyId, animalId) {
      try {
        // Read one selected animal, never load timelines for the entire herd.
        const animal = await this.database.get("animals", animalId);
        const property = await this.database.get("properties", propertyId);
        if (!animal || animal.accountId !== accountId || animal.propertyId !== propertyId || property?.accountId !== accountId) return { status: "missing" };
        const matches = (record) => record && record.accountId === accountId && record.propertyId === propertyId;
        const events = (await this.database.getAllByIndex("animal-events", "animalId", animalId)).filter((event) => matches(event) && event.animalId === animalId);
        const items = await this.database.getAllByIndex("weighing-items", "animalId", animalId);
        const sessions = new Map();
        const weighings = [];
        for (const item of items) {
          if (item.animalId !== animalId) continue;
          if (!sessions.has(item.sessionId)) sessions.set(item.sessionId, await this.database.get("weighing-sessions", item.sessionId));
          const session = sessions.get(item.sessionId);
          if (matches(session) && session.status === "completed") weighings.push({ item, session });
        }
        const lot = animal.lotId ? await this.database.get("lots", animal.lotId) : null;
        const currentLot = matches(lot) ? lot : null;
        const paddock = currentLot?.paddockId ? await this.database.get("paddocks", currentLot.paddockId) : null;
        return { status: "loaded", animal, lot: currentLot, paddock: matches(paddock) ? paddock : null,
          ...Core.buildHistory(animal, events, weighings) };
      } catch (error) { return { status: "failed", error }; }
    }
  }
  return { Repository, createAnimalHistoryRepository: (options) => new Repository(options) };
})(typeof window !== "undefined" ? window.LocalDatabase : undefined, typeof window !== "undefined" ? window.AnimalHistoryCore : undefined);
if (typeof module !== "undefined") module.exports = AnimalHistoryRepository;
if (typeof window !== "undefined") window.AnimalHistoryRepository = AnimalHistoryRepository;
