# Typography Presets

Use these presets when the user has not supplied a custom type scale. The user must still provide the font family before writing text styles.

## Font Family Intake

- Ask for the font family before writing text styles.
- Default to one font family for the whole system.
- Allow one to three font families only when the user provides a clear mapping, such as primary UI, numeric, or brand display.
- If more than three font families are requested, ask for confirmation or simplification before writing.
- Use `letterSpacing: 0` unless the user explicitly provides another value.

## Preset Selection

- Lightweight product: use the compact preset by default.
- Standard product: use the compact or full preset. Ask which preset to use if the user does not specify.
- Multi-theme: use the full preset by default.
- Custom configuration: follow the custom typography list over these presets.

## Compact Preset

Use for lightweight product systems and for standard product systems that need a leaner type scale.

| Style | Weight | Size | Line | Spacing |
| --- | --- | ---: | ---: | ---: |
| Headline/H1 | Semi Bold | 30 | 38 | 0 |
| Headline/H2 | Semi Bold | 24 | 32 | 0 |
| Headline/H3 | Semi Bold | 20 | 28 | 0 |
| Title | Semi Bold | 18 | 26 | 0 |
| Subtitle | Semi Bold | 16 | 24 | 0 |
| Body | Regular | 14 | 22 | 0 |
| Caption | Regular | 12 | 18 | 0 |

## Full Preset

Use for standard product systems that need a fuller type scale, and for multi-theme systems.

| Style | Weight | Size | Line | Spacing |
| --- | --- | ---: | ---: | ---: |
| Headline/H1 | Semi Bold | 48 | 58 | 0 |
| Headline/H2 | Semi Bold | 40 | 48 | 0 |
| Headline/H3 | Semi Bold | 32 | 38 | 0 |
| Headline/H4 | Semi Bold | 28 | 34 | 0 |
| Headline/H5 | Semi Bold | 24 | 28 | 0 |
| Subtitle/S1 | Semi Bold | 18 | 28 | 0 |
| Subtitle/S2 | Semi Bold | 16 | 24 | 0 |
| Body/B1 | Regular | 16 | 24 | 0 |
| Body/B2 | Medium | 16 | 24 | 0 |
| Body/B3 | Regular | 14 | 20 | 0 |
| Body/B4 | Medium | 14 | 20 | 0 |
| Caption/C1 | Regular | 12 | 16 | 0 |
| Caption/C2 | Medium | 12 | 16 | 0 |
| Caption/C3 | Medium | 10 | 14 | 0 |
| Label | Medium | 12 | 16 | 0 |

## Button Font Preset

Use for standard product and multi-theme systems when button text styles are included. For lightweight product systems, include button styles only when the user asks for base components or button text styles.

| Style | Weight | Size | Line | Spacing |
| --- | --- | ---: | ---: | ---: |
| Button/Giant | Semi Bold | 18 | 24 | 0 |
| Button/Large | Semi Bold | 16 | 20 | 0 |
| Button/Medium | Semi Bold | 14 | 16 | 0 |
| Button/Small | Semi Bold | 12 | 16 | 0 |
| Button/Tiny | Semi Bold | 10 | 12 | 0 |

## Figma Naming

- Keep style names human-readable and close to the preset labels.
- Use slash namespaces for grouped typography, such as `Headline/H1`, `Subtitle/S1`, `Body/B1`, `Caption/C1`, and `Button/Giant`.
- Do not create hover, focus, desktop, or web-only text styles unless explicitly requested.
