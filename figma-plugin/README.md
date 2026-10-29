# Design System Builder Figma Plugin

Current source version: `v1.3.11`. The plugin header shows this version, and each Secondary Font usage group provides a leading Select All checkbox with checked, unchecked, and partial-selection states. Standard Primary generates all 14 H/S/B/C styles. Standard Secondary uses visible `Family/01 H1` through `Family/11 C3` paths, and Large Secondary uses visible `Family/01 H1` through `Family/10 C3` paths. No hidden Unicode sorting characters are used. Large Primary remains a 12-style scale; only `Body/B3` and `Body/B4` change from 18/28 to 18/24. Project Code accepts 1–20 letters, numbers, spaces, hyphens, or underscores.

Previous formal package: `v1.3.10`. `v1.3.11` is the formal source for the accepted Large Primary 18px line-height change.

The plugin builds a component-ready Design System in Step 1. Step 2 is gated by the generated Semantic Token Manifest and will host component generation in a later release.

## Destructive 0-1 Workflow

This plugin is only for 0-1 project setup. Step 1 removes every local Variable Collection, Variable, Paint Style, Effect Style, plugin-generated Text Style, canonical H/S/B/C Text Style, and prior generated Design System page before rebuilding. Unrelated manually maintained Text Styles are preserved. On the first build it runs after the fixed 0-1 warning; when rebuilding an existing generated system, it requires an explicit confirmation.

Run Step 1 only after confirming the current resources do not need to be kept.

## Import Direction Sidecar

`Import Direction Sidecar` accepts a local `.json` file only when the direction is selected, human verified, and contains verified color and typography systems. The plugin shows a summary before it changes the form. Confirming the summary pre-fills only the existing Primary, Black, Background, Auxiliary, Primary Font, and Secondary Font fields; it does not start Step 1.

Project Code, System Type, Typography Scale, Semantic Set, Neutral Mode, Color Output, and multi-theme settings remain unchanged. Visual-direction rules and batch metadata are not copied into the Builder configuration. Sidecar import replaces the Secondary font list with the verified font and clears its H/S/B/C selection so the designer must choose usage again.

## Merge Candidate Acceptance Scope

- `test1616` covered Standard import and generation for Primary, Background, Black Seed, solid Auxiliary colors, Linear/Radius gradient data, current Standard typography output, valid Manifest status, and the reviewed semantic resource references.
- `test1717` covered Large import and generation for the same color inputs, Angular/Diamond gradient data and corresponding Figma display, current Large typography output, valid Manifest status, and the reviewed semantic resource references.
- This evidence is scoped to the listed inputs and outputs. It is not a claim that every plugin function or every visual effect has completed manual acceptance.

## Deferred Typography Optimization

These items remain separate follow-up work:

1. Line-height strategy for short UI copy versus long-form body text. The formal 18px change only sets the shared Large Primary default; it does not add scene-specific styles or automatic switching.
2. Markdown typography-table ordering as `H -> S -> B -> C`.
3. The Large Secondary body hierarchy currently has two 20px weights and no 18px level.

The independent Safety Guard MVP is not included.

## Large Body Line-Height

Date: 2026-10-21

- Large Primary `Body/B3` Medium changed from 18/28 to 18/24.
- Large Primary `Body/B4` Semi Bold changed from 18/28 to 18/24.
- The change is the shared Large `line` value. It is not a font-name exception, a new Text Style, a switch, or an automatic line-count adjustment.
- Evidence comes from the first-round line-height experiment for tested DM Sans and Poppins samples. The B4 evidence is mainly short titles. Centered explanatory copy at 18/26 remains a local page override and is not added as a plugin style.
- This default does not mean every font, weight, or scene has been verified.
- Standard Primary and Secondary are unchanged. Large `Body/B1` and `Body/B2` remain 20/30. Large Secondary inherits only the first two Body definitions, so its body output remains 20/30 and gains no 18px style.
- Correction: Standard `Subtitle/S1` and `Body/B2` are 16/24. Large `Subtitle/S1` is 26/34, Large `Subtitle/S2` is 24/32, and Large `Body/B1` / `Body/B2` are 20/30. Those Large tokens must not be described together with the Standard tokens as 16/24.
- Existing generated Figma files do not update automatically. Regenerate to apply the new line heights.
- Acceptance scope for the tested DM Sans / Fraunces Large sample, project `test111`: the specified visual samples were confirmed; live Text Styles, the downloaded Markdown, `action.label`, gradient type and stop order, and Manifest status passed. The JSON export was not found, so `componentReady` and warnings were not manually checked and are neither passed nor failed. Unbound generated-page previews are pre-existing 1.3.10 behavior and were not changed in this release.

## Install Locally

1. Open Figma Desktop.
2. Go to `Plugins -> Development -> Import plugin from manifest...`.
3. Select `design-system-builder-figma-plugin/manifest.json` from this workspace.
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
- Text Style identity includes its semantic path and stable `text-style-v1` visual signature, so visually matching roles such as `Subtitle/S1` and `Body/B2` remain separate named styles.
- Typography Manifest records the selected project role, requested semantic weights, actual Figma `FontName.style`, resolution status, and non-blocking warnings.
- The bundled Google Fonts preset library contains 51 reviewed Latin/English profiles: 25 Primary and 26 Secondary. Static profile data remains separate from runtime results.
- A font is not permanently classified as Primary or Secondary. Its input position determines its role for the current project; historical Profile classifications are recommendation metadata only.
- Primary is required and must resolve in the current Figma runtime. Profile mappings and aliases are preferred when available; otherwise `baseUi / emphasis / strong` resolve automatically to the closest loadable non-italic Styles.
- A Primary font with one or two usable weights remains generatable. Reused or nearest weights produce `PRIMARY_WEIGHT_COVERAGE_LIMITED` without disabling Foundation or Step 2.
- Known profiles and unknown manually entered fonts may be used as Primary or Secondary. Secondary H/S/B/C remains designer-controlled and requires at least one selected level when a family is present.
- Secondary fonts use the same stable hierarchy dimensions as the design system: `headline / subtitle / body / caption`. `display / quote / number / brand` are not separate style categories; those content types choose the appropriate H/S/B/C level.
- Standard Secondary uses visible paths from `Family/01 H1` through `Family/11 C3`, with `Headline H1-H4: 38-26px`, `Subtitle S1-S2: 24-20px`, `Body B1-B2: 18-16px`, and `Caption C1-C3: 14-10px`. Large Secondary uses visible paths from `Family/01 H1` through `Family/10 C3` and keeps its accepted canonical values. No intermediate category folders or hidden Unicode sorting characters are used.
- Every Secondary font may request any H/S/B/C level and still requires at least one explicit level. Reviewed profiles use their mapped styles where available and fall back to the standard weight-role mapping for the other selected levels.
- Large Primary and Secondary share one canonical Large size and line-height resolver. Handwriting or Script profiles produce the same non-blocking review warning in either role from explicit profile metadata; the plugin does not infer type from the family name or alter line height.
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
