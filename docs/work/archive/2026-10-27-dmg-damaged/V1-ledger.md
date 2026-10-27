# Ledger — V1
subagent model env: none set

- T4 · flow:executor · definition: mid · DONE · 7e0d59b
  Status DONE; commit 7e0d59b; check: diff of docs/_config.yml empty; Servers: none; concerns: none.
- T3 · flow:executor · definition: mid · DONE · 9e7359f
  Status DONE; commit 9e7359f; greps pass (no old wording; Open Anyway 1 each; xattr line 1 each; Finder feature line kept at docs/index.html:257, README.md:41); Servers: none; concerns: none.
- T1 · flow:executor · definition: mid · DONE · 988762c
  Status DONE; commit 988762c; npm run dist built 4 artifacts, hook logged "signed and verified" per arch; codesign strict deep verify valid on both dist/mac*; Signature=adhoc, Sealed Resources version=2, no linker-signed; exit code of dist not captured; loose Mach-O list not printed; Servers: none.
- T3+T4 review · flow:task-reviewer · definition: mid · pass/pass · 9e7359f, 7e0d59b
  No high/medium. Low (logged, not fixed): docs/index.html:283 long <code> may overflow on narrow screens (no word-break); landing omits quotes around "Quadra" in the dialog text (as planned); trailer model name (session attribution is Opus 5.5, correct).
- T3: complete
- T4: complete
- T1 review · flow:task-reviewer · opus (top, critical) · pass · 988762c
  Disk check: 6 loose Mach-O per arch (4 dylibs, chrome_crashpad_handler, ShipIt), 4 frameworks, 4 helpers and the app all Signature=adhoc, sealed, none linker-signed; strict deep verify valid on both. Medium: report said DONE without the dist exit code. Low: loose list not printed (settled by disk check).
Ruling: T1's missing exit code is covered by the gate's `npm run dist; echo exit=$?` at close — no code change — if wrong, a failing build would show at the gate anyway.
- T1: complete
- T2 · flow:executor · definition: mid · DONE_WITH_CONCERNS · none
  4 copies (2 DMG, 2 zip) valid on disk, Signature=adhoc, no linker-signed. Quarantined copy: codesign strict verify exit 0; spctl -a -vv prints exactly one line `<path>: rejected` (exit 3), no `source=` line on macOS 27. Temp dirs trashed (rm blocked by a hook), no images left mounted.
Ruling: spctl criterion relaxed to "exactly one line `rejected`, no integrity error" — macOS 27 no longer prints `source=no usable signature`; conductor confirmed with `spctl -a -vvvv -t exec` (same single line) and `syspolicy_check distribution`, which reports only "Adhoc Signed App" (warning) and "Notary Ticket Missing", no resource or integrity error — if wrong, the user's real-download check at close catches it.
- T2: complete
