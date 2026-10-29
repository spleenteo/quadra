---
work: canvas-size
slice: V3
updated: 2026-10-29
---

# V3 — Sfondo a colore, export JPG, documentazione · Piano

**Mandate**: [slices.md § V3](slices.md#v3--sfondo-a-colore-export-jpg-documentazione) · **Guidelines**: [development-guidelines.md](../../development-guidelines.md) (Level: none) · **Lessons**: [lessons.md](lessons.md) · **Execution rules**: [executor.md](/Users/spleenteo/.claude/plugins/cache/flow/flow/417e195afc4a/agents/executor.md)

## La fetta, decisa qui

- Stato: `state.canvasBg = null | '#rrggbb'` e `state.canvasBgDefault`, calcolato una volta all'apertura: `'#ffffff'` se `formatFromPath(filePath) === 'jpeg'`, altrimenti `null` (incolla da clipboard: `null`). "Reset canvas", `resetAll`, apertura e `closeImage` riportano `canvasBg` a `canvasBgDefault` (in `closeImage` tutti e due `null`). Il default non segue la Save As: è quello dell'immagine aperta, come dice il mandato.
- `setFormat` e `saveAs` non toccano `canvasBg`: nessun flag "scelto dall'utente", perché il formato non scrive mai lo sfondo. Un PNG salvato come JPG con Transparent esce comunque bianco grazie all'appiattimento.
- Segment: due bottoni `Transparent` / `Color` in un `div.bg-segment` a tutta larghezza, sotto la griglia T/R/B/L e prima di `control-actions`; attivo = classe `active` (accent) e `aria-pressed="true"`. Sotto, `div#canvasBgColorRow` con `<input type="color">` a tutta larghezza, nascosto quando lo sfondo è trasparente.
- Default di un JPG nel Segment: **Color** attivo e swatch bianco (`#ffffff`). Un PNG o WebP apre con **Transparent** attivo e swatch nascosto.
- Lo swatch ricorda il colore: Transparent → Color riprende il valore corrente di `canvasBgColorInput` (bianco all'inizio). Il valore dello swatch si riscrive solo nei reset (`resetCanvasBg()`), non in `syncCanvasUI`, che corre a ogni `change` dei campi padding e cancellerebbe il colore.
- Ogni cambio di sfondo imposta `isDirty`; un clic sul bottone già attivo non fa nulla. Lo sfondo non cambia la geometria: niente `fitResizeToCanvasPad()`.
- Il colore si dipinge in `applyCanvasPadToStageD`, alla risoluzione di `stageD`, **prima** del resize: quattro `fillRect` sulle sole fasce (alto e basso a tutta larghezza, sinistra e destra alte quanto `stageC`), poi `drawImage(stageC, l, t)`. Le fasce stanno su coordinate intere fuori dall'area di `stageC`: nessuna sovrapposizione, nessuna giunta. Il resize scala fasce e immagine insieme, quindi il bordo resta proporzionato e uniforme a ogni dimensione. Gli angoli trasparenti della rotazione stanno dentro `stageC` e restano trasparenti.
- Segment e swatch disabilitati senza immagine e in crop mode, come gli altri controlli Canvas (V2). "Reset canvas" attivo anche quando c'è solo uno sfondo diverso dal default.
- Appiattimento solo in `encodeCanvas`, se `mimeType === 'image/jpeg'`: canvas di appoggio delle stesse dimensioni, `fillRect` con `state.canvasBg ?? '#ffffff'`, poi `drawImage`. Con Color rosso un JPG ha rosso anche negli angoli ruotati (M8); PNG e WebP non vengono mai appiattiti.
- Documentazione: landing con il verbo "frame" nelle tre descrizioni e una feature "Canvas padding" dopo Resize (la griglia passa a 7 voci: l'ultima riga ne ha una). Changelog e versione restano alla chiusura del lavoro, dove va dichiarato il cambio nero → bianco sugli angoli dei JPG (Gotcha).

## Tasks

### T1 — Markup e stile del Segment e dello swatch
**What**: in `renderer/index.html`, nel `#canvasPanel`, dopo la chiusura di `div#canvasSides` e prima di `div.control-actions`: `<div class="bg-segment" role="group" aria-label="Background"><button class="bg-segment-btn" data-bg="transparent" aria-pressed="true" disabled>Transparent</button><button class="bg-segment-btn" data-bg="color" aria-pressed="false" disabled>Color</button></div>` e `<div class="bg-color-row" id="canvasBgColorRow" hidden><input type="color" id="canvasBgColorInput" value="#ffffff" aria-label="Background color" disabled /></div>`. In `renderer/styles.css`, dopo la regola `.lock-btn:not(.active) .lock-icon-closed`: `.bg-segment { display: flex; border: 1px solid var(--border); border-radius: 4px; overflow: hidden; }`; `.bg-segment-btn { flex: 1; background: transparent; border: none; color: var(--text-dim); font: inherit; font-size: 11px; padding: 5px 0; cursor: pointer; }`; `.bg-segment-btn + .bg-segment-btn { border-left: 1px solid var(--border); }`; `.bg-segment-btn.active { background: var(--accent); color: #fff; }`; `.bg-segment-btn:disabled { opacity: 0.4; cursor: not-allowed; }`; `.bg-color-row input[type="color"] { display: block; width: 100%; height: 26px; padding: 0; background: transparent; border: 1px solid var(--border); border-radius: 4px; cursor: pointer; }`; `.bg-color-row input[type="color"]::-webkit-color-swatch-wrapper { padding: 2px; }`; `.bg-color-row input[type="color"]::-webkit-color-swatch { border: none; border-radius: 2px; }`; `.bg-color-row input[type="color"]:disabled { opacity: 0.4; cursor: not-allowed; }`.
**Files**: `renderer/index.html`, `renderer/styles.css`
**Interfaces**: produce `.bg-segment-btn[data-bg="transparent"|"color"]`, `#canvasBgColorRow`, `#canvasBgColorInput`.
**Verified**: `grep -c 'data-bg=' renderer/index.html` dà 2; `grep -c 'id="canvasBgColorInput"' renderer/index.html` dà 1; `grep -o '\.bg-segment' renderer/styles.css | wc -l` dà almeno 5. A mano (`npm run dev`): apri un PNG, clic su Canvas: sotto i campi padding c'è il Segment Transparent | Color, tutti e due grigi e disabilitati; nessuno swatch.
**Done**: markup e stile pronti; il Segment si accende con T2.

### T2 — Stato dello sfondo e controlli del pannello · critical · depends on: T1
**What**: in `renderer/app.js`:
- `state` (dopo `canvasOpen`): `canvasBg: null,` e `canvasBgDefault: null,`. `els` (dopo `canvasPadSideInputs`): `canvasBgBtns: document.querySelectorAll('.bg-segment-btn'),`, `canvasBgColorRow: document.getElementById('canvasBgColorRow'),`, `canvasBgColorInput: document.getElementById('canvasBgColorInput'),`.
- Sezione CANVAS, dopo `resetCanvas`: `function resetCanvasBg() { state.canvasBg = state.canvasBgDefault; els.canvasBgColorInput.value = state.canvasBg ?? '#ffffff'; }` e `function setCanvasBg(value) { if (value === state.canvasBg) return; state.canvasBg = value; state.isDirty = true; scheduleRender(); updateUI(); }`. In `resetCanvas`, prima di `syncCanvasUI()`: `resetCanvasBg();`.
- Listener accanto agli altri: per ogni `els.canvasBgBtns`, `click` → `setCanvasBg(btn.dataset.bg === 'color' ? els.canvasBgColorInput.value : null)`; `els.canvasBgColorInput` `input` → `setCanvasBg(e.target.value)`.
- `openImageFromBytes`, dopo `state.canvasLock = true;`: `state.canvasBgDefault = filePath && formatFromPath(filePath) === 'jpeg' ? '#ffffff' : null;` e `resetCanvasBg();`. `resetAll`, dopo `state.canvasLock = true;`: `resetCanvasBg();`. `closeImage`, dopo `state.canvasLock = true;`: `state.canvasBgDefault = null;` e `resetCanvasBg();`.
- `updateUI`: per ogni `els.canvasBgBtns`, `on = (btn.dataset.bg === 'color') === (state.canvasBg !== null)`, `classList.toggle('active', on)`, `aria-pressed = String(on)`, `disabled = !hasImage || state.cropMode`; `els.canvasBgColorRow.hidden = state.canvasBg === null`; `els.canvasBgColorInput.disabled = !hasImage || state.cropMode`; `canvasResetBtn.disabled = !hasImage || state.cropMode || (!hasCanvasPad() && state.canvasBg === state.canvasBgDefault)`; la regola del pannello diventa `els.canvasPanel.hidden = !state.canvasOpen && !hasCanvasPad() && state.canvasBg === state.canvasBgDefault` (uno sfondo diverso dal default tiene il pannello visibile).
- `setFormat` e `saveAs` restano invariati.
**Files**: `renderer/app.js`
**Interfaces**: consuma da T1 `.bg-segment-btn`, `#canvasBgColorRow`, `#canvasBgColorInput`. Produce `state.canvasBg` (`null | '#rrggbb'`, minuscolo come lo scrive `<input type="color">`) per T3 e T4.
**Verified**: `node --input-type=module --check < renderer/app.js` esce 0; `grep -o 'resetCanvasBg()' renderer/app.js | wc -l` dà 5 (definizione + 4 chiamate). A mano (`npm run dev`), PNG 600×400 con Cmd+O, clic su Canvas:
1. Transparent attivo in accent, swatch nascosto, "Reset canvas" disabilitato.
2. Clic su Color: Color attivo, swatch bianco visibile, punto "modificato" acceso, "Reset canvas" attivo. Swatch → rosso; Transparent; Color: lo swatch è di nuovo rosso.
3. Crop nella rail: Segment e swatch disabilitati; Cancel: riattivi.
4. Reset canvas: Transparent attivo, swatch nascosto, "Reset canvas" disabilitato.
5. Cmd+O su un JPG, clic su Canvas: Color attivo, swatch bianco, "Reset canvas" disabilitato. Clic su Transparent, poi Format → WebP e Format → PNG: Transparent resta attivo. Reset all, clic su Canvas: Color attivo, swatch bianco. Close, Cmd+O sul PNG, clic su Canvas: Transparent attivo.
**Done**: il Segment riflette `canvasBg` e i default (JPG → Color bianco, altri → Transparent); il formato non lo cambia.

### T3 — Colore sulle fasce di padding · critical · depends on: T2
**What**: in `applyCanvasPadToStageD` (`renderer/app.js`), tra `ctx.clearRect(0, 0, outW, outH);` e `ctx.drawImage(stageC, l, t);`: `if (state.canvasBg) { ctx.fillStyle = state.canvasBg; ctx.fillRect(0, 0, outW, t); ctx.fillRect(0, outH - b, outW, b); ctx.fillRect(0, t, l, stageC.height); ctx.fillRect(outW - r, t, r, stageC.height); }`. In crop mode `t/r/b/l` sono 0 e i rettangoli sono vuoti. Nient'altro cambia.
**Files**: `renderer/app.js`
**Interfaces**: consuma `state.canvasBg` da T2; produce `stageD` con fasce colorate, che `applyResizeToPreview` scala e T4 esporta.
**Verified**: `node --input-type=module --check < renderer/app.js` esce 0; `grep -o 'fillRect' renderer/app.js | wc -l` cresce di 4 rispetto a prima di T3 (una chiamata per riga). A mano, PNG 600×400, Canvas:
1. All sides 40, Color, swatch rosso: bordo rosso di 40 px sui quattro lati della preview; Size resta 680 × 480.
2. Transparent: bordo a scacchiera. Color: di nuovo rosso.
3. All sides 0, Rotate 10°: gli angoli fuori dall'immagine ruotata sono a scacchiera, non rossi.
4. Sblocca il lock, B=120 (T, R, L a 0): solo la fascia sotto è rossa, gli angoli restano a scacchiera. Rotate a 0, proporzioni bloccate, resize 50%: la fascia è rossa e scalata con l'immagine; Save As `band.png` e ingrandisci in Anteprima: nessuna linea trasparente tra fascia e immagine né al bordo esterno.
**Done**: con Color il bordo in preview ha il colore scelto, gli angoli della rotazione no.

### T4 — Appiattimento JPG in encodeCanvas · critical · depends on: T2
**What**: in `encodeCanvas` (`renderer/app.js`), prima della `Promise`: `let src = canvas; if (mimeType === 'image/jpeg') { src = document.createElement('canvas'); src.width = canvas.width; src.height = canvas.height; const ctx = src.getContext('2d'); ctx.fillStyle = state.canvasBg ?? '#ffffff'; ctx.fillRect(0, 0, src.width, src.height); ctx.drawImage(canvas, 0, 0); }`; poi `src.toBlob(...)` al posto di `canvas.toBlob(...)`. `saveCurrent` e `saveAs` restano invariati: passano già il mime effettivo (dal percorso o dall'estensione scelta).
**Files**: `renderer/app.js`
**Interfaces**: consuma `state.canvasBg` da T2 e `els.previewCanvas` (con le fasce di T3).
**Verified**: `node --input-type=module --check < renderer/app.js` esce 0; `grep -n "mimeType === 'image/jpeg'" renderer/app.js` dà 1 riga. A mano, file in `~/Desktop/quadra-v3/`:
1. Cmd+O su un PNG 600×400, clic su Canvas, All sides 40, Color rosso, Save As `red.png`: `sips -g pixelWidth -g pixelHeight -g hasAlpha ~/Desktop/quadra-v3/red.png` dà 680, 480, `yes`; in Anteprima il bordo è rosso.
2. Rotate 10°, All sides 0, Color rosso, Save As `rot-red.png`; Cmd+O su `rot-red.png`: nell'Original gli angoli sono a scacchiera.
3. Cmd+O su un JPG, clic su Canvas (Color bianco di default), Rotate 10°, padding 0, Save As `rot.jpg`: in Anteprima gli angoli sono bianchi, non neri; annota `sips -g pixelWidth ~/Desktop/quadra-v3/rot.jpg`.
4. Stesso file: All sides 30, Transparent (la preview mostra il bordo a scacchiera), Cmd+S: il punto si spegne; `sips -g pixelWidth ~/Desktop/quadra-v3/rot.jpg` dà la larghezza del passo 3 + 60; in Anteprima bordo e angoli bianchi.
5. Stesso stato, Save As `border.webp`: `sips -g hasAlpha ~/Desktop/quadra-v3/border.webp` dà `yes`; Cmd+O su `border.webp`: bordo e angoli a scacchiera nell'Original.
6. Con `border.webp` aperto (le zone trasparenti ora sono nel file), clic su Canvas: Color, swatch rosso (il punto si accende), Save As `red.jpg`: in Anteprima bordo e angoli rossi.
**Done**: il Done di V3 in slices.md passa a schermo e sui file.

### T5 — README e landing
**What**: `README.md`: riga 8 "fix perspective, straighten, crop and frame your photos."; in "What it does", dopo Resize: `- 🔲 **Canvas padding** — add space around the image, the same on all sides or set per side, transparent or filled with a color`; la riga Save diventa `- 💾 **Save** in PNG, JPG, or WebP format with adjustable quality; JPG fills transparent areas with the background color (white by default)`; in "How to use", dopo il passo 3: `4. **Add canvas padding** — click Canvas in the tool rail, set the pixels (unlock the padlock to set each side) and pick a Transparent or Color background`, poi Resize e Save diventano 5 e 6. `docs/index.html`: righe 7 e 171 "…to fix perspective, straighten, crop and frame your photos. Everything stays on your Mac."; riga 12 "Fix perspective, straighten, crop and frame your photos. A simple, private macOS app."; nella `feat-grid`, dopo la feature Resize: `<div class="feat"><svg viewBox="0 0 24 24" aria-hidden="true"><line x1="22" x2="2" y1="6" y2="6"/><line x1="22" x2="2" y1="18" y2="18"/><line x1="6" x2="6" y1="2" y2="22"/><line x1="18" x2="18" y1="2" y2="22"/></svg><h3>Canvas padding</h3><p>Add space around the image, the same on every side or set per side, on a transparent or colored background.</p></div>`; il testo della feature "PNG, JPG, WebP" aggiunge "JPG fills transparent areas with your background color, white by default."
**Files**: `README.md`, `docs/index.html`
**Verified**: `grep -c 'Canvas padding' README.md docs/index.html` dà 1 e 1; `grep -c 'crop and frame your photos' docs/index.html` dà 3; `grep -c 'class="feat"' docs/index.html` dà 7. A mano: `open docs/index.html`: la griglia Features mostra Canvas padding dopo Resize, icona visibile.
**Done**: README e landing descrivono padding, sfondo e appiattimento JPG.

## Order

- T1 e T5 in parallelo (file diversi). T2 dopo T1. T3 e T4 dopo T2, in sequenza (stesso file `renderer/app.js`): prima T3, poi T4, che nella prova a mano usa le fasce di T3.

## Deviations from the mandate

- Il formato (selettore Format, Save As) non cambia mai lo sfondo: il mandato diceva che non tocca "una scelta già fatta", X2-B che con JPG lo sfondo "parte bianco". Su un PNG con padding portato a JPG la preview mostra la scacchiera ma il file esce bianco per l'appiattimento; il file è corretto, nessun flag "toccato dall'utente". Confermato dall'utente il 2026-10-29.
- Il Segment è disegnato senza confronto con `quadra.lib.pen` (limite del piano pen.dev raggiunto): lo stile si giudica alla prova a mano.
- README riga 8 (tagline) allineata alla landing, fuori dalle sezioni "What it does" e "How to use" nominate: le stesse frasi divergerebbero.
