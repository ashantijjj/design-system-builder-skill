# Token Rules

## Collections and Categories

Use clear slash-separated names. Preserve these top-level categories unless the user provides a custom configuration:

- `Neutrals/Grey`
- `Neutrals/White`
- `Brand`
- `Background`
- `Surface`
- `Border`
- `Auxiliary`
- `Semantic`
- `Radius`
- `Spacing`

## Lightweight Style-First Mode

For lightweight product systems, default to styles instead of variables. Create paint styles for color tokens, text styles for typography, and effect styles for shadows. Do not create Figma variable collections unless the user or custom configuration enables variables.

Figma has no native radius or spacing style objects. In lightweight mode, treat radius and spacing as compact documented specs unless variables are enabled. If variables are enabled, use the normal `Radius` and `Spacing` number variable rules below.

## Neutrals

Support two grey modes:

- opacity grey: grey tokens are RGBA opacity steps from the designer-provided black/gray base color
- solid neutral scale: grey tokens are opaque hex colors generated from a designer-provided black/base color to pure white

If the user does not specify the grey mode, ask whether to use opacity grey or solid neutral scale before writing.

The black/gray base color is required. If it is missing, ask for it. Do not invent or default it.

Do not use `#000000` as the black/gray base color. If the designer provides `#000000`, explain that pure black is too harsh as a system base and ask for a product-appropriate near-black value, such as a slightly warm, cool, or neutral black.

For standard and multi-theme systems, do not create duplicate paint styles for neutral colors. Solid colors belong in variables. Paint styles are reserved for gradients or fills that color variables cannot represent.

### Opacity Grey

Create opacity grey colors as RGBA variables or paint styles, depending on system type.

Default `Neutrals/Grey` opacities:

- 100%, 90%, 80%, 70%, 60%, 50%, 40%, 30%, 20%, 10%, 7%, 5%, 3%, 1%

Default `Neutrals/White` opacities:

- 100%, 90%, 80%, 70%, 60%, 50%, 40%, 30%, 20%, 10%

Use the user-provided non-`#000000` black/gray base color for grey opacities. Use `#FFFFFF` for white unless the user provides a different white.
Use solid hex values for `Neutrals/Grey/100%` and `Neutrals/White/100%`; use opacity values for lower steps.

Example names:

- `Neutrals/Grey/100%`
- `Neutrals/Grey/90%`
- `Neutrals/Grey/7%`
- `Neutrals/White/100%`
- `Neutrals/White/40%`

### Solid Neutral Scale

Use solid neutral scale when the designer prefers opaque grey values instead of opacity tokens.

Default names:

- `Neutral/900`
- `Neutral/800`
- `Neutral/700`
- `Neutral/600`
- `Neutral/500`
- `Neutral/400`
- `Neutral/300`
- `Neutral/200`
- `Neutral/100`
- `Neutral/50`
- `Neutral/00`

Rules:

- `Neutral/900` is the designer-provided non-`#000000` black/base color.
- `Neutral/00` is pure white `#FFFFFF`.
- Generate the intermediate values by changing perceived lightness in OKLCH/OKLab/LAB-like color space, not by equal RGB increments or simple white mixing.
- Preserve subtle hue bias from the base color, such as blue-black or warm-black, while reducing chroma as colors approach white.
- Keep visual distance between adjacent steps perceptually even; avoid tiny changes in the dark steps and sudden jumps in the light steps.
- Before writing generated solid neutral values to Figma, report the generated hex list to the user unless the user explicitly asked for direct execution.

Example from base `#21242A`:

- `Neutral/900` `#21242A`
- `Neutral/800` `#373A40`
- `Neutral/700` `#4F5257`
- `Neutral/600` `#686B6F`
- `Neutral/500` `#838589`
- `Neutral/400` `#9EA0A3`
- `Neutral/300` `#BABBBE`
- `Neutral/200` `#D2D3D5`
- `Neutral/100` `#E6E6E7`
- `Neutral/50` `#F5F5F6`
- `Neutral/00` `#FFFFFF`

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

