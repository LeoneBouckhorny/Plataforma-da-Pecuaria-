const WeighingRepository = ((LocalDatabaseRef, WeighingHistoryCoreRef) => {
  const LocalDatabase = LocalDatabaseRef || (typeof require === "function"
    ? require("./local-database.js")
    : null);
  const WeighingHistoryCore = WeighingHistoryCoreRef || (typeof require === "function"
    ? require("./weighing-history-core.js")
    : null);

  if (!LocalDatabase || !WeighingHistoryCore) {
    throw new Error("Dependências do histórico de pesagens indisponíveis.");
  }

  class Repository {
    constructor(options = {}) {
      this.database = options.database || LocalDatabase.createLocalDatabase(options);
    }

    async saveCompletedSession(snapshot) {
      const normalized = WeighingHistoryCore.normalizeSnapshot(snapshot);
      const validation = WeighingHistoryCore.validateSnapshot(normalized);
      if (!validation.valid) {
        return { status: "invalid", errors: validation.errors, session: null };
      }

      try {
        await this.database.writeTransaction([
          LocalDatabase.WEIGHING_SESSIONS_STORE,
          LocalDatabase.WEIGHING_ITEMS_STORE,
          ...(normalized.session.lotId ? ["properties", "lots", "paddocks"] : []),
        ], async ({ store, requestToPromise }) => {
          if (normalized.session.lotId) {
            const session = normalized.session;
            const lot = await requestToPromise(store("lots").get(session.lotId));
            const property = await requestToPromise(store("properties").get(session.propertyId));
            if (!property || property.accountId !== session.accountId || property.status !== "active"
              || !lot || lot.accountId !== session.accountId || lot.propertyId !== session.propertyId || lot.status !== "active") {
              throw new Error("O lote selecionado não está ativo nesta propriedade.");
            }
            const paddock = lot.paddockId ? await requestToPromise(store("paddocks").get(lot.paddockId)) : null;
            if (lot.paddockId && (!paddock || paddock.accountId !== session.accountId || paddock.propertyId !== session.propertyId)) {
              throw new Error("O pasto do lote não pertence à propriedade.");
            }
            // Capture current names/location atomically with the historical write.
            session.propertyNameSnapshot = property.name;
            session.lotNameSnapshot = lot.name;
            session.paddockId = paddock ? paddock.id : null;
            session.paddockNameSnapshot = paddock ? paddock.name : "";
          } else {
            normalized.session.lotNameSnapshot = "";
            normalized.session.paddockId = null;
            normalized.session.paddockNameSnapshot = "";
          }
          const sessionStore = store(LocalDatabase.WEIGHING_SESSIONS_STORE);
          const itemStore = store(LocalDatabase.WEIGHING_ITEMS_STORE);
          const requests = [requestToPromise(sessionStore.put(normalized.session))];

          normalized.items.forEach((item) => {
            requests.push(requestToPromise(itemStore.put(item)));
          });

          return Promise.all(requests);
        });

        return { status: "saved", errors: [], session: normalized.session };
      } catch (error) {
        return { status: "failed", errors: [error], session: null };
      }
    }

    async listSessions(options = {}) {
      try {
        const sessions = await this.database.getAll(LocalDatabase.WEIGHING_SESSIONS_STORE);
        const hasAccountFilter = options.accountId !== undefined;
        const hasPropertyFilter = options.propertyId !== undefined;
        return {
          status: "loaded",
          sessions: sessions
            .map(WeighingHistoryCore.normalizeSession)
            .filter((session) => {
              if (hasAccountFilter && session.accountId !== null && session.accountId !== String(options.accountId || "")) {
                return false;
              }

              if (hasPropertyFilter) {
                const propertyId = options.propertyId == null ? null : String(options.propertyId);
                if (session.propertyId !== propertyId) return false;
              }

              if (options.lotId !== undefined && session.lotId !== (options.lotId == null ? null : String(options.lotId))) return false;

              return true;
            })
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
          error: null,
        };
      } catch (error) {
        return { status: "failed", sessions: [], error };
      }
    }

    async getSession(sessionId) {
      try {
        const session = await this.database.get(LocalDatabase.WEIGHING_SESSIONS_STORE, sessionId);
        return {
          status: session ? "loaded" : "missing",
          session: session ? WeighingHistoryCore.normalizeSession(session) : null,
          error: null,
        };
      } catch (error) {
        return { status: "failed", session: null, error };
      }
    }

    async getItems(sessionId) {
      try {
        const items = await this.database.getAllByIndex(
          LocalDatabase.WEIGHING_ITEMS_STORE,
          LocalDatabase.SESSION_ID_INDEX,
          sessionId,
        );
        return {
          status: "loaded",
          items: items.map(WeighingHistoryCore.normalizeItem),
          error: null,
        };
      } catch (error) {
        return { status: "failed", items: [], error };
      }
    }

    async getSessionWithItems(sessionId) {
      const sessionResult = await this.getSession(sessionId);
      if (sessionResult.status !== "loaded") {
        return { status: sessionResult.status, session: null, items: [], error: sessionResult.error };
      }

      const itemsResult = await this.getItems(sessionId);
      return {
        status: itemsResult.status,
        session: sessionResult.session,
        items: itemsResult.items,
        error: itemsResult.error,
      };
    }

    async deleteSession(sessionId) {
      try {
        await this.database.writeTransaction([
          LocalDatabase.WEIGHING_SESSIONS_STORE,
          LocalDatabase.WEIGHING_ITEMS_STORE,
        ], ({ store, requestToPromise, deleteByIndex }) => {
          const sessionStore = store(LocalDatabase.WEIGHING_SESSIONS_STORE);
          const itemStore = store(LocalDatabase.WEIGHING_ITEMS_STORE);

          return Promise.all([
            requestToPromise(sessionStore.delete(sessionId)),
            deleteByIndex(itemStore, LocalDatabase.SESSION_ID_INDEX, sessionId),
          ]);
        });

        return { status: "deleted", error: null };
      } catch (error) {
        return { status: "failed", error };
      }
    }
  }

  function createWeighingRepository(options = {}) {
    return new Repository(options);
  }

  return {
    Repository,
    createWeighingRepository,
  };
})(
  typeof window !== "undefined" ? window.LocalDatabase : undefined,
  typeof window !== "undefined" ? window.WeighingHistoryCore : undefined,
);

if (typeof module !== "undefined") {
  module.exports = WeighingRepository;
}

if (typeof window !== "undefined") {
  window.WeighingRepository = WeighingRepository;
}
