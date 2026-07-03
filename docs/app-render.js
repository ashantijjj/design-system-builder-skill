
function readConfig() {
  const modules = {};
  document.querySelectorAll("[data-module]").forEach((checkbox) => {
    modules[checkbox.dataset.module] = checkbox.checked;
  });
  const systemType = document.querySelector("input[name='systemType']:checked").value;
  const multiThemeType = document.querySelector("input[name='multiThemeType']:checked")?.value || defaults.multiThemeType;
  const themeBackgroundStrategy = readRadioValue("themeBackgroundStrategy", defaults.themeBackgroundStrategy);
  const multiPrimary = systemType === "multi-theme" && multiThemeType === "multi-primary";
  const themeSpecificBackground =
    systemType === "multi-theme" && (multiThemeType === "light-dark" || themeBackgroundStrategy === "per-theme");
  const themes = readThemes(systemType, multiThemeType, themeBackgroundStrategy);
  const secondaryFonts = readSecondaryFonts();
  modules.auxiliary = multiPrimary ? themes.some((theme) => theme.auxiliaryColors.length) : Boolean(elements.auxColor.value.trim());
  modules.background = hasBackgroundInput(systemType, multiThemeType, themeBackgroundStrategy, themes);

  return {
    figmaLink: elements.figmaLink.value.trim(),
    systemType,
    multiThemeType,
    rawPrimaryColor: multiPrimary ? "" : elements.primaryColor.value.trim(),
    rawBlackColor: elements.blackColor.value.trim(),
    rawBackgroundColor: themeSpecificBackground ? "" : elements.backgroundColor.value.trim(),
    rawAuxColor: elements.auxColor.value.trim(),
    rawLightBackgroundColor: elements.lightBackgroundColor.value.trim(),
    rawDarkBackgroundColor: elements.darkBackgroundColor.value.trim(),
    rawThemes: themes,
    primaryColor: readPrimaryColor(),
    blackColor: normalizeHex(elements.blackColor.value, previewFallbacks.blackColor),
    backgroundColor: normalizeHex(elements.backgroundColor.value, previewFallbacks.backgroundColor),
    auxColor: normalizeHex(elements.auxColor.value, previewFallbacks.auxColor),
    lightBackgroundColor: normalizeHex(elements.lightBackgroundColor.value, previewFallbacks.lightBackgroundColor),
    darkBackgroundColor: normalizeHex(elements.darkBackgroundColor.value, previewFallbacks.darkBackgroundColor),
    autoTuneDarkPrimary: elements.autoTuneDarkPrimary.checked,
    themeBackgroundStrategy,
    semanticSet: elements.semanticSet.value || defaults.semanticSet,
    neutralMode: readRadioValue("neutralMode", defaults.neutralMode),
    colorOutput: readRadioValue("colorOutput", defaults.colorOutput),
    primaryFont: elements.primaryFont.value.trim(),
    secondaryFont: secondaryFonts[0]?.family || "",
    secondaryUse: secondaryFonts[0]?.use || defaults.secondaryUse,
    secondaryFonts,
    typographyOutput: readRadioValue("typographyOutput", defaults.typographyOutput),
    typePreset: readRadioValue("typePreset", defaults.typePreset),
    usesPreviewFallback: usesPreviewFallback(),
    modules,
    themes,
  };
}

function readRadioValue(name, fallback) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value || fallback;
}

function secondaryFontInput(index, field) {
  return document.querySelector(`[data-secondary-index="${index}"][data-secondary-field="${field}"]`);
}

function readSecondaryFonts() {
  return Array.from({ length: secondaryFontState.count }, (_, index) => ({
    family: secondaryFontInput(index, "family")?.value.trim() || "",
    use: secondaryFontInput(index, "use")?.value || defaults.secondaryUse,
  }));
}

function setRadioValue(name, value) {
  const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (radio) radio.checked = true;
}

