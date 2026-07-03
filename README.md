# Design System Builder Skill

Codex skill and web demo for creating, modifying, and auditing Figma design systems for consumer mobile apps.

## What is included

- `design-system-builder/` - Codex skill rules, Figma workflow, token rules, typography presets, and component policy.
- `docs/` - public web demo for configuring and previewing a project-specific design system.

## Install the skill

Copy the skill folder into your Codex skills directory:

```bash
mkdir -p ~/.codex/skills
cp -R design-system-builder ~/.codex/skills/design-system-builder
```

Then restart Codex or open a new Codex session.

Use it in Codex with:

```text
$design-system-builder
```

The skill requires a Figma link before writing to Figma. It supports lightweight product, standard product, multi-theme systems, and custom configurations.

## Web demo

The demo is a static page in `docs/`. If GitHub Pages is enabled for this repository, publish it from:

```text
Branch: main
Folder: /docs
```

Then open:

```text
https://ashantijjj.github.io/design-system-builder-skill/
```

## Current rules snapshot

- Lightweight defaults to style-first, compact typography, and Overlay Alpha.
- Standard defaults to variables, full typography, and Solid Neutral.
- Multi-theme supports Light/Dark and multi-primary systems.
- Light/Dark can split Brand, Semantic, and Solid Neutral values while keeping Overlay Alpha global.
- Multi-primary splits Brand per theme and shares Neutral/Overlay and Semantic by default.
- Shadows stay as three shared styles: `Shadow/S`, `Shadow/M`, and `Shadow/L`.
