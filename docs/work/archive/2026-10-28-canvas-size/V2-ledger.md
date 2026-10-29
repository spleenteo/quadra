# Ledger — V2
env: (force/model; empty = unset)
- T1 · flow:executor · definition: mid · DONE · b45a1fa
- T1 review · conductor, in session · pass — markup and CSS match T1; executor's concern is inaccurate (without `active` the open icon shows, not none) and harmless, updateUI writes `active` on the first render
- Ruling: T1 reviewed in session — markup and CSS only, diff read in full — cost if wrong: a visual glitch caught at the manual check
- T1: complete
- T2 · flow:executor · definition: mid · DONE · 050845c
- T2 review · flow:task-reviewer · opus · spec pass, quality pass · medium: in crop mode fitResizeToCanvasPad uses the uncropped stageC and the wrong resizeH sticks; medium: plan steps 3–4 could not pass (plan defect, fixed in V2-plan.md); low: step 7 wording (fixed), commit-split reason inaccurate (one commit defensible), report format (DONE with concerns)
- Ruling: crop-mode fix = disable padding controls while cropping (matches the lesson "padding is zero in crop mode") rather than computing from cropRect — cost if wrong: users must leave crop mode to change padding
- T2 fix round 1 · flow:executor (same) · definition: mid · DONE · ec5822b
- T2 fix review · conductor, in session · pass — four controls gain `|| state.cropMode`; enter/confirm/cancel crop all call updateUI, so the controls follow crop mode
- T2: complete
- Pre-existing, logged not fixed: crop-mode preview stretched when a locked resize is active and a crop rect or padding exists (resizeW/H kept while stageD changes); Confirm Crop never refits resizeH
