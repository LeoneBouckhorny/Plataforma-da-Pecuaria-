const PaddockRepository = ((baseRef, coreRef) => {
  const Base = baseRef || require("./herd-repository.js");
  const Core = coreRef || require("./paddock-core.js");
  class Repository extends Base.Repository {
    constructor(options = {}) { super("paddock", Core, options); }
    createPaddock(accountId, propertyId, data) { return this.create(accountId, propertyId, data); }
    updatePaddock(accountId, propertyId, id, data) { return this.update(accountId, propertyId, id, data); }
    getPaddock(accountId, propertyId, id) { return this.get(accountId, propertyId, id); }
    listPaddocks(accountId, propertyId, options) { return this.list(accountId, propertyId, options); }
    archivePaddock(accountId, propertyId, id) { return this.archive(accountId, propertyId, id); }
    reactivatePaddock(accountId, propertyId, id) { return this.reactivate(accountId, propertyId, id); }
  }
  return { Repository, createPaddockRepository: (options) => new Repository(options) };
})(typeof window !== "undefined" ? window.HerdRepository : undefined,
  typeof window !== "undefined" ? window.PaddockCore : undefined);
if (typeof module !== "undefined") module.exports = PaddockRepository;
if (typeof window !== "undefined") window.PaddockRepository = PaddockRepository;
