const LocalDataCore = ((CalculatorCoreRef) => {
  const CalculatorCore = CalculatorCoreRef || (typeof require === "function"
    ? require("./calculator-core.js")
    : null);

  if (!CalculatorCore) {
    throw new Error("CalculatorCore não está disponível.");
  }

  const SCHEMA_VERSION = 2;
  const LEGACY_SCHEMA_VERSION = 1;
  const DRAFT_KEY = "calculator-current";

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function asString(value) {
    return String(value ?? "");
  }

  function stableId(value, prefix) {
    const id = asString(value).trim();
    return id || CalculatorCore.createId(prefix);
  }

  function normalizeSettings(settings = {}) {
    return {
      arrobaPrice: asString(settings.arrobaPrice ?? CalculatorCore.DEFAULT_SETTINGS.arrobaPrice),
      yieldRate: asString(settings.yieldRate ?? CalculatorCore.DEFAULT_SETTINGS.yieldRate),
      lightLimit: asString(settings.lightLimit ?? CalculatorCore.DEFAULT_SETTINGS.lightLimit),
      mediumLimit: asString(settings.mediumLimit ?? CalculatorCore.DEFAULT_SETTINGS.mediumLimit),
    };
  }

  function normalizeAnimal(animal = {}) {
    return {
      id: stableId(animal.id, "animal"),
      tag: asString(animal.tag),
      weight: asString(animal.weight),
      category: CalculatorCore.normalizeCategory(animal.category),
      note: asString(animal.note),
    };
  }

  function normalizePaddock(paddock = {}) {
    return {
      id: stableId(paddock.id, "paddock"),
      name: asString(paddock.name),
      max: asString(paddock.max),
      current: asString(paddock.current),
    };
  }

  function createEmptyDraftData(date = new Date()) {
    return {
      accountId: null,
      propertyId: null,
      lotId: null,
      lotName: "",
      weighingName: "",
      weighingDate: CalculatorCore.localDateInputValue(date),
      propertyName: "",
      settings: { ...CalculatorCore.DEFAULT_SETTINGS },
      animals: [],
      usePaddocks: false,
      paddocks: [],
    };
  }

  function normalizeDraftData(data = {}) {
    const base = createEmptyDraftData();
    const source = isPlainObject(data) ? data : {};
    const settings = normalizeSettings(source.settings || {});
    const animals = Array.isArray(source.animals) ? source.animals.map(normalizeAnimal) : [];
    const paddocks = Array.isArray(source.paddocks) ? source.paddocks.map(normalizePaddock) : [];

    return {
      accountId: source.accountId == null ? null : asString(source.accountId),
      propertyId: source.propertyId == null ? null : asString(source.propertyId),
      lotId: source.lotId == null ? null : asString(source.lotId),
      lotName: asString(source.lotName),
      weighingName: asString(source.weighingName ?? base.weighingName),
      weighingDate: asString(source.weighingDate ?? base.weighingDate),
      propertyName: asString(source.propertyName ?? base.propertyName),
      settings,
      animals,
      usePaddocks: Boolean(source.usePaddocks),
      paddocks,
    };
  }

  function createDraft(data, options = {}) {
    return {
      key: DRAFT_KEY,
      schemaVersion: SCHEMA_VERSION,
      updatedAt: asString(options.updatedAt || new Date().toISOString()),
      data: normalizeDraftData(data),
    };
  }

  function validateDraftRecord(record) {
    if (!record) {
      return { valid: false, reason: "missing", draft: null };
    }

    if (!isPlainObject(record)) {
      return { valid: false, reason: "invalid_record", draft: null };
    }

    if (![LEGACY_SCHEMA_VERSION, SCHEMA_VERSION].includes(record.schemaVersion)) {
      return { valid: false, reason: "incompatible_schema", draft: null };
    }

    if (record.key !== DRAFT_KEY) {
      return { valid: false, reason: "invalid_key", draft: null };
    }

    if (!isPlainObject(record.data)) {
      return { valid: false, reason: "invalid_data", draft: null };
    }

    return {
      valid: true,
      reason: null,
      draft: createDraft(record.data, { updatedAt: record.updatedAt }),
    };
  }

  function serializeDraft(data) {
    return JSON.stringify(createDraft(data));
  }

  function deserializeDraft(serialized) {
    try {
      return validateDraftRecord(JSON.parse(serialized));
    } catch {
      return { valid: false, reason: "invalid_json", draft: null };
    }
  }

  function isDraftEligibleForPersistence(source = {}) {
    if (source.demoMode === true) {
      return false;
    }

    const data = isPlainObject(source.data) ? source.data : source;
    const animals = Array.isArray(data.animals) ? data.animals : [];
    const paddocks = Array.isArray(data.paddocks) ? data.paddocks : [];
    const containsDemoAnimal = animals.some((animal) => animal && animal.demo === true);
    const containsDemoPaddock = paddocks.some((paddock) => paddock && paddock.demo === true);

    return !containsDemoAnimal && !containsDemoPaddock;
  }

  return {
    SCHEMA_VERSION,
    LEGACY_SCHEMA_VERSION,
    DRAFT_KEY,
    createEmptyDraftData,
    normalizeDraftData,
    createDraft,
    validateDraftRecord,
    serializeDraft,
    deserializeDraft,
    isDraftEligibleForPersistence,
  };
})(typeof window !== "undefined" ? window.CalculatorCore : undefined);

if (typeof module !== "undefined") {
  module.exports = LocalDataCore;
}

if (typeof window !== "undefined") {
  window.LocalDataCore = LocalDataCore;
}
