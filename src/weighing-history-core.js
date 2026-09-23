const WeighingHistoryCore = ((CalculatorCoreRef) => {
  const CalculatorCore = CalculatorCoreRef || (typeof require === "function"
    ? require("./calculator-core.js")
    : null);

  if (!CalculatorCore) {
    throw new Error("CalculatorCore não está disponível.");
  }

  const HISTORY_SCHEMA_VERSION = 2;
  const COMPLETED_STATUS = "completed";

  function asString(value) {
    return String(value ?? "");
  }

  function createSnapshotId(prefix, idFactory) {
    return idFactory ? idFactory(prefix) : CalculatorCore.createId(prefix);
  }

  function validateSnapshot(snapshot) {
    if (!snapshot || !snapshot.session || !Array.isArray(snapshot.items)) {
      return { valid: false, errors: ["Snapshot histórico inválido."] };
    }

    const errors = [];
    if (!snapshot.session.id) errors.push("Sessão sem identificador.");
    if (snapshot.session.status !== COMPLETED_STATUS) errors.push("Status histórico inválido.");
    if (!snapshot.items.length) errors.push("Sessão sem itens.");

    const linkedIds = new Set();
    snapshot.items.forEach((item) => {
      if (!item.id) errors.push("Item sem identificador.");
      if (item.sessionId !== snapshot.session.id) errors.push("Item vinculado a sessão incorreta.");
      if (item.animalId && linkedIds.has(item.animalId)) errors.push("O mesmo animal cadastrado foi selecionado em mais de um item. Remova o vínculo duplicado.");
      if (item.animalId) linkedIds.add(item.animalId);
    });

    return { valid: errors.length === 0, errors };
  }

  function buildValidationErrors(source, summary) {
    const errors = [];

    if (source.demoMode) {
      errors.push("Limpe a demonstração antes de finalizar uma pesagem real.");
    }

    if (!summary.settings.valid) {
      errors.push("Corrija preço, rendimento e faixas antes de finalizar.");
    }

    if (source.animals.length === 0 || summary.totalAnimals === 0) {
      errors.push("Adicione pelo menos um animal válido antes de finalizar.");
    }

    if (summary.animals.some((animal) => !animal.valid)) {
      errors.push("Corrija ou remova os animais com erro antes de finalizar.");
    }

    return errors;
  }

  function buildSnapshot(source, options = {}) {
    const settings = source.settings || {};
    const animals = Array.isArray(source.animals) ? source.animals : [];
    const summary = CalculatorCore.calculateSummary(settings, animals);
    const validationErrors = buildValidationErrors({ ...source, animals }, summary);

    if (validationErrors.length) {
      return {
        valid: false,
        errors: validationErrors,
        summary,
        snapshot: null,
      };
    }

    const sessionId = options.sessionId || createSnapshotId("session", options.idFactory);
    const createdAt = options.createdAt || new Date().toISOString();
    const settingValues = summary.settings.values;
    const session = {
      id: sessionId,
      schemaVersion: HISTORY_SCHEMA_VERSION,
      createdAt,
      weighingDate: asString(source.weighingDate),
      accountId: source.accountId == null ? null : asString(source.accountId),
      propertyId: source.propertyId == null ? null : asString(source.propertyId),
      weighingName: asString(source.weighingName),
      propertyNameSnapshot: asString(source.propertyName),
      lotId: source.lotId == null ? null : asString(source.lotId),
      lotNameSnapshot: asString(source.lotName),
      paddockId: source.paddockId == null ? null : asString(source.paddockId),
      paddockNameSnapshot: asString(source.paddockName),
      arrobaPriceSnapshot: settingValues.arrobaPrice,
      yieldRateSnapshot: settingValues.yieldRate,
      lightLimitSnapshot: settingValues.lightLimit,
      mediumLimitSnapshot: settingValues.mediumLimit,
      totalAnimals: summary.totalAnimals,
      totalWeight: summary.totalWeight,
      averageWeight: summary.averageWeight,
      totalArrobas: summary.totalArrobas,
      estimatedValue: summary.estimatedValue,
      observations: asString(source.observations),
      status: COMPLETED_STATUS,
    };

    const items = summary.reportAnimals.map((animal) => ({
      id: createSnapshotId("item", options.idFactory),
      sessionId,
      animalId: animals.find((sourceAnimal) => sourceAnimal.id === animal.id)?.animalId || null,
      animalTagSnapshot: null,
      animalNameSnapshot: null,
      tagSnapshot: asString(animal.tag),
      categorySnapshot: asString(animal.category),
      weightSnapshot: animal.weight,
      noteSnapshot: asString(animal.note),
      weightBandSnapshot: asString(animal.band),
      arrobasSnapshot: animal.arrobas,
    }));

    const snapshot = { session, items };
    const snapshotValidation = validateSnapshot(snapshot);

    return {
      valid: snapshotValidation.valid,
      errors: snapshotValidation.errors,
      summary,
      snapshot,
    };
  }

  function normalizeSession(session = {}) {
    return {
      id: asString(session.id),
      schemaVersion: Number(session.schemaVersion || HISTORY_SCHEMA_VERSION),
      createdAt: asString(session.createdAt),
      weighingDate: asString(session.weighingDate),
      accountId: session.accountId ?? null,
      propertyId: session.propertyId ?? null,
      weighingName: asString(session.weighingName),
      propertyNameSnapshot: asString(session.propertyNameSnapshot),
      lotId: session.lotId ?? null,
      lotNameSnapshot: asString(session.lotNameSnapshot),
      paddockId: session.paddockId ?? null,
      paddockNameSnapshot: asString(session.paddockNameSnapshot),
      arrobaPriceSnapshot: Number(session.arrobaPriceSnapshot || 0),
      yieldRateSnapshot: Number(session.yieldRateSnapshot || 0),
      lightLimitSnapshot: Number(session.lightLimitSnapshot || 0),
      mediumLimitSnapshot: Number(session.mediumLimitSnapshot || 0),
      totalAnimals: Number(session.totalAnimals || 0),
      totalWeight: Number(session.totalWeight || 0),
      averageWeight: Number(session.averageWeight || 0),
      totalArrobas: Number(session.totalArrobas || 0),
      estimatedValue: Number(session.estimatedValue || 0),
      observations: asString(session.observations),
      status: asString(session.status || COMPLETED_STATUS),
    };
  }

  function normalizeItem(item = {}) {
    return {
      id: asString(item.id),
      sessionId: asString(item.sessionId),
      animalId: item.animalId ?? null,
      animalTagSnapshot: item.animalTagSnapshot ?? null,
      animalNameSnapshot: item.animalNameSnapshot ?? null,
      tagSnapshot: asString(item.tagSnapshot),
      categorySnapshot: asString(item.categorySnapshot),
      weightSnapshot: Number(item.weightSnapshot || 0),
      noteSnapshot: asString(item.noteSnapshot),
      weightBandSnapshot: asString(item.weightBandSnapshot),
      arrobasSnapshot: Number(item.arrobasSnapshot || 0),
    };
  }

  function normalizeSnapshot(snapshot = {}) {
    return {
      session: normalizeSession(snapshot.session),
      items: Array.isArray(snapshot.items) ? snapshot.items.map(normalizeItem) : [],
    };
  }

  return {
    HISTORY_SCHEMA_VERSION,
    COMPLETED_STATUS,
    buildSnapshot,
    validateSnapshot,
    normalizeSession,
    normalizeItem,
    normalizeSnapshot,
  };
})(typeof window !== "undefined" ? window.CalculatorCore : undefined);

if (typeof module !== "undefined") {
  module.exports = WeighingHistoryCore;
}

if (typeof window !== "undefined") {
  window.WeighingHistoryCore = WeighingHistoryCore;
}
