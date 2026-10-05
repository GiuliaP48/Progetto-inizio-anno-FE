
import { CalendarDays, ListTodo, StickyNote } from 'lucide';

import { chiamaApi } from '../api.js';

import { mostraToast } from './messaggio_errore.js';

import { creaIcona } from './icona.js';

import { BADGE_PRIORITA, VALORE_PRIORITA, VALORE_SENZA_PRIORITA } from './pannello-todo.js';

import { formattaOra } from '../utility/date.js';

// Colore usato per i calendari che non ne hanno uno (lo stesso delle altre pagine)
const COLORE_PREDEFINITO = '#cb6ce6';

// Quanti elementi si vedono al massimo in ogni colonna: gli altri diventano "e altre 2"
const MASSIMO_PER_COLONNA = 5;

// Rotta del backend con il riepilogo di oggi da tutti i calendari, già filtrato
const PERCORSO_RIEPILOGO = '/utenti/oggi';

// Accanto al calendario di to do e note: per quale periodo valgono
const TESTI_TIPO = {
    giornaliera: 'oggi',
    settimanale: 'questa settimana',
    mensile: 'questo mese',
};

// Orario di un evento di oggi: "Tutto il giorno", "10:00 – 11:00", oppure "fino alle 06:00" / "dalle 22:00" se comincia ieri o finisce domani
function orarioEvento(evento, inizioOggi, fineOggi) {
    if (evento.tutto_il_giorno) return 'Tutto il giorno';

    const inizio = new Date(evento.data_inizio);
    const fine = new Date(evento.data_fine);
    const iniziaPrima = inizio < inizioOggi;
    const finisceDopo = fine > fineOggi;

    if (iniziaPrima && finisceDopo) return 'Tutto il giorno';
    if (iniziaPrima) return `fino alle ${formattaOra(fine)}`;
    if (finisceDopo) return `dalle ${formattaOra(inizio)}`;
    return `${formattaOra(inizio)} – ${formattaOra(fine)}`;
}

// Riga sotto ogni elemento: pallino e nome del calendario da cui arriva (ed eventuale periodo)
function creaRigaCalendario(calendario, testoAggiunto) {
    const riga = document.createElement('p');
    riga.className = 'flex items-center gap-1.5 text-xs text-base-content/60';

    const pallino = document.createElement('span');
    pallino.className = 'size-2 shrink-0 rounded-full';
    // Il colore cambia per ogni calendario, quindi va nello stile
    pallino.style.backgroundColor = calendario.colore || COLORE_PREDEFINITO;

    const nome = document.createElement('span');
    nome.className = 'truncate';
    nome.textContent = testoAggiunto ? `${calendario.nome} · ${testoAggiunto}` : calendario.nome;

    riga.appendChild(pallino);
    riga.appendChild(nome);
    return riga;
}

// Piccola card di un elemento: bordo sinistro del colore del calendario, come gli eventi nella griglia, cliccandola si apre il calendario da cui arriva
function creaCardElemento(calendario, contenutoAlto, testoAggiunto) {
    const card = document.createElement('a');
    card.href = `#/calendario/${calendario.id}`;
    // Sfondo grigio chiaro; passando sopra un po' più scuro, il bordo sinistro è del colore del calendario
    card.className = 'flex flex-col gap-1 rounded-field border-l-4 bg-base-200/60 px-3 py-2 transition-colors hover:bg-base-200';
    // Il colore cambia per ogni calendario, quindi va nello stile
    card.style.borderLeftColor = calendario.colore || COLORE_PREDEFINITO;

    card.appendChild(contenutoAlto);
    card.appendChild(creaRigaCalendario(calendario, testoAggiunto));
    return card;
}

