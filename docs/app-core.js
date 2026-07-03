const rules = window.DESIGN_SYSTEM_RULES;
const defaults = rules.defaults;
const elements = {};
const previewFallbacks = rules.previewFallbacks;
const minThemeCount = rules.multiTheme.multiPrimary.minimumThemeCount || 2;
const maxThemeCount = rules.multiTheme.multiPrimary.maximumThemeCount || 5;
const minThemeAuxCount = 1;
const maxThemeAuxCount = rules.multiTheme.multiPrimary.maximumAuxiliaryCount || 5;
const minSecondaryFontCount = 1;
const maxSecondaryFontCount = rules.typography.maximumSecondaryFonts || 2;
const defaultThemeAuxColor = "#F7B0C6";
const themeState = {
  count: 2,
  auxCounts: [1, 1],
  drafts: [
    { name: "", color: "", background: "", aux: [""] },
    { name: "", color: "", background: "", aux: [""] },
  ],
};
const secondaryFontState = {
  count: 1,
  drafts: [{ family: "", use: "none" }],
};
const fontLoadState = new Map();
const fontAliases = {
  "dm sans": "DM Sans",
  inter: "Inter",
  lora: "Lora",
  manrope: "Manrope",
  merriweather: "Merriweather",
  montserrat: "Montserrat",
  "noto sans": "Noto Sans",
  "noto sans sc": "Noto Sans SC",
  "noto serif": "Noto Serif",
  "noto serif sc": "Noto Serif SC",
  nunito: "Nunito",
  "open sans": "Open Sans",
  outfit: "Outfit",
  "playfair display": "Playfair Display",
  poppins: "Poppins",
  "pt sans": "PT Sans",
  "pt serif": "PT Serif",
  raleway: "Raleway",
  roboto: "Roboto",
  "source sans 3": "Source Sans 3",
  "source serif 4": "Source Serif 4",
  urbanist: "Urbanist",
  "work sans": "Work Sans",
};
const serifFontKeys = new Set(["lora", "merriweather", "noto serif", "noto serif sc", "playfair display", "pt serif", "source serif 4"]);

function queryElements() {
  [
    "figmaLink",
    "primaryColorField",
    "primaryColor",
    "blackColor",
    "backgroundColorField",
    "backgroundRequirementTag",
    "backgroundColor",
    "auxColor",
    "auxRequirementTag",
    "semanticSet",
    "multiThemeSection",
    "lightDarkOptions",
    "multiPrimaryOptions",
    "themeCardList",
    "lightBackgroundColor",
    "lightBackgroundRequirementTag",
    "darkBackgroundColor",
    "darkBackgroundRequirementTag",
    "autoTuneDarkPrimary",
    "globalAuxField",
    "primaryFont",
    "primaryFontStatus",
    "secondaryFontList",
    "removeSecondaryFont",
    "addSecondaryFont",
    "brandSwatches",
    "backgroundSwatches",
    "surfaceSwatches",
    "borderSwatches",
    "neutralSwatches",
    "semanticSwatches",
    "auxSwatches",
    "typePreview",
    "radiusPreview",
    "spacingPreview",
    "shadowPreview",
    "jsonPreview",
    "previewTitle",
    "configStatus",
    "neutralTitle",
    "neutralLabel",
    "typeCount",
    "shadowSource",
    "summaryStatus",
    "colorVariableCount",
    "colorSummaryLabel",
    "numberVariableCount",
    "numberSummaryLabel",
    "textStyleCount",
    "typeSummaryLabel",
    "effectStyleCount",
    "pageCount",
    "summaryList",
    "exportButton",
    "resetButton",
  ].forEach((id) => {
    elements[id] = document.getElementById(id);
  });
}

function normalizeHex(value, fallback) {
  const raw = String(value || "").trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw.split("").map((c) => c + c).join("").toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return `#${raw.toUpperCase()}`;
  }
  return fallback;
}

