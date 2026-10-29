---
kind: deferral
status: open
resolved_by: null
work: canvas-size
area: pipeline
touches: [renderer/app.js]
description: "Known: with active resize and locked aspect, the crop preview is stretched and Confirm crop never refits resizeH; left as is."
---

# With an active resize, the crop preview is stretched and Confirm crop does not refit resizeH

**Date**: 2026-10-29

## The decision

Known problem left as is: with an active resize and the aspect ratio locked, the Edit crop preview is stretched when a crop rectangle or canvas padding exists, and Confirm crop never refits resizeH to the new aspect.

## Context

In crop mode stageC holds the whole uncropped image and padding is zero, but resizeW/resizeH keep the values set for the cropped/padded output; applyResizeToPreview never re-syncs them while resizeActive is true. Found by the review of slice V2 of canvas-size.

## Why deferred

It belongs to the crop and resize flow, not to the canvas work, and existed before it for the crop rectangle; the canvas work only avoided making it worse (padding controls disabled in crop mode).

## Consequences

Users who resize, then crop, see a distorted preview while cropping and may get an output with the old height after confirming until they touch Size again.

## Reopen when

Any work on crop or resize, or a user report of a stretched crop preview.

## References

- docs/work/archive/2026-10-28-canvas-size/slices.md (V2 — done on 2026-10-29)
- docs/work/archive/2026-10-28-canvas-size/V2-ledger.md

## Status log

- 2026-10-29 — recorded
