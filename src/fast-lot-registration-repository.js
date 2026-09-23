const FastLotRegistrationRepository = ((baseRef, lotRef) => {
  const Base = baseRef || require("./herd-repository.js");
  const Lots = lotRef || require("./lot-core.js");
  class Repository extends Base.Repository {
    constructor(options = {}) { super("lot", Lots, options); }
    createLotWithAnimals(accountId, propertyId, data) {
      return this.mutate(accountId, propertyId, null, data, "createFast");
    }
  }
  return { Repository, createFastLotRegistrationRepository: (options) => new Repository(options) };
})(typeof window !== "undefined" ? window.HerdRepository : undefined, typeof window !== "undefined" ? window.LotCore : undefined);
if (typeof module !== "undefined") module.exports = FastLotRegistrationRepository;
if (typeof window !== "undefined") window.FastLotRegistrationRepository = FastLotRegistrationRepository;
