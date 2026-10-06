# Progetto-inizio-anno-FE
Frontend del progetto calendario — HTML, Tailwind CSS, JavaScript

# DayByDay — Frontend

**Autore:** Giulia Pompilii  
**Tecnologie:** JavaScript · Vite · Tailwind CSS v4 · daisyUI 5 · FullCalendar 6 · Cally · Lucide

---

## Descrizione

Frontend di **DayByDay**, un'applicazione per organizzare le proprie giornate con calendari personali e condivisi.  
Ogni calendario raccoglie **eventi** (anche ricorrenti), **to do** con i loro elementi e priorità, **note** e **tag**. 
I calendari condivisi permettono di invitare altre persone, decidere chi può modificare e ricevere notifiche.

L'interfaccia è scritta in JavaScript senza framework: le pagine e i componenti creano gli elementi con `document.createElement`, e lo stile è dato da Tailwind CSS e daisyUI.

---

## Requisiti

- Node.js 20.19+ (richiesto da Vite)
- npm
- Il backend di DayByDay avviato su `http://localhost:3000`

---

## Installazione

### 1. Clona il repository

```bash
git clone https://github.com/GiuliaP48/Progetto-inizio-anno-FE.git
cd Progetto-inizio-anno-FE
```

### 2. Installa le dipendenze

```bash
npm install
```

### 3. Configura le variabili d'ambiente

Il file `.env.local` viene fornito separatamente via email. Posizionarlo nella cartella root del progetto.

### 4. Avvia il backend

Prima del frontend va avviato il backend (vedi il README del backend).

### 5. Avvia il server di sviluppo

```bash
npm run dev
```

Il frontend sarà disponibile su `http://localhost:5173` (si apre la pagina di login).

---

## Struttura del progetto

```
Progetto-inizio-anno-FE/
├── src/
│   ├── main.js                          # Entry point e router (indirizzi con #, pagine private)
│   ├── env.js                           # Variabili d'ambiente (URL del backend)
│   ├── api.js                           # Chiamate al backend e rinnovo automatico del token
│   ├── autenticazione.js                # Login, registrazione, logout e utente corrente
│   ├── style.css                        # Tema daisyUI, colori dell'app e stili di FullCalendar e Cally
│   ├── assets/                          # Logo e titolo di DayByDay
│   ├── utility/
│   │   └── date.js                      # Formati e conversioni delle date
│   ├── components/                      # Componenti riutilizzabili
│   │   ├── navbar.js
│   │   ├── form.js                      # Campi, menu, errori e bottoni dei form
│   │   ├── finestra.js                  # Finestre (modali)
│   │   ├── conferma.js                  # Finestra di conferma (es. eliminazioni)
│   │   ├── messaggio_errore.js          # Messaggi temporanei (toast)
│   │   ├── icona.js                     # Icone Lucide
│   │   ├── card-sezione.js              # Card delle pagine di impostazioni e resoconti
│   │   ├── tavolozza-colori.js          # Scelta del colore
│   │   ├── selettore-orari.js           # Ruote per ore e minuti
│   │   ├── selettore-tag.js             # Scelta dei tag di un evento
│   │   ├── calendarietto.js             # Calendarietto Cally (salto a un giorno e campi data)
│   │   ├── form-calendario.js
│   │   ├── form-evento.js
│   │   ├── form-todo.js
│   │   ├── form-nota.js
│   │   ├── form-tag.js
│   │   ├── pannello-todo.js             # Colonna TO DO accanto al calendario
│   │   ├── pannello-note.js             # Pannello NOTE sotto il calendario
│   │   ├── finestra-dettagli.js         # Dettagli di to do e note (ⓘ)
│   │   ├── finestra-evento.js           # Dettagli di un evento, con il bottone Modifica
│   │   ├── info-autori.js               # "Creato da… il…", "Modificato da…", "Completato da…"
│   │   ├── riquadro-oggi.js             # Riepilogo di oggi nell'area personale
│   │   └── controllo-notifiche.js       # Controllo periodico delle notifiche nuove
│   └── pages/                           # Pagine dell'applicazione
│       ├── login-page.js
│       ├── area-personale-page.js
│       ├── calendario-page.js
│       ├── notifiche-page.js
│       ├── resoconti-page.js
│       ├── impostazioni-calendario-page.js
│       └── impostazioni-page.js
├── public/                              # File statici
├── index.html
├── package.json
├── vite.config.js
└── .gitignore
```

---

## Funzionalità

### Accesso
- **Login e registrazione**, con gli errori mostrati sotto il form
- **Sessione**: il token di accesso si rinnova da solo; si torna al login solo se la sessione è davvero scaduta (non se il server è momentaneamente irraggiungibile)

### Area personale
- **Riepilogo di oggi** — eventi, to do da fare e note di oggi da tutti i calendari, ognuno con il calendario da cui arriva
- **I tuoi calendari** — card con colore, tipo (personale o condiviso) e numero di membri
- **Nuovo calendario** — nome, tipo, colore e permessi
- **Notifiche** — campanella con il numero delle notifiche non lette

