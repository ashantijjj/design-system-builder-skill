# Token Rules

## Collections and Categories

Use clear slash-separated names. Preserve these top-level categories unless the user provides a custom configuration:

- `Neutral`
- `Overlay/Black`
- `Overlay/White`
- `Brand`
- `Auxiliary`
- `Semantic`
- `Background`
- `Surface`
- `Border`
- `Radius`
- `Spacing`

## Lightweight Style-First Mode

For lightweight product systems, default to styles instead of variables. Create paint styles for color tokens, text styles for typography, and effect styles for shadows. Do not create Figma variable collections unless the user or custom configuration enables variables.

Figma has no native radius or spacing style objects. In lightweight mode, treat radius and spacing as compact documented specs unless variables are enabled. If variables are enabled, use the normal `Radius` and `Spacing` number variable rules below.

## Neutrals

Keep Solid Neutral and Alpha Overlay as separate models.

Solid Neutral is a final color scale for text, icons, backgrounds, and surfaces. Alpha Overlay is a transparent tool for dividers, pressed states, disabled states, scrims, and other background-dependent effects.

For standard and multi-theme systems, do not create duplicate paint styles for solid neutral colors. Solid colors belong in variables. Paint styles are reserved for gradients or fills that color variables cannot represent.

Default Overlay Alpha steps:

- `Overlay/Black`: 100%, 80%, 60%, 40%, 20%, 10%, 5%
- `Overlay/White`: 100%, 80%, 60%, 40%, 20%, 10%, 5%

Lightweight systems use a reduced neutral set by default:

- `Overlay/Black`: 100%, 80%, 60%, 40%, 20%, 15%, 10%, 5%
- `Overlay/White`: 100%, 90%, 80%, 60%, 40%, 20%, 10%, 5%

Use the user-provided black/gray base color for `Overlay/Black`. Use `#FFFFFF` for `Overlay/White` unless the user provides a different white.

The black/gray base is required for real Figma writes. Do not provide `#000000` as a default, and do not silently accept `#000000`; ask the user for a usable near-black or gray base.

For Solid Neutral, create a solid scale such as `Neutral/900 ... Neutral/00`. In Light/Dark systems, Solid Neutral may have Light and Dark mode values. The current default implementation may derive Dark neutral values with HSL lightness adjustment; keep this simple until the user asks for a more advanced color-space method. For multi-primary systems, use one shared Solid Neutral set by default because most multi-primary apps keep one neutral atmosphere across brand colors.

For Alpha Overlay, do not create Light/Dark duplicates. Keep one global `Overlay/Black` and one global `Overlay/White` set. Light UI generally uses black overlays; dark UI generally uses white overlays. Semantic/component tokens decide which overlay to reference.

Example names:

- `Neutral/900`
- `Neutral/00`
- `Overlay/Black/40%`
- `Overlay/White/20%`

## Brand

Do not invent the brand primary color. Ask for it if missing.

The brand primary may be a solid color or a gradient. If the user provides a gradient, collect:

- gradient direction, such as left-to-right, top-to-bottom, or angle in degrees
- at least two color stops, including stop positions when available
- a solid fallback color for derived shades and non-gradient variables

Do not store gradients as Figma color variables because Figma color variables are solid RGBA values. Represent gradients as documented brand tokens and, when needed, create paint styles or visual swatches separately from color variables. Always keep a solid `Brand/primary` fallback.

For standard and multi-theme systems, do not create duplicate paint styles for `Brand/primary`, derived brand shades, semantic colors, or neutral colors when those values are already variables. Create paint styles only for `Brand/primary-gradient` or other non-solid fills that variables cannot represent.

For standard product and multi-theme systems, derive:

- `Brand/primary`
- `Brand/primary-gradient`, documented token or paint style when gradient input is provided
- `Brand/primary-light-1`
- `Brand/primary-light-2`
- `Brand/primary-dark-1`
- `Brand/primary-dark-2`

