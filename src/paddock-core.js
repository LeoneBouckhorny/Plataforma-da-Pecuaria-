const PaddockCore = ((ref) => {
  const H = ref || require("./herd-core.js");
  const core = H.defineCore("paddock", (data) => {
    const raw = H.text(data.areaHectares);
    const area = raw === "" ? null : (/^\d+(?:[.,]\d+)?$/.test(raw) ? Number(raw.replace(",", ".")) : NaN);
    return { name: H.text(data.name), areaHectares: area, notes: H.text(data.notes) };
  }, (data) => {
    const errors = {};
    if (!data.name) errors.name = "Informe o nome do pasto/piquete.";
    if (data.areaHectares !== null && (!Number.isFinite(data.areaHectares) || data.areaHectares <= 0)) {
      errors.areaHectares = "Informe uma área maior que zero ou deixe em branco.";
    }
    return errors;
  }, (data) => H.text(data.name) || "Pasto sem nome");
  return { ...core, normalizePaddock: core.normalize, validatePaddock: core.validate,
    createPaddock: core.create, updatePaddock: core.update, archivePaddock: core.archive,
    reactivatePaddock: core.reactivate };
})(typeof window !== "undefined" ? window.HerdCore : undefined);
if (typeof module !== "undefined") module.exports = PaddockCore;
if (typeof window !== "undefined") window.PaddockCore = PaddockCore;
