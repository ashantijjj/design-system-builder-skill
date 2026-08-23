const fs = require("fs");
const path = require("path");
const vm = require("vm");

const rulesPath = path.resolve(__dirname, "../../design-system-builder-web/rules/config.js");
const semanticRulesPath = path.resolve(__dirname, "../rules/semantic-roles.json");
const fontPresetsPath = path.resolve(__dirname, "../rules/font-presets.json");
const codePath = path.resolve(__dirname, "../code.js");
const startMarker = "// BEGIN GENERATED DESIGN SYSTEM RULES";
const endMarker = "// END GENERATED DESIGN SYSTEM RULES";
const semanticStartMarker = "// BEGIN GENERATED SEMANTIC ROLE RULES";
const semanticEndMarker = "// END GENERATED SEMANTIC ROLE RULES";
const fontPresetStartMarker = "// BEGIN GENERATED FONT PRESET RULES";
const fontPresetEndMarker = "// END GENERATED FONT PRESET RULES";

function readWebRules() {
  const source = fs.readFileSync(rulesPath, "utf8");
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: rulesPath });
  if (!context.window.DESIGN_SYSTEM_RULES) {
    throw new Error("DESIGN_SYSTEM_RULES was not found in web rules config.");
  }
  return context.window.DESIGN_SYSTEM_RULES;
}

function toPluginRules(webRules) {
  return {
    white: webRules.color.white,
    darkAnchor: webRules.color.darkAnchor,
    forbiddenBlack: webRules.validation.forbiddenBlack,
    projectCode: webRules.validation.projectCode,
    brand: webRules.color.brand,
    semantic: webRules.color.semantic,
    neutral: {
      solidLevels: webRules.neutral.solid.levels,
      solidMix: webRules.neutral.solid.lightnessMix,
      standardOverlay: webRules.neutral.opacity.overlaySteps,
      lightweightBlackOverlay: webRules.neutral.opacity.lightweightBlackSteps,
      lightweightWhiteOverlay: webRules.neutral.opacity.lightweightWhiteSteps,
    },
    auxiliary: webRules.color.auxiliary,
    lightDark: {
      backgroundToneMapping: webRules.multiTheme.lightDark.backgroundToneMapping,
    },
    typography: webRules.typography.presets,
    secondaryTypography: {
      headlineLimit: 3,
    },
    radius: webRules.radius.values,
    spacing: webRules.spacing.values,
    shadow: {
      styles: webRules.shadow.styles,
    },
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function syncRules() {
  const semanticRules = JSON.parse(fs.readFileSync(semanticRulesPath, "utf8"));
  const fontPresets = JSON.parse(fs.readFileSync(fontPresetsPath, "utf8"));
  let code = fs.readFileSync(codePath, "utf8");
  const pattern = new RegExp(`${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}`);
  if (!pattern.test(code)) {
    throw new Error("Generated rules markers were not found in plugin code.js.");
  }
  if (fs.existsSync(rulesPath)) {
    const webRules = readWebRules();
    const pluginRules = toPluginRules(webRules);
    const generatedBlock = [
      startMarker,
      "// Source: ../design-system-builder-web/rules/config.js",
      `const RULES = ${JSON.stringify(pluginRules, null, 2)};`,
      endMarker,
    ].join("\n");
    code = code.replace(pattern, generatedBlock);
  } else {
    console.warn(`Web rules source not found; preserving the existing generated RULES block: ${rulesPath}`);
  }

  const semanticPattern = new RegExp(`${escapeRegExp(semanticStartMarker)}[\\s\\S]*?${escapeRegExp(semanticEndMarker)}`);
  if (!semanticPattern.test(code)) {
    throw new Error("Generated semantic role markers were not found in plugin code.js.");
  }
  const generatedSemanticBlock = [
    semanticStartMarker,
    "// Source: ./rules/semantic-roles.json",
    `const SEMANTIC_ROLE_RULES = ${JSON.stringify(semanticRules, null, 2)};`,
    semanticEndMarker,
  ].join("\n");
  code = code.replace(semanticPattern, generatedSemanticBlock);

  const fontPresetPattern = new RegExp(`${escapeRegExp(fontPresetStartMarker)}[\\s\\S]*?${escapeRegExp(fontPresetEndMarker)}`);
  if (!fontPresetPattern.test(code)) {
    throw new Error("Generated font preset markers were not found in plugin code.js.");
  }
  const generatedFontPresetBlock = [
    fontPresetStartMarker,
    "// Source: ./rules/font-presets.json",
    `const FONT_PRESET_RULES = ${JSON.stringify(fontPresets, null, 2)};`,
    fontPresetEndMarker,
  ].join("\n");

  fs.writeFileSync(codePath, code.replace(fontPresetPattern, generatedFontPresetBlock));
  console.log("Synced available rule sources to plugin code.js");
}

syncRules();
