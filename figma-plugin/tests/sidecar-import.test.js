const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const pluginRoot = path.resolve(__dirname, "..");
const codeSource = fs.readFileSync(path.join(pluginRoot, "code.js"), "utf8");
const uiSource = fs.readFileSync(path.join(pluginRoot, "ui.html"), "utf8");
const fixtureName = "Batch-02-D01-v3-Gentle-Contour-verified-sidecar.json";
const fixtureSource = fs.readFileSync(path.join(__dirname, "fixtures", fixtureName), "utf8");
const fixture = JSON.parse(fixtureSource);
const block = codeSource.match(/\/\/ BEGIN DIRECTION SIDECAR IMPORT([\s\S]*?)\/\/ END DIRECTION SIDECAR IMPORT/);

assert.ok(block, "Direction Sidecar import block was not found");

const context = vm.createContext({
  normalizeHex(value, fallback) {
    const raw = String(value || "").trim().replace(/^#/, "");
    if (/^[0-9a-fA-F]{3}$/.test(raw)) {
      return `#${raw.split("").map((character) => character + character).join("").toUpperCase()}`;
    }
    if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
    return fallback;
  },
});
vm.runInContext(`${block[1]}\nglobalThis.__sidecarHooks = { importDirectionSidecarFile, mapDirectionSidecar, applyDirectionSidecarPatchToBuilderConfig };`, context);
const hooks = context.__sidecarHooks;

function cloneFixture() {
  return JSON.parse(JSON.stringify(fixture));
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("imports the verified D01 Sidecar into the existing Builder fields", () => {
  const result = plain(hooks.importDirectionSidecarFile(fixtureName, fixtureSource));
  assert.equal(fixture.builderMappingStatus, "not-mapped");
  assert.deepEqual(result.formPatch, {
    primaryKind: "gradient",
    primaryColor: "#CE9C51",
    primaryGradientFrom: "#CE9C51",
    primaryGradientTo: "#D5A85F",
    primaryGradientFallback: "#CE9C51",
    primaryGradientDirection: "linear",
    blackColor: "#1F1F1F",
    backgroundColor: "#FBF6F0",
    auxColors: [
      { name: "Sand", kind: "solid", value: "#E9DCC5" },
      { name: "Sage", kind: "solid", value: "#B7C8B0" },
    ],
    primaryFont: "Manrope",
    secondaryFont: "Fraunces",
  });
  assert.equal(result.summary.directionName, "Gentle Contour");
  assert.equal(result.summary.primary.representativeSource, "start");
});

test("rejects a non-JSON file", () => {
  assert.throws(
    () => hooks.importDirectionSidecarFile("direction.txt", fixtureSource),
    /只接受 JSON 文件/,
  );
});

test("rejects invalid JSON syntax", () => {
  assert.throws(
    () => hooks.importDirectionSidecarFile("direction.json", "{ invalid"),
    /JSON 语法错误/,
  );
});

test("invalid JSON or missing required fields cannot overwrite the current form config", () => {
  const currentConfig = {
    projectCode: "OOG140",
    primaryKind: "solid",
    primaryColor: "#123456",
    blackColor: "#222222",
    backgroundColor: "#FAFAFA",
    primaryFont: "Inter",
    secondaryFonts: [{ family: "Lora", levels: ["headline"] }],
    systemType: "standard",
    typographyScale: "large",
    semanticSet: "full",
    neutralMode: "solid",
    colorOutput: "variable",
  };
  const before = plain(currentConfig);
  const missingColor = cloneFixture();
  delete missingColor.verifiedColorSystem.background;

  assert.throws(
    () => hooks.importDirectionSidecarFile("broken.json", "{ invalid"),
    /JSON 语法错误/,
  );
  assert.throws(
    () => hooks.importDirectionSidecarFile("missing-field.json", JSON.stringify(missingColor)),
    /background 为必填颜色/,
  );
  assert.deepEqual(currentConfig, before);
  assert.match(uiSource, /if \(!message\.ok\) \{[\s\S]*?pendingDirectionSidecar = null;[\s\S]*?return;/);
});

test("rejects a direction that is not selected", () => {
  const sidecar = cloneFixture();
  sidecar.selectionStatus = "candidate";
  assert.throws(() => hooks.mapDirectionSidecar(sidecar), /selectionStatus.*selected/);
});

test("rejects a direction that is not human verified", () => {
  const sidecar = cloneFixture();
  sidecar.verificationStatus = "pending";
  assert.throws(() => hooks.mapDirectionSidecar(sidecar), /verificationStatus.*human-verified/);
});

test("rejects a gradient with a missing required color", () => {
  const sidecar = cloneFixture();
  delete sidecar.verifiedColorSystem.primary.start;
  assert.throws(() => hooks.mapDirectionSidecar(sidecar), /primary\.start 为必填颜色/);
});

test("rejects a representative color that is neither gradient endpoint", () => {
  const sidecar = cloneFixture();
  sidecar.verifiedColorSystem.primary.representativeColor = "#FFFFFF";
  assert.throws(() => hooks.mapDirectionSidecar(sidecar), /必须严格等于 primary\.start 或 primary\.end/);
});

test("maps gradient Auxiliary fields into the existing Builder gradient shape", () => {
  const sidecar = cloneFixture();
  sidecar.verifiedColorSystem.auxiliaries = [{
    name: "Dawn",
    kind: "gradient",
    gradientType: "Radial",
    start: "#E9DCC5",
    end: "#B7C8B0",
  }];
  const result = plain(hooks.mapDirectionSidecar(sidecar));
  assert.deepEqual(result.formPatch.auxColors, [{
    name: "Dawn",
    kind: "gradient",
    value: "",
    gradientFrom: "#E9DCC5",
    gradientTo: "#B7C8B0",
    gradientDirection: "radial",
  }]);
  assert.deepEqual(result.summary.auxiliaries, result.formPatch.auxColors);
});

test("preserves Angular Primary and Diamond Auxiliary gradient types", () => {
  const sidecar = cloneFixture();
  sidecar.verifiedColorSystem.primary.gradientType = "Angular";
  sidecar.verifiedColorSystem.auxiliaries = [{
    name: "Facet",
    kind: "gradient",
    gradientType: "Diamond",
    start: "#CE9C51",
    end: "#D5A85F",
  }];
  const result = plain(hooks.mapDirectionSidecar(sidecar));
  assert.equal(result.formPatch.primaryGradientDirection, "angular");
  assert.equal(result.formPatch.auxColors[0].gradientDirection, "diamond");
});

test("rejects an incomplete or invalid gradient Auxiliary without producing a patch", () => {
  const missingStart = cloneFixture();
  missingStart.verifiedColorSystem.auxiliaries = [{
    name: "Dawn",
    kind: "gradient",
    gradientType: "Linear",
    end: "#B7C8B0",
  }];
  assert.throws(() => hooks.mapDirectionSidecar(missingStart), /auxiliaries\[0\]\.start 为必填颜色/);

  const invalidType = cloneFixture();
  invalidType.verifiedColorSystem.auxiliaries = [{
    name: "Dawn",
    kind: "gradient",
    gradientType: "Sweep",
    start: "#E9DCC5",
    end: "#B7C8B0",
  }];
  assert.throws(() => hooks.mapDirectionSidecar(invalidType), /auxiliaries\[0\]\.gradientType/);
});

test("does not overwrite Project Code", () => {
  const { formPatch } = hooks.mapDirectionSidecar(cloneFixture());
  const merged = plain(hooks.applyDirectionSidecarPatchToBuilderConfig({ projectCode: "OOG777" }, formPatch));
  assert.equal(merged.projectCode, "OOG777");
  assert.equal(Object.hasOwn(formPatch, "projectCode"), false);
});

test("does not overwrite Builder settings absent from the Sidecar", () => {
  const { formPatch } = hooks.mapDirectionSidecar(cloneFixture());
  const before = {
    systemType: "multi-theme",
    typographyScale: "large",
    semanticSet: "red-green",
    neutralMode: "opacity",
    colorOutput: "style",
    multiThemeType: "multi-primary",
    themeBackgroundStrategy: "per-theme",
    themes: [{ name: "Existing" }],
  };
  const merged = plain(hooks.applyDirectionSidecarPatchToBuilderConfig(before, formPatch));
  Object.entries(before).forEach(([key, value]) => assert.deepEqual(merged[key], value, key));
});

test("ignores manual visual rules and non-Builder metadata", () => {
  const result = plain(hooks.mapDirectionSidecar(cloneFixture()));
  const serializedPatch = JSON.stringify(result.formPatch);
  assert.doesNotMatch(serializedPatch, /manualVisualRules|layout|componentLanguage|iconStyle|assetStrategy|material|avoid|batch|revision|licenseSource/);
  assert.equal(Object.hasOwn(result.formPatch, "directionName"), false);
});

test("maps Primary and Secondary Font without license fields", () => {
  const result = plain(hooks.mapDirectionSidecar(cloneFixture()));
  assert.equal(result.formPatch.primaryFont, "Manrope");
  assert.equal(result.formPatch.secondaryFont, "Fraunces");
  assert.deepEqual(result.summary.fontLicenses, { primary: "OFL-1.1", secondary: "OFL-1.1" });
  assert.doesNotMatch(JSON.stringify(result.formPatch), /license/i);
});

test("does not require, read, or create Secondary Usage", () => {
  const sidecar = cloneFixture();
  delete sidecar.verifiedTypography.secondaryUsage;
  const result = plain(hooks.mapDirectionSidecar(sidecar));
  assert.equal(result.formPatch.secondaryFont, "Fraunces");
  assert.equal(Object.hasOwn(result.formPatch, "secondaryUsage"), false);
  assert.equal(Object.hasOwn(result.formPatch, "levels"), false);

  const merged = plain(hooks.applyDirectionSidecarPatchToBuilderConfig({ secondaryFonts: [] }, result.formPatch));
  assert.deepEqual(merged.secondaryFonts, [{ family: "Fraunces", levels: [] }]);
});

test("replaces all old Secondary fonts and clears their H/S/B/C selections", () => {
  const result = hooks.mapDirectionSidecar(cloneFixture());
  const merged = plain(hooks.applyDirectionSidecarPatchToBuilderConfig({
    secondaryFonts: [
      { family: "Lora", levels: ["headline"] },
      { family: "Grandstander", levels: ["body"] },
      { family: "Newsreader", levels: ["caption"] },
    ],
  }, result.formPatch));
  assert.deepEqual(merged.secondaryFonts, [{ family: "Fraunces", levels: [] }]);
});

test("UI requires confirmation before applying and keeps generation on its original button", () => {
  assert.match(uiSource, /Import Direction Sidecar/);
  assert.match(uiSource, /确认并预填表单/);
  assert.match(uiSource, /\.import-summary\.is-hidden\s*\{\s*display:\s*none/);
  assert.match(uiSource, /applyDirectionSidecarToForm\(pendingDirectionSidecar\.formPatch\)/);
  assert.match(uiSource, /secondaryFontState\.count = 1/);
  assert.match(uiSource, /secondaryFontState\.values = \[\{ family: formPatch\.secondaryFont, levels: \[\] \}\]/);
  assert.match(uiSource, /generateButton.*addEventListener\("click"/s);
  assert.doesNotMatch(codeSource, /message\.type === "import-direction-sidecar"[\s\S]{0,2000}type: "generate"/);
});
