
function updateVisibility(config) {
  Object.entries(config.modules).forEach(([module, enabled]) => {
    document.querySelectorAll(`[data-preview="${module}"]`).forEach((section) => {
      section.classList.toggle("is-hidden", !enabled);
    });
  });
  const isMultiTheme = config.systemType === "multi-theme";
  elements.multiThemeSection.classList.toggle("is-hidden", !isMultiTheme);
  elements.lightDarkOptions.classList.toggle("is-hidden", !isMultiTheme || config.multiThemeType !== "light-dark");
  elements.multiPrimaryOptions.classList.toggle("is-hidden", !isMultiTheme || config.multiThemeType !== "multi-primary");
  elements.primaryColorField.classList.toggle("is-hidden", isMultiTheme && config.multiThemeType === "multi-primary");
  elements.globalAuxField.classList.toggle("is-hidden", isMultiTheme && config.multiThemeType === "multi-primary");
  elements.backgroundColorField.classList.toggle("is-hidden", usesThemeBackground(config));
  document.querySelectorAll(".theme-background-field").forEach((field) => {
    field.classList.toggle("is-hidden", !isMultiTheme || config.multiThemeType !== "multi-primary" || config.themeBackgroundStrategy !== "per-theme");
  });
}

function isFigmaLink(value) {
  return /^https:\/\/(www\.)?figma\.com\/(design|file)\//.test(value);
}

function renderSummary(config, system) {
  const summary = summaryFor(system);
  const issues = validateConfig(config);
  const figmaReady = isFigmaLink(config.figmaLink);
  const colorKindLabel = config.colorOutput === "style" ? "颜色 Style" : "颜色变量";
  const numberKindLabel = config.systemType === "lightweight" && config.colorOutput === "style" ? "数值规范" : "数值变量";

  elements.colorVariableCount.textContent = summary.colorVariables;
  elements.colorSummaryLabel.textContent = colorKindLabel;
  elements.numberVariableCount.textContent = summary.numberVariables;
  elements.numberSummaryLabel.textContent = numberKindLabel;
  elements.textStyleCount.textContent = summary.textStyles;
  elements.typeSummaryLabel.textContent = config.typographyOutput === "variable" ? "字体变量" : "字体样式";
  elements.effectStyleCount.textContent = summary.effectStyles;
  elements.pageCount.textContent = summary.pages;
  elements.summaryStatus.textContent = figmaReady ? "链接已填写" : "需要 Figma 链接";
  elements.summaryStatus.classList.toggle("is-warning", !figmaReady);
  elements.summaryStatus.classList.toggle("is-ready", figmaReady);
  elements.figmaLink.classList.toggle("is-empty", !figmaReady);
  elements.figmaLink.classList.toggle("is-filled", figmaReady);
  document.querySelectorAll("[data-color-kind]").forEach((label) => {
    label.textContent = colorKindLabel;
  });

  const enabledModules = Object.entries(config.modules)
    .filter(([, enabled]) => enabled)
    .map(([module]) => module);

  const rows = [
    `项目类型：${titleFor(config.systemType)}`,
    `基础信息：${fieldSummary(config)}`,
    `颜色输出：${config.colorOutput === "style" ? "Style" : "变量"}`,
    `字体输出：${config.typographyOutput === "variable" ? "变量" : "Style"} / ${config.typePreset === "full" ? "完整" : "精简"}`,
    themeSummary(config),
    isLightDarkMode(config) && config.neutralMode === "solid" ? "明暗模式：Semantic / Neutral Solid 分别生成 Light 与 Dark 两套" : "",
    isLightDarkMode(config) && config.neutralMode === "opacity" ? "明暗模式：Semantic 分 Light / Dark；Overlay Alpha 全局共享" : "",
    "阴影：固定 S/M/L 几何，颜色使用 Neutral Ambient",
    `生成模块：${enabledModules.join(", ")}`,
    config.modules.visualTemplate ? "可视化：创建 Design System 页面" : "可视化：不创建页面",
  ].filter(Boolean);

  if (issues.length) rows.push(`待确认：${issues.join("；")}`);

  elements.summaryList.innerHTML = rows.map((row) => `<div class="summary-item">${row}</div>`).join("");
}

function titleFor(type) {
  return {
    lightweight: "轻量产品型",
    standard: "标准产品型",
    "multi-theme": "多主题型",
  }[type];
}

function themeSummary(config) {
  if (config.systemType !== "multi-theme") return "";
  if (config.multiThemeType === "light-dark") {
    return `多主题：明暗主题，${config.autoTuneDarkPrimary ? "Dark 主色自动适配" : "Dark 主色不自动适配"}`;
  }
  const names = config.themes.map((theme) => theme.name).join(" / ");
  return `多主题：多主色主题，${names}，背景${config.themeBackgroundStrategy === "shared" ? "共用" : "按主题单独"}`;
}

