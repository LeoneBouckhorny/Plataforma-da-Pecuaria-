const CsvExportCore = (() => {
  const BOM = "\uFEFF";
  const DANGEROUS_FORMULA_PREFIX = /^[=+\-@]/;

  function asString(value) {
    return String(value ?? "");
  }

  function neutralizeFormulaText(value) {
    const text = asString(value);
    return DANGEROUS_FORMULA_PREFIX.test(text) ? `'${text}` : text;
  }

  function escapeCsvField(value) {
    const text = neutralizeFormulaText(value).replace(/"/g, '""');
    return `"${text}"`;
  }

  function formatNumber(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return "";
    }

    return new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: 2,
      minimumFractionDigits: Number.isInteger(Number(value)) ? 0 : 1,
    }).format(Number(value));
  }

  function makeRow(values) {
    return values.map(escapeCsvField).join(";");
  }

  function sessionRows(session) {
    return [
      makeRow(["Sessão"]),
      makeRow(["Nome", session.weighingName || "Pesagem sem nome"]),
      makeRow(["Propriedade", session.propertyNameSnapshot || "Propriedade não informada"]),
      makeRow(["Data", session.weighingDate || "Data não informada"]),
      makeRow(["Preço/@", formatNumber(session.arrobaPriceSnapshot)]),
      makeRow(["Rendimento", `${formatNumber(session.yieldRateSnapshot)}%`]),
      makeRow([]),
    ];
  }

  function itemRows(items) {
    const rows = [
      makeRow(["Animais"]),
      makeRow(["Ordem", "Brinco", "Categoria", "Peso", "Faixa", "Arrobas", "Observação"]),
    ];

    items.forEach((item, index) => {
      rows.push(makeRow([
        String(index + 1),
        item.tagSnapshot || "Sem brinco",
        item.categorySnapshot,
        formatNumber(item.weightSnapshot),
        item.weightBandSnapshot,
        formatNumber(item.arrobasSnapshot),
        item.noteSnapshot,
      ]));
    });

    return rows;
  }

  function summaryRows(session) {
    return [
      makeRow([]),
      makeRow(["Resumo"]),
      makeRow(["Quantidade", formatNumber(session.totalAnimals)]),
      makeRow(["Peso total", formatNumber(session.totalWeight)]),
      makeRow(["Peso médio", formatNumber(session.averageWeight)]),
      makeRow(["Arrobas", formatNumber(session.totalArrobas)]),
      makeRow(["Valor estimado", formatNumber(session.estimatedValue)]),
    ];
  }

  function generateCsv(session, items) {
    const rows = [
      makeRow(["PLATAFORMA DA PECUÁRIA"]),
      ...sessionRows(session),
      ...itemRows(items),
      ...summaryRows(session),
    ];

    return `${BOM}${rows.join("\r\n")}\r\n`;
  }

  function sanitizeFilePart(value) {
    const normalized = asString(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\\/:*?"<>|]+/g, " ")
      .replace(/[^a-zA-Z0-9._ -]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\s/g, "-")
      .toLowerCase();

    return normalized || "sem-nome";
  }

  function buildFileName(session) {
    const date = sanitizeFilePart(session.weighingDate || "sem-data");
    const name = sanitizeFilePart(session.weighingName || "sem-nome");
    return `pesagem-${date}-${name}.csv`;
  }

  return {
    BOM,
    neutralizeFormulaText,
    escapeCsvField,
    formatNumber,
    generateCsv,
    sanitizeFilePart,
    buildFileName,
  };
})();

if (typeof module !== "undefined") {
  module.exports = CsvExportCore;
}

if (typeof window !== "undefined") {
  window.CsvExportCore = CsvExportCore;
}
