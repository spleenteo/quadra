# Changelog

Notable changes to Quadra, newest first.

## v0.7.0 — 2026-10-29 — Canvas size: add padding and a background color

Images can now be given a larger canvas: a border around the picture, with a transparent or solid-color background. It was added so a picture can be framed or placed on a colored sheet without leaving Quadra.

- **Canvas panel**: a new Canvas button in the rail opens a panel to add padding around the image, in pixels.
- **Padding per side**: padding can be locked to one value for all four sides or set separately for each side with the clickable lock.
- **Size includes the border**: the padding is applied before the resize, so Size and Output show the final dimensions with the border.
- **Background color**: the padding can be transparent or filled with a chosen color, which also fills the corners left by rotation.
- **JPG export**: transparent areas are flattened onto the background color when the image is saved as JPG, or onto white when the background is transparent. Behavior change: the corners of a rotated JPG, which used to come out black, now come out white (or in the chosen color).
- **Crop**: the padding controls are disabled while cropping.
- **Work**: `canvas-size`
- **Decision**: [canvas-padding-before-resize](decisions-log/2026-10-29-canvas-padding-before-resize.md)
- **Decision**: [crop-mode-stretch-with-active-resize](decisions-log/2026-10-29-crop-mode-stretch-with-active-resize.md)

---

## v0.6.1 — 2026-10-27 — The downloaded app no longer shows as damaged

The macOS app downloaded from the DMG was reported as damaged and would not open. It now ships ad-hoc signed, so macOS shows the normal "Apple could not verify" prompt and the app opens through Open Anyway.

- **Ad-hoc signing**: every part of the app bundle (libraries, frameworks, helpers and the app itself) is signed inside-out during the build, so the signature checks out on both the Apple Silicon and Intel builds.
- **First-launch instructions**: the README and the landing page now describe the Open Anyway steps instead of the old workaround.
- **Work**: `dmg-damaged`

---
