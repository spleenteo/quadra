---
kind: decision
status: active
superseded_by: null
work: canvas-size
area: pipeline
touches: [renderer/app.js]
description: "Canvas padding runs between crop and resize, so Size and Output include it; padding after the resize is ruled out."
---

# The canvas padding runs before the resize, so Size includes it

**Date**: 2026-10-29

## The decision

The canvas padding stage runs between crop and resize (applyCanvasPadToStageD, stageC → stageD); the resize reads stageD, so the Size panel (W/H/%) and the "Output" hint include the padding. Without an active resize Size follows the padded size (expand); with a resize already set, the padding is scaled inside that size (contract).

## Context

The shaping first chose to add the padding after the resize, as the last pipeline stage, so the added px were exact in the saved file. At the manual check of slice V1 the user saw Size stay at 500 while the file was 580, and expected the canvas to enlarge the image and update Size, which they could then set back.

## Alternatives discarded

- **Padding after the resize (X1-B)**: the added px are always exact in the file, but Size does not show the real output size, which misled the user.
- **An explicit expand/contract option**: not needed for now, contracting is done by setting Size back after enlarging the canvas.

## Consequences

With a resize other than 100% the border is scaled with the image (40 px at 50% become 20 px). Setting W back with the aspect lock on does not give the original height, since the padding changes the aspect ratio.

## Reopen when

Users need borders in exact px regardless of the resize, or ask for an expand/contract switch.

## References

- docs/work/2026-10-28-canvas-size/shaping.md (X1, "Deciso il 2026-10-29")
- docs/work/2026-10-28-canvas-size/slices.md (V1 — done on 2026-10-29)

## Status log

- 2026-10-29 — recorded
