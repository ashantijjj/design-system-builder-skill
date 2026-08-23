# Design System Builder Figma Plugin

Current release: `v1.2.0`. This version includes the Google Fonts Preset Library v1.0 integration.

The plugin builds a component-ready Design System in Step 1. Step 2 is gated by the generated Semantic Token Manifest and will host component generation in a later release.

## Destructive 0-1 Workflow

This plugin is only for 0-1 project setup. Step 1 removes every local Variable Collection, Variable, Paint Style, Text Style, Effect Style, and prior generated Design System page before rebuilding. On the first build it runs after the fixed 0-1 warning; when rebuilding an existing generated system, it requires an explicit confirmation. It does not migrate resources or preserve a manually maintained Design System.

Run Step 1 only after confirming the current resources do not need to be kept.

## Install Locally

1. Open Figma Desktop.
2. Go to `Plugins -> Development -> Import plugin from manifest...`.
3. Select `plugin-work/design-system-builder-figma-plugin/manifest.json` from this workspace.
4. Run `Plugins -> Development -> Design System Builder`.

## Build Lifecycle

```text
EMPTY
-> FOUNDATION_BUILDING
-> FOUNDATION_VALID
-> COMPONENTS_BUILDING
-> COMPONENTS_GENERATED
```

- A Step 1 failure cleans its partial resources, stores an invalid Manifest, and enters `FOUNDATION_INVALID` so Step 1 can retry.
- A future Step 2 failure will clean its partial components, preserve the valid Foundation Manifest, and enter `COMPONENTS_FAILED` so only Step 2 can retry.
- An interrupted build is recovered on the next plugin launch using the private build state and run tracker.
- After `FOUNDATION_VALID`, Step 1 changes to `重新生成 Design System`. Rebuilding requires an explicit designer confirmation because it clears the current local Variables and Styles.

The private document keys are:

```text
design-system-build-state-v1
semantic-token-manifest-v1
```

No Shared Plugin Data or cross-plugin communication is used.

## Step 1 Output

Step 1 creates:

- Foundation color Variables with Default, Light/Dark, or multi-primary Modes.
- Radius and Spacing FLOAT Variables.
- Text Styles and optional typography Variables.
- Paint Styles for gradients.
- Effect Styles for shadows.
- A `but-v1` semantic color contract that maps roles directly to Foundation Variables by default.
- Semantic Alias Variables only when a role changes Foundation source across Modes or an explicit shared binding requires one.
- A validated private Semantic Token Manifest.
- `{projectCode}-Design-System.md` and `{projectCode}-Design-System.json` downloads.
- An optional Design System visual page.

### Auxiliary color inputs

- Each auxiliary color entry has exactly one output type: `solid` or `gradient`.
- A solid entry creates the auxiliary color Variables; a gradient entry creates the auxiliary gradient Paint Style.
- The same entry must not represent both outputs. If a project needs both a solid auxiliary color and a gradient, add two separate auxiliary entries with `+ 辅助`.
- This keeps names, usage, validation, and future edits independent instead of coupling two different resources to one row.

## Typography Rules

- `systemType` and `typographyScale` are independent dimensions. The scale is `standard` or `large`.
- Generated Text Styles use `Headline/H1-H5`, `Subtitle/S1-S2`, `Body/B1-B4`, and `Caption/C1-C3`. No standalone `Label` Style is generated.
- Label, button, and tab text are usage roles mapped to existing canonical Text Styles in the Manifest.
- Text Styles are deduplicated by the stable `text-style-v1` signature. Canonical selection uses explicit priority, then `stylePath` order.
- Typography Manifest records semantic weight roles, actual Figma `FontName.style`, resolution status, and `runtimeUiEligible`.
- The bundled Google Fonts preset library contains 51 reviewed Latin/English profiles: 25 Primary and 26 Secondary. Static profile data remains separate from runtime results.
- Known Primary profiles must pass their reviewed Primary eligibility and provide three distinct `baseUi / emphasis / strong` styles. Known Secondary profiles only expose approved application levels; the current 26 Secondary profiles are approved for `headline`.
- Secondary fonts use the same stable hierarchy dimensions as the design system: `headline / subtitle / body / caption`. `display / quote / number / brand` are not separate style categories; those content types choose the appropriate H/S/B/C level.
- Standard Secondary output is `Headline H1-H4: 38-26px`, `Subtitle S1-S2: 24-20px`, `Body B1-B2: 18-16px`, and `Caption C1-C3: 14-10px`. Large output raises every level and ends at `Caption/C3: 12px`, so it never generates 10px text.
- Unknown manually entered Secondary fonts may request any H/S/B/C level but still require at least one explicit level. Reviewed profiles remain restricted to their approved levels.
- Secondary styles below a profile's `minRecommendedSizePx` are skipped without blocking the rest of the Foundation, and the skipped paths are recorded in the Manifest.
- Runtime resolution is `exact -> Profile alias -> generic same-weight alias -> nearest -> unavailable`. Font availability is always checked against the current Figma editor; the plugin never installs fonts.
- All resolved fonts are loaded before Step 1 changes Build State or deletes existing resources. Runtime load failure leaves the previous file resources and Manifest untouched.

The MD and JSON exports are built from the actual resources after Figma generation and validation. They do not contain Variable IDs, Style IDs, or Mode IDs. The browser decides whether a repeated download overwrites or renames an existing local file.

## Component-ready Requirements

- Use Standard or Multi-theme project type.
- Color output must be `Variable`.
- Light/Dark systems must use solid Neutral tokens so semantic content and disabled roles can follow the active Mode.
- Every required semantic Alias source, Text Style, FLOAT Variable, and Effect Style must resolve uniquely.
- An invalid Manifest keeps Step 2 disabled.
- A valid Manifest with `capabilities.componentReady=false` also keeps Step 2 disabled. Both the UI and the core Step 2 entry enforce this gate.

## Semantic Rule Source

Component-facing roles are defined in `rules/semantic-roles.json`. Recipes request semantic roles; the Manifest maps each role to the current file's Collection and Variable/Style path.

Color binding follows these rules:

- Foundation identity is `collectionName + variablePath + variableType`; resolved RGBA or Hex values never participate in deduplication.
- If every Mode uses the same Foundation identity, the Manifest uses `bindingStrategy: direct` and no Semantic Alias is generated.
- If Mode source identities differ, the plugin creates one Semantic Alias for that role and records complete `sourcesByMode` locators.
- Separate roles may map to the same Foundation Variable without losing their independent Manifest entries.
- Semantic Aliases are never merged because their current sources happen to match. They may be shared only through an explicit `sharedBindings` declaration, with matching types and Mode sources; the generated Variable uses the union of declared scopes.
- A component state with no fill is a Recipe instruction (`fills = []`), not a transparent color Variable.

The broader foundation rules are generated from `../design-system-builder-web/rules/config.js` when that source is available. Run:

```bash
node scripts/sync-rules-to-plugin.js
```

If the Web rule source is absent, the sync script preserves the current foundation block and still syncs `rules/semantic-roles.json` and `rules/font-presets.json`.

## Current Limit

The Step 2 gate is visible after a valid Manifest with `capabilities.componentReady=true`, but component generation and `But v1` training are intentionally not included in this release.