Without an explicit custom configuration, the `Brand` color group contains exactly five solid color variables: primary, two lighter colors, and two darker colors. Do not create `Brand/primary-text`, `Brand/on-primary`, or any white/black text color inside `Brand`.

White belongs in `Neutrals/White` opacity tokens or `Neutral/00` for solid neutral scale. Text colors for primary backgrounds should reuse neutral/white tokens unless a later alias or text color layer is explicitly requested.

If the user provides a different naming convention, follow it consistently.

## Background

Background colors are optional. Ask once whether the designer wants background color tokens. If they do not provide or want background colors, skip the `Background` category.

Do not invent background colors by default. Use designer-provided background colors, or derive them only when the user explicitly asks for suggestions.

Default name for one provided background color:

- `Background/BG`

For multiple background colors, use purpose-based names:

- `Background/page`
- `Background/surface`
- `Background/card`
- `Background/elevated`

For multi-theme systems, keep background handling explicit:

- Light/Dark systems use Light and Dark values for the same `Background/BG` token. The designer may provide only one of the two backgrounds; derive the missing counterpart with OKLCH tone mapping. If both Light and Dark backgrounds are provided, use the manual values.
- Multi-primary systems default to one shared `Background/BG`.
- Multi-primary systems may use `冷暖双背景` when several themes clearly span cool and warm color families. In that case, keep the component-facing variable name stable as `Background/BG`, map each theme mode to either a cool or warm background value, and show the visual template as `Background/Cool/BG` and `Background/Warm/BG`.
- Multi-primary systems may use per-theme backgrounds only when the designer explicitly chooses this advanced option or provides per-theme background colors.

Do not assume every primary theme needs its own background color.

Light/Dark background derivation:

- Use OKLCH rather than RGB, HSL inversion, or simple black/white mixing.
- From a light background, derive the dark background by preserving hue softly, heavily reducing chroma, and mapping lightness into a dark surface range around `L 0.19-0.23`.
- From a dark background, derive the light background by preserving hue softly, heavily reducing chroma, and mapping lightness into a light surface range around `L 0.955-0.985`.
- Do not derive pure black or pure white unless the designer explicitly asks for it.

For standard and multi-theme systems, solid background colors belong in variables. Do not create duplicate paint styles for background colors unless the selected system is lightweight style-first.

## Surface

Surface tokens are optional support tokens. Do not generate them by default. Generate Surface only when the designer explicitly wants named card, sheet, button, or branded surface layers, or when a custom configuration includes them.

Default surface names:

- `Surface/Light`
- `Surface/Medium`
- `Surface/Dark`
- `Surface/Brand`

Rules:

- Use surface tokens to adapt components across light cards, medium/elevated cards, dark surfaces, or brand-colored surfaces.
- Do not solve surface contrast by creating many shadow variants.
- Do not create Surface merely because Shadow exists; this increases designer understanding cost in small and standard systems.
- Use designer-provided surface colors when available.
- If deriving surfaces from the neutral or brand palette, keep values subtle and harmonious with the grey mode and brand primary.
- For multi-theme systems, surface values may vary by theme mode, but the names should stay stable.

## Border

Border tokens are optional support tokens. Generate Border only when the designer wants reusable component separator or stroke colors, or when a custom configuration includes them.

Default border names:

- `Border/None`
- `Border/Subtle`
- `Border/Strong`

Default behavior:

- `Border/None` is transparent.
- `Border/Subtle` is a 1px visual edge for surfaces that need separation; on light surfaces use a dark/grey low-opacity edge, and on dark or brand surfaces use a white low-opacity edge.
- `Border/Strong` is a stronger 1px edge for denser or lower-contrast surfaces.

Rules:

- Use border tokens to compensate for different component surface colors, not extra shadow variants.
- Keep Border lightweight; do not force designers to use it when a component does not need a visible 1px separator.
- Keep border tokens as color variables or paint styles depending on system type. Stroke width remains a component or documentation rule unless the user asks for numeric border-width variables.
- Do not create per-color shadow names such as `Shadow/M Light`, `Shadow/M Dark`, or `Shadow/M Brand`.

## Auxiliary

