
function renderThemeCards() {
  normalizeThemeState();
  elements.themeCardList.innerHTML = Array.from({ length: themeState.count }, (_, index) => themeCardMarkup(index)).join("");
}

function renderSecondaryFonts() {
  normalizeSecondaryFontState();
  const isLightweight = readRadioValue("systemType", defaults.systemType) === "lightweight";
  if (isLightweight && secondaryFontState.count > minSecondaryFontCount) {
    secondaryFontState.count = minSecondaryFontCount;
    secondaryFontState.drafts = [secondaryFontState.drafts[0] || { family: "", use: defaults.secondaryUse }];
    normalizeSecondaryFontState();
  }
  elements.secondaryFontList.innerHTML = Array.from({ length: secondaryFontState.count }, (_, index) => secondaryFontMarkup(index)).join("");
  elements.removeSecondaryFont.classList.toggle("is-hidden", isLightweight);
  elements.addSecondaryFont.classList.toggle("is-hidden", isLightweight);
  elements.removeSecondaryFont.disabled = secondaryFontState.count <= minSecondaryFontCount;
  elements.addSecondaryFont.disabled = isLightweight || secondaryFontState.count >= maxSecondaryFontCount;
}

function secondaryFontMarkup(index) {
  const draft = secondaryFontState.drafts[index] || {};
  return `
    <div class="secondary-font-card" data-secondary-card="${index}">
      <label class="field">
        <span class="field-label">副字体 ${index + 1} <small class="optional-tag">选填</small></span>
        <input data-secondary-index="${index}" data-secondary-field="family" type="text" placeholder="例如 Lora" value="${escapeHtml(
          draft.family || "",
        )}" />
        <small data-secondary-index="${index}" data-secondary-status class="field-hint" aria-live="polite"></small>
      </label>
      <label class="field">
        <span class="field-label">副字体 ${index + 1} 用途 <small class="optional-tag">选填</small></span>
        <select data-secondary-index="${index}" data-secondary-field="use">
          ${secondaryUseOptions(draft.use || defaults.secondaryUse)}
        </select>
      </label>
    </div>
  `;
}

