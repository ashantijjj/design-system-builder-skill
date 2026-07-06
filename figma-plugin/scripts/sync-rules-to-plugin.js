const fs = require("fs");
const path = require("path");
const vm = require("vm");

const rulesPath = path.resolve(__dirname, "../../design-system-builder-web/rules/config.js");
const codePath = path.resolve(__dirname, "../code.js");
const startMarker = "// BEGIN GENERATED DESIGN SYSTEM RULES";
const endMarker = "// END GENERATED DESIGN SYSTEM RULES";

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
  const webRules = readWebRules();
  const pluginRules = toPluginRules(webRules);
  const code = fs.readFileSync(codePath, "utf8");
  const pattern = new RegExp(`${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}`);
  if (!pattern.test(code)) {
    throw new Error("Generated rules markers were not found in plugin code.js.");
  }

  const generatedBlock = [
    startMarker,
    "// Source: ../design-system-builder-web/rules/config.js",
    `const RULES = ${JSON.stringify(pluginRules, null, 2)};`,
    endMarker,
  ].join("\n");

  fs.writeFileSync(codePath, code.replace(pattern, generatedBlock));
  console.log("Synced web rules config to plugin code.js");
}

syncRules();