function applySystemTypeDefaults(systemType) {
  const preset = rules.systemTypeDefaults?.[systemType];
  if (!preset) return;

  if (preset.semanticSet) elements.semanticSet.value = preset.semanticSet;
  if (preset.neutralMode) setRadioValue("neutralMode", preset.neutralMode);
  if (preset.colorOutput) setRadioValue("colorOutput", preset.colorOutput);
  if (preset.secondaryUse) {
    syncSecondaryFontDraftsFromDom();
    if (systemType === "lightweight") {
      secondaryFontState.count = minSecondaryFontCount;
      secondaryFontState.drafts = [secondaryFontState.drafts[0] || { family: "", use: defaults.secondaryUse }];
    }
    secondaryFontState.drafts = secondaryFontState.drafts.map((draft) => ({ ...draft, use: preset.secondaryUse }));
    renderSecondaryFonts();
  }
  if (preset.typographyOutput) setRadioValue("typographyOutput", preset.typographyOutput);
  if (preset.typePreset) setRadioValue("typePreset", preset.typePreset);
}

function isMultiPrimaryMode() {
  const systemType = document.querySelector("input[name='systemType']:checked")?.value || defaults.systemType;
  const multiThemeType = document.querySelector("input[name='multiThemeType']:checked")?.value || defaults.multiThemeType;
  return systemType === "multi-theme" && multiThemeType === "multi-primary";
}

function usesThemeBackground(config) {
  return config.systemType === "multi-theme" && (config.multiThemeType === "light-dark" || config.themeBackgroundStrategy === "per-theme");
}

function usesPerThemeBackground(config) {
  return config.systemType === "multi-theme" && config.multiThemeType === "multi-primary" && config.themeBackgroundStrategy === "per-theme";
}

function hasBackgroundInput(systemType, multiThemeType, themeBackgroundStrategy, themes = []) {
  if (systemType === "multi-theme" && multiThemeType === "light-dark") {
    return Boolean(elements.lightBackgroundColor.value.trim() || elements.darkBackgroundColor.value.trim());
  }

  if (systemType === "multi-theme" && multiThemeType === "multi-primary" && themeBackgroundStrategy === "per-theme") {
    return themes.some((theme) => theme.rawBackgroundColor.trim());
  }

  return Boolean(elements.backgroundColor.value.trim());
}

function readPrimaryColor() {
  if (isMultiPrimaryMode()) {
    return normalizeHex(themeColorValue(0), themeFallbackColor(0));
  }
  return normalizeHex(elements.primaryColor.value, previewFallbacks.primaryColor);
}

function usesPreviewFallback() {
  const systemType = document.querySelector("input[name='systemType']:checked").value;
  const multiThemeType = document.querySelector("input[name='multiThemeType']:checked")?.value || defaults.multiThemeType;
  const themeBackgroundStrategy = readRadioValue("themeBackgroundStrategy", defaults.themeBackgroundStrategy);
  const themes = readThemes(systemType, multiThemeType, themeBackgroundStrategy);
  const missingPrimary =
    systemType === "multi-theme" && multiThemeType === "multi-primary"
      ? themes.some((theme) => !theme.rawPrimaryColor.trim())
      : !elements.primaryColor.value.trim();
  const usesLightDarkBackground = systemType === "multi-theme" && multiThemeType === "light-dark";
  const backgroundModuleEnabled = hasBackgroundInput(systemType, multiThemeType, themeBackgroundStrategy, themes);
  const missingBackground =
    backgroundModuleEnabled &&
    (usesLightDarkBackground
      ? !elements.lightBackgroundColor.value.trim() || !elements.darkBackgroundColor.value.trim()
      : systemType === "multi-theme" && multiThemeType === "multi-primary" && themeBackgroundStrategy === "per-theme"
      ? themes.some((theme) => !theme.rawBackgroundColor.trim())
      : !elements.backgroundColor.value.trim());
  const missingOptionalModuleInput = missingBackground;
  return missingPrimary || missingOptionalModuleInput || !elements.blackColor.value.trim() || !elements.primaryFont.value.trim();
}

