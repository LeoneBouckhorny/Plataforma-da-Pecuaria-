const HerdController = (() => {
  const definitions = {
    paddock: { title: "Pastos / piquetes", singular: "pasto/piquete", fields: [
      ["name", "Nome *"], ["areaHectares", "Área (ha)", "decimal"], ["notes", "Observações", "textarea"],
    ] },
    lot: { title: "Lotes", singular: "lote", fields: [
      ["name", "Nome *"], ["category", "Categoria"], ["paddockId", "Pasto/piquete atual", "select"], ["notes", "Observações", "textarea"],
    ] },
    animal: { title: "Animais", singular: "animal", fields: [
      ["tag", "Brinco/identificação"], ["name", "Nome"], ["sex", "Sexo", "select"], ["category", "Categoria"],
      ["breed", "Raça"], ["birthDate", "Nascimento", "date"], ["lotId", "Lote atual", "select"], ["notes", "Observações", "textarea"],
    ] },
  };
  const sexNames = { male: "Macho", female: "Fêmea", unknown: "Não informado" };
  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function button(text, className, action) {
    const node = el("button", text, className);
    node.type = "button";
    node.addEventListener("click", action);
    return node;
  }
  function option(select, value, text) {
    const node = el("option", text);
    node.value = value;
    select.append(node);
  }
  class Controller {
    constructor(options) {
      this.options = options;
      this.repos = {
        paddock: window.PaddockRepository.createPaddockRepository(options),
        lot: window.LotRepository.createLotRepository(options),
        animal: window.AnimalRepository.createAnimalRepository(options),
      };
      this.data = { paddocks: [], lots: [], animals: [] };
      this.propertyId = null;
      this.generation = 0;
      this.busy = false;
      this.detail = new window.AnimalDetailController.Controller({ ...options,
        onChanged: async () => { await this.refresh(); await options.onChanged(); } });
      this.selector = document.querySelector("#herd-property");
      this.feedback = document.querySelector("#herd-feedback");
      this.sections = document.querySelector("#herd-sections");
      this.dialog = document.querySelector("#herd-dialog");
      this.form = document.querySelector("#herd-form");
      this.search = document.querySelector("#herd-search");
      this.selector.addEventListener("change", () => {
        this.propertyId = this.selector.value || null;
        this.closeForm();
        this.search.value = "";
        this.refresh();
      });
      this.search.addEventListener("input", () => this.render());
      this.form.addEventListener("submit", (event) => { event.preventDefault(); this.save(); });
      this.dialog.addEventListener("cancel", (event) => { if (this.busy) event.preventDefault(); });
    }
    message(text) {
      this.feedback.textContent = text;
      this.feedback.classList.toggle("hidden", !text);
    }
    async refreshProperties() {
      const properties = this.options.getProperties().filter((p) => p.status === "active");
      if (!properties.some((p) => p.id === this.propertyId)) {
        this.propertyId = properties[0]?.id || null;
        this.closeForm();
        this.search.value = "";
      }
      this.selector.replaceChildren();
      option(this.selector, "", "Selecione uma propriedade");
      for (const property of properties) option(this.selector, property.id, property.name);
      this.selector.value = this.propertyId || "";
      await this.refresh();
    }
    async refresh() {
      const generation = ++this.generation;
      this.data = { paddocks: [], lots: [], animals: [] };
      this.message("");
      this.render();
      if (!this.propertyId) return;
      const accountId = this.options.getAccountId();
      const propertyId = this.propertyId;
      for (const [kind, repo] of Object.entries(this.repos)) {
        const result = await repo.list(accountId, propertyId, { includeArchived: true });
        if (generation !== this.generation) return;
        if (result.status !== "loaded") {
          this.message("Não foi possível carregar o rebanho deste dispositivo. Tente abrir a área novamente.");
          return;
        }
        this.data[`${kind}s`] = result[`${kind}s`];
      }
      if (generation === this.generation) this.render();
    }
    render() {
      this.sections.replaceChildren();
      document.querySelector("#herd-empty").classList.toggle("hidden", Boolean(this.propertyId));
      this.search.disabled = !this.propertyId;
      for (const kind of Object.keys(definitions)) {
        const all = this.data[`${kind}s`];
        document.querySelector(`#herd-count-${kind}`).textContent = String(all.filter((item) => item.status === "active").length);
        if (!this.propertyId) continue;
        const definition = definitions[kind];
        const section = el("section", undefined, "herd-section");
        section.id = `herd-${kind}s`;
        const heading = el("div", undefined, "properties-header");
        const add = button(`Novo ${definition.singular}`, "primary-button action-icon add", () => this.openForm(kind));
        add.id = `new-${kind}-record`;
        heading.append(el("h3", definition.title), add);
        const list = el("div", undefined, "herd-list");
        const query = this.search.value.trim().toLocaleLowerCase("pt-BR");
        const filtered = kind === "animal" ? all.filter((a) => `${a.tag} ${a.name}`.toLocaleLowerCase("pt-BR").includes(query)) : all;
        if (!filtered.length) list.append(el("p", "Nenhum registro encontrado.", "empty-state"));
        for (const record of filtered) list.append(this.card(kind, record));
        section.append(heading, list);
        this.sections.append(section);
      }
    }
    card(kind, record) {
      const card = el("article", undefined, "herd-card");
      card.dataset.recordId = record.id;
      const title = kind === "animal" ? window.AnimalCore.formatIdentification(record) : record.name;
      card.append(el("h4", title), el("span", record.status === "active" ? "Ativo" : "Arquivado", "status-pill"));
      const detail = (label, value) => { if (value) card.append(el("p", `${label}: ${value}`)); };
      if (kind === "paddock" && record.areaHectares !== null) detail("Área", `${new Intl.NumberFormat("pt-BR").format(record.areaHectares)} ha`);
      if (kind === "lot") {
        detail("Categoria", record.category);
        detail("Local atual", this.data.paddocks.find((p) => p.id === record.paddockId)?.name || "Local não definido");
        detail("Animais ativos cadastrados", String(this.data.animals.filter((a) => a.status === "active" && a.lotId === record.id).length));
      }
      if (kind === "animal") {
        if (record.tag) detail("Nome", record.name);
        detail("Sexo", sexNames[record.sex]);
        detail("Categoria", record.category);
        detail("Raça", record.breed);
        if (record.birthDate) detail("Nascimento", record.birthDate.split("-").reverse().join("/"));
        const lot = this.data.lots.find((l) => l.id === record.lotId);
        detail("Lote", lot?.name || "Sem lote");
        detail("Local atual", this.data.paddocks.find((p) => p.id === lot?.paddockId)?.name || "Local não definido");
      }
      detail("Observações", record.notes);
      const actions = el("div", undefined, "property-actions");
      if (kind === "animal") actions.append(button("Ver ficha", "primary-button", () => this.detail.open(this.options.getAccountId(), this.propertyId, record.id)));
      actions.append(button("Editar", "secondary-button", () => this.openForm(kind, record)));
      if (kind !== "paddock") actions.append(button(kind === "lot" ? "Alterar pasto" : "Alterar lote", "secondary-button",
        () => this.openForm(kind, record, kind === "lot" ? "paddockId" : "lotId")));
      actions.append(button(record.status === "active" ? "Arquivar" : "Reativar", "secondary-button",
        () => this.changeStatus(kind, record)));
      card.append(actions);
      return card;
    }
    openForm(kind, record = null, focusField = null) {
      if (!this.propertyId || this.busy) return;
      const changingLot = kind === "animal" && record && focusField === "lotId";
      this.editing = { kind, record, changingLot, propertyId: this.propertyId, accountId: this.options.getAccountId() };
      this.fields = {};
      this.messages = {};
      this.form.replaceChildren();
      const heading = el("h2", `${record ? "Editar" : "Novo"} ${definitions[kind].singular}`);
      heading.id = "herd-dialog-title";
      this.form.append(heading);
      const grid = el("div", undefined, "form-grid");
      for (const [key, label, type = "text"] of definitions[kind].fields) {
        if (kind === "animal" && record && (changingLot ? key !== "lotId" : key === "lotId")) continue;
        const wrapper = el("label", label);
        const input = el(type === "select" ? "select" : type === "textarea" ? "textarea" : "input");
        input.id = `herd-field-${key}`;
        input.name = key;
        if (input.tagName === "INPUT") input.type = type === "decimal" ? "text" : type;
        if (type === "decimal") input.inputMode = "decimal";
        if (key === "sex") for (const [value, title] of Object.entries(sexNames)) option(input, value, title);
        if (key === "paddockId" || key === "lotId") {
          option(input, "", key === "paddockId" ? "Local não definido" : "Sem lote");
          const values = this.data[key === "paddockId" ? "paddocks" : "lots"];
          for (const value of values.filter((item) => item.status === "active" || item.id === record?.[key])) {
            option(input, value.id, `${value.name}${value.status === "archived" ? " (arquivado)" : ""}`);
          }
        }
        input.value = record?.[key] ?? (key === "sex" ? "unknown" : "");
        const error = el("span", "", "field-message error");
        error.id = `${input.id}-error`;
        input.setAttribute("aria-describedby", error.id);
        input.addEventListener("input", () => { error.textContent = ""; input.removeAttribute("aria-invalid"); });
        this.fields[key] = input;
        this.messages[key] = error;
        wrapper.append(input, error);
        grid.append(wrapper);
      }
      this.formError = el("p", "", "field-message error");
      this.formError.setAttribute("role", "alert");
      const actions = el("div", undefined, "dialog-actions");
      this.cancel = button("Cancelar", "secondary-button", () => this.closeForm());
      this.submit = el("button", "Salvar", "primary-button action-icon confirm");
      this.submit.type = "submit";
      actions.append(this.cancel, this.submit);
      this.form.append(grid, this.formError, actions);
      this.dialog.showModal();
      (this.fields[focusField] || Object.values(this.fields)[0]).focus();
    }
    closeForm() {
      if (!this.busy && this.dialog.open) this.dialog.close();
    }
    async save() {
      if (this.busy || !this.editing) return;
      const { kind, record, changingLot, accountId, propertyId } = this.editing;
      const data = Object.fromEntries(Object.entries(this.fields).map(([key, input]) => [key, input.value]));
      this.busy = true;
      this.submit.disabled = true;
      this.cancel.disabled = true;
      const result = changingLot ? await this.repos.animal.changeAnimalLot(accountId, propertyId, record.id, data.lotId || null)
        : record ? await this.repos[kind].update(accountId, propertyId, record.id, data)
        : await this.repos[kind].create(accountId, propertyId, data);
      this.busy = false;
      this.submit.disabled = false;
      this.cancel.disabled = false;
      for (const key of Object.keys(this.messages)) {
        this.messages[key].textContent = result.errors?.[key] || "";
        this.fields[key].setAttribute("aria-invalid", String(Boolean(result.errors?.[key])));
      }
      if (result.status !== "saved") {
        this.formError.textContent = Object.entries(result.errors || {}).filter(([key]) => !this.messages[key]).map(([, value]) => value).join(" ")
          || (result.status === "invalid" ? "Confira os campos indicados." : "Não foi possível salvar neste dispositivo. Seus campos foram mantidos.");
        return;
      }
      this.closeForm();
      await this.refresh();
      await this.options.onChanged();
      this.message("Registro salvo neste dispositivo.");
    }
    async changeStatus(kind, record) {
      if (this.busy) return;
      this.busy = true;
      const propertyId = this.propertyId;
      const result = await this.repos[kind][record.status === "active" ? "archive" : "reactivate"](
        this.options.getAccountId(), propertyId, record.id);
      this.busy = false;
      if (propertyId !== this.propertyId) return;
      if (result.status !== "saved") {
        this.message(Object.values(result.errors || {}).join(" ") || "Não foi possível alterar o registro neste dispositivo.");
        this.feedback.scrollIntoView({ block: "nearest" });
        return;
      }
      await this.refresh();
      await this.options.onChanged();
      this.message("Registro atualizado neste dispositivo.");
    }
  }
  return { Controller };
})();
if (typeof window !== "undefined") window.HerdController = HerdController;
