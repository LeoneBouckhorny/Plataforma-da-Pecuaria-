const CalculatorCore = (() => {
  const CATEGORIES = ["Boi", "Vaca", "Novilha", "Bezerro", "Bezerra"];
  const DEFAULT_SETTINGS = {
    arrobaPrice: "300,00",
    yieldRate: "50",
    lightLimit: "300",
    mediumLimit: "420",
  };

  function getCryptoSource() {
    if (typeof globalThis !== "undefined" && globalThis.crypto) {
      return globalThis.crypto;
    }

    if (typeof require === "function") {
      try {
        return require("node:crypto");
      } catch {
        return null;
      }
    }

    return null;
  }

  function uuidFromRandomValues(cryptoSource) {
    if (!cryptoSource || typeof cryptoSource.getRandomValues !== "function") {
      return "";
    }

    const bytes = new Uint8Array(16);
    cryptoSource.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
    return [
      hex.slice(0, 4).join(""),
      hex.slice(4, 6).join(""),
      hex.slice(6, 8).join(""),
      hex.slice(8, 10).join(""),
      hex.slice(10, 16).join(""),
    ].join("-");
  }

  function createRandomPart() {
    const cryptoSource = getCryptoSource();

    if (cryptoSource && typeof cryptoSource.randomUUID === "function") {
      return cryptoSource.randomUUID();
    }

    const generatedUuid = uuidFromRandomValues(cryptoSource);
    if (generatedUuid) {
      return generatedUuid;
    }

    if (cryptoSource && typeof cryptoSource.randomBytes === "function") {
      return cryptoSource.randomBytes(16).toString("hex");
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function createId(prefix = "id") {
    const cleanPrefix = String(prefix || "id").replace(/[^a-z0-9-]/gi, "").toLowerCase() || "id";
    return `${cleanPrefix}-${createRandomPart()}`;
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

  function normalizeCategory(category) {
    return CATEGORIES.includes(category) ? category : CATEGORIES[0];
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
        category: normalizeCategory(animal.category),
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
    normalizeCategory,
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
