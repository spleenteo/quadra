# Slices — dmg-damaged

## Diagnosis

`package.json` sets `build.mac.identity: null`, so electron-builder skips code signing. The arm64 bundle carries only the Electron binary's linker signature (no sealed resources), the x64 bundle none at all. Gatekeeper on Apple Silicon reports a quarantined app with a broken or partial signature as **"damaged"**, a dialog with no "Open" way out. The "right-click → Open" advice in `docs/index.html:280` and `README.md:21` doesn't apply to it, and on macOS 15+ no longer works for unsigned apps either.

Chosen: **ad-hoc signing** (option A). Developer ID + notarization (option B) is a separate future work, once there is an Apple Developer account.

## V1 — Ad-hoc signed bundle and correct first-launch instructions

**In**
- The build signs the whole `.app` ad-hoc (`codesign --sign -`, deep, nested frameworks and helpers included) for both `arm64` and `x64`, before the `.zip` and `.dmg` are produced.
- Landing (`docs/index.html`, download steps) and `README.md` (Download section) describe the real first launch on current macOS: the "Apple could not verify…" dialog → System Settings → Privacy & Security → *Open Anyway*; plus the Terminal alternative `xattr -dr com.apple.quarantine /Applications/Quadra.app`.

**Out**
- Developer ID signing, notarization, stapling, hardened runtime entitlements.
- Publishing the GitHub release (the user uploads the new DMGs).
- Version bump (done at the close through the changelog step).

**Done**
- `npm run dist` completes without errors.
- `codesign --verify --deep --strict --verbose=2` passes on `dist/mac-arm64/Quadra.app` and `dist/mac/Quadra.app`; `codesign -dv` shows `Signature=adhoc` with sealed resources (not only `linker-signed`).
- The same check passes on the app copied out of each mounted `.dmg`.
- Simulated download: the app copied from the arm64 DMG to a temp folder, with `com.apple.quarantine` set by hand, is no longer reported as "damaged": `spctl -a -vv` / the first open shows the "cannot verify" path, not "damaged". Final confirmation by the user with a real download.
- Landing and README show the new steps; no mention of "right-click → Open" remains.

**Known gotchas**
- electron-builder 25.1.8 (installed) does not accept `identity: "-"`: it looks it up as a keychain identity and fails. Either sign in an `afterPack` hook (runs before the targets are built, so zip and dmg inherit the signature) or upgrade to electron-builder 26, which supports ad-hoc natively. The planner picks, preferring the smaller change.
- With `identity: null` kept, electron-builder must not re-sign or strip after the hook; verify on the final artifacts, not only on `dist/mac*/`.
- The x64 build is cross-built on arm64: `codesign` works on it, but it can't be launched here; verify signature only.
- `docs/` is published by GitHub Pages: the landing change goes live at merge + push.
