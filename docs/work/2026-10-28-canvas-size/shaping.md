---
shaping: true
work: canvas-size
updated: 2026-10-29
---

# Canvas size — Shaping

Allargare il canvas di un'immagine aggiungendo spazio attorno, con sfondo trasparente o di colore pieno, in modo proporzionale o lato per lato.

## CURRENT

Pipeline di rendering (`renderer/app.js:377`), rieseguita a ogni modifica:

| Stage | Cosa fa | Dove |
|---|---|---|
| A | Perspective unwarp (WebGL) | `pipeline.render` |
| B | Rotate + skew; gli angoli scoperti restano **trasparenti** (`clearRect`) | `applyRotateSkewToStageB` |
| C | Crop (rettangolo normalizzato 0–1) | `applyCropToStageC` |
| D | Resize su `previewCanvas`; Size panel mostra W/H/% riferiti a stageC | `applyResizeToPreview` |
| Export | `previewCanvas.toBlob(mime)`; Save sovrascrive col mime dell'originale | `saveCurrent`, `saveAs` |

Sidebar: pannelli di tool (Perspective / Straighten / Crop) + sezioni fisse Adjust, Size, Export. Rail: perspective, level, crop. Il crop ha una modalità di editing con overlay e maniglie sulla Preview.

Nota emersa leggendo il codice: un JPG ruotato oggi ha già gli angoli trasparenti, che `toBlob('image/jpeg')` riempie di **nero**. Il problema "JPG senza alfa" esiste già e il canvas lo renderebbe solo più visibile.

## Requirements (R)

| ID | Requirement | Status |
|----|-------------|--------|
| R0 | Aggiungere spazio attorno all'immagine senza deformarla né scalarla | Core goal |
| R1 | Lo spazio aggiunto può essere trasparente o di un colore pieno scelto dall'utente | Must-have |
| R2 | Con il lock, un solo valore in px allarga tutti i lati della stessa quantità, come un padding uniforme | Must-have |
| R3 | Senza lock, ogni lato (top, right, bottom, left) ha un valore indipendente | Must-have |
| R4 | L'utente vede la dimensione finale in pixel prima di salvare | Must-have |
| R5 | La quantità aggiunta corrisponde a pixel esatti nel file salvato | Must-have |
| R6 | Salvare in JPG un canvas trasparente non produce un risultato inatteso (es. nero): in JPG lo sfondo è bianco di default | Must-have |
| R7 | Si combina con prospettiva, rotazione, crop e resize senza rompere quei flussi | Must-have |
| R8 | Si azzera con un solo gesto, come "Reset size" e "Remove crop" | Must-have |
| R9 | Resta "super semplice": nessuna nuova modalità da imparare per l'uso base | Must-have |
| R10 | Il canvas si può solo allargare: restringere è il crop | Must-have |
| R11 | La funzione si trova dove l'utente cerca le operazioni geometriche sull'immagine, e si usa mentre è attivo un altro tool | Must-have |
| R12 | Non allunga la sidebar destra per chi non la usa | Undecided |

## Decisioni di componente

### X1: Dove va il passaggio nella pipeline

| ID | Alternativa |
|---|---|
| X1-A | Dopo il crop, **prima** del resize: il margine fa parte dell'immagine "naturale" e il resize lo scala insieme |
| X1-B | **Dopo** il resize, ultimo passaggio: il margine è in pixel del file finale |

| Req | Requirement | Status | X1-A | X1-B |
|-----|-------------|--------|------|------|
| R4 | L'utente vede la dimensione finale in pixel prima di salvare | Must-have | ✅ | ✅ |
| R5 | La quantità aggiunta corrisponde a pixel esatti nel file salvato | Must-have | ❌ | ✅ |
| R7 | Si combina con prospettiva, rotazione, crop e resize senza rompere quei flussi | Must-have | ✅ | ✅ |

**Notes:**
- X1-A fallisce R5: con un resize al 50%, 100 px di margine diventano 50.
- X1-B: il Size panel continua a parlare dell'immagine; il canvas aggiunge attorno. La dimensione finale va mostrata (hint "Output W × H px", che esiste già).

### X2: JPG e trasparenza

| ID | Alternativa |
|---|---|
| X2-A | All'export in JPG, il trasparente viene appiattito su **bianco** (vale anche per gli angoli della rotazione) |
| X2-B | All'export in JPG, il trasparente viene appiattito sul colore di sfondo del canvas, se scelto; altrimenti bianco |
| X2-C | Se lo sfondo è trasparente e il formato è JPG, un avviso nel pannello propone PNG; nessun appiattimento |

| Req | Requirement | Status | X2-A | X2-B | X2-C |
|-----|-------------|--------|------|------|------|
| R6 | Salvare in JPG un canvas trasparente non produce un risultato inatteso (es. nero): in JPG lo sfondo è bianco di default | Must-have | ✅ | ✅ | ❌ |
| R9 | Resta "super semplice": nessuna nuova modalità da imparare per l'uso base | Must-have | ✅ | ✅ | ✅ |

**Notes:**
- X2-C fallisce R6: l'avviso si può ignorare, e "Save" sovrascrive un JPG originale col suo formato senza passare dal selettore.
- X2-A e X2-B correggono anche il nero di oggi sugli angoli ruotati: un cambio di comportamento esistente, da dichiarare nel changelog.

