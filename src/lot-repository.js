const LotRepository = ((baseRef, coreRef) => {
  const Base = baseRef || require("./herd-repository.js");
  const Core = coreRef || require("./lot-core.js");
  class Repository extends Base.Repository {
    constructor(options = {}) { super("lot", Core, options); }
    createLot(accountId, propertyId, data) { return this.create(accountId, propertyId, data); }
    updateLot(accountId, propertyId, id, data) { return this.update(accountId, propertyId, id, data); }
    getLot(accountId, propertyId, id) { return this.get(accountId, propertyId, id); }
    listLots(accountId, propertyId, options) { return this.list(accountId, propertyId, options); }
    archiveLot(accountId, propertyId, id) { return this.archive(accountId, propertyId, id); }
    reactivateLot(accountId, propertyId, id) { return this.reactivate(accountId, propertyId, id); }
    changePaddock(accountId, propertyId, id, paddockId) { return this.update(accountId, propertyId, id, { paddockId }); }
  }
  return { Repository, createLotRepository: (options) => new Repository(options) };
})(typeof window !== "undefined" ? window.HerdRepository : undefined,
  typeof window !== "undefined" ? window.LotCore : undefined);
if (typeof module !== "undefined") module.exports = LotRepository;
if (typeof window !== "undefined") window.LotRepository = LotRepository;
