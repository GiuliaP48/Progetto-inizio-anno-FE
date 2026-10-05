
import { Clock, Repeat, Bell, Tag, AlignLeft } from 'lucide';

import { creaFinestra } from './finestra.js';

import { creaIcona } from './icona.js';

import { creaInfoAutori } from './info-autori.js';

import { RICORRENZE, quantita, MINUTI_IN_UN_ORA, MINUTI_IN_UN_GIORNO } from './form-evento.js';

import { formattaData, formattaOra, formattaDataOra, giornoTuttoIlGiorno } from '../utility/date.js';

// Giorno scritto per esteso (es. "lunedì 5 ottobre 2026")
function giornoPerEsteso(data) {
    return data.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// Scrive quando c'è l'evento, per esempio:
// - un giorno, con l'orario: "lunedì 5 ottobre 2026 · 10:00 – 11:00"
// - un giorno, tutto il giorno: "lunedì 5 ottobre 2026 · tutto il giorno"
// - più giorni: "dal 05/10/2026 alle 18:00 al 07/10/2026 alle 19:00" (o "dal 05/10/2026 al 07/10/2026 · tutto il giorno")
function testoQuando(evento) {
    if (evento.tutto_il_giorno) {
        // Tutto il giorno: conta solo il giorno, non l'ora. Si prende solo la data (es. 2026-10-05),
        // come nel form dell'evento, così il giorno scritto è sempre quello giusto
        const inizio = new Date(`${giornoTuttoIlGiorno(evento.data_inizio)}T00:00:00`);
        const fine = new Date(`${giornoTuttoIlGiorno(evento.data_fine)}T00:00:00`);

        return inizio.getTime() === fine.getTime()
            ? `${giornoPerEsteso(inizio)} · tutto il giorno`
            : `dal ${formattaData(inizio)} al ${formattaData(fine)} · tutto il giorno`;
    }

    const inizio = new Date(evento.data_inizio);
    const fine = new Date(evento.data_fine);

    return inizio.toDateString() === fine.toDateString()
        ? `${giornoPerEsteso(inizio)} · ${formattaOra(inizio)} – ${formattaOra(fine)}`
        : `dal ${formattaDataOra(inizio)} al ${formattaDataOra(fine)}`;
}

// Avviso scritto per esteso (es. "1 ora e 30 minuti prima", "All'inizio dell'evento")
function testoAvviso(minuti) {
    if (minuti === 0) return "All'inizio dell'evento";

    const giorni = Math.floor(minuti / MINUTI_IN_UN_GIORNO);
    const ore = Math.floor((minuti % MINUTI_IN_UN_GIORNO) / MINUTI_IN_UN_ORA);
    const resto = minuti % MINUTI_IN_UN_ORA;

    const parti = [];
    if (giorni > 0) parti.push(quantita(giorni, 'giorno', 'giorni'));
    if (ore > 0) parti.push(quantita(ore, 'ora', 'ore'));
    if (resto > 0) parti.push(quantita(resto, 'minuto', 'minuti'));

    return `${parti.join(' e ')} prima`;
}

// Riga con l'icona (nel colore del calendario) e accanto il contenuto
function creaRiga(icona, contenuto) {
    const riga = document.createElement('div');
    riga.className = 'flex items-start gap-3';

    const contenitoreIcona = document.createElement('span');
    contenitoreIcona.className = 'mt-0.5 shrink-0 text-(--colore-calendario)';
    contenitoreIcona.appendChild(creaIcona(icona, 16));

    riga.appendChild(contenitoreIcona);
    riga.appendChild(contenuto);
    return riga;
}

// Testo semplice per una riga
function creaTesto(testo) {
    const paragrafo = document.createElement('p');
    paragrafo.className = 'min-w-0 text-sm wrap-break-word';
    paragrafo.textContent = testo;
    return paragrafo;
}

// Apre la finestra "solo da leggere" di un evento, uguale per tutti i membri del calendario
// Chi può modificare il calendario ha in fondo il bottone "Modifica", che apre il form
// - evento: l'evento come arriva dal backend
// - coloreEvento: il colore pieno dell'evento (per il pallino e il titolo)
// - coloreCalendario: il colore del calendario (per le icone)
// - possoModificare: true se il bottone "Modifica" deve esserci
// - alModifica: funzione della pagina del calendario che apre il form di modifica;
//   la finestra la chiama quando si preme "Modifica", dopo essersi chiusa
export function apriDettagliEvento({ evento, coloreEvento, coloreCalendario, possoModificare, alModifica }) {
    const contenuto = document.createElement('div');
    contenuto.className = 'flex flex-col gap-4';

    // Titolo con il pallino del colore dell'evento
    const rigaTitolo = document.createElement('div');
    rigaTitolo.className = 'flex items-center gap-2';

    const pallino = document.createElement('span');
    pallino.className = 'size-3 shrink-0 rounded-full';
    // Il colore cambia per ogni evento
    pallino.style.backgroundColor = coloreEvento;

    const titolo = document.createElement('p');
    titolo.className = 'min-w-0 wrap-break-word text-lg font-semibold';
    titolo.textContent = evento.titolo;
    titolo.style.color = coloreEvento;

    rigaTitolo.appendChild(pallino);
    rigaTitolo.appendChild(titolo);
    contenuto.appendChild(rigaTitolo);

    // Righe con le informazioni: ci sono solo quelle che l'evento ha
    const informazioni = document.createElement('div');
    informazioni.className = 'flex flex-col gap-3';

    informazioni.appendChild(creaRiga(Clock, creaTesto(testoQuando(evento))));

    if (evento.ricorrenza) {
        const testoRicorrenza = RICORRENZE.find((ricorrenza) => ricorrenza.valore === evento.ricorrenza).testo;
        const testo = evento.fine_ricorrenza
            ? `${testoRicorrenza} fino al ${formattaData(evento.fine_ricorrenza)}`
            : testoRicorrenza;
        informazioni.appendChild(creaRiga(Repeat, creaTesto(testo)));
    }

    if (evento.tags && evento.tags.length > 0) {
        const fila = document.createElement('div');
        fila.className = 'flex flex-wrap gap-1';

        evento.tags.forEach((tag) => {
            const badge = document.createElement('span');
            badge.className = 'badge badge-sm border-0 font-semibold text-white';
            // Il colore cambia per ogni tag, quindi va nello stile (senza colore: quello del calendario)
            badge.style.backgroundColor = tag.colore || coloreCalendario;
            badge.textContent = tag.nome;
            fila.appendChild(badge);
        });

        informazioni.appendChild(creaRiga(Tag, fila));
    }

    if (evento.avviso !== null && evento.avviso !== undefined) {
        informazioni.appendChild(creaRiga(Bell, creaTesto(testoAvviso(evento.avviso))));
    }

    if (evento.descrizione) {
        const descrizione = creaTesto(evento.descrizione);
        // La descrizione tiene gli a capo che ha scritto chi l'ha creata
        descrizione.classList.add('whitespace-pre-line');
        informazioni.appendChild(creaRiga(AlignLeft, descrizione));
    }

    contenuto.appendChild(informazioni);
    contenuto.appendChild(creaInfoAutori(evento));

    // "Modifica": solo per chi può modificare il calendario
    const finestra = creaFinestra('Dettagli evento', contenuto);

    if (possoModificare) {
        const bottoneModifica = document.createElement('button');
        bottoneModifica.type = 'button';
        bottoneModifica.className = 'btn border-0 text-white bg-linear-to-r from-blu-logo to-rosa-logo';
        bottoneModifica.textContent = 'Modifica';
        bottoneModifica.addEventListener('click', () => {
            finestra.chiudi();
            alModifica();
        });
        contenuto.appendChild(bottoneModifica);
    }

    // Il colore del calendario cambia per ogni calendario, quindi va nello stile:
    // la finestra è fuori dal contenitore della pagina e non lo riceverebbe
    finestra.elemento.style.setProperty('--colore-calendario', coloreCalendario);

    // La finestra si toglie dalla pagina quando si chiude
    finestra.elemento.addEventListener('close', () => finestra.elemento.remove());
    document.body.appendChild(finestra.elemento);
    finestra.apri();
}