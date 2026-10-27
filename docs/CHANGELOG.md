# Changelog

Notable changes to Quadra, newest first.

## v0.6.1 — 2026-10-27 — The downloaded app no longer shows as damaged

The macOS app downloaded from the DMG was reported as damaged and would not open. It now ships ad-hoc signed, so macOS shows the normal "Apple could not verify" prompt and the app opens through Open Anyway.

- **Ad-hoc signing**: every part of the app bundle (libraries, frameworks, helpers and the app itself) is signed inside-out during the build, so the signature checks out on both the Apple Silicon and Intel builds.
- **First-launch instructions**: the README and the landing page now describe the Open Anyway steps instead of the old workaround.
- **Work**: `dmg-damaged`

---
