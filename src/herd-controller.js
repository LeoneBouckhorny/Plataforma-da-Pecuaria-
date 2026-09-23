const HerdController = (() => {
  const definitions = {
    paddock: { title: "Pastos / piquetes", singular: "pasto/piquete", fields: [
      ["name", "Nome *"], ["areaHectares", "Área (ha)", "decimal"], ["notes", "Observações", "textarea"],
    ] },
    lot: { title: "Lotes", singular: "lote", fields: [
      ["name", "Nome *"], ["tagSuffix", "Código do lote / Sufixo do brinco"], ["categories", "Categorias", "list"],
      ["paddockId", "Pasto/piquete atual", "select"], ["breeds", "Raças", "list"], ["notes", "Observações", "textarea"],
    ] },
    animal: { title: "Animais", singular: "animal", fields: [
      ["lotId", "Lote atual", "select"], ["tagNumber", "Número do brinco"], ["tag", "Brinco/identificação anterior"],
      ["name", "Nome"], ["sex", "Sexo", "select"], ["category", "Categoria"],
      ["breed", "Raça"], ["birthDate", "Nascimento", "date"], ["notes", "Observações", "textarea"],
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
      this.view = { type: "root", id: null };
      this.fastRepository = window.FastLotRegistrationRepository.createFastLotRegistrationRepository(options);
      this.propertyId = null;
      this.generation = 0;
      this.busy = false;
      this.detail = new window.AnimalDetailController.Controller({ ...options,
        onChanged: async () => { await this.refresh(); await options.onChanged(); } });
      this.feedback = document.querySelector("#herd-feedback");
      this.sections = document.querySelector("#herd-sections");
      this.dialog = document.querySelector("#herd-dialog");
      this.form = document.querySelector("#herd-form");
      this.search = document.querySelector("#herd-search");
      this.search.addEventListener("input", () => this.render());
      this.form.addEventListener("submit", (event) => { event.preventDefault(); this.save(); });
      this.dialog.addEventListener("cancel", (event) => { if (this.busy) event.preventDefault(); });
    }
    message(text, success = false) {
      this.feedback.textContent = text;
      this.feedback.classList.toggle("success-inline", success);
      this.feedback.classList.toggle("hidden", !text);
    }
    async refreshProperties() {
      if (!this.options.getProperties().some((p) => p.id === this.propertyId)) this.propertyId = null;
      await this.refresh();
    }
    async setProperty(propertyId) {
      this.closeForm();
      if (this.detail.dialog.open) this.detail.dialog.close();
      this.propertyId = propertyId;
      this.view = { type: "root", id: null };
      this.search.value = "";
      await this.refresh();
    }
    async refresh() {
      const generation = ++this.generation;
      document.querySelector("#herd").dataset.loaded = "false";
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
      if (generation === this.generation) {
        this.render();
        document.querySelector("#herd").dataset.loaded = "true";
      }
    }
    render() {
      this.sections.replaceChildren();
      document.querySelector("#herd-empty").classList.toggle("hidden", Boolean(this.propertyId));
      this.search.disabled = !this.propertyId;
      for (const kind of Object.keys(definitions)) document.querySelector(`#herd-count-${kind}`).textContent = String(this.data[`${kind}s`].filter((item) => item.status === "active").length);
      if (!this.propertyId) return;
      const tree = window.HerdHierarchyCore.build(this.data, this.options.getAccountId(), this.propertyId);
      this.tree = tree;
      const lotNode = tree.lots.find((node) => node.lot.id === this.view.id);
      const paddockNode = tree.paddocks.find((node) => node.paddock.id === (this.view.type === "lot" ? lotNode?.lot.paddockId : this.view.id));
      const nav = el("nav", undefined, "herd-context-nav"); nav.setAttribute("aria-label", "Caminho do rebanho");
      nav.append(button("Rebanho", "secondary-button", () => this.navigate("root")));
      if (paddockNode) nav.append(button(paddockNode.paddock.name, "secondary-button", () => this.navigate("paddock", paddockNode.paddock.id)));
      this.sections.append(nav);
      const renderList = (kind, records, title = definitions[kind].title) => {
        const definition = definitions[kind];
        const section = el("section", undefined, "herd-section");
        section.id = `herd-${kind}s`;
        const heading = el("div", undefined, "properties-header");
        const add = button(`Novo ${definition.singular}`, "primary-button action-icon add", () => this.openForm(kind));
        add.id = `new-${kind}-record`;
        heading.append(el("h3", title), add);
        const list = el("div", undefined, "herd-list");
        const query = this.search.value.trim().toLocaleLowerCase("pt-BR");
        const filtered = kind === "animal" ? records.filter((a) => `${a.tag} ${a.name}`.toLocaleLowerCase("pt-BR").includes(query)) : records;
        if (!filtered.length) list.append(el("p", "Nenhum registro encontrado.", "empty-state"));
        for (const record of filtered) list.append(this.card(kind, record));
        section.append(heading, list);
        this.sections.append(section);
      };
      if (this.view.type === "lot" && lotNode) {
        this.sections.append(this.card("lot", lotNode.lot, true));
        renderList("animal", lotNode.animals, "Animais deste lote");
      } else if (this.view.type === "paddock" && paddockNode) {
        this.sections.append(this.card("paddock", paddockNode.paddock, true));
        renderList("lot", paddockNode.lots.map((node) => node.lot), "Lotes neste pasto");
      } else if (this.view.type === "unassigned-lots") {
        renderList("lot", tree.unassignedLots.map((node) => node.lot), "Lotes sem pasto");
      } else if (this.view.type === "unassigned-animals") {
        renderList("animal", tree.unassignedAnimals, "Animais sem lote");
      } else {
        const actions = el("div", undefined, "action-row");
        for (const kind of ["lot", "animal"]) {
          const add = button(`Novo ${definitions[kind].singular}`, "secondary-button action-icon add", () => this.openForm(kind));
          add.id = `new-${kind}-record`; actions.append(add);
        }
        actions.append(button(`Lotes sem pasto (${tree.unassignedLots.length})`, "secondary-button", () => this.navigate("unassigned-lots")),
          button(`Animais sem lote (${tree.unassignedAnimals.length})`, "secondary-button", () => this.navigate("unassigned-animals")));
        this.sections.append(actions);
        renderList("paddock", tree.paddocks.map((node) => node.paddock));
      }
      if (this.search.value.trim() && !["lot", "unassigned-animals"].includes(this.view.type)) {
        const nodes = this.view.type === "paddock" && paddockNode ? paddockNode.lots
          : this.view.type === "unassigned-lots" ? tree.unassignedLots : null;
        const animals = nodes ? nodes.flatMap((node) => node.animals) : this.data.animals;
        const query = this.search.value.trim().toLocaleLowerCase("pt-BR");
        const matches = animals.filter((a) => `${a.tag} ${a.name}`.toLocaleLowerCase("pt-BR").includes(query));
        const results = el("section", undefined, "herd-section"); results.id = "herd-search-results";
        results.append(el("h3", "Animais encontrados"));
        if (!matches.length) results.append(el("p", "Nenhum registro encontrado.", "empty-state"));
        for (const animal of matches) results.append(this.card("animal", animal));
        this.sections.append(results);
      }
    }
    navigate(type, id = null) {
      this.view = { type, id }; this.search.value = ""; this.render();
    }
    card(kind, record, opened = false) {
      const card = el("article", undefined, "herd-card");
      card.dataset.recordId = record.id;
      const title = kind === "animal" ? window.AnimalCore.formatIdentification(record) : record.name;
      card.append(el("h4", title), el("span", record.status === "active" ? "Ativo" : "Arquivado", "status-pill"));
      const detail = (label, value) => { if (value) card.append(el("p", `${label}: ${value}`)); };
      if (kind === "paddock") {
        if (record.areaHectares !== null) detail("Área", `${new Intl.NumberFormat("pt-BR").format(record.areaHectares)} ha`);
        const node = this.tree?.paddocks.find((item) => item.paddock.id === record.id);
        detail("Lotes ativos", String(node?.activeLots || 0));
        detail("Animais ativos cadastrados", String(node?.activeAnimals || 0));
      }
      if (kind === "lot") {
        detail("Código do lote", record.tagSuffix || "Código de brinco não configurado");
        detail("Categorias", record.categories.join(" · "));
        detail("Raças", record.breeds.join(" · "));
        detail("Local atual", this.data.paddocks.find((p) => p.id === record.paddockId)?.name || "Local não definido");
        const counts = window.HerdHierarchyCore.counts(this.data.animals.filter((a) => a.lotId === record.id));
        detail("Machos ativos cadastrados", String(counts.male));
        detail("Fêmeas ativas cadastradas", String(counts.female));
        if (counts.unknown) detail("Sexo não informado (ativos)", String(counts.unknown));
        detail("Total ativo cadastrado", String(counts.total));
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
      if (kind !== "animal" && !opened) actions.append(button(kind === "lot" ? "Abrir lote" : "Abrir pasto", "primary-button", () => this.navigate(kind, record.id)));
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
      this.listValues = {};
      this.fastToggle = null;
      this.messages = {};
      this.form.replaceChildren();
      const heading = el("h2", `${record ? "Editar" : "Novo"} ${definitions[kind].singular}`);
      heading.id = "herd-dialog-title";
      this.form.append(heading);
      const grid = el("div", undefined, "form-grid");
      for (const [key, label, type = "text"] of definitions[kind].fields) {
        if (type === "list") { grid.append(this.listField(key, label, record?.[key] || [])); continue; }
        if (kind === "animal" && record && (changingLot ? key !== "lotId" : key === "lotId")) continue;
        const legacyTag = Boolean(record?.tag && !record.tagOriginLotId);
        if (kind === "animal" && (key === "tag" && !legacyTag || key === "tagNumber" && legacyTag)) continue;
        const wrapper = el("label", label + (key === "tagSuffix" && !record ? " *" : ""));
        const input = el(type === "select" ? "select" : type === "textarea" ? "textarea" : "input");
        input.id = `herd-field-${key}`;
        input.name = key;
        if (input.tagName === "INPUT") input.type = type === "decimal" ? "text" : type;
        if (type === "decimal") input.inputMode = "decimal";
        if (key === "tagNumber") input.inputMode = "numeric";
        if (key === "sex") for (const [value, title] of Object.entries(sexNames)) option(input, value, title);
        if (key === "paddockId" || key === "lotId") {
          option(input, "", key === "paddockId" ? "Local não definido" : "Sem lote");
          const values = this.data[key === "paddockId" ? "paddocks" : "lots"];
          for (const value of values.filter((item) => item.status === "active" || item.id === record?.[key])) {
            option(input, value.id, `${value.name}${value.status === "archived" ? " (arquivado)" : ""}`);
          }
        }
        const contextual = !record && key === "paddockId" && this.view.type === "paddock" ? this.view.id
          : !record && key === "lotId" && this.view.type === "lot" ? this.view.id : "";
        input.value = record?.[key] ?? (key === "sex" ? "unknown" : contextual);
        const error = el("span", "", "field-message error");
        error.id = `${input.id}-error`;
        input.setAttribute("aria-describedby", error.id);
        input.addEventListener("input", () => { error.textContent = ""; input.removeAttribute("aria-invalid"); });
        this.fields[key] = input;
        this.messages[key] = error;
        wrapper.append(input, error);
        grid.append(wrapper);
      }
      if (kind === "lot" && !record) this.addFastFields(grid);
      if (kind === "lot" || kind === "animal" && !changingLot && this.fields.tagNumber) {
        const preview = el("p", "", "tag-code-preview");
        preview.id = "herd-tag-preview";
        preview.setAttribute("aria-live", "polite");
        const updatePreview = () => {
          const suffix = kind === "lot" ? this.fields.tagSuffix.value : record?.tagSuffix
            || this.data.lots.find((lot) => lot.id === this.fields.lotId?.value)?.tagSuffix;
          const code = window.TagCodeCore.buildTagCode(kind === "lot" ? "1" : this.fields.tagNumber.value, suffix);
          preview.textContent = code ? `${kind === "lot" ? "Exemplo de brinco" : "Identificação gerada"}: ${code}`
            : kind === "lot" ? "Código de brinco não configurado" : suffix ? `Código de origem: ${suffix}` : "Selecione um lote com código de identificação configurado.";
        };
        for (const input of Object.values(this.fields)) input.addEventListener("input", updatePreview);
        updatePreview();
        this.fields[kind === "lot" ? "tagSuffix" : "tagNumber"].parentElement.after(preview);
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
    listField(key, title, values) {
      this.listValues[key] = [...values];
      const group = el("fieldset", undefined, "herd-list-field"); group.append(el("legend", title));
      const choices = el("details"); const summary = el("summary"); choices.append(summary);
      const options = el("div", undefined, "herd-options");
      const update = () => { summary.textContent = this.listValues[key].join(" · ") || `Selecionar ${title.toLocaleLowerCase("pt-BR")}`; };
      const addChoice = (value) => {
        const label = el("label"); const input = el("input"); input.type = "checkbox"; input.value = value;
        input.checked = this.listValues[key].includes(value);
        input.addEventListener("change", () => {
          this.listValues[key] = input.checked ? window.LotCore.normalizeList([...this.listValues[key], value]) : this.listValues[key].filter((v) => v !== value);
          update(); group.dispatchEvent(new Event("input", { bubbles: true }));
        });
        label.append(input, document.createTextNode(value)); options.append(label);
      };
      for (const value of window.LotCore.normalizeList([...values, ...(key === "categories" ? window.LotCore.CATEGORY_SUGGESTIONS : window.LotCore.BREED_SUGGESTIONS)])) addChoice(value);
      const custom = el("input"); custom.type = "text"; custom.id = `herd-custom-${key}`;
      const label = el("label", `${title === "Raças" ? "Raça" : "Categoria"} personalizada`); label.append(custom);
      const add = button("Adicionar", "secondary-button action-icon add", () => {
        const value = window.LotCore.normalizeList([custom.value])[0];
        if (!value) return;
        const existing = [...options.querySelectorAll("input")].find((input) => input.value.toLocaleLowerCase("pt-BR") === value.toLocaleLowerCase("pt-BR"));
        if (existing) { existing.checked = true; existing.dispatchEvent(new Event("change")); }
        else { this.listValues[key].push(value); addChoice(value); }
        custom.value = ""; update(); group.dispatchEvent(new Event("input", { bubbles: true }));
      });
      choices.append(options, label, add); group.append(choices); update(); return group;
    }
    formData() {
      return { ...Object.fromEntries(Object.entries(this.fields).map(([key, input]) => [key, input.value])), ...this.listValues };
    }
    addFastFields(grid) {
      const toggleLabel = el("label", undefined, "fast-toggle");
      this.fastToggle = el("input"); this.fastToggle.type = "checkbox"; this.fastToggle.id = "herd-fast-enabled";
      toggleLabel.append(this.fastToggle, document.createTextNode("Criar animais automaticamente neste lote"));
      const fields = el("div", undefined, "form-grid fast-fields hidden"); fields.id = "herd-fast-fields";
      for (const [key, title] of [["maleCount", "Machos"], ["femaleCount", "Fêmeas"], ["startNumber", "Número inicial do brinco *"]]) {
        const label = el("label", title); const input = el("input"); input.type = "text"; input.inputMode = "numeric";
        input.id = `herd-field-${key}`; input.value = key === "startNumber" ? "" : "0";
        const error = el("span", "", "field-message error"); error.id = `${input.id}-error`;
        input.setAttribute("aria-describedby", error.id); this.fields[key] = input; this.messages[key] = error;
        label.append(input, error); fields.append(label);
      }
      const preview = el("p", "", "tag-code-preview"); preview.id = "herd-fast-preview"; preview.setAttribute("aria-live", "polite"); fields.append(preview);
      const update = () => {
        fields.classList.toggle("hidden", !this.fastToggle.checked);
        for (const key of ["maleCount", "femaleCount", "startNumber"]) this.fields[key].disabled = !this.fastToggle.checked;
        const plan = window.FastLotRegistrationCore.createPlan(this.formData());
        preview.textContent = plan.valid ? `Serão criados ${plan.total} animais. ${plan.maleCount} machos e ${plan.femaleCount} fêmeas. Códigos: ${plan.animals[0].tag} até ${plan.animals.at(-1).tag}.`
          : `Total calculado: ${plan.total ?? "—"}. ${Object.values(plan.errors).join(" ")}`;
      };
      grid.addEventListener("input", update); this.fastToggle.addEventListener("change", update);
      grid.append(toggleLabel, fields); update();
    }
    async confirmFast(data) {
      const plan = window.FastLotRegistrationCore.createPlan(data);
      if (!plan.valid) return true; // The repository returns field errors without any writes.
      const dialog = document.querySelector("#fast-lot-confirm"); const content = document.querySelector("#fast-lot-summary");
      content.textContent = `Serão criados ${plan.total} animais individuais no lote ${data.name}: ${plan.maleCount} machos e ${plan.femaleCount} fêmeas. Códigos de ${plan.animals[0].tag} até ${plan.animals.at(-1).tag}.`;
      dialog.returnValue = "cancel";
      return new Promise((resolve) => { dialog.addEventListener("close", () => resolve(dialog.returnValue === "confirm"), { once: true }); dialog.showModal(); });
    }
    closeForm() {
      if (!this.busy && this.dialog.open) this.dialog.close();
    }
    async save() {
      if (this.busy || !this.editing) return;
      const { kind, record, changingLot, accountId, propertyId } = this.editing;
      const data = this.formData();
      this.busy = true;
      this.submit.disabled = true;
      this.cancel.disabled = true;
      const fast = kind === "lot" && !record && this.fastToggle?.checked;
      if (fast && !(await this.confirmFast(data))) {
        this.busy = false; this.submit.disabled = false; this.cancel.disabled = false; return;
      }
      const result = fast ? await this.fastRepository.createLotWithAnimals(accountId, propertyId, data)
        : changingLot ? await this.repos.animal.changeAnimalLot(accountId, propertyId, record.id, data.lotId || null)
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
      if (!record && kind === "lot") this.view = { type: "lot", id: result.lot.id };
      await this.refresh();
      await this.options.onChanged();
      this.message("Registro salvo neste dispositivo.", true);
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
      this.message("Registro atualizado neste dispositivo.", true);
    }
  }
  return { Controller };
})();
if (typeof window !== "undefined") window.HerdController = HerdController;