function hasValidHex(value) {
  const raw = String(value || "").trim().replace(/^#/, "");
  return /^[0-9a-fA-F]{3}$/.test(raw) || /^[0-9a-fA-F]{6}$/.test(raw);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function themeInput(index, key) {
  return document.querySelector(`[data-theme-index="${index}"][data-theme-field="${key}"]`);
}

function themeAuxInput(themeIndex, auxIndex) {
  return document.querySelector(`[data-theme-index="${themeIndex}"][data-aux-index="${auxIndex}"][data-theme-field="aux"]`);
}

function themeColorValue(index) {
  return themeInput(index, "color")?.value.trim() || "";
}

function defaultThemeName(index) {
  return rules.multiTheme.multiPrimary.defaultNames[index] || `Theme ${index + 1}`;
}

function themeFallbackColor(index) {
  return previewFallbacks.themeColors?.[index] || previewFallbacks.primaryColor;
}

function hexToRgb(hex) {
  const clean = normalizeHex(hex, "#000000").slice(1);
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b]
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

function rgbToHsl({ r, g, b }) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return { h: 0, s: 0, l: lightness };

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue;
  if (max === red) hue = ((green - blue) / delta) % 6;
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;
  hue *= 60;
  if (hue < 0) hue += 360;
  return { h: hue, s: saturation, l: lightness };
}

function hslToHex({ h, s, l }) {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - chroma / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [chroma, x, 0];
  else if (h < 120) [r, g, b] = [x, chroma, 0];
  else if (h < 180) [r, g, b] = [0, chroma, x];
  else if (h < 240) [r, g, b] = [0, x, chroma];
  else if (h < 300) [r, g, b] = [x, 0, chroma];
  else [r, g, b] = [chroma, 0, x];
  return rgbToHex({ r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 });
}

function hexToHsl(hex) {
  return rgbToHsl(hexToRgb(hex));
}

function mix(hexA, hexB, amount) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex({
    r: a.r + (b.r - a.r) * amount,
    g: a.g + (b.g - a.g) * amount,
    b: a.b + (b.b - a.b) * amount,
  });
}

function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const linear = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(hexA, hexB) {
  const lighter = Math.max(luminance(hexA), luminance(hexB));
  const darker = Math.min(luminance(hexA), luminance(hexB));
  return (lighter + 0.05) / (darker + 0.05);
}

function adaptPrimaryForDark(primary, background) {
  const toneRule = rules.multiTheme.lightDark.darkPrimaryTone;
  const primaryHsl = hexToHsl(primary);
  const backgroundHsl = hexToHsl(background);
  const backgroundPush = clamp((0.18 - backgroundHsl.l) * (toneRule.backgroundInfluence || 0), 0, 0.08);
  const targetLightness = clamp(Math.max(primaryHsl.l, toneRule.minLightness + backgroundPush), toneRule.minLightness, toneRule.maxLightness);
  const targetSaturation = Math.min(primaryHsl.s, toneRule.maxSaturation);
  let tuned = hslToHex({ h: primaryHsl.h, s: targetSaturation, l: targetLightness });

  while (contrastRatio(tuned, background) < toneRule.minContrast && hexToHsl(tuned).l < toneRule.maxLightness) {
    const nextTone = hexToHsl(tuned);
    tuned = hslToHex({ h: nextTone.h, s: nextTone.s, l: Math.min(toneRule.maxLightness, nextTone.l + 0.02) });
  }

  return tuned;
}

function brandScale(primary, prefix = "Brand") {
  return rules.color.brand.map((token) => ({
    name: token.name.replace("Brand", prefix),
    value: token.source ? primary : mix(primary, colorRef(token.mixWith), token.amount),
  }));
}

function brandTone(primary, toneName) {
  const scale = brandScale(primary);
  const token = scale.find((item) => item.name.endsWith(`/${toneName}`));
  return token?.value || primary;
}

function brandTokens(config) {
  if (config.systemType === "multi-theme" && config.multiThemeType === "multi-primary") {
    return config.themes.flatMap((theme) => brandScale(theme.primaryColor, `Brand/${theme.name}`));
  }

  return brandScale(config.primaryColor);
}

function solidNeutralScale(base) {
  const { levels, lightnessMix } = rules.neutral.solid;
  return levels.map((level, index) => ({
    name: `Neutral/${level}`,
    value: index === 0 ? base : index === levels.length - 1 ? rules.color.white : mix(base, rules.color.white, lightnessMix[index]),
  }));
}

