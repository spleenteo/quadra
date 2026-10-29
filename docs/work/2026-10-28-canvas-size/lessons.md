# Lessons — canvas-size

- Una modifica che cambia la geometria dell'output va resa visibile nella preview: la preview si adatta al riquadro, quindi un bordo aggiunto non si vede se non c'è un contorno della canvas.
- Quello che l'utente legge come "la dimensione dell'immagine" è il pannello Size: ogni cambio di dimensione dell'output deve comparire lì, non solo nell'hint.
- Il padding sta tra crop e resize (`applyCanvasPadToStageD`, `stageC → stageD`); tutto il pannello Size legge `stageD`. In crop mode il padding è zero, così l'overlay del crop resta allineato.
- Nel Done di una fetta UI, dire cosa deve **vedere** l'utente, non solo cosa scrive il codice: il Done di V1 passava in lettura del codice e falliva a schermo.
