const AnimalEventCore = ((propertyRef, herdRef) => {
  const P = propertyRef || require("./property-core.js");
  const H = herdRef || require("./herd-core.js");
  const TYPES = ["registered", "lot_changed", "status_changed", "note"];
  const nullable = (value) => value == null || value === "" ? null : String(value).trim();
  function validTimestamp(value) {
    return typeof value === "string" && H.isValidDate(value.slice(0, 10))
      && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
      && Number(value.slice(11, 13)) < 24 && Number(value.slice(14, 16)) < 60 && Number(value.slice(17, 19)) < 60
      && Number.isFinite(Date.parse(value));
  }
  function normalizeEvent(data = {}) {
    const result = {};
    for (const key of ["id", "accountId", "propertyId", "animalId", "type", "occurredAt", "createdAt", "updatedAt"]) result[key] = String(data[key] ?? "").trim();
    for (const key of ["fromLotId", "fromLotNameSnapshot", "fromPaddockId", "fromPaddockNameSnapshot", "toLotId", "toLotNameSnapshot", "toPaddockId", "toPaddockNameSnapshot", "fromStatus", "toStatus", "notes"]) result[key] = nullable(data[key]);
    return result;
  }
  function validateEvent(data) {
    const event = normalizeEvent(data);
    const errors = {};
    for (const key of ["id", "accountId", "propertyId", "animalId"]) if (!event[key]) errors[key] = "Identificação do animal ou contexto ausente.";
    if (!TYPES.includes(event.type)) errors.type = "Tipo de evento inválido.";
    for (const key of ["occurredAt", "createdAt", "updatedAt"]) if (!validTimestamp(event[key])) errors[key] = "Informe data e hora válidas.";
    if (event.type === "note" && !event.notes) errors.notes = "Informe a observação.";
    if (event.type === "lot_changed" && event.fromLotId === event.toLotId) errors.toLotId = "A mudança exige um lote diferente.";
    if (event.type === "status_changed" && (!['active', 'archived'].includes(event.fromStatus)
      || !['active', 'archived'].includes(event.toStatus) || event.fromStatus === event.toStatus)) errors.toStatus = "Mudança de status inválida.";
    return { valid: Object.keys(errors).length === 0, errors, event };
  }
  function createEvent(data, options = {}) {
    const timestamp = String(options.now || new Date().toISOString());
    return validateEvent({ ...data, id: P.createStableId("event", options),
      occurredAt: data.occurredAt ?? timestamp, createdAt: timestamp, updatedAt: timestamp });
  }
  function updateNoteEvent(existing, data, options = {}) {
    if (existing.type !== "note" || (data.type !== undefined && data.type !== "note")) {
      return { valid: false, errors: { type: "Somente observações podem ser editadas." }, event: existing };
    }
    return validateEvent({ ...existing, notes: data.notes ?? existing.notes,
      occurredAt: data.occurredAt ?? existing.occurredAt, updatedAt: String(options.now || new Date().toISOString()) });
  }
  function locationSnapshot(prefix, lot, paddock) {
    return { [`${prefix}LotId`]: lot?.id || null, [`${prefix}LotNameSnapshot`]: lot?.name || null,
      [`${prefix}PaddockId`]: paddock?.id || null, [`${prefix}PaddockNameSnapshot`]: paddock?.name || null };
  }
  function sortTimeline(items) {
    return [...items].sort((a, b) => (Date.parse(b.occurredAt) || 0) - (Date.parse(a.occurredAt) || 0)
      || String(b.createdAt || "").localeCompare(String(a.createdAt || "")) || String(a.id).localeCompare(String(b.id)));
  }
  return { TYPES, validTimestamp, normalizeEvent, validateEvent, createEvent, updateNoteEvent, locationSnapshot, sortTimeline };
})(typeof window !== "undefined" ? window.PropertyCore : undefined, typeof window !== "undefined" ? window.HerdCore : undefined);
if (typeof module !== "undefined") module.exports = AnimalEventCore;
if (typeof window !== "undefined") window.AnimalEventCore = AnimalEventCore;
