---
shaping: true
---

# Perspective Desktop App — Shaping

## Source

> non ho idea di cosa usare, io voglio creare una semplicissima applicazione da usare sul desktop che faccia esattamente quello che fa https://oathanrex.github.io/perspective-fix/ ovvero, caricare una foto, disegnare 4 punti e correggere la prospettiva, quindi gestire crop, resize e rotazione granulare, skew orizzontale e verticale. Non ho alcuna esperienza di sviluppo nativo.

---

## Problem

Manca uno strumento desktop semplice che, oltre alla correzione prospettica a 4 punti (come fa perspective-fix), permetta anche **crop, resize, rotazione granulare e skew orizzontale/verticale** in un'unica sessione. Il web tool di riferimento copre solo perspective + rotate + download.

L'utente vuole un'app desktop, ma non ha esperienza con sviluppo nativo (Swift/AppKit, ecc.) — quindi la scelta tecnologica deve tenere conto della curva di apprendimento.

## Outcome

Avere un'app desktop per macOS che:
1. Apre un'immagine locale
2. Permette di tracciare 4 punti e correggere la prospettiva con preview live
3. Permette crop, resize, rotazione granulare (in gradi decimali), skew H/V
4. Esporta l'immagine corretta in PNG/JPG a piena risoluzione

L'utente deve poter sviluppare e mantenere l'app in autonomia, partendo da zero esperienza nativa.

---

## Requirements (R)

