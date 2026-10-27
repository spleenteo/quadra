# Slices — dmg-damaged

## Diagnosis

`package.json` sets `build.mac.identity: null`, so electron-builder skips code signing. The arm64 bundle carries only the Electron binary's linker signature (no sealed resources), the x64 bundle none at all. Gatekeeper on Apple Silicon reports a quarantined app with a broken or partial signature as **"damaged"**, a dialog with no "Open" way out. The "right-click → Open" advice in `docs/index.html:280` and `README.md:21` doesn't apply to it, and on macOS 15+ no longer works for unsigned apps either.

Chosen: **ad-hoc signing** (option A). Developer ID + notarization (option B) is a separate future work, once there is an Apple Developer account.

## V1 — Ad-hoc signed bundle and correct first-launch instructions

**In**
- The build signs the whole `.app` ad-hoc for both `arm64` and `x64`, before the `.zip` and `.dmg` are produced, through a `build.afterPack` hook in `scripts/` (excluded from the bundle by the `files` whitelist). Signing goes inside-out with `codesign --force --sign -`: every loose Mach-O first (`*.dylib` incl. `Electron Framework.framework/Versions/A/Libraries/`, `chrome_crashpad_handler`, Squirrel's `ShipIt`), then frameworks and helper apps, then `Quadra.app`. The hook ends with `codesign --verify --deep --strict` and fails the build when it fails.
- Landing (`docs/index.html`, download steps) and `README.md` (Download section) describe the real first launch on current macOS: the "Apple could not verify…" dialog → System Settings → Privacy & Security → *Open Anyway*; in that order (open once, dismiss with Done, then Settings: *Open Anyway* appears only after a blocked attempt); plus the Terminal alternative `xattr -dr com.apple.quarantine /Applications/Quadra.app`. Step 3 of the landing ("isn't signed yet", `docs/index.html:281`) and the README note "the app is unsigned" are rewritten too. The feature copy "Right-click an image in Finder" (`docs/index.html:257`, `README.md:33`) stays.
- `docs/_config.yml` with `exclude: [work, decisions-log]`, so Flow's work files under `docs/` are not published by GitHub Pages (Jekyll, legacy build from `main:/docs`).

**Out**
- Developer ID signing, notarization, stapling, hardened runtime entitlements.
- Publishing the GitHub release (the user uploads the new DMGs).
- Version bump (done at the close through the changelog step).

**Done**
- `npm run dist` completes without errors.
- `codesign --verify --deep --strict --verbose=2` passes on `dist/mac-arm64/Quadra.app` and `dist/mac/Quadra.app`; `codesign -dv` shows `Signature=adhoc` with sealed resources (not only `linker-signed`).
- The same check passes on the app copied out of each mounted `.dmg`, and on the app extracted with `ditto -x -k` from each `.zip`.
- Simulated download: the app copied from the arm64 DMG to a temp folder, with `com.apple.quarantine` set by hand: `codesign --verify --deep --strict` succeeds, and `spctl -a -vv` reports `rejected` with `source=no usable signature` and no integrity error (today's arm64 says `code has no resources but signature indicates they must be present`, the cause of "damaged"). Final confirmation by the user with a real download.
- Landing and README show the new steps; no "right-click → Open / Open again" instruction remains.
- `docs/_config.yml` excludes `work` and `decisions-log`.

**Known gotchas**
- electron-builder 25.1.8 (installed) does not accept `identity: "-"`: it looks it up as a keychain identity and fails. Either sign in an `afterPack` hook (runs before the targets are built, so zip and dmg inherit the signature) or upgrade to electron-builder 26, which supports ad-hoc natively. The planner picks, preferring the smaller change.
- With `identity: null` kept, electron-builder must not re-sign or strip after the hook; verify on the final artifacts, not only on `dist/mac*/`.
- The x64 build is cross-built on arm64: `codesign` works on it, but it can't be launched here; verify signature only.
- `docs/` is published by GitHub Pages: the landing change goes live at merge + push. **Release first, push after**: the new DMGs must be on the GitHub release before `main` is pushed, or the site describes "Open Anyway" for a 0.6.0 DMG that still says "damaged".
- `afterSign` is skipped by electron-builder when `identity: null`; the hook must be `afterPack`. After the user's afterPack nothing rewrites the bundle (Info.plist and `ElectronAsarIntegrity` are written earlier, 25.1.8 has no fuses, dmg-builder copies the app with `hdiutil -srcfolder` and doesn't sign without `dmg.sign`).
- `spctl` never prints "damaged" or "cannot verify": the Done checks its exact output instead.

### Deviations found while planning V1

- T3 also adds `adhoc-sign.js` to the README "Project structure" list, so the developer docs name the new script (same file the slice already edits).

### V1 — done on 2026-10-27

- Ad-hoc signing lives in `scripts/adhoc-sign.js`, wired as `build.afterPack`; `identity: null` stays so electron-builder signs nothing after it. Per arch it re-signs 6 loose Mach-O (4 Electron dylibs, `chrome_crashpad_handler`, `ShipIt`), 4 frameworks, 4 helpers and the app; strict deep verify passes on `dist/`, on both DMGs and on both zips.
- macOS 27's `spctl -a -vv` prints a single `<path>: rejected` line for an ad-hoc app, with no `source=` line: the Done criterion was relaxed to "one line, rejected, no integrity error" (ruling in the ledger), confirmed with `syspolicy_check distribution`, which reports only "Adhoc Signed App" and "Notary Ticket Missing".
- T1's report lacked the `npm run dist` exit code; the gate captured it (`exit=0`).
- Still open on the user: a real browser download of the new arm64 DMG, going through "Apple could not verify" → Done → *Open Anyway*. Release first, push `main` after.
