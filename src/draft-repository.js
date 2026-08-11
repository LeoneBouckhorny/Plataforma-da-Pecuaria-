const DraftRepository = ((LocalDataCoreRef, LocalDatabaseRef) => {
  const LocalDataCore = LocalDataCoreRef || (typeof require === "function"
    ? require("./local-data-core.js")
    : null);
  const LocalDatabase = LocalDatabaseRef || (typeof require === "function"
    ? require("./local-database.js")
    : null);

  if (!LocalDataCore || !LocalDatabase) {
    throw new Error("Dependências de persistência local indisponíveis.");
  }

  class Repository {
    constructor(options = {}) {
      this.database = options.database || LocalDatabase.createLocalDatabase(options);
    }

    async loadDraft() {
      try {
        const record = await this.database.get(LocalDatabase.DRAFT_STORE, LocalDataCore.DRAFT_KEY);
        if (!record) {
          return { status: "empty", draft: null, error: null };
        }

        const validation = LocalDataCore.validateDraftRecord(record);
        if (!validation.valid) {
          return { status: "incompatible", draft: null, error: validation.reason };
        }

        return { status: "loaded", draft: validation.draft, error: null };
      } catch (error) {
        return { status: "failed", draft: null, error };
      }
    }

    async saveDraft(source) {
      if (!LocalDataCore.isDraftEligibleForPersistence(source)) {
        return { status: "skipped", draft: null, error: null };
      }

      try {
        const draft = LocalDataCore.createDraft(source);
        await this.database.put(LocalDatabase.DRAFT_STORE, draft);
        return { status: "saved", draft, error: null };
      } catch (error) {
        return { status: "failed", draft: null, error };
      }
    }

    async deleteDraft() {
      try {
        await this.database.delete(LocalDatabase.DRAFT_STORE, LocalDataCore.DRAFT_KEY);
        return { status: "deleted", error: null };
      } catch (error) {
        return { status: "failed", error };
      }
    }

    close() {
      this.database.close();
    }
  }

  function createDraftRepository(options = {}) {
    return new Repository(options);
  }

  return {
    Repository,
    createDraftRepository,
  };
})(
  typeof window !== "undefined" ? window.LocalDataCore : undefined,
  typeof window !== "undefined" ? window.LocalDatabase : undefined,
);

if (typeof module !== "undefined") {
  module.exports = DraftRepository;
}

if (typeof window !== "undefined") {
  window.DraftRepository = DraftRepository;
}
