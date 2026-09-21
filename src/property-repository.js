const PropertyRepository = ((LocalDatabaseRef, PropertyCoreRef) => {
  const LocalDatabase = LocalDatabaseRef || (typeof require === "function"
    ? require("./local-database.js")
    : null);
  const PropertyCore = PropertyCoreRef || (typeof require === "function"
    ? require("./property-core.js")
    : null);

  if (!LocalDatabase || !PropertyCore) {
    throw new Error("Dependências de propriedades indisponíveis.");
  }

  class Repository {
    constructor(options = {}) {
      this.database = options.database || LocalDatabase.createLocalDatabase(options);
      this.idFactory = options.idFactory;
      this.now = options.now;
    }

    options() {
      return {
        idFactory: this.idFactory,
        now: this.now,
      };
    }

    async createProperty(accountId, data) {
      try {
        const validation = PropertyCore.createProperty(accountId, data, this.options());
        if (!validation.valid) {
          return { status: "invalid", property: null, errors: validation.errors, error: null };
        }

        await this.database.put(LocalDatabase.PROPERTIES_STORE, validation.property);
        return { status: "saved", property: validation.property, errors: {}, error: null };
      } catch (error) {
        return { status: "failed", property: null, errors: {}, error };
      }
    }

    async updateProperty(accountId, propertyId, data) {
      try {
        const current = await this.getProperty(accountId, propertyId);
        if (current.status !== "loaded") {
          return { status: current.status, property: null, errors: {}, error: current.error };
        }

        const validation = PropertyCore.updateProperty(current.property, data, this.options());
        if (!validation.valid) {
          return { status: "invalid", property: current.property, errors: validation.errors, error: null };
        }

        await this.database.put(LocalDatabase.PROPERTIES_STORE, validation.property);
        return { status: "saved", property: validation.property, errors: {}, error: null };
      } catch (error) {
        return { status: "failed", property: null, errors: {}, error };
      }
    }

    async getProperty(accountId, propertyId) {
      try {
        const property = await this.database.get(LocalDatabase.PROPERTIES_STORE, propertyId);
        const normalized = property ? PropertyCore.normalizeProperty(property) : null;

        if (!normalized || normalized.accountId !== String(accountId || "")) {
          return { status: "missing", property: null, error: null };
        }

        return { status: "loaded", property: normalized, error: null };
      } catch (error) {
        return { status: "failed", property: null, error };
      }
    }

    async listProperties(accountId, options = {}) {
      try {
        const properties = await this.database.getAllByIndex(
          LocalDatabase.PROPERTIES_STORE,
          LocalDatabase.ACCOUNT_ID_INDEX,
          String(accountId || ""),
        );
        const includeArchived = options.includeArchived === true;
        const normalized = properties
          .map((property) => PropertyCore.normalizeProperty(property))
          .filter((property) => includeArchived || property.status === PropertyCore.ACTIVE_STATUS)
          .sort((left, right) => {
            if (left.status !== right.status) {
              return left.status === PropertyCore.ACTIVE_STATUS ? -1 : 1;
            }
            return left.name.localeCompare(right.name, "pt-BR");
          });

        return { status: "loaded", properties: normalized, error: null };
      } catch (error) {
        return { status: "failed", properties: [], error };
      }
    }

    async archiveProperty(accountId, propertyId) {
      try {
        const current = await this.getProperty(accountId, propertyId);
        if (current.status !== "loaded") {
          return { status: current.status, property: null, error: current.error };
        }

        const property = PropertyCore.archiveProperty(current.property, this.options());
        await this.database.put(LocalDatabase.PROPERTIES_STORE, property);
        return { status: "saved", property, error: null };
      } catch (error) {
        return { status: "failed", property: null, error };
      }
    }

    async reactivateProperty(accountId, propertyId) {
      try {
        const current = await this.getProperty(accountId, propertyId);
        if (current.status !== "loaded") {
          return { status: current.status, property: null, error: current.error };
        }

        const property = PropertyCore.reactivateProperty(current.property, this.options());
        await this.database.put(LocalDatabase.PROPERTIES_STORE, property);
        return { status: "saved", property, error: null };
      } catch (error) {
        return { status: "failed", property: null, error };
      }
    }

    close() {
      this.database.close();
    }
  }

  function createPropertyRepository(options = {}) {
    return new Repository(options);
  }

  return {
    Repository,
    createPropertyRepository,
  };
})(
  typeof window !== "undefined" ? window.LocalDatabase : undefined,
  typeof window !== "undefined" ? window.PropertyCore : undefined,
);

if (typeof module !== "undefined") {
  module.exports = PropertyRepository;
}

if (typeof window !== "undefined") {
  window.PropertyRepository = PropertyRepository;
}