// Card di un evento: orario e titolo, sotto il calendario
function creaCardEvento({ evento, calendario }, inizioOggi, fineOggi) {
    const riga = document.createElement('p');
    riga.className = 'flex items-baseline gap-2';

    const orario = document.createElement('span');
    orario.className = 'shrink-0 text-sm text-base-content/70';
    orario.textContent = orarioEvento(evento, inizioOggi, fineOggi);

    const titolo = document.createElement('span');
    titolo.className = 'truncate font-semibold';
    titolo.textContent = evento.titolo;

    riga.appendChild(orario);
    riga.appendChild(titolo);
    return creaCardElemento(calendario, riga);
}

// Card di una to do: badge della priorità e titolo, sotto il calendario e il periodo
function creaCardTodo({ todo, calendario }) {
    const riga = document.createElement('p');
    riga.className = 'flex items-center gap-2';

    if (BADGE_PRIORITA[todo.priorita]) {
        const badge = document.createElement('span');
        badge.className = BADGE_PRIORITA[todo.priorita].classi;
        badge.textContent = BADGE_PRIORITA[todo.priorita].testo;
        riga.appendChild(badge);
    }

    const titolo = document.createElement('span');
    titolo.className = 'truncate font-semibold';
    titolo.textContent = todo.titolo;
    riga.appendChild(titolo);

    return creaCardElemento(calendario, riga, TESTI_TIPO[todo.tipo]);
}

// Card di una nota: il testo (al massimo due righe), sotto il calendario e il periodo
function creaCardNota({ nota, calendario }) {
    const testo = document.createElement('p');
    testo.className = 'line-clamp-2 whitespace-pre-line wrap-break-word text-sm';
    testo.textContent = nota.testo;

    return creaCardElemento(calendario, testo, TESTI_TIPO[nota.tipo]);
}

// Una colonna della card: titoletto al centro tra due linee con l'icona (come i gruppi dei pannelli, ma nei colori dell'app), al massimo 5 elementi, poi "e altre N"
// se è vuota un "–" al centro
function creaColonna(titolo, icona, cards, testoAltri) {
    const colonna = document.createElement('div');
    // Spazio ai lati della linea verticale (la prima colonna non ne ha a sinistra, l'ultima a destra)
    colonna.className = 'flex min-w-0 flex-col gap-2 md:px-6 md:first:pl-0 md:last:pr-0';

    const rigaTitolo = document.createElement('div');
    rigaTitolo.className = 'flex items-center gap-2';

    const lineaSinistra = document.createElement('div');
    lineaSinistra.className = 'flex-1 border-t border-base-content/50';

    const titoletto = document.createElement('h3');
    titoletto.className = 'flex shrink-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary';
    titoletto.appendChild(creaIcona(icona, 14));
    titoletto.append(titolo);

    const lineaDestra = document.createElement('div');
    lineaDestra.className = 'flex-1 border-t border-base-content/50';

    rigaTitolo.appendChild(lineaSinistra);
    rigaTitolo.appendChild(titoletto);
    rigaTitolo.appendChild(lineaDestra);
    colonna.appendChild(rigaTitolo);

    if (cards.length === 0) {
        const vuoto = document.createElement('p');
        // flex-1: il trattino occupa tutto lo spazio vuoto della colonna e sta al centro, anche in altezza
        vuoto.className = 'flex flex-1 items-center justify-center text-sm text-base-content/50';
        vuoto.textContent = '–';
        colonna.appendChild(vuoto);
        return colonna;
    }

    cards.slice(0, MASSIMO_PER_COLONNA).forEach((card) => colonna.appendChild(card));

    const altri = cards.length - MASSIMO_PER_COLONNA;
    if (altri > 0) {
        const testo = document.createElement('p');
        testo.className = 'text-center text-sm text-base-content/60';
        testo.textContent = `${testoAltri} ${altri}`;
        colonna.appendChild(testo);
    }

    return colonna;
}

