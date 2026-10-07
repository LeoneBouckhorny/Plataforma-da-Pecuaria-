const PropertyCore = (() => {
  const ACTIVE_STATUS = "active";
  const ARCHIVED_STATUS = "archived";
  const DEFAULT_ACCOUNT_NAME = "Minha operação";

  function asString(value) {
    return String(value ?? "");
  }

  function compactText(value) {
    return asString(value).replace(/\s+/g, " ").trim();
  }

  function normalizeState(value) {
    return compactText(value).toUpperCase();
  }

  function nowIso(options = {}) {
    return asString(options.now || new Date().toISOString());
  }

  function createStableId(prefix = "id", options = {}) {
    if (typeof options.idFactory === "function") {
      return options.idFactory(prefix);
    }

    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function normalizeStatus(status) {
    return status === ARCHIVED_STATUS ? ARCHIVED_STATUS : ACTIVE_STATUS;
  }

  function normalizeAccount(account = {}, options = {}) {
    const createdAt = asString(account.createdAt || nowIso(options));
    return {
      id: asString(account.id || createStableId("account", options)),
      name: compactText(account.name) || DEFAULT_ACCOUNT_NAME,
      status: ACTIVE_STATUS,
      createdAt,
      updatedAt: asString(account.updatedAt || createdAt),
    };
  }

  function updateAccountName(account, name, options = {}) {
    const normalizedName = compactText(name);
    if (!normalizedName) {
      return {
        valid: false,
        errors: { name: "Informe o nome da operação." },
        account: normalizeAccount(account, options),
      };
    }

    return {
      valid: true,
      errors: {},
      account: {
        ...normalizeAccount(account, options),
        name: normalizedName,
        updatedAt: nowIso(options),
      },
    };
  }

  function normalizeProperty(property = {}, options = {}) {
    const createdAt = asString(property.createdAt || nowIso(options));
    return {
      id: asString(property.id || createStableId("property", options)),
      accountId: asString(property.accountId),
      name: compactText(property.name),
      municipality: compactText(property.municipality),
      state: normalizeState(property.state),
      notes: compactText(property.notes),
      status: normalizeStatus(property.status),
      createdAt,
      updatedAt: asString(property.updatedAt || createdAt),
    };
  }

  function validateProperty(property = {}) {
    const normalized = normalizeProperty(property);
    const errors = {};

    if (!normalized.accountId) {
      errors.accountId = "Operação local não identificada.";
    }

    if (!normalized.name) {
      errors.name = "Informe o nome da propriedade.";
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
      property: normalized,
    };
  }

  function createProperty(accountId, data = {}, options = {}) {
    const createdAt = data.createdAt || nowIso(options);
    const property = normalizeProperty({
      ...data,
      id: data.id || createStableId("property", options),
      accountId,
      status: data.status || ACTIVE_STATUS,
      createdAt,
      updatedAt: data.updatedAt || createdAt,
    }, options);

    const validation = validateProperty(property);
    return { ...validation, property };
  }

  function updateProperty(existingProperty, data = {}, options = {}) {
    const existing = normalizeProperty(existingProperty, options);
    const property = normalizeProperty({
      ...existing,
      name: data.name ?? existing.name,
      municipality: data.municipality ?? existing.municipality,
      state: data.state ?? existing.state,
      notes: data.notes ?? existing.notes,
      updatedAt: nowIso(options),
    }, options);

    const validation = validateProperty(property);
    return { ...validation, property };
  }

  function archiveProperty(property, options = {}) {
    return {
      ...normalizeProperty(property, options),
      status: ARCHIVED_STATUS,
      updatedAt: nowIso(options),
    };
  }

  function reactivateProperty(property, options = {}) {
    return {
      ...normalizeProperty(property, options),
      status: ACTIVE_STATUS,
      updatedAt: nowIso(options),
    };
  }

  function formatLocation(property = {}) {
    const municipality = compactText(property.municipality);
    const state = normalizeState(property.state);

    if (municipality && state) return `${municipality} - ${state}`;
    if (municipality) return municipality;
    if (state) return state;
    return "";
  }

  function formatPropertyIdentification(property = {}) {
    const name = compactText(property.name) || "Propriedade sem nome";
    const location = formatLocation(property);
    return location ? `${name} (${location})` : name;
  }

  return {
    ACTIVE_STATUS,
    ARCHIVED_STATUS,
    DEFAULT_ACCOUNT_NAME,
    compactText,
    normalizeState,
    createStableId,
    normalizeStatus,
    normalizeAccount,
    updateAccountName,
    normalizeProperty,
    validateProperty,
    createProperty,
    updateProperty,
    archiveProperty,
    reactivateProperty,
    formatLocation,
    formatPropertyIdentification,
  };
})();

if (typeof module !== "undefined") {
  module.exports = PropertyCore;
}

if (typeof window !== "undefined") {
  window.PropertyCore = PropertyCore;
}