function opacityNeutrals(base, systemType = defaults.systemType) {
  const opacity = rules.neutral.opacity;
  const greySteps = systemType === "lightweight" ? opacity.lightweightBlackSteps : opacity.overlaySteps;
  const whiteSteps = systemType === "lightweight" ? opacity.lightweightWhiteSteps : opacity.overlaySteps;
  return [
    ...greySteps.map((step) => ({
      name: `Overlay/Black/${step}%`,
      value: step === 100 ? base : rgbaString(base, step / 100),
      display: base,
      opacity: step / 100,
    })),
    ...whiteSteps.map((step) => ({
      name: `Overlay/White/${step}%`,
      value: step === 100 ? rules.color.white : rgbaString(rules.color.white, step / 100),
      display: rules.color.white,
      opacity: step / 100,
      outlined: true,
    })),
  ];
}

function prefixTokens(items, prefix) {
  return items.map((item) => ({
    ...item,
    name: `${prefix}/${item.name}`,
  }));
}

function neutralTokens(config) {
  if (isLightDarkMode(config) && config.neutralMode === "solid") {
    const lightNeutral = solidNeutralScale(config.blackColor);
    const darkBase = shadowAmbientColor(config, "dark");
    const darkNeutral = solidNeutralScale(darkBase);
    return [...prefixTokens(lightNeutral, "Light"), ...prefixTokens(darkNeutral, "Dark")];
  }

  return config.neutralMode === "solid" ? solidNeutralScale(config.blackColor) : opacityNeutrals(config.blackColor, config.systemType);
}

function backgroundColors(config) {
  if (usesThemeBackground(config) && config.themes.length) {
    return config.themes.map((theme) => ({
      name: `Background/${theme.name}`,
      value: theme.backgroundColor || config.backgroundColor,
    }));
  }

  return rules.color.background.map((token) => ({ name: token.name, value: config.backgroundColor }));
}

function surfaceColors(config) {
  return rules.color.surface.map((token) => ({
    name: token.name,
    value: mix(config[token.from], colorRef(token.mixWith, config), token.amount),
  }));
}

function borderColors(config) {
  return rules.color.border.map((token) => ({
    name: token.name,
    value: token.opacity === 0 ? "rgba(0, 0, 0, 0)" : rgbaString(config.blackColor, token.opacity),
    display: config.blackColor,
    opacity: token.opacity || undefined,
  }));
}

function colorRef(name, config = {}) {
  if (name === "white") return rules.color.white;
  if (name === "darkAnchor") return rules.color.darkAnchor;
  return config[name] || name;
}

function shadowAmbientColor(config, mode = "light") {
  const ambient = rules.shadow.ambient?.[mode] || rules.shadow.ambient?.light;
  const source = colorRef(ambient.from, config);
  return mix(source, colorRef(ambient.mixWith, config), ambient.amount);
}

