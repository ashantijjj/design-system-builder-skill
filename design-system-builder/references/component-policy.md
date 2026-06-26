# Component Policy

Base components are optional and must come after variables and styles.

## Default Position

Do not generate base components by default. After variables and styles are complete and validated, ask whether the user wants base components.

If yes:

1. Inspect existing Figma components first.
2. Report what already exists.
3. Ask which missing components to create.
4. Create only missing foundations.
5. Bind components to variables and text styles rather than hardcoding visual values.

## Consumer Mobile Defaults

Default to consumer mobile app interactions.

Allowed states by default:

- default
- pressed
- disabled
- loading
- selected
- unselected
- error, only where relevant
- success, only where relevant

Do not generate by default:

- hover
- focus-visible
- desktop cursor states
- tooltip behavior
- dashboard tables
- web sidebar/navigation systems

Only add these when the user explicitly says the project is web, desktop, dashboard, admin, or needs hover/focus.

## Candidate Components

When requested, create a small useful set, not a full component library:

- Button
- Input/Text Field
- Card
- Bottom Tab
- Segmented Control
- List Item
- Toast
- Modal/Sheet
- Toggle/Checkbox/Radio when needed

Button specs should cover height, padding, radius token, color token, text style, and mobile states. Do not add a touch target rule unless the user requests it.