function readThemes(
  systemType = document.querySelector("input[name='systemType']:checked").value,
  multiThemeType = document.querySelector("input[name='multiThemeType']:checked")?.value || defaults.multiThemeType,
  themeBackgroundStrategy = readRadioValue("themeBackgroundStrategy", defaults.themeBackgroundStrategy),
) {
  if (systemType !== "multi-theme") return [];

  if (multiThemeType === "light-dark") {
    const primary = normalizeHex(elements.primaryColor.value, previewFallbacks.primaryColor);
    const darkBackground = normalizeHex(elements.darkBackgroundColor.value, previewFallbacks.darkBackgroundColor);
    const darkPrimary = elements.autoTuneDarkPrimary.checked
      ? adaptPrimaryForDark(primary, darkBackground)
      : primary;
    return [
      {
        name: rules.multiTheme.lightDark.lightName,
        mode: "light",
        primaryColor: primary,
        backgroundColor: normalizeHex(elements.lightBackgroundColor.value, previewFallbacks.lightBackgroundColor),
      },
      {
        name: rules.multiTheme.lightDark.darkName,
        mode: "dark",
        primaryColor: darkPrimary,
        backgroundColor: darkBackground,
      },
    ];
  }

  return Array.from({ length: themeState.count }, (_, index) => {
    const nameInput = themeInput(index, "name");
    const colorInput = themeInput(index, "color");
    const backgroundInput = themeInput(index, "background");
    const auxiliaryColors = Array.from({ length: themeState.auxCounts[index] || minThemeAuxCount }, (_, auxIndex) => {
      const input = themeAuxInput(index, auxIndex);
      return {
        name: `aux-${auxIndex + 1}`,
        rawValue: input?.value.trim() || "",
        value: normalizeHex(input?.value, auxIndex === 0 ? defaultThemeAuxColor : defaultThemeAuxColor),
      };
    }).filter((aux) => aux.rawValue);

    return {
      name: nameInput?.value.trim() || defaultThemeName(index),
      primaryColor: normalizeHex(colorInput?.value, themeFallbackColor(index)),
      rawPrimaryColor: colorInput?.value.trim() || "",
      backgroundColor: themeBackgroundStrategy === "per-theme" ? normalizeHex(backgroundInput?.value, previewFallbacks.themeBackgroundColor) : undefined,
      rawBackgroundColor: backgroundInput?.value.trim() || "",
      auxiliaryColors,
    };
  });
}

function buildSystem(config) {
  const brand = brandTokens(config);
  const neutral = neutralTokens(config);
  const semantic = semanticColors(config);
  const auxiliary =
    config.systemType === "multi-theme" && config.multiThemeType === "multi-primary"
      ? themeAuxiliaryColors(config)
      : auxiliaryColors(config.auxColor);
  const typeStyles = typography(config);
  const shadows = shadowStyles(config);
  const tokens = {};

  if (config.modules.brand) tokens.brand = brand;
  if (config.modules.background) tokens.background = backgroundColors(config);
  if (config.modules.surface) tokens.surface = surfaceColors(config);
  if (config.modules.border) tokens.border = borderColors(config);
  if (config.modules.neutral) tokens.neutral = neutral;
  if (config.modules.semantic) tokens.semantic = semantic;
  if (config.modules.auxiliary) tokens.auxiliary = auxiliary;
  if (config.modules.radius) tokens.radius = rules.radius.values.map((value) => ({ name: `Radius/${value}px`, value }));
  if (config.modules.spacing) tokens.spacing = rules.spacing.values.map((value) => ({ name: `Spacing/${value}px`, value }));
  if (config.modules.typography) tokens.typography = typeStyles;
  if (config.modules.shadow) tokens.shadow = shadows;

  return {
    meta: {
      version: rules.version,
      generatedAt: new Date().toISOString(),
      systemType: config.systemType,
      multiThemeType: config.systemType === "multi-theme" ? config.multiThemeType : undefined,
      figmaLink: config.figmaLink,
      secondaryFonts: config.secondaryFonts,
      status: config.usesPreviewFallback ? "incomplete-preview" : "ready",
    },
    inputs: config,
    tokens,
    themes: config.themes,
  };
}

