const ReproductionController = (() => {
  const Core = window.AnimalEventCore;
  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function button(text, action) {
    const node = el("button", text, "secondary-button"); node.type = "button";
    node.addEventListener("click", action); return node;
  }
  function option(select, value, text) { const node = el("option", text); node.value = value; select.append(node); }
  const date = (value) => new Date(value).toLocaleString("pt-BR");
  function appendDetails(target, event) {
    const sire = [event.sireTagSnapshot, event.sireNameSnapshot].filter(Boolean).join(" · ") || event.externalSire;
    for (const [label, value] of [["Resultado", Core.PREGNANCY_RESULTS[event.result]], ["Reprodutor", sire],
      ["Lote do sêmen", event.semenBatch], ["Técnico/responsável", event.technician], ["Bezerros", event.calfCount],
      ["Machos", event.maleCalves], ["Fêmeas", event.femaleCalves], ["Lote no registro", event.lotNameSnapshot || "Sem lote"],
      ["Pasto no registro", event.paddockNameSnapshot || "Não definido"], ["Observações", event.notes]]) {
      if (value !== null && value !== undefined && value !== "") target.append(el("p", `${label}: ${value}`));
    }
  }
  class Controller {
    constructor(options) {
      this.options = options; this.repo = window.ReproductionRepository.createReproductionRepository(options);
      this.animals = window.AnimalRepository.createAnimalRepository(options);
      this.dialog = document.querySelector("#reproduction-dialog"); this.form = document.querySelector("#reproduction-form");
      this.list = document.querySelector("#reproduction-list"); this.feedback = document.querySelector("#reproduction-feedback");
      this.generation = 0; this.formGeneration = 0; this.busy = false; this.events = []; this.filters = {};
      const filters = document.querySelector("#reproduction-filters");
      for (const [key, label, type] of [["reproductionType", "Tipo", "select"], ["result", "Resultado do diagnóstico", "select"], ["lotId", "Lote no registro", "select"], ["from", "De", "date"], ["to", "Até", "date"]]) {
        const wrapper = el("label", label); const input = el(type === "select" ? "select" : "input");
        if (type !== "select") input.type = type;
        input.id = `reproduction-filter-${key}`; wrapper.append(input); filters.append(wrapper); this.filters[key] = input;
        input.addEventListener("input", () => this.render());
      }
      for (const [key, values] of [["reproductionType", Core.REPRODUCTION_TYPES], ["result", Core.PREGNANCY_RESULTS]]) {
        option(this.filters[key], "", "Todos"); for (const [value, label] of Object.entries(values)) option(this.filters[key], value, label);
      }
      document.querySelector("#new-reproduction").addEventListener("click", () => this.open({ accountId: options.getAccountId(), propertyId: this.propertyId }));
      this.form.addEventListener("submit", (event) => { event.preventDefault(); this.save(); });
      this.dialog.addEventListener("cancel", (event) => { if (this.busy) event.preventDefault(); });
      this.dialog.addEventListener("close", () => { ++this.formGeneration; });
    }
    async setProperty(propertyId) {
      this.propertyId = propertyId; for (const input of Object.values(this.filters)) input.value = ""; await this.refresh();
    }
    async refresh() {
      const generation = ++this.generation; const accountId = this.options.getAccountId(); const propertyId = this.propertyId;
      this.feedback.textContent = "Carregando registros..."; this.list.replaceChildren();
      const result = await this.repo.list(accountId, propertyId);
      const animals = await this.animals.list(accountId, propertyId, { includeArchived: true });
      if (generation !== this.generation) return;
      if (result.status !== "loaded" || animals.status !== "loaded") { this.events = []; this.feedback.textContent = "Não foi possível carregar a Reprodução. Abra a seção novamente."; return; }
      this.events = result.events; this.identifications = new Map(animals.animals.map((animal) => [animal.id, window.AnimalCore.formatIdentification(animal)]));
      const selected = this.filters.lotId.value; this.filters.lotId.replaceChildren();
      option(this.filters.lotId, "", "Todos"); option(this.filters.lotId, "none", "Sem lote");
      const lots = new Map(); for (const event of this.events) if (event.lotId && !lots.has(event.lotId)) lots.set(event.lotId, event.lotNameSnapshot);
      for (const [id, name] of lots) option(this.filters.lotId, id, name || id);
      this.filters.lotId.value = selected; if (this.filters.lotId.selectedIndex < 0) this.filters.lotId.value = "";
      this.render();
    }
    render() {
      this.filters.result.disabled = this.filters.reproductionType.value !== "pregnancy_diagnosis";
      if (this.filters.result.disabled) this.filters.result.value = "";
      this.list.replaceChildren();
      const filters = Object.fromEntries(Object.entries(this.filters).map(([key, input]) => [key, input.value]));
      if (filters.from && filters.to && filters.from > filters.to) { this.feedback.textContent = "A data inicial deve ser anterior ou igual à final."; return; }
      const events = Core.filterReproductionEvents(this.events, filters); this.feedback.textContent = `${events.length} registro(s)`;
      if (!events.length) this.list.append(el("p", "Nenhum evento reprodutivo encontrado neste período e filtro.", "empty-state"));
      for (const event of events) {
        const row = el("article", undefined, "herd-card"); row.dataset.eventId = event.id;
        row.append(el("h3", Core.REPRODUCTION_TYPES[event.reproductionType]), el("time", date(event.occurredAt)),
          el("p", this.identifications.get(event.animalId) || `Animal: ${event.animalId}`));
        appendDetails(row, event);
        row.append(button("Ver ficha", () => this.options.onAnimal(this.options.getAccountId(), this.propertyId, event.animalId))); this.list.append(row);
      }
    }
    async open(context) {
      if (this.busy || !context.propertyId || this.dialog.open) return;
      const generation = ++this.formGeneration; this.context = { ...context }; this.fields = {}; this.errors = {};
      this.form.replaceChildren(el("h2", "Registrar evento reprodutivo")); this.form.firstChild.id = "reproduction-dialog-title";
      const loading = el("p", "Carregando animais..."); this.form.append(loading); this.dialog.showModal();
      const result = await this.animals.list(context.accountId, context.propertyId);
      if (generation !== this.formGeneration || !this.dialog.open) return;
      loading.remove();
      const selected = result.animals?.find((animal) => animal.id === context.animalId);
      if (result.status !== "loaded" || (context.animalId && (!selected || selected.sex === "male"))) {
        this.form.append(el("p", selected?.sex === "male" ? "Machos não podem receber eventos reprodutivos de matriz." : "Nenhum animal ativo disponível neste contexto. Feche e tente novamente."), button("Fechar", () => this.dialog.close())); return;
      }
      this.candidates = result.animals.filter((animal) => ["female", "unknown"].includes(animal.sex) && (!context.animalId || animal.id === context.animalId));
      const sires = result.animals.filter((animal) => animal.sex === "male");
      const grid = el("div", undefined, "form-grid");
      for (const [key, label, type] of [["animalId", "Animal *", "select"], ["reproductionType", "Tipo *", "select"], ["occurredAt", "Data/hora *", "datetime-local"],
        ["sireAnimalId", "Reprodutor cadastrado", "select"], ["externalSire", "Reprodutor externo / doador", "text"], ["semenBatch", "Lote da dose/sêmen", "text"],
        ["technician", "Técnico/responsável", "text"], ["result", "Resultado *", "select"], ["calfCount", "Total de bezerros *", "text"],
        ["maleCalves", "Bezerros machos", "text"], ["femaleCalves", "Bezerros fêmeas", "text"], ["notes", "Observações", "textarea"]]) {
        const wrapper = el("label", label); const input = el(["select", "textarea"].includes(type) ? type : "input");
        if (input.tagName === "INPUT") input.type = type;
        input.id = `reproduction-${key}`;
        const error = el("span", "", "field-message error"); error.id = `${input.id}-error`; input.setAttribute("aria-describedby", error.id);
        input.addEventListener("input", () => { error.textContent = ""; input.removeAttribute("aria-invalid"); });
        if (["calfCount", "maleCalves", "femaleCalves"].includes(key)) input.inputMode = "numeric";
        if (key === "occurredAt") { const now = new Date(); input.value = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
        this.fields[key] = input; this.errors[key] = error; wrapper.append(input, error); grid.append(wrapper);
      }
      option(this.fields.animalId, "", "Selecione um animal");
      for (const animal of this.candidates) option(this.fields.animalId, animal.id, window.AnimalCore.formatIdentification(animal));
      if (context.animalId) { this.fields.animalId.value = context.animalId; this.fields.animalId.disabled = true; }
      option(this.fields.sireAnimalId, "", "Não informado / externo");
      for (const sire of sires) option(this.fields.sireAnimalId, sire.id, window.AnimalCore.formatIdentification(sire));
      for (const [key, values] of [["reproductionType", Core.REPRODUCTION_TYPES], ["result", Core.PREGNANCY_RESULTS]]) {
        option(this.fields[key], "", "Selecione"); for (const [value, label] of Object.entries(values)) option(this.fields[key], value, label);
      }
      this.warning = el("p", "", "field-message"); this.warning.id = "reproduction-sex-warning"; this.warning.setAttribute("role", "status");
      this.fields.animalId.setAttribute("aria-describedby", `${this.errors.animalId.id} ${this.warning.id}`);
      const updateSex = () => { const animal = this.candidates.find((candidate) => candidate.id === this.fields.animalId.value);
        this.warning.textContent = animal?.sex === "unknown" ? "Sexo não informado. Confirme que este evento pertence a uma matriz. O sexo do cadastro não será alterado." : ""; };
      this.fields.animalId.addEventListener("change", updateSex); updateSex();
      this.fields.reproductionType.addEventListener("change", () => this.updateContext());
      this.fields.sireAnimalId.addEventListener("change", () => this.updateContext()); this.updateContext();
      this.form.append(this.warning, grid);
      this.formMessage = el("p", "", "field-message error"); this.formMessage.setAttribute("role", "alert"); this.form.append(this.formMessage);
      const actions = el("div", undefined, "dialog-actions"); const save = el("button", "Registrar evento", "primary-button action-icon confirm"); save.type = "submit"; save.disabled = !this.candidates.length;
      if (!this.candidates.length) this.formMessage.textContent = "Nenhuma fêmea ou animal com sexo não informado está ativo nesta propriedade.";
      actions.append(button("Cancelar", () => { if (!this.busy) this.dialog.close(); }), save); this.form.append(actions);
      this.fields[context.animalId ? "reproductionType" : "animalId"].focus();
    }
    updateContext() {
      const type = this.fields.reproductionType.value;
      const visible = { sireAnimalId: type === "natural_service", externalSire: type === "artificial_insemination" || (type === "natural_service" && !this.fields.sireAnimalId.value),
        semenBatch: type === "artificial_insemination", technician: type === "artificial_insemination", result: type === "pregnancy_diagnosis",
        calfCount: type === "calving", maleCalves: type === "calving", femaleCalves: type === "calving" };
      for (const [key, show] of Object.entries(visible)) {
        const input = this.fields[key]; input.disabled = !show; input.parentElement.classList.toggle("hidden", !show);
        if (!show) { input.value = ""; this.errors[key].textContent = ""; input.removeAttribute("aria-invalid"); }
      }
    }
    async save() {
      if (this.busy || !this.fields.reproductionType) return;
      const data = Object.fromEntries(Object.entries(this.fields).map(([key, input]) => [key, input.value]));
      const when = new Date(data.occurredAt); data.occurredAt = data.occurredAt && Number.isFinite(when.getTime()) ? when.toISOString() : "";
      const context = { ...this.context, animalId: data.animalId };
      const controls = [...this.form.querySelectorAll("input, select, textarea, button")].map((node) => [node, node.disabled]);
      this.busy = true; for (const [node] of controls) node.disabled = true;
      const result = await this.repo.register(context.accountId, context.propertyId, context.animalId, data);
      this.busy = false; for (const [node, disabled] of controls) node.disabled = disabled;
      for (const [key, error] of Object.entries(this.errors)) { error.textContent = result.errors?.[key] || ""; this.fields[key].setAttribute("aria-invalid", String(Boolean(result.errors?.[key]))); }
      if (result.status !== "saved") {
        this.formMessage.textContent = result.status === "failed" ? "Não foi possível registrar. Nenhum evento foi salvo; seus campos foram mantidos."
          : Object.entries(result.errors || {}).filter(([key]) => !this.errors[key]).map(([, message]) => message).join(" ") || "Confira os campos indicados.";
        const key = Object.keys(result.errors || {}).find((key) => this.fields[key]); this.fields[key]?.focus(); return;
      }
      this.dialog.close(); if (this.propertyId === context.propertyId) await this.refresh(); await this.options.onSaved(context);
    }
  }
  return { Controller, appendDetails };
})();
if (typeof window !== "undefined") window.ReproductionController = ReproductionController;
