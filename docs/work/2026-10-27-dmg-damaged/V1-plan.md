---
work: dmg-damaged
slice: V1
test_level: none
updated: 2026-10-27
tags: [plan, dmg-damaged]
---

# V1 plan — Ad-hoc signed bundle and correct first-launch instructions

**Mandate**: [slices.md § V1](slices.md#v1--ad-hoc-signed-bundle-and-correct-first-launch-instructions) · **Guidelines**: none (no guidelines file; gate = `npm run dist` + the Done below) · **Lessons**: none yet · **Execution rules**: [executor.md](/Users/spleenteo/.claude/plugins/cache/flow/flow/417e195afc4a/agents/executor.md) (test level `none`)

## The slice, decided here

- **`afterPack` hook, no electron-builder upgrade.** In 25.1.8 `this.info.afterPack(packContext)` runs in `doPack` after extra files are copied and before the targets build (`app-builder-lib/out/platformPackager.js`), so zip and dmg inherit the signature. Upgrading to 26 is a bigger change for the same result.
- **`identity: null` stays.** It keeps electron-builder from signing after the hook (`macPackager.js` logs "skipped macOS code signing").
- **Inside-out order from what's on disk, not a hard-coded list.** Loose Mach-O files are found by walking `Contents/Frameworks` and reading the magic bytes, so a new Electron dylib can't slip through unsigned. Bundle main executables are left to their bundle's signature.
- **No `--deep` when signing**, only when verifying (Apple discourages `--deep` for signing). No `--options runtime`, no entitlements: hardened runtime is Out.
- **Copy says "not notarized", not "unsigned"**, because after this slice the app is signed (ad-hoc). The README project tree gets the new script so it stays accurate.
- **No push in this slice.** Release first, push after (Known gotchas): the user uploads the DMGs to the release before `main` is pushed.

## Tasks

### T1 — Ad-hoc sign the bundle in an afterPack hook — critical
- **What**: create `scripts/adhoc-sign.js` exporting `exports.default = async (context) => {…}`. Return at once if `context.electronPlatformName !== 'darwin'`. App = `path.join(context.appOutDir, context.packager.appInfo.productFilename + '.app')`. Sign with `execFileSync('codesign', ['--force', '--sign', '-', p], { stdio: 'inherit' })` (argument array: paths contain spaces and parentheses), in this order:
  1. loose Mach-O: every regular file (not a symlink) under `Contents/Frameworks` whose first 4 bytes are `cffaedfe`, `feedfacf`, `cafebabe` or `bebafeca`, excluding bundle main executables (`<N>.framework/Versions/<v>/<N>` and `<N>.app/Contents/MacOS/<N>`); deepest path first. On the current bundle this yields the 4 dylibs in `Electron Framework.framework/Versions/A/Libraries/`, `Helpers/chrome_crashpad_handler` and Squirrel's `Resources/ShipIt`;
  2. each `*.framework` directly in `Contents/Frameworks`;
  3. each `*.app` directly in `Contents/Frameworks` (the four `Quadra Helper*.app`);
  4. the app itself.
  Then run `codesign --verify --deep --strict --verbose=2 <app>`. Any non-zero exit throws, so the build fails. Log one line per arch: `adhoc-sign: <app> signed and verified`. In `package.json`, add `"afterPack": "./scripts/adhoc-sign.js"` under `build`. Leave `mac.identity: null` and the `files` whitelist unchanged (it already leaves `scripts/` out).
- **Files**: `scripts/adhoc-sign.js` (new), `package.json`
- **Verified**: `npm run dist` exits 0 and prints `adhoc-sign: … signed and verified` twice (once per arch). Then, for `A` in `dist/mac-arm64/Quadra.app` and `dist/mac/Quadra.app`: `codesign --verify --deep --strict --verbose=2 "$A"` prints `valid on disk` and `satisfies its Designated Requirement`; `codesign -dv --verbose=4 "$A" 2>&1` contains `Signature=adhoc` and a `Sealed Resources version=2` line, and does not contain `linker-signed`.
- **Done**: both `dist/mac*/Quadra.app` are ad-hoc signed with sealed resources and pass a strict deep verify.
- **Interfaces**: produces `dist/Quadra-arm64.dmg`, `dist/Quadra-x64.dmg`, `dist/Quadra-0.6.0-arm64-mac.zip`, `dist/Quadra-0.6.0-mac.zip` for T2.

### T2 — Verify the final artifacts and the simulated download — depends on: T1
- **What**: verification only, no commit. Work in `W=$(mktemp -d)`. For `a` in `arm64 x64`: `hdiutil attach -nobrowse -readonly -mountpoint "$W/mnt-$a" dist/Quadra-$a.dmg`, `ditto "$W/mnt-$a/Quadra.app" "$W/dmg-$a/Quadra.app"`, `hdiutil detach "$W/mnt-$a"`. Extract zips: `ditto -x -k dist/Quadra-0.6.0-arm64-mac.zip "$W/zip-arm64"` and `ditto -x -k dist/Quadra-0.6.0-mac.zip "$W/zip-x64"`. Simulated download: `ditto "$W/dmg-arm64/Quadra.app" "$W/q/Quadra.app"`, then `xattr -w com.apple.quarantine "0081;$(printf %x $(date +%s));Safari;" "$W/q/Quadra.app"`.
- **Files**: none in the repo (temp dir only).
- **Verified**: on each of the four copies (`$W/dmg-arm64`, `$W/dmg-x64`, `$W/zip-arm64`, `$W/zip-x64`, each `/Quadra.app`), `codesign --verify --deep --strict --verbose=2` prints `valid on disk` and `codesign -dv` shows `Signature=adhoc`, no `linker-signed`. On `$W/q/Quadra.app`: `xattr -p com.apple.quarantine` prints the value set; `codesign --verify --deep --strict` exits 0; `spctl -a -vv "$W/q/Quadra.app" 2>&1` contains `rejected` and `source=no usable signature` and does not contain `code has no resources`. The x64 copies are verified by signature only (they can't launch on this host). Report the exact `spctl` output.
- **Done**: every Done bullet on signatures holds on the shipped artifacts, not only on `dist/mac*/`.

### T3 — Rewrite the first-launch copy on the landing and in the README
- **What**: in `docs/index.html` (`.steps`, lines 279–281) keep step 1 and replace steps 2–3 with:
  2. `First launch: open Quadra. macOS says “Apple could not verify Quadra…”. Click Done.`
  3. `Open System Settings → Privacy & Security, scroll down, click Open Anyway next to Quadra and confirm. macOS asks only once, because Quadra isn’t notarized by Apple yet.`
  After the closing `</div>` of `.steps`, add `<p class="hint">Prefer Terminal? Run <code>xattr -dr com.apple.quarantine /Applications/Quadra.app</code>, then open Quadra normally.</p>`.
  In `README.md` § Download, replace item 2 with: `2. **First launch**: open Quadra. macOS shows *"Apple could not verify "Quadra" is free of malware…"*: click *Done*` and add `3. Open **System Settings → Privacy & Security**, scroll down, click *Open Anyway* next to Quadra and confirm. macOS asks only this once: Quadra is signed ad-hoc but not notarized by Apple yet.` Then a line `Prefer Terminal? Run this once instead of steps 2–3:` and a `bash` code block with `xattr -dr com.apple.quarantine /Applications/Quadra.app`. In the README project tree under `scripts/`, add `    └── adhoc-sign.js    # afterPack hook: ad-hoc signs the .app` (and turn the `build-icon.js` branch into `├──`). Leave `docs/index.html:257` and `README.md:34` ("Right-click an image in Finder") as they are.
- **Files**: `docs/index.html`, `README.md`
- **Verified**: `grep -nE "Open again|\*Open\* → \*Open\*|unsigned|isn’t signed" docs/index.html README.md` prints nothing; `grep -c "Open Anyway" docs/index.html README.md` gives ≥1 for each; `grep -c "xattr -dr com.apple.quarantine /Applications/Quadra.app" docs/index.html README.md` gives 1 for each; `grep -n "Right-click an image in Finder" docs/index.html` and `grep -n "right-click an image in Finder" README.md` still print one line each.
- **Done**: landing and README describe Done → Settings → Open Anyway and the Terminal alternative; no "right-click → Open" instruction remains.

### T4 — Keep Flow's work files off GitHub Pages
- **What**: create `docs/_config.yml` containing only `exclude:` followed by `  - work` and `  - decisions-log`. Nothing else (`index.html` has no front matter, so Jekyll copies it unchanged).
- **Files**: `docs/_config.yml` (new)
- **Verified**: `printf 'exclude:\n  - work\n  - decisions-log\n' | diff - docs/_config.yml` prints nothing.
- **Done**: `docs/_config.yml` excludes `work` and `decisions-log`.

## Order

- T1, T3 and T4 run beside each other (separate files).
- T2 runs after T1, on T1's build output.
- Gate after all four: `npm run dist` plus the Done checks above.

## Deviations from the mandate

- T3 also adds `adhoc-sign.js` to the README project tree, so the developer docs list the new script. Small, same file, no change in scope.