function countTokens(groups, keys) {
  return keys.reduce((total, key) => total + (Array.isArray(groups[key]) ? groups[key].length : 0), 0);
}

function summaryFor(system) {
  const tokens = system.tokens;
  const modules = system.inputs.modules;
  return {
    colorVariables: countTokens(tokens, ["brand", "background", "surface", "border", "neutral", "semantic", "auxiliary"]),
    numberVariables: countTokens(tokens, ["radius", "spacing"]),
    textStyles: countTokens(tokens, ["typography"]),
    effectStyles: countTokens(tokens, ["shadow"]),
    pages: modules.visualTemplate ? 1 : 0,
  };
}

function swatchCard(token) {
  const background = token.value.startsWith("rgba") ? token.value : token.value;
  const displayColor = token.display || token.value;
  const border = token.outlined ? "box-shadow: inset 0 0 0 1px #d6dbe3;" : "";
  return `
    <article class="swatch-card">
      <div class="swatch">
        <div class="swatch-fill" style="background:${background}; ${border}"></div>
      </div>
      <div class="swatch-meta">
        <div class="swatch-name" title="${token.name}">${token.name}</div>
        <div class="swatch-value">${token.value}</div>
        ${token.opacity ? `<div class="swatch-value">base ${displayColor}</div>` : ""}
      </div>
    </article>
  `;
}

function renderSwatches(target, items) {
  target.innerHTML = items.map(swatchCard).join("");
}

function renderTypography(items) {
  const config = readConfig();
  const unit = config.typographyOutput === "variable" ? "个变量" : "个 Style";
  const previewText = "Whereas recognition of the inherent dignity 0123456789";
  elements.typeCount.textContent = `${items.length} ${unit}`;
  elements.typePreview.innerHTML = items
    .map((item) => {
      const fontStatus = fontAvailability(item.family);
      const missingFont = item.family && fontStatus.state === "missing";
      const loadingFont = item.family && fontStatus.state === "loading";
      return `
      <div class="type-row ${missingFont ? "is-font-missing" : ""} ${loadingFont ? "is-font-loading" : ""}">
        <div class="type-info">
          <div class="type-name">${escapeHtml(item.name)}</div>
          <div class="type-meta">${escapeHtml(item.family || "未填写")} / ${escapeHtml(item.weight)} · ${item.size}/${item.line}</div>
          ${loadingFont ? `<div class="type-warning">正在加载字体，稍后自动刷新</div>` : ""}
          ${missingFont ? `<div class="type-warning">当前设备未检测到该字体</div>` : ""}
        </div>
        <div class="type-sample" style="font-family:${cssFont(item.family)}; font-size:${item.size}px; line-height:${item.line}px; font-weight:${cssFontWeight(item.weight)}; letter-spacing:${item.spacing || 0}px;">${escapeHtml(previewText)}</div>
      </div>
    `;
    })
    .join("");
}

function cssFont(name) {
  const family = canonicalFontName(name);
  const fallback = fontFallbackFor(family);
  if (!family) return fallback;
  return `'${family.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}', ${fallback}`;
}

function fontFallbackFor(fontName) {
  const sans = getComputedStyle(document.documentElement).getPropertyValue("--sans") || "system-ui, sans-serif";
  return serifFontKeys.has(fontKey(fontName)) ? "Georgia, 'Times New Roman', serif" : sans;
}

function cssFontWeight(weight) {
  const normalized = String(weight || "").toLowerCase().replace(/\s+/g, "");
  return (
    {
      thin: 100,
      light: 300,
      regular: 400,
      normal: 400,
      medium: 500,
      semibold: 600,
      "semi-bold": 600,
      bold: 700,
      extrabold: 800,
      black: 900,
    }[normalized] || 400
  );
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => {
    return (
      {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[char] || char
    );
  });
}

