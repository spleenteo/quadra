# Ledger — V1
env: (force/model; empty = unset)
- T2 · flow:executor · definition: mid · DONE · a292e60
- T1 · flow:executor · definition: mid · DONE · 221345c 1a739d6
- T2 review · flow:task-reviewer · definition: mid · spec pass, quality pass · low: no :hover/:focus-visible on .lock-btn (not asked); trailer remark ignored (Opus 5.5 is the requested attribution)
- T2: complete
- T1 review · flow:task-reviewer · opus · spec pass, quality pass · medium: report missing `Servers:` field; low: crop-mode comment in 221345c ahead of its code (fixed in 1a739d6)
- Ruling: T1 medium finding not sent back — it is about the report format, not the code; no server was started — cost if wrong: none
- T1: complete
- T3 · flow:executor · definition: mid · DONE · fca2972
- T3 review · flow:task-reviewer · opus · spec pass, quality pass · no findings; whole-slice read: every Done step has its code
- T3: complete
- Ruling: no separate final review — 3 tasks; the T3 top-tier review already read the four commits against the slice's Done — cost if wrong: a cross-task issue surfaces at the manual check
- T4 (added after the manual check: padding not visible) · flow:executor · definition: mid · DONE · f7e0fb2
- T4 review · conductor, in session · pass — 22-line CSS diff matches the task; overlays position against `.canvas-container` (already `position: relative`), so the new `position: relative` on the Preview wrap moves nothing
- Ruling: T4 reviewed in session instead of by flow:task-reviewer — CSS only, no logic — cost if wrong: a visual glitch caught at the manual check
- T4: complete
