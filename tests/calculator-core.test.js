const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../app.js");

const validSettings = {
  arrobaPrice: "300,00",
  yieldRate: "50",
  lightLimit: "300",
  mediumLimit: "480",
};

function animal(id, tag, weight) {
  return { id, tag, weight, category: "Boi", note: "" };
}

test("cenário de referência calcula quantidade, peso, arrobas e valor", () => {
  const summary = core.calculateSummary(validSettings, [
    animal("a1", "1", "450"),
    animal("a2", "2", "510"),
  ]);

  assert.equal(summary.totalAnimals, 2);
  assert.equal(summary.totalWeight, 960);
  assert.equal(summary.averageWeight, 480);
  assert.equal(summary.totalArrobas, 32);
  assert.equal(summary.estimatedValue, 9600);
});

test("preço negativo invalida valor sem mostrar preço como válido", () => {
  const summary = core.calculateSummary({ ...validSettings, arrobaPrice: "-1" }, [
    animal("a1", "1", "450"),
  ]);

  assert.equal(summary.settings.priceValid, false);
  assert.equal(summary.totalArrobas, 15);
  assert.equal(summary.estimatedValue, null);
  assert.match(summary.settings.errors.arrobaPrice, /não pode ser negativo/);
});

test("rendimento negativo deixa arrobas e valor indisponíveis", () => {
  const summary = core.calculateSummary({ ...validSettings, yieldRate: "-1" }, [
    animal("a1", "1", "450"),
  ]);

  assert.equal(summary.settings.yieldValid, false);
  assert.equal(summary.totalArrobas, null);
  assert.equal(summary.estimatedValue, null);
  assert.equal(summary.reportAnimals[0].arrobas, null);
});

test("rendimento acima de 100 deixa arrobas e valor indisponíveis", () => {
  const summary = core.calculateSummary({ ...validSettings, yieldRate: "101" }, [
    animal("a1", "1", "450"),
  ]);

  assert.equal(summary.settings.yieldValid, false);
  assert.equal(summary.totalArrobas, null);
  assert.equal(summary.estimatedValue, null);
  assert.equal(summary.reportAnimals[0].arrobas, null);
});

test("faixa inválida não bloqueia peso, arrobas ou valor", () => {
  const summary = core.calculateSummary({ ...validSettings, lightLimit: "abc" }, [
    animal("a1", "1", "450"),
  ]);

  assert.equal(summary.settings.bandsValid, false);
  assert.equal(summary.totalAnimals, 1);
  assert.equal(summary.totalWeight, 450);
  assert.equal(summary.totalArrobas, 15);
  assert.equal(summary.estimatedValue, 4500);
  assert.equal(summary.reportAnimals[0].band, null);
});

test("faixa média menor que faixa leve deixa classificação indisponível", () => {
  const summary = core.calculateSummary({ ...validSettings, lightLimit: "500", mediumLimit: "400" }, [
    animal("a1", "1", "450"),
  ]);

  assert.equal(summary.settings.bandsValid, false);
  assert.equal(summary.reportAnimals[0].band, null);
  assert.match(summary.settings.errors.mediumLimit, /maior ou igual/);
});

test("brinco duplicado na sessão invalida os itens repetidos", () => {
  const summary = core.calculateSummary(validSettings, [
    animal("a1", "7", "450"),
    animal("a2", "7", "510"),
  ]);

  assert.equal(summary.totalAnimals, 0);
  assert.ok(summary.animals.every((item) => item.errors.tag));
});

test("animal sem brinco é permitido com aviso", () => {
  const summary = core.calculateSummary(validSettings, [
    animal("a1", "", "450"),
  ]);

  assert.equal(summary.totalAnimals, 1);
  assert.match(summary.animals[0].warnings.tag, /Brinco vazio/);
});

test("peso zero é inválido", () => {
  const summary = core.calculateSummary(validSettings, [
    animal("a1", "1", "0"),
  ]);

  assert.equal(summary.totalAnimals, 0);
  assert.match(summary.animals[0].errors.weight, /maior que zero/);
});

test("peso negativo é inválido", () => {
  const summary = core.calculateSummary(validSettings, [
    animal("a1", "1", "-10"),
  ]);

  assert.equal(summary.totalAnimals, 0);
  assert.match(summary.animals[0].errors.weight, /não pode ser negativo/);
});

test("vírgula e ponto decimal são aceitos", () => {
  assert.equal(core.parseDecimal("300,50").value, 300.5);
  assert.equal(core.parseDecimal("300.50").value, 300.5);
});

test("separadores de milhar brasileiros e internacionais são aceitos", () => {
  assert.equal(core.parseDecimal("1.234,56").value, 1234.56);
  assert.equal(core.parseDecimal("1,234.56").value, 1234.56);
});

test("cálculo após remoção de animal é recalculado", () => {
  const remaining = [animal("a2", "2", "510")];
  const summary = core.calculateSummary(validSettings, remaining);

  assert.equal(summary.totalAnimals, 1);
  assert.equal(summary.totalWeight, 510);
  assert.equal(summary.averageWeight, 510);
  assert.equal(summary.totalArrobas, 17);
  assert.equal(summary.estimatedValue, 5100);
});

test("data local usa ano, mês e dia locais", () => {
  const date = new Date(2026, 6, 27, 23, 30, 0);
  assert.equal(core.localDateInputValue(date), "2026-07-27");
});

