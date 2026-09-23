const AnimalRepository = ((baseRef, coreRef) => {
  const Base = baseRef || require("./herd-repository.js");
  const Core = coreRef || require("./animal-core.js");
  class Repository extends Base.Repository {
    constructor(options = {}) { super("animal", Core, options); }
    createAnimal(accountId, propertyId, data) { return this.create(accountId, propertyId, data); }
    updateAnimal(accountId, propertyId, id, data) { return this.update(accountId, propertyId, id, data); }
    getAnimal(accountId, propertyId, id) { return this.get(accountId, propertyId, id); }
    listAnimals(accountId, propertyId, options) { return this.list(accountId, propertyId, options); }
    archiveAnimal(accountId, propertyId, id) { return this.archive(accountId, propertyId, id); }
    reactivateAnimal(accountId, propertyId, id) { return this.reactivate(accountId, propertyId, id); }
    changeAnimalLot(accountId, propertyId, id, lotId) { return this.mutate(accountId, propertyId, id, { lotId }, "changeLot"); }
    changeLot(accountId, propertyId, id, lotId) { return this.changeAnimalLot(accountId, propertyId, id, lotId); }
  }
  return { Repository, createAnimalRepository: (options) => new Repository(options) };
})(typeof window !== "undefined" ? window.HerdRepository : undefined,
  typeof window !== "undefined" ? window.AnimalCore : undefined);
if (typeof module !== "undefined") module.exports = AnimalRepository;
if (typeof window !== "undefined") window.AnimalRepository = AnimalRepository;