function fontAvailability(fontName) {
  const family = String(fontName || "").trim();
  if (!family) return { state: "empty", available: false };
  if (/^(serif|sans-serif|monospace|system-ui|cursive|fantasy|ui-sans-serif|ui-serif|ui-monospace)$/i.test(family)) {
    return { state: "available", available: true };
  }

  const key = fontKey(family);
  const loadState = fontLoadState.get(key);
  if (loadState === "loaded") return { state: "available", available: true };
  if (loadState === "loading") return { state: "loading", available: false };
  if (loadState === "failed") return { state: "missing", available: false };

  const available = fontCanRender(family);
  if (available === null) return { state: "unknown", available: true };

  if (available) return { state: "available", available: true };

  if (tryLoadWebFont(family)) return { state: "loading", available: false };

  return { state: "missing", available: false };
}

function fontKey(fontName) {
  return String(fontName || "").trim().toLowerCase();
}

function canonicalFontName(fontName) {
  const family = String(fontName || "").trim();
  return fontAliases[fontKey(family)] || family;
}

function fontCanRender(fontName) {
  const family = canonicalFontName(fontName);
  const canvas = fontAvailability.canvas || document.createElement("canvas");
  fontAvailability.canvas = canvas;
  const context = typeof canvas.getContext === "function" ? canvas.getContext("2d") : null;
  if (!context || typeof context.measureText !== "function") return null;

  const sample = "mmmmmmmmmwwwwwiiiii11111AaBbCc";
  const size = "72px";
  const escapedFamily = family.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const baselines = ["monospace", "serif", "sans-serif"];
  return baselines.some((fallback) => {
    context.font = `${size} ${fallback}`;
    const baselineWidth = context.measureText(sample).width;
    context.font = `${size} "${escapedFamily}", ${fallback}`;
    return Math.abs(context.measureText(sample).width - baselineWidth) > 0.1;
  });
}

function tryLoadWebFont(fontName) {
  if (!document.head || !document.createElement) return false;
  const canonical = canonicalFontName(fontName);
  const key = fontKey(canonical);
  if (!fontAliases[key]) return false;
  if (fontLoadState.has(key)) return fontLoadState.get(key) === "loading";

  fontLoadState.set(key, "loading");
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(canonical).replace(/%20/g, "+")}:wght@400;500;600;700&display=swap`;
  link.onload = () => {
    waitForFont(canonical)
      .then(() => {
        fontLoadState.set(key, "loaded");
        render();
      })
      .catch(() => {
        fontLoadState.set(key, "failed");
        render();
      });
  };
  link.onerror = () => {
    fontLoadState.set(key, "failed");
    render();
  };
  document.head.appendChild(link);
  return true;
}

function waitForFont(fontName) {
  if (!document.fonts || typeof document.fonts.load !== "function") return Promise.resolve();
  const family = canonicalFontName(fontName).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return Promise.all([document.fonts.load(`400 20px "${family}"`), document.fonts.load(`600 20px "${family}"`)])
    .then(() => document.fonts.ready)
    .then(() => {
      if (fontCanRender(fontName) === false) throw new Error("Font did not render");
    });
}

function renderRadius(items) {
  elements.radiusPreview.innerHTML = items
    .map(
      (item) => `
      <span class="token-chip">
        <span class="radius-mark" style="border-radius:${Math.min(item.value, 22)}px"></span>
        ${item.name}
      </span>
    `,
    )
    .join("");
}

function renderSpacing(items) {
  elements.spacingPreview.innerHTML = items
    .map(
      (item) => `
      <span class="token-chip">
        <span class="spacing-mark" style="width:${Math.max(8, Math.min(item.value, 48))}px"></span>
        ${item.name}
      </span>
    `,
    )
    .join("");
}

function renderShadows(items) {
  elements.shadowPreview.innerHTML = items
    .map((item) => {
      const boxShadow = item.layers.map((layer) => `${layer.x}px ${layer.y}px ${layer.blur}px ${layer.spread}px ${layer.color}`).join(", ");
      return `
        <article class="shadow-card">
          <div class="shadow-sample" style="box-shadow:${boxShadow};">${item.name.replace("Shadow/", "")}</div>
        </article>
      `;
    })
    .join("");
}
