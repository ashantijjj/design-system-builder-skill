# Figma Workflow

Follow this safe procedure for all Figma writes and audits.

## Before Writing

1. Confirm the task requires writing to Figma. If yes, require a Figma link.
2. Extract the file key and node id when available.
3. Follow the `figma-use` skill before every `use_figma` call.
4. Run a lightweight preflight inspection: return only counts and names for variable collections, text styles, and effect styles. Do not return every variable value unless conflicts need inspection.
5. Build a planned change list from the selected system type or custom configuration.
6. If any existing variable collections, variables, text styles, or effect styles are present, stop before writing and ask the user how to proceed.

Ask the user to choose one of these paths:

- Keep existing system and only supplement missing items.
- Delete existing variables/styles and rebuild from the selected template or custom configuration.
- Cancel and only report the existing system.

Treat deletion as destructive. Never delete existing variables, styles, or components without explicit confirmation.

## Lightweight Style-First Writes

When the selected system type is lightweight product and variables are not enabled:

1. Create local paint styles for colors, text styles for typography, and effect styles for shadows.
2. Do not create variable collections for color, radius, or spacing.
3. Record radius and spacing as compact specs in the result summary or in a lightweight documentation frame only if the user asks for visible documentation.
4. Validate style names, counts, and any documented radius/spacing specs instead of requiring variable collections.

If the user enables variables for one or more modules, create only those requested variable collections and keep the remaining modules style-first.

## Performance Mode

For 0-to-1 creation in an empty or confirmed-rebuild file, optimize for speed:

1. Use one lightweight preflight `use_figma` call.
2. Use one combined write `use_figma` call for color variables, number variables, text styles, and effect styles.
3. Use one lightweight validation `use_figma` call.

Avoid:

- returning full details for every created variable/style
- separate calls for color variables, number variables, text styles, and effect styles when there are no conflicts
- loading broad Figma references that are not needed for the current operation
- screenshot calls for token-only work

Return compact results: counts, created/skipped names, conflict names, and validation issues. Only return full variable values when debugging or when the user asks.

## Conflict Handling

- If a variable/style already exists with the same name and same value, keep it.
- If a variable/style already exists with the same name and a different value, report the difference and ask before overwriting.
- If an equivalent value exists under a different name, prefer preserving the existing convention unless the user asked to rename.
- Avoid duplicate collections and duplicate variables.
- If the user chooses to delete and rebuild, delete only confirmed variable collections and styles; do not delete components or canvas nodes unless explicitly requested.

## Writing

Create or update in this logical order, but combine steps into one `use_figma` call for empty files or confirmed rebuilds:

1. Color variable collections and modes
2. Number variables: radius and spacing
3. Text styles
4. Effect styles
5. Optional base components only after user confirmation

For multi-theme systems, use Figma variable modes for theme values where possible. Light/Dark systems should use `Light` and `Dark` modes for Brand, Solid Neutral, and Semantic values instead of literal duplicated names such as `Light/Semantic/error`. Alpha Overlay stays global as `Overlay/Black` and `Overlay/White`. Multi-primary systems should use theme modes for Brand values while sharing Solid Neutral or Overlay Alpha and Semantic values by default unless the user has customized them.

## Validation

After writing, read Figma again with a compact validation call and validate:

- Required collections and categories exist
- Required variables exist for the chosen system type or custom configuration
- Solid Neutral or Alpha Overlay follows the selected neutral model
- Standard product semantic colors are complete
- Multi-theme modes contain values for every theme where the token is theme-specific. For Light/Dark systems, Brand, Solid Neutral, and Semantic need Light/Dark values when Solid Neutral is selected; Alpha Overlay remains global. For multi-primary systems, Brand needs theme values while Solid Neutral or Overlay Alpha and Semantic may intentionally be shared.
- Radius variable names include concrete pixel values
- Capsule radius is `999px`
- Spacing values are multiples of 4 unless confirmed as an exception
- Text styles and effect styles were created or intentionally skipped
- No duplicate variables/styles were introduced

Report a short summary of what was created, updated, skipped, and any unresolved conflicts.

## Audits

For audits, do not write unless the user asks. Inspect the current Figma system and report:

- Missing required tokens for the selected type
- Naming inconsistencies
- Duplicate variables or styles
- Radius names missing values
- Non-4 spacing values
- Incomplete semantic colors
- Missing theme mode values
- Web-only states such as hover/focus in a mobile app system
