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
  const LocalDatabase = window.LocalDatabase;
  const DraftRepository = window.DraftRepository;
  const WeighingHistoryCore = window.WeighingHistoryCore;
  const WeighingRepository = window.WeighingRepository;
  const CsvExportCore = window.CsvExportCore;

  const state = {
    animals: [],
    paddocks: [],
    demoMode: false,
    saveTimer: null,
    restoring: false,
    clearing: false,
    finalizing: false,
    repository: null,
    historyRepository: null,
    historySessions: [],
    selectedSession: null,
    selectedItems: [],
    pendingSnapshot: null,
    pendingDeleteSessionId: "",
    finalizedDraftSignature: "",
    lastSavedSessionId: "",
    currentSummary: null,
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
    finalizeFeedback: document.querySelector("#finalize-feedback"),
    finalizeButton: document.querySelector("#finalize-weighing"),
    exportCurrentCsvButton: document.querySelector("#export-current-csv"),
    viewSavedButton: document.querySelector("#view-saved-weighing"),
    newWeighingButton: document.querySelector("#new-weighing"),
    finalizeDialog: document.querySelector("#finalize-dialog"),
    finalizeSummary: document.querySelector("#finalize-summary"),
    confirmFinalizeButton: document.querySelector("#confirm-finalize"),
    cancelFinalizeButton: document.querySelector("#cancel-finalize"),
    deleteDialog: document.querySelector("#delete-dialog"),
    confirmDeleteButton: document.querySelector("#confirm-delete"),
    cancelDeleteButton: document.querySelector("#cancel-delete"),
    animalEmptyMessage: document.querySelector("#animal-empty-message"),
    totalAnimals: document.querySelector("#total-animals"),
    totalWeight: document.querySelector("#total-weight"),
    averageWeight: document.querySelector("#average-weight"),
    totalArrobas: document.querySelector("#total-arrobas"),
    estimatedValue: document.querySelector("#estimated-value"),
    weightBands: document.querySelector("#weight-bands"),
    reportList: document.querySelector("#report-list"),
    reportDocument: document.querySelector("#report-document"),
    reportName: document.querySelector("#report-name"),
    reportProperty: document.querySelector("#report-property"),
    reportDate: document.querySelector("#report-date"),
    reportIssuedAt: document.querySelector("#report-issued-at"),
    reportPrice: document.querySelector("#report-price"),
    reportYield: document.querySelector("#report-yield"),
    reportBandParams: document.querySelector("#report-band-params"),
    reportEstimateNote: document.querySelector("#report-estimate-note"),
    historyList: document.querySelector("#history-list"),
    historyEmptyMessage: document.querySelector("#history-empty-message"),
    historyDetailEmpty: document.querySelector("#history-detail-empty"),
    historyDetailContent: document.querySelector("#history-detail-content"),
    historyReportName: document.querySelector("#history-report-name"),
    historyReportProperty: document.querySelector("#history-report-property"),
    historyReportDate: document.querySelector("#history-report-date"),
    historyReportCreatedAt: document.querySelector("#history-report-created-at"),
    historyReportPrice: document.querySelector("#history-report-price"),
    historyReportYield: document.querySelector("#history-report-yield"),
    historyReportBandParams: document.querySelector("#history-report-band-params"),
    historyTotalAnimals: document.querySelector("#history-total-animals"),
    historyTotalWeight: document.querySelector("#history-total-weight"),
    historyAverageWeight: document.querySelector("#history-average-weight"),
    historyTotalArrobas: document.querySelector("#history-total-arrobas"),
    historyEstimatedValue: document.querySelector("#history-estimated-value"),
    historyReportList: document.querySelector("#history-report-list"),
    exportHistoryCsvButton: document.querySelector("#export-history-csv"),
    printHistoryReportButton: document.querySelector("#print-history-report"),
    deleteHistorySessionButton: document.querySelector("#delete-history-session"),
  };

  function createElement(tag, options = {}) {
    const element = document.createElement(tag);

    if (options.className) element.className = options.className;
    if (options.text !== undefined) element.textContent = options.text;
    if (options.type) element.type = options.type;
    if (options.value !== undefined) element.value = options.value;
    if (options.id) element.id = options.id;
    if (options.inputMode) element.inputMode = options.inputMode;
    if (options.disabled !== undefined) element.disabled = Boolean(options.disabled);
    if (options.ariaLabel) element.setAttribute("aria-label", options.ariaLabel);
    if (options.title) element.title = options.title;
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

  function formatDateInput(value) {
    if (!value) return "Data não informada";
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? "Data não informada" : date.toLocaleDateString("pt-BR");
  }

  function formatDateTime(value) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) {
      return "Data não informada";
    }

    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatBandParams(lightLimit, mediumLimit) {
    return `Leve até ${formatKg(lightLimit)}; média até ${formatKg(mediumLimit)}; pesada acima de ${formatKg(mediumLimit)}.`;
  }

  function setSaveStatus(status) {
    const messages = {
      saving: "Salvando...",
      saved: "Salvo neste dispositivo",
      failed: "Não foi possível salvar neste dispositivo",
      demo: "Demonstração não salva",
    };

    elements.saveStatus.textContent = messages[status] || "";
    elements.saveStatus.className = `save-status ${status || ""}`.trim();
  }

  function setPersistenceWarning(message) {
    elements.persistenceMessage.textContent = message || "";
    elements.persistenceMessage.classList.toggle("hidden", !message);
  }

  function showGlobalMessage(message) {
    elements.globalMessage.textContent = message || "";
    elements.globalMessage.classList.toggle("hidden", !message);
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

  function getDraftSignature() {
    return JSON.stringify(LocalDataCore.normalizeDraftData(getDraftSource()));
  }

  function clearFinalizedState() {
    state.finalizedDraftSignature = "";
    state.lastSavedSessionId = "";
    state.pendingSnapshot = null;
    elements.finalizeFeedback.classList.add("hidden");
  }

  function clearFinalizedStateIfDraftChanged() {
    if (!state.finalizedDraftSignature) {
      return;
    }

    if (getDraftSignature() !== state.finalizedDraftSignature) {
      clearFinalizedState();
    }
  }

  function cancelPendingDraftSave() {
    window.clearTimeout(state.saveTimer);
    state.saveTimer = null;
  }

  async function saveDraftNow() {
    state.saveTimer = null;

    if (state.restoring || state.clearing || state.demoMode) {
      return;
    }

    if (state.finalizedDraftSignature && getDraftSignature() === state.finalizedDraftSignature) {
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
    if (state.restoring || state.clearing) {
      return;
    }

    if (state.demoMode) {
      setSaveStatus("demo");
      return;
    }

    cancelPendingDraftSave();
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
    showGlobalMessage(summary.generalMessages.join(" "));
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

  function createReportRow(index, animal, options = {}) {
    const row = createElement("div", {
      className: options.header ? "report-row report-header" : "report-row",
    });

    if (options.header) {
      ["#", "Brinco", "Categoria", "Peso", "Faixa", "Arrobas", "Observação"].forEach((label) => {
        row.appendChild(createElement("strong", { text: label }));
      });
      return row;
    }

    const values = [
      String(index + 1),
      animal.tag || "Sem brinco",
      animal.category || "Sem categoria",
      formatKg(animal.weight),
      animal.band || "Faixa indisponível",
      formatArrobas(animal.arrobas),
      animal.note || "Sem observação",
    ];

    values.forEach((value, valueIndex) => {
      row.appendChild(createElement(valueIndex === 1 ? "strong" : "span", { text: value }));
    });

    return row;
  }

  function renderReportList(container, animals, emptyText) {
    clearChildren(container);

    if (animals.length === 0) {
      container.appendChild(createElement("p", {
        className: "empty-report",
        text: emptyText,
      }));
      return;
    }

    container.appendChild(createReportRow(0, null, { header: true }));
    animals.forEach((animal, index) => {
      container.appendChild(createReportRow(index, animal));
    });
  }

  function renderCurrentReport(summary) {
    const reportAnimals = summary.reportAnimals.map((animal) => ({
      tag: animal.tag,
      category: animal.category,
      weight: animal.weight,
      band: animal.band,
      arrobas: animal.arrobas,
      note: animal.note,
    }));

    renderReportList(elements.reportList, reportAnimals, "Nenhum animal válido informado.");
  }

  function renderReportMeta(summary) {
    const weighingName = inputs.weighingName.value.trim();
    const propertyName = inputs.propertyName.value.trim();

    elements.reportDocument.textContent = "Romaneio de pesagem";
    elements.reportName.textContent = weighingName || "Pesagem sem nome";
    elements.reportProperty.textContent = propertyName || "Propriedade não informada";
    elements.reportDate.textContent = formatDateInput(inputs.weighingDate.value);
    elements.reportIssuedAt.textContent = formatDateTime(new Date());
    elements.reportPrice.textContent = summary.settings.priceValid
      ? currencyFormatter.format(summary.settings.values.arrobaPrice)
      : "Preço inválido";
    elements.reportYield.textContent = summary.settings.yieldValid
      ? `${numberFormatter.format(summary.settings.values.yieldRate)}%`
      : "Rendimento inválido";
    elements.reportBandParams.textContent = summary.settings.bandsValid
      ? formatBandParams(summary.settings.values.lightLimit, summary.settings.values.mediumLimit)
      : "Faixas inválidas";
    elements.reportEstimateNote.textContent = summary.totalAnimals
      ? "Valores calculados como estimativas, usando o rendimento e a cotação informados."
      : "Sem animais válidos para estimativa.";
  }

  function updateFinalizeAvailability() {
    const alreadySaved = Boolean(state.finalizedDraftSignature)
      && getDraftSignature() === state.finalizedDraftSignature;
    const disabled = state.demoMode || state.finalizing || alreadySaved;

    elements.finalizeButton.disabled = disabled;
    elements.finalizeButton.title = "";

    if (state.demoMode) {
      elements.finalizeButton.title = "Limpe a demonstração antes de finalizar uma pesagem real.";
    } else if (alreadySaved) {
      elements.finalizeButton.title = "Esta pesagem já foi salva neste dispositivo.";
    }
  }

  function renderResults() {
    const summary = CalculatorCore.calculateSummary(getSettingsInput(), state.animals);
    state.currentSummary = summary;

    renderMessages(summary);
    renderRowValidation(summary);
    renderBands(summary);
    renderCurrentReport(summary);
    renderReportMeta(summary);

    elements.demoBanner.classList.toggle("hidden", !state.demoMode);
    elements.totalAnimals.textContent = String(summary.totalAnimals);
    elements.totalWeight.textContent = formatKg(summary.totalWeight);
    elements.averageWeight.textContent = formatKg(summary.averageWeight);
    elements.totalArrobas.textContent = formatArrobas(summary.totalArrobas);
    elements.estimatedValue.textContent = formatMoney(summary.estimatedValue);
    updateFinalizeAvailability();

    return summary;
  }

  function handleDraftChanged() {
    clearFinalizedStateIfDraftChanged();
    renderResults();
    scheduleDraftSave();
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
      handleDraftChanged();
    });
    weightInput.addEventListener("input", () => {
      animal.weight = weightInput.value;
      handleDraftChanged();
    });
    categorySelect.addEventListener("change", () => {
      animal.category = categorySelect.value;
      handleDraftChanged();
    });
    noteInput.addEventListener("input", () => {
      animal.note = noteInput.value;
      handleDraftChanged();
    });
    removeButton.addEventListener("click", () => {
      state.animals = state.animals.filter((item) => item.id !== animal.id);
      renderAnimals();
      handleDraftChanged();
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
      handleDraftChanged();
    });
    maxInput.addEventListener("input", () => {
      paddock.max = maxInput.value;
      updateStatus();
      handleDraftChanged();
    });
    currentInput.addEventListener("input", () => {
      paddock.current = currentInput.value;
      updateStatus();
      handleDraftChanged();
    });
    removeButton.addEventListener("click", () => {
      state.paddocks = state.paddocks.filter((item) => item.id !== paddock.id);
      renderPaddocks();
      handleDraftChanged();
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
    handleDraftChanged();
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
    handleDraftChanged();
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
    clearFinalizedState();
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
    clearFinalizedState();
    renderAnimals();
    renderPaddocks();
    syncPaddockVisibility();
    renderResults();
  }

  async function clearWeighing() {
    state.clearing = true;
    cancelPendingDraftSave();
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

  async function loadDemoData() {
    cancelPendingDraftSave();
    clearFinalizedState();
    state.animals = sampleAnimals.map((animal) => ({
      id: CalculatorCore.createId("animal"),
      ...animal,
    }));
    state.demoMode = true;
    inputs.weighingName.value = "Demonstração";
    inputs.propertyName.value = "";
    inputs.weighingDate.value = CalculatorCore.localDateInputValue();
    inputs.arrobaPrice.value = "300,00";
    inputs.yieldRate.value = "50";
    inputs.lightLimit.value = "300";
    inputs.mediumLimit.value = "480";
    renderAnimals();
    renderResults();
    setSaveStatus("demo");
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

  function buildCurrentSnapshot() {
    return WeighingHistoryCore.buildSnapshot(getDraftSource());
  }

  function renderFinalizeSummary(session) {
    clearChildren(elements.finalizeSummary);

    [
      ["Nome", session.weighingName || "Pesagem sem nome"],
      ["Data", formatDateInput(session.weighingDate)],
      ["Animais", String(session.totalAnimals)],
      ["Peso total", formatKg(session.totalWeight)],
      ["Peso médio", formatKg(session.averageWeight)],
      ["Arrobas", formatArrobas(session.totalArrobas)],
      ["Valor estimado", formatMoney(session.estimatedValue)],
    ].forEach(([label, value]) => {
      const row = createElement("div");
      row.append(
        createElement("span", { text: label }),
        createElement("strong", { text: value }),
      );
      elements.finalizeSummary.appendChild(row);
    });
  }

  function openFinalizeDialog() {
    if (typeof elements.finalizeDialog.showModal === "function") {
      elements.finalizeDialog.showModal();
    } else {
      elements.finalizeDialog.setAttribute("open", "");
    }
  }

  function closeFinalizeDialog() {
    if (elements.finalizeDialog.open && typeof elements.finalizeDialog.close === "function") {
      elements.finalizeDialog.close();
    } else {
      elements.finalizeDialog.removeAttribute("open");
    }
  }

  function openDeleteDialog() {
    if (typeof elements.deleteDialog.showModal === "function") {
      elements.deleteDialog.showModal();
    } else {
      elements.deleteDialog.setAttribute("open", "");
    }
  }

  function closeDeleteDialog() {
    state.pendingDeleteSessionId = "";

    if (elements.deleteDialog.open && typeof elements.deleteDialog.close === "function") {
      elements.deleteDialog.close();
    } else {
      elements.deleteDialog.removeAttribute("open");
    }
  }

  function handleFinalizeClick() {
    const result = buildCurrentSnapshot();
    renderResults();

    if (!result.valid) {
      state.pendingSnapshot = null;
      showGlobalMessage(result.errors.join(" "));
      return;
    }

    state.pendingSnapshot = result.snapshot;
    renderFinalizeSummary(result.snapshot.session);
    openFinalizeDialog();
  }

  async function confirmFinalize() {
    if (state.finalizing) {
      return;
    }

    let snapshot = state.pendingSnapshot;
    if (!snapshot) {
      const result = buildCurrentSnapshot();
      if (!result.valid) {
        showGlobalMessage(result.errors.join(" "));
        return;
      }
      snapshot = result.snapshot;
    }

    state.finalizing = true;
    elements.confirmFinalizeButton.disabled = true;
    updateFinalizeAvailability();

    const result = await state.historyRepository.saveCompletedSession(snapshot);

    state.finalizing = false;
    elements.confirmFinalizeButton.disabled = false;

    if (result.status !== "saved") {
      showGlobalMessage("Não foi possível salvar a pesagem finalizada neste dispositivo.");
      updateFinalizeAvailability();
      return;
    }

    state.finalizedDraftSignature = getDraftSignature();
    state.lastSavedSessionId = result.session.id;
    state.pendingSnapshot = null;

    cancelPendingDraftSave();
    const draftDeleteResult = await state.repository.deleteDraft();
    if (draftDeleteResult.status === "deleted") {
      setPersistenceWarning("");
    } else {
      setPersistenceWarning("A pesagem foi salva no histórico, mas não foi possível remover o rascunho deste dispositivo.");
    }

    setSaveStatus("saved");
    closeFinalizeDialog();
    elements.finalizeFeedback.classList.remove("hidden");
    showGlobalMessage("");
    await loadHistory();
    updateFinalizeAvailability();
  }

  function snapshotFromCurrentDraft() {
    const result = buildCurrentSnapshot();
    renderResults();

    if (!result.valid) {
      showGlobalMessage(result.errors.join(" "));
      return null;
    }

    return result.snapshot;
  }

  function downloadTextFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = createElement("a");

    anchor.href = url;
    anchor.download = fileName;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function exportSnapshotCsv(snapshot) {
    const csv = CsvExportCore.generateCsv(snapshot.session, snapshot.items);
    downloadTextFile(csv, CsvExportCore.buildFileName(snapshot.session), "text/csv;charset=utf-8");
  }

  function exportCurrentCsv() {
    const snapshot = snapshotFromCurrentDraft();
    if (!snapshot) {
      return;
    }

    exportSnapshotCsv(snapshot);
  }

  async function exportHistoryCsv() {
    if (!state.selectedSession) {
      return;
    }

    exportSnapshotCsv({ session: state.selectedSession, items: state.selectedItems });
  }

  function sessionToHistoryItem(session) {
    const button = createElement("button", {
      className: "history-item",
      type: "button",
      data: { sessionId: session.id },
    });

    if (state.selectedSession && state.selectedSession.id === session.id) {
      button.classList.add("active");
    }

    const title = createElement("strong", { text: session.weighingName || "Pesagem sem nome" });
    const details = createElement("span", {
      text: `${formatDateInput(session.weighingDate)} · ${session.propertyNameSnapshot || "Propriedade não informada"}`,
    });
    const metrics = createElement("span", { className: "history-item-metrics" });

    [
      `${session.totalAnimals} animais`,
      `Peso: ${formatKg(session.totalWeight)}`,
      `Média: ${formatKg(session.averageWeight)}`,
      `Arrobas: ${formatArrobas(session.totalArrobas)}`,
      `Valor: ${formatMoney(session.estimatedValue)}`,
    ].forEach((text) => {
      metrics.appendChild(createElement("span", { text }));
    });

    button.append(title, details, metrics);
    button.addEventListener("click", () => selectHistorySession(session.id));
    return button;
  }

  function renderHistoryList() {
    clearChildren(elements.historyList);
    elements.historyEmptyMessage.classList.toggle("hidden", state.historySessions.length > 0);

    state.historySessions.forEach((session) => {
      elements.historyList.appendChild(sessionToHistoryItem(session));
    });
  }

  function renderHistoryDetailEmpty() {
    state.selectedSession = null;
    state.selectedItems = [];
    elements.historyDetailEmpty.classList.remove("hidden");
    elements.historyDetailContent.classList.add("hidden");
    elements.exportHistoryCsvButton.disabled = true;
    elements.printHistoryReportButton.disabled = true;
    elements.deleteHistorySessionButton.disabled = true;
  }

  function renderHistoryDetail() {
    const session = state.selectedSession;
    const items = state.selectedItems;

    if (!session) {
      renderHistoryDetailEmpty();
      return;
    }

    elements.historyDetailEmpty.classList.add("hidden");
    elements.historyDetailContent.classList.remove("hidden");
    elements.exportHistoryCsvButton.disabled = false;
    elements.printHistoryReportButton.disabled = false;
    elements.deleteHistorySessionButton.disabled = false;

    elements.historyReportName.textContent = session.weighingName || "Pesagem sem nome";
    elements.historyReportProperty.textContent = session.propertyNameSnapshot || "Propriedade não informada";
    elements.historyReportDate.textContent = formatDateInput(session.weighingDate);
    elements.historyReportCreatedAt.textContent = formatDateTime(session.createdAt);
    elements.historyReportPrice.textContent = currencyFormatter.format(session.arrobaPriceSnapshot);
    elements.historyReportYield.textContent = `${numberFormatter.format(session.yieldRateSnapshot)}%`;
    elements.historyReportBandParams.textContent = formatBandParams(
      session.lightLimitSnapshot,
      session.mediumLimitSnapshot,
    );

    elements.historyTotalAnimals.textContent = String(session.totalAnimals);
    elements.historyTotalWeight.textContent = formatKg(session.totalWeight);
    elements.historyAverageWeight.textContent = formatKg(session.averageWeight);
    elements.historyTotalArrobas.textContent = formatArrobas(session.totalArrobas);
    elements.historyEstimatedValue.textContent = formatMoney(session.estimatedValue);

    renderReportList(
      elements.historyReportList,
      items.map((item) => ({
        tag: item.tagSnapshot,
        category: item.categorySnapshot,
        weight: item.weightSnapshot,
        band: item.weightBandSnapshot,
        arrobas: item.arrobasSnapshot,
        note: item.noteSnapshot,
      })),
      "Nenhum animal encontrado para esta pesagem.",
    );
  }

  async function loadHistory() {
    const result = await state.historyRepository.listSessions();
    if (result.status !== "loaded") {
      state.historySessions = [];
      renderHistoryList();
      renderHistoryDetailEmpty();
      return;
    }

    state.historySessions = result.sessions;
    renderHistoryList();

    if (state.selectedSession && state.historySessions.some((session) => session.id === state.selectedSession.id)) {
      await selectHistorySession(state.selectedSession.id);
    } else if (!state.historySessions.length) {
      renderHistoryDetailEmpty();
    }
  }

  async function selectHistorySession(sessionId) {
    const result = await state.historyRepository.getSessionWithItems(sessionId);

    if (result.status !== "loaded") {
      renderHistoryDetailEmpty();
      return;
    }

    state.selectedSession = result.session;
    state.selectedItems = result.items;
    renderHistoryList();
    renderHistoryDetail();
  }

  async function viewLastSavedWeighing() {
    if (!state.lastSavedSessionId) {
      return;
    }

    setActiveTab("history");
    await selectHistorySession(state.lastSavedSessionId);
  }

  async function deleteSelectedHistory() {
    if (!state.selectedSession) {
      return;
    }

    state.pendingDeleteSessionId = state.selectedSession.id;
    openDeleteDialog();
  }

  async function confirmDeleteSelectedHistory() {
    const deletedSessionId = state.pendingDeleteSessionId;
    if (!deletedSessionId) {
      closeDeleteDialog();
      return;
    }

    const result = await state.historyRepository.deleteSession(deletedSessionId);
    if (result.status !== "deleted") {
      renderHistoryDetail();
      return;
    }

    if (state.lastSavedSessionId === deletedSessionId) {
      clearFinalizedState();
    }

    renderHistoryDetailEmpty();
    closeDeleteDialog();
    await loadHistory();
  }

  function bindEvents() {
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.addEventListener("click", async () => {
        setActiveTab(button.dataset.tab);
        if (button.dataset.tab === "history") {
          await loadHistory();
        }
      });
    });

    document.querySelector("#add-animal").addEventListener("click", () => addAnimal());
    document.querySelector("#clear-weighing").addEventListener("click", clearWeighing);
    document.querySelector("#load-demo").addEventListener("click", loadDemoData);
    document.querySelector("#add-paddock").addEventListener("click", () => addPaddock());
    document.querySelector("#print-report").addEventListener("click", () => window.print());
    document.querySelector("#print-history-report").addEventListener("click", () => window.print());
    elements.finalizeButton.addEventListener("click", handleFinalizeClick);
    elements.confirmFinalizeButton.addEventListener("click", confirmFinalize);
    elements.cancelFinalizeButton.addEventListener("click", closeFinalizeDialog);
    elements.confirmDeleteButton.addEventListener("click", confirmDeleteSelectedHistory);
    elements.cancelDeleteButton.addEventListener("click", closeDeleteDialog);
    elements.exportCurrentCsvButton.addEventListener("click", exportCurrentCsv);
    elements.exportHistoryCsvButton.addEventListener("click", exportHistoryCsv);
    elements.viewSavedButton.addEventListener("click", viewLastSavedWeighing);
    elements.newWeighingButton.addEventListener("click", clearWeighing);
    elements.deleteHistorySessionButton.addEventListener("click", deleteSelectedHistory);

    [inputs.weighingName, inputs.weighingDate, inputs.propertyName].forEach((input) => {
      input.addEventListener("input", handleDraftChanged);
      input.addEventListener("change", handleDraftChanged);
    });

    [inputs.arrobaPrice, inputs.yieldRate, inputs.lightLimit, inputs.mediumLimit].forEach((input) => {
      input.addEventListener("input", handleDraftChanged);
    });

    inputs.usePaddocks.addEventListener("change", () => {
      syncPaddockVisibility();
      handleDraftChanged();
    });
  }

  async function init() {
    if (
      !CalculatorCore
      || !LocalDataCore
      || !LocalDatabase
      || !DraftRepository
      || !WeighingHistoryCore
      || !WeighingRepository
      || !CsvExportCore
    ) {
      throw new Error("Módulos locais obrigatórios não foram carregados.");
    }

    const database = LocalDatabase.createLocalDatabase();
    state.repository = DraftRepository.createDraftRepository({ database });
    state.historyRepository = WeighingRepository.createWeighingRepository({ database });
    state.restoring = true;
    bindEvents();
    setActiveTab("calculator");
    setSaveStatus("saving");
    renderHistoryDetailEmpty();
    await restoreDraft();
    await loadHistory();
    state.restoring = false;
  }

  init();
}