function render() {
  syncThemeDraftsFromDom();
  syncSecondaryFontDraftsFromDom();
  const config = readConfig();
  const system = buildSystem(config);
  elements.previewTitle.textContent = titleFor(config.systemType);
  elements.neutralTitle.textContent = config.neutralMode === "solid" ? "Neutral Solid" : "Overlay Alpha";
  elements.neutralLabel.textContent = config.neutralMode === "solid" ? "实色灰阶" : "全局透明度";
  elements.shadowSource.textContent = "固定 3 个 / Neutral Ambient";
  const issues = validateConfig(config);
  system.meta.status = issues.length ? "needs-input" : "ready";
  elements.configStatus.textContent = issues.length ? "待确认" : "可导出";
  elements.configStatus.classList.toggle("is-warning", issues.length > 0);
  elements.configStatus.classList.toggle("is-ready", issues.length === 0);
  updateRequirementTags(config);
  updateFieldStates();
  updateFontStatuses(config);
  updateThemePreviews();
  renderSwatches(elements.brandSwatches, system.tokens.brand || []);
  renderSwatches(elements.backgroundSwatches, system.tokens.background || []);
  renderSwatches(elements.surfaceSwatches, system.tokens.surface || []);
  renderSwatches(elements.borderSwatches, system.tokens.border || []);
  renderSwatches(elements.neutralSwatches, system.tokens.neutral || []);
  renderSwatches(elements.semanticSwatches, system.tokens.semantic || []);
  renderSwatches(elements.auxSwatches, system.tokens.auxiliary || []);
  renderTypography(system.tokens.typography || []);
  renderRadius(system.tokens.radius || []);
  renderSpacing(system.tokens.spacing || []);
  renderShadows(system.tokens.shadow || []);
  renderSummary(config, system);
  updateVisibility(config);
  elements.jsonPreview.textContent = JSON.stringify(system, null, 2);
}

function updateRequirementTags(config) {
  setRequirementTag(elements.auxRequirementTag, false);
  setRequirementTag(elements.backgroundRequirementTag, false);
  const requiresLightDarkBackground = isLightDarkMode(config) && config.modules.background;
  setRequirementTag(elements.lightBackgroundRequirementTag, requiresLightDarkBackground);
  setRequirementTag(elements.darkBackgroundRequirementTag, requiresLightDarkBackground);
  document.querySelectorAll("[data-background-tag]").forEach((tag) => {
    setRequirementTag(tag, config.modules.background && usesPerThemeBackground(config));
  });
}

function setRequirementTag(tag, required) {
  if (!tag) return;
  tag.textContent = required ? "*" : "选填";
  tag.classList.toggle("optional-tag", !required);
  tag.classList.toggle("required-mark", required);
}

function updateFontStatuses(config) {
  setFontStatus(elements.primaryFontStatus, elements.primaryFont, config.primaryFont);
  config.secondaryFonts.forEach((font, index) => {
    const input = secondaryFontInput(index, "family");
    const status = document.querySelector(`[data-secondary-index="${index}"][data-secondary-status]`);
    setFontStatus(status, input, font.use === "none" ? "" : font.family);
  });
}

function setFontStatus(statusElement, input, fontName) {
  if (!statusElement || !input) return;
  const font = String(fontName || "").trim();
  const status = fontAvailability(font);
  statusElement.classList.toggle("is-good", status.state === "available");
  statusElement.classList.toggle("is-warning", status.state === "missing" || status.state === "loading");
  input.classList.toggle("is-invalid", status.state === "missing");

  if (!font || status.state === "empty") {
    statusElement.textContent = "";
    return;
  }

  if (status.state === "available") {
    statusElement.textContent = fontLoadState.get(fontKey(canonicalFontName(font))) === "loaded" ? "字体已加载，可预览" : "当前设备可用";
    return;
  }

  if (status.state === "loading") {
    statusElement.textContent = "正在加载字体，稍后自动刷新";
    return;
  }

  if (status.state === "missing") {
    statusElement.textContent = "当前设备未检测到该字体";
    return;
  }

  statusElement.textContent = "";
}

