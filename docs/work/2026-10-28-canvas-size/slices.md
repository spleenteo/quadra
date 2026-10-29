---
work: canvas-size
updated: 2026-10-29
---

# Canvas size — Slices

Shape selezionata in `shaping.md`: M1–M8 + X1-B + X2-B + X3-B. Breadboard saltato (poche interazioni nuove, tutte su codice esistente): le fette sono ricavate dalle parti M. Schermate di riferimento: `docs/design/canvas-size.pen` (1 · locked PNG, 2 · per side JPG). Impact del 2026-10-29 applicato (correzioni nelle sezioni sotto).

| Slice | Cosa dimostra | Parti | Requirements |
|---|---|---|---|
| V1 | Padding uniforme trasparente, dalla rail al file salvato | M1 (solo All sides), M4, M5, M6, M7, X3-B | R0, R2, R4, R5, R7, R8, R10, R11, R12 |
| V2 | Padding lato per lato | M1 (T/R/B/L), M2 | R3 |
| V3 | Sfondo a colore, export JPG senza nero, documentazione | M3, M8, X2-B | R1, R6, R9 |

## V1 — Padding uniforme trasparente

**Dentro**
- Bottone "Canvas" nella rail dopo Crop (`renderer/index.html:36`), con `id="railCanvasBtn"` e **senza `data-tool`** (altrimenti entra in `els.toolButtons` e il click chiama `setTool`, `app.js:80`, `:1024`), sul modello di `railCropBtn` (`renderer/app.js:857`): non esclusivo, apre e chiude il pannello; `active` mentre il pannello è aperto; `disabled` senza immagine, come `railCropBtn` in `updateUI` (`app.js:1218`).
- Sezione `canvasPanel` nella sidebar destra, accanto a `cropPanel` (`index.html:113`): visibile se `state.canvasOpen` o se c'è padding (stessa regola di `app.js:1220`). Contiene il lock (attivo, fisso in questa fetta), il campo "All sides" in px (`min="0"`, intero, con un massimo per lato sul modello del clamp del resize, `app.js:1047`) e il link "Reset canvas".
- Stato `state.canvasPad = {t, r, b, l}`, `state.canvasLock = true`, `state.canvasOpen = false` (`app.js:3`). Azzerato in tre punti: apertura (`openImageFromBytes`, `app.js:140`, che copre Cmd+O, Finder, incolla e drop), `resetAll` (`app.js:1135`, anche dal menu Reset All) e `closeImage` (`app.js:1157`).
- Ogni modifica del padding e "Reset canvas" seguono il pattern esistente: `state.isDirty = true`, `scheduleRender()`, `updateUI()` (`app.js:601-603`).
- Pipeline (`runPipeline`, `app.js:377`): `applyResizeToPreview` (`app.js:480`) scrive su un canvas intermedio `stageD` invece che su `previewCanvas`; un nuovo stage di padding dimensiona `previewCanvas` a `(W+l+r) × (H+t+b)`, `clearRect`, `drawImage(stageD, l, t)`. `syncResizeUI` continua a ricevere le dimensioni senza padding.
- In crop mode (`state.cropMode`) lo stage di padding non applica il bordo, come `applyCropToStageC` già salta il crop (`app.js:458`): l'overlay del crop (`getPreviewDisplayRect`, `app.js:669`) resta allineato all'immagine.
- L'hint "Output W × H px" è scritto dallo stage di padding (non più da `applyResizeToPreview`, `app.js:502`) e include il padding. I campi W/H del pannello Size restano senza padding (X1-B).

**Fuori**
- Campi T/R/B/L e sblocco del lock (V2). Sfondo a colore, appiattimento JPG (V3): in questa fetta un JPG con padding esce con il bordo nero, come oggi gli angoli ruotati; le prove si fanno su PNG e WebP.
- Metadati EXIF/ICC: invariati, già oggi non conservati (`createImageBitmap` in decodifica, `toBlob` in codifica).

