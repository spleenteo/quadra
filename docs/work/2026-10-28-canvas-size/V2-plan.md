---
work: canvas-size
slice: V2
updated: 2026-10-29
---

# V2 — Padding lato per lato · Piano

**Mandate**: [slices.md § V2](slices.md#v2--padding-lato-per-lato) · **Guidelines**: [development-guidelines.md](../../development-guidelines.md) (Level: none) · **Lessons**: [lessons.md](lessons.md) · **Execution rules**: [executor.md](/Users/spleenteo/.claude/plugins/cache/flow/flow/417e195afc4a/agents/executor.md)

## La fetta, decisa qui

- Icona del lock, due stati. **Bloccato** (`state.canvasLock === true`): Lucide `lock`, classe `active` (colore e bordo `--accent`), `aria-pressed="true"`, title `Unlock to set each side`. **Sbloccato**: Lucide `lock-open` (`<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>`), senza `active` (colore `--text-dim`), `aria-pressed="false"`, title `Same padding on all sides`.
- Le due icone stanno tutte e due nel bottone (`svg.lock-icon-closed`, `svg.lock-icon-open`); la CSS mostra quella giusta in base ad `active`, che `updateUI` già scrive. Niente JS per lo scambio.
- Quattro campi in griglia 2×2 sotto la riga di All sides, in ordine di lettura T R / B L, etichette `T` `R` `B` `L` come `W` `H` del pannello Size. Una riga sola non ci sta: l'inspector è 288 px, 256 utili, e quattro `.control-input-group` (min 64 px) più etichette e gap superano lo spazio.
- Da sbloccato la riga All sides resta visibile con il campo `disabled` e il lock al suo posto; il campo mostra `canvasPad.t`, cioè il valore che prenderà al riblocco.
- Sblocco: `canvasPad` è già uniforme, quindi i quattro campi partono dal valore di All sides senza copiare nulla. Riblocco: `t` copiato su `r`, `b`, `l`. Tutti e due impostano `isDirty` e ridisegnano.
- `resetCanvas` non tocca il lock: azzera i quattro lati e risincronizza i campi. Il lock torna `true` solo all'apertura, in `resetAll` e in `closeImage` (già così da V1).
- Il campo per lato segue il pattern `fromInput` di `setCanvasPadAll`: limite `0..CANVAS_PAD_MAX`, `Math.round`; su `change` `syncCanvasUI` mostra il valore limitato.
- Pipeline invariata: `applyCanvasPadToStageD` legge già `t/r/b/l` separati, e Size legge `stageD` (decisione `2026-10-29-canvas-padding-before-resize`).

## Tasks

### T1 — Markup e stile dei quattro campi e del lock a due stati
**What**: in `renderer/index.html`, nel `canvasLockBtn` (riga 137): sostituire l'unico SVG con due SVG, `<svg class="lock-icon-closed" viewBox="0 0 24 24" aria-hidden="true">` con il path Lucide `lock` già presente, e `<svg class="lock-icon-open" viewBox="0 0 24 24" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`. Il title diventa `Unlock to set each side`; `disabled` resta nel markup (stato senza immagine). Dopo la `div.size-row` di All sides (chiusa a riga 140), prima di `control-actions`: `<div class="canvas-sides" id="canvasSides" hidden>` con quattro `div.size-row`, ciascuno `<label for="canvasPad{T,R,B,L}Input">{T,R,B,L}</label>` e `div.control-input-group` con `<input type="number" id="canvasPadTInput" data-side="t" min="0" max="4000" step="1" value="0" disabled />` (idem `canvasPadRInput`/`r`, `canvasPadBInput`/`b`, `canvasPadLInput`/`l`) e `<span class="unit">px</span>`; ordine T, R, B, L. In `renderer/styles.css`, dopo `.lock-btn:disabled` (riga 695): `.canvas-sides { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; }`, `.canvas-sides[hidden] { display: none; }`, `.canvas-sides .control-input-group { min-width: 0; }`, `.lock-btn.active .lock-icon-open, .lock-btn:not(.active) .lock-icon-closed { display: none; }`.
**Files**: `renderer/index.html`, `renderer/styles.css`
**Interfaces**: produce gli id `canvasSides`, `canvasPadTInput`, `canvasPadRInput`, `canvasPadBInput`, `canvasPadLInput` (con `data-side` `t`/`r`/`b`/`l`) e le classi `lock-icon-closed` / `lock-icon-open`.
**Verified**: `grep -c 'data-side=' renderer/index.html` dà 4; `grep -cE 'class="lock-icon-(closed|open)"' renderer/index.html` dà 2; `grep -n 'canvas-sides' renderer/styles.css` dà almeno 3 righe. A mano (conductor, `npm run dev`, nessuna porta): apri un'immagine, clic su Canvas: si vede solo All sides con l'icona `lock` (chiusa) in colore accent; la griglia T/R/B/L non si vede.
**Done**: markup e stile pronti, griglia nascosta finché T2 non la collega.

### T2 — Lock cliccabile e padding per lato · critical · depends on: T1
**What**: in `renderer/app.js`:
- `els`, dopo `canvasResetBtn` (riga 70): `canvasSides: document.getElementById('canvasSides'),` e `canvasPadSideInputs: document.querySelectorAll('#canvasSides input[data-side]'),`.
- Sezione CANVAS (righe 1140-1180): `syncCanvasUI()` scrive anche `input.value = String(state.canvasPad[input.dataset.side])` per ogni elemento di `els.canvasPadSideInputs`. Nuova `setCanvasPadSide(side, value, opts = {})`: `v = Math.round(clamp(value, 0, CANVAS_PAD_MAX))`, `state.canvasPad = { ...state.canvasPad, [side]: v }`, `if (!opts.fromInput) syncCanvasUI()`, `state.isDirty = true`, `scheduleRender()`, `updateUI()`. Nuova `setCanvasLock(locked)`: `state.canvasLock = !!locked`; se `true`, `const v = state.canvasPad.t; state.canvasPad = { t: v, r: v, b: v, l: v };`; poi `syncCanvasUI()`, `state.isDirty = true`, `scheduleRender()`, `updateUI()`.
- Listener, accanto agli altri della sezione: click su `els.canvasLockBtn` → `setCanvasLock(!state.canvasLock)`; per ogni input di `els.canvasPadSideInputs`, `input` → `setCanvasPadSide(e.target.dataset.side, e.target.value, { fromInput: true })` e `change` → `syncCanvasUI`.
- `updateUI` (righe 1308-1314): `canvasPadAllInput.disabled = !hasImage || !state.canvasLock`; `canvasLockBtn.disabled = !hasImage`; `canvasLockBtn.title = state.canvasLock ? 'Unlock to set each side' : 'Same padding on all sides'`; `canvasSides.hidden = state.canvasLock`; ogni input di `canvasPadSideInputs` `disabled = !hasImage`. `active` e `aria-pressed` restano come sono.
- I reset di `canvasLock` in `openImageFromBytes`, `resetAll`, `closeImage` esistono già (righe 175, 1222, 1248) e ognuno chiama già `syncCanvasUI()`: nessuna modifica lì.
**Files**: `renderer/app.js`
**Interfaces**: consuma da T1 gli id `canvasSides`, `canvasPad{T,R,B,L}Input` e `data-side`; da V1 `state.canvasPad`, `state.canvasLock`, `CANVAS_PAD_MAX`, `syncCanvasUI`, `scheduleRender`, `applyCanvasPadToStageD`.
**Verified**: `node --input-type=module --check < renderer/app.js` esce 0; `grep -n "canvasLockBtn.addEventListener" renderer/app.js` dà 1 riga. A mano (conductor, `npm run dev`), con un PNG 600×400:
1. Canvas, All sides 40: Size W 680 H 480, hint `Output 680 × 480 px`, bordo a scacchiera uguale sui quattro lati.
2. Clic sul lock: l'icona diventa `lock-open` in grigio, All sides si disabilita, compare la griglia 2×2 con T R B L tutti a 40; il punto "modificato" nella status bar è acceso.
3. T=0, B=120, L=20, R=20: la preview mostra l'immagine attaccata al bordo superiore della canvas, 120 px di scacchiera sotto e 20 ai lati; Size W **640** H **520**; hint `Output 640 × 520 px`. Save As `.png` → `sips -g pixelWidth -g pixelHeight <file>` dà 640 × 520.
4. Edit crop: nessun bordo, rettangolo allineato all'immagine; Cancel: il bordo asimmetrico torna.
5. Clic sul lock: icona `lock` in accent, griglia nascosta, All sides 0, nessun bordo, Size 600 × 400, hint `Output 600 × 400 px`.
6. Sblocca, B=50, poi Reset all: lock chiuso, griglia nascosta, nessun bordo. Sblocca, poi Close e riapri: lock chiuso, All sides 0.
**Done**: il Done di V2 in slices.md passa a schermo: bordo asimmetrico visibile in preview, Size 640 × 520 con T=0, B=120, L=R=20; al riblocco tutti i lati a 0.

## Order

- T1, poi T2 (T2 legge gli id di T1; file diversi, ma la verifica a mano di T2 richiede il markup).

## Deviations from the mandate

- nessuna
