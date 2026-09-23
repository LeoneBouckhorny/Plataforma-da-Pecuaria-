const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../src/tag-code-core.js");
for (const [input, expected] of [[1, "0001"], [9, "0009"], [23, "0023"], [287, "0287"], [999, "0999"], [9999, "9999"], [" 0023 ", "0023"]]) {
  test(`numero ${input} -> ${expected}`, () => {
    assert.equal(T.formatTagNumber(input), expected);
    assert.equal(T.buildTagCode(input, " a "), expected + "A");
  });
}
for (const input of [0, "0000", 10000, -1, 23.5, "A23", "23A", "", null, "1e2", "1 2", "00001", "<script>"]) {
  test(`numero invalido ${input}`, () => { assert.equal(T.validateTagNumber(input), false); assert.equal(T.buildTagCode(input, "A"), null); });
}
for (const input of ["AA", "1", "A1", "á", "*", "", null, "<b>"]) {
  test(`suffix invalido ${input}`, () => { assert.equal(T.validateLotSuffix(input), false); assert.equal(T.buildTagCode(1, input), null); });
}
test("normalizacao ASCII, comparacao e construcao", () => {
  assert.equal(T.normalizeLotSuffix(" b "), "B");
  assert.equal(T.normalizeTagCodeForComparison(" 0023a "), "0023A");
  assert.equal(T.buildTagCode(23, "A "), "0023A");
});
