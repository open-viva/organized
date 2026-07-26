# ripasso

piano di studio settimanale generato dai dati reali del registro classeviva, con gemini 3.1 flash-lite.

i fatti (voti, verifiche, compiti, circolari) arrivano dagli endpoint documentati in
[open-viva/endpoints](https://github.com/open-viva/endpoints). il modello decide solo cosa studiare, quando e per quanto.

## struttura

```
ripasso/
├── package.json
├── server.js          # server locale: proxy + api, nessuna dipendenza
├── classeviva.js      # login, cookie, 12 endpoint, merge compiti, medie
├── gemini.js          # chiamata reale a gemini + schema + guardrail
├── .env               # da creare tu (vedi sotto)
└── public/
    ├── index.html
    ├── styles.css
    └── app.js
```

## avvio

```bash
mkdir -p ripasso/public && cd ripasso
# metti i file al loro posto come nell'albero sopra
node server.js          # oppure: node --env-file=.env server.js
```

poi apri `http://localhost:5173` e fai il login col codice del registro.

serve node 20.6+. zero `npm install`, nessuna dipendenza.

## .env

```
GEMINI_API_KEY=la_tua_chiave_da_aistudio.google.com
GEMINI_MODEL=gemini-3.1-flash-lite

# opzionali: se li metti qui, il form di login parte già compilato
CV_UID=S0000000
CV_PWD=
CV_CID=
CV_PIN=
CV_TARGET=studenti      # oppure genitori
```

## i compiti arrivano da due posti

questo è il punto delicato. i docenti registrano i compiti in due modi e le due liste si sovrappongono male.

| sorgente | endpoint | cosa contiene |
|---|---|---|
| agenda | `agendav2/all/{da}/{a}` | evento con `notes`, a volte con `homeworkId` |
| compiti | `homeworks/index` | compito assegnato vero e proprio |

`mergeTasks()` in `classeviva.js` le unisce in tre passaggi.

1. match forte: l'evento di agenda porta un `homeworkId` che esiste in `homeworks/index`, una sola voce, marcata doppio.
2. match debole: stessa data, stessa materia, primi 40 caratteri del testo normalizzati identici, unite.
3. resto: le voci presenti in una sola sorgente restano, con l'etichetta di provenienza.

il tipo (compito / verifica / evento) è certo solo quando `evtCode` è `AGHW` o c'è `homeworkId`.
negli altri casi viene letto dal testo con una regex e finisce a schermo con il badge dedotto, lo vedi tu e lo vede il modello, che nel `reason` lo tratta come probabile e non come dato.

## cosa vede il modello

in `gemini.js`, `buildContext()` spedisce: materie con medie e ultimi voti, scadenze delle prossime 3 settimane, argomenti delle lezioni degli ultimi 30 giorni, ore di scuola stimate per giorno, date delle assenze recenti, circolari che richiedono un'azione.

non spedisce: nome, cognome, codice fiscale, email, id studente, codice scuola, nome della scuola, nomi dei docenti.

## guardrail

lo schema json non basta, quindi `sanitize()` interviene dopo la risposta: blocchi tra 20 e 90 minuti in multipli di 15, massimo 4 al giorno, domenica un solo blocco da 30 minuti, tutti e sette i giorni presenti anche se il modello ne salta uno.

le scadenze non passano dal modello, vengono disegnate direttamente dai dati del registro. se il modello allucina una verifica, non la vedi comunque.

## limiti noti

- `phpsessid` è di sessione, dopo circa 20 minuti di inattività spaggiari la chiude e serve un nuovo login.
- l'orario delle lezioni future non esiste nell'api, il carico giornaliero è stimato dalla media delle ultime 4 settimane di lezioni firmate.
- documentazione non ufficiale, se spaggiari cambia gli endpoint, si rompe.
