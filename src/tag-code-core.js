const TagCodeCore = (() => {
  const normalizeLotSuffix = (value) => String(value ?? "").trim().toUpperCase();
  const validateLotSuffix = (value) => /^[A-Z]$/.test(normalizeLotSuffix(value));
  const normalizeTagNumber = (value) => String(value ?? "").trim();
  const validateTagNumber = (value) => /^\d{1,4}$/.test(normalizeTagNumber(value))
    && Number(normalizeTagNumber(value)) >= 1 && Number(normalizeTagNumber(value)) <= 9999;
  const formatTagNumber = (value) => validateTagNumber(value) ? normalizeTagNumber(value).padStart(4, "0") : null;
  const buildTagCode = (number, suffix) => validateTagNumber(number) && validateLotSuffix(suffix)
    ? formatTagNumber(number) + normalizeLotSuffix(suffix) : null;
  const normalizeTagCodeForComparison = (value) => String(value ?? "").trim().toUpperCase();
  return { normalizeLotSuffix, validateLotSuffix, normalizeTagNumber, validateTagNumber,
    formatTagNumber, buildTagCode, normalizeTagCodeForComparison };
})();
if (typeof module !== "undefined") module.exports = TagCodeCore;
if (typeof window !== "undefined") window.TagCodeCore = TagCodeCore;
