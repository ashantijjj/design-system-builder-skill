# Design System Rules

`config.js` is the shared rule source for the web demo and the future Figma writer.

When a design-system rule changes, update this file first:

- default modules and required input behavior
- brand, neutral, semantic, auxiliary, surface, and border token rules
- typography presets and secondary-font rules
- radius and spacing values
- shadow style layers
- validation constants

The web app reads `window.DESIGN_SYSTEM_RULES` from this file before `app.js`.
The future Figma writer should read the same rule object so the generated preview
and the actual Figma output stay aligned.
