const FastLotRegistrationCore = ((tagsRef, lotRef) => {
  const Tags = tagsRef || require("./tag-code-core.js");
  const Lots = lotRef || require("./lot-core.js");
  function normalizeCount(value) {
    const text = String(value ?? "").trim();
    const number = Number(text);
    return /^\d+$/.test(text) && Number.isSafeInteger(number) && number >= 0 ? number : null;
  }
  const individualValue = (values) => values.length === 1 ? values[0] : "";
  function createPlan(data = {}) {
    const maleCount = normalizeCount(data.maleCount);
    const femaleCount = normalizeCount(data.femaleCount);
    const errors = {};
    for (const [key, value] of [["maleCount", maleCount], ["femaleCount", femaleCount]]) {
      if (value === null) errors[key] = "Informe uma quantidade inteira maior ou igual a zero.";
    }
    const total = maleCount === null || femaleCount === null ? null : maleCount + femaleCount;
    if (total === 0) errors.maleCount = "Informe pelo menos um animal para o cadastro rápido.";
    if (!Tags.validateTagNumber(data.startNumber)) errors.startNumber = "Informe o número inicial de 1 a 9999.";
    if (!Tags.validateLotSuffix(data.tagSuffix)) errors.tagSuffix = "Informe uma única letra de A a Z.";
    const start = Tags.validateTagNumber(data.startNumber) ? Number(data.startNumber) : null;
    const end = start !== null && total !== null ? start + total - 1 : null;
    if (end !== null && end > 9999) errors.startNumber = "O intervalo de brincos não pode ultrapassar 9999.";
    const lot = Lots.normalize(data);
    const valid = Object.keys(errors).length === 0;
    const animals = valid ? Array.from({ length: total }, (_, index) => ({
      tagNumber: Tags.formatTagNumber(start + index), tagSuffix: lot.tagSuffix,
      tag: Tags.buildTagCode(start + index, lot.tagSuffix), sex: index < maleCount ? "male" : "female",
      category: individualValue(lot.categories), breed: individualValue(lot.breeds), name: "",
    })) : [];
    return { valid, errors, maleCount, femaleCount, total, start, end, animals };
  }
  return { normalizeCount, individualValue, createPlan };
})(typeof window !== "undefined" ? window.TagCodeCore : undefined, typeof window !== "undefined" ? window.LotCore : undefined);
if (typeof module !== "undefined") module.exports = FastLotRegistrationCore;
if (typeof window !== "undefined") window.FastLotRegistrationCore = FastLotRegistrationCore;
