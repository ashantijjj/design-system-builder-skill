# Token Rules

## Collections and Categories

Use clear slash-separated names. Preserve these top-level categories unless the user provides a custom configuration:

- `Neutrals/Grey`
- `Neutrals/White`
- `Brand`
- `Auxiliary`
- `Semantic`
- `Radius`
- `Spacing`

## Lightweight Style-First Mode

For lightweight product systems, default to styles instead of variables. Create paint styles for color tokens, text styles for typography, and effect styles for shadows. Do not create Figma variable collections unless the user or custom configuration enables variables.

Figma has no native radius or spacing style objects. In lightweight mode, treat radius and spacing as compact documented specs unless variables are enabled. If variables are enabled, use the normal `Radius` and `Spacing` number variable rules below.

## Neutrals

Create neutral colors as opacity variables, preferably RGBA.

For standard and multi-theme systems, do not create duplicate paint styles for neutral colors. Solid colors belong in variables. Paint styles are reserved for gradients or fills that color variables cannot represent.

Default `Neutrals/Grey` opacities:

- 90%, 80%, 70%, 60%, 50%, 40%, 30%, 20%, 10%, 7%, 5%, 3%, 1%

Default `Neutrals/White` opacities:

- 90%, 80%, 70%, 60%, 50%, 40%, 30%, 20%, 10%

Use the user-provided black/gray base color for grey opacities. Use `#FFFFFF` for white unless the user provides a different white.

Example names:

- `Neutrals/Grey/90%`
- `Neutrals/Grey/7%`
- `Neutrals/White/40%`

## Brand

Do not invent the brand primary color. Ask for it if missing.

The brand primary may be a solid color or a gradient. If the user provides a gradient, collect:

- gradient direction, such as left-to-right, top-to-bottom, or angle in degrees
- at least two color stops, including stop positions when available
- a solid fallback color for text contrast, derived shades, and non-gradient variables

Do not store gradients as Figma color variables because Figma color variables are solid RGBA values. Represent gradients as documented brand tokens and, when needed, create paint styles or visual swatches separately from color variables. Always keep a solid `Brand/primary` fallback.

For standard and multi-theme systems, do not create duplicate paint styles for `Brand/primary`, derived brand shades, semantic colors, or neutral colors when those values are already variables. Create paint styles only for `Brand/primary-gradient` or other non-solid fills that variables cannot represent.

For standard product and multi-theme systems, derive:

- `Brand/primary`
- `Brand/primary-gradient`, documented token or paint style when gradient input is provided
- `Brand/primary-light-1`
- `Brand/primary-light-2`
- `Brand/primary-dark-1`
- `Brand/primary-dark-2`
- `Brand/primary-text`

If the user provides a different naming convention, follow it consistently.

## Auxiliary

Auxiliary colors are optional. Only create them when the user provides auxiliary colors or explicitly asks Codex to suggest them.

## Semantic

For standard product and multi-theme systems, semantic colors must be complete:

- success
- warning
- error
- info

Each semantic color should also have a 10% helper/background variable.

Example names:

- `Semantic/success`
- `Semantic/success-10%`
- `Semantic/warning`
- `Semantic/warning-10%`

If the user provides semantic colors, use them. If missing in a standard product or multi-theme system, infer a balanced set and report the chosen values before writing.

## Radius

Every radius variable name must include the concrete pixel value.

Rules:

- Use `999px` for capsule/pill radius.
- Do not create radius names without values.
- Use number variables scoped to corner radius when writing to Figma.

Example names:

- `Radius/button-999px`
- `Radius/card-s-24px`
- `Radius/card-m-16px`
- `Radius/sheet-32px`
- `Radius/progress-4px`

## Spacing

Spacing must use multiples of 4.

Example names:

- `Spacing/4px`
- `Spacing/8px`
- `Spacing/12px`
- `Spacing/16px`
- `Spacing/20px`
- `Spacing/24px`
- `Spacing/32px`
- `Spacing/40px`

If a custom configuration includes non-4 spacing, ask for confirmation before writing it.

## Text Styles

Create only the text styles appropriate for the selected system type or custom configuration.

Use `typography-presets.md` for the default compact and full mobile typography presets.

Ask for font family before writing text styles. The default is one font family. Support one to three font families when the user provides a mapping; discourage more than three unless explicitly confirmed.

Use slash namespaces for text style grouping, such as `Headline/H1`, `Subtitle/S1`, `Body/B1`, `Caption/C1`, `Label`, and `Button/Large`. Avoid flat names like `H1. Headline` when the group can be represented as a Figma style folder.

Use existing fonts and local conventions when present. If weight, line height, size, or letter spacing is missing, use the selected preset or ask for a custom type scale before writing.

## Shadow and Effect Styles

Create only three default mobile app shadow effect styles unless the user provides a custom shadow configuration:

- `Shadow/S`
- `Shadow/M`
- `Shadow/L`

Default shadow values:

| Style | Layer | X | Y | Blur | Spread | Color |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `Shadow/S` | 1 | 0 | 1 | 4 | 0 | theme primary 4% |
| `Shadow/S` | 2 | 0 | 4 | 10 | 0 | theme primary 6% |
| `Shadow/M` | 1 | 0 | 2 | 16 | 0 | theme primary 4% |
| `Shadow/M` | 2 | 0 | 8 | 28 | 0 | theme primary 8% |
| `Shadow/L` | 1 | 0 | 8 | 24 | 0 | theme primary 6% |
| `Shadow/L` | 2 | 0 | 20 | 56 | 0 | theme primary 10% |

Rules:

- Default shadows must cast downward only. Do not create upward shadows by default.
- Use `X = 0` unless the user explicitly wants a directional shadow.
- Use the current theme primary color with opacity, not black opacity, unless the user explicitly asks for neutral shadows.
- For multi-theme systems, shadow colors should follow each theme primary color.
- If the user wants custom shadows, allow them to customize layer count, color source, opacity, x/y, blur, spread, and names.
- Avoid decorative or excessive shadow scales.
