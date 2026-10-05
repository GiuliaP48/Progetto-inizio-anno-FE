
import { StickyNote } from 'lucide';

import { chiamaApi } from '../api.js';

import { creaIcona } from './icona.js';

import { mostraToast } from './messaggio_errore.js';

import { creaBottoneDettagli } from './finestra-dettagli.js';

import { GRUPPI_PER_VISTA } from './pannello-todo.js';

// Il backend salva la data come mezzanotte UTC già portata all'inizio del periodo
// (il giorno, il lunedì o il primo del mese): diventa la mezzanotte italiana dello stesso giorno
function inizioDelPeriodo(nota) {
    const data = new Date(nota.data);
    return new Date(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate());
}

// Fine del periodo di una nota: un giorno, una settimana o un mese dopo l'inizio
function fineDelPeriodo(nota) {
    const fine = inizioDelPeriodo(nota);
    if (nota.tipo === 'giornaliera') fine.setDate(fine.getDate() + 1);
    else if (nota.tipo === 'settimanale') fine.setDate(fine.getDate() + 7);
    else fine.setMonth(fine.getMonth() + 1);
    return fine;
}

// true se la nota vale nel giorno indicato (il suo periodo lo comprende), la usano i gruppi "Oggi" e "Questa settimana" del pannello
export function notaValeOggi(nota, oggi) {
    return inizioDelPeriodo(nota) <= oggi && fineDelPeriodo(nota) > oggi;
}

// Periodo della nota scritto in breve, in cima alla card (il tipo lo dice già il titoletto del gruppo) --> "12/10", "settimana del 12/10" oppure "ottobre"
function testoPeriodo(nota) {
    const inizio = inizioDelPeriodo(nota);
    const giorno = inizio.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });

    if (nota.tipo === 'mensile') return inizio.toLocaleDateString('it-IT', { month: 'long' });
    // Settimanale: dal lunedì alla domenica (es. "28/09 – 04/10")
    if (nota.tipo === 'settimanale') {
        const domenica = new Date(inizio);
        domenica.setDate(domenica.getDate() + 6);
        return `${giorno} – ${domenica.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}`;
    }
    return giorno;
}

// Card di una nota, a forma di post-it: angolo in basso a destra piegato, periodo in alto e testo su righe come un foglio di quaderno
// cliccandola (se si può modificare) si apre in modifica
function creaCardNota(nota, possoModificare, apriNota) {
    // group: passando sopra la card, bordo e piega cambiano colore (se si può modificare)
    const card = document.createElement('div');
    card.className = 'group relative w-64 shrink-0';

    if (possoModificare) {
        card.classList.add('cursor-pointer');
        card.addEventListener('click', () => apriNota(nota));
    }

    // Il bordo è uno sfondo del colore del calendario con 2px di spazio intorno al foglio bianco
    // Tutti e due sono ritagliati con l'angolo in basso a destra tagliato in diagonale (clip-path)
    const bordo = document.createElement('div');
    bordo.className = 'rounded-box bg-(--colore-calendario)/40 p-0.5 [clip-path:polygon(0_0,100%_0,100%_calc(100%-24px),calc(100%-24px)_100%,0_100%)]';

    const foglio = document.createElement('div');
    foglio.className = 'flex flex-col gap-2 rounded-[calc(var(--radius-box)-2px)] bg-base-100 p-3 [clip-path:polygon(0_0,100%_0,100%_calc(100%-22.4px),calc(100%-22.4px)_100%,0_100%)]';

    // Riga in alto: periodo a sinistra
    const rigaAlta = document.createElement('div');
    rigaAlta.className = 'flex items-center justify-between';

    const periodo = document.createElement('p');
    periodo.className = 'text-xs font-semibold text-(--colore-calendario)';
    periodo.textContent = testoPeriodo(nota);
    rigaAlta.appendChild(periodo);

    // Righe del quaderno: una riga sottile ogni 24px, alta quanto una riga di testo (leading-6)
    // h-36 = 6 righe: il testo più lungo finisce con "…" (line-clamp-6) e si legge tutto aprendo la nota
    const testo = document.createElement('p');
    testo.className = 'h-36 text-sm leading-6 whitespace-pre-line wrap-break-word line-clamp-6 bg-[linear-gradient(to_bottom,transparent_calc(100%-1px),color-mix(in_srgb,var(--colore-calendario)_30%,transparent)_calc(100%-1px))] bg-size-[100%_24px]';
    testo.textContent = nota.testo;

    // Piega del foglio: triangolo del colore del calendario chiaro nell'angolo tagliato
    const piega = document.createElement('div');
    piega.className = 'absolute bottom-0 right-0 size-6 rounded-tl-md bg-(--colore-calendario)/40 [clip-path:polygon(0_0,100%_0,0_100%)]';

    // Passando sopra, bordo e piega diventano del colore pieno del calendario, come le card dei to-do
    if (possoModificare) {
        bordo.classList.add('transition-colors', 'group-hover:bg-(--colore-calendario)');
        piega.classList.add('transition-colors', 'group-hover:bg-(--colore-calendario)');
    }

    foglio.appendChild(rigaAlta);
    foglio.appendChild(testo);
    // i(dettagli) in basso a destra, a sinistra della piega del foglio (pr-5): apre la finestra con chi l'ha creata e modificata
    const rigaDettagli = document.createElement('div');
    rigaDettagli.className = 'flex justify-end pr-5';
    rigaDettagli.appendChild(creaBottoneDettagli({
        testo: nota.testo,
        tipo: nota.tipo,
        periodo: testoPeriodo(nota),
        oggetto: nota,
        femminile: true,
    }));
    foglio.appendChild(rigaDettagli);

    bordo.appendChild(foglio);
    card.appendChild(bordo);
    card.appendChild(piega);
    return card;
}

