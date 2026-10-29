# Lessons — canvas-size

- Una modifica che cambia la geometria dell'output va resa visibile nella preview: la preview si adatta al riquadro, quindi un bordo aggiunto non si vede se non c'è un contorno della canvas.
- Quello che l'utente legge come "la dimensione dell'immagine" è il pannello Size: ogni cambio di dimensione dell'output deve comparire lì, non solo nell'hint.
- Il padding sta tra crop e resize (`applyCanvasPadToStageD`, `stageC → stageD`); tutto il pannello Size legge `stageD`. In crop mode il padding è zero, così l'overlay del crop resta allineato.
- Nel Done di una fetta UI, dire cosa deve **vedere** l'utente, non solo cosa scrive il codice: il Done di V1 passava in lettura del codice e falliva a schermo.
- Ogni cambio di `state.canvasPad` passa da `fitResizeToCanvasPad()`: con un resize attivo `applyResizeToPreview` non risincronizza mai `resizeW/H`, quindi un valore sbagliato resta.
- In crop mode `stageC` è l'immagine intera, non ritagliata: niente calcoli di dimensione dell'output in crop mode; i controlli Canvas sono disabilitati.
- I passi della prova a mano vanno simulati sullo stato: un'azione che azzera qualcosa (riblocco del lock, Reset all) rende impossibili i passi successivi che lo presuppongono.
- "Sfondo" per l'utente vuol dire tutto il canvas dietro l'immagine, non solo lo spazio aggiunto: una scelta tecnica che separa le due zone (fasce sì, angoli no) va mostrata a schermo prima di fissarla nel Done.
