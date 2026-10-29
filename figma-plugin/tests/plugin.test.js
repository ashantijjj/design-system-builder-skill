const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const pluginRoot = path.resolve(__dirname, "..");
const codeSource = fs.readFileSync(path.join(pluginRoot, "code.js"), "utf8");
const uiSource = fs.readFileSync(path.join(pluginRoot, "ui.html"), "utf8");
const packageJson = JSON.parse(fs.readFileSync(path.join(pluginRoot, "package.json"), "utf8"));
const semanticRules = JSON.parse(fs.readFileSync(path.join(pluginRoot, "rules/semantic-roles.json"), "utf8"));
const fontPresetRules = JSON.parse(fs.readFileSync(path.join(pluginRoot, "rules/font-presets.json"), "utf8"));
const verifiedSidecar = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/Batch-02-D01-v3-Gentle-Contour-verified-sidecar.json"), "utf8"));

function visibleSecondaryName(value) {
  return String(value || "")
    .replace(/[\u115F\u1160]/g, "")
    .replace(/\/\d{2} (?=[HSBC]\d\b)/g, "/");
}

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
  assert.equal(semanticRules.resources.typography["action.label"].large, "Body/B2");
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

test("font preset library exposes runtime role assignment and fixed secondary line heights", () => {
  const profiles = Object.values(fontPresetRules.profiles);
  const rejected = Object.values(fontPresetRules.rejected);
  assert.equal(fontPresetRules.schemaVersion, "google-font-presets/1.2.0");
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
  assert.equal(fontPresetRules.secondaryUsageSchema.schemaVersion, "secondary-levels/2.1.0");
  assert.equal(fontPresetRules.secondaryUsageSchema.selectionPolicy, "designer-controlled");
  assert.equal(fontPresetRules.secondaryUsageSchema.lineHeightPolicy, "fixed-preset");
  assert.deepEqual(fontPresetRules.roleAssignmentPolicy, {
    schemaVersion: "font-role-assignment/1.0.0",
    assignmentSource: "designer-input-position",
    runtimeGate: "figma-font-availability-and-load",
    legacyEligibilityFields: "recommendation-metadata-only",
  });
  assert.doesNotMatch(JSON.stringify(fontPresetRules), /recommendedLevels|minRecommendedSizePx|approvedLevels/);
  assert.deepEqual(fontPresetRules.secondaryUsageSchema.order, ["headline", "subtitle", "body", "caption"]);
  assert.equal(fontPresetRules.secondaryUsageSchema.levels.standard.headline[0].size, 38);
  assert.equal(fontPresetRules.secondaryUsageSchema.levels.standard.caption.at(-1).size, 10);
  assert.equal(fontPresetRules.secondaryUsageSchema.levels.large, undefined);
  assert.ok(fontPresetRules.sourceSnapshot.apiFieldsDeferred.includes("version"));
  assert.ok(fontPresetRules.sourceSnapshot.apiFieldsDeferred.includes("tags"));
});

test("UI has destructive notice and explicit rebuild confirmation", () => {
  assert.match(uiSource, /only used|0-1|0-1 project|0-1 项目/);
  assert.match(uiSource, /build-state/);
  assert.match(uiSource, /window\.confirm/);
  assert.doesNotMatch(uiSource, /approvedLevels|recommendedLevels|minRecommendedSizePx/);
  assert.doesNotMatch(uiSource, /PRIMARY_FONT_NOT_APPROVED|SECONDARY_FONT_NOT_APPROVED|未获批准作为主字体/);
  assert.match(uiSource, /data-font-role="primary"/);
  assert.match(uiSource, /data-font-role="secondary"/);
  assert.match(uiSource, /order: \["headline", "subtitle", "body", "caption"\]/);
  assert.match(uiSource, /data-field="level" value="\$\{level\}"/);
  assert.match(uiSource, /id="projectCode" maxlength="20"/);
  assert.match(uiSource, /placeholder="例如 OOG505"/);
});

test("UI displays the current package and generator version in the title", () => {
  const uiVersion = uiSource.match(/<span class="app-version">v([^<]+)<\/span>/)?.[1];
  const generatorVersion = codeSource.match(/const GENERATOR_VERSION = "([^"]+)";/)?.[1];
  assert.equal(uiVersion, packageJson.version);
  assert.equal(generatorVersion, packageJson.version);
  assert.equal(packageJson.version, "1.3.11");
});

test("Secondary usage starts with a Select All control and keeps its state synchronized", () => {
  const functionSource = uiSource.match(/function secondaryLevelOptions\([\s\S]*?\n      }\n\n      function changeSecondaryFontCount/)?.[0] || "";
  assert.match(functionSource, /return `<label class="secondary-level-select-all">[\s\S]*?data-field="level-all"[\s\S]*?<\/label>\$\{options\}`/);
  assert.match(functionSource, /> 全选<\/label>/);
  assert.match(uiSource, /levelInput\.checked = input\.checked/);
  assert.match(uiSource, /selectAll\.indeterminate = checkedCount > 0 && checkedCount < levelInputs\.length/);
  assert.match(uiSource, /data-field="level-all"/);
  assert.match(uiSource, /data-field="level"\]:checked/);
});

test("Project Code accepts safe text up to 20 characters and rejects special symbols", async () => {
  const mock = createFigmaMock();
  const hooks = await loadTestHooks(mock);
  for (const projectCode of ["睡眠日记 2026", "Project-01", "产品_01", "12345678901234567890"]) {
    const config = hooks.normalizeConfig({ ...standardConfig(), projectCode });
    assert.equal(config.projectCode, projectCode);
    assert.deepEqual(Array.from(hooks.validateConfig(config)), []);
  }
  const invalidCases = [
    ["", /不能为空/],
    ["   ", /不能为空/],
    ["Project@01", /只能包含/],
    ["项目/测试", /只能包含/],
    ["项目😀", /只能包含/],
    ["123456789012345678901", /不能超过 20/],
  ];
  for (const [projectCode, expected] of invalidCases) {
    const config = hooks.normalizeConfig({ ...standardConfig(), projectCode });
    assert.equal(config.projectCode, "");
    assert.match(hooks.validateConfig(config).join("\n"), expected);
  }
});

test("Unicode Project Code is preserved in variable prefixes and safe export filenames", async () => {
  const mock = createFigmaMock();
  const context = createVmContext(mock);
  vm.runInContext(codeSource, context, { filename: "code.js" });
  await mock.figma.ui.onmessage({ type: "ui-ready" });
  await mock.figma.ui.onmessage({ type: "generate", config: { ...standardConfig(), projectCode: "睡眠日记 2026" } });
  const success = mock.messages.find((message) => message.type === "success");
  assert.ok(success, mock.messages.map((message) => message.message).filter(Boolean).join("\n"));
  assert.ok(mock.variables.some((variable) => variable.name === "睡眠日记 2026/Brand/primary"));
  assert.deepEqual(Array.from(success.exports.files, (file) => file.filename), [
    "睡眠日记-2026-Design-System.md",
    "睡眠日记-2026-Design-System.json",
  ]);
});