If the user provides a different naming convention, follow it consistently.

## Light/Dark Primary Adaptation

When creating a Light/Dark system, do not use a fixed "mix 18% white" rule for the Dark primary. Use a lightweight tonal adaptation rule instead:

- Preserve the primary hue.
- Raise lightness into a dark-background-safe range, default about 65%-78% in HSL.
- Cap saturation, default maximum about 72%, so the color does not become neon or harsh on dark backgrounds.
- Let very dark backgrounds push the target lightness slightly higher.
- Check the adapted Dark primary against the Dark background with at least 3:1 contrast for non-text UI use.

This is a simplified HSL implementation inspired by mature tonal-palette systems such as Material 3. It is not intended to replace a full HCT/OKLCH color engine yet.

## Auxiliary

Auxiliary colors are optional. Only create them when the user provides auxiliary colors or explicitly asks Codex to suggest them.

For each auxiliary base color, create:

- `Auxiliary/base`
- `Auxiliary/02`, mixed from the auxiliary base toward white at 50%
- `Auxiliary/03`, mixed from the auxiliary base toward white at 90%

If the user prefers transparency-based auxiliary helpers, keep the same naming but use opacity values instead of solid white-mix values.

In multi-primary systems, auxiliary colors may be attached to each theme. Default to one optional auxiliary slot per theme, and support up to five auxiliary colors per theme in agent/UI flows.

## Background, Surface, and Border

Background color is optional. Ask for it as a useful optional input, but do not block generation when it is missing unless the user enabled the Background module.

Surface and Border are advanced optional modules. Keep them off by default. Only generate them when the user explicitly enables them or provides a custom configuration that includes them.

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

Semantic hue must stay recognizable:

- success stays green
- warning stays yellow/amber
- error stays red
- info stays blue

Theme tone may influence semantic lightness and saturation, but it must not push semantic colors away from their conventional meaning. Do not simply copy the brand color tone onto semantic colors. Use a restrained HSL tone-following rule with guardrails so muted themes get softer semantic colors and bright themes get clearer semantic colors, while warning still reads as warning and error still reads as error.

For multi-theme systems:

- Light/Dark mode: create Light and Dark mode values for Semantic tokens.
- Multi-primary mode: create one shared Semantic set by default, based on the overall tone of the primary colors. Do not duplicate Semantic per primary color unless the user explicitly asks or the theme tones are intentionally extreme.

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
| `Shadow/S` | 1 | 0 | 1 | 4 | 0 | Neutral Ambient 4% |
| `Shadow/S` | 2 | 0 | 4 | 10 | 0 | Neutral Ambient 6% |
| `Shadow/M` | 1 | 0 | 2 | 16 | 0 | Neutral Ambient 4% |
| `Shadow/M` | 2 | 0 | 8 | 28 | 0 | Neutral Ambient 8% |
| `Shadow/L` | 1 | 0 | 8 | 24 | 0 | Neutral Ambient 6% |
| `Shadow/L` | 2 | 0 | 20 | 56 | 0 | Neutral Ambient 10% |

Rules:

- Default shadows must cast downward only. Do not create upward shadows by default.
- Use `X = 0` unless the user explicitly wants a directional shadow.
- Use Neutral Ambient with opacity by default, not brand primary color. For light backgrounds, derive Neutral Ambient from the user-provided black/gray base. For dark backgrounds, derive a light neutral ambient suitable for dark surfaces.
- Keep shadow geometry fixed across themes. For multi-primary systems, keep one shared S/M/L shadow set by default. For Light/Dark systems, keep the same S/M/L names and geometry while values may use Light/Dark mode ambient colors when supported.
- Add warm/cool or brand-specific shadow exceptions only when the user explicitly needs a special environmental light effect. Do not create one shadow set per brand by default.
- If the user wants custom shadows, allow them to customize layer count, color source, opacity, x/y, blur, spread, and names.
- Avoid decorative or excessive shadow scales.
