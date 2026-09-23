const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../src/weighing-history-core.js");

const validSource = {
  weighingName: "Pesagem Histórica",
  weighingDate: "2026-08-12",
  accountId: "account-1",
  propertyId: "property-1",
  propertyName: "Fazenda Snapshot",
  settings: {
    arrobaPrice: "300,00",
    yieldRate: "50",
    lightLimit: "300",
    mediumLimit: "480",
  },
  animals: [
    { id: "draft-a", tag: "A", weight: "450", category: "Boi", note: "primeiro" },
    { id: "draft-b", tag: "", weight: "510", category: "Vaca", note: "sem brinco" },
  ],
  demoMode: false,
};

function idFactory(prefix) {
  const counts = idFactory.counts || {};
  counts[prefix] = (counts[prefix] || 0) + 1;
  idFactory.counts = counts;
  return `${prefix}-${counts[prefix]}`;
}

test("cria snapshot histórico válido", () => {
  idFactory.counts = {};
  const result = core.buildSnapshot(validSource, {
    idFactory,
    createdAt: "2026-08-12T10:00:00.000Z",
  });

  assert.equal(result.valid, true);
  assert.equal(result.snapshot.session.id, "session-1");
  assert.equal(result.snapshot.session.status, "completed");
  assert.equal(result.snapshot.session.totalAnimals, 2);
  assert.equal(result.snapshot.session.accountId, "account-1");
  assert.equal(result.snapshot.session.propertyId, "property-1");
  assert.equal(result.snapshot.session.propertyNameSnapshot, "Fazenda Snapshot");
  assert.equal(result.snapshot.session.totalWeight, 960);
  assert.equal(result.snapshot.session.totalArrobas, 32);
  assert.equal(result.snapshot.session.estimatedValue, 9600);
  assert.equal(result.snapshot.items.length, 2);
});

test("IDs históricos são estáveis dentro do snapshot", () => {
  idFactory.counts = {};
  const result = core.buildSnapshot(validSource, { idFactory });

  assert.equal(result.snapshot.items[0].id, "item-1");
  assert.equal(result.snapshot.items[1].id, "item-2");
  assert.ok(result.snapshot.items.every((item) => item.sessionId === "session-1"));
});

test("animal sem brinco é salvo com snapshot vazio", () => {
  idFactory.counts = {};
  const result = core.buildSnapshot(validSource, { idFactory });

  assert.equal(result.valid, true);
  assert.equal(result.snapshot.items[1].tagSnapshot, "");
  assert.equal(result.snapshot.items[1].noteSnapshot, "sem brinco");
});

test("snapshot não muda quando o draft original é alterado depois", () => {
  idFactory.counts = {};
  const source = structuredClone(validSource);
  const result = core.buildSnapshot(source, { idFactory });

  source.weighingName = "Alterado";
  source.propertyName = "Nome atual alterado";
  source.propertyId = "property-2";
  source.settings.arrobaPrice = "999";
  source.animals[0].weight = "999";

  assert.equal(result.snapshot.session.weighingName, "Pesagem Histórica");
  assert.equal(result.snapshot.session.propertyId, "property-1");
  assert.equal(result.snapshot.session.propertyNameSnapshot, "Fazenda Snapshot");
  assert.equal(result.snapshot.session.arrobaPriceSnapshot, 300);
  assert.equal(result.snapshot.items[0].weightSnapshot, 450);
});

test("sessão sem propriedade cadastrada mantém propertyId nulo e snapshot textual opcional", () => {
  idFactory.counts = {};
  const result = core.buildSnapshot({
    ...validSource,
    propertyId: null,
    propertyName: "Nome livre para romaneio",
  }, { idFactory });

  assert.equal(result.valid, true);
  assert.equal(result.snapshot.session.accountId, "account-1");
  assert.equal(result.snapshot.session.propertyId, null);
  assert.equal(result.snapshot.session.propertyNameSnapshot, "Nome livre para romaneio");
});

test("parâmetros inválidos são rejeitados", () => {
  const result = core.buildSnapshot({
    ...validSource,
    settings: { ...validSource.settings, yieldRate: "abc" },
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /Corrija preço/);
});

test("animais com erro impedem finalização", () => {
  const result = core.buildSnapshot({
    ...validSource,
    animals: [
      { id: "draft-a", tag: "A", weight: "0", category: "Boi", note: "" },
    ],
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /animal válido|animais com erro/);
});

test("modo demonstração impede snapshot histórico", () => {
  const result = core.buildSnapshot({ ...validSource, demoMode: true });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /demonstração/);
});
