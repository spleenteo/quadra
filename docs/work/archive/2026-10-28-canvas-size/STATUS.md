---
status: closed
phase: done
slice: V3
work: canvas-size
stacks: [node]
base: main
updated: 2026-10-29
archived: 2026-10-29
tags: [work, canvas-size]
description: "Allargare il canvas di un'immagine con sfondo trasparente o di colore pieno, in modo proporzionale (lock) o con un valore diverso per ogni lato."
---

# Status — Canvas size

> Update at the **end of every session**: done, remaining, blockers.

**Entry**: product, decided on 2026-10-28 because what the feature does is clear but how it looks and behaves in the UI is still open. Problem clear: no frame, start from shaping. Breadboard skipped: few new interactions, all in existing code. Design phase planned on the existing `quadra.pen`.

## Slices

- [x] V1 — Padding uniforme trasparente
- [x] V2 — Padding lato per lato
- [x] V3 — Sfondo a colore ed export JPG

## Log

<!-- date — step — done — remaining — wall-clock — cost -->
- 2026-10-28 — open — home created, profile recorded (tests: none, design: pen) — shaping next — 10 min — n/a
- 2026-10-28 — shaping — shape selected: rail button "Canvas" on Crop's model, uniform px padding after resize, JPG flattened on white; fidelity check skipped (no frame) — design on quadra.pen next — 25 min — n/a
- 2026-10-28 — design — opened — panel and placement to draw — — 
- 2026-10-28 — design — closed: canvas-size.pen with two screens (locked PNG, per-side JPG), library quadra.lib.pen, quadra.pen moved to docs/design/; source-canvas variant tried and dropped; requirement corrections: none — slicing next — 60 min — n/a
- 2026-10-28 — slicing — 3 slices from parts M1–M8 (breadboard skipped); fidelity check skipped (no frame) — impact next — 10 min — n/a
- 2026-10-29 — impact — 1 high (crop overlay with padding), 5 medium, 6 low; all fixes applied to V1–V3 and shaping M3/M5/M8; drag & drop path bug left out as separate work — V1 plan next — 15 min — n/a
- 2026-10-29 — V1 closed — 5 tasks (2 added at the manual check: preview visibility, X1-B → X1-A); Done verified by the user; lessons.md created — V2 plan next — ~90 min — n/a
- 2026-10-29 — V2 closed — 2 tasks + 1 fix round (padding controls disabled in crop mode); resize keeps W and refits H on padding change; Done verified by the user — V3 plan next — ~45 min — n/a
- 2026-10-29 — V3 closed — 5 tasks + 1 fix round (T1 styles) + 1 fix at the manual check (background fills the whole canvas, rotation corners included); Done verified by the user — work close next (changelog, version, merge) — ~60 min — n/a
- 2026-10-29 — work closed — all slices done — changelog, version, merge next — — n/a
