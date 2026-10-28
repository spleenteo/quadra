---
status: open
phase: impact
slice: null
step: null
work: canvas-size
stacks: [node]
base: main
updated: 2026-10-28
tags: [work, canvas-size]
description: "Allargare il canvas di un'immagine con sfondo trasparente o di colore pieno, in modo proporzionale (lock) o con un valore diverso per ogni lato."
---

# Status — Canvas size

> Update at the **end of every session**: done, remaining, blockers.

**Entry**: product, decided on 2026-10-28 because what the feature does is clear but how it looks and behaves in the UI is still open. Problem clear: no frame, start from shaping. Breadboard skipped: few new interactions, all in existing code. Design phase planned on the existing `quadra.pen`.

## Slices

- [ ] V1 — Padding uniforme trasparente
- [ ] V2 — Padding lato per lato
- [ ] V3 — Sfondo a colore ed export JPG

## Log

<!-- date — step — done — remaining — wall-clock — cost -->
- 2026-10-28 — open — home created, profile recorded (tests: none, design: pen) — shaping next — 10 min — n/a
- 2026-10-28 — shaping — shape selected: rail button "Canvas" on Crop's model, uniform px padding after resize, JPG flattened on white; fidelity check skipped (no frame) — design on quadra.pen next — 25 min — n/a
- 2026-10-28 — design — opened — panel and placement to draw — — 
- 2026-10-28 — design — closed: canvas-size.pen with two screens (locked PNG, per-side JPG), library quadra.lib.pen, quadra.pen moved to docs/design/; source-canvas variant tried and dropped; requirement corrections: none — slicing next — 60 min — n/a
- 2026-10-28 — slicing — 3 slices from parts M1–M8 (breadboard skipped); fidelity check skipped (no frame) — impact next — 10 min — n/a
