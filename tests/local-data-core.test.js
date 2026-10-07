const test = require("node:test");
const assert = require("node:assert/strict");
const dataCore = require("../src/local-data-core.js");

function baseDraft() {
  return {
    weighingName: "Pesagem Teste",
    weighingDate: "2026-08-10",
    propertyName: "Fazenda Teste",
    settings: {
      arrobaPrice: "300,00",
      yieldRate: "50",
      lightLimit: "300",
      mediumLimit: "480",
    },
    animals: [
      { id: "animal-a", tag: "A", weight: "450", category: "Boi", note: "" },
      { id: "animal-b", tag: "B", weight: "510", category: "Boi", note: "" },
    ],
    usePaddocks: true,
    paddocks: [
      { id: "paddock-1", name: "Pasto 1", max: "30", current: "12" },
    ],
  };
}

test("cria draft válido com chave e versão do schema", () => {
  const draft = dataCore.createDraft(baseDraft(), { updatedAt: "2026-08-10T12:00:00.000Z" });

  assert.equal(draft.key, dataCore.DRAFT_KEY);
  assert.equal(draft.schemaVersion, dataCore.SCHEMA_VERSION);
  assert.equal(draft.updatedAt, "2026-08-10T12:00:00.000Z");
  assert.equal(draft.data.weighingName, "Pesagem Teste");
});

test("draft novo preserva accountId, propertyId e snapshot textual da propriedade", () => {
  const draft = dataCore.createDraft({
    ...baseDraft(),
    accountId: "account-1",
    propertyId: "property-1",
    propertyName: "Boa Vista",
  });

  assert.equal(draft.data.accountId, "account-1");
  assert.equal(draft.data.propertyId, "property-1");
  assert.equal(draft.data.propertyName, "Boa Vista");
});

test("draft antigo sem propriedade cadastrada continua compatível", () => {
  const record = {
    key: dataCore.DRAFT_KEY,
    schemaVersion: dataCore.LEGACY_SCHEMA_VERSION,
    updatedAt: "2026-08-10T12:00:00.000Z",
    data: baseDraft(),
  };
  const result = dataCore.validateDraftRecord(record);

  assert.equal(result.valid, true);
  assert.equal(result.draft.schemaVersion, dataCore.SCHEMA_VERSION);
  assert.equal(result.draft.data.accountId, null);
  assert.equal(result.draft.data.propertyId, null);
  assert.equal(result.draft.data.propertyName, "Fazenda Teste");
  assert.equal(result.draft.data.animals[0].id, "animal-a");
});

test("preserva IDs de animais e pastos durante normalização", () => {
  const draft = dataCore.createDraft(baseDraft());

  assert.equal(draft.data.animals[0].id, "animal-a");
  assert.equal(draft.data.animals[1].id, "animal-b");
  assert.equal(draft.data.paddocks[0].id, "paddock-1");
});

test("normaliza estruturas ausentes para arrays e valores padrão", () => {
  const data = dataCore.normalizeDraftData({});

  assert.equal(data.accountId, null);
  assert.equal(data.propertyId, null);
  assert.deepEqual(data.animals, []);
  assert.deepEqual(data.paddocks, []);
  assert.equal(data.settings.arrobaPrice, "300,00");
  assert.equal(data.settings.yieldRate, "50");
  assert.equal(data.settings.lightLimit, "300");
  assert.equal(data.settings.mediumLimit, "420");
  assert.ok(data.weighingDate);
  assert.equal(data.usePaddocks, false);
});

test("campos ausentes de settings recebem defaults oficiais", () => {
  const data = dataCore.normalizeDraftData({ settings: {} });

  assert.equal(data.settings.arrobaPrice, "300,00");
  assert.equal(data.settings.yieldRate, "50");
  assert.equal(data.settings.lightLimit, "300");
  assert.equal(data.settings.mediumLimit, "420");
});

test("parâmetros explicitamente vazios permanecem vazios", () => {
  const draft = dataCore.createDraft({
    ...baseDraft(),
    settings: {
      arrobaPrice: "",
      yieldRate: "",
      lightLimit: "",
      mediumLimit: "",
    },
  });

  assert.equal(draft.data.settings.arrobaPrice, "");
  assert.equal(draft.data.settings.yieldRate, "");
  assert.equal(draft.data.settings.lightLimit, "");
  assert.equal(draft.data.settings.mediumLimit, "");
});

test("data explicitamente vazia permanece vazia", () => {
  const draft = dataCore.createDraft({
    ...baseDraft(),
    weighingDate: "",
  });

  assert.equal(draft.data.weighingDate, "");
});

test("rejeita schema incompatível", () => {
  const result = dataCore.validateDraftRecord({
    key: dataCore.DRAFT_KEY,
    schemaVersion: 99,
    updatedAt: "2026-08-10T12:00:00.000Z",
    data: baseDraft(),
  });

  assert.equal(result.valid, false);
  assert.equal(result.reason, "incompatible_schema");
});