test("Sidecar flows through manual Secondary selection into Standard and Large Manifest exports", async () => {
  const mock = createFigmaMock();
  addFontFamily(mock, "Manrope", ["Regular", "Medium", "Semi Bold", "Bold"]);
  addFontFamily(mock, "Fraunces", ["Regular", "Medium", "Semi Bold", "Bold"]);
  const hooks = await loadFontHooks(mock);
  const sidecar = plain(verifiedSidecar);
  sidecar.verifiedColorSystem.auxiliaries.push({
    name: "Dawn",
    kind: "gradient",
    gradientType: "Radial",
    start: "#E9DCC5",
    end: "#B7C8B0",
  });
  const { formPatch } = hooks.mapDirectionSidecar(sidecar);
  const imported = plain(hooks.applyDirectionSidecarPatchToBuilderConfig({
    ...standardConfig(),
    secondaryFonts: [
      { family: "Lora", levels: ["headline"] },
      { family: "Newsreader", levels: ["caption"] },
    ],
  }, formPatch));
  assert.deepEqual(imported.secondaryFonts, [{ family: "Fraunces", levels: [] }]);
  assert.deepEqual(imported.auxColors.at(-1), {
    name: "Dawn",
    kind: "gradient",
    value: "",
    gradientFrom: "#E9DCC5",
    gradientTo: "#B7C8B0",
    gradientDirection: "radial",
  });

  const levels = ["headline", "subtitle", "body", "caption"];
  for (const scale of ["standard", "large"]) {
    await mock.figma.ui.onmessage({
      type: "generate",
      config: {
        ...imported,
        typographyScale: scale,
        secondaryFonts: [{ family: "Fraunces", levels }],
      },
    });
    const success = mock.messages.filter((message) => message.type === "success").at(-1);
    assert.ok(success, mock.messages.map((message) => message.message).filter(Boolean).join("\n"));
    assert.equal(success.manifest.status, "valid");
    assert.equal(success.manifest.typography.scale.id, scale);
    assert.deepEqual(Array.from(success.manifest.typography.secondaryFonts[0].requestedLevels), levels);
    assert.deepEqual(Array.from(success.manifest.typography.secondaryFonts[0].generatedLevels), levels);
    assert.equal(success.manifest.typography.secondaryFonts[0].textStyleMapping.length, scale === "standard" ? 11 : 10);
    assert.equal(success.manifest.typography.secondaryFonts[0].warnings.length, 0);
    const markdown = visibleSecondaryName(success.exports.files.find((file) => file.filename.endsWith(".md")).content);
    const json = JSON.parse(success.exports.files.find((file) => file.filename.endsWith(".json")).content);
    assert.match(markdown, /Fraunces\/C3/);
    assert.ok(json.typography.some((style) => visibleSecondaryName(style.name) === "Fraunces/C3"));
    assert.ok(json.gradients.some((gradient) => gradient.name === "Auxiliary/gradient"));
  }
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
  assert.equal(manifest.schemaVersion, "1.3.0");
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
  assert.equal(mock.textStyles.some((style) => style.name === "Legacy Manual Style"), true);

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

test("legacy profile role eligibility does not block runtime role assignment", async () => {
  const mock = createFigmaMock();
  addFontFamily(mock, "Oswald", ["Regular", "Medium", "Semi Bold", "Bold"]);
  const hooks = await loadFontHooks(mock);
  hooks.fontPresetRules.profiles.oswald.eligibility.primaryUiEligible = false;
  hooks.fontPresetRules.profiles.oswald.eligibility.secondaryAccentEligible = false;
  hooks.fontPresetRules.profiles.inter.eligibility.secondaryEligible = false;
  const oswaldPrimary = hooks.validateFontRequest({ id: "primary", role: "primary", family: "Oswald", typographyScale: "standard" }, mock.fontStyles, true);
  assert.notEqual(oswaldPrimary.state, "error");
  assert.notEqual(oswaldPrimary.reasonCode, "PRIMARY_FONT_NOT_APPROVED");
  const interSecondary = hooks.validateFontRequest({ id: "secondary-0", role: "secondary", family: "Inter", levels: ["body"], typographyScale: "standard" }, mock.fontStyles, true);
  assert.notEqual(interSecondary.state, "error");
  assert.notEqual(interSecondary.reasonCode, "SECONDARY_FONT_NOT_APPROVED");
  assert.doesNotMatch(codeSource, /PRIMARY_FONT_NOT_APPROVED|SECONDARY_FONT_NOT_APPROVED/);

  await mock.figma.ui.onmessage({
    type: "generate",
    config: { ...standardConfig(), primaryFont: "Oswald", secondaryFonts: [{ family: "Inter", levels: ["body"] }] },
  });
  const success = mock.messages.find((message) => message.type === "success");
  assert.ok(success, mock.messages.map((message) => message.message).filter(Boolean).join("\n"));
  assert.equal(success.manifest.status, "valid");
  assert.equal(success.manifest.capabilities.componentReady, true);
  assert.equal(success.manifest.typography.primaryFont.profileUiEligible, undefined);
  assert.equal(success.manifest.typography.secondaryFonts[0].profileSecondaryEligible, undefined);
});

test("secondary level is required before config normalization", async () => {
  const mock = createFigmaMock();
  const hooks = await loadFontHooks(mock);
  const primary = hooks.validateFontRequest({ id: "primary", role: "primary", family: "", typographyScale: "standard" }, mock.fontStyles, true);
  assert.equal(primary.reasonCode, "PRIMARY_FONT_REQUIRED");
  assert.equal(primary.state, "error");
  assert.equal(primary.blocking, true);
  const known = hooks.validateFontRequest({ id: "secondary-0", role: "secondary", family: "Lora", levels: [] }, mock.fontStyles, true);
  assert.equal(known.reasonCode, "SECONDARY_USE_REQUIRED");
  const manual = hooks.validateFontRequest({ id: "secondary-0", role: "secondary", family: "Manual Font", levels: [] }, mock.fontStyles, true);
  assert.equal(manual.reasonCode, "SECONDARY_USE_REQUIRED");
  const normalized = hooks.normalizeConfig({ ...standardConfig(), secondaryFonts: [{ family: "Lora", levels: [] }] });
  assert.deepEqual(Array.from(normalized.secondaryFonts, (font) => ({ family: font.family, levels: Array.from(font.levels) })), [{ family: "Lora", levels: [] }]);
});

test("known secondary can select and generate every H/S/B/C level", async () => {
  const mock = createFigmaMock();
  addFontFamily(mock, "Lora", ["Regular", "Medium", "Semi Bold", "Bold"]);
  const hooks = await loadFontHooks(mock);
  const levels = ["headline", "subtitle", "body", "caption"];
  const result = hooks.validateFontRequest({ id: "secondary-0", role: "secondary", family: "Lora", levels, typographyScale: "standard" }, mock.fontStyles, true);
  assert.ok(["valid", "normalized", "fallback"].includes(result.state));
  assert.equal(result.blocking, false);
  assert.equal(result.levelMode, "profile");

  const profile = fontPresetRules.profiles.lora;
  const tokens = hooks.secondaryTypographyTokensForProfile(
    { family: "Lora", levels },
    0,
    hooks.typographyDefinitions("standard"),
    profile,
    "standard",
  );
  assert.ok(tokens.some((token) => visibleSecondaryName(token.name).endsWith("/S1")));
  assert.ok(tokens.some((token) => visibleSecondaryName(token.name).endsWith("/B1")));
  assert.ok(tokens.some((token) => visibleSecondaryName(token.name).endsWith("/C1")));
});

test("Standard Primary stays complete and Secondary uses visible numeric paths", async () => {
  const mock = createFigmaMock();
  const hooks = await loadFontHooks(mock);
  const standard = plain(hooks.typographyDefinitions("standard"));
  assert.deepEqual(standard.map(({ name, weightRole, size, line, spacing }) => ({ name, weightRole, size, line, spacing })), [
    { name: "Headline/H1", weightRole: "strong", size: 36, line: 44, spacing: 0 },
    { name: "Headline/H2", weightRole: "strong", size: 32, line: 40, spacing: 0 },
    { name: "Headline/H3", weightRole: "strong", size: 28, line: 36, spacing: 0 },
    { name: "Headline/H4", weightRole: "strong", size: 26, line: 34, spacing: 0 },
    { name: "Headline/H5", weightRole: "strong", size: 24, line: 32, spacing: 0 },
    { name: "Subtitle/S1", weightRole: "emphasis", size: 16, line: 24, spacing: 0 },
    { name: "Subtitle/S2", weightRole: "emphasis", size: 15, line: 22, spacing: 0 },
    { name: "Body/B1", weightRole: "baseUi", size: 16, line: 24, spacing: 0 },
    { name: "Body/B2", weightRole: "emphasis", size: 16, line: 24, spacing: 0 },
    { name: "Body/B3", weightRole: "baseUi", size: 14, line: 20, spacing: 0 },
    { name: "Body/B4", weightRole: "emphasis", size: 14, line: 20, spacing: 0 },
    { name: "Caption/C1", weightRole: "baseUi", size: 12, line: 16, spacing: 0 },
    { name: "Caption/C2", weightRole: "emphasis", size: 12, line: 16, spacing: 0 },
    { name: "Caption/C3", weightRole: "baseUi", size: 10, line: 14, spacing: 0 },
  ]);

  const secondary = plain(hooks.secondaryTypographyTokensForProfile(
    { family: "Lora", levels: ["headline", "subtitle", "body", "caption"] },
    0,
    hooks.typographyDefinitions("standard"),
    hooks.fontPresetRules.profiles.lora,
    "standard",
  ));
  assert.deepEqual(secondary.map(({ name, size, line }) => ({ name: visibleSecondaryName(name), size, line })), [
    { name: "Lora/H1", size: 38, line: 44 },
    { name: "Lora/H2", size: 34, line: 40 },
    { name: "Lora/H3", size: 30, line: 36 },
    { name: "Lora/H4", size: 26, line: 32 },
    { name: "Lora/S1", size: 24, line: 32 },
    { name: "Lora/S2", size: 20, line: 28 },
    { name: "Lora/B1", size: 18, line: 28 },
    { name: "Lora/B2", size: 16, line: 24 },
    { name: "Lora/C1", size: 14, line: 20 },
    { name: "Lora/C2", size: 12, line: 16 },
    { name: "Lora/C3", size: 10, line: 14 },
  ]);
  const expectedVisibleOrder = ["Lora/H1", "Lora/H2", "Lora/H3", "Lora/H4", "Lora/S1", "Lora/S2", "Lora/B1", "Lora/B2", "Lora/C1", "Lora/C2", "Lora/C3"];
  assert.deepEqual(secondary.map((token) => token.name).sort().map(visibleSecondaryName), expectedVisibleOrder);
  assert.deepEqual(secondary.map((token) => token.name).sort((left, right) => left.localeCompare(right, undefined, { numeric: true })).map(visibleSecondaryName), expectedVisibleOrder);
});

test("Standard generation restores Body/B2, cleans legacy Secondary paths, and synchronizes exports", async () => {
  const mock = createFigmaMock();
  addFontFamily(mock, "DM Sans", ["Regular", "Medium", "Semi Bold", "Bold"]);
  addFontFamily(mock, "Fraunces", ["Regular", "Medium", "Semi Bold", "Bold"]);
  const legacySecondaryNames = [
    "Fraunces/Headline/H1", "Fraunces/Headline/H2", "Fraunces/Headline/H3", "Fraunces/Headline/H4", "Fraunces/Headline/H5",
    "Fraunces/Subtitle/S1", "Fraunces/Subtitle/S2", "Fraunces/Body/B1", "Fraunces/Body/B2",
    "Fraunces/Caption/C1", "Fraunces/Caption/C2", "Fraunces/Caption/C3",
    "Fraunces/H1", "Fraunces/H2", "Fraunces/H3", "Fraunces/H4", "Fraunces/S1", "Fraunces/S2",
    "Fraunces/B1", "Fraunces/B2", "Fraunces/C1", "Fraunces/C2", "Fraunces/C3",
    "Fraunces/01 H1", "Fraunces/02 H2", "Fraunces/03 H3", "Fraunces/04 H4",
    "Fraunces/05 S1", "Fraunces/06 S2", "Fraunces/07 B1", "Fraunces/08 B2",
    "Fraunces/09 C1", "Fraunces/10 C2", "Fraunces/11 C3",
  ];
  legacySecondaryNames.forEach((name) => { mock.createStyle("TextStyle", mock.textStyles).name = name; });
  mock.createStyle("TextStyle", mock.textStyles).name = "User/Custom";
  const context = createVmContext(mock);
  vm.runInContext(codeSource, context, { filename: "code.js" });
  await mock.figma.ui.onmessage({ type: "ui-ready" });
  const config = {
    ...standardConfig(),
    typographyScale: "standard",
    primaryFont: "DM Sans",
    secondaryFonts: [{ family: "Fraunces", levels: ["headline", "subtitle", "body", "caption"] }],
  };
  await mock.figma.ui.onmessage({ type: "generate", config });
  const success = mock.messages.filter((message) => message.type === "success").at(-1);
  assert.ok(success, mock.messages.map((message) => message.message).filter(Boolean).join("\n"));

  const primaryStyles = mock.textStyles.filter((style) => /^(Headline|Subtitle|Body|Caption)\//.test(style.name));
  assert.equal(primaryStyles.length, 14);
  const bodyB2 = primaryStyles.find((style) => style.name === "Body/B2");
  assert.ok(bodyB2);
  assert.equal(bodyB2.fontSize, 16);
  assert.equal(bodyB2.lineHeight.value, 24);
  assert.equal(bodyB2.lineHeight.unit, "PIXELS");
  assert.equal(bodyB2.fontName.style, "Semi Bold");

  const expectedSecondaryNames = [
    "Fraunces/H1", "Fraunces/H2", "Fraunces/H3", "Fraunces/H4",
    "Fraunces/S1", "Fraunces/S2", "Fraunces/B1", "Fraunces/B2",
    "Fraunces/C1", "Fraunces/C2", "Fraunces/C3",
  ];
  const secondaryNames = mock.textStyles.map((style) => visibleSecondaryName(style.name)).filter((name) => name.startsWith("Fraunces/"));
  assert.deepEqual([...secondaryNames].sort(), [...expectedSecondaryNames].sort());
  assert.equal(secondaryNames.some((name) => /^Fraunces\/(?:Headline|Subtitle|Body|Caption)\//.test(name)), false);
  assert.equal(secondaryNames.some((name) => /^Fraunces\/\d{2} [HSBC]\d$/.test(name)), false);
  assert.equal(mock.textStyles.some((style) => style.name === "User/Custom"), true);

  const secondaryManifest = success.manifest.typography.secondaryFonts[0];
  assert.deepEqual(Array.from(secondaryManifest.requestedLevels), ["headline", "subtitle", "body", "caption"]);
  assert.deepEqual(Array.from(secondaryManifest.generatedLevels), ["headline", "subtitle", "body", "caption"]);
  assert.deepEqual(Array.from(secondaryManifest.textStyleMapping, (mapping) => mapping.stylePath), [
    "Fraunces/01 H1", "Fraunces/02 H2", "Fraunces/03 H3", "Fraunces/04 H4",
    "Fraunces/05 S1", "Fraunces/06 S2", "Fraunces/07 B1", "Fraunces/08 B2",
    "Fraunces/09 C1", "Fraunces/10 C2", "Fraunces/11 C3",
  ]);
  assert.deepEqual(Array.from(secondaryManifest.textStyleMapping, (mapping) => visibleSecondaryName(mapping.stylePath)), expectedSecondaryNames);
  assert.equal(success.manifest.resources.typography["action.label"].stylePath, "Subtitle/S1");
  assert.equal(success.manifest.typography.usageMapping["typography.buttonLabel"], "Subtitle/S1");
  assert.equal(success.manifest.typography.usageMapping["typography.tabLabel"], "Subtitle/S1");

  const rawMarkdown = success.exports.files.find((file) => file.filename.endsWith(".md")).content;
  const rawJsonSource = success.exports.files.find((file) => file.filename.endsWith(".json")).content;
  const markdown = visibleSecondaryName(rawMarkdown);
  const jsonSource = visibleSecondaryName(rawJsonSource);
  assert.match(rawMarkdown, /Fraunces\/01 H1/);
  assert.match(rawJsonSource, /Fraunces\/11 C3/);
  assert.match(markdown, /Fraunces\/H1/);
  assert.match(markdown, /Fraunces\/C3/);
  assert.doesNotMatch(markdown, /Fraunces\/Headline\/H1/);
  assert.doesNotMatch(markdown, /Fraunces\/\d{2} [HSBC]\d/);
  assert.match(jsonSource, /Fraunces\/B2/);
  assert.doesNotMatch(jsonSource, /Fraunces\/Body\/B2/);

  await mock.figma.ui.onmessage({ type: "generate", config });
  const regeneratedNames = mock.textStyles.map((style) => visibleSecondaryName(style.name));
  assert.equal(new Set(regeneratedNames).size, regeneratedNames.length);
  assert.equal(regeneratedNames.filter((name) => name === "Body/B2").length, 1);
  assert.equal(regeneratedNames.filter((name) => name === "Fraunces/H1").length, 1);
});

test("Standard Secondary keeps fixed numeric token paths for partial level selection", async () => {
  const mock = createFigmaMock();
  addFontFamily(mock, "Fraunces", ["Regular", "Medium", "Semi Bold", "Bold"]);
  const context = createVmContext(mock);
  vm.runInContext(codeSource, context, { filename: "code.js" });
  await mock.figma.ui.onmessage({ type: "ui-ready" });
  await mock.figma.ui.onmessage({
    type: "generate",
    config: { ...standardConfig(), secondaryFonts: [{ family: "Fraunces", levels: ["subtitle", "caption"] }] },
  });
  const success = mock.messages.find((message) => message.type === "success");
  assert.ok(success, mock.messages.map((message) => message.message).filter(Boolean).join("\n"));
  assert.deepEqual(
    mock.textStyles.map((style) => visibleSecondaryName(style.name)).filter((name) => name.startsWith("Fraunces/")).sort(),
    ["Fraunces/C1", "Fraunces/C2", "Fraunces/C3", "Fraunces/S1", "Fraunces/S2"],
  );
});

test("Large Primary uses the exact mobile-focused 12-style scale", async () => {
  const mock = createFigmaMock();
  const hooks = await loadFontHooks(mock);
  const large = plain(hooks.typographyDefinitions("large"));
  assert.deepEqual(large.map(({ name, weightRole, size, line }) => ({ name, weightRole, size, line })), [
    { name: "Headline/H1", weightRole: "strong", size: 36, line: 44 },
    { name: "Headline/H2", weightRole: "strong", size: 32, line: 40 },
    { name: "Headline/H3", weightRole: "strong", size: 28, line: 36 },
    { name: "Subtitle/S1", weightRole: "emphasis", size: 26, line: 34 },
    { name: "Subtitle/S2", weightRole: "emphasis", size: 24, line: 32 },
    { name: "Body/B1", weightRole: "baseUi", size: 20, line: 30 },
    { name: "Body/B2", weightRole: "emphasis", size: 20, line: 30 },
    { name: "Body/B3", weightRole: "baseUi", size: 18, line: 24 },
    { name: "Body/B4", weightRole: "emphasis", size: 18, line: 24 },
    { name: "Caption/C1", weightRole: "baseUi", size: 16, line: 24 },
    { name: "Caption/C2", weightRole: "emphasis", size: 14, line: 20 },
    { name: "Caption/C3", weightRole: "baseUi", size: 12, line: 18 },
  ]);
  assert.equal(large.length, 12);
  assert.equal(large.some((definition) => ["Headline/H4", "Headline/H5"].includes(definition.name)), false);
  assert.equal(large.some((definition) => definition.size === 40), false);
});

test("Large Primary Body/B3 and Body/B4 generate 18/24 without changing secondary output", async () => {
  const mock = createFigmaMock();
  addFontFamily(mock, "DM Sans", ["Regular", "Medium", "Semi Bold", "Bold"]);
  addFontFamily(mock, "Fraunces", ["Regular", "Medium", "Semi Bold", "Bold"]);
  addFontFamily(mock, "Poppins", ["Regular", "Medium", "Semi Bold", "Bold"]);
  const context = createVmContext(mock);
  vm.runInContext(codeSource, context, { filename: "code.js" });
  await mock.figma.ui.onmessage({ type: "ui-ready" });
  const config = {
    ...standardConfig(),
    projectCode: "OOG140",
    typographyScale: "large",
    primaryFont: "DM Sans",
    typographyOutput: "token-style",
    secondaryFonts: [{ family: "Fraunces", levels: ["headline", "subtitle", "body", "caption"] }],
  };
  await mock.figma.ui.onmessage({ type: "generate", config });
  const success = mock.messages.filter((message) => message.type === "success").at(-1);
  assert.ok(success, mock.messages.map((message) => message.message).filter(Boolean).join("\n"));

  const primary = Object.fromEntries(mock.textStyles.filter((style) => /^(Headline|Subtitle|Body|Caption)\//.test(style.name)).map((style) => [style.name, style]));
  assert.equal(Object.keys(primary).length, 12);
  assert.equal(primary["Body/B3"].fontSize, 18);
  assert.equal(primary["Body/B3"].fontName.style, "Medium");
  assert.equal(primary["Body/B3"].lineHeight.value, 24);
  assert.equal(primary["Body/B3"].lineHeight.unit, "PIXELS");
  assert.equal(primary["Body/B4"].fontSize, 18);
  assert.equal(primary["Body/B4"].fontName.style, "Semi Bold");
  assert.equal(primary["Body/B4"].lineHeight.value, 24);
  assert.equal(primary["Body/B4"].lineHeight.unit, "PIXELS");
  assert.equal(primary["Body/B1"].fontSize, 20);
  assert.equal(primary["Body/B1"].lineHeight.value, 30);
  assert.equal(primary["Body/B2"].fontSize, 20);
  assert.equal(primary["Body/B2"].lineHeight.value, 30);
  assert.equal(success.manifest.resources.typography["action.label"].stylePath, "Body/B2");

  const secondary = mock.textStyles.filter((style) => style.name.startsWith("Fraunces/"));
  assert.equal(secondary.length, 10);
  assert.deepEqual(secondary.filter((style) => /B[12]$/.test(style.name)).map((style) => [style.name, style.fontSize, style.lineHeight.value]), [
    ["Fraunces/06 B1", 20, 30],
    ["Fraunces/07 B2", 20, 30],
  ]);
  assert.equal(secondary.some((style) => style.fontSize === 18), false);

  function variableValue(name) {
    const variable = mock.variables.find((item) => item.name === name);
    assert.ok(variable, name);
    return Object.values(variable.valuesByMode)[0];
  }
  for (const token of ["Body/B3", "Body/B4"]) {
    const style = primary[token];
    assert.equal(variableValue(`OOG140/Typography/${token}/size`), style.fontSize);
    assert.equal(variableValue(`OOG140/Typography/${token}/line`), style.lineHeight.value);
    const signature = JSON.parse(success.manifest.typography.textStyles[token].signature);
    assert.equal(signature.fontSize, style.fontSize);
    assert.equal(signature.lineHeight.unit, "PIXELS");
    assert.equal(signature.lineHeight.value, style.lineHeight.value);
  }
  assert.equal(variableValue("OOG140/Typography/Body/B1/line"), 30);
  assert.equal(variableValue("OOG140/Typography/Body/B2/line"), 30);
  assert.equal(variableValue("OOG140/Typography/Fraunces/06 B1/line"), 30);
  assert.equal(variableValue("OOG140/Typography/Fraunces/07 B2/line"), 30);

  const exported = JSON.parse(success.exports.files.find((file) => file.filename.endsWith(".json")).content);
  const markdown = success.exports.files.find((file) => file.filename.endsWith(".md")).content;
  for (const token of ["Body/B3", "Body/B4"]) {
    const style = primary[token];
    const row = exported.typography.find((item) => item.name === token);
    assert.equal(row.size, style.fontSize);
    assert.equal(row.weight, style.fontName.style);
    assert.equal(row.lineHeight.unit, "PIXELS");
    assert.equal(row.lineHeight.value, style.lineHeight.value);
  }
  assert.match(markdown, /`Body\/B3` \| DM Sans \| Medium \| 18px \/ 24px/);
  assert.match(markdown, /`Body\/B4` \| DM Sans \| Semi Bold \| 18px \/ 24px/);
  assert.match(markdown, /`Fraunces\/06 B1` \| Fraunces \| Medium \| 20px \/ 30px/);
  assert.match(markdown, /`Fraunces\/07 B2` \| Fraunces \| Semi Bold \| 20px \/ 30px/);

  const hooks = await loadFontHooks(mock);
  const standardPrimary = plain(hooks.typographyDefinitions("standard"));
  assert.deepEqual(standardPrimary.filter((item) => item.name.startsWith("Body/")).map(({ name, size, line }) => ({ name, size, line })), [
    { name: "Body/B1", size: 16, line: 24 },
    { name: "Body/B2", size: 16, line: 24 },
    { name: "Body/B3", size: 14, line: 20 },
    { name: "Body/B4", size: 14, line: 20 },
  ]);
  const standardSecondary = plain(hooks.secondaryTypographyTokensForProfile(
    { family: "Fraunces", levels: ["body"] },
    0,
    hooks.typographyDefinitions("standard"),
    hooks.fontPresetRules.profiles.fraunces,
    "standard",
  ));
  assert.deepEqual(standardSecondary.map(({ name, size, line }) => ({ name, size, line })), [
    { name: "Fraunces/07 B1", size: 18, line: 28 },
    { name: "Fraunces/08 B2", size: 16, line: 24 },
  ]);

  const poppinsMock = createFigmaMock();
  addFontFamily(poppinsMock, "Poppins", ["Regular", "Medium", "Semi Bold", "Bold"]);
  const poppinsContext = createVmContext(poppinsMock);
  vm.runInContext(codeSource, poppinsContext, { filename: "code.js" });
  await poppinsMock.figma.ui.onmessage({ type: "ui-ready" });
  await poppinsMock.figma.ui.onmessage({ type: "generate", config: { ...standardConfig(), typographyScale: "large", primaryFont: "Poppins" } });
  const poppinsSuccess = poppinsMock.messages.find((message) => message.type === "success");
  assert.ok(poppinsSuccess, poppinsMock.messages.map((message) => message.message).filter(Boolean).join("\n"));
  for (const name of ["Body/B3", "Body/B4"]) {
    const style = poppinsMock.textStyles.find((item) => item.name === name);
    assert.equal(style.fontSize, 18);
    assert.equal(style.lineHeight.value, 24);
    assert.equal(style.lineHeight.unit, "PIXELS");
  }
});

test("Large Secondary inherits canonical values and uses visible numeric paths", async () => {
  const mock = createFigmaMock();
  const hooks = await loadFontHooks(mock);
  const tokens = plain(hooks.secondaryTypographyTokensForProfile(
    { family: "Fraunces", levels: ["headline", "subtitle", "body", "caption"] },
    0,
    hooks.typographyDefinitions("large"),
    hooks.fontPresetRules.profiles.fraunces,
    "large",
  ));
  assert.deepEqual(tokens.map(({ name, semanticToken, size, line }) => ({ name: visibleSecondaryName(name), semanticToken, size, line })), [
    { name: "Fraunces/H1", semanticToken: "H1", size: 36, line: 44 },
    { name: "Fraunces/H2", semanticToken: "H2", size: 32, line: 40 },
    { name: "Fraunces/H3", semanticToken: "H3", size: 28, line: 36 },
    { name: "Fraunces/S1", semanticToken: "S1", size: 26, line: 34 },
    { name: "Fraunces/S2", semanticToken: "S2", size: 24, line: 32 },
    { name: "Fraunces/B1", semanticToken: "B1", size: 20, line: 30 },
    { name: "Fraunces/B2", semanticToken: "B2", size: 20, line: 30 },
    { name: "Fraunces/C1", semanticToken: "C1", size: 16, line: 24 },
    { name: "Fraunces/C2", semanticToken: "C2", size: 14, line: 20 },
    { name: "Fraunces/C3", semanticToken: "C3", size: 12, line: 18 },
  ]);
  const expectedVisibleOrder = ["Fraunces/H1", "Fraunces/H2", "Fraunces/H3", "Fraunces/S1", "Fraunces/S2", "Fraunces/B1", "Fraunces/B2", "Fraunces/C1", "Fraunces/C2", "Fraunces/C3"];
  assert.deepEqual(tokens.map((token) => token.name).sort().map(visibleSecondaryName), expectedVisibleOrder);
  assert.deepEqual(tokens.map((token) => token.name).sort((left, right) => left.localeCompare(right, undefined, { numeric: true })).map(visibleSecondaryName), expectedVisibleOrder);
  assert.equal(tokens.some((token) => token.semanticToken === "H4" || token.size === 40), false);
});

test("Large generation cleans legacy paths, preserves user styles, and synchronizes Manifest and exports", async () => {
  const mock = createFigmaMock();
  addFontFamily(mock, "DM Sans", ["Regular", "Medium", "Semi Bold", "Bold"]);
  addFontFamily(mock, "Fraunces", ["Regular", "Medium", "Semi Bold", "Bold"]);
  const legacySecondaryNames = [
    "Fraunces/Headline/H1", "Fraunces/Headline/H2", "Fraunces/Headline/H3", "Fraunces/Headline/H4", "Fraunces/Headline/H5",
    "Fraunces/Subtitle/S1", "Fraunces/Subtitle/S2",
    "Fraunces/Body/B1", "Fraunces/Body/B2", "Fraunces/Body/B3", "Fraunces/Body/B4",
    "Fraunces/Caption/C1", "Fraunces/Caption/C2", "Fraunces/Caption/C3",
    "Fraunces/H1", "Fraunces/H2", "Fraunces/H3", "Fraunces/H4", "Fraunces/H5", "Fraunces/S1", "Fraunces/S2",
    "Fraunces/B1", "Fraunces/B2", "Fraunces/B3", "Fraunces/B4", "Fraunces/C1", "Fraunces/C2", "Fraunces/C3",
    "Fraunces/01 H1", "Fraunces/02 H2", "Fraunces/03 H3", "Fraunces/04 S1", "Fraunces/05 S2",
    "Fraunces/06 B1", "Fraunces/07 B2", "Fraunces/08 C1", "Fraunces/09 C2", "Fraunces/10 C3",
    "Fraunces/97 B4", "Fraunces/98 B3", "Fraunces/99 H5",
    "Headline/H4", "Headline/H5",
  ];
  const garbledSecondaryNames = [
    "Fraunces/\u200B\u200C01 H1",
    "Fraunces/\u115F\u1160H1",
    "Fraunces/\u202AHeadline/H1\u202C",
    "Fraunces/Bo\u0332dy/B1",
    "Fraunces/\u200BBody/B4",
  ];
  legacySecondaryNames.push(...garbledSecondaryNames);
  legacySecondaryNames.forEach((name) => { mock.createStyle("TextStyle", mock.textStyles).name = name; });
  mock.createStyle("TextStyle", mock.textStyles).name = "User/Custom";
  const context = createVmContext(mock);
  vm.runInContext(codeSource, context, { filename: "code.js" });
  await mock.figma.ui.onmessage({ type: "ui-ready" });
  const config = {
    ...standardConfig(),
    projectCode: "OOG140",
    typographyScale: "large",
    primaryFont: "DM Sans",
    secondaryFonts: [{ family: "Fraunces", levels: ["headline", "subtitle", "body", "caption"] }],
  };
  await mock.figma.ui.onmessage({ type: "generate", config });
  const success = mock.messages.filter((message) => message.type === "success").at(-1);
  assert.ok(success, mock.messages.map((message) => message.message).filter(Boolean).join("\n"));
  assert.equal(success.manifest.status, "valid");
  assert.equal(success.manifest.capabilities.componentReady, true);

  const primaryNames = mock.textStyles.map((style) => style.name).filter((name) => /^(Headline|Subtitle|Body|Caption)\//.test(name));
  assert.equal(primaryNames.length, 12);
  assert.equal(primaryNames.includes("Headline/H4"), false);
  assert.equal(primaryNames.includes("Headline/H5"), false);
  const secondaryNames = mock.textStyles.map((style) => visibleSecondaryName(style.name)).filter((name) => name.startsWith("Fraunces/"));
  assert.deepEqual(secondaryNames.sort(), ["Fraunces/B1", "Fraunces/B2", "Fraunces/C1", "Fraunces/C2", "Fraunces/C3", "Fraunces/H1", "Fraunces/H2", "Fraunces/H3", "Fraunces/S1", "Fraunces/S2"]);
  assert.equal(mock.textStyles.some((style) => /^Fraunces\/(?:Headline|Subtitle|Body|Caption)\//.test(style.name)), false);
  assert.equal(legacySecondaryNames.filter((name) => /^(?:Fraunces\/(?:Headline|Subtitle|Body|Caption)\/|Fraunces\/(?:H|S|B|C)\d$)/.test(name)).some((name) => mock.textStyles.some((style) => style.name === name)), false);
  assert.equal(garbledSecondaryNames.some((name) => mock.textStyles.some((style) => style.name === name)), false);
  assert.equal(mock.textStyles.some((style) => style.name === "User/Custom"), true);

  const secondaryManifest = success.manifest.typography.secondaryFonts[0];
  assert.deepEqual(Array.from(secondaryManifest.requestedLevels), ["headline", "subtitle", "body", "caption"]);
  assert.deepEqual(Array.from(secondaryManifest.generatedLevels), ["headline", "subtitle", "body", "caption"]);
  assert.deepEqual(Array.from(secondaryManifest.textStyleMapping, (mapping) => mapping.semanticToken), ["H1", "H2", "H3", "S1", "S2", "B1", "B2", "C1", "C2", "C3"]);
  assert.deepEqual(Array.from(secondaryManifest.textStyleMapping, (mapping) => mapping.stylePath), [
    "Fraunces/01 H1", "Fraunces/02 H2", "Fraunces/03 H3", "Fraunces/04 S1", "Fraunces/05 S2",
    "Fraunces/06 B1", "Fraunces/07 B2", "Fraunces/08 C1", "Fraunces/09 C2", "Fraunces/10 C3",
  ]);
  assert.ok(secondaryManifest.textStyleMapping.every((mapping) => /^Fraunces\/[HSBC]\d$/.test(visibleSecondaryName(mapping.stylePath))));
  assert.equal(success.manifest.resources.typography["action.label"].stylePath, "Body/B2");
  assert.equal(success.manifest.typography.usageMapping["typography.buttonLabel"], "Body/B2");

  const rawMarkdown = success.exports.files.find((file) => file.filename.endsWith(".md")).content;
  const rawJsonSource = success.exports.files.find((file) => file.filename.endsWith(".json")).content;
  const markdown = visibleSecondaryName(rawMarkdown);
  const jsonSource = visibleSecondaryName(rawJsonSource);
  const exported = JSON.parse(jsonSource);
  assert.match(rawMarkdown, /Fraunces\/01 H1/);
  assert.match(rawJsonSource, /Fraunces\/10 C3/);
  assert.match(markdown, /Fraunces\/H1/);
  assert.doesNotMatch(markdown, /Fraunces\/Headline\/H1/);
  assert.match(jsonSource, /Fraunces\/H1/);
  assert.doesNotMatch(jsonSource, /Fraunces\/Headline\/H1/);
  assert.ok(exported.typography.some((style) => style.name === "Fraunces/H1"));
  assert.equal(exported.typography.some((style) => style.size === 40 || /Headline\/H[45]$/.test(style.name)), false);

  await mock.figma.ui.onmessage({ type: "generate", config });
  const regeneratedNames = mock.textStyles.map((style) => visibleSecondaryName(style.name));
  assert.equal(new Set(regeneratedNames).size, regeneratedNames.length);
  assert.equal(regeneratedNames.filter((name) => name === "Fraunces/H1").length, 1);
  assert.equal(regeneratedNames.some((name) => /^Fraunces\/(?:Headline|Subtitle|Body|Caption)\//.test(name)), false);
  assert.equal(regeneratedNames.includes("User/Custom"), true);
});

test("Large Secondary keeps fixed numeric token paths when only Body and Caption are selected", async () => {
  const mock = createFigmaMock();
  addFontFamily(mock, "Fraunces", ["Regular", "Medium", "Semi Bold", "Bold"]);
  const context = createVmContext(mock);
  vm.runInContext(codeSource, context, { filename: "code.js" });
  await mock.figma.ui.onmessage({ type: "ui-ready" });
  await mock.figma.ui.onmessage({
    type: "generate",
    config: { ...standardConfig(), typographyScale: "large", secondaryFonts: [{ family: "Fraunces", levels: ["body", "caption"] }] },
  });
  const success = mock.messages.find((message) => message.type === "success");
  assert.ok(success, mock.messages.map((message) => message.message).filter(Boolean).join("\n"));
  const names = mock.textStyles.map((style) => visibleSecondaryName(style.name)).filter((name) => name.startsWith("Fraunces/"));
  assert.deepEqual(names, ["Fraunces/B1", "Fraunces/B2", "Fraunces/C1", "Fraunces/C2", "Fraunces/C3"]);
  const secondary = success.manifest.typography.secondaryFonts[0];
  assert.deepEqual(Array.from(secondary.requestedLevels), ["body", "caption"]);
  assert.deepEqual(Array.from(secondary.generatedLevels), ["body", "caption"]);
  assert.deepEqual(Array.from(secondary.textStyleMapping, (mapping) => mapping.semanticToken), ["B1", "B2", "C1", "C2", "C3"]);
});

test("Secondary style names use visible numeric ordering and contain no invisible characters", async () => {
  const mock = createFigmaMock();
  const hooks = await loadFontHooks(mock);
  const expected = {
    standard: ["Fraunces/01 H1", "Fraunces/02 H2", "Fraunces/03 H3", "Fraunces/04 H4", "Fraunces/05 S1", "Fraunces/06 S2", "Fraunces/07 B1", "Fraunces/08 B2", "Fraunces/09 C1", "Fraunces/10 C2", "Fraunces/11 C3"],
    large: ["Fraunces/01 H1", "Fraunces/02 H2", "Fraunces/03 H3", "Fraunces/04 S1", "Fraunces/05 S2", "Fraunces/06 B1", "Fraunces/07 B2", "Fraunces/08 C1", "Fraunces/09 C2", "Fraunces/10 C3"],
  };
  for (const scale of ["standard", "large"]) {
    const tokens = plain(hooks.secondaryTypographyTokensForProfile(
      { family: "Fraunces", levels: ["headline", "subtitle", "body", "caption"] },
      0,
      hooks.typographyDefinitions(scale),
      hooks.fontPresetRules.profiles.fraunces,
      scale,
    ));
    assert.deepEqual(tokens.map(({ name }) => name), expected[scale]);
    for (const name of expected[scale]) {
      assert.doesNotMatch(name, /[\p{Cc}\p{Cf}\p{M}]/u);
      assert.doesNotMatch(name, /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/u);
      assert.match(name, /^Fraunces\/\d{2} [HSBC]\d$/);
    }
  }
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

test("secondary manifest records requested/generated levels, actual mappings, and warnings", async () => {
  const mock = createFigmaMock();
  addFontFamily(mock, "Lora", ["Regular", "Medium", "Semi Bold", "Bold"]);
  const context = createVmContext(mock);
  vm.runInContext(codeSource, context, { filename: "code.js" });
  await mock.figma.ui.onmessage({ type: "ui-ready" });
  const levels = ["headline", "subtitle", "body", "caption"];
  await mock.figma.ui.onmessage({ type: "generate", config: { ...standardConfig(), secondaryFonts: [{ family: "Lora", levels }] } });
  const success = mock.messages.find((message) => message.type === "success");
  assert.ok(success, mock.messages.map((message) => message.message).filter(Boolean).join("\n"));
  const secondary = success.manifest.typography.secondaryFonts[0];
  assert.equal(secondary.profileId, "lora");
  assert.deepEqual(Array.from(secondary.requestedLevels), levels);
  assert.deepEqual(Array.from(secondary.generatedLevels), levels);
  assert.equal(secondary.approvedLevels, undefined);
  assert.equal(secondary.textStyleMapping.length, 11);
  assert.ok(secondary.textStyleMapping.every((mapping) => mapping.level && mapping.requestedStylePath && mapping.stylePath));
  assert.deepEqual(Array.from(secondary.warnings), []);
  assert.ok(mock.textStyles.some((style) => visibleSecondaryName(style.name).endsWith("/S1")));
  assert.ok(mock.textStyles.some((style) => visibleSecondaryName(style.name).endsWith("/B1")));
  assert.ok(mock.textStyles.some((style) => visibleSecondaryName(style.name).endsWith("/C3")));
});

test("legacy approvedLevels and minRecommendedSizePx do not affect validation or style generation", async () => {
  const mock = createFigmaMock();
  addFontFamily(mock, "Lora", ["Regular", "Medium", "Semi Bold", "Bold"]);
  const hooks = await loadFontHooks(mock);
  const profile = hooks.fontPresetRules.profiles.lora;
  profile.mappings.secondary.approvedLevels = ["headline"];
  profile.mappings.secondary.recommendedLevels = ["headline"];
  profile.mappings.secondary.headline.minRecommendedSizePx = 100;
  const validation = hooks.validateFontRequest({ id: "secondary-0", role: "secondary", family: "Lora", levels: ["subtitle", "body", "caption"], typographyScale: "standard" }, mock.fontStyles, true);
  assert.notEqual(validation.state, "error");
  assert.notEqual(validation.state, "suggestion");
  const standard = hooks.secondaryTypographyTokensForProfile(
    { family: profile.family, levels: ["headline", "subtitle", "body", "caption"] },
    0,
    hooks.typographyDefinitions("standard"),
    profile,
    "standard",
  );
  assert.equal(standard.length, 11);
  assert.ok(standard.every((token) => token.skipReasonCode === undefined));
});

test("handwriting metadata produces only a non-blocking review warning and keeps fixed base line heights", async () => {
  const mock = createFigmaMock();
  addFontFamily(mock, "Grandstander", ["Regular", "Medium", "Semi Bold", "Bold"]);
  addFontFamily(mock, "Manual Handwriting Script", ["Regular", "Medium", "Semi Bold", "Bold"]);
  const hooks = await loadFontHooks(mock);
  const levels = ["headline", "subtitle", "body", "caption"];
  for (const level of levels) {
    const result = hooks.validateFontRequest({ id: "secondary-0", role: "secondary", family: "Grandstander", levels: [level], typographyScale: "standard" }, mock.fontStyles, true);
    assert.equal(result.reasonCode, "HANDWRITING_LINE_HEIGHT_REVIEW");
    assert.equal(result.state, "warning");
    assert.equal(result.blocking, false);
    assert.equal(result.message, "该字体属于书法/手写类，行距表现受具体字符和连笔影响，插件将使用系统默认行高，请在实际页面中确认。");
  }
  const manual = hooks.validateFontRequest({ id: "secondary-0", role: "secondary", family: "Manual Handwriting Script", levels, typographyScale: "standard" }, mock.fontStyles, true);
  assert.notEqual(manual.reasonCode, "HANDWRITING_LINE_HEIGHT_REVIEW");

  const tokens = hooks.secondaryTypographyTokensForProfile(
    { family: "Grandstander", levels },
    0,
    hooks.typographyDefinitions("standard"),
    hooks.fontPresetRules.profiles.grandstander,
    "standard",
  );
  const expectedLines = Object.values(fontPresetRules.secondaryUsageSchema.levels.standard).flat().map((definition) => definition.line);
  assert.deepEqual(Array.from(tokens, (token) => token.line), expectedLines);
});

test("handwriting warning is recorded without blocking Manifest or componentReady", async () => {
  const mock = createFigmaMock();
  addFontFamily(mock, "Grandstander", ["Regular", "Medium", "Semi Bold", "Bold"]);
  const context = createVmContext(mock);
  vm.runInContext(codeSource, context, { filename: "code.js" });
  await mock.figma.ui.onmessage({ type: "ui-ready" });
  await mock.figma.ui.onmessage({ type: "generate", config: { ...standardConfig(), secondaryFonts: [{ family: "Grandstander", levels: ["caption"] }] } });
  const success = mock.messages.find((message) => message.type === "success");
  assert.ok(success, mock.messages.map((message) => message.message).filter(Boolean).join("\n"));
  assert.equal(success.manifest.status, "valid");
  assert.equal(success.manifest.capabilities.componentReady, true);
  assert.deepEqual(Array.from(success.manifest.typography.secondaryFonts[0].generatedLevels), ["caption"]);
  assert.equal(success.manifest.typography.secondaryFonts[0].warnings[0].reasonCode, "HANDWRITING_LINE_HEIGHT_REVIEW");
  assert.equal(mock.textStyles.find((style) => visibleSecondaryName(style.name).endsWith("/C3")).lineHeight.value, 14);
});

test("Oswald and Lora can each serve as Primary without static qualification errors", async () => {
  for (const family of ["Oswald", "Lora"]) {
    const mock = createFigmaMock();
    addFontFamily(mock, family, ["Regular", "Medium", "Semi Bold", "Bold"]);
    const context = createVmContext(mock);
    vm.runInContext(codeSource, context, { filename: "code.js" });
    await mock.figma.ui.onmessage({ type: "ui-ready" });
    await mock.figma.ui.onmessage({ type: "generate", config: { ...standardConfig(), primaryFont: family } });
    const success = mock.messages.find((message) => message.type === "success");
    assert.ok(success, `${family}: ${mock.messages.map((message) => message.message).filter(Boolean).join("\n")}`);
    assert.equal(success.manifest.status, "valid");
    assert.equal(success.manifest.capabilities.componentReady, true);
    assert.equal(success.manifest.typography.primaryFont.selectedRole, "Primary");
    assert.equal(success.manifest.typography.primaryFont.family, family);
    assert.equal(success.manifest.typography.primaryFont.runtimeUiEligible, true);
    assert.equal(success.manifest.typography.primaryFont.profileUiEligible, undefined);
    assert.ok(mock.textStyles.some((style) => style.name === "Headline/H1"));
  }
});

test("Grandstander can serve as Primary with handwriting warning and fixed line height", async () => {
  const mock = createFigmaMock();
  addFontFamily(mock, "Grandstander", ["Regular", "Medium", "Semi Bold", "Bold"]);
  const context = createVmContext(mock);
  vm.runInContext(codeSource, context, { filename: "code.js" });
  await mock.figma.ui.onmessage({ type: "ui-ready" });
  await mock.figma.ui.onmessage({ type: "generate", config: { ...standardConfig(), primaryFont: "Grandstander" } });
  const success = mock.messages.find((message) => message.type === "success");
  assert.ok(success, mock.messages.map((message) => message.message).filter(Boolean).join("\n"));
  assert.equal(success.manifest.status, "valid");
  assert.equal(success.manifest.capabilities.componentReady, true);
  assert.equal(success.manifest.typography.primaryFont.warnings[0].reasonCode, "HANDWRITING_LINE_HEIGHT_REVIEW");
  assert.equal(success.manifest.typography.primaryFont.runtimeUiEligible, true);
  assert.equal(mock.textStyles.find((style) => style.name === "Headline/H1").lineHeight.value, 44);
});

test("Poppins Primary with Oswald Secondary generates all requested H/S/B/C levels", async () => {
  const mock = createFigmaMock();
  addFontFamily(mock, "Poppins", ["Regular", "Medium", "Semi Bold", "Bold"]);
  addFontFamily(mock, "Oswald", ["Regular", "Medium", "Semi Bold", "Bold"]);
  const context = createVmContext(mock);
  vm.runInContext(codeSource, context, { filename: "code.js" });
  await mock.figma.ui.onmessage({ type: "ui-ready" });
  const levels = ["headline", "subtitle", "body", "caption"];
  await mock.figma.ui.onmessage({ type: "generate", config: { ...standardConfig(), primaryFont: "Poppins", secondaryFonts: [{ family: "Oswald", levels }] } });
  const success = mock.messages.find((message) => message.type === "success");
  assert.ok(success, mock.messages.map((message) => message.message).filter(Boolean).join("\n"));
  const secondary = success.manifest.typography.secondaryFonts[0];
  assert.equal(success.manifest.status, "valid");
  assert.equal(secondary.selectedRole, "Secondary");
  assert.deepEqual(Array.from(secondary.requestedLevels), levels);
  assert.deepEqual(Array.from(secondary.generatedLevels), levels);
  assert.equal(secondary.textStyleMapping.length, 11);
});

test("Lora Primary with Grandstander Secondary generates both roles with only handwriting warning", async () => {
  const mock = createFigmaMock();
  addFontFamily(mock, "Lora", ["Regular", "Medium", "Semi Bold", "Bold"]);
  addFontFamily(mock, "Grandstander", ["Regular", "Medium", "Semi Bold", "Bold"]);
  const context = createVmContext(mock);
  vm.runInContext(codeSource, context, { filename: "code.js" });
  await mock.figma.ui.onmessage({ type: "ui-ready" });
  await mock.figma.ui.onmessage({
    type: "generate",
    config: { ...standardConfig(), primaryFont: "Lora", secondaryFonts: [{ family: "Grandstander", levels: ["headline", "body"] }] },
  });
  const success = mock.messages.find((message) => message.type === "success");
  assert.ok(success, mock.messages.map((message) => message.message).filter(Boolean).join("\n"));
  assert.equal(success.manifest.status, "valid");
  assert.equal(success.manifest.capabilities.componentReady, true);
  assert.deepEqual(Array.from(success.manifest.typography.primaryFont.warnings), []);
  assert.deepEqual(Array.from(success.manifest.typography.secondaryFonts[0].warnings, (warning) => warning.reasonCode), ["HANDWRITING_LINE_HEIGHT_REVIEW"]);
});

test("a one-style manual Primary maps every required role and remains component-ready", async () => {
  const mock = createFigmaMock();
  addFontFamily(mock, "Solo Sans", ["Book"]);
  const context = createVmContext(mock);
  vm.runInContext(codeSource, context, { filename: "code.js" });
  await mock.figma.ui.onmessage({ type: "ui-ready" });
  await mock.figma.ui.onmessage({ type: "generate", config: { ...standardConfig(), primaryFont: "Solo Sans" } });
  const success = mock.messages.find((message) => message.type === "success");
  assert.ok(success, mock.messages.map((message) => message.message).filter(Boolean).join("\n"));
  const primary = success.manifest.typography.primaryFont;
  assert.equal(success.manifest.status, "valid");
  assert.equal(success.manifest.capabilities.componentReady, true);
  assert.equal(primary.runtimeUiEligible, true);
  assert.deepEqual(Array.from(primary.warnings, (warning) => warning.reasonCode), ["PRIMARY_WEIGHT_COVERAGE_LIMITED"]);
  for (const role of ["baseUi", "emphasis", "strong"]) {
    assert.equal(primary.resolvedStyles[role].resolvedFontName.style, "Book");
    assert.equal(primary.resolvedStyles[role].resolutionStatus, "nearest");
  }
  for (const style of Object.values(success.manifest.typography.textStyles)) {
    assert.ok(mock.textStyles.some((candidate) => candidate.name === style.canonicalStylePath), style.canonicalStylePath);
  }
});

test("unavailable Primary blocks before destructive writes and leaves no partial output", async () => {
  const mock = createFigmaMock();
  seedLegacyResources(mock);
  const context = createVmContext(mock);
  vm.runInContext(codeSource, context, { filename: "code.js" });
  await mock.figma.ui.onmessage({ type: "ui-ready" });
  await mock.figma.ui.onmessage({ type: "generate", config: { ...standardConfig(), primaryFont: "Missing Runtime Font" } });
  assert.equal(mock.messages.some((message) => message.type === "success"), false);
  assert.equal(mock.messages.at(-1).fontValidation[0].reasonCode, "FONT_UNAVAILABLE");
  assert.equal(JSON.parse(mock.rootPluginData.get("design-system-build-state-v1")).status, "EMPTY");
  assert.equal(mock.variables.some((variable) => variable.name === "Legacy/Manual"), true);
  assert.equal(mock.rootPluginData.has("semantic-token-manifest-v1"), false);
  assert.equal(mock.textStyles.length, 1);
});

test("Grandstander does not generate Caption when Caption is not requested", async () => {
  const mock = createFigmaMock();
  addFontFamily(mock, "Lora", ["Regular", "Medium", "Semi Bold", "Bold"]);
  addFontFamily(mock, "Grandstander", ["Regular", "Medium", "Semi Bold", "Bold"]);
  const context = createVmContext(mock);
  vm.runInContext(codeSource, context, { filename: "code.js" });
  await mock.figma.ui.onmessage({ type: "ui-ready" });
  await mock.figma.ui.onmessage({
    type: "generate",
    config: { ...standardConfig(), primaryFont: "Lora", secondaryFonts: [{ family: "Grandstander", levels: ["headline", "body"] }] },
  });
  const success = mock.messages.find((message) => message.type === "success");
  assert.ok(success, mock.messages.map((message) => message.message).filter(Boolean).join("\n"));
  const secondary = success.manifest.typography.secondaryFonts[0];
  assert.deepEqual(Array.from(secondary.requestedLevels), ["headline", "body"]);
  assert.deepEqual(Array.from(secondary.generatedLevels), ["headline", "body"]);
  assert.equal(secondary.textStyleMapping.some((mapping) => mapping.level === "caption"), false);
  assert.equal(mock.textStyles.some((style) => /^Grandstander\/C[1-3]$/.test(visibleSecondaryName(style.name))), false);
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
  assert.equal(manifest.typography.primaryFont.selectedRole, "Primary");
  assert.equal(manifest.typography.primaryFont.profileUiEligible, undefined);
  assert.deepEqual(Array.from(manifest.typography.primaryFont.warnings), []);
  assert.equal(manifest.typography.usageMapping["typography.tabLabel"], "Subtitle/S1");
  assert.equal(manifest.typography.usageMapping["typography.buttonLabel"], "Subtitle/S1");
  assert.equal(manifest.resources.typography["action.label"].stylePath, "Subtitle/S1");
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

test("primary nearest warns without disabling component readiness", async () => {
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
  assert.equal(success.manifest.typography.primaryFont.runtimeUiEligible, true);
  assert.equal(success.manifest.capabilities.componentReady, true);
  assert.equal(success.manifest.typography.primaryFont.warnings[0].reasonCode, "PRIMARY_WEIGHT_COVERAGE_LIMITED");
  assert.match(success.manifest.validation.warnings.join("\n"), /可用字重较少/);
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

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

async function loadTestHooks(mock) {
  const context = createVmContext(mock);
  vm.runInContext(`${codeSource}\nglobalThis.__testHooks = { buildSemanticRolePlan, writeSemanticRoleVariables, validateSemanticManifest, validateAliasChain, scanDesignSystemInventory, normalizeConfig, validateConfig, validateRawInputs, auxiliaryTokensForConfig, auxiliaryGradientTokensForConfig };`, context, {
    filename: "code.js",
  });
  await mock.figma.ui.onmessage({ type: "ui-ready" });
  return context.__testHooks;
}

async function loadFontHooks(mock) {
  const context = createVmContext(mock);
  vm.runInContext(`${codeSource}\nglobalThis.__fontHooks = { normalizeConfig, validateFontRequest, resolveFontMatch, typographyTokens, typographyDefinitions, secondaryTypographyTokensForProfile, buildTypographyManifest, mapDirectionSidecar, applyDirectionSidecarPatchToBuilderConfig, fontPresetRules: FONT_PRESET_RULES };`, context, {
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
    projectCode: "OOG505",
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
