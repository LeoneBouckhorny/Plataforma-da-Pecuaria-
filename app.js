if (typeof document !== "undefined") {
  const currencyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const numberFormatter = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
  });

  const SAVE_DEBOUNCE_MS = 500;
  const CalculatorCore = window.CalculatorCore;
  const LocalDataCore = window.LocalDataCore;
  const DraftRepository = window.DraftRepository;

  const state = {
    animals: [],
    paddocks: [],
    demoMode: false,
    saveTimer: null,
    restoring: false,
    clearing: false,
    repository: null,
  };

  const sampleAnimals = [
    { tag: "EX-001", weight: "450", category: "Boi", note: "Exemplo de demonstração", demo: true },
    { tag: "EX-002", weight: "510", category: "Boi", note: "Exemplo de demonstração", demo: true },
  ];

  const inputs = {
    weighingName: document.querySelector("#weighing-name"),
    weighingDate: document.querySelector("#weighing-date"),
    propertyName: document.querySelector("#property-name"),
    arrobaPrice: document.querySelector("#arroba-price"),
    yieldRate: document.querySelector("#yield-rate"),
    lightLimit: document.querySelector("#light-limit"),
    mediumLimit: document.querySelector("#medium-limit"),
    usePaddocks: document.querySelector("#use-paddocks"),
  };

  const elements = {
    animalRows: document.querySelector("#animal-rows"),
    paddockRows: document.querySelector("#paddock-rows"),
    globalMessage: document.querySelector("#global-message"),
    persistenceMessage: document.querySelector("#persistence-message"),
    saveStatus: document.querySelector("#save-status"),
    demoBanner: document.querySelector("#demo-banner"),
    animalEmptyMessage: document.querySelector("#animal-empty-message"),
    totalAnimals: document.querySelector("#total-animals"),
    totalWeight: document.querySelector("#total-weight"),
    averageWeight: document.querySelector("#average-weight"),
    totalArrobas: document.querySelector("#total-arrobas"),
    estimatedValue: document.querySelector("#estimated-value"),
    resultTitle: document.querySelector("#result-title"),
    weightBands: document.querySelector("#weight-bands"),
    reportList: document.querySelector("#report-list"),
    reportProperty: document.querySelector("#report-property"),
    reportDate: document.querySelector("#report-date"),
    reportPrice: document.querySelector("#report-price"),
    reportYield: document.querySelector("#report-yield"),
    reportEstimateNote: document.querySelector("#report-estimate-note"),
  };

  function createElement(tag, options = {}) {
    const element = document.createElement(tag);

    if (options.className) element.className = options.className;
    if (options.text !== undefined) element.textContent = options.text;
    if (options.type) element.type = options.type;
    if (options.value !== undefined) element.value = options.value;
    if (options.id) element.id = options.id;
    if (options.inputMode) element.inputMode = options.inputMode;
    if (options.ariaLabel) element.setAttribute("aria-label", options.ariaLabel);
    if (options.data) {
      Object.entries(options.data).forEach(([key, value]) => {
        element.dataset[key] = value;
      });
    }

    return element;
  }

  function clearChildren(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function formatKg(value) {
    return `${numberFormatter.format(value)} kg`;
  }

  function formatArrobas(value) {
    return value === null ? "Indisponível" : `${numberFormatter.format(value)} @`;
  }

  function formatMoney(value) {
    return value === null ? "Indisponível" : currencyFormatter.format(value);
  }

  function setSaveStatus(status) {
    const messages = {
      saving: "Salvando...",
      saved: "Salvo neste dispositivo",
      failed: "Não foi possível salvar neste dispositivo",
    };

    elements.saveStatus.textContent = messages[status] || "";
    elements.saveStatus.className = `save-status ${status || ""}`.trim();
  }

  function setPersistenceWarning(message) {
    elements.persistenceMessage.textContent = message || "";
    elements.persistenceMessage.classList.toggle("hidden", !message);
  }

  function getSettingsInput() {
    return {
      arrobaPrice: inputs.arrobaPrice.value,
      yieldRate: inputs.yieldRate.value,
      lightLimit: inputs.lightLimit.value,
      mediumLimit: inputs.mediumLimit.value,
    };
  }

  function getDraftSource() {
    return {
      weighingName: inputs.weighingName.value,
      weighingDate: inputs.weighingDate.value,
      propertyName: inputs.propertyName.value,
      settings: getSettingsInput(),
      animals: state.animals,
      usePaddocks: inputs.usePaddocks.checked,
      paddocks: state.paddocks,
      demoMode: state.demoMode,
    };
  }

  async function saveDraftNow() {
    if (state.restoring || state.clearing || state.demoMode) {
      return;
    }

    const result = await state.repository.saveDraft(getDraftSource());
    if (result.status === "saved") {
      setSaveStatus("saved");
      setPersistenceWarning("");
      return;
    }

    if (result.status === "failed") {
      setSaveStatus("failed");
      setPersistenceWarning("A pesagem continua funcionando, mas não foi possível preservar os dados neste dispositivo.");
    }
  }

  function scheduleDraftSave() {
    if (state.restoring || state.clearing || state.demoMode) {
      return;
    }

    window.clearTimeout(state.saveTimer);
    setSaveStatus("saving");
    state.saveTimer = window.setTimeout(saveDraftNow, SAVE_DEBOUNCE_MS);
  }

  function setFieldMessage(input, messageElement, message, type) {
    messageElement.textContent = message || "";
    messageElement.className = `field-message ${type || ""}`.trim();

    if (message && type === "error") {
      input.setAttribute("aria-invalid", "true");
    } else {
      input.removeAttribute("aria-invalid");
    }
  }

  function setFormError(input, messageId, message) {
    const messageElement = document.querySelector(`#${messageId}`);
    messageElement.textContent = message || "";

    if (message) {
      input.setAttribute("aria-invalid", "true");
    } else {
      input.removeAttribute("aria-invalid");
    }
  }

  function renderMessages(summary) {
    elements.globalMessage.textContent = summary.generalMessages.join(" ");
    elements.globalMessage.classList.toggle("hidden", summary.generalMessages.length === 0);

    setFormError(inputs.arrobaPrice, "arroba-price-message", summary.settings.errors.arrobaPrice);
    setFormError(inputs.yieldRate, "yield-rate-message", summary.settings.errors.yieldRate);
    setFormError(inputs.lightLimit, "light-limit-message", summary.settings.errors.lightLimit);
    setFormError(inputs.mediumLimit, "medium-limit-message", summary.settings.errors.mediumLimit);
  }

  function renderRowValidation(summary) {
    summary.animals.forEach((animalState) => {
      const row = elements.animalRows.querySelector(`[data-animal-id="${animalState.id}"]`);
      if (!row) return;

      const tagInput = row.querySelector('[data-field="tag"]');
      const weightInput = row.querySelector('[data-field="weight"]');
      const tagMessage = row.querySelector('[data-message="tag"]');
      const weightMessage = row.querySelector('[data-message="weight"]');

      setFieldMessage(
        tagInput,
        tagMessage,
        animalState.errors.tag || animalState.warnings.tag || "",
        animalState.errors.tag ? "error" : animalState.warnings.tag ? "warning" : "",
      );
      setFieldMessage(
        weightInput,
        weightMessage,
        animalState.errors.weight || "",
        animalState.errors.weight ? "error" : "",
      );
    });
  }

  function renderBands(summary) {
    clearChildren(elements.weightBands);

    if (!summary.settings.bandsValid) {
      elements.weightBands.appendChild(createElement("p", {
        className: "empty-report",
        text: "Classificação indisponível. Corrija os limites das faixas de peso.",
      }));
      return;
    }

    Object.entries(summary.bandCounts).forEach(([name, count]) => {
      const percent = summary.totalAnimals ? Math.round((count / summary.totalAnimals) * 100) : 0;
      const row = createElement("div", { className: "band-row" });
      const nameElement = createElement("strong", { text: name });
      const track = createElement("span", { className: "bar-track" });
      const fill = createElement("span", { className: "bar-fill" });
      const countElement = createElement("span", { text: String(count) });

      fill.style.width = `${percent}%`;
      track.appendChild(fill);
      row.append(nameElement, track, countElement);
      elements.weightBands.appendChild(row);
    });
  }

  function renderReport(summary) {
    clearChildren(elements.reportList);

    if (summary.reportAnimals.length === 0) {
      elements.reportList.appendChild(createElement("p", {
        className: "empty-report",
        text: "Nenhum animal válido informado.",
      }));
      return;
    }

    summary.reportAnimals.forEach((animal) => {
      const row = createElement("div", { className: "report-row" });
      const tag = createElement("strong", { text: animal.tag || "Sem brinco" });
      const detail = createElement("span", {
        text: `${animal.category} · ${animal.band || "Faixa indisponível"}`,
      });
      const metrics = createElement("span", {
        text: `${formatKg(animal.weight)} · ${formatArrobas(animal.arrobas)}`,
      });

      row.append(tag, detail, metrics);
      elements.reportList.appendChild(row);
    });
  }

  function renderReportMeta(summary) {
    const propertyName = inputs.propertyName.value.trim();
    const dateValue = inputs.weighingDate.value;

    elements.reportProperty.textContent = propertyName || "Propriedade não informada";
    elements.reportDate.textContent = dateValue
      ? new Date(`${dateValue}T00:00:00`).toLocaleDateString("pt-BR")
      : "Data não informada";
    elements.reportPrice.textContent = summary.settings.priceValid
      ? currencyFormatter.format(summary.settings.values.arrobaPrice)
      : "Preço inválido";
    elements.reportYield.textContent = summary.settings.yieldValid
      ? `${numberFormatter.format(summary.settings.values.yieldRate)}%`
      : "Rendimento inválido";
    elements.reportEstimateNote.textContent = summary.totalAnimals
      ? "Valores calculados como estimativas, usando o rendimento e a cotação informados."
      : "Sem animais válidos para estimativa.";
  }

  function renderResults() {
    const summary = CalculatorCore.calculateSummary(getSettingsInput(), state.animals);

    renderMessages(summary);
    renderRowValidation(summary);
    renderBands(summary);
    renderReport(summary);
    renderReportMeta(summary);

    elements.demoBanner.classList.toggle("hidden", !state.demoMode);
    elements.resultTitle.textContent = inputs.weighingName.value.trim() || "Pesagem sem nome";
    elements.totalAnimals.textContent = String(summary.totalAnimals);
    elements.totalWeight.textContent = formatKg(summary.totalWeight);
    elements.averageWeight.textContent = formatKg(summary.averageWeight);
    elements.totalArrobas.textContent = formatArrobas(summary.totalArrobas);
    elements.estimatedValue.textContent = formatMoney(summary.estimatedValue);

    return summary;
  }

  function createAnimalRow(animal, index) {
    const row = createElement("tr", { data: { animalId: animal.id } });
    const tagCell = createElement("td");
    const weightCell = createElement("td");
    const categoryCell = createElement("td");
    const noteCell = createElement("td");
    const actionCell = createElement("td");
    const tagInput = createElement("input", {
      value: animal.tag,
      ariaLabel: `Brinco do animal ${index + 1}`,
      data: { field: "tag" },
    });
    const tagMessage = createElement("div", { className: "field-message", data: { message: "tag" } });
    const weightInput = createElement("input", {
      value: animal.weight,
      inputMode: "decimal",
      ariaLabel: `Peso do animal ${index + 1}`,
      data: { field: "weight" },
    });
    const weightMessage = createElement("div", { className: "field-message", data: { message: "weight" } });
    const categorySelect = createElement("select", {
      ariaLabel: `Categoria do animal ${index + 1}`,
      data: { field: "category" },
    });
    const noteInput = createElement("input", {
      value: animal.note,
      ariaLabel: `Observação do animal ${index + 1}`,
      data: { field: "note" },
    });
    const removeButton = createElement("button", {
      className: "remove-button",
      text: "x",
      type: "button",
      ariaLabel: `Remover animal ${index + 1}`,
    });

    CalculatorCore.CATEGORIES.forEach((category) => {
      const option = createElement("option", { text: category, value: category });
      option.value = category;
      option.selected = animal.category === category;
      categorySelect.appendChild(option);
    });

    tagInput.addEventListener("input", () => {
      animal.tag = tagInput.value;
      renderResults();
      scheduleDraftSave();
    });
    weightInput.addEventListener("input", () => {
      animal.weight = weightInput.value;
      renderResults();
      scheduleDraftSave();
    });
    categorySelect.addEventListener("change", () => {
      animal.category = categorySelect.value;
      renderResults();
      scheduleDraftSave();
    });
    noteInput.addEventListener("input", () => {
      animal.note = noteInput.value;
      renderResults();
      scheduleDraftSave();
    });
    removeButton.addEventListener("click", () => {
      state.animals = state.animals.filter((item) => item.id !== animal.id);
      renderAnimals();
      renderResults();
      scheduleDraftSave();
    });

    tagCell.append(tagInput, tagMessage);
    weightCell.append(weightInput, weightMessage);
    categoryCell.appendChild(categorySelect);
    noteCell.appendChild(noteInput);
    actionCell.appendChild(removeButton);
    row.append(tagCell, weightCell, categoryCell, noteCell, actionCell);

    return row;
  }

  function renderAnimals() {
    clearChildren(elements.animalRows);
    state.animals.forEach((animal, index) => {
      elements.animalRows.appendChild(createAnimalRow(animal, index));
    });
    elements.animalEmptyMessage.classList.toggle("hidden", state.animals.length > 0);
  }

  function createPaddockRow(paddock, index) {
    const row = createElement("tr", { data: { paddockId: paddock.id } });
    const nameCell = createElement("td");
    const maxCell = createElement("td");
    const currentCell = createElement("td");
    const statusCell = createElement("td");
    const actionCell = createElement("td");
    const nameInput = createElement("input", {
      value: paddock.name,
      ariaLabel: `Nome do pasto ${index + 1}`,
      data: { field: "paddockName" },
    });
    const maxInput = createElement("input", {
      value: paddock.max,
      inputMode: "decimal",
      ariaLabel: `Lotação máxima do pasto ${index + 1}`,
      data: { field: "paddockMax" },
    });
    const currentInput = createElement("input", {
      value: paddock.current,
      inputMode: "decimal",
      ariaLabel: `Uso atual do pasto ${index + 1}`,
      data: { field: "paddockCurrent" },
    });
    const status = createElement("span");
    const removeButton = createElement("button", {
      className: "remove-button",
      text: "x",
      type: "button",
      ariaLabel: `Remover pasto ${index + 1}`,
    });

    function updateStatus() {
      const max = CalculatorCore.parseDecimal(maxInput.value);
      const current = CalculatorCore.parseDecimal(currentInput.value);
      const hasLimit = max.valid && max.value > 0;
      const usage = current.valid ? current.value : 0;
      const isOverLimit = hasLimit && usage > max.value;

      status.className = isOverLimit ? "paddock-alert" : "paddock-ok";
      status.textContent = hasLimit
        ? isOverLimit ? "Acima da lotação" : "Dentro do limite"
        : "Sem limite definido";
    }

    nameInput.addEventListener("input", () => {
      paddock.name = nameInput.value;
      scheduleDraftSave();
    });
    maxInput.addEventListener("input", () => {
      paddock.max = maxInput.value;
      updateStatus();
      scheduleDraftSave();
    });
    currentInput.addEventListener("input", () => {
      paddock.current = currentInput.value;
      updateStatus();
      scheduleDraftSave();
    });
    removeButton.addEventListener("click", () => {
      state.paddocks = state.paddocks.filter((item) => item.id !== paddock.id);
      renderPaddocks();
      scheduleDraftSave();
    });

    nameCell.appendChild(nameInput);
    maxCell.appendChild(maxInput);
    currentCell.appendChild(currentInput);
    statusCell.appendChild(status);
    actionCell.appendChild(removeButton);
    row.append(nameCell, maxCell, currentCell, statusCell, actionCell);
    updateStatus();

    return row;
  }

  function renderPaddocks() {
    clearChildren(elements.paddockRows);
    state.paddocks.forEach((paddock, index) => {
      elements.paddockRows.appendChild(createPaddockRow(paddock, index));
    });
  }

  function syncPaddockVisibility() {
    const enabled = inputs.usePaddocks.checked;
    document.querySelector("#paddock-config").classList.toggle("hidden", !enabled);
    document.querySelector("#no-paddock-message").classList.toggle("hidden", enabled);
  }

  function setActiveTab(tabId) {
    document.querySelectorAll(".tab-button").forEach((button) => {
      const isActive = button.dataset.tab === tabId;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === tabId);
    });
  }

  function addAnimal(animal = {}) {
    state.animals.push({
      id: animal.id || CalculatorCore.createId("animal"),
      tag: animal.tag || "",
      weight: animal.weight || "",
      category: CalculatorCore.normalizeCategory(animal.category),
      note: animal.note || "",
      demo: Boolean(animal.demo),
    });
    renderAnimals();
    renderResults();
    scheduleDraftSave();
  }

  function addPaddock(paddock = {}) {
    state.paddocks.push({
      id: paddock.id || CalculatorCore.createId("paddock"),
      name: paddock.name || "",
      max: paddock.max || "",
      current: paddock.current || "",
      demo: Boolean(paddock.demo),
    });
    renderPaddocks();
    scheduleDraftSave();
  }

  function applyDraftData(data) {
    const draftData = LocalDataCore.normalizeDraftData(data);
    state.animals = draftData.animals.map((animal) => ({ ...animal, demo: false }));
    state.paddocks = draftData.paddocks.map((paddock) => ({ ...paddock, demo: false }));
    state.demoMode = false;
    inputs.weighingName.value = draftData.weighingName;
    inputs.weighingDate.value = draftData.weighingDate;
    inputs.propertyName.value = draftData.propertyName;
    inputs.arrobaPrice.value = draftData.settings.arrobaPrice;
    inputs.yieldRate.value = draftData.settings.yieldRate;
    inputs.lightLimit.value = draftData.settings.lightLimit;
    inputs.mediumLimit.value = draftData.settings.mediumLimit;
    inputs.usePaddocks.checked = draftData.usePaddocks;
    renderAnimals();
    renderPaddocks();
    syncPaddockVisibility();
    renderResults();
  }

  function applyEmptyState() {
    state.animals = [];
    state.paddocks = [];
    state.demoMode = false;
    inputs.weighingName.value = "";
    inputs.propertyName.value = "";
    inputs.usePaddocks.checked = false;
    inputs.arrobaPrice.value = CalculatorCore.DEFAULT_SETTINGS.arrobaPrice;
    inputs.yieldRate.value = CalculatorCore.DEFAULT_SETTINGS.yieldRate;
    inputs.lightLimit.value = CalculatorCore.DEFAULT_SETTINGS.lightLimit;
    inputs.mediumLimit.value = CalculatorCore.DEFAULT_SETTINGS.mediumLimit;
    inputs.weighingDate.value = CalculatorCore.localDateInputValue();
    renderAnimals();
    renderPaddocks();
    syncPaddockVisibility();
    renderResults();
  }

  async function clearWeighing() {
    state.clearing = true;
    window.clearTimeout(state.saveTimer);
    applyEmptyState();

    const result = await state.repository.deleteDraft();
    if (result.status === "deleted") {
      setSaveStatus("saved");
      setPersistenceWarning("");
    } else {
      setSaveStatus("failed");
      setPersistenceWarning("A pesagem foi limpa da tela, mas não foi possível confirmar a exclusão no dispositivo.");
    }

    state.clearing = false;
  }

  function loadDemoData() {
    window.clearTimeout(state.saveTimer);
    state.animals = sampleAnimals.map((animal) => ({
      id: CalculatorCore.createId("animal"),
      ...animal,
    }));
    state.demoMode = true;
    inputs.weighingName.value = "Demonstração";
    inputs.arrobaPrice.value = "300,00";
    inputs.yieldRate.value = "50";
    inputs.lightLimit.value = "300";
    inputs.mediumLimit.value = "480";
    renderAnimals();
    renderResults();
  }

  async function restoreDraft() {
    const result = await state.repository.loadDraft();

    if (result.status === "loaded") {
      applyDraftData(result.draft.data);
      setSaveStatus("saved");
      return;
    }

    if (result.status === "empty") {
      applyEmptyState();
      setSaveStatus("saved");
      return;
    }

    if (result.status === "incompatible") {
      applyEmptyState();
      setSaveStatus("failed");
      setPersistenceWarning("Existe um rascunho local incompatível com esta versão. A calculadora continua disponível.");
      return;
    }

    applyEmptyState();
    setSaveStatus("failed");
    setPersistenceWarning("A calculadora continua funcionando, mas não foi possível acessar o salvamento neste dispositivo.");
  }

  function bindEvents() {
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.addEventListener("click", () => setActiveTab(button.dataset.tab));
    });

    document.querySelector("#add-animal").addEventListener("click", () => addAnimal());
    document.querySelector("#clear-weighing").addEventListener("click", clearWeighing);
    document.querySelector("#load-demo").addEventListener("click", loadDemoData);
    document.querySelector("#add-paddock").addEventListener("click", () => addPaddock());
    document.querySelector("#print-report").addEventListener("click", () => window.print());

    [inputs.weighingName, inputs.weighingDate, inputs.propertyName].forEach((input) => {
      input.addEventListener("input", () => {
        renderResults();
        scheduleDraftSave();
      });
      input.addEventListener("change", () => {
        renderResults();
        scheduleDraftSave();
      });
    });

    [inputs.arrobaPrice, inputs.yieldRate, inputs.lightLimit, inputs.mediumLimit].forEach((input) => {
      input.addEventListener("input", () => {
        renderResults();
        scheduleDraftSave();
      });
    });

    inputs.usePaddocks.addEventListener("change", () => {
      syncPaddockVisibility();
      scheduleDraftSave();
    });
  }

  async function init() {
    if (!CalculatorCore || !LocalDataCore || !DraftRepository) {
      throw new Error("Módulos locais obrigatórios não foram carregados.");
    }

    state.repository = DraftRepository.createDraftRepository();
    state.restoring = true;
    bindEvents();
    setActiveTab("calculator");
    setSaveStatus("saving");
    await restoreDraft();
    state.restoring = false;
  }

  init();
}