Auxiliary colors are optional. If the user does not provide auxiliary colors, ask whether they are needed. If not needed, skip the `Auxiliary` category.

If auxiliary colors are needed, collect only one key/base color by default and derive two helper colors:

- `Auxiliary/base`: the designer-provided auxiliary color
- `Auxiliary/02`: derived helper color
- `Auxiliary/03`: derived helper color

Ask the designer whether derived helper colors should be solid colors or opacity colors when they have not specified a preference.

Solid derivation:

- `Auxiliary/02` mixes the base color with 50% white.
- `Auxiliary/03` mixes the base color with 90% white.
- Use opaque hex colors.

Opacity derivation:

- `Auxiliary/02` uses the base color at 50% opacity.
- `Auxiliary/03` uses the base color at 10% opacity, equivalent to mixing 90% white when placed on white.
- Use RGBA/opacity values.

Do not create broad auxiliary palettes by default. If the designer provides multiple auxiliary base colors, repeat the same `base`, `02`, and `03` structure per auxiliary group using names provided by the designer or a simple numbered namespace.

In multi-brand / multi-primary systems, auxiliary colors may have two scopes:

- shared auxiliary, shown to the designer as `统一辅助色`, creates the normal shared `Auxiliary/base`, `Auxiliary/02`, and `Auxiliary/03` tokens
- per-theme auxiliary, shown inside each theme card as `辅助色`, creates theme-scoped auxiliary tokens such as `Auxiliary/Theme 1/Auxiliary 1/base`

Do not call the shared field simply `辅助色` in multi-primary UI, because each theme can also have its own auxiliary colors.

## Visual Template Grouping

When creating the optional `Design System` visual page, do not duplicate shared foundations under every theme. Only expand a color token by theme/mode when its value actually changes by mode.

Default grouping:

- Multi-primary systems: show theme-specific Brand colors by theme; show shared Neutral, Overlay, Background, Semantic, Radius, Spacing, Typography, and Shadow only once.
- Multi-primary systems with `冷暖双背景`: show `Background/Cool/BG` and `Background/Warm/BG` once instead of duplicating Background under every theme.
- Light/Dark systems: show Light and Dark groups separately for tokens that truly differ, such as Brand, Solid Neutral, Background, Semantic, and Light/Dark auxiliary colors. Keep shared Overlay and other unchanged tokens in one shared group.
- Per-theme auxiliary colors may appear as theme-scoped Auxiliary tokens, but shared `统一辅助色` should appear once.

## Semantic

For standard product and multi-theme systems, semantic colors must be complete:

- success
- warning
- error
- info

Each semantic color should also have a 10% helper/background variable.

Semantic colors must visually fit the brand primary color while preserving familiar semantic hue families.

Use these hue families by default:

- success: green
- warning: yellow/orange
- error: red
- info: blue/cyan

Do not use the same bright red/green/yellow/blue set for every project. Keep the hue meanings recognizable, but tune each color so it belongs to the same palette as the brand primary.

Adapt generated semantic colors by:

- matching the brand primary's perceived lightness level: bright primary colors should receive brighter semantic colors; dark primary colors may use slightly lifted semantic colors for readability; mid-tone primary colors should receive mid-tone semantic colors
- matching the brand primary's mutedness/greyness: highly saturated primary colors can support clearer semantic colors; muted, greyish, or Morandi-like primary colors should receive restrained, lower-chroma semantic colors
- preserving semantic recognition while adjusting palette mood: success remains green, warning remains yellow/orange, error remains red, and info remains blue/cyan, but their brightness, saturation, and greyness should be tuned to the project palette
- checking contrast against the neutral background and available neutral/white text colors; adjust lightness before writing if the semantic color is too faint or visually louder than the primary

For multi-theme systems, generate or tune semantic colors independently for each theme mode. Do not copy one theme's semantic values into another theme when their brand primary colors have different lightness, saturation, or greyness.

Example names:

- `Semantic/success`
- `Semantic/success-10%`
- `Semantic/warning`
- `Semantic/warning-10%`

If the user provides semantic colors, use them unless they visibly clash with the primary; in that case, surface the mismatch and ask whether to keep the provided colors or adapt them. If missing in a standard product or multi-theme system, infer an adapted set and report the chosen values before writing.

