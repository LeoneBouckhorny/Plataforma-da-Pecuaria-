const AnimalDetailController = (() => {
  const titles = { registered: "Cadastro no sistema", lot_changed: "Mudança de lote", status_changed: "Alteração de status",
    note: "Observação", weighing: "Pesagem", birth: "Nascimento (cadastro)", legacy_registered: "Cadastrado em (cadastro legado)" };
  const statuses = { active: "Ativo", archived: "Arquivado" };
  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function button(text, action, primary = false) {
    const node = el("button", text, primary ? "primary-button" : "secondary-button");
    node.type = "button"; node.addEventListener("click", action); return node;
  }
  function formatDate(value) {
    if (!value) return "Não informado";
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.split("-").reverse().join("/");
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleString("pt-BR") : "Data não informada";
  }
  function localInput(iso = new Date().toISOString()) {
    const date = new Date(iso);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
  class Controller {
    constructor(options) {
      this.options = options;
      this.history = window.AnimalHistoryRepository.createAnimalHistoryRepository(options);
      this.events = window.AnimalEventRepository.createAnimalEventRepository(options);
      this.animals = window.AnimalRepository.createAnimalRepository(options);
      this.lots = window.LotRepository.createLotRepository(options);
      this.dialog = document.querySelector("#animal-detail-dialog");
      this.content = document.querySelector("#animal-detail-content");
      this.form = document.querySelector("#animal-detail-form");
      this.message = document.querySelector("#animal-detail-message");
      this.generation = 0;
      this.busy = false;
      document.querySelector("#close-animal-detail").addEventListener("click", () => { if (!this.busy) this.dialog.close(); });
      this.dialog.addEventListener("cancel", (event) => { if (this.busy) event.preventDefault(); });
      this.dialog.addEventListener("close", () => { ++this.generation; this.current = null; });
      this.form.addEventListener("submit", (event) => { event.preventDefault(); this.saveForm(); });
    }
    async open(accountId, propertyId, animalId) {
      this.context = { accountId, propertyId, animalId };
      this.content.replaceChildren(el("p", "Carregando ficha..."));
      this.form.classList.add("hidden");
      this.message.textContent = "";
      if (!this.dialog.open) this.dialog.showModal();
      await this.refresh();
    }
    async refresh() {
      const generation = ++this.generation;
      const { accountId, propertyId, animalId } = this.context;
      const result = await this.history.getAnimalHistory(accountId, propertyId, animalId);
      if (generation !== this.generation || !this.dialog.open) return;
      if (result.status !== "loaded") { this.content.replaceChildren(el("p", "Não foi possível carregar a ficha deste animal.")); return; }
      this.current = result;
      this.render();
    }
    render() {
      const data = this.current;
      const animal = data.animal;
      this.content.replaceChildren();
      document.querySelector("#animal-detail-title").textContent = window.AnimalCore.formatIdentification(animal);
      const metrics = el("div", undefined, "metrics");
      const weight = el("div", undefined, "metric");
      weight.append(el("span", "Último peso"), el("strong", data.lastWeight === null ? "Sem pesagens vinculadas" : `${new Intl.NumberFormat("pt-BR").format(data.lastWeight)} kg`));
      weight.id = "animal-last-weight";
      const count = el("div", undefined, "metric");
      count.id = "animal-weighing-count";
      count.append(el("span", "Pesagens vinculadas"), el("strong", String(data.weighingCount)));
      metrics.append(weight, count);
      const details = el("dl", undefined, "animal-detail-data");
      if (animal.tagOriginLotId) {
        for (const [label, value] of [["Número", animal.tagNumber], ["Código de origem", animal.tagSuffix]]) {
          const row = el("div"); row.append(el("dt", label), el("dd", value)); details.append(row);
        }
      }
      for (const [key, value] of [["Última pesagem", data.lastWeighingDate ? formatDate(data.lastWeighingDate) : "Sem pesagens vinculadas"],
        ["Brinco", animal.tag], ["Nome", animal.name], ["Lote atual", data.lot?.name || "Sem lote"],
        ["Local atual", data.paddock?.name || "Local não definido"], ["Status", statuses[animal.status]],
        ["Sexo", { male: "Macho", female: "Fêmea", unknown: "Não informado" }[animal.sex]],
        ["Categoria", animal.category], ["Raça", animal.breed], ["Nascimento", formatDate(animal.birthDate)], ["Observações cadastrais", animal.notes]]) {
        const row = el("div"); row.append(el("dt", key), el("dd", value || "Não informado")); details.append(row);
      }
      const actions = el("div", undefined, "action-row");
      const note = button("Registrar observação", () => this.openNote(), true); note.id = "animal-add-note"; note.classList.add("action-icon", "add");
      const move = button("Alterar lote", () => this.openMove()); move.id = "animal-change-lot";
      const status = button(animal.status === "active" ? "Arquivar" : "Reativar", () => this.changeStatus()); status.id = "animal-change-status";
      actions.append(note, move, status);
      const timeline = el("ol", undefined, "animal-timeline"); timeline.id = "animal-timeline";
      for (const entry of data.timeline) {
        const row = el("li"); row.dataset.eventType = entry.type; row.dataset.eventId = entry.id;
        const date = ["weighing", "birth"].includes(entry.type) ? formatDate(entry.type === "weighing" ? entry.session.weighingDate || entry.session.createdAt : animal.birthDate) : formatDate(entry.occurredAt);
        row.append(el("time", date), el("h4", titles[entry.type] || entry.type));
        if (entry.type === "lot_changed") {
          row.append(el("p", `${entry.fromLotNameSnapshot || "Sem lote"} → ${entry.toLotNameSnapshot || "Sem lote"}`));
          row.append(el("p", `Local: ${entry.fromPaddockNameSnapshot || "Não definido"} → ${entry.toPaddockNameSnapshot || "Não definido"}`));
        }
        if (entry.type === "registered") row.append(el("p", `${entry.toLotNameSnapshot || "Sem lote"} · ${entry.toPaddockNameSnapshot || "Local não definido"}`));
        if (entry.type === "status_changed") row.append(el("p", `${statuses[entry.fromStatus]} → ${statuses[entry.toStatus]}`));
        if (entry.type === "note") {
          row.append(el("p", entry.notes, "timeline-note"), button("Editar observação", () => this.openNote(entry)));
        }
        if (entry.type === "weighing") {
          row.append(el("strong", `${new Intl.NumberFormat("pt-BR").format(entry.item.weightSnapshot)} kg`),
            el("p", `Sessão: ${entry.session.weighingName || "Pesagem sem nome"}`),
            el("p", `ID da sessão: ${entry.session.id}`),
            el("p", `Animal: ${[entry.item.animalTagSnapshot, entry.item.animalNameSnapshot].filter(Boolean).join(" · ") || "Sem identificação"}`),
            el("p", `Brinco informado: ${entry.item.tagSnapshot || "Não informado"}`),
            el("p", `Lote: ${entry.session.lotNameSnapshot || "Sem vínculo"} · Pasto: ${entry.session.paddockNameSnapshot || "Não definido"}`));
        }
        timeline.append(row);
      }
      this.content.append(metrics, details, actions, el("h3", "Linha do tempo"), timeline);
    }
    prepareForm(title) {
      if (this.busy) return false;
      this.form.replaceChildren(el("h3", title)); this.fields = {}; this.errors = {};
      this.form.classList.remove("hidden"); this.message.textContent = ""; return true;
    }
    field(key, title, input) {
      const label = el("label", title); input.id = `animal-event-${key}`;
      const error = el("span", "", "field-message error"); error.id = `${input.id}-error`;
      input.setAttribute("aria-describedby", error.id);
      label.append(input, error); this.form.append(label); this.fields[key] = input; this.errors[key] = error;
    }
    finishForm() {
      const actions = el("div", undefined, "dialog-actions");
      const save = el("button", "Salvar", "primary-button action-icon confirm"); save.type = "submit";
      actions.append(button("Cancelar", () => { if (!this.busy) this.form.classList.add("hidden"); }), save);
      this.form.append(actions); Object.values(this.fields)[0].focus();
    }
    openNote(event = null) {
      if (!this.prepareForm(event ? "Editar observação" : "Registrar observação")) return;
      this.mode = "note"; this.editingEvent = event;
      const date = el("input"); date.type = "datetime-local"; date.value = localInput(event?.occurredAt);
      const notes = el("textarea"); notes.rows = 4; notes.value = event?.notes || "";
      this.field("occurredAt", "Data/hora", date); this.field("notes", "Observação *", notes); this.finishForm();
    }
    async openMove() {
      if (this.busy) return;
      const generation = this.generation;
      const { accountId, propertyId } = this.context;
      const result = await this.lots.listLots(accountId, propertyId);
      if (!this.dialog.open || generation !== this.generation) return;
      if (result.status !== "loaded") { this.message.textContent = "Não foi possível carregar os lotes."; return; }
      if (!this.prepareForm("Alterar lote")) return;
      this.mode = "move";
      this.form.append(el("p", `Lote atual: ${this.current.lot?.name || "Sem lote"}`));
      const select = el("select");
      for (const lot of [{ id: "", name: "Sem lote" }, ...result.lots]) { const opt = el("option", lot.name); opt.value = lot.id; select.append(opt); }
      select.value = this.current.animal.lotId || "";
      this.field("lotId", "Novo lote", select); this.finishForm();
    }
    async saveForm() {
      if (this.busy) return;
      const { accountId, propertyId, animalId } = this.context;
      this.busy = true;
      for (const node of this.form.querySelectorAll("button")) node.disabled = true;
      let result;
      if (this.mode === "move") result = await this.animals.changeAnimalLot(accountId, propertyId, animalId, this.fields.lotId.value || null);
      else {
        const raw = this.fields.occurredAt.value;
        const date = raw ? new Date(raw) : null;
        const data = { occurredAt: date && Number.isFinite(date.getTime()) ? date.toISOString() : "", notes: this.fields.notes.value };
        result = this.editingEvent ? await this.events.updateNoteEvent(accountId, propertyId, animalId, this.editingEvent.id, data)
          : await this.events.createNoteEvent(accountId, propertyId, animalId, data);
      }
      this.busy = false;
      for (const node of this.form.querySelectorAll("button")) node.disabled = false;
      for (const key of Object.keys(this.errors)) { this.errors[key].textContent = result.errors?.[key] || ""; this.fields[key].setAttribute("aria-invalid", String(Boolean(result.errors?.[key]))); }
      if (result.status !== "saved") { this.message.textContent = Object.values(result.errors || {}).join(" ") || "Não foi possível salvar. Os campos foram mantidos."; return; }
      this.form.classList.add("hidden"); this.message.textContent = "Salvo neste dispositivo.";
      await this.refresh(); await this.options.onChanged();
    }
    async changeStatus() {
      if (this.busy) return;
      this.busy = true;
      const { accountId, propertyId, animalId } = this.context;
      const result = await this.animals[this.current.animal.status === "active" ? "archiveAnimal" : "reactivateAnimal"](accountId, propertyId, animalId);
      this.busy = false;
      if (result.status !== "saved") { this.message.textContent = Object.values(result.errors || {}).join(" ") || "Não foi possível alterar o status."; return; }
      this.form.classList.add("hidden"); await this.refresh(); await this.options.onChanged();
    }
  }
  return { Controller };
})();
if (typeof window !== "undefined") window.AnimalDetailController = AnimalDetailController;
