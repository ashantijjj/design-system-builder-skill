# System Types

The three system types are default templates, not fixed packages. If the user or future UI provides a custom project configuration, follow the custom include/exclude list over the template.

## Shared Requirements

Every Figma write requires:

- Figma link
- Brand primary color
- Brand primary gradient stops and direction, if the brand primary is a gradient
- Black or gray base color for `Neutrals/Grey`
- White base color for `Neutrals/White`, default `#FFFFFF` if not provided

Optional inputs:

- Brand text color
- Solid fallback color for a brand gradient
- Auxiliary color
- Predefined semantic colors
- Custom radius, spacing, typography, or shadow list

Typography inputs:

- Font family is required before writing text styles.
- One font family is the default recommendation.
- One to three font families are allowed when the user provides a clear mapping, such as primary UI, numeric, or brand display.
- More than three font families is discouraged; ask for confirmation or simplification before writing.

Do not ask for app name, audience, or product category unless the user wants creative color/style suggestions.

## Lightweight Product

Use for small consumer mobile apps, MVPs, or products that need quick visual consistency without a heavy system.

Default behavior: style-first. In a future agent or UI, preselect `Style` for every lightweight module and make `Variables` an optional toggle. Small projects should not receive Figma variable collections unless the user explicitly enables variables or provides a custom configuration that includes them.

Generate as styles where Figma supports styles:

- `Neutrals/Grey` opacity paint styles
- `Neutrals/White` opacity paint styles
- `Brand` primary paint style
- `Brand` primary gradient paint style, if provided
- `Auxiliary` only if provided
- Basic `Semantic` paint styles: success, warning, error; info is optional
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
- Black or gray base color
- White base color, default `#FFFFFF`

Generate:

- `Brand`
  - primary
  - primary gradient paint style only if provided
  - two lighter colors derived from primary
  - two darker colors derived from primary
  - brand text color, inferred if not provided
- `Neutrals/Grey`
  - opacity variables based on the black/gray base
- `Neutrals/White`
  - opacity variables based on white
- `Semantic`
  - complete success, warning, error, info colors
  - 10% background/helper color for each semantic color
  - generated colors adapted to the brand primary's lightness and mutedness/greyness
- `Auxiliary`
  - only if the user provides auxiliary colors
- `Radius`
  - named with concrete pixel values
  - default set includes `4px`, `8px`, `12px`, `16px`, `20px`, `24px`, `28px`, `32px`, and `999px`
  - capsule radius `999px`
- `Spacing`
  - all multiples of 4
  - default set includes `4px`, `8px`, `12px`, `16px`, `20px`, `24px`, `28px`, `32px`, `40px`, and `48px`
- Text styles
  - compact or full typography preset from `typography-presets.md`; ask which preset to use if the user has not specified
- `Shadow/S`, `Shadow/M`, and `Shadow/L` effect styles

For standard product systems, solid colors must be variables only. Do not create duplicate solid-color paint styles. Use paint styles only for gradients or other fills that Figma color variables cannot represent.

Do not generate components until variables and styles are complete and the user confirms components are needed.

## Multi-Theme

Use when the project needs Light/Dark, multiple brands, seasonal skins, premium/default themes, or any other theme switching.

Treat each theme as a standard product color system. Required inputs:

- Figma link
- Theme count and theme names
- Brand primary color for each theme, or brand primary gradient plus a solid fallback for each theme
- Black or gray base color for each theme
- White base color for each theme, default `#FFFFFF`

For each theme, generate:

- Brand primary
- brand primary gradient paint style only if provided
- two lighter primary shades
- two darker primary shades
- Grey opacity variables
- White opacity variables
- complete semantic colors and 10% helper backgrounds
- semantic colors adapted independently to that theme's brand primary lightness and mutedness/greyness
- optional auxiliary colors if provided

Shared across themes by default:

- Radius
- Spacing
- Full typography preset from `typography-presets.md` unless the user provides a custom type scale
- `Shadow/S`, `Shadow/M`, and `Shadow/L` effect styles

For multi-theme systems, solid colors must be variables only. Do not create duplicate solid-color paint styles. Use paint styles only for gradients or other fills that Figma color variables cannot represent.

Use Figma variable modes for themes. Example modes: `Light`, `Dark`, `Premium`, `Seasonal`, or the names provided by the user.