test("rejeita chave incompatível", () => {
  const result = dataCore.validateDraftRecord({
    key: "outro-draft",
    schemaVersion: dataCore.SCHEMA_VERSION,
    updatedAt: "2026-08-10T12:00:00.000Z",
    data: baseDraft(),
  });

  assert.equal(result.valid, false);
  assert.equal(result.reason, "invalid_key");
});

test("mantém campos vazios sem quebrar o draft", () => {
  const draft = dataCore.createDraft({
    weighingName: "",
    weighingDate: "",
    propertyName: "",
    settings: {},
    animals: [],
    paddocks: [],
  });

  assert.equal(draft.data.weighingName, "");
  assert.equal(draft.data.weighingDate, "");
  assert.equal(draft.data.propertyName, "");
});

test("permite animal sem brinco no draft", () => {
  const draft = dataCore.createDraft({
    ...baseDraft(),
    animals: [{ id: "animal-sem-brinco", tag: "", weight: "450", category: "Boi", note: "sem identificação" }],
  });

  assert.equal(draft.data.animals[0].id, "animal-sem-brinco");
  assert.equal(draft.data.animals[0].tag, "");
});

test("preserva valores digitados com vírgula", () => {
  const draft = dataCore.createDraft({
    ...baseDraft(),
    settings: { arrobaPrice: "301,25", yieldRate: "52,5", lightLimit: "300,5", mediumLimit: "480,75" },
    animals: [{ id: "animal-a", tag: "A", weight: "450,5", category: "Boi", note: "" }],
  });

  assert.equal(draft.data.settings.arrobaPrice, "301,25");
  assert.equal(draft.data.animals[0].weight, "450,5");
});

test("preserva dados inválidos para correção posterior", () => {
  const draft = dataCore.createDraft({
    ...baseDraft(),
    settings: { arrobaPrice: "-1", yieldRate: "abc", lightLimit: "", mediumLimit: "400" },
    animals: [{ id: "animal-a", tag: "A", weight: "abc", category: "Boi", note: "" }],
  });

  assert.equal(draft.data.settings.arrobaPrice, "-1");
  assert.equal(draft.data.settings.yieldRate, "abc");
  assert.equal(draft.data.settings.lightLimit, "");
  assert.equal(draft.data.settings.mediumLimit, "400");
  assert.equal(draft.data.animals[0].weight, "abc");
});

test("dados inválidos permanecem intactos durante normalização", () => {
  const draft = dataCore.createDraft({
    ...baseDraft(),
    settings: {
      arrobaPrice: "-1",
      yieldRate: "abc",
      lightLimit: "",
      mediumLimit: "xyz",
    },
    animals: [{ id: "animal-invalido", tag: "INV", weight: "abc", category: "Boi", note: "" }],
  });

  assert.equal(draft.data.settings.arrobaPrice, "-1");
  assert.equal(draft.data.settings.yieldRate, "abc");
  assert.equal(draft.data.settings.lightLimit, "");
  assert.equal(draft.data.settings.mediumLimit, "xyz");
  assert.equal(draft.data.animals[0].weight, "abc");
});

test("serialização inclui apenas dados, sem DOM", () => {
  const elementLike = { nodeType: 1, innerHTML: "<strong>não persistir</strong>" };
  const serialized = dataCore.serializeDraft({
    ...baseDraft(),
    domReference: elementLike,
  });

  assert.doesNotMatch(serialized, /innerHTML/);
  assert.doesNotMatch(serialized, /nodeType/);
  assert.match(serialized, /Pesagem Teste/);
});

test("desserializa draft válido e normaliza novamente", () => {
  const serialized = dataCore.serializeDraft(baseDraft());
  const result = dataCore.deserializeDraft(serialized);

  assert.equal(result.valid, true);
  assert.equal(result.draft.data.animals.length, 2);
});

test("dados de demonstração não são elegíveis para persistência", () => {
  assert.equal(dataCore.isDraftEligibleForPersistence({ demoMode: true, animals: baseDraft().animals }), false);
  assert.equal(dataCore.isDraftEligibleForPersistence({
    ...baseDraft(),
    animals: [{ id: "demo", tag: "EX-001", weight: "450", category: "Boi", note: "", demo: true }],
  }), false);
});

test("reset cria draft vazio com padrões da calculadora", () => {
  const empty = dataCore.createEmptyDraftData(new Date(2026, 7, 10, 23, 30, 0));

  assert.equal(empty.weighingName, "");
  assert.equal(empty.weighingDate, "2026-08-10");
  assert.equal(empty.settings.arrobaPrice, "300,00");
  assert.equal(empty.animals.length, 0);
  assert.equal(empty.paddocks.length, 0);
});
