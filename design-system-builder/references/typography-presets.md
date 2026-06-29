# Typography Presets

Use these presets when the user has not supplied a custom type scale. The user must still provide the font family before writing text styles.

## Font Family Intake

- Ask for the font family before writing text styles.
- Default to one font family for the whole system.
- Allow one to three font families only when the user provides a clear mapping, such as primary UI, numeric, or brand display.
- If more than three font families are requested, ask for confirmation or simplification before writing.
- Use `letterSpacing: 0` unless the user explicitly provides another value.

## Multiple Font Families

When the designer provides two or three font families:

- Ask which font is the primary font. The primary font owns the complete typography preset.
- Ask where each secondary font is used. Secondary fonts must be purpose-based and partial; do not duplicate the complete preset for secondary fonts.
- Common secondary-font uses include headline accent words, full display headlines, numbers, prices, brand display text, English-only text, or a specific module title.
- If a secondary font is used inside the same headline or text block as the primary font, use the primary font's size and line height as the reference. Adjust the secondary font size, weight, and line height until it visually matches the primary font's apparent size and rhythm, even when the numeric size is different.
- Do not create mixed-font text styles as the default. Create separate purpose-based styles and show mixed examples in the visual template when requested.

Default secondary-font style names:

| Use | Example Style Name |
| --- | --- |
| Headline accent word | `Headline/Accent` |
| Full display headline | `Headline/Display` |
| Numbers or prices | `Number/Large`, `Number/Body` |
| Brand display text | `Brand/Display` |
| English-only text | `English/Body` |

## Preset Selection

- Lightweight product: use the compact preset by default.
- Standard product: use the compact or full preset. Ask which preset to use if the user does not specify.
- Multi-theme: use the full preset by default.
- Custom configuration: follow the custom typography list over these presets.
- Do not create a separate button text-style group by default. Reuse existing text styles for buttons unless the user asks for dedicated button styles or a button component truly needs a tighter line-height style.

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

## Optional Button Text Styles

Keep button typography minimal. Button components should first reuse existing text styles:

- Compact preset: use `Subtitle` for primary/default buttons and `Caption` for small buttons.
- Full preset: use `Subtitle/S2`, `Body/B2`, `Label`, or `Caption/C2` depending on button size.

Create dedicated `Button` text styles only when the user asks for them or when a button component requires a tighter line height than the reusable styles above. Before creating them, skip any button style that duplicates an existing style role, size, line height, weight, and spacing.

If dedicated button styles are needed, use at most these two by default:

| Style | Weight | Size | Line | Spacing |
| --- | --- | ---: | ---: | ---: |
| Button/Large | Semi Bold | 16 | 20 | 0 |
| Button/Medium | Semi Bold | 14 | 16 | 0 |

## Figma Naming

- Keep style names human-readable and close to the preset labels.
- Use slash namespaces for grouped typography, such as `Headline/H1`, `Subtitle/S1`, `Body/B1`, `Caption/C1`, and optional `Button/Large`.
- Do not create hover, focus, desktop, or web-only text styles unless explicitly requested.
