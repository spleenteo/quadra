---
work: canvas-size
updated: 2026-10-28
---

# Canvas size — Slices

Shape selezionata in `shaping.md`: M1–M8 + X1-B + X2-B + X3-B. Breadboard saltato (poche interazioni nuove, tutte su codice esistente): le fette sono ricavate dalle parti M. Schermate di riferimento: `docs/design/canvas-size.pen` (1 · locked PNG, 2 · per side JPG).

| Slice | Cosa dimostra | Parti | Requirements |
|---|---|---|---|
| V1 | Padding uniforme trasparente, dalla rail al file salvato | M1 (solo All sides), M4, M5, M6, M7, X3-B | R0, R2, R4, R5, R7, R8, R10, R11, R12 |
| V2 | Padding lato per lato | M1 (T/R/B/L), M2 | R3 |
| V3 | Sfondo a colore ed export JPG senza nero | M3, M8, X2-B | R1, R6, R9 |

## V1 — Padding uniforme trasparente

**Dentro**
- Bottone "Canvas" nella rail dopo Crop (`renderer/index.html:36`), sul modello di `railCropBtn` (`renderer/app.js:857`): non esclusivo, apre e chiude il pannello; stato `active` mentre il pannello è aperto.
- Sezione `canvasPanel` nella sidebar destra, accanto a `cropPanel` (`index.html:113`): visibile se il pannello è aperto o se c'è padding (stessa regola di `app.js:1220`). Contiene il lock (attivo, fisso in questa fetta), il campo "All sides" in px (`min="0"`, intero) e il link "Reset canvas".
- Stato `state.canvasPad = {t, r, b, l}` e `state.canvasLock = true` (`app.js:3`); azzerato all'apertura di un'immagine e in `resetAll` (`app.js:1135`).
- Ultimo stage di `runPipeline` (`app.js:377`), dopo `applyResizeToPreview` (`app.js:480`): canvas `(W+l+r) × (H+t+b)`, `clearRect`, `drawImage` all'offset (l, t), risultato su `previewCanvas`. Con padding 0 lo stage non fa nulla.
- L'hint "Output W × H px" (`app.js:502`) include il padding.

**Fuori**
- Campi T/R/B/L e sblocco del lock (V2). Sfondo a colore, appiattimento JPG (V3): in questa fetta un JPG con padding esce con il bordo nero, come oggi gli angoli ruotati.

**Done**
Apri un PNG, clicca Canvas nella rail mentre è attivo Perspective, scrivi 40 in All sides: la preview mostra un bordo di scacchiera di 40 px per lato, l'hint dice W+80 × H+80. Imposta un resize al 50%: il bordo resta 40 px. Save As PNG: il file ha esattamente quelle dimensioni e il bordo trasparente. "Reset canvas" toglie il bordo; "Reset all" anche.

**Gotcha**
- Tutto ciò che legge le dimensioni di `previewCanvas` (overlay del crop, zoom, fit) deve continuare a vedere l'immagine senza padding, oppure tenerne conto: da verificare in impact.
- Il crop lavora in coordinate normalizzate su stageC, a monte del padding: non deve spostarsi quando cambia il padding.

## V2 — Padding lato per lato

**Dentro**
- Il lock diventa cliccabile (M2). Sbloccato: quattro campi T / R / B / L che partono dal valore di All sides. Ribloccato: All sides prende il valore di top e lo copia sugli altri tre.
- `state.canvasLock` segue il toggle; reset all'apertura e in `resetAll`.

**Fuori**
- Unità diverse dai px, valori negativi (R10).

**Done**
Sblocca, imposta T=0, B=120, L=R=20: la preview mostra il bordo asimmetrico e l'hint torna. Riblocca: tutti i lati vanno a 0 (il valore di top).

## V3 — Sfondo a colore ed export JPG

**Dentro**
- Nel pannello Canvas: Segment Transparent / Color e `<input type="color">` (M3). `state.canvasBg = null | '#rrggbb'`. Se il formato di output è JPG, lo sfondo parte bianco.
- Stage di padding (V1): con un colore, `fillRect` prima del `drawImage`.
- Export (M8): in `saveCurrent` / `saveAs` (`app.js:1274`, `app.js:1287`), per `image/jpeg` l'immagine viene composta su un canvas riempito col colore di sfondo, bianco se trasparente, prima di `encodeCanvas` (`app.js:1254`).

**Fuori**
- Avvisi o modali sul formato (X2-C scartata).

**Done**
Scegli Color e un rosso: il bordo in preview è rosso, e il file salvato in PNG lo ha rosso. Apri un JPG, ruotalo di 10° senza padding e salvalo: gli angoli escono bianchi invece che neri. Con padding trasparente su un JPG, il bordo esce bianco.

**Gotcha**
- Il bianco al posto del nero sugli angoli ruotati dei JPG cambia un comportamento esistente: va dichiarato nel changelog.
