---
name: design-system-builder
description: Build, modify, or audit Figma design systems for consumer mobile apps. Use when Codex needs to create or update Figma Variables, local text styles, effect styles, design tokens, or optional base components from a Figma link and user-provided token inputs; supports lightweight product, standard product, multi-theme systems, and project-specific custom configurations.
---

# Design System Builder

## Purpose

Use this skill as the rules base for creating, modifying, or auditing a Figma design system. It is optimized for consumer mobile app design systems, not web dashboards or admin products.

The skill provides default templates, naming rules, Figma write flow, validation rules, and optional component policy. A future agent or UI may pass a project-specific configuration; when a custom configuration is provided, follow it over the default template unless it violates a hard rule or the user confirms an exception.

## Hard Rules

- Require a Figma link before writing to Figma. Without a Figma link, only draft a plan or configuration.
- Ask only for token inputs needed to create variables and styles. Do not ask for app name, audience, or business context unless creative color/style inference is needed.
- Do not invent the brand primary color. Ask for it if missing.
- Accept a solid brand primary or a brand primary gradient. If the brand primary is a gradient, require gradient stops, direction, and a solid fallback color because Figma color variables are solid RGBA values.
- Default to consumer mobile app interaction patterns.
- Do not generate hover, focus-visible, desktop cursor, tooltip, dashboard, or web-only states unless the user explicitly asks for web/desktop/admin behavior.
- For lightweight product systems, default to style-first. Create paint, text, and effect styles where Figma supports styles; treat variables as optional and only create them when the user or custom configuration opts in.
- For standard and multi-theme systems, create solid colors as variables only. Do not also create duplicate solid-color paint styles. Use paint styles only for gradients or other fills that Figma color variables cannot represent.
- Require the designer to provide the font family before writing text styles. Default to one font family; support one to three font families when the user provides a mapping. If more than three font families are requested, ask for confirmation or simplification.
- Use the compact typography preset for lightweight systems, use compact or full typography for standard systems, and use full typography for multi-theme systems unless the user provides a custom type scale.
- Use spacing values that are multiples of 4.
- Use `999px` as the maximum capsule radius.
- Include the concrete pixel value in every radius variable name.
- Build `Neutrals/Grey` and `Neutrals/White` from opacity-based tokens: paint styles for lightweight style-first systems, variables for standard, multi-theme, or explicitly variable-enabled systems.
- Group text style names with slash namespaces for scanability, such as `Headline/H1`, `Subtitle/S1`, `Body/B1`, `Caption/C1`, and `Button/Large`.
- Use only three default shadow effect styles: `Shadow/S`, `Shadow/M`, and `Shadow/L`. Default shadows must cast downward only and use the current theme primary color with opacity. Designers may customize shadow layers in agent/UI configuration.
- Complete variables and styles first, validate them, then ask whether the user wants base components.
- Never create duplicate base components without inspecting existing Figma components first.
- If the Figma file already contains variables or styles, summarize what exists and ask whether to keep and supplement, delete and rebuild, or cancel before writing.
- Do not overwrite existing variables or styles with different values without surfacing the difference and confirming the action.
- Prefer the fast path for 0-to-1 creation: lightweight preflight, one combined write, and one lightweight validation. Avoid many small Figma calls unless conflicts or errors require them.

## Workflow

1. Determine the task type: create, modify, audit, or optional base components.
2. If creating, ask the user to choose a system type: lightweight product, standard product, or multi-theme. If a custom configuration is supplied, use it as the source of truth.
3. Read `references/system-types.md` for required inputs and default included items.
4. Read `references/token-rules.md` before generating token names, values, categories, modes, text styles, or effect styles.
5. Read `references/typography-presets.md` before creating text styles or asking for typography inputs.
6. For Figma writes or audits, read `references/figma-workflow.md`. Also follow the separate `figma-use` skill before every `use_figma` call.
7. If existing variables or styles are present, stop and ask the user how to handle them before writing.
8. Create or update variables and styles according to the selected type or custom configuration. For a new/empty system, use the fast path.
9. Validate the written Figma file: names, counts, values, modes, opacity systems, spacing multiples, radius naming, and semantic completeness.
10. After variables and styles are complete, ask whether to generate base components. If yes, read `references/component-policy.md`, inspect existing components first, then only create missing foundations.

## System Types

Use the three default templates only as starting points:

- Lightweight product: minimal style-first single-theme system for small mobile products or MVPs; variables are optional.
- Standard product: complete single-theme system and the default recommendation.
- Multi-theme: standard product system repeated across two or more theme modes.

Designers may remove, add, or customize items before generation. Treat custom project scope as intentional and preserve it unless it conflicts with a hard rule.

## Resources

- `references/system-types.md`: default templates, required inputs, and included items.
- `references/token-rules.md`: naming, opacity, color, radius, spacing, typography, and shadow rules.
- `references/typography-presets.md`: compact and full mobile typography presets.
- `references/figma-workflow.md`: safe Figma read/write/validate procedure.
- `references/component-policy.md`: optional mobile component policy after tokens and styles are complete.