function validateConfig(config) {
  const issues = [];
  if (!isFigmaLink(config.figmaLink)) issues.push("需要 Figma 链接");
  const needsTopPrimary = config.systemType !== "multi-theme" || config.multiThemeType === "light-dark";
  if (needsTopPrimary && !elements.primaryColor.value.trim()) issues.push("需要主色");
  if (needsTopPrimary && elements.primaryColor.value.trim() && !hasValidHex(elements.primaryColor.value)) issues.push("主色格式不正确");
  if (!elements.blackColor.value.trim()) issues.push("需要黑色");
  if (elements.blackColor.value.trim() && !hasValidHex(elements.blackColor.value)) issues.push("黑色格式不正确");
  if (elements.blackColor.value.trim() && config.blackColor === rules.validation.forbiddenBlack) issues.push("黑色不能使用 #000000");
  if (!config.primaryFont) issues.push("需要主字体");
  if (config.primaryFont && fontAvailability(config.primaryFont).state === "missing") issues.push("当前设备未检测到主字体");
  config.secondaryFonts.forEach((font, index) => {
    if (font.use !== "none" && !font.family) issues.push(`需要副字体 ${index + 1} 名称`);
    if (font.use !== "none" && font.family && fontAvailability(font.family).state === "missing") {
      issues.push(`当前设备未检测到副字体 ${index + 1}`);
    }
  });
  const usesThemeAuxiliary = config.systemType === "multi-theme" && config.multiThemeType === "multi-primary";
  if (!usesThemeAuxiliary && elements.auxColor.value.trim() && !hasValidHex(elements.auxColor.value)) issues.push("辅助色格式不正确");
  if (!usesThemeBackground(config) && elements.backgroundColor.value.trim() && !hasValidHex(elements.backgroundColor.value)) issues.push("背景色格式不正确");
  if (config.modules.background) validateBackgroundModule(config, issues);
  if (config.systemType === "multi-theme") validateMultiTheme(config, issues);
  return issues;
}

function validateBackgroundModule(config, issues) {
  if (config.systemType === "multi-theme" && config.multiThemeType === "light-dark") {
    if (!elements.lightBackgroundColor.value.trim()) issues.push("需要浅色背景");
    if (!elements.darkBackgroundColor.value.trim()) issues.push("需要深色背景");
    return;
  }

  if (config.systemType === "multi-theme" && config.multiThemeType === "multi-primary" && config.themeBackgroundStrategy === "per-theme") {
    config.themes.forEach((theme, index) => {
      if (!theme.rawBackgroundColor.trim()) issues.push(`需要主题 ${index + 1} 背景色`);
    });
    return;
  }

  if (!elements.backgroundColor.value.trim()) issues.push("需要背景色");
}

function validateMultiTheme(config, issues) {
  if (config.multiThemeType === "light-dark") {
    if (elements.lightBackgroundColor.value.trim() && !hasValidHex(elements.lightBackgroundColor.value)) issues.push("浅色背景格式不正确");
    if (elements.darkBackgroundColor.value.trim() && !hasValidHex(elements.darkBackgroundColor.value)) issues.push("深色背景格式不正确");
    return;
  }

  config.themes.forEach((theme, index) => {
    if (!theme.rawPrimaryColor.trim()) issues.push(`需要主题 ${index + 1} 主色`);
    if (theme.rawPrimaryColor.trim() && !hasValidHex(theme.rawPrimaryColor)) issues.push(`主题 ${index + 1} 主色格式不正确`);
    if (config.themeBackgroundStrategy === "per-theme" && theme.rawBackgroundColor.trim() && !hasValidHex(theme.rawBackgroundColor)) {
      issues.push(`主题 ${index + 1} 背景色格式不正确`);
    }
    theme.auxiliaryColors.forEach((aux, auxIndex) => {
      if (aux.rawValue.trim() && !hasValidHex(aux.rawValue)) issues.push(`主题 ${index + 1} 辅助色 ${auxIndex + 1} 格式不正确`);
    });
  });
}

function fieldSummary(config) {
  const isMultiPrimary = config.systemType === "multi-theme" && config.multiThemeType === "multi-primary";
  const primary = isMultiPrimary
    ? `主题主色 ${config.themes.filter((theme) => theme.rawPrimaryColor).length}/${config.themes.length}`
    : elements.primaryColor.value.trim()
      ? config.primaryColor
      : "主色未填";
  const black = elements.blackColor.value.trim() ? config.blackColor : "黑色未填";
  const font = config.primaryFont || "主字体未填";
  return `${primary} / ${black} / ${font}`;
}

function updateFieldStates() {
  [
    "figmaLink",
    "primaryColor",
    "blackColor",
    "primaryFont",
    "auxColor",
    "backgroundColor",
    "lightBackgroundColor",
    "darkBackgroundColor",
  ].forEach((id) => {
    const input = elements[id];
    if (!input) return;
    const filled = Boolean(input.value.trim());
    input.classList.toggle("is-empty", !filled);
    input.classList.toggle("is-filled", filled);
  });

  document.querySelectorAll("[data-theme-field]").forEach((input) => {
    const filled = Boolean(input.value.trim());
    input.classList.toggle("is-empty", !filled);
    input.classList.toggle("is-filled", filled);
  });

  document.querySelectorAll("[data-secondary-field]").forEach((input) => {
    if (!("value" in input)) return;
    const filled = Boolean(input.value.trim());
    input.classList.toggle("is-empty", !filled);
    input.classList.toggle("is-filled", filled);
  });
}

