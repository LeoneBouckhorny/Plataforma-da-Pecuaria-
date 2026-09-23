const test = require("node:test");
const assert = require("node:assert/strict");
const PropertyCore = require("../src/property-core.js");

function options(now = "2026-09-04T12:00:00.000Z") {
  return {
    now,
    idFactory: (prefix) => `${prefix}-id`,
  };
}

test("cria propriedade válida com ID estável e status ativo", () => {
  const result = PropertyCore.createProperty("account-1", {
    name: "  Boa   Vista  ",
    municipality: "  Uberaba ",
    state: " mg ",
    notes: "  curral principal  ",
  }, options());

  assert.equal(result.valid, true);
  assert.equal(result.property.id, "property-id");
  assert.equal(result.property.accountId, "account-1");
  assert.equal(result.property.name, "Boa Vista");
  assert.equal(result.property.municipality, "Uberaba");
  assert.equal(result.property.state, "MG");
  assert.equal(result.property.notes, "curral principal");
  assert.equal(result.property.status, PropertyCore.ACTIVE_STATUS);
  assert.equal(result.property.createdAt, "2026-09-04T12:00:00.000Z");
  assert.equal(result.property.updatedAt, "2026-09-04T12:00:00.000Z");
});

test("nome vazio invalida propriedade", () => {
  const result = PropertyCore.createProperty("account-1", { name: "   " }, options());

  assert.equal(result.valid, false);
  assert.equal(result.errors.name, "Informe o nome da propriedade.");
});

test("arquiva e reativa mantendo ID e dados principais", () => {
  const created = PropertyCore.createProperty("account-1", {
    name: "São Romão",
    municipality: "Araxá",
    state: "mg",
  }, options("2026-09-04T12:00:00.000Z")).property;
  const archived = PropertyCore.archiveProperty(created, options("2026-09-04T13:00:00.000Z"));
  const active = PropertyCore.reactivateProperty(archived, options("2026-09-04T14:00:00.000Z"));

  assert.equal(archived.id, created.id);
  assert.equal(archived.status, PropertyCore.ARCHIVED_STATUS);
  assert.equal(archived.updatedAt, "2026-09-04T13:00:00.000Z");
  assert.equal(active.id, created.id);
  assert.equal(active.status, PropertyCore.ACTIVE_STATUS);
  assert.equal(active.updatedAt, "2026-09-04T14:00:00.000Z");
});

test("edição não troca ID nem accountId", () => {
  const created = PropertyCore.createProperty("account-1", {
    name: "Boa Vista",
    municipality: "Uberaba",
    state: "MG",
    notes: "antiga",
  }, options("2026-09-04T12:00:00.000Z")).property;
  const updated = PropertyCore.updateProperty(created, {
    name: "Boa Vista - Unidade Principal",
    municipality: "Uberaba",
    state: "mg",
    notes: "nova observação",
  }, options("2026-09-04T15:00:00.000Z"));

  assert.equal(updated.valid, true);
  assert.equal(updated.property.id, created.id);
  assert.equal(updated.property.accountId, "account-1");
  assert.equal(updated.property.name, "Boa Vista - Unidade Principal");
  assert.equal(updated.property.notes, "nova observação");
  assert.equal(updated.property.createdAt, created.createdAt);
  assert.equal(updated.property.updatedAt, "2026-09-04T15:00:00.000Z");
});

test("formata identificação com município e UF quando disponíveis", () => {
  const property = PropertyCore.createProperty("account-1", {
    name: "Sítio do Avô",
    municipality: "Franca",
    state: "sp",
  }, options()).property;

  assert.equal(PropertyCore.formatLocation(property), "Franca - SP");
  assert.equal(PropertyCore.formatPropertyIdentification(property), "Sítio do Avô (Franca - SP)");
});
