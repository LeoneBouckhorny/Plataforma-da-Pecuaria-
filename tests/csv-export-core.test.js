const test = require("node:test");
const assert = require("node:assert/strict");
const csv = require("../src/csv-export-core.js");

const session = {
  weighingName: "Pesagem Açúcar",
  weighingDate: "2026-08-12",
  propertyNameSnapshot: "Fazenda São José",
  arrobaPriceSnapshot: 300,
  yieldRateSnapshot: 50,
  totalAnimals: 2,
  totalWeight: 960,
  averageWeight: 480,
  totalArrobas: 32,
  estimatedValue: 9600,
};

test("exporta CSV comum com BOM e separador ponto e vírgula", () => {
  const content = csv.generateCsv(session, [
    { tagSnapshot: "A", categorySnapshot: "Boi", weightSnapshot: 450, weightBandSnapshot: "Médio", arrobasSnapshot: 15, noteSnapshot: "" },
  ]);

  assert.equal(content.startsWith(csv.BOM), true);
  assert.match(content, /"Nome";"Pesagem Açúcar"/);
  assert.match(content, /"Ordem";"Brinco";"Categoria";"Peso"/);
});

test("preserva acentos", () => {
  const content = csv.generateCsv(session, []);

  assert.match(content, /PLATAFORMA DA PECUÁRIA/);
  assert.match(content, /Fazenda São José/);
});

test("formata número com vírgula decimal", () => {
  assert.equal(csv.formatNumber(32.75), "32,75");
});

test("escapa ponto e vírgula", () => {
  assert.equal(csv.escapeCsvField("A;B"), "\"A;B\"");
});

test("escapa quebra de linha", () => {
  assert.equal(csv.escapeCsvField("A\nB"), "\"A\nB\"");
});

test("escapa aspas", () => {
  assert.equal(csv.escapeCsvField('A "B"'), "\"A \"\"B\"\"\"");
});

test("neutraliza fórmula começando com igual", () => {
  assert.equal(csv.escapeCsvField("=1+1"), "\"'=1+1\"");
});

test("neutraliza fórmula começando com mais", () => {
  assert.equal(csv.escapeCsvField("+1+1"), "\"'+1+1\"");
});

test("neutraliza fórmula começando com menos", () => {
  assert.equal(csv.escapeCsvField("-1+1"), "\"'-1+1\"");
});

test("neutraliza fórmula começando com arroba", () => {
  assert.equal(csv.escapeCsvField("@SUM(A1:A2)"), "\"'@SUM(A1:A2)\"");
});

test("sanitiza nome de arquivo", () => {
  const filename = csv.buildFileName({
    weighingDate: "2026-08-12",
    weighingName: "Lote / Teste: A  B",
  });

  assert.equal(filename, "pesagem-2026-08-12-lote-teste-a-b.csv");
  assert.doesNotMatch(filename, /[\\/:*?"<>|]/);
});
