# Design files

This folder holds the project's design files: shared libraries, one file per area, and the HTML source of any Claude artifact. `/flow:design` keeps the table below current, and each file also describes itself inside. File names are written as code spans, never as links.

| File | Role | Contents | Imports |
|---|---|---|---|
| `quadra.lib.pen` | library | Design system and brand: Foundations (tokens: color, typography, shape, spacing, elevation), Components (buttons, chips, segment, tool toggle, form controls, panel parts, header, canvas overlays), App icon | none |
| `quadra.pen` | area: app | Screens: Empty state, Perspective editor, Alt · Editor layout, Landing page; still holds a local copy of Foundations, Components and App icon, not yet rewired to the library | none |
| `canvas-size.pen` | area: canvas-size | Screens for the canvas-size work (padding on the output): Base · Editor; 1 · Output padding, locked (PNG); 2 · Output padding, per side (JPG) | `quadra.lib.pen` |

`assets/` holds images the design files use: `checker-400x620.png` (the transparency checkerboard).
