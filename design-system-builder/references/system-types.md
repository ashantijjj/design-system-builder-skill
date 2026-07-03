# System Types

The three system types are default templates, not fixed packages. If the user or future UI provides a custom project configuration, follow the custom include/exclude list over the template.

## Shared Requirements

Every Figma write requires:

- Figma link
- Brand primary color
- Brand primary gradient stops and direction, if the brand primary is a gradient
- Black or gray base color for Solid Neutral or `Overlay/Black`; it must not be `#000000` by default
- White base color for Solid Neutral endpoints or `Overlay/White`, default `#FFFFFF` if not provided

Optional inputs:

- Solid fallback color for a brand gradient
- Auxiliary color
- Background color
- Predefined semantic colors
- Custom radius, spacing, typography, or shadow list

Typography inputs:

- Font family is required before writing text styles.
- One font family is the default recommendation.
- One to three font families are allowed when the user provides a clear mapping, such as primary UI, numeric, title accent, or brand display.
- More than three font families is discouraged; ask for confirmation or simplification before writing.

Do not ask for app name, audience, or product category unless the user wants creative color/style suggestions.

## Lightweight Product

Use for small consumer mobile apps, MVPs, or products that need quick visual consistency without a heavy system.

Default behavior: style-first. In a future agent or UI, preselect `Style` for every lightweight module and make `Variables` an optional toggle. Small projects should not receive Figma variable collections unless the user explicitly enables variables or provides a custom configuration that includes them.

Generate as styles where Figma supports styles:

- `Overlay/Black` and `Overlay/White` opacity paint styles by default
- `Brand` primary paint style
- `Brand` primary gradient paint style, if provided
- `Auxiliary` only if provided
- Basic `Semantic` paint styles: success and error by default; warning and info are optional
- Compact typography preset from `typography-presets.md`
- Optional `Shadow/S`, `Shadow/M`, and `Shadow/L` effect styles if useful

Handle modules without native Figma styles:

- Radius: document a small radius set with values in names; create number variables only if variables are enabled.
- Spacing: document a small spacing set using multiples of 4; create number variables only if variables are enabled.

If variables are enabled, create the lightweight color and number variables using the same naming rules in `token-rules.md`.

Avoid:

- Default variable collections
- Multi-theme modes
- Complex alias layers
- Full component libraries
- Frontend token export unless explicitly requested

## Standard Product

Use as the default recommendation for a complete consumer mobile app design system.

Required inputs:

- Figma link
- Brand primary color, or brand primary gradient plus a solid fallback
- Black or gray base color, not `#000000`
- White base color, default `#FFFFFF`

Generate:

- `Brand`
  - primary
  - primary gradient paint style only if provided
  - two lighter colors derived from primary
  - two darker colors derived from primary
- `Neutral`
  - solid neutral variables if the designer chooses Solid Neutral
- `Overlay/Black` and `Overlay/White`
  - opacity variables if the designer chooses Alpha Overlay
- `Semantic`
  - complete success, warning, error, info colors
  - 10% background/helper color for each semantic color
- `Auxiliary`
  - only if the user provides auxiliary colors
- `Background`
  - only if the user provides a background color or enables the Background module
- `Radius`
  - named with concrete pixel values
  - capsule radius `999px`
- `Spacing`
  - all multiples of 4
- Text styles
  - full typography preset from `typography-presets.md` by default; use compact if the user chooses a smaller system
- `Shadow/S`, `Shadow/M`, and `Shadow/L` effect styles

For standard product systems, solid colors must be variables only. Do not create duplicate solid-color paint styles. Use paint styles only for gradients or other fills that Figma color variables cannot represent.

Do not generate components until variables and styles are complete and the user confirms components are needed.

## Multi-Theme

Use when the project needs Light/Dark, multiple brands, seasonal skins, premium/default themes, or any other theme switching.

First identify the multi-theme type:

- Light/Dark: one primary color with light and dark mode values.
- Multi-primary: two to five primary colors that share one light or dark background atmosphere by default.

Required inputs:

- Figma link
- Theme count and optional theme names
- For Light/Dark: one brand primary color, or one brand primary gradient plus a solid fallback
- For multi-primary: a brand primary color for each theme, or a brand primary gradient plus a solid fallback for each theme
- Black or gray base color. For Light/Dark systems using Solid Neutral, use it as the Light neutral base and derive a Dark neutral set unless the user provides a custom dark neutral base.
- White base color, default `#FFFFFF`

For each theme or mode, generate Brand values:

- Brand primary
- brand primary gradient paint style only if provided
- two lighter primary shades
- two darker primary shades
- optional auxiliary colors if provided

For Light/Dark systems, adapt the Dark primary from the Light primary with tonal rules instead of duplicating the exact Light value. Keep hue stable, raise lightness, cap saturation, and validate contrast against the Dark background.

For Light/Dark systems using Solid Neutral, also generate Light and Dark mode values for:

- Solid Neutral values
- complete semantic colors and 10% helper backgrounds

For Light/Dark systems using Alpha Overlay, keep `Overlay/Black` and `Overlay/White` global and shared. Do not duplicate overlays into Light and Dark modes.

For multi-primary systems, share these by default:

- one Solid Neutral system or one global Overlay Alpha system, depending on the selected neutral model
- one complete semantic set and 10% helper backgrounds, based on the overall tone of the primary colors

Shared across themes by default:

- Radius
- Spacing
- Full typography preset from `typography-presets.md` unless the user provides a custom type scale
- `Shadow/S`, `Shadow/M`, and `Shadow/L` effect styles with fixed geometry and Neutral Ambient color

For multi-theme systems, solid colors must be variables only. Do not create duplicate solid-color paint styles. Use paint styles only for gradients or other fills that Figma color variables cannot represent.

Use Figma variable modes for themes. Example modes: `Light`, `Dark`, `Theme 1`, `Theme 2`, or the names provided by the user. For Light/Dark, do not create literal `Light/` and `Dark/` duplicated variable names when variable modes can represent the values.
