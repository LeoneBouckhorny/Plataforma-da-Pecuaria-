const HealthController = (() => {
  const Core = window.AnimalEventCore;
  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function button(text, action, primary = false) {
    const node = el("button", text, primary ? "primary-button action-icon add" : "secondary-button");
    node.type = "button"; node.addEventListener("click", action); return node;
  }
  function option(select, value, text) { const node = el("option", text); node.value = value; select.append(node); }
  function date(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? value.split("-").reverse().join("/") : new Date(value).toLocaleString("pt-BR");
  }
  function appendDetails(target, event) {
    for (const [label, value] of [["Produto", event.productName], ["Dose", event.doseValue == null ? null : `${new Intl.NumberFormat("pt-BR").format(event.doseValue)} ${event.doseUnit || ""}`],
      ["Via de aplicação", event.route], ["Lote do produto", event.productBatch], ["Responsável", event.responsible],
      ["Lote", event.lotNameSnapshot || "Sem lote"], ["Pasto", event.paddockNameSnapshot || "Não definido"],
      ["Próxima aplicação", event.nextDueDate ? date(event.nextDueDate) : null], ["Carência até", event.withdrawalUntil ? date(event.withdrawalUntil) : null], ["Observações", event.notes]]) {
      if (value) target.append(el("p", `${label}: ${value}`));
    }
  }
  class Controller {
    constructor(options) {
      this.options = options;
      this.repo = window.HealthRepository.createHealthRepository(options);
      this.animals = window.AnimalRepository.createAnimalRepository(options);
      this.lots = window.LotRepository.createLotRepository(options);
      this.dialog = document.querySelector("#health-dialog"); this.form = document.querySelector("#health-form");
      this.list = document.querySelector("#health-list"); this.feedback = document.querySelector("#health-feedback");
      this.generation = 0; this.formGeneration = 0; this.busy = false; this.events = [];
      this.filters = {};
      const filters = document.querySelector("#health-filters");
      for (const [key, label, type] of [["healthType", "Tipo", "select"], ["lotId", "Lote no registro", "select"], ["from", "De", "date"], ["to", "Até", "date"]]) {
        const wrapper = el("label", label); const input = el(type === "select" ? "select" : "input");
        if (type !== "select") input.type = type;
        input.id = `health-filter-${key}`; wrapper.append(input); filters.append(wrapper); this.filters[key] = input;
        input.addEventListener("input", () => this.render());
      }
      option(this.filters.healthType, "", "Todos");
      for (const [key, label] of Object.entries(Core.HEALTH_TYPES)) option(this.filters.healthType, key, label);
      document.querySelector("#new-health").addEventListener("click", () => this.open({ accountId: options.getAccountId(), propertyId: this.propertyId }));
      this.form.addEventListener("submit", (event) => { event.preventDefault(); this.save(); });
      this.dialog.addEventListener("cancel", (event) => { if (this.busy) event.preventDefault(); });
      this.dialog.addEventListener("close", () => { ++this.formGeneration; });
    }
    async setProperty(propertyId) {
      this.propertyId = propertyId;
      for (const input of Object.values(this.filters)) input.value = "";
      await this.refresh();
    }
    async refresh() {
      const generation = ++this.generation; const accountId = this.options.getAccountId(); const propertyId = this.propertyId;
      this.feedback.textContent = "Carregando registros..."; this.list.replaceChildren();
      const result = await this.repo.list(accountId, propertyId);
      const animals = await this.animals.list(accountId, propertyId, { includeArchived: true });
      if (generation !== this.generation) return;
      if (result.status !== "loaded" || animals.status !== "loaded") { this.events = []; this.feedback.textContent = "Não foi possível carregar a Sanidade. Abra a seção novamente."; return; }
      this.events = result.events; this.identifications = new Map(animals.animals.map((a) => [a.id, window.AnimalCore.formatIdentification(a)]));
      const selected = this.filters.lotId.value;
      this.filters.lotId.replaceChildren(); option(this.filters.lotId, "", "Todos"); option(this.filters.lotId, "none", "Sem lote");
      const lots = new Map(); for (const event of this.events) if (event.lotId && !lots.has(event.lotId)) lots.set(event.lotId, event.lotNameSnapshot);
      for (const [id, name] of lots) option(this.filters.lotId, id, name || id);
      this.filters.lotId.value = selected; if (this.filters.lotId.selectedIndex < 0) this.filters.lotId.value = "";
      this.render();
    }
    render() {
      this.list.replaceChildren();
      const filters = Object.fromEntries(Object.entries(this.filters).map(([key, input]) => [key, input.value]));
      if (filters.from && filters.to && filters.from > filters.to) { this.feedback.textContent = "A data inicial deve ser anterior ou igual à final."; return; }
      const events = Core.filterHealthEvents(this.events, filters);
      this.feedback.textContent = `${events.length} registro(s)`;
      if (!events.length) this.list.append(el("p", "Nenhum manejo encontrado neste período e filtro.", "empty-state"));
      for (const event of events) {
        const row = el("article", undefined, "herd-card"); row.dataset.eventId = event.id;
        row.append(el("h3", Core.HEALTH_TYPES[event.healthType]), el("time", date(event.occurredAt)),
          el("p", this.identifications.get(event.animalId) || `Animal: ${event.animalId}`));
        appendDetails(row, event);
        row.append(button("Ver ficha", () => this.options.onAnimal(this.options.getAccountId(), this.propertyId, event.animalId)));
        this.list.append(row);
      }
    }
    async open(context) {
      if (this.busy || !context.propertyId || this.dialog.open) return;
      const generation = ++this.formGeneration; this.context = { ...context }; this.fields = {}; this.errors = {}; this.saveButton = null;
      this.form.replaceChildren(el("h2", "Registrar manejo sanitário")); this.form.firstChild.id = "health-dialog-title";
      const loading = el("p", "Carregando animais..."); this.form.append(loading); this.dialog.showModal();
      const animals = await this.animals.list(context.accountId, context.propertyId);
      const lots = await this.lots.list(context.accountId, context.propertyId);
      if (generation !== this.formGeneration || !this.dialog.open) return;
      loading.remove();
      if (animals.status !== "loaded" || lots.status !== "loaded") {
        this.form.append(el("p", "Não foi possível carregar os animais. Feche e tente novamente."), button("Fechar", () => this.dialog.close())); return;
      }
      this.candidates = animals.animals.filter((a) => !context.animalId || a.id === context.animalId);
      const picker = el("fieldset", undefined, "health-selection"); picker.append(el("legend", "Animais *"));
      this.selection = el("div", undefined, "health-animal-options");
      this.selectionCount = el("p"); this.selectionCount.setAttribute("aria-live", "polite");
      if (!context.animalId) {
        const label = el("label", "Lote atual"); this.lotFilter = el("select"); this.lotFilter.id = "health-target-lot";
        option(this.lotFilter, "", "Todos os lotes / sem lote");
        for (const lot of lots.lots) option(this.lotFilter, lot.id, lot.name);
        this.lotFilter.value = context.lotId || "";
        if (context.lotId) this.lotFilter.disabled = true;
        this.lotFilter.addEventListener("change", () => this.renderSelection()); label.append(this.lotFilter); picker.append(label);
      } else this.lotFilter = null;
      picker.append(this.selection, this.selectionCount);
      const selectionError = el("p", "", "field-message error"); selectionError.id = "health-animalIds-error"; picker.setAttribute("aria-describedby", selectionError.id);
      this.errors.animalIds = selectionError; picker.append(selectionError); this.form.append(picker); this.renderSelection();
      const grid = el("div", undefined, "form-grid");
      for (const [key, label, type] of [["healthType", "Tipo *", "select"], ["occurredAt", "Data/hora *", "datetime-local"],
        ["productName", "Produto", "text"], ["doseValue", "Dose", "text"], ["doseUnit", "Unidade", "text"], ["route", "Via de aplicação", "text"],
        ["productBatch", "Lote do produto", "text"], ["responsible", "Responsável", "text"], ["nextDueDate", "Próxima aplicação", "date"],
        ["withdrawalUntil", "Carência até", "date"], ["notes", "Observações", "textarea"]]) {
        const wrapper = el("label", label); const input = el(["select", "textarea"].includes(type) ? type : "input");
        if (input.tagName === "INPUT") input.type = type;
        if (key === "healthType") { option(input, "", "Selecione"); for (const [key, name] of Object.entries(Core.HEALTH_TYPES)) option(input, key, name); }
        if (key === "occurredAt") { const now = new Date(); input.value = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
        if (key === "doseValue") input.inputMode = "decimal";
        if (key === "doseUnit") input.setAttribute("list", "health-dose-units");
        input.id = `health-${key}`; const error = el("span", "", "field-message error"); error.id = `${input.id}-error`;
        input.setAttribute("aria-describedby", error.id);
        input.addEventListener("input", () => { error.textContent = ""; input.removeAttribute("aria-invalid"); });
        this.fields[key] = input; this.errors[key] = error; wrapper.append(input, error); grid.append(wrapper);
      }
      this.form.append(grid);
      this.formMessage = el("p", "", "field-message error"); this.formMessage.setAttribute("role", "alert"); this.form.append(this.formMessage);
      const actions = el("div", undefined, "dialog-actions");
      this.saveButton = el("button", "Registrar manejo", "primary-button action-icon confirm"); this.saveButton.type = "submit";
      this.saveButton.disabled = !this.selection.querySelector("input");
      actions.append(button("Cancelar", () => { if (!this.busy) this.dialog.close(); }), this.saveButton); this.form.append(actions);
      this.fields.healthType.focus();
    }
    renderSelection() {
      this.selection.replaceChildren();
      const lotId = this.context.lotId || this.lotFilter?.value;
      for (const animal of this.candidates.filter((a) => !lotId || a.lotId === lotId)) {
        const label = el("label"); const input = el("input"); input.type = "checkbox"; input.value = animal.id; input.checked = true;
        input.addEventListener("change", () => this.updateSelectionCount());
        label.append(input, document.createTextNode(window.AnimalCore.formatIdentification(animal))); this.selection.append(label);
      }
      if (!this.selection.children.length) this.selection.append(el("p", "Nenhum animal ativo disponível."));
      this.updateSelectionCount();
    }
    updateSelectionCount() {
      const count = this.selection.querySelectorAll("input:checked").length;
      this.selectionCount.textContent = `${count} animal(is) selecionado(s)`;
      if (this.saveButton) this.saveButton.disabled = !count;
    }
    async save() {
      if (this.busy || !this.fields.healthType) return;
      const ids = [...this.selection.querySelectorAll("input:checked")].map((input) => input.value);
      const data = Object.fromEntries(Object.entries(this.fields).map(([key, input]) => [key, input.value]));
      const when = new Date(data.occurredAt); data.occurredAt = data.occurredAt && Number.isFinite(when.getTime()) ? when.toISOString() : "";
      const context = { ...this.context, lotId: this.context.lotId || this.lotFilter?.value || null };
      const controls = [...this.form.querySelectorAll("input, select, textarea, button")].map((node) => [node, node.disabled]);
      this.busy = true; for (const [node] of controls) node.disabled = true;
      const result = await this.repo.register(context.accountId, context.propertyId, ids, data, context);
      this.busy = false; for (const [node, disabled] of controls) node.disabled = disabled;
      for (const [key, error] of Object.entries(this.errors)) { error.textContent = result.errors?.[key] || ""; this.fields[key]?.setAttribute("aria-invalid", String(Boolean(result.errors?.[key]))); }
      if (result.status !== "saved") {
        this.formMessage.textContent = result.status === "failed" ? "Não foi possível registrar. Nenhum evento foi salvo; seus campos foram mantidos."
          : Object.entries(result.errors || {}).filter(([key]) => !this.errors[key]).map(([, message]) => message).join(" ") || "Confira os campos e os animais selecionados.";
        const key = Object.keys(result.errors || {}).find((key) => this.fields[key]); this.fields[key]?.focus(); return;
      }
      this.dialog.close();
      if (this.propertyId === context.propertyId) await this.refresh();
      await this.options.onSaved(context);
    }
  }
  return { Controller, appendDetails };
})();
if (typeof window !== "undefined") window.HealthController = HealthController;
