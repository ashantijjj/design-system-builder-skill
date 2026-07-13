# Design System Builder Figma Plugin

Local MVP plugin for writing the design system into the currently open Figma file.

## Install Locally

1. Open Figma Desktop.
2. Go to `Plugins -> Development -> Import plugin from manifest...`.
3. Select this file:

```text
/Users/apple/Documents/Codex/2026-06-22/gen/work/design-system-builder-figma-plugin/manifest.json
```

4. Run `Plugins -> Development -> Design System Builder`.

## MVP Scope

- Creates color variables or paint styles for Brand, Neutral/Overlay, Semantic, Auxiliary, and Background.
- Uses Figma variable modes for multi-theme color variables: `Light/Dark` for dark mode, or theme names for multi-primary.
- Creates number variables for Radius and Spacing except in lightweight style-first mode.
- Creates Text Styles, Typography Tokens, or both from the selected typography preset.
- Creates three shadow effect styles: `Shadow/S`, `Shadow/M`, `Shadow/L`.
- Optionally creates a `Design System` visual page with swatches and typography rows.
- Supports lightweight, standard, light/dark theme, and multi-primary theme inputs.
- Supports solid primary colors and primary gradients. Gradients are paint styles; their representative color is used for variables.
- Supports up to 5 multi-primary themes, each with up to 5 auxiliary colors.
- Supports up to 2 secondary fonts in standard and multi-theme systems.
- Resolves typography styles against the fonts available in Figma, including Regular-only fonts and libraries that encode weight in the family name.
- Shows inline font resolution feedback, including explicit confirmation for high-confidence spelling suggestions before generation.
- Before rebuilding, only prompts for same-name items, prior plugin-generated items, and the `Design System` visual page instead of deleting broad naming prefixes.

This MVP writes to the currently open Figma file. It does not need a Figma link.

## Known MVP Limits

- Gradient styles cannot use Figma variable modes, so multi-theme gradients are generated as separate paint styles.
- Typography token output writes font family, weight name, numeric weight, size, line height, and spacing where the local Figma variable API supports the needed variable types.
- Surface and Border remain advanced modules and are not included in this local plugin flow yet.

## Rule Sync

The canonical design-system rules live in `../design-system-builder-web/rules/config.js`.
The generated block at the top of `code.js` is synced from that file so the web
demo and the plugin do not need separate manual rule edits.

After editing rules, run:

```bash
node work/design-system-builder-figma-plugin/scripts/sync-rules-to-plugin.js
```

Then reload the local plugin in Figma.