// Pannello NOTE sotto il calendario: le note del periodo visibile, divise in gruppi messi in fila, che scorrono insieme in orizzontale
// gruppi e regole sono gli stessi della colonna TO DO (GRUPPI_PER_VISTA)
// - calendario: il calendario della pagina (serve id e permessi)
// - apriNota: chiamata con la nota quando si clicca una card, per modificarla
// Restituisce l'elemento, le funzioni per cambiare periodo e ricaricare, e le note mostrate
export function creaPannelloNote(calendario, apriNota) {
    // Tutte le note del calendario, il periodo mostrato e le note visibili adesso
    let note = [];
    let periodoMostrato = null;
    let noteVisibili = [];

    // Bordo leggero del colore del calendario, come la colonna TO DO
    const pannello = document.createElement('section');
    pannello.className = 'flex flex-col gap-3 rounded-box border border-(--colore-calendario)/60 p-3';

    // Titolo al centro come TO DO
    const intestazione = document.createElement('h2');
    intestazione.className = 'flex items-center justify-center gap-2 text-xl font-semibold';
    const icona = creaIcona(StickyNote, 22);
    // Icona del colore del calendario
    icona.classList.add('text-(--colore-calendario)');
    intestazione.append('NOTE');
    intestazione.appendChild(icona);

    // Fila dei gruppi: scorre in orizzontale (pb-2 lascia spazio alla barra di scorrimento)
    const fila = document.createElement('div');
    fila.className = 'flex gap-4 overflow-x-auto pb-2';

    const caricamento = document.createElement('span');
    caricamento.className = 'loading loading-spinner loading-sm text-primary';
    fila.appendChild(caricamento);

    pannello.appendChild(intestazione);
    pannello.appendChild(fila);

    // Note di un gruppo, tra tutte quelle del calendario (stesse regole della colonna TO DO):
    // - gruppo normale: note del suo tipo il cui periodo si sovrappone a quello mostrato
    // - gruppo "soloOggi": note del suo tipo che valgono oggi
    function noteDelGruppo(gruppo, inizio, fine, oggi) {
        return note
            .filter((nota) => {
                if (nota.tipo !== gruppo.tipo) return false;
                if (gruppo.soloOggi) return notaValeOggi(nota, oggi);
                return inizioDelPeriodo(nota) < fine && fineDelPeriodo(nota) > inizio;
            })
            .sort((a, b) => new Date(a.data) - new Date(b.data) || new Date(a.creato_il) - new Date(b.creato_il));
    }

    // Crea un gruppo: titoletto al centro tra due linee e sotto le sue card in fila (o "–" se è vuoto)
    // dal secondo gruppo in poi c'è una linea verticale a sinistra che lo separa dal precedente
    function creaGruppo(gruppo, noteGruppo, primo) {
        const sezione = document.createElement('div');
        sezione.className = primo
            ? 'flex shrink-0 flex-col gap-3'
            : 'flex shrink-0 flex-col gap-3 border-l border-base-content/50 pl-4';

        // Titoletto al centro tra due linee uguali, come nella colonna TO DO
        const rigaTitolo = document.createElement('div');
        rigaTitolo.className = 'flex items-center gap-2';

        const lineaSinistra = document.createElement('div');
        lineaSinistra.className = 'flex-1 border-t border-base-content/50';

        const titoloGruppo = document.createElement('h3');
        titoloGruppo.className = 'shrink-0 text-xs font-semibold uppercase tracking-wide text-(--colore-calendario)';
        titoloGruppo.textContent = gruppo.titolo;

        const lineaDestra = document.createElement('div');
        lineaDestra.className = 'flex-1 border-t border-base-content/50';

        rigaTitolo.appendChild(lineaSinistra);
        rigaTitolo.appendChild(titoloGruppo);
        rigaTitolo.appendChild(lineaDestra);
        sezione.appendChild(rigaTitolo);

        // Gruppo vuoto: un trattino al centro, in uno spazio largo abbastanza per il titoletto
        if (noteGruppo.length === 0) {
            const vuoto = document.createElement('p');
            vuoto.className = 'min-w-48 text-center text-sm text-base-content/50';
            vuoto.textContent = '–';
            sezione.appendChild(vuoto);
            return sezione;
        }

        const carte = document.createElement('div');
        carte.className = 'flex gap-3';
        noteGruppo.forEach((nota) => carte.appendChild(creaCardNota(nota, calendario.posso_modificare, apriNota)));
        sezione.appendChild(carte);

        return sezione;
    }

    // Mostra in fila i gruppi della vista, ognuno con le sue note
    function mostraNote() {
        if (!periodoMostrato) return;

        const { inizio, fine, tipoVista } = periodoMostrato;
        const oggi = new Date();
        const comprendeOggi = oggi >= inizio && oggi < fine;

        // I gruppi "di oggi" compaiono solo se la vista comprende oggi
        const gruppi = (GRUPPI_PER_VISTA[tipoVista] || [])
            .filter((gruppo) => !gruppo.soloOggi || comprendeOggi)
            .map((gruppo) => ({ gruppo, noteGruppo: noteDelGruppo(gruppo, inizio, fine, oggi) }));

        noteVisibili = gruppi.flatMap(({ noteGruppo }) => noteGruppo);

        fila.innerHTML = '';
        gruppi.forEach(({ gruppo, noteGruppo }, indice) => {
            fila.appendChild(creaGruppo(gruppo, noteGruppo, indice === 0));
        });
    }

    // Carica dal backend tutte le note del calendario
    async function caricaNote() {
        try {
            note = await chiamaApi(`/note/lista/${calendario.id}`);
            mostraNote();
        } catch (errore) {
            caricamento.remove();
            mostraToast(errore.message);
        }
    }

    caricaNote();

    return {
        elemento: pannello,
        // Chiamata da FullCalendar ogni volta che cambia periodo o vista
        // (tipoVista: 'giornaliera', 'settimanale' o 'mensile', per scegliere i gruppi)
        mostraPeriodo: (inizio, fine, tipoVista) => {
            periodoMostrato = { inizio, fine, tipoVista };
            mostraNote();
        },
        // Per ricaricare dopo aver creato, modificato o eliminato una nota
        ricarica: caricaNote,
        // Note mostrate adesso, nell'ordine dei gruppi
        leggiVisibili: () => noteVisibili,
    };
}