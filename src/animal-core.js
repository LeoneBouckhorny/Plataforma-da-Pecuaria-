const AnimalCore = ((ref) => {
  const H = ref || require("./herd-core.js");
  const core = H.defineCore("animal", (data) => ({
    lotId: H.nullableId(data.lotId), tag: String(data.tag ?? "").trim(), name: H.text(data.name),
    tagNumber: H.text(data.tagNumber) || null, tagSuffix: H.text(data.tagSuffix) || null,
    tagOriginLotId: H.nullableId(data.tagOriginLotId),
    sex: H.text(data.sex) || "unknown", category: H.text(data.category), breed: H.text(data.breed),
    birthDate: H.text(data.birthDate) || null, notes: H.text(data.notes),
  }), (data) => {
    const errors = {};
    if (!data.tag && !data.name) errors.tag = "Informe o brinco/identificação ou o nome do animal.";
    if (!["male", "female", "unknown"].includes(data.sex)) errors.sex = "Selecione um sexo válido.";
    if (data.birthDate && !H.isValidDate(data.birthDate)) errors.birthDate = "Informe uma data de nascimento válida.";
    return errors;
  }, (data) => data.tag ? `Brinco ${data.tag}` : H.text(data.name));
  return { ...core, normalizeAnimal: core.normalize, validateAnimal: core.validate,
    createAnimal: core.create, updateAnimal: core.update, archiveAnimal: core.archive,
    reactivateAnimal: core.reactivate,
    changeLot: (animal, lotId, options) => core.update(animal, { lotId }, options) };
})(typeof window !== "undefined" ? window.HerdCore : undefined);
if (typeof module !== "undefined") module.exports = AnimalCore;
if (typeof window !== "undefined") window.AnimalCore = AnimalCore;
