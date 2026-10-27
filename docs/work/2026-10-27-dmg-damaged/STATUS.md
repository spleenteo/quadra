---
status: open
phase: slice
slice: V1
step: execute
work: dmg-damaged
stacks: [node]
base: main
updated: 2026-10-27
tags: [work, dmg-damaged]
description: "L'app scaricata dal DMG si apre senza l'errore 'danneggiata'"
---

# Status — DMG damaged

> Update at the **end of every session**: done, remaining, blockers.

**Entry**: technical, decided on 2026-10-27 because the outcome fits one sentence: the downloaded app opens instead of being reported as damaged.

## Slices

- [ ] V1 — Ad-hoc signed bundle and correct first-launch instructions

## Log

<!-- date — step — done — remaining — wall-clock — cost -->
- 10-27 — opening + slicing — profile recorded, one-slice bugfix, option A (ad-hoc) chosen; frame, shaping, breadboard, design skipped (problem clear, no UI) — impact, V1 — 15 min — n/a
- 10-27 — impact — 0 high, 4 medium, 3 low; all 7 fixes applied to V1 (inside-out signing with verify, exact spctl criterion, release before push, Pages exclude, stale copy, zip check, afterPack) — V1 plan — 3 min — n/a