### Calendario
- **Quattro viste** — giornaliera, settimanale, mensile e annuale, con la vista preferita ricordata
- **Eventi** — creazione e modifica, tutto il giorno o con orario, colore, tag e avviso
- **Ricorrenze** — ogni giorno, settimana, mese o anno, con data di fine e controlli (durata massima della serie, niente sovrapposizioni tra ripetizioni); modifica di un'occorrenza o di tutta la serie
- **Dettagli evento** — finestra di sola lettura per tutti i membri, con il bottone "Modifica" per chi ha il permesso
- **Colonna TO DO** — liste giornaliere, settimanali e mensili con elementi spuntabili, priorità, rimando, ordinamento e trascinamento
- **Pannello NOTE** — note a forma di post-it, divise per periodo
- **Tag** — creazione, modifica ed eliminazione, anche su tutta una serie di eventi
- **Calendarietto** — per saltare a un giorno senza scorrere settimana per settimana
- **Chi ha fatto cosa** — "Creato da… / Modificato da… / Completato da…" su eventi, to do, elementi, note e tag (nei calendari personali solo le date)

### Resoconti
- **Andamento delle to do** — percentuale di to do completate, rimandate e da fare per giorno, settimana o mese, con il confronto con i periodi precedenti

### Notifiche
- **Elenco con filtri** — tutte, eventi, inviti, calendari
- **Inviti** — accetta o rifiuta direttamente dalla notifica

### Impostazioni del calendario
- **Generale** — nome e colore (amministratore)
- **Vista preferita** — per sé, o quella del calendario per tutti i membri (amministratore)
- **Membri** — chi può modificare, permessi per ogni membro, inviti tramite email, rimozione
- **Elimina calendario** (amministratore) o **esci dal calendario** (membro)

### Impostazioni del profilo
- **Dispositivi connessi** — da quali dispositivi si è fatto l'accesso e quando sono stati usati l'ultima volta
- **Dati personali** — nome, cognome ed email
- **Cambia password** — con la password attuale
- **Elimina account** — con conferma

---

## Librerie principali

| Libreria | Utilizzo |
|----------|----------|
| **FullCalendar 6** (core, daygrid, timegrid, multimonth, interaction) | Le quattro viste del calendario, eventi, clic su giorni ed eventi |
| **Cally** | Calendarietto (Web Component), con lo stile di daisyUI e i colori del calendario |
| **Tailwind CSS v4** | Stile di tutta l'applicazione, con classi scritte direttamente nel codice |
| **daisyUI 5** | Componenti (bottoni, card, schede, finestre, badge) e tema personalizzato |
| **Lucide** | Icone |

---

## Scelte importanti

- **Niente framework**: ogni pagina è una funzione che crea i suoi elementi e restituisce il contenitore; il router in `main.js` sceglie la pagina in base all'indirizzo (`#/calendario/ID`).
- **Indirizzi con il `#`** (es. `#/calendario/ID`): il browser non manda al server la parte dopo il `#`, quindi il server risponde sempre con la stessa pagina (`index.html`) e poi `main.js` legge cosa c'è dopo il `#` e mostra la pagina giusta. Così il router è semplice e funziona su qualsiasi server, senza configurazioni. Senza il `#` (es. `/calendario/ID`) il server dovrebbe essere configurato per rispondere sempre con `index.html`.
- **Un solo punto per il backend**: tutte le richieste passano da `chiamaApi` in `api.js`, che aggiunge il token, lo rinnova quando scade e restituisce il messaggio d'errore del backend.
- **Errori nei form**: i form non usano i fumetti del browser (`noValidate`); gli errori sono sempre una scritta rossa sotto il form.
- **Colori**: i colori dell'app (gradiente blu → rosa e lilla) sono usati per azioni, finestre e popup; il colore di ogni calendario per quello che sta dentro il calendario (linee, card, giorni evidenziati).
- **Eventi brevi e lunghi**: gli eventi di meno di 30 minuti mostrano orario e titolo su una riga; quelli di 24 ore o più diventano una barra nella riga "Tutto il giorno".
- **Viste con le ore**: giornaliera e settimanale hanno altezza fissa con lo scroll interno e partono dalle 7:00.

---

## Colori del tema

| Colore | Hex | Utilizzo |
|--------|-----|----------|
| Lilla | `#cb6ce6` | Primario (bottoni, selezioni, titoletti) |
| Blu logo | `#5170ff` | Inizio del gradiente dell'app |
| Rosa logo | `#ff66c4` | Fine del gradiente dell'app |
| Lilla chiaro | `#f6eefa` | Sfondo di tooltip e popup |
| Lilla bordo | `#e6cff0` | Bordo di menu e popup |
| Viola scuro | `#6b2f80` | Testo di tooltip e popup |
| Grigio chiaro | `#efedec` | Sfondo delle pagine |
| Rosso | `red-500` | Priorità alta |
| Arancione | `orange-400` | Priorità media |
| Giallo | `yellow-300` / `yellow-400` | Priorità bassa |

---

## Variabili d'ambiente

| Variabile | Descrizione |
|-----------|-------------|
| `VITE_BACKEND_URL` | URL del backend (es. `http://localhost:3000`) |