function updateThemePreviews() {
  document.querySelectorAll(".color-input-row").forEach((row) => {
    const input = row.querySelector("input");
    const preview = row.querySelector(".theme-color-preview");
    if (!input || !preview) return;
    const index = Number(input.dataset.themeIndex || 0);
    const fallback = input.dataset.themeField === "color" ? themeFallbackColor(index) : defaultThemeAuxColor;
    const color = normalizeHex(input.value, fallback);
    preview.style.background = input.value.trim() && hasValidHex(input.value) ? color : "#f1f4f8";
    preview.style.borderColor = input.value.trim() && hasValidHex(input.value) ? color : "#d6dbe3";
  });
}

function downloadJson() {
  const config = readConfig();
  const issues = validateConfig(config);
  if (issues.length) {
    window.alert(`请先补齐：${issues.join("、")}`);
    return;
  }
  const system = buildSystem(config);
  const blob = new Blob([JSON.stringify(system, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "design-system-config.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

function reset() {
  document.querySelector(`input[name="systemType"][value="${defaults.systemType}"]`).checked = true;
  document.querySelector(`input[name="multiThemeType"][value="${defaults.multiThemeType}"]`).checked = true;
  ["neutralMode", "colorOutput", "themeBackgroundStrategy", "typographyOutput", "typePreset"].forEach((name) => {
    const radio = document.querySelector(`input[name="${name}"][value="${defaults[name]}"]`);
    if (radio) radio.checked = true;
  });
  Object.entries(defaults).forEach(([key, value]) => {
    if (key === "modules" || key === "systemType") return;
    if (!elements[key]) return;
    if (elements[key].type === "checkbox") {
      elements[key].checked = value;
    } else {
      elements[key].value = value;
    }
  });
  document.querySelectorAll("[data-module]").forEach((checkbox) => {
    checkbox.checked = defaults.modules[checkbox.dataset.module];
  });
  themeState.count = minThemeCount;
  themeState.auxCounts = Array.from({ length: minThemeCount }, () => minThemeAuxCount);
  themeState.drafts = Array.from({ length: minThemeCount }, () => ({ name: "", color: "", background: "", aux: [""] }));
  secondaryFontState.count = minSecondaryFontCount;
  secondaryFontState.drafts = [{ family: "", use: defaults.secondaryUse }];
  renderThemeCards();
  renderSecondaryFonts();
  applySystemTypeDefaults(defaults.systemType);
  render();
}

function bindEvents() {
  document.querySelectorAll("input, select").forEach((input) => {
    input.addEventListener("input", () => {
      if (input.type === "radio" || input.type === "checkbox" || input.tagName === "SELECT") return;
      render();
    });
    input.addEventListener("change", () => {
      if (input.name === "systemType" && input.checked) applySystemTypeDefaults(input.value);
      if (input.dataset.module === "background" && !input.checked) clearBackgroundInputs();
      if (input.dataset.module === "auxiliary" && !input.checked) clearAuxiliaryInputs();
      render();
    });
  });
  elements.themeCardList.addEventListener("input", render);
  elements.themeCardList.addEventListener("change", render);
  elements.themeCardList.addEventListener("click", handleThemeListClick);
  elements.secondaryFontList.addEventListener("input", render);
  elements.secondaryFontList.addEventListener("change", render);
  elements.removeSecondaryFont.addEventListener("click", () => handleSecondaryFontAction("remove"));
  elements.addSecondaryFont.addEventListener("click", () => handleSecondaryFontAction("add"));
  elements.exportButton.addEventListener("click", downloadJson);
  elements.resetButton.addEventListener("click", reset);
}

function clearBackgroundInputs() {
  elements.backgroundColor.value = "";
  elements.lightBackgroundColor.value = "";
  elements.darkBackgroundColor.value = "";
  themeState.drafts = themeState.drafts.map((draft) => ({ ...draft, background: "" }));
  renderThemeCards();
}

function clearAuxiliaryInputs() {
  elements.auxColor.value = "";
  themeState.auxCounts = Array.from({ length: themeState.count }, () => minThemeAuxCount);
  themeState.drafts = themeState.drafts.map((draft) => ({ ...draft, aux: [""] }));
  renderThemeCards();
}

queryElements();
renderThemeCards();
renderSecondaryFonts();
bindEvents();
applySystemTypeDefaults(readRadioValue("systemType", defaults.systemType));
render();
