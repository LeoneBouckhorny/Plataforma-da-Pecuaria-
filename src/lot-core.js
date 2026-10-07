const LotCore = ((ref) => {
  const H = ref || require("./herd-core.js");
  function normalizeList(values) {
    const result = [];
    const seen = new Set();
    for (const value of Array.isArray(values) ? values : []) {
      if (typeof value !== "string") continue;
      const text = H.text(value);
      const key = text.toLocaleLowerCase("pt-BR");
      if (text && !seen.has(key)) { seen.add(key); result.push(text); }
    }
    return result;
  }
  const CATEGORY_SUGGESTIONS = ["Cria", "Recria", "Engorda", "Bezerros", "Bezerras", "Garrotes", "Novilhas", "Vacas", "Matrizes", "Reprodutoras", "Touros", "Reprodutores", "Outra"];
  const BREED_SUGGESTIONS = ["Nelore", "Brahman", "Tabapuã", "Guzerá", "Sindi", "Indubrasil", "Angus", "Senepol", "Mestiço", "Outra"];
  const core = H.defineCore("lot", (data) => ({ name: H.text(data.name),
    paddockId: H.nullableId(data.paddockId), tagSuffix: H.text(data.tagSuffix).toUpperCase() || null,
    categories: normalizeList(data.categories === undefined ? [data.category] : data.categories),
    breeds: normalizeList(data.breeds), notes: H.text(data.notes) }),
  (data) => data.name ? {} : { name: "Informe o nome do lote." },
  (data) => H.text(data.name) || "Lote sem nome");
  return { ...core, normalizeList, CATEGORY_SUGGESTIONS, BREED_SUGGESTIONS,
    normalizeLot: core.normalize, validateLot: core.validate,
    createLot: core.create, updateLot: core.update, archiveLot: core.archive,
    reactivateLot: core.reactivate,
    changePaddock: (lot, paddockId, options) => core.update(lot, { paddockId }, options) };
})(typeof window !== "undefined" ? window.HerdCore : undefined);
if (typeof module !== "undefined") module.exports = LotCore;
if (typeof window !== "undefined") window.LotCore = LotCore;