function rgbaString(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Number(alpha.toFixed(2))})`;
}

function toneSourceColors(config) {
  if (config.systemType === "multi-theme" && config.multiThemeType === "multi-primary" && config.themes.length) {
    return config.themes.map((theme) => theme.primaryColor);
  }

  return [config.primaryColor];
}

function isLightDarkMode(config) {
  return config.systemType === "multi-theme" && config.multiThemeType === "light-dark";
}

function averageTone(colors) {
  const hslColors = colors.map(hexToHsl);
  return hslColors.reduce(
    (total, color, index, list) => ({
      s: total.s + color.s / list.length,
      l: total.l + color.l / list.length,
    }),
    { s: 0, l: 0 },
  );
}

function tuneSemanticColor(base, themeTone, semanticRule) {
  const semantic = rules.color.semantic;
  const baseTone = hexToHsl(base);
  const guard = semanticRule.toneGuard || {};
  const saturation = clamp(
    baseTone.s + (themeTone.s - baseTone.s) * semantic.toneFollow.saturation,
    guard.minSaturation ?? 0,
    guard.maxSaturation ?? 1,
  );
  const lightness = clamp(
    baseTone.l + (themeTone.l - baseTone.l) * semantic.toneFollow.lightness,
    guard.minLightness ?? 0,
    guard.maxLightness ?? 1,
  );
  return hslToHex({ h: baseTone.h, s: saturation, l: lightness });
}

function semanticColors(config) {
  const mode = config.semanticSet;
  if (mode === "none") return [];
  if (isLightDarkMode(config)) {
    const lightTheme = config.themes.find((theme) => theme.mode === "light");
    const darkTheme = config.themes.find((theme) => theme.mode === "dark");
    return [
      ...prefixTokens(semanticColorsForTone(mode, averageTone([lightTheme?.primaryColor || config.primaryColor])), "Light"),
      ...prefixTokens(semanticColorsForTone(mode, averageTone([darkTheme?.primaryColor || config.primaryColor])), "Dark"),
    ];
  }

  return semanticColorsForTone(mode, averageTone(toneSourceColors(config)));
}

function semanticColorsForTone(mode, themeTone) {
  const semantic = rules.color.semantic;
  const filtered = semantic.baseColors.filter((item) => item.groups.includes(mode));
  return filtered.flatMap(({ name, value: base }) => {
    const semanticRule = filtered.find((item) => item.name === name) || {};
    const tuned = tuneSemanticColor(base, themeTone, semanticRule);
    return [
      { name, value: tuned },
      { name: `${name}-10%`, value: rgbaString(tuned, semantic.tintOpacity), display: tuned, opacity: semantic.tintOpacity },
    ];
  });
}

function auxiliaryColors(aux) {
  return rules.color.auxiliary.map((token) => ({
    name: token.name,
    value: token.source ? aux : mix(aux, colorRef(token.mixWith), token.amount),
  }));
}

function prefixedAuxiliaryColors(aux, prefix) {
  return rules.color.auxiliary.map((token) => ({
    name: token.name.replace("Auxiliary", prefix),
    value: token.source ? aux : mix(aux, colorRef(token.mixWith), token.amount),
  }));
}

function themeAuxiliaryColors(config) {
  return config.themes.flatMap((theme) =>
    (theme.auxiliaryColors || []).flatMap((aux, index) =>
      prefixedAuxiliaryColors(aux.value, `Auxiliary/${theme.name}/${aux.name || `aux-${index + 1}`}`),
    ),
  );
}

function typography(config) {
  const base = rules.typography.presets[config.typePreset] || rules.typography.presets.compact;
  const primary = base.map(([name, weight, size, line]) => ({
    name,
    family: config.primaryFont,
    weight,
    size,
    line,
    spacing: 0,
  }));

  const activeSecondaryFonts = config.secondaryFonts.filter((font) => font.family && font.use !== "none");
  const secondary = activeSecondaryFonts.flatMap((font, index) => {
    return (rules.typography.secondary[font.use] || []).map((style) => ({
      ...style,
      name: activeSecondaryFonts.length > 1 ? style.name.replace("/", `/${index + 1}/`) : style.name,
      family: font.family,
      spacing: 0,
      note: rules.typography.secondaryNote,
    }));
  });

  return [...primary, ...secondary];
}

function shadowLayersForSource(layerSet, source) {
  return layerSet.map(([x, y, blur, spread, opacity]) => ({
    x,
    y,
    blur,
    spread,
    color: rgbaString(source, opacity),
    opacity,
  }));
}

function shadowStyles(config) {
  const lightSource = shadowAmbientColor(config, "light");
  const darkSource = isLightDarkMode(config) ? shadowAmbientColor(config, "dark") : null;

  return Object.entries(rules.shadow.styles).map(([name, layerSet]) => {
    const lightLayers = shadowLayersForSource(layerSet, lightSource);
    const token = {
      name,
      source: lightSource,
      sourceTone: "Neutral Ambient",
      layers: lightLayers,
    };

    if (darkSource) {
      token.modeSources = [
        { mode: "Light", tone: "Neutral Ambient", source: lightSource },
        { mode: "Dark", tone: "Neutral Ambient", source: darkSource },
      ];
      token.modeLayers = {
        Light: lightLayers,
        Dark: shadowLayersForSource(layerSet, darkSource),
      };
    }

    return token;
  });
}