function secondaryUseOptions(selected) {
  return [
    ["none", "不使用副字体"],
    ["headline-accent", "标题强调词"],
    ["headline-display", "整段展示标题"],
    ["number", "数字 / 金额"],
    ["brand", "品牌展示"],
  ]
    .map(([value, label]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`)
    .join("");
}

function normalizeSecondaryFontState() {
  secondaryFontState.count = clamp(secondaryFontState.count, minSecondaryFontCount, maxSecondaryFontCount);
  secondaryFontState.drafts = Array.from({ length: secondaryFontState.count }, (_, index) => {
    const draft = secondaryFontState.drafts[index] || {};
    return {
      family: draft.family || "",
      use: draft.use || defaults.secondaryUse,
    };
  });
}

function syncSecondaryFontDraftsFromDom() {
  normalizeSecondaryFontState();
  secondaryFontState.drafts = Array.from({ length: secondaryFontState.count }, (_, index) => ({
    family: secondaryFontInput(index, "family")?.value || "",
    use: secondaryFontInput(index, "use")?.value || defaults.secondaryUse,
  }));
}

function handleSecondaryFontAction(action) {
  syncSecondaryFontDraftsFromDom();
  const isLightweight = readRadioValue("systemType", defaults.systemType) === "lightweight";
  if (isLightweight && action === "add") return;
  if (action === "add") {
    secondaryFontState.count = clamp(secondaryFontState.count + 1, minSecondaryFontCount, maxSecondaryFontCount);
    secondaryFontState.drafts.push({ family: "", use: defaults.secondaryUse });
  }
  if (action === "remove") {
    secondaryFontState.count = clamp(secondaryFontState.count - 1, minSecondaryFontCount, maxSecondaryFontCount);
    secondaryFontState.drafts.pop();
  }
  renderSecondaryFonts();
  render();
}

function themeCardMarkup(index) {
  const isRequired = index < minThemeCount;
  const draft = themeState.drafts[index] || {};
  const rawPrimary = draft.color || "";
  const previewColor = rawPrimary && hasValidHex(rawPrimary) ? normalizeHex(rawPrimary, themeFallbackColor(index)) : "#f1f4f8";
  const stripeColor = rawPrimary && hasValidHex(rawPrimary) ? previewColor : themeFallbackColor(index);
  const canDeleteTheme = themeState.count > minThemeCount && index >= minThemeCount;
  const showAddTheme = index === themeState.count - 1;
  const addThemeDisabled = themeState.count >= maxThemeCount;
  const backgroundVisible =
    isMultiPrimaryMode() && readRadioValue("themeBackgroundStrategy", defaults.themeBackgroundStrategy) === "per-theme";
  return `
    <article class="theme-card" data-theme-card="${index}" style="--theme-accent:${stripeColor};">
      <div class="theme-card-header">
        <div class="theme-card-title">
          <span class="theme-index">${index + 1}</span>
          <div>
            <strong>Theme ${index + 1}</strong>
            <span>${isRequired ? "必填主色" : "补充主色"}</span>
          </div>
        </div>
        <div class="theme-card-actions theme-actions">
          ${
            canDeleteTheme
              ? `<button class="text-action danger" type="button" data-theme-action="remove" data-theme-index="${index}" aria-label="删除主题" title="删除主题">删除主题</button>`
              : ""
          }
          ${
            showAddTheme
              ? `<button class="text-action primary" type="button" data-theme-action="add" aria-label="添加主题" title="添加主题" ${
                  addThemeDisabled ? "disabled" : ""
                }>${addThemeDisabled ? `最多 ${maxThemeCount} 个` : "添加主题"}</button>`
              : ""
          }
        </div>
      </div>
      <label class="field">
        <span class="field-label">名称 <small class="optional-tag">选填</small></span>
        <input data-theme-index="${index}" data-theme-field="name" type="text" placeholder="${escapeHtml(defaultThemeName(index))}" value="${escapeHtml(
          draft.name || "",
        )}" />
      </label>
      <label class="field">
        <span class="field-label">主色 <b class="required-mark">*</b></span>
        <div class="color-input-row">
          <input data-theme-index="${index}" data-theme-field="color" type="text" placeholder="${themeFallbackColor(index)}" value="${escapeHtml(
            rawPrimary,
          )}" spellcheck="false" />
          <span class="theme-color-preview" style="background:${previewColor}; border-color:${
            rawPrimary && hasValidHex(rawPrimary) ? previewColor : "#d6dbe3"
          }"></span>
        </div>
      </label>
      <label class="field theme-background-field ${backgroundVisible ? "" : "is-hidden"}">
        <span class="field-label">背景色 <small class="optional-tag" data-background-tag="${index}">选填</small></span>
        <input data-theme-index="${index}" data-theme-field="background" type="text" placeholder="#F7F8FA" value="${escapeHtml(
          draft.background || "",
        )}" spellcheck="false" />
      </label>
      <div class="theme-aux-block">
        <div class="mini-section-header">
          <span>辅助色信息</span>
          <div class="theme-card-actions aux-actions">
            <button class="icon-button aux-button" type="button" data-aux-action="remove" data-theme-index="${index}" aria-label="删除辅助色" title="删除辅助色" ${
              (themeState.auxCounts[index] || minThemeAuxCount) <= minThemeAuxCount ? "disabled" : ""
            }>−</button>
            <button class="icon-button aux-button" type="button" data-aux-action="add" data-theme-index="${index}" aria-label="添加辅助色" title="添加辅助色" ${
              (themeState.auxCounts[index] || minThemeAuxCount) >= maxThemeAuxCount ? "disabled" : ""
            }>+</button>
          </div>
        </div>
        <div class="theme-aux-list">
          ${Array.from({ length: themeState.auxCounts[index] || minThemeAuxCount }, (_, auxIndex) => themeAuxMarkup(index, auxIndex)).join("")}
        </div>
      </div>
    </article>
  `;
}

function themeAuxMarkup(themeIndex, auxIndex) {
  const value = themeState.drafts[themeIndex]?.aux?.[auxIndex] || "";
  const previewColor = value && hasValidHex(value) ? normalizeHex(value, defaultThemeAuxColor) : "#f1f4f8";
  return `
    <label class="field aux-field">
      <span class="field-label">辅助色 ${auxIndex + 1} <small class="optional-tag">选填</small></span>
      <div class="color-input-row">
        <input data-theme-index="${themeIndex}" data-aux-index="${auxIndex}" data-theme-field="aux" type="text" placeholder="${defaultThemeAuxColor}" value="${escapeHtml(
          value,
        )}" spellcheck="false" />
        <span class="theme-color-preview" style="background:${previewColor}; border-color:${value && hasValidHex(value) ? previewColor : "#d6dbe3"}"></span>
      </div>
    </label>
  `;
}

function normalizeThemeState() {
  themeState.count = clamp(themeState.count, minThemeCount, maxThemeCount);
  themeState.auxCounts = Array.from({ length: themeState.count }, (_, index) =>
    clamp(themeState.auxCounts[index] || minThemeAuxCount, minThemeAuxCount, maxThemeAuxCount),
  );
  themeState.drafts = Array.from({ length: themeState.count }, (_, index) => {
    const draft = themeState.drafts[index] || {};
    const auxCount = themeState.auxCounts[index];
    return {
      name: draft.name || "",
      color: draft.color || "",
      background: draft.background || "",
      aux: Array.from({ length: auxCount }, (_, auxIndex) => draft.aux?.[auxIndex] || ""),
    };
  });
}

function syncThemeDraftsFromDom() {
  normalizeThemeState();
  themeState.drafts = Array.from({ length: themeState.count }, (_, index) => ({
    name: themeInput(index, "name")?.value || "",
    color: themeInput(index, "color")?.value || "",
    background: themeInput(index, "background")?.value || "",
    aux: Array.from({ length: themeState.auxCounts[index] || minThemeAuxCount }, (_, auxIndex) => themeAuxInput(index, auxIndex)?.value || ""),
  }));
}

function handleThemeListClick(event) {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  syncThemeDraftsFromDom();

  if (button.dataset.themeAction === "add") {
    themeState.count = clamp(themeState.count + 1, minThemeCount, maxThemeCount);
    themeState.auxCounts.push(minThemeAuxCount);
    themeState.drafts.push({ name: "", color: "", background: "", aux: [""] });
    renderThemeCards();
    render();
    return;
  }

  if (button.dataset.themeAction === "remove") {
    const index = Number(button.dataset.themeIndex);
    if (themeState.count <= minThemeCount || Number.isNaN(index)) return;
    themeState.count -= 1;
    themeState.auxCounts.splice(index, 1);
    themeState.drafts.splice(index, 1);
    renderThemeCards();
    render();
    return;
  }

  if (button.dataset.auxAction === "add") {
    const index = Number(button.dataset.themeIndex);
    if (Number.isNaN(index)) return;
    themeState.auxCounts[index] = clamp((themeState.auxCounts[index] || minThemeAuxCount) + 1, minThemeAuxCount, maxThemeAuxCount);
    themeState.drafts[index].aux.push("");
    renderThemeCards();
    render();
    return;
  }

  if (button.dataset.auxAction === "remove") {
    const index = Number(button.dataset.themeIndex);
    if (Number.isNaN(index) || (themeState.auxCounts[index] || minThemeAuxCount) <= minThemeAuxCount) return;
    themeState.auxCounts[index] -= 1;
    themeState.drafts[index].aux.pop();
    renderThemeCards();
    render();
  }
}
