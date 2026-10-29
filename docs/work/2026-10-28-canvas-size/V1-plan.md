---
work: canvas-size
slice: V1
updated: 2026-10-29
---

# V1 — Padding uniforme trasparente · Piano

**Mandate**: [slices.md § V1](slices.md#v1--padding-uniforme-trasparente) · **Guidelines**: [development-guidelines.md](../../development-guidelines.md) (Level: none) · **Lessons**: nessuna (`lessons.md` assente) · **Execution rules**: [executor.md](/Users/spleenteo/.claude/plugins/cache/flow/flow/417e195afc4a/agents/executor.md)

## La fetta, decisa qui

- `function initialCanvasPad()` restituisce `{ t: 0, r: 0, b: 0, l: 0 }`, sul modello di `initialCorners`: un solo letterale per stato iniziale, i tre reset, "Reset canvas" e il crop mode. È una function declaration, quindi già disponibile nell'oggetto `state` a riga 3.
- `applyResizeToPreview` diventa `applyResizeToStageD`: non scrive più sulla preview e il nome segue `applyRotateSkewToStageB` / `applyCropToStageC`.
- Nuovo `applyCanvasPadToPreview()`, Step 6 di `runPipeline`: unico writer di `previewCanvas` e dell'hint. In crop mode usa `initialCanvasPad()` al posto di `state.canvasPad`.
- Nessun `imageSmoothing` nello stage di padding: `drawImage(stageD, l, t)` è 1:1, senza scala.
- Massimo per lato `CANVAS_PAD_MAX = 10000` px (`clamp` + `Math.round`). Il resize usa 100000, ma il limite per lato dei canvas di Chromium è 32767 px: 10000 lascia margine anche con due lati sommati.
- Il lock è un `<button>` con `disabled` nel markup: si vede attivo ma non è cliccabile; V2 toglie `disabled` e aggiunge il listener. `active` e `aria-pressed` li scrive `updateUI` da `state.canvasLock`, così lo stato è già letto in V1.
- Icona rail: Lucide "expand" (frecce verso l'esterno), stesso stile SVG dei bottoni esistenti (`viewBox 0 0 24 24`, solo `path`, tratto da `.rail-tool svg`).
- Il campo segue il pattern `fromInput` di `setRotation` (`app.js:596`): mentre scrivi il campo non viene riscritto; su `change` (blur/Invio) `syncCanvasUI` mostra il valore limitato.
- Il pannello si chiude in `resetAll` (`canvasOpen = false`), come `cropPanel` sparisce quando `resetAll` azzera il crop.

## Tasks

### T1 — Stato del canvas e stage di padding nella pipeline · critical
**What**: in `state` (`app.js:3`), dopo `linePoints`: `canvasPad: initialCanvasPad(),` con commento `// padding in px attorno all'output, dopo il resize`, `canvasLock: true,`, `canvasOpen: false,`. Aggiungere `initialCanvasPad()` dopo `initialLine` (`app.js:104`). Aggiungere `const stageD = document.createElement('canvas');` dopo `stageC` (`app.js:96`). In `openImageFromBytes`, `resetAll` e `closeImage` assegnare `state.canvasPad = initialCanvasPad(); state.canvasLock = true; state.canvasOpen = false;` accanto agli altri reset. Rinominare `applyResizeToPreview` in `applyResizeToStageD`: `const dst = stageD;` al posto di `els.previewCanvas`, togliere la riga dell'hint (`app.js:502`); `syncResizeUI` invariato. In `runPipeline`: commento Step 5 → `resize stageC → stageD`, poi `// Step 6: padding stageD → previewCanvas` e la chiamata. Nuova funzione dopo `applyResizeToStageD`, con un commento sul crop mode come `app.js:456`:
`const { t, r, b, l } = state.cropMode ? initialCanvasPad() : state.canvasPad;` → `outW = stageD.width + l + r`, `outH = stageD.height + t + b`; dimensionare `els.previewCanvas`, `clearRect(0, 0, outW, outH)`, `drawImage(stageD, l, t)`, `els.resizeHint.textContent = \`Output ${outW} × ${outH} px\``.
**Files**: `renderer/app.js`
**Interfaces**: produce `initialCanvasPad()`, `state.canvasPad / canvasLock / canvasOpen`, `stageD`, `applyCanvasPadToPreview()` (legge `state.canvasPad` a ogni `scheduleRender()`).
**Verified**: `node --input-type=module --check < renderer/app.js` esce 0. `grep -n "resizeHint.textContent" renderer/app.js` dà 2 righe (stage di padding, `updateUI`). `grep -n "applyResizeToPreview" renderer/app.js` non dà righe. A mano (conductor, `npm run dev`, nessuna porta): apri un PNG, ruota di 10°, resize al 50%: preview e hint uguali a `main`; Save As PNG, `sips -g pixelWidth -g pixelHeight <file>` coincide con l'hint.
**Done**: con padding 0 l'app si comporta come prima; l'unico writer di `previewCanvas` è il nuovo stage.

### T2 — Bottone Canvas nella rail e pannello Canvas
**What**: in `index.html`, dopo `railCropBtn` (riga 39): `<button class="rail-tool" id="railCanvasBtn" title="Canvas size" disabled>`, **senza `data-tool`**, SVG `<path d="m15 15 6 6"/><path d="m15 9 6-6"/><path d="M21 16v5h-5"/><path d="M21 8V3h-5"/><path d="M3 16v5h5"/><path d="m3 21 6-6"/><path d="M3 8V3h5"/><path d="M9 9 3 3"/>`, `<span>Canvas</span>`. Dopo `cropPanel` (riga 124): `<section class="section" id="canvasPanel" hidden>` con `<h2>Canvas</h2>`; un `div.size-row` con `<label for="canvasPadAllInput">All sides</label>`, `div.control-input-group` con `<input type="number" id="canvasPadAllInput" min="0" max="10000" step="1" value="0" disabled />` e `<span class="unit">px</span>`, poi `<button class="lock-btn" id="canvasLockBtn" title="Same padding on all sides" aria-pressed="true" disabled>` con SVG Lucide lock `<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`; un `div.control-actions` con `<button class="btn-link" id="canvasResetBtn" disabled>Reset canvas</button>`. In `styles.css`, dopo `.size-row.spread .check-row` (riga 643): `.lock-btn` (flex none, 26×26 px, centrato, `padding: 0`, sfondo trasparente, `border: 1px solid var(--border)`, `border-radius: 4px`, `color: var(--text-dim)`), `.lock-btn svg` (14×14, stesse regole di tratto di `.rail-tool svg`), `.lock-btn.active` (`color` e `border-color` `var(--accent)`), `.lock-btn:disabled { cursor: default; }`.
**Files**: `renderer/index.html`, `renderer/styles.css`
**Interfaces**: produce gli id `railCanvasBtn`, `canvasPanel`, `canvasPadAllInput`, `canvasLockBtn`, `canvasResetBtn`.
**Verified**: `grep -c 'data-tool=' renderer/index.html` dà 2. `grep -cE 'id="(railCanvasBtn|canvasPanel|canvasPadAllInput|canvasLockBtn|canvasResetBtn)"' renderer/index.html` dà 5. A mano (`npm run dev`): senza immagine, Canvas compare sotto Crop, disabilitato; il pannello non si vede.
**Done**: markup e stile presenti, inerti finché T3 non li collega.

### T3 — Collegare rail, pannello e reset · critical · depends on: T1, T2
**What**: in `els`, dopo `railCropBtn`: `railCanvasBtn`, `canvasPanel`, `canvasPadAllInput`, `canvasLockBtn`, `canvasResetBtn`. Nuova sezione `// === CANVAS ===` … `// === END CANVAS ===` tra END RESIZE e FORMAT, con `const CANVAS_PAD_MAX = 10000;` e: `syncCanvasUI()` (scrive `String(state.canvasPad.t)` nel campo); `hasCanvasPad()` (true se uno dei quattro lati > 0); `setCanvasPadAll(value, opts = {})` (`v = Math.round(clamp(value, 0, CANVAS_PAD_MAX))`, `state.canvasPad = { t: v, r: v, b: v, l: v }`, `if (!opts.fromInput) syncCanvasUI()`, poi `isDirty`, `scheduleRender()`, `updateUI()`); `resetCanvas()` (`initialCanvasPad()`, `syncCanvasUI()`, `isDirty`, `scheduleRender()`, `updateUI()`); `toggleCanvasPanel()` (`state.canvasOpen = !state.canvasOpen; updateUI();`, senza `isDirty`). Listener: `input` sul campo → `setCanvasPadAll(e.target.value, { fromInput: true })`; `change` sul campo → `syncCanvasUI`; click su `canvasResetBtn` → `resetCanvas`; click su `railCanvasBtn` → `toggleCanvasPanel`. Chiamare `syncCanvasUI()` in `openImageFromBytes` (dopo `syncFormatUI()`), `resetAll` (dopo `syncSkewUI()`) e `closeImage` (prima di `updateUI()`). In `updateUI`, dopo `cropActiveControls`: `railCanvasBtn.disabled = !hasImage`; `railCanvasBtn` `active` se `state.canvasOpen`; `canvasPanel.hidden = !state.canvasOpen && !hasCanvasPad()`; `canvasPadAllInput.disabled = !hasImage`; `canvasLockBtn` `active` e `aria-pressed` da `state.canvasLock`; `canvasResetBtn.disabled = !hasImage || !hasCanvasPad()`.
**Files**: `renderer/app.js`
**Interfaces**: consuma da T1 `initialCanvasPad()`, `state.canvasPad / canvasLock / canvasOpen` e il render tramite `scheduleRender()`; da T2 i cinque id.
**Verified**: `node --input-type=module --check < renderer/app.js` esce 0. A mano (conductor, `npm run dev`), il Done della fetta: PNG aperto, con Perspective attivo clic su Canvas (attivi tutti e due), 40 in All sides → bordo a scacchiera di 40 px, hint W+80 × H+80; resize al 50% → bordo sempre 40; Edit crop → rettangolo allineato all'immagine, Confirm → bordo di nuovo; Save As `.png` e `.webp` → `sips -g pixelWidth -g pixelHeight -g hasAlpha <file>` dà le dimensioni dell'hint e `hasAlpha: yes`; Reset canvas e Reset all tolgono il bordo; dopo Close il bottone non è `active` e il pannello è nascosto; riaprendo il campo vale 0.
**Done**: il Done di V1 in slices.md passa a mano.

## Order

- T1 e T2 in parallelo (file separati).
- T3 dopo T1 e T2.

## Deviations from the mandate

- `applyResizeToPreview` rinominata `applyResizeToStageD`: il mandato la nomina col vecchio nome, ma dopo la modifica non scrive più sulla preview.
