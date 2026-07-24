# Component Policy

Base components are optional and must come after variables and styles.

## Generation Sequence

Do not generate components in the same step as the design-system foundations. The correct order is:

1. Generate and validate the design-system foundations: colors, typography, radius, spacing, shadow, and optional visual documentation.
2. Ask the designer whether to continue with components.
3. Generate foundation units from the approved design-system tokens and styles.
4. Generate composed components from those foundation units.
5. Generate product/flow-specific examples only after the designer confirms the relevant user task or capability.

Prefer a step-by-step flow over one-click generation for components. A one-click shortcut may be offered later, but it must internally follow the same sequence and provide a preview or confirmation before writing large component sets.

The component hierarchy is:

- Foundation units: primitive reusable UI parts such as `btn`, input, option item, icon slot, progress, status bar, text block, and card shell.
- Composed components: assembled components made from foundation units, such as `OB/Question Card`, `OB/Option Group`, `OB/Footer Actions`, or `OB/Top Progress`.
- Product examples: optional sample instances using real project wording or business objects. These are examples, not required reusable library components.

Components must inherit from the generated design-system foundations. Do not hardcode colors, typography, spacing, or radius when a token or style exists.

Status bar is a shared company foundation component template. In 0-to-1 projects, generate `Status Bar/Status Bar iPhone` and `Status Bar/Status Bar iPad` automatically during the foundation-unit component step; do not assume the target file already contains them. If an exact local component already exists, update/reuse it instead of duplicating it. The generated status bars must be recreated from the lightweight structural spec below, not pasted from screenshots or copied as heavy assets, and their colors/text should bind to the current design-system variables/styles where the target system provides suitable tokens.

Shared foundation template specs:

- `Status Bar/Status Bar iPhone`: component size `390 x 44`; transparent outer component; includes left time `9:41` and right-side mobile signal, Wi-Fi, battery, and optional recording indicator. Do not include notch shape layers in this foundation component. Use fixed positioning to match iOS status-bar proportions; icon and time fills should use the current neutral/text color token when available.
- `Status Bar/Status Bar iPad`: component size `768 x 24`; horizontal auto layout, padding left/right `26`, center aligned, space-between; left group contains `9:41` and `Mon Jun 10`; right group contains signal, Wi-Fi, `100%`, and battery. Text should use the available system/status style if present, otherwise the closest caption/label style.

Template memory rule: for every shared foundation component, store only compact structure, dimensions, layout, state, and token-binding rules. Avoid storing large screenshots or raw exported assets. Future component generation should recreate the component from this spec, then bind it to the current project's generated variables/styles.

## Default Position

Do not generate base components by default. After variables and styles are complete and validated, ask whether the user wants base components.

If yes:

1. Inspect existing Figma components first.
2. Report what already exists.
3. Ask which component layer to create next: foundation units, composed components, or product examples.
4. Ask which missing components to create.
5. Create only the confirmed missing components.
6. Bind components to variables and text styles rather than hardcoding visual values.

## Consumer Mobile Defaults

Default to consumer mobile app interactions.

Allowed states by default:

- default
- pressed
- disabled
- loading
- selected
- unselected
- error, only where relevant
- success, only where relevant

Do not generate by default:

- hover
- focus-visible
- desktop cursor states
- tooltip behavior
- dashboard tables
- web sidebar/navigation systems

Only add these when the user explicitly says the project is web, desktop, dashboard, admin, or needs hover/focus.

## Candidate Components

When requested, create a small useful set, not a full component library:

- btn
- Input/Text Field
- Card
- Bottom Tab
- Segmented Control
- List Item
- Toast
- Modal/Sheet
- Toggle/Checkbox/Radio when needed

`btn` specs should cover height, padding, radius token, color token, text style, and mobile states. Do not add a touch target rule unless the user requests it.