- Deciso: X2-B con default bianco. Con formato JPG lo sfondo parte bianco; il trasparente viene comunque appiattito sul colore di sfondo all'export.

### X3: Dove sta la feature

Correzione rispetto alla prima bozza: in CURRENT, **Crop** non è un tool esclusivo. Il bottone nella rail (`railCropBtn`, `renderer/app.js:857`) entra in crop mode sopra il tool attivo, e il pannello Crop compare nella sidebar destra finché il crop è attivo o esiste (`app.js:1220`). Una "option nella rail mentre fai altro" ha quindi già un precedente nell'app.

| ID | Alternativa |
|---|---|
| X3-A | **Sezione fissa nella sidebar destra**, sotto Size, sempre visibile come Adjust e Size |
| X3-B | **Bottone "Canvas" nella rail, sul modello di Crop**: non esclusivo, apre il pannello Canvas nella sidebar destra; il pannello resta visibile finché c'è padding. Nessun overlay con maniglie: l'anteprima mostra il risultato dal vivo, sopra la scacchiera che esiste già |
| X3-C | **Dentro la sezione Size**, come secondo blocco "Canvas" sotto W/H/% (il modello Image size / Canvas size): stesse unità, stesso posto per "quanto è grande l'output" |

| Req | Requirement | Status | X3-A | X3-B | X3-C |
|-----|-------------|--------|------|------|------|
| R7 | Si combina con prospettiva, rotazione, crop e resize senza rompere quei flussi | Must-have | ✅ | ✅ | ✅ |
| R9 | Resta "super semplice": nessuna nuova modalità da imparare per l'uso base | Must-have | ✅ | ✅ | ✅ |
| R11 | La funzione si trova dove l'utente cerca le operazioni geometriche sull'immagine, e si usa mentre è attivo un altro tool | Must-have | ❌ | ✅ | ✅ |
| R12 | Non allunga la sidebar destra per chi non la usa | Undecided | ❌ | ✅ | ❌ |

**Notes:**
- X3-A fallisce R11: è un'altra sezione in fondo a una colonna già lunga (Adjust, Size, Export), senza un ingresso tra gli strumenti.
- X3-A e X3-C falliscono R12: aggiungono controlli sempre visibili; X3-C ne aggiunge meno (si può comprimere in una riga "Canvas: +0 px" che si espande).
- X3-B fa coppia con Crop: Crop toglie, Canvas aggiunge; stessa interazione, stesso posto.
- X3-C ha la coerenza concettuale più forte con X1-B: il margine si applica dopo il resize, nella stessa sezione dell'output.
- Da verificare in design: X3-B, un bottone di rail che non entra in una modalità ma apre solo un pannello, si legge come gli altri? Se ha bisogno di una modalità, la candidata è un contorno tratteggiato dell'immagine originale dentro il canvas allargato, finché il pannello è aperto.

## Forma: meccanismo comune

Le alternative di X3 cambiano solo il punto d'ingresso. Il meccanismo è lo stesso.

| Part | Mechanism | Flag |
|------|-----------|:----:|
| M1 | Controlli in px: con lock un campo "All sides"; senza lock T / R / B / L; valori interi ≥ 0 (`min="0"`) | |
| M2 | Lock: il valore di "All sides" va identico su t, r, b, l. Togliendo il lock i quattro campi partono da quel valore; rimettendolo, "All sides" prende il valore di top e lo ricopia sugli altri | |
| M3 | Sfondo: Transparent / Color (`<input type="color">`); se l'immagine aperta è un JPG il default è bianco; cambiare formato non tocca una scelta già fatta | |
| M4 | Stato `state.canvasPad = {t, r, b, l}` in px, `state.canvasLock`, `state.canvasBg = null \| '#rrggbb'`; reset all'apertura di un'immagine e con "Reset all" | |
| M5 | Ultimo stage della pipeline: il resize scrive su `stageD`, il padding compone su `previewCanvas` `(W+l+r) × (H+t+b)`, colore solo sulle quattro fasce (gli angoli ruotati restano trasparenti), `drawImage` all'offset (l, t); non applicato in crop mode | |
| M6 | L'hint "Output W × H px" include il padding | |
| M7 | Link "Reset canvas" che azzera padding e sfondo | |
| M8 | Export JPG: in `encodeCanvas`, quando il mime effettivo è `image/jpeg`, l'immagine viene composta su un canvas riempito col colore di sfondo (bianco se trasparente); vale anche per gli angoli trasparenti della rotazione | |

## Shape selezionata

**Meccanismo M1–M8 + X1-B + X2-B + X3-B**: bottone "Canvas" nella rail sul modello di Crop, pannello nella sidebar destra, padding in px applicato dopo il resize, JPG appiattito sul colore di sfondo (bianco di default).

Deciso il 2026-10-28:
- R2: il lock è un padding uniforme in px, non proporzionale al rapporto d'aspetto (rivede la prima risposta, opzione (b)); nessuna unità %.
- X3-B scelta e confermata in design (`docs/design/canvas-size.pen`, schermate 1 e 2): bottone Canvas nella rail senza modalità, nessun contorno tratteggiato.
- Scartato in design: allargare il canvas sulla sorgente, prima della prospettiva, per portare le maniglie fuori dalla foto. Provato con schermate dedicate e tolto: il padding resta sull'output (X1-B).

