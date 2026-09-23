const LotCore = ((ref) => {
  const H = ref || require("./herd-core.js");
  const core = H.defineCore("lot", (data) => ({ name: H.text(data.name),
    paddockId: H.nullableId(data.paddockId), tagSuffix: H.text(data.tagSuffix).toUpperCase() || null,
    category: H.text(data.category), notes: H.text(data.notes) }),
  (data) => data.name ? {} : { name: "Informe o nome do lote." },
  (data) => H.text(data.name) || "Lote sem nome");
  return { ...core, normalizeLot: core.normalize, validateLot: core.validate,
    createLot: core.create, updateLot: core.update, archiveLot: core.archive,
    reactivateLot: core.reactivate,
    changePaddock: (lot, paddockId, options) => core.update(lot, { paddockId }, options) };
})(typeof window !== "undefined" ? window.HerdCore : undefined);
if (typeof module !== "undefined") module.exports = LotCore;
if (typeof window !== "undefined") window.LotCore = LotCore;
