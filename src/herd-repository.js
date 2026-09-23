const HerdRepository = ((ref, eventRef, tagRef) => {
  const DB = ref || require("./local-database.js");
  const Events = eventRef || require("./animal-event-core.js");
  const Tags = tagRef || require("./tag-code-core.js");
  const stores = ["accounts", "properties", "paddocks", "lots", "animals"];
  const scoped = (entity, accountId, propertyId) => Boolean(entity)
    && entity.accountId === accountId && entity.propertyId === propertyId;
  const invalid = (field, message) => ({ status: "invalid", errors: { [field]: message } });

  class Repository {
    constructor(kind, core, options = {}) {
      this.kind = kind;
      this.storeName = `${kind}s`;
      this.core = core;
      this.database = options.database || DB.createLocalDatabase();
      this.options = options;
    }
    async get(accountId, propertyId, id) {
      try {
        const property = await this.database.get("properties", propertyId);
        if (!accountId || !propertyId || !property || property.accountId !== accountId) return { status: "missing" };
        const entity = await this.database.get(this.storeName, id);
        return scoped(entity, accountId, propertyId)
          ? { status: "loaded", [this.kind]: this.core.normalize(entity) } : { status: "missing" };
      } catch (error) { return { status: "failed", error }; }
    }
    async list(accountId, propertyId, options = {}) {
      try {
        const property = await this.database.get("properties", propertyId);
        if (!accountId || !propertyId || !property || property.accountId !== accountId) {
          return { status: "loaded", [this.storeName]: [] };
        }
        const all = await this.database.getAllByIndex(this.storeName, "propertyId", propertyId);
        return { status: "loaded", [this.storeName]: all.filter((entity) => scoped(entity, accountId, propertyId)
          && (options.includeArchived || entity.status === "active")).map(this.core.normalize)
          .sort((a, b) => a.status.localeCompare(b.status) || this.core.formatIdentification(a).localeCompare(this.core.formatIdentification(b), "pt-BR")) };
      } catch (error) { return { status: "failed", error, [this.storeName]: [] }; }
    }
    async mutate(accountId, propertyId, id, data, action) {
      try {
        // One overlapping read/write transaction protects references and archive guards.
        return await this.database.writeTransaction(this.kind === "animal" ? [...stores, "animal-events"] : stores, async ({ store, requestToPromise: request }) => {
          const account = await request(store("accounts").get(accountId));
          const property = await request(store("properties").get(propertyId));
          if (!account || !property || property.accountId !== accountId) {
            return invalid("propertyId", "Propriedade não encontrada nesta operação.");
          }
          if (property.status !== "active") return invalid("propertyId", "Reative a propriedade antes de alterar o rebanho.");
          const target = store(this.storeName);
          const existing = id ? await request(target.get(id)) : null;
          if (action !== "create" && !scoped(existing, accountId, propertyId)) return { status: "missing" };
          // Identity checks and writes share the same transaction, including archived records.
          if (this.kind === "lot") {
            const suffix = Tags.normalizeLotSuffix(data.tagSuffix === undefined ? existing?.tagSuffix : data.tagSuffix);
            if ((action === "create" || suffix) && !Tags.validateLotSuffix(suffix)) {
              return invalid("tagSuffix", "Informe uma única letra de A a Z para o código do lote.");
            }
            const lots = await request(store("lots").index("propertyId").getAll(propertyId));
            const duplicate = lots.find((lot) => scoped(lot, accountId, propertyId) && lot.id !== id
              && suffix && Tags.normalizeLotSuffix(lot.tagSuffix) === suffix);
            if (duplicate) return invalid("tagSuffix", `O código ${suffix} já está sendo utilizado pelo lote '${duplicate.name}'. Escolha outro código.`);
            if (existing && suffix !== Tags.normalizeLotSuffix(existing.tagSuffix)) {
              const animals = await request(store("animals").index("propertyId").getAll(propertyId));
              if (animals.some((animal) => scoped(animal, accountId, propertyId) && animal.tagOriginLotId === id)) {
                return invalid("tagSuffix", "O código deste lote já foi utilizado na identificação de animais e não pode ser alterado.");
              }
            }
            if (action === "create" || action === "update") data = { ...data, tagSuffix: suffix || null };
          }
          if (this.kind === "animal") {
            const standardized = Boolean(existing?.tagOriginLotId);
            for (const field of ["tagSuffix", "tagOriginLotId"]) {
              if (data[field] !== undefined && data[field] !== existing?.[field]) {
                return invalid(field, "A origem do brinco não pode ser informada ou alterada manualmente.");
              }
            }
            if (action === "create" && data.tag) return invalid("tagNumber", "Informe o número do brinco e selecione um lote com código configurado.");
            if (existing && !existing.tag && data.tag) return invalid("tagNumber", "Informe o número do brinco para gerar a identificação.");
            if (standardized && data.tag !== undefined && data.tag !== existing.tag) {
              return invalid("tagNumber", "Corrija o número do brinco; o código completo é gerado automaticamente.");
            }
            const number = data.tagNumber === undefined ? existing?.tagNumber : data.tagNumber;
            const issuing = !standardized && Boolean(Tags.normalizeTagNumber(number));
            if (issuing && existing?.tag) return invalid("tagNumber", "A conversão de identificações anteriores não está disponível.");
            if (issuing || standardized) {
              if (!Tags.validateTagNumber(number)) return invalid("tagNumber", "Informe um número inteiro de 1 a 9999.");
              let suffix = existing?.tagSuffix;
              let originId = existing?.tagOriginLotId;
              if (issuing) {
                originId = data.lotId === undefined ? existing?.lotId : data.lotId;
                const origin = originId ? await request(store("lots").get(originId)) : null;
                if (!scoped(origin, accountId, propertyId) || origin.status !== "active" || !Tags.validateLotSuffix(origin.tagSuffix)) {
                  return invalid("lotId", "Selecione um lote com código de identificação configurado.");
                }
                suffix = Tags.normalizeLotSuffix(origin.tagSuffix);
              }
              data = { ...data, tagNumber: Tags.formatTagNumber(number), tagSuffix: suffix,
                tagOriginLotId: originId, tag: Tags.buildTagCode(number, suffix) };
            }
            const tag = Tags.normalizeTagCodeForComparison(data.tag === undefined ? existing?.tag : data.tag);
            const animals = await request(store("animals").index("propertyId").getAll(propertyId));
            const tagChanged = action === "create" || tag !== Tags.normalizeTagCodeForComparison(existing?.tag);
            if (tagChanged && tag && animals.some((animal) => scoped(animal, accountId, propertyId) && animal.id !== id
              && Tags.normalizeTagCodeForComparison(animal.tag) === tag)) {
              return invalid("tagNumber", `Já existe um animal identificado como ${tag} nesta propriedade.`);
            }
          }
          if (this.kind === "animal" && action === "update" && data.lotId !== undefined
            && (data.lotId || null) !== existing.lotId) return invalid("lotId", "Use a ação Alterar lote para registrar a mudança no histórico.");
          let result;
          if (action === "create") result = this.core.create(accountId, propertyId, data, this.options);
          else if (action === "update" || action === "changeLot") result = this.core.update(existing, data, this.options);
          else result = this.core.validate(this.core[action](existing, this.options));
          if (!result.valid) return { status: "invalid", errors: result.errors };
          const entity = result[this.kind];
          const parentField = this.kind === "lot" ? "paddockId" : this.kind === "animal" ? "lotId" : null;
          if (parentField && entity[parentField]) {
            const parentStore = this.kind === "lot" ? "paddocks" : "lots";
            const parent = await request(store(parentStore).get(entity[parentField]));
            if (!scoped(parent, accountId, propertyId)) return invalid(parentField, "O vínculo deve pertencer à mesma operação e propriedade.");
            if (entity.status === "active" && parent.status !== "active") {
              return invalid(parentField, "O vínculo está arquivado. Reative-o ou escolha outro vínculo.");
            }
          }
          if (action === "archive" && this.kind !== "animal") {
            const childStore = this.kind === "paddock" ? "lots" : "animals";
            const childField = this.kind === "paddock" ? "paddockId" : "lotId";
            const children = await request(store(childStore).index("propertyId").getAll(propertyId));
            if (children.some((child) => scoped(child, accountId, propertyId) && child.status === "active" && child[childField] === id)) {
              return invalid("status", this.kind === "paddock"
                ? "Este pasto possui lote ativo. Mova ou desvincule o lote antes de arquivar."
                : "Este lote possui animais ativos. Mova ou desvincule os animais antes de arquivar.");
            }
          }
          if (this.kind === "animal") {
            const type = action === "create" ? "registered" : existing.lotId !== entity.lotId ? "lot_changed"
              : existing.status !== entity.status ? "status_changed" : null;
            if (type) {
              const snapshot = async (lotId, prefix) => {
                const lot = lotId ? await request(store("lots").get(lotId)) : null;
                if (lotId && !scoped(lot, accountId, propertyId)) throw new Error("Vínculo histórico de lote inválido.");
                const paddock = lot?.paddockId ? await request(store("paddocks").get(lot.paddockId)) : null;
                if (lot?.paddockId && !scoped(paddock, accountId, propertyId)) throw new Error("Vínculo histórico de pasto inválido.");
                return Events.locationSnapshot(prefix, lot, paddock);
              };
              const event = Events.createEvent({ accountId, propertyId, animalId: entity.id, type,
                ...(type === "lot_changed" ? await snapshot(existing.lotId, "from") : {}),
                ...(["registered", "lot_changed"].includes(type) ? await snapshot(entity.lotId, "to") : {}),
                ...(type === "status_changed" ? { fromStatus: existing.status, toStatus: entity.status } : {}),
              }, this.options);
              if (!event.valid) throw new Error("Não foi possível validar o evento administrativo.");
              await request(store("animal-events").add(event.event));
            }
          }
          await request(action === "create" ? target.add(entity) : target.put(entity));
          return { status: "saved", [this.kind]: entity };
        });
      } catch (error) { return { status: "failed", error }; }
    }
    create(accountId, propertyId, data) { return this.mutate(accountId, propertyId, null, data, "create"); }
    update(accountId, propertyId, id, data) { return this.mutate(accountId, propertyId, id, data, "update"); }
    archive(accountId, propertyId, id) { return this.mutate(accountId, propertyId, id, {}, "archive"); }
    reactivate(accountId, propertyId, id) { return this.mutate(accountId, propertyId, id, {}, "reactivate"); }
  }
  return { Repository };
})(typeof window !== "undefined" ? window.LocalDatabase : undefined, typeof window !== "undefined" ? window.AnimalEventCore : undefined,
  typeof window !== "undefined" ? window.TagCodeCore : undefined);
if (typeof module !== "undefined") module.exports = HerdRepository;
if (typeof window !== "undefined") window.HerdRepository = HerdRepository;
