const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const pluginRoot = path.resolve(__dirname, "..");
const codeSource = fs.readFileSync(path.join(pluginRoot, "code.js"), "utf8");
const uiSource = fs.readFileSync(path.join(pluginRoot, "ui.html"), "utf8");
const semanticRules = JSON.parse(fs.readFileSync(path.join(pluginRoot, "rules/semantic-roles.json"), "utf8"));
const fontPresetRules = JSON.parse(fs.readFileSync(path.join(pluginRoot, "rules/font-presets.json"), "utf8"));

test("semantic role source is unique and component-token free", () => {
  const roles = semanticRules.colorRoles.map((item) => item.role);
  const paths = semanticRules.colorRoles.map((item) => item.variablePath);
  assert.equal(new Set(roles).size, roles.length);
  assert.equal(new Set(paths).size, paths.length);
  for (const item of semanticRules.colorRoles) {
    assert.ok(item.source || item.sourceByNeutralMode || item.sourcesByMode);
    assert.ok(!item.variablePath.split("/").includes("Component"));
    for (const source of [item.source, ...Object.values(item.sourceByNeutralMode || {}), ...Object.values(item.sourcesByMode || {})].filter(Boolean)) {
      const sourcePath = typeof source === "string" ? source : source.variablePath;
      assert.ok(!sourcePath.split("/").includes("Component"));
    }
  }
  assert.equal(semanticRules.resources.typography["action.label"].standard, "Subtitle/S1");
  assert.equal(semanticRules.resources.typography["action.label"].large, "Subtitle/S1");
  assert.match(codeSource, /typographyScale/);
  assert.doesNotMatch(codeSource, /"name": "Label"/);
});

test("embedded semantic rules match the canonical JSON source", () => {
  const match = codeSource.match(/const SEMANTIC_ROLE_RULES = ([\s\S]*?);\n\/\/ END GENERATED SEMANTIC ROLE RULES/);
  assert.ok(match, "embedded semantic rules block was not found");
  assert.deepEqual(JSON.parse(match[1]), semanticRules);
});

test("embedded font profiles match the canonical JSON source", () => {
  const match = codeSource.match(/const FONT_PRESET_RULES = ([\s\S]*?);\n\/\/ END GENERATED FONT PRESET RULES/);
  assert.ok(match, "embedded font preset rules block was not found");
  assert.deepEqual(JSON.parse(match[1]), fontPresetRules);
});

test("font preset library has the reviewed v1.0 profile shape", () => {
  const profiles = Object.values(fontPresetRules.profiles);
  const rejected = Object.values(fontPresetRules.rejected);
  assert.equal(fontPresetRules.schemaVersion, "google-font-presets/1.0.0");
  assert.equal(profiles.length, 51);
  assert.equal(rejected.length, 26);
  assert.equal(profiles.filter((profile) => profile.eligibility.primaryUiEligible).length, 25);
  assert.equal(profiles.filter((profile) => profile.eligibility.secondaryEligible).length, 26);
  assert.equal(profiles.filter((profile) => profile.curation.displayPriority === "core").length, 28);
  assert.equal(profiles.filter((profile) => profile.curation.displayPriority === "extended").length, 23);
  assert.equal(new Set(profiles.map((profile) => profile.id)).size, profiles.length);
  assert.equal(new Set(profiles.map((profile) => profile.family)).size, profiles.length);
  for (const profile of profiles.filter((item) => item.eligibility.primaryUiEligible)) {
    const mappings = profile.mappings.primary;
    const weights = [mappings.baseUi, mappings.emphasis, mappings.strong].map((mapping) => mapping.requestedWeight);
    assert.equal(new Set(weights).size, 3, profile.family);
    weights.forEach((weight) => assert.ok(profile.source.uprightWeights.includes(weight), `${profile.family}/${weight}`));
  }
  for (const profile of profiles.filter((item) => item.eligibility.secondaryEligible)) {
    assert.deepEqual(profile.mappings.secondary.recommendedLevels, ["headline"]);
  }
  assert.deepEqual(fontPresetRules.secondaryUsageSchema.order, ["headline", "subtitle", "body", "caption"]);
  assert.equal(fontPresetRules.secondaryUsageSchema.levels.standard.headline[0].size, 38);
  assert.equal(fontPresetRules.secondaryUsageSchema.levels.standard.caption.at(-1).size, 10);
  assert.equal(fontPresetRules.secondaryUsageSchema.levels.large.caption.at(-1).size, 12);
  assert.ok(fontPresetRules.sourceSnapshot.apiFieldsDeferred.includes("version"));
  assert.ok(fontPresetRules.sourceSnapshot.apiFieldsDeferred.includes("tags"));
});

test("UI has destructive notice and explicit rebuild confirmation", () => {
  assert.match(uiSource, /only used|0-1|0-1 project|0-1 项目/);
  assert.match(uiSource, /build-state/);
  assert.match(uiSource, /window\.confirm/);
});