// Card "Oggi" dell'area personale: eventi, to do da fare e note di oggi, da tutti i calendari, ogni elemento dice da quale calendario arriva. Restituisce l'elemento e la funzione per riempirla
export function creaRiquadroOggi() {
    const card = document.createElement('section');
    card.className = 'card bg-base-100 border border-base-300 mx-4 overflow-hidden';

    // Striscia in alto con il gradiente dell'app
    const striscia = document.createElement('div');
    striscia.className = 'h-2 bg-linear-to-r from-blu-logo to-rosa-logo';

    const corpo = document.createElement('div');
    corpo.className = 'card-body gap-4';

    const titolo = document.createElement('h2');
    titolo.className = 'card-title text-lg';
    // Solo la data: "Il riepilogo di oggi" è già scritto nel sottotitolo sopra la card
    titolo.textContent = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

    // Tre colonne affiancate sugli schermi larghi, una sotto l'altra su quelli stretti
    const colonne = document.createElement('div');
    // Sugli schermi larghi le colonne sono divise da linee verticali, come i gruppi del pannello NOTE
    colonne.className = 'grid gap-6 md:grid-cols-3 md:gap-0 md:divide-x md:divide-base-content/50';

    const caricamento = document.createElement('span');
    caricamento.className = 'loading loading-spinner loading-md text-primary';
    colonne.appendChild(caricamento);

    corpo.appendChild(titolo);
    corpo.appendChild(colonne);
    card.appendChild(striscia);
    card.appendChild(corpo);


    // Chiede al backend il riepilogo di oggi (eventi, to do non completate e note che valgono oggi, da tutti i calendari, in una sola richiesta) e riempie le tre colonne
    // I calendari servono per mostrare il nome e il colore da cui arriva ogni elemento
    async function mostra(calendari) {
        const inizioOggi = new Date();
        inizioOggi.setHours(0, 0, 0, 0);
        const fineOggi = new Date(inizioOggi);
        fineOggi.setDate(fineOggi.getDate() + 1);

        // Il calendario di un elemento, tra quelli già caricati nell'area personale
        function calendarioDi(elemento) {
            return calendari.find((calendario) => calendario.id === elemento.calendario_id);
        }

        try {
            const riepilogo = await chiamaApi(PERCORSO_RIEPILOGO);

            // Ogni elemento si porta dietro il suo calendario, per il colore e il nome
            const eventiDiOggi = riepilogo.eventi
                .map((evento) => ({ evento, calendario: calendarioDi(evento) }))
                .filter(({ calendario }) => calendario)
                // Prima quelli di tutto il giorno, poi in ordine di orario
                .sort((a, b) => Number(b.evento.tutto_il_giorno) - Number(a.evento.tutto_il_giorno)
                    || new Date(a.evento.data_inizio) - new Date(b.evento.data_inizio));

            const todoDiOggi = riepilogo.todos
                .map((todo) => ({ todo, calendario: calendarioDi(todo) }))
                .filter(({ calendario }) => calendario)
                // Prima le alte, poi medie e basse, alla fine quelle senza priorità
                .sort((a, b) => (VALORE_PRIORITA[a.todo.priorita] ?? VALORE_SENZA_PRIORITA)
                    - (VALORE_PRIORITA[b.todo.priorita] ?? VALORE_SENZA_PRIORITA));

            const noteDiOggi = riepilogo.note
                .map((nota) => ({ nota, calendario: calendarioDi(nota) }))
                .filter(({ calendario }) => calendario);

            colonne.innerHTML = '';
            colonne.appendChild(creaColonna('Eventi', CalendarDays, eventiDiOggi.map((dati) => creaCardEvento(dati, inizioOggi, fineOggi)), 'e altri'));
            colonne.appendChild(creaColonna('To do da fare', ListTodo, todoDiOggi.map(creaCardTodo), 'e altre'));
            colonne.appendChild(creaColonna('Note', StickyNote, noteDiOggi.map(creaCardNota), 'e altre'));
        } catch (errore) {
            caricamento.remove();
            mostraToast(errore.message);
        }
    }

    return { elemento: card, mostra };
}