## Radius

Every radius variable name must include the concrete pixel value.

Default radius values:

- `Radius/4px`
- `Radius/8px`
- `Radius/12px`
- `Radius/16px`
- `Radius/20px`
- `Radius/24px`
- `Radius/28px`
- `Radius/32px`
- `Radius/999px`

Rules:

- Use `999px` for capsule/pill radius.
- Always include `8px`, `12px`, `20px`, and `28px` in the default radius set.
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

Default spacing values:

- `Spacing/4px`
- `Spacing/8px`
- `Spacing/12px`
- `Spacing/16px`
- `Spacing/20px`
- `Spacing/24px`
- `Spacing/28px`
- `Spacing/32px`
- `Spacing/40px`
- `Spacing/48px`

Always include `8px`, `12px`, `20px`, and `28px` in the default spacing set.

If a custom configuration includes non-4 spacing, ask for confirmation before writing it.

## Text Styles

Create only the text styles appropriate for the selected system type or custom configuration.

Use `typography-presets.md` for the default compact and full mobile typography presets.

Ask for font family before writing text styles. The default is one font family. Support one to three font families when the user provides a mapping; discourage more than three unless explicitly confirmed.

Use slash namespaces for text style grouping, such as `Headline/H1`, `Subtitle/S1`, `Body/B1`, `Caption/C1`, and `Label`. Use `Button/Large` or `Button/Medium` only when optional dedicated button text styles are requested or needed; skip any button text style that duplicates an existing text style role, size, line height, weight, and spacing. Avoid flat names like `H1. Headline` when the group can be represented as a Figma style folder.

Use existing fonts and local conventions when present. The designer supplies font families only; resolve preset weights to the closest available non-italic Figma style automatically. If `Semi Bold`, `Medium`, or another requested style is missing, fall back through the nearest normal styles instead of failing. Support family names with embedded styles and mixed separators. If line height, size, or letter spacing is missing, use the selected preset or ask for a custom type scale before writing.

When a plugin or agent exposes font validation, render its result immediately below the affected input. Normalization and style fallback messages must name the actual font used. Do not automatically replace a fuzzy or misspelled family name; present one high-confidence candidate for explicit confirmation. Do not generate until a missing or unconfirmed font is resolved.

## Shadow and Effect Styles

Create only three default mobile app shadow effect styles unless the user provides a custom shadow configuration:

- `Shadow/S`
- `Shadow/M`
- `Shadow/L`

Default shadow values:

| Style | Layer | X | Y | Blur | Spread | Color |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `Shadow/S` | 1 | 0 | 1 | 4 | 0 | neutral shadow 4% |
| `Shadow/S` | 2 | 0 | 4 | 10 | 0 | neutral shadow 6% |
| `Shadow/M` | 1 | 0 | 2 | 16 | 0 | neutral shadow 4% |
| `Shadow/M` | 2 | 0 | 8 | 28 | 0 | neutral shadow 8% |
| `Shadow/L` | 1 | 0 | 8 | 24 | 0 | neutral shadow 6% |
| `Shadow/L` | 2 | 0 | 20 | 56 | 0 | neutral shadow 10% |

Rules:

- Default shadows must cast downward only. Do not create upward shadows by default.
- Use `X = 0` unless the user explicitly wants a directional shadow.
- Shadow tokens describe elevation only. They must stay shared across light, dark, brand, and colored component surfaces.
- Use a neutral shadow color source from the grey/neutral base at low opacity by default.
- Do not tint default shadows with brand primary colors. Brand feeling should come from `Surface/Brand`, brand fills, or border treatment.
- Do not create per-surface or per-theme shadow names such as `Shadow/S Light`, `Shadow/M Dark`, or `Shadow/L Brand`.
- Use `Border/Subtle`, `Border/Strong`, surface contrast, and radius to adjust how components read on different surfaces.
- If the user wants custom shadows, allow them to customize layer count, color source, opacity, x/y, blur, spread, and names.
- Avoid decorative or excessive shadow scales.