test("Step 1 rebuilds resources and can be run again after success", async () => {
  const mock = createFigmaMock();
  seedLegacyResources(mock);
  const context = createVmContext(mock);
  vm.runInContext(codeSource, context, { filename: "code.js" });
  await mock.figma.ui.onmessage({ type: "ui-ready" });
  await mock.figma.ui.onmessage({ type: "generate", config: standardConfig() });

  const success = mock.messages.find((message) => message.type === "success");
  assert.ok(success, mock.messages.map((message) => message.message).filter(Boolean).join("\n"));
  assert.deepEqual(Array.from(success.exports.files, (file) => file.filename), [
    "OOG505-Design-System.md",
    "OOG505-Design-System.json",
  ]);
  assert.match(success.exports.files[0].content, /## Semantic Role Mapping/);

  const state = JSON.parse(mock.rootPluginData.get("design-system-build-state-v1"));
  const manifest = JSON.parse(mock.rootPluginData.get("semantic-token-manifest-v1"));
  assert.equal(state.status, "FOUNDATION_VALID");
  assert.equal(manifest.status, "valid");
  assert.equal(manifest.schemaVersion, "1.1.0");
  assert.equal(manifest.rulesVersion, "1.1.0");
  assert.equal(manifest.typography.scale.id, "standard");
  assert.equal(manifest.typography.primaryFont.runtimeUiEligible, true);
  assert.deepEqual(manifest.typography.primaryFont.weightMapping, {
    reading: 400,
    baseUi: 500,
    emphasis: 600,
    strong: 700,
  });
  assert.equal(manifest.capabilities.componentReady, true);
  assert.equal(manifest.typography.textStyles.Label, undefined);
  assert.ok(manifest.systemRevision.startsWith("fnv1a32-"));
  assert.equal(Object.keys(manifest.resources.colors).length, semanticRules.colorRoles.length);
  assert.doesNotMatch(JSON.stringify(manifest), /"(?:variable|style|mode)Id"/i);
  assert.deepEqual(manifest.resources.colors["surface.action.primary.default"], {
    bindingStrategy: "direct",
    binding: {
      collectionName: "Design System",
      variablePath: "OOG505/Brand/primary",
      variableType: "COLOR",
    },
    sourcesByMode: {
      Default: {
        collectionName: "Design System",
        variablePath: "OOG505/Brand/primary",
        variableType: "COLOR",
      },
    },
  });
  assert.match(success.exports.files[0].content, /surface\.action\.primary\.default.*direct/);
  assert.equal(success.result.semanticVariables, 0);
  for (const resource of Object.values(manifest.resources.colors)) {
    assert.equal(resource.bindingStrategy, "direct");
    assert.deepEqual(resource.binding, resource.sourcesByMode.Default);
    assert.equal(mock.variables.some((variable) => variable.name === resource.binding.variablePath), true);
  }
  assert.equal(mock.variables.some((variable) => variable.name.includes("/Surface/Action/")), false);
  assert.equal(mock.variables.some((variable) => variable.name === "Legacy/Manual"), false);
  assert.equal(mock.textStyles.some((style) => style.name === "Legacy Manual Style"), false);

  const variableCount = mock.variables.length;
  await mock.figma.ui.onmessage({ type: "generate", config: standardConfig() });
  const secondSuccess = mock.messages.filter((message) => message.type === "success").at(-1);
  assert.ok(secondSuccess, mock.messages.map((message) => message.message).filter(Boolean).join("\n"));
  assert.equal(mock.variables.length, variableCount);
  assert.equal(JSON.parse(mock.rootPluginData.get("design-system-build-state-v1")).status, "FOUNDATION_VALID");
});

test("Semantic Alias preflight reports every missing role before writing", async () => {
  const mock = createFigmaMock();
  const hooks = await loadTestHooks(mock);
  mock.createCollection("Design System");
  const plan = {
    collectionName: "Design System",
    colorRoles: [
      semanticRole("missing.surface", "OOG505/Brand/Missing"),
      semanticRole("missing.content", "OOG505/Neutral/Missing"),
    ],
    aliasBindings: [],
    errors: [],
  };

  await assert.rejects(
    () => hooks.writeSemanticRoleVariables(plan),
    (error) => {
      assert.match(error.message, /missing\.surface/);
      assert.match(error.message, /missing\.content/);
      return true;
    },
  );
  assert.equal(mock.variables.length, 0);
});

test("auxiliary colors keep solid and gradient outputs as separate entries", async () => {
  const mock = createFigmaMock();
  const hooks = await loadTestHooks(mock);
  const config = hooks.normalizeConfig({
    ...standardConfig(),
    auxColors: [
      { name: "solid", kind: "solid", value: "#E0EDE5" },
      { name: "gradient", kind: "gradient", gradientFrom: "#E0EDE5", gradientTo: "#B7D8C4", gradientDirection: "linear" },
    ],
  });

  assert.deepEqual(config.auxColors.map((aux) => aux.kind), ["solid", "gradient"]);
  assert.equal(hooks.auxiliaryTokensForConfig(config).length, 3);
  assert.deepEqual(Array.from(hooks.auxiliaryGradientTokensForConfig(config), (token) => token.name), ["Auxiliary/gradient"]);

  const invalidIssues = hooks.validateRawInputs({
    ...standardConfig(),
    auxColors: [{ kind: "both", value: "#E0EDE5", gradientFrom: "#E0EDE5", gradientTo: "#B7D8C4" }],
  }, config);
  assert.match(invalidIssues.join("\n"), /不能同时选择纯色和渐变/);
});

test("lightweight foundation keeps typography scale independent and disables component readiness", async () => {
  const mock = createFigmaMock();
  const context = createVmContext(mock);
  vm.runInContext(codeSource, context, { filename: "code.js" });
  await mock.figma.ui.onmessage({ type: "ui-ready" });
  const config = { ...standardConfig(), systemType: "lightweight", typographyScale: "large", colorOutput: "style" };
  delete config.typePreset;
  await mock.figma.ui.onmessage({ type: "generate", config });

  const success = mock.messages.find((message) => message.type === "success");
  assert.ok(success, mock.messages.map((message) => message.message).filter(Boolean).join("\n"));
  assert.equal(success.manifest.status, "valid");
  assert.equal(success.manifest.typography.scale.id, "large");
  assert.equal(success.manifest.capabilities.componentReady, false);
  assert.equal(Object.keys(success.manifest.resources.colors).length, 0);
  assert.match(success.manifest.validation.warnings.join("\n"), /componentReady=false/);
});

test("Semantic Alias preflight rejects an incorrect source type", async () => {
  const mock = createFigmaMock();
  const hooks = await loadTestHooks(mock);
  const collection = mock.createCollection("Design System");
  const source = mock.createVariable("OOG505/Brand/primary", collection, "FLOAT");
  source.setValueForMode(collection.modes[0].modeId, 16);

  await assert.rejects(
    () => hooks.writeSemanticRoleVariables({
      collectionName: "Design System",
      colorRoles: [semanticRole("surface.action.primary.default", source.name)],
      aliasBindings: [],
      errors: [],
    }),
    /来源类型应为 COLOR，实际为 FLOAT/,
  );
  assert.equal(mock.variables.length, 1);
});

test("the same Foundation identity across modes stays direct", async () => {
  const mock = createFigmaMock();
  const hooks = await loadTestHooks(mock);
  const collection = createLightDarkCollection(mock);
  const source = mock.createVariable("OOG505/Brand/primary", collection, "COLOR");
  setColorModes(source, collection, { Light: { r: 0.1, g: 0.2, b: 0.7 }, Dark: { r: 0.3, g: 0.5, b: 1 } });
  const plan = hooks.buildSemanticRolePlan(semanticSystem(["Light", "Dark"]), semanticRulesFor([
    { role: "surface.action.primary.default", variablePath: "Surface/Action/Primary/Default", source: "Brand/primary" },
  ]));

  assert.equal(plan.colorRoles[0].bindingStrategy, "direct");
  assert.equal(plan.aliasBindings.length, 0);
  assert.equal(await hooks.writeSemanticRoleVariables(plan), 0);
  const validation = hooks.validateSemanticManifest(plan, await hooks.scanDesignSystemInventory("OOG505"));
  assert.deepEqual(Array.from(validation.errors), []);
});

test("different mode sources create separate aliases without automatic merging", async () => {
  const mock = createFigmaMock();
  const hooks = await loadTestHooks(mock);
  const collection = createLightDarkCollection(mock);
  seedLightDarkSources(mock, collection);
  const sourcesByMode = { Light: "Neutral/900", Dark: "Neutral/00" };
  const plan = hooks.buildSemanticRolePlan(semanticSystem(["Light", "Dark"]), semanticRulesFor([
    { role: "content.default", variablePath: "Content/Default", sourcesByMode, scopes: ["TEXT_FILL"] },
    { role: "icon.default", variablePath: "Icon/Default", sourcesByMode, scopes: ["SHAPE_FILL"] },
  ]));

  assert.equal(plan.aliasBindings.length, 2);
  assert.equal(await hooks.writeSemanticRoleVariables(plan), 2);
  assert.equal(mock.variables.some((variable) => variable.name === "OOG505/Content/Default"), true);
  assert.equal(mock.variables.some((variable) => variable.name === "OOG505/Icon/Default"), true);
  const validation = hooks.validateSemanticManifest(plan, await hooks.scanDesignSystemInventory("OOG505"));
  assert.deepEqual(Array.from(validation.errors), []);
});

test("an explicit sharedBinding creates one alias with the union of scopes", async () => {
  const mock = createFigmaMock();
  const hooks = await loadTestHooks(mock);
  const collection = createLightDarkCollection(mock);
  seedLightDarkSources(mock, collection);
  const sourcesByMode = { Light: "Neutral/900", Dark: "Neutral/00" };
  const rules = semanticRulesFor([
    { role: "content.default", variablePath: "Content/Default", sourcesByMode, sharedBinding: "foreground.default", scopes: ["TEXT_FILL"] },
    { role: "icon.default", variablePath: "Icon/Default", sourcesByMode, sharedBinding: "foreground.default", scopes: ["SHAPE_FILL"] },
  ], {
    "foreground.default": { variablePath: "Foreground/Default" },
  });
  const plan = hooks.buildSemanticRolePlan(semanticSystem(["Light", "Dark"]), rules);

  assert.equal(plan.aliasBindings.length, 1);
  assert.deepEqual(Array.from(plan.aliasBindings[0].scopes), ["TEXT_FILL", "SHAPE_FILL"]);
  assert.equal(await hooks.writeSemanticRoleVariables(plan), 1);
  assert.equal(plan.colorRoles[0].binding.variablePath, "OOG505/Foreground/Default");
  assert.equal(plan.colorRoles[1].binding.variablePath, "OOG505/Foreground/Default");
  const shared = mock.variables.filter((variable) => variable.name === "OOG505/Foreground/Default");
  assert.equal(shared.length, 1);
  assert.deepEqual(Array.from(shared[0].scopes), ["TEXT_FILL", "SHAPE_FILL"]);
  const validation = hooks.validateSemanticManifest(plan, await hooks.scanDesignSystemInventory("OOG505"));
  assert.deepEqual(Array.from(validation.errors), []);
});

test("a sharedBinding with different source identities is rejected before writing", async () => {
  const mock = createFigmaMock();
  const hooks = await loadTestHooks(mock);
  const collection = createLightDarkCollection(mock);
  seedLightDarkSources(mock, collection);
  const brand = mock.createVariable("OOG505/Brand/primary", collection, "COLOR");
  setColorModes(brand, collection, { Light: { r: 0, g: 0.2, b: 0.8 }, Dark: { r: 0.2, g: 0.4, b: 1 } });
  const rules = semanticRulesFor([
    { role: "content.default", variablePath: "Content/Default", sourcesByMode: { Light: "Neutral/900", Dark: "Neutral/00" }, sharedBinding: "foreground.default" },
    { role: "icon.default", variablePath: "Icon/Default", sourcesByMode: { Light: "Neutral/900", Dark: "Brand/primary" }, sharedBinding: "foreground.default" },
  ], {
    "foreground.default": { variablePath: "Foreground/Default" },
  });
  const plan = hooks.buildSemanticRolePlan(semanticSystem(["Light", "Dark"]), rules);

  assert.match(plan.errors.join("\n"), /来源身份不一致/);
  await assert.rejects(() => hooks.writeSemanticRoleVariables(plan), /来源身份不一致/);
  assert.equal(mock.variables.some((variable) => variable.name === "OOG505/Foreground/Default"), false);
});

test("Alias validation detects cycles", async () => {
  const mock = createFigmaMock();
  const hooks = await loadTestHooks(mock);
  const collection = mock.createCollection("Design System");
  const first = mock.createVariable("OOG505/Alias/First", collection, "COLOR");
  const second = mock.createVariable("OOG505/Alias/Second", collection, "COLOR");
  const modeId = collection.modes[0].modeId;
  first.setValueForMode(modeId, mock.figma.variables.createVariableAlias(second));
  second.setValueForMode(modeId, mock.figma.variables.createVariableAlias(first));
  const inventory = await hooks.scanDesignSystemInventory("OOG505");

  const validation = hooks.validateAliasChain(first.id, modeId, inventory);
  assert.match(Array.from(validation.errors).join("\n"), /循环引用/);
});

test("startup recovers an interrupted foundation build", async () => {
  const mock = createFigmaMock();
  const survivor = mock.createCollection("Unrelated");
  const partialCollection = mock.createCollection("Design System");
  const partialVariable = mock.createVariable("OOG505/Brand/primary", partialCollection, "COLOR");
  partialVariable.setValueForMode(partialCollection.modes[0].modeId, { r: 0, g: 0, b: 0 });
  mock.figma.root.setPluginData("design-system-build-state-v1", JSON.stringify({
    schemaVersion: "1.0.0",
    status: "FOUNDATION_BUILDING",
    projectCode: "OOG505",
    runId: "foundation-interrupted",
    lastError: "",
    cleanupPending: false,
    cleanup: {
      collections: [partialCollection.id],
      variables: [partialVariable.id],
      paintStyles: [],
      textStyles: [],
      effectStyles: [],
      pages: [],
      componentNodes: [],
    },
  }));

  const context = createVmContext(mock);
  vm.runInContext(codeSource, context, { filename: "code.js" });
  await mock.figma.ui.onmessage({ type: "ui-ready" });

  const state = JSON.parse(mock.rootPluginData.get("design-system-build-state-v1"));
  const manifest = JSON.parse(mock.rootPluginData.get("semantic-token-manifest-v1"));
  assert.equal(state.status, "FOUNDATION_INVALID");
  assert.equal(state.cleanupPending, false);
  assert.equal(manifest.status, "invalid");
  assert.match(manifest.validation.errors.join("\n"), /意外中断/);
  assert.deepEqual(mock.collections.map((collection) => collection.name), [survivor.name]);
  assert.equal(mock.variables.length, 0);
});

test("known font role eligibility blocks before runtime resolution", async () => {
  const mock = createFigmaMock();
  const hooks = await loadFontHooks(mock);
  const secondaryAsPrimary = hooks.validateFontRequest({ id: "primary", role: "primary", family: "Lora", typographyScale: "standard" }, mock.fontStyles, true);
  assert.equal(secondaryAsPrimary.reasonCode, "PRIMARY_FONT_NOT_APPROVED");
  assert.equal(secondaryAsPrimary.state, "error");
  const primaryAsSecondary = hooks.validateFontRequest({ id: "secondary-0", role: "secondary", family: "Inter", levels: [] }, mock.fontStyles, true);
  assert.equal(primaryAsSecondary.reasonCode, "SECONDARY_FONT_NOT_APPROVED");
});

test("secondary level is required before config normalization", async () => {
  const mock = createFigmaMock();
  const hooks = await loadFontHooks(mock);
  const known = hooks.validateFontRequest({ id: "secondary-0", role: "secondary", family: "Lora", levels: [] }, mock.fontStyles, true);
  assert.equal(known.reasonCode, "SECONDARY_LEVEL_REQUIRED");
  const manual = hooks.validateFontRequest({ id: "secondary-0", role: "secondary", family: "Manual Font", levels: [] }, mock.fontStyles, true);
  assert.equal(manual.reasonCode, "SECONDARY_LEVEL_REQUIRED");
  const normalized = hooks.normalizeConfig({ ...standardConfig(), secondaryFonts: [{ family: "Lora", levels: [] }] });
  assert.deepEqual(Array.from(normalized.secondaryFonts, (font) => ({ family: font.family, levels: Array.from(font.levels) })), [{ family: "Lora", levels: [] }]);
});

test("known secondary only accepts approved levels", async () => {
  const mock = createFigmaMock();
  const hooks = await loadFontHooks(mock);
  const result = hooks.validateFontRequest({ id: "secondary-0", role: "secondary", family: "Lora", levels: ["subtitle"], typographyScale: "standard" }, mock.fontStyles, true);
  assert.equal(result.reasonCode, "SECONDARY_LEVEL_NOT_APPROVED");
  assert.deepEqual(Array.from(result.approvedLevels), ["headline"]);
  assert.equal(result.levelMode, "profile");
});

test("font resolver prioritizes profile aliases before generic aliases and nearest", async () => {
  const mock = createFigmaMock();
  const hooks = await loadFontHooks(mock);
  const availableFonts = [
    { fontName: { family: "Alias Sans", style: "Semibold" } },
    { fontName: { family: "Alias Sans", style: "Demi Bold" } },
    { fontName: { family: "Alias Sans", style: "Bold" } },
  ];
  const alias = hooks.resolveFontMatch({
    family: "Alias Sans",
    requestedWeight: 600,
    expectedStyle: "Semi Bold",
    styleAliases: ["Demi Bold", "Semibold"],
    availableFonts,
  });
  assert.equal(alias.resolutionStatus, "style-alias");
  assert.equal(alias.resolvedFontName.style, "Demi Bold");
  const unavailable = hooks.resolveFontMatch({ family: "Missing", requestedWeight: 500, expectedStyle: "Medium", styleAliases: [], availableFonts });
  assert.equal(unavailable.resolutionStatus, "unavailable");
  assert.equal(unavailable.resolvedFontName, null);
});

test("secondary min size skips only ineligible styles and records them", async () => {
  const mock = createFigmaMock();
  addFontFamily(mock, "Sekuya", ["Regular"]);
  const context = createVmContext(mock);
  vm.runInContext(codeSource, context, { filename: "code.js" });
  await mock.figma.ui.onmessage({ type: "ui-ready" });
  await mock.figma.ui.onmessage({ type: "generate", config: { ...standardConfig(), secondaryFonts: [{ family: "Sekuya", levels: ["headline"] }] } });
  const success = mock.messages.find((message) => message.type === "success");
  assert.ok(success, mock.messages.map((message) => message.message).filter(Boolean).join("\n"));
  const secondary = success.manifest.typography.secondaryFonts[0];
  assert.equal(secondary.profileId, "sekuya");
  assert.deepEqual(Array.from(secondary.requestedLevels), ["headline"]);
  assert.deepEqual(Array.from(secondary.approvedLevels), ["headline"]);
  assert.ok(secondary.resolvedStyles.some((style) => style.stylePath.endsWith("/Headline/H1")));
  assert.ok(secondary.skippedStyles.some((style) => style.reasonCode === "SECONDARY_MIN_SIZE_NOT_MET"));
  assert.equal(mock.textStyles.some((style) => style.name === "Sekuya/H3"), false);
});

test("synthetic body profile respects the approved level and min size", async () => {
  const mock = createFigmaMock();
  const hooks = await loadFontHooks(mock);
  const profile = {
    id: "synthetic-body",
    family: "Synthetic Body",
    eligibility: { primaryUiEligible: false, secondaryEligible: true },
    mappings: {
      secondary: {
        recommendedLevels: ["body"],
        body: { requestedWeight: 400, expectedStyle: "Regular", styleAliases: [], minRecommendedSizePx: 20 },
      },
    },
  };
  const standard = hooks.secondaryTypographyTokensForProfile(
    { family: profile.family, levels: ["body"] },
    0,
    hooks.typographyDefinitions("standard"),
    profile,
    "standard",
  );
  assert.equal(standard[0].size, 18);
  assert.equal(standard[0].skipReasonCode, "SECONDARY_MIN_SIZE_NOT_MET");
  const large = hooks.secondaryTypographyTokensForProfile(
    { family: profile.family, levels: ["body"] },
    0,
    hooks.typographyDefinitions("large"),
    profile,
    "large",
  );
  assert.equal(large[0].size, 20);
  assert.equal(large[0].skipReasonCode, undefined);
  assert.deepEqual(profile.mappings.secondary.recommendedLevels, ["body"]);
});

test("primary manifest uses new profile paths and canonical usage mapping", async () => {
  const mock = createFigmaMock();
  const context = createVmContext(mock);
  vm.runInContext(codeSource, context, { filename: "code.js" });
  await mock.figma.ui.onmessage({ type: "ui-ready" });
  await mock.figma.ui.onmessage({ type: "generate", config: standardConfig() });
  const manifest = mock.messages.find((message) => message.type === "success").manifest;
  assert.equal(manifest.typography.primaryFont.profileId, "inter");
  assert.equal(manifest.typography.primaryFont.profileSource, "google-fonts");
  assert.equal(manifest.typography.primaryFont.profileVersion, "1.0.0");
  assert.equal(manifest.typography.primaryFont.profileUiEligible, true);
  assert.equal(manifest.typography.usageMapping["typography.tabLabel"], "Subtitle/S1");
});

test("generate preflight failure preserves prior state and resources", async () => {
  const mock = createFigmaMock();
  seedLegacyResources(mock);
  const context = createVmContext(mock);
  vm.runInContext(codeSource, context, { filename: "code.js" });
  await mock.figma.ui.onmessage({ type: "ui-ready" });
  await mock.figma.ui.onmessage({ type: "generate", config: { ...standardConfig(), secondaryFonts: [{ family: "Lora", levels: [] }] } });
  assert.equal(JSON.parse(mock.rootPluginData.get("design-system-build-state-v1")).status, "EMPTY");
  assert.equal(mock.variables.some((variable) => variable.name === "Legacy/Manual"), true);
  assert.equal(mock.rootPluginData.has("semantic-token-manifest-v1"), false);
  assert.match(mock.messages.at(-1).message, /请选择副字体应用层级/);
});

test("loadFontAsync failure preserves prior state and resources", async () => {
  const mock = createFigmaMock();
  seedLegacyResources(mock);
  mock.figma.loadFontAsync = async (fontName) => {
    if (fontName.style === "Medium") throw new Error("load failed");
  };
  const context = createVmContext(mock);
  vm.runInContext(codeSource, context, { filename: "code.js" });
  await mock.figma.ui.onmessage({ type: "ui-ready" });
  await mock.figma.ui.onmessage({ type: "generate", config: standardConfig() });
  assert.equal(JSON.parse(mock.rootPluginData.get("design-system-build-state-v1")).status, "EMPTY");
  assert.equal(mock.variables.some((variable) => variable.name === "Legacy/Manual"), true);
  assert.equal(mock.rootPluginData.has("semantic-token-manifest-v1"), false);
  assert.match(mock.messages.at(-1).message, /字体不可用/);
});

test("primary nearest allows foundation but disables component readiness", async () => {
  const mock = createFigmaMock();
  const mediumIndex = mock.fontStyles.findIndex((font) => font.fontName.style === "Medium");
  mock.fontStyles.splice(mediumIndex, 1);
  const context = createVmContext(mock);
  vm.runInContext(codeSource, context, { filename: "code.js" });
  await mock.figma.ui.onmessage({ type: "ui-ready" });
  await mock.figma.ui.onmessage({ type: "generate", config: standardConfig() });
  const success = mock.messages.find((message) => message.type === "success");
  assert.ok(success, mock.messages.map((message) => message.message).filter(Boolean).join("\n"));
  assert.equal(success.manifest.status, "valid");
  assert.equal(success.manifest.typography.primaryFont.runtimeUiEligible, false);
  assert.equal(success.manifest.capabilities.componentReady, false);
  assert.match(success.manifest.validation.warnings.join("\n"), /组件生成将保持禁用/);
});

test("Step 2 core gate rejects a valid foundation without component readiness", async () => {
  const mock = createFigmaMock();
  const context = createVmContext(mock);
  vm.runInContext(codeSource, context, { filename: "code.js" });
  await mock.figma.ui.onmessage({ type: "ui-ready" });
  await mock.figma.ui.onmessage({ type: "generate", config: { ...standardConfig(), systemType: "lightweight", colorOutput: "style" } });
  await mock.figma.ui.onmessage({ type: "generate-components" });
  assert.match(mock.messages.at(-1).message, /尚未满足组件生成条件/);
});

function createVmContext(mock) {
  return vm.createContext({
    figma: mock.figma,
    __html__: "",
    console,
    setTimeout,
    clearTimeout,
    Date,
    Math,
  });
}

async function loadTestHooks(mock) {
  const context = createVmContext(mock);
  vm.runInContext(`${codeSource}\nglobalThis.__testHooks = { buildSemanticRolePlan, writeSemanticRoleVariables, validateSemanticManifest, validateAliasChain, scanDesignSystemInventory, normalizeConfig, validateRawInputs, auxiliaryTokensForConfig, auxiliaryGradientTokensForConfig };`, context, {
    filename: "code.js",
  });
  await mock.figma.ui.onmessage({ type: "ui-ready" });
  return context.__testHooks;
}

async function loadFontHooks(mock) {
  const context = createVmContext(mock);
  vm.runInContext(`${codeSource}\nglobalThis.__fontHooks = { normalizeConfig, validateFontRequest, resolveFontMatch, typographyTokens, typographyDefinitions, secondaryTypographyTokensForProfile, buildTypographyManifest };`, context, {
    filename: "code.js",
  });
  await mock.figma.ui.onmessage({ type: "ui-ready" });
  return context.__fontHooks;
}

function semanticRole(role, sourceVariablePath, modeName = "Default") {
  const locator = {
    collectionName: "Design System",
    variablePath: sourceVariablePath,
    variableType: "COLOR",
  };
  return {
    role,
    bindingStrategy: "direct",
    binding: { ...locator },
    sourcesByMode: { [modeName]: { ...locator } },
    variableType: "COLOR",
    scopes: ["ALL_FILLS"],
  };
}

function semanticSystem(colorModes) {
  return {
    config: {
      projectCode: "OOG505",
      neutralMode: "solid",
      typographyScale: "standard",
    },
    colorModes,
  };
}

function semanticRulesFor(colorRoles, sharedBindings = {}) {
  return {
    schemaVersion: "1.1.0",
    profile: "test",
    collectionName: "Design System",
    sharedBindings,
    colorRoles,
    resources: {},
  };
}

function createLightDarkCollection(mock) {
  const collection = mock.createCollection("Design System");
  collection.renameMode(collection.modes[0].modeId, "Light");
  collection.addMode("Dark");
  return collection;
}

function setColorModes(variable, collection, valuesByMode) {
  for (const mode of collection.modes) {
    variable.setValueForMode(mode.modeId, valuesByMode[mode.name]);
  }
}

function seedLightDarkSources(mock, collection) {
  const dark = mock.createVariable("OOG505/Neutral/900", collection, "COLOR");
  setColorModes(dark, collection, { Light: { r: 0.1, g: 0.1, b: 0.1 }, Dark: { r: 0.15, g: 0.15, b: 0.15 } });
  const light = mock.createVariable("OOG505/Neutral/00", collection, "COLOR");
  setColorModes(light, collection, { Light: { r: 1, g: 1, b: 1 }, Dark: { r: 0.95, g: 0.95, b: 0.95 } });
}

function standardConfig() {
  return {
    projectCode: "OOG 505",
    systemType: "standard",
    multiThemeType: "light-dark",
    primaryKind: "solid",
    primaryColor: "#3B73D1",
    primaryGradientFrom: "",
    primaryGradientTo: "",
    primaryGradientFallback: "",
    primaryGradientDirection: "linear",
    lightBackgroundColor: "",
    darkBackgroundColor: "",
    coolBackgroundColor: "",
    warmBackgroundColor: "",
    themeBackgroundStrategy: "shared",
    themes: [],
    blackColor: "#28354D",
    primaryFont: "Inter",
    secondaryFonts: [],
    semanticSet: "full",
    auxColor: "",
    auxColors: [],
    backgroundColor: "#F7F8FA",
    neutralMode: "solid",
    colorOutput: "variable",
    typographyOutput: "style",
    typePreset: "full",
    visualTemplate: false,
  };
}

function createFigmaMock() {
  let nextId = 1;
  const collections = [];
  const variables = [];
  const paintStyles = [];
  const textStyles = [];
  const effectStyles = [];
  const pages = [];
  const messages = [];
  const rootPluginData = new Map();

  function id(prefix) {
    return `${prefix}:${nextId++}`;
  }

  function pluginDataMixin(target) {
    const data = new Map();
    target.setPluginData = (key, value) => {
      if (value === "") data.delete(key);
      else data.set(key, value);
    };
    target.getPluginData = (key) => data.get(key) || "";
    return target;
  }

  function removable(target, list, removeChildren) {
    target.remove = () => {
      const index = list.indexOf(target);
      if (index >= 0) list.splice(index, 1);
      target.removed = true;
      if (removeChildren) removeChildren();
    };
    return target;
  }

  function createCollection(name) {
    const collection = removable(pluginDataMixin({
      id: id("Collection"),
      name,
      modes: [{ modeId: id("Mode"), name: "Mode 1" }],
      renameMode(modeId, modeName) {
        this.modes.find((mode) => mode.modeId === modeId).name = modeName;
      },
      addMode(modeName) {
        const modeId = id("Mode");
        this.modes.push({ modeId, name: modeName });
        return modeId;
      },
      removeMode(modeId) {
        this.modes = this.modes.filter((mode) => mode.modeId !== modeId);
      },
    }), collections, () => {
      for (const variable of [...variables]) {
        if (variable.variableCollectionId === collection.id) variable.remove();
      }
    });
    collections.push(collection);
    return collection;
  }

  function createVariable(name, collection, resolvedType) {
    const variable = removable(pluginDataMixin({
      id: id("Variable"),
      name,
      description: "",
      variableCollectionId: collection.id,
      resolvedType,
      valuesByMode: {},
      scopes: [],
      setValueForMode(modeId, value) {
        this.valuesByMode[modeId] = value;
      },
    }), variables);
    variables.push(variable);
    return variable;
  }

  function createStyle(kind, list) {
    const style = removable(pluginDataMixin({ id: id(kind), name: "", description: "" }), list);
    list.push(style);
    return style;
  }

  function createPage() {
    const page = removable(pluginDataMixin({ id: id("Page"), name: "Page", children: [] }), pages);
    pages.push(page);
    return page;
  }

  const root = pluginDataMixin({
    id: "0:0",
    name: "Mock file",
    get children() {
      return pages;
    },
  });
  root.setPluginData = (key, value) => {
    if (value === "") rootPluginData.delete(key);
    else rootPluginData.set(key, value);
  };
  root.getPluginData = (key) => rootPluginData.get(key) || "";

  const initialPage = createPage();
  initialPage.name = "Work";

  const fontStyles = ["Regular", "Medium", "Semi Bold", "Bold"].map((style) => ({
    fontName: { family: "Inter", style },
  }));
  const figma = {
    root,
    currentPage: initialPage,
    mixed: Symbol("mixed"),
    ui: {
      onmessage: null,
      postMessage(message) {
        messages.push(message);
      },
    },
    variables: {
      getLocalVariablesAsync: async () => [...variables],
      getLocalVariableCollectionsAsync: async () => [...collections],
      createVariableCollection: createCollection,
      createVariable,
      createVariableAlias: (variable) => ({ type: "VARIABLE_ALIAS", id: variable.id }),
    },
    showUI() {},
    closePlugin() {},
    notify() {},
    createPage,
    createPaintStyle: () => createStyle("PaintStyle", paintStyles),
    createTextStyle: () => createStyle("TextStyle", textStyles),
    createEffectStyle: () => createStyle("EffectStyle", effectStyles),
    getLocalPaintStylesAsync: async () => [...paintStyles],
    getLocalTextStylesAsync: async () => [...textStyles],
    getLocalEffectStylesAsync: async () => [...effectStyles],
    listAvailableFontsAsync: async () => fontStyles,
    loadFontAsync: async () => {},
    setCurrentPageAsync: async (page) => {
      figma.currentPage = page;
    },
  };
  return { figma, collections, variables, paintStyles, textStyles, effectStyles, pages, messages, rootPluginData, fontStyles, createCollection, createVariable, createStyle };
}

function addFontFamily(mock, family, styles) {
  styles.forEach((style) => mock.fontStyles.push({ fontName: { family, style } }));
}

function seedLegacyResources(mock) {
  const collection = mock.createCollection("Manual Collection");
  mock.createVariable("Legacy/Manual", collection, "COLOR").setValueForMode(collection.modes[0].modeId, { r: 1, g: 0, b: 0 });
  const textStyle = mock.createStyle("TextStyle", mock.textStyles);
  textStyle.name = "Legacy Manual Style";
}
