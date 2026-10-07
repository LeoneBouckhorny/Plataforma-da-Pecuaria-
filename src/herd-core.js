const HerdCore = ((PropertyCoreRef) => {
  const P = PropertyCoreRef || require("./property-core.js");
  const text = P.compactText;
  const nullableId = (value) => text(value) || null;
  const now = (options = {}) => String(options.now || new Date().toISOString());

  // The three entities share identity/lifecycle rules, but keep their own fields.
  function defineCore(kind, fields, validateFields, identify) {
    function normalize(data = {}) {
      return {
        id: text(data.id), accountId: text(data.accountId), propertyId: text(data.propertyId),
        ...fields(data), status: data.status === "archived" ? "archived" : "active",
        createdAt: text(data.createdAt), updatedAt: text(data.updatedAt),
      };
    }
    function validate(data = {}) {
      const entity = normalize(data);
      const errors = validateFields(entity);
      for (const key of ["id", "accountId", "propertyId"]) {
        if (!entity[key]) errors[key] = "Identificação da operação ou propriedade ausente.";
      }
      return { valid: Object.keys(errors).length === 0, errors, [kind]: entity };
    }
    function create(accountId, propertyId, data = {}, options = {}) {
      const timestamp = now(options);
      return validate({ ...data, id: P.createStableId(kind, options), accountId, propertyId,
        status: "active", createdAt: timestamp, updatedAt: timestamp });
    }
    function update(existing, data = {}, options = {}) {
      const result = validate({ ...existing, ...fields({ ...existing, ...data }), updatedAt: now(options) });
      for (const key of ["id", "accountId", "propertyId", "createdAt", "status"]) {
        if (data[key] !== undefined && data[key] !== existing[key]) {
          result.errors[key] = "Este campo não pode ser alterado nesta operação.";
        }
      }
      result.valid = Object.keys(result.errors).length === 0;
      return result;
    }
    const setStatus = (entity, status, options) => ({ ...normalize(entity), status, updatedAt: now(options) });
    return { normalize, validate, create, update,
      archive: (entity, options) => setStatus(entity, "archived", options),
      reactivate: (entity, options) => setStatus(entity, "active", options),
      formatIdentification: identify };
  }
  function isValidDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }
  function selectLot(lots, accountId, propertyId, lotId) {
    return lots.find((lot) => lot.id === lotId && lot.accountId === accountId
      && lot.propertyId === propertyId && lot.status === "active") || null;
  }
  return { text, nullableId, defineCore, isValidDate, selectLot };
})(typeof window !== "undefined" ? window.PropertyCore : undefined);
if (typeof module !== "undefined") module.exports = HerdCore;
if (typeof window !== "undefined") window.HerdCore = HerdCore;