| ID | Requirement | Status |
|----|-------------|--------|
| R0 | Replicare la funzionalità di perspective-fix (carica foto, 4 punti, preview, download) | Core goal |
| R1 | Aggiungere: crop manuale (rettangolo regolabile) | Must-have |
| R2 | Aggiungere: resize (target px o percentuale) | Must-have |
| R3 | Aggiungere: rotazione granulare in gradi decimali | Must-have |
| R4 | Aggiungere: skew orizzontale e verticale | Must-have |
| R5 | Funzionare su macOS (la macchina dell'utente) | Must-have |
| R6 | 🟡 Setup minimo: lanciare l'app e aggiornarla deve essere semplice (no Xcode, no signing, no ambienti complessi) | Must-have |
| R7 | 🟡 ~~Tecnologie già note~~ — irrilevante: lavoriamo in vibe coding, codice scritto da Claude | Out |
| R8 | Esportare in PNG e JPG a piena risoluzione | Must-have |
| R9 | Nessun upload a server: tutto in locale | Must-have |
| R10 | 🟡 Performance fluide su immagini fino a ~20 MP (perspective + preview live senza lag) | Must-have |
| R11 | 🟡 Solo macOS, uso personale (niente cross-platform, niente App Store, niente distribuzione a terzi) | Must-have |
| R12 | 🟡 Va bene se gira nel browser, purché si comporti come un'app (finestra propria o icona nel Dock) | Leaning yes |
| R13 | 🟡 Salvare con **sovrascrittura del file originale** (Save) | Must-have |
| R14 | 🟡 Salvare con **scelta percorso e nome** (Save As) tramite dialog nativo | Must-have |
| R15 | 🟡 Avvio = doppio click su un'icona. **Mai terminale, mai dev server da avviare** per usare l'app | Must-have |

---

## Shapes

Dopo i tuoi chiarimenti (solo Mac, uso personale, vibe coding, browser OK se performa), ho rimosso le shape non più rilevanti:
- ~~B Tauri~~ — non porta benefici rispetto ad A/D, aggiunge complessità di build
- ~~C Swift~~ — fallisce R6 (richiede Xcode/signing/setup nativo)

Restano due shape web + una nuova ultra-minimale:

### A: Electron (.app installata)

| Part | Mechanism | Flag |
|------|-----------|:----:|
| A1 | Wrapper Electron carica una pagina HTML/JS locale | |
| A2 | WebGL via libreria JS (glfx.js / OpenCV.js) per perspective transform | |
| A3 | Canvas 2D per rotate/skew/crop/resize | |
| A4 | File I/O via API Node.js | |
| A5 | Build .app via electron-builder | |

### D: PWA installabile (browser → Dock)

| Part | Mechanism | Flag |
|------|-----------|:----:|
| D1 | Singola SPA in HTML/JS, servita da localhost (vite) o pagina statica | |
| D2 | Manifest + service worker → "Installa app" in Chrome → icona Dock, finestra dedicata, niente UI browser | |
| D3 | Stesse librerie WebGL/Canvas di A | |
| D4 | File via drag&drop / input file; salva via download (`<a download>`) o File System Access API | |

### E: Singolo file HTML statico (zero setup)

| Part | Mechanism | Flag |
|------|-----------|:----:|
| E1 | Un unico file `index.html` con tutto il JS/CSS inline o linkato | |
| E2 | Apri da `file://` oppure servi con `python -m http.server` per dev | |
| E3 | Stesse librerie di A/D, caricate da CDN o vendored | |
| E4 | "Installazione" = bookmark o trascina nel Dock un alias a Chrome con quel file | ⚠️ |

Pro: zero build, zero npm, zero packaging. Modifichi un file, ricarichi.
Contro: non sembra un'app, niente icona dedicata, la WebGL da `file://` può avere limiti CORS con immagini caricate da disco.

---

## Fit Check

| Req | Requirement | Status | A (Electron) | D (PWA) | E (HTML statico) |
|-----|-------------|--------|:---:|:---:|:---:|
| R0 | Replicare perspective-fix | Core goal | ✅ | ✅ | ✅ |
| R1 | Crop manuale | Must-have | ✅ | ✅ | ✅ |
| R2 | Resize | Must-have | ✅ | ✅ | ✅ |
| R3 | Rotazione granulare | Must-have | ✅ | ✅ | ✅ |
| R4 | Skew H/V | Must-have | ✅ | ✅ | ✅ |
| R5 | Funziona su macOS | Must-have | ✅ | ✅ | ✅ |
| R6 | Setup minimo (no Xcode/signing) | Must-have | ✅ | ✅ | ✅ |
| R8 | Export PNG/JPG full-res | Must-have | ✅ | ✅ | ✅ |
| R9 | Tutto in locale | Must-have | ✅ | ✅ | ✅ |
| R10 | Performance su ~20 MP | Must-have | ✅ | ✅ | ✅ |
| R11 | Solo macOS, uso personale | Must-have | ✅ | ✅ | ✅ |
| R12 | OK se gira nel browser ma "sembra app" | Leaning yes | ✅ | ✅ | ❌ |
| 🟡 R13 | Save: sovrascrive il file originale | Must-have | ✅ | ⚠️ | ❌ |
| 🟡 R14 | Save As con dialog nativo | Must-have | ✅ | ⚠️ | ❌ |
| 🟡 R15 | Doppio click sull'icona, mai terminale né dev server | Must-have | ✅ | ❌ | ✅ |

**Notes:**
- **E fallisce R13/R14**: una pagina servita da `file://` non può scrivere sul filesystem. Può solo "scaricare" il file (va in Downloads), niente sovrascrittura, niente dialog "salva come".
- **D fallisce R15** (e parzialmente R13/R14): la PWA, anche installata, ha bisogno o di un server `localhost` in esecuzione, o di una pagina remota (GitHub Pages) per essere caricata la prima volta. Save in place esiste solo via File System Access API, che richiede Chrome (non Safari) e devi ri-concedere il permesso di scrittura.
- **A passa tutti**: Electron è una vera .app macOS che parte col doppio click, accede al filesystem via Node (sovrascrittura banale), apre i dialog nativi `dialog.showSaveDialog()`. Per uso personale puoi saltare la code-signing — la prima volta fai right-click → Apri, e poi non ti chiede più. R6 ora passa: il "setup" è un comando di build una tantum (`npm run dist`), poi solo l'icona da cliccare.

---

## Raccomandazione

**Shape A — Electron.**

I requisiti aggiunti (R13/R14 = save in place + save as nativo, R15 = solo icona, mai terminale) eliminano D ed E. Restano:
- D (PWA): falsa promessa di semplicità — per "non avviare nulla" devi pre-deployare su GitHub Pages, e per il save in place dipendi da una API browser (File System Access) che è solo Chromium e meno fluida del dialog macOS.
- E (HTML): vincoli filesystem di `file://` rendono Save/Save As impossibili.

Electron, invece, ti dà:
- 📦 Una `.app` reale dentro `/Applications` → clicchi e parte.
- 💾 Dialog nativi macOS per Open/Save/Save As.
- ✏️ Sovrascrittura del file originale via Node `fs.writeFile()` — banale.
- 🚀 Stesse performance WebGL del browser (è Chromium dentro).
- 🛠️ Stack web (HTML/JS/CSS) per la UI — perfetto per vibe coding.

Costo: una build una-tantum per generare la `.app`. Lo facciamo io e te quando l'app è pronta. In dev usiamo `npm run dev` (per noi che lavoriamo); l'utente finale (tu) non lo tocca mai.

## Decisione

✅ **Shape A (Electron) selezionata** in data 2026-05-03.

→ Dettaglio in [`breadboard.md`](./breadboard.md): Places, UI/Non-UI affordances, wiring, slicing V1→V8.