**Done**
Apri un PNG, clicca Canvas nella rail mentre è attivo Perspective, scrivi 40 in All sides: la preview mostra un bordo di scacchiera di 40 px per lato, l'hint dice W+80 × H+80. Imposta un resize al 50%: il bordo resta 40 px. Con 40 px di padding apri Edit crop: il rettangolo è allineato all'immagine (senza bordo); conferma: il bordo torna, 40 px. Save As PNG e Save As WebP: i file hanno esattamente quelle dimensioni e il bordo trasparente. "Reset canvas" toglie il bordo; "Reset all" anche; dopo Close il pannello e il bottone non restano attivi.

**Gotcha**
- Il crop è normalizzato su `stageB` (`app.js:466-470`), a monte del padding: non si sposta quando cambia il padding.
- Il fit della preview è solo CSS (`styles.css:241-244`): nessun calcolo di zoom da aggiornare.

**Deviations found while planning V1**
- `applyResizeToPreview` rinominata `applyResizeToStageD`: non scrive più sulla preview, il nome segue `applyRotateSkewToStageB` / `applyCropToStageC`.

## V2 — Padding lato per lato

**Dentro**
- Il lock diventa cliccabile (M2). Sbloccato: quattro campi T / R / B / L che partono dal valore di All sides. Ribloccato: All sides prende il valore di top e lo copia sugli altri tre.
- `state.canvasLock` segue il toggle e imposta `isDirty`; reset all'apertura, in `resetAll` e in `closeImage`.

**Fuori**
- Unità diverse dai px, valori negativi (R10).

**Done**
Sblocca, imposta T=0, B=120, L=R=20: la preview mostra il bordo asimmetrico e l'hint torna. Riblocca: tutti i lati vanno a 0 (il valore di top).

## V3 — Sfondo a colore, export JPG, documentazione

**Dentro**
- Nel pannello Canvas: Segment Transparent / Color e `<input type="color">` (M3). `state.canvasBg = null | '#rrggbb'`; ogni modifica imposta `isDirty`.
- Default dello sfondo: bianco se l'immagine aperta è un JPG (da `formatFromPath` all'apertura), altrimenti trasparente. Cambiare formato (`setFormat`, `app.js:1115`; Save As, `app.js:1299`) non tocca una scelta già fatta dall'utente. "Reset canvas", `resetAll`, apertura e `closeImage` riportano `canvasBg` al default.
- Stage di padding (V1): con un colore, `fillRect` solo sulle quattro fasce di padding, non sull'intero canvas: gli angoli trasparenti della rotazione (`app.js:443`) restano trasparenti in PNG e WebP.
- Export (M8): l'appiattimento sta in un solo punto, dentro `encodeCanvas` (`app.js:1254`), quando il mime effettivo è `image/jpeg`: l'immagine viene composta su un canvas riempito col colore di sfondo, bianco se trasparente. Vale per Save (`app.js:1274`, mime dal percorso) e Save As (`app.js:1287`, mime dall'estensione). WebP conserva l'alfa: nessun appiattimento.
- Documentazione: voce in `README.md` ("What it does", "How to use") e feature nella landing (`docs/index.html:7`, `:12`, `:171`, griglia `:222-252`). Changelog e versione alla chiusura del lavoro.

**Fuori**
- Avvisi o modali sul formato (X2-C scartata).
- Il drag & drop apre i file senza percorso (`file.path`, rimosso da Electron 32, `app.js:186`): un JPG trascinato è trattato come PNG. Bug preesistente, lavoro separato.

**Done**
Scegli Color e un rosso: il bordo in preview è rosso, e il file salvato in PNG lo ha rosso. PNG ruotato di 10°, Color rosso, padding 0: gli angoli restano trasparenti. Apri un JPG con Cmd+O, ruotalo di 10° senza padding e salvalo: gli angoli escono bianchi invece che neri. Con padding trasparente su un JPG, il bordo esce bianco. Save As WebP con Transparent: bordo trasparente, nessun appiattimento.

**Gotcha**
- Il bianco al posto del nero sugli angoli ruotati dei JPG cambia un comportamento esistente: va dichiarato nel changelog.
