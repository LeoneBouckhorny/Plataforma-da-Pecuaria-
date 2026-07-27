const CalculatorCore = (() => {
  const CATEGORIES = ["Boi", "Vaca", "Novilha", "Bezerro", "Bezerra"];
  const DEFAULT_SETTINGS = {
    arrobaPrice: "300,00",
    yieldRate: "50",
    lightLimit: "300",
    mediumLimit: "420",
  };

  function createId(prefix) {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function localDateInputValue(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function parseDecimal(rawValue) {
    const raw = String(rawValue ?? "").trim();

    if (!raw) {
      return { value: 0, valid: false, reason: "empty" };
    }

    let normalized = raw.replace(/\s/g, "");
    const hasComma = normalized.includes(",");
    const hasDot = normalized.includes(".");

    if (hasComma && hasDot) {
      const lastComma = normalized.lastIndexOf(",");
      const lastDot = normalized.lastIndexOf(".");

      if (lastComma > lastDot) {
        normalized = normalized.replace(/\./g, "").replace(",", ".");
      } else {
        normalized = normalized.replace(/,/g, "");
      }
    } else if (hasComma) {
      normalized = normalized.replace(",", ".");
    }

    if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
      return { value: 0, valid: false, reason: "not_numeric" };
    }

    const value = Number(normalized);

    if (!Number.isFinite(value)) {
      return { value: 0, valid: false, reason: "not_numeric" };
    }

    return { value, valid: true, reason: null };
  }

  function normalizeTag(tag) {
    return String(tag ?? "").trim().toUpperCase();
  }

  function getWeightBand(weight, lightLimit, mediumLimit) {
    if (weight <= lightLimit) return "Leve";
    if (weight <= mediumLimit) return "Médio";
    return "Pesado";
  }

  function validateSettings(settings) {
    const errors = {};
    const price = parseDecimal(settings.arrobaPrice);
    const yieldRate = parseDecimal(settings.yieldRate);
    const lightLimit = parseDecimal(settings.lightLimit);
    const mediumLimit = parseDecimal(settings.mediumLimit);

    if (!price.valid) {
      errors.arrobaPrice = price.reason === "empty"
        ? "Informe o preço por arroba."
        : "Use apenas números no preço por arroba.";
    } else if (price.value < 0) {
      errors.arrobaPrice = "O preço por arroba não pode ser negativo.";
    }

    if (!yieldRate.valid) {
      errors.yieldRate = yieldRate.reason === "empty"
        ? "Informe o rendimento."
        : "Use apenas números no rendimento.";
    } else if (yieldRate.value < 0) {
      errors.yieldRate = "O rendimento não pode ser abaixo de 0%.";
    } else if (yieldRate.value > 100) {
      errors.yieldRate = "O rendimento não pode passar de 100%.";
    }

    if (!lightLimit.valid) {
      errors.lightLimit = lightLimit.reason === "empty"
        ? "Informe a faixa leve."
        : "Use apenas números na faixa leve.";
    } else if (lightLimit.value < 0) {
      errors.lightLimit = "A faixa leve não pode ser negativa.";
    }

    if (!mediumLimit.valid) {
      errors.mediumLimit = mediumLimit.reason === "empty"
        ? "Informe a faixa média."
        : "Use apenas números na faixa média.";
    } else if (mediumLimit.value < 0) {
      errors.mediumLimit = "A faixa média não pode ser negativa.";
    } else if (lightLimit.valid && mediumLimit.value < lightLimit.value) {
      errors.mediumLimit = "A faixa média deve ser maior ou igual à faixa leve.";
    }

    return {
      values: {
        arrobaPrice: price.value,
        yieldRate: yieldRate.value,
        lightLimit: lightLimit.value,
        mediumLimit: mediumLimit.value,
      },
      errors,
      priceValid: !errors.arrobaPrice,
      yieldValid: !errors.yieldRate,
      bandsValid: !errors.lightLimit && !errors.mediumLimit,
      valid: Object.keys(errors).length === 0,
    };
  }

  function validateAnimals(animals) {
    const tagCounts = new Map();

    animals.forEach((animal) => {
      const tag = normalizeTag(animal.tag);
      if (tag) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    });

    return animals.map((animal) => {
      const errors = {};
      const warnings = {};
      const tag = normalizeTag(animal.tag);
      const weight = parseDecimal(animal.weight);

      if (!tag) {
        warnings.tag = "Brinco vazio: o animal será listado como sem brinco.";
      } else if (tagCounts.get(tag) > 1) {
        errors.tag = "Brinco duplicado nesta pesagem.";
      }

      if (!weight.valid) {
        errors.weight = weight.reason === "empty"
          ? "Informe o peso."
          : "Use apenas números no peso.";
      } else if (weight.value === 0) {
        errors.weight = "O peso deve ser maior que zero.";
      } else if (weight.value < 0) {
        errors.weight = "O peso não pode ser negativo.";
      }

      return {
        id: animal.id,
        tag: String(animal.tag ?? "").trim(),
        normalizedTag: tag,
        weight: weight.value,
        category: CATEGORIES.includes(animal.category) ? animal.category : CATEGORIES[0],
        note: String(animal.note ?? "").trim(),
        errors,
        warnings,
        valid: Object.keys(errors).length === 0,
      };
    });
  }

  function calculateSummary(settings, animals) {
    const settingState = validateSettings(settings);
    const animalStates = validateAnimals(animals);
    const validAnimals = animalStates.filter((animal) => animal.valid);
    const totalAnimals = validAnimals.length;
    const totalWeight = validAnimals.reduce((sum, animal) => sum + animal.weight, 0);
    const averageWeight = totalAnimals ? totalWeight / totalAnimals : 0;
    const totalArrobas = settingState.yieldValid
      ? (totalWeight * (settingState.values.yieldRate / 100)) / 15
      : null;
    const estimatedValue = settingState.yieldValid && settingState.priceValid
      ? totalArrobas * settingState.values.arrobaPrice
      : null;
    const bandCounts = settingState.bandsValid ? { Leve: 0, Médio: 0, Pesado: 0 } : null;
    const reportAnimals = validAnimals.map((animal) => {
      const band = settingState.bandsValid
        ? getWeightBand(animal.weight, settingState.values.lightLimit, settingState.values.mediumLimit)
        : null;
      const arrobas = settingState.yieldValid
        ? (animal.weight * (settingState.values.yieldRate / 100)) / 15
        : null;

      if (bandCounts && band) {
        bandCounts[band] += 1;
      }

      return { ...animal, band, arrobas };
    });

    const generalMessages = [];
    if (animals.length === 0) {
      generalMessages.push("Adicione pelo menos um animal para calcular a pesagem.");
    } else if (totalAnimals === 0) {
      generalMessages.push("Nenhum animal válido para calcular. Corrija os campos destacados.");
    }

    if (!settingState.yieldValid) {
      generalMessages.push("Corrija o rendimento para calcular arrobas e valor.");
    }

    if (settingState.yieldValid && !settingState.priceValid) {
      generalMessages.push("Corrija o preço por arroba para calcular o valor estimado.");
    } else if (!settingState.yieldValid && !settingState.priceValid) {
      generalMessages.push("Corrija o preço por arroba antes de estimar o valor.");
    }

    if (!settingState.bandsValid) {
      generalMessages.push("Corrija as faixas de peso para classificar os animais.");
    }

    return {
      settings: settingState,
      animals: animalStates,
      validAnimals,
      reportAnimals,
      totalAnimals,
      totalWeight,
      averageWeight,
      totalArrobas,
      estimatedValue,
      bandCounts,
      generalMessages,
    };
  }

  return {
    CATEGORIES,
    DEFAULT_SETTINGS,
    createId,
    localDateInputValue,
    parseDecimal,
    normalizeTag,
    getWeightBand,
    validateSettings,
    validateAnimals,
    calculateSummary,
  };
})();

if (typeof module !== "undefined") {
  module.exports = CalculatorCore;
}

if (typeof window !== "undefined") {
  window.CalculatorCore = CalculatorCore;
}

if (typeof document !== "undefined") {
  const currencyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const numberFormatter = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
  });

  const state = {
    animals: [],
    paddocks: [],
    demoMode: false,
  };

  const sampleAnimals = [
    { tag: "EX-001", weight: "450", category: "Boi", note: "Exemplo de demonstração" },
    { tag: "EX-002", weight: "510", category: "Boi", note: "Exemplo de demonstração" },
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
    });
    weightInput.addEventListener("input", () => {
      animal.weight = weightInput.value;
      renderResults();
    });
    categorySelect.addEventListener("change", () => {
      animal.category = categorySelect.value;
      renderResults();
    });
    noteInput.addEventListener("input", () => {
      animal.note = noteInput.value;
      renderResults();
    });
    removeButton.addEventListener("click", () => {
      state.animals = state.animals.filter((item) => item.id !== animal.id);
      renderAnimals();
      renderResults();
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

  function getSettingsInput() {
    return {
      arrobaPrice: inputs.arrobaPrice.value,
      yieldRate: inputs.yieldRate.value,
      lightLimit: inputs.lightLimit.value,
      mediumLimit: inputs.mediumLimit.value,
    };
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
    });
    const maxInput = createElement("input", {
      value: paddock.max,
      inputMode: "decimal",
      ariaLabel: `Lotação máxima do pasto ${index + 1}`,
    });
    const currentInput = createElement("input", {
      value: paddock.current,
      inputMode: "decimal",
      ariaLabel: `Uso atual do pasto ${index + 1}`,
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
    });
    maxInput.addEventListener("input", () => {
      paddock.max = maxInput.value;
      updateStatus();
    });
    currentInput.addEventListener("input", () => {
      paddock.current = currentInput.value;
      updateStatus();
    });
    removeButton.addEventListener("click", () => {
      state.paddocks = state.paddocks.filter((item) => item.id !== paddock.id);
      renderPaddocks();
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
      id: CalculatorCore.createId("animal"),
      tag: animal.tag || "",
      weight: animal.weight || "",
      category: animal.category || "Boi",
      note: animal.note || "",
    });
    renderAnimals();
    renderResults();
  }

  function restoreDefaultCalculatorFields() {
    inputs.arrobaPrice.value = CalculatorCore.DEFAULT_SETTINGS.arrobaPrice;
    inputs.yieldRate.value = CalculatorCore.DEFAULT_SETTINGS.yieldRate;
    inputs.lightLimit.value = CalculatorCore.DEFAULT_SETTINGS.lightLimit;
    inputs.mediumLimit.value = CalculatorCore.DEFAULT_SETTINGS.mediumLimit;
    inputs.weighingDate.value = CalculatorCore.localDateInputValue();
  }

  function clearWeighing() {
    state.animals = [];
    state.paddocks = state.paddocks.filter((paddock) => !paddock.demo);
    state.demoMode = false;
    inputs.weighingName.value = "";
    restoreDefaultCalculatorFields();
    renderAnimals();
    renderPaddocks();
    renderResults();
  }

  function loadDemoData() {
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

  function addPaddock(paddock = {}) {
    state.paddocks.push({
      id: CalculatorCore.createId("paddock"),
      name: paddock.name || "",
      max: paddock.max || "",
      current: paddock.current || "",
      demo: Boolean(paddock.demo),
    });
    renderPaddocks();
  }

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.tab));
  });

  document.querySelector("#add-animal").addEventListener("click", () => addAnimal());
  document.querySelector("#clear-weighing").addEventListener("click", clearWeighing);
  document.querySelector("#load-demo").addEventListener("click", loadDemoData);
  document.querySelector("#add-paddock").addEventListener("click", () => addPaddock());
  document.querySelector("#print-report").addEventListener("click", () => window.print());

  [inputs.weighingName, inputs.weighingDate, inputs.propertyName].forEach((input) => {
    input.addEventListener("input", renderResults);
    input.addEventListener("change", renderResults);
  });

  [inputs.arrobaPrice, inputs.yieldRate, inputs.lightLimit, inputs.mediumLimit].forEach((input) => {
    input.addEventListener("input", renderResults);
  });

  inputs.usePaddocks.addEventListener("change", syncPaddockVisibility);

  restoreDefaultCalculatorFields();
  renderAnimals();
  renderPaddocks();
  syncPaddockVisibility();
  setActiveTab("calculator");
  renderResults();
}
