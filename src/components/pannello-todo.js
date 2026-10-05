
import { ListTodo, Forward, ArrowUpDown, EllipsisVertical } from 'lucide';

import { chiamaApi } from '../api.js';

import { creaIcona } from './icona.js';

import { mostraToast } from './messaggio_errore.js';

import { testoCompletato } from './info-autori.js';

import { creaBottoneDettagli } from './finestra-dettagli.js';

// Badge della priorità di una lista: alta rossa, media arancione, bassa gialla
export const BADGE_PRIORITA = {
    alta: { testo: 'Alta', classi: 'badge badge-xs shrink-0 border-0 bg-red-500 text-white' },
    media: { testo: 'Media', classi: 'badge badge-xs shrink-0 border-0 bg-orange-400 text-white' },
    bassa: { testo: 'Bassa', classi: 'badge badge-xs shrink-0 border-0 bg-yellow-300 text-yellow-900' },
};

// Puntino della priorità di un elemento, con gli stessi colori
export const PUNTINI_PRIORITA = {
    alta: 'size-2 shrink-0 rounded-full bg-red-500',
    media: 'size-2 shrink-0 rounded-full bg-orange-400',
    bassa: 'size-2 shrink-0 rounded-full bg-yellow-400',
};

// Ordini possibili per liste ed elementi: il valore è lo stesso usato dal backend
const ORDINI = [
    { valore: 'posizione', testo: 'Manuale' },
    { valore: 'priorita', testo: 'Priorità' },
    { valore: 'alfabetico', testo: 'Alfabetico' },
    { valore: 'data_creazione', testo: 'Data di creazione' },
];

// Ordine usato se non ne è stato scelto uno
const ORDINE_PREDEFINITO = 'posizione';

// Peso delle priorità per l'ordine "Priorità": prima le alte, alla fine quelle senza priorità
export const VALORE_PRIORITA = { alta: 0, media: 1, bassa: 2 };
export const VALORE_SENZA_PRIORITA = 3;

// Gruppi della colonna per ogni vista, in ordine: prima le liste del tipo della vista, poi le altre
// - chiave: serve a ricordare l'ordine scelto per il gruppo
// - tipo: il tipo di liste del gruppo
// - soloOggi: il gruppo mostra solo le liste che valgono oggi, e compare solo se la vista comprende oggi
export const GRUPPI_PER_VISTA = {
    giornaliera: [
        { chiave: 'giornaliere', titolo: 'Giornaliere', tipo: 'giornaliera' },
        { chiave: 'settimanali', titolo: 'Settimanali', tipo: 'settimanale' },
        { chiave: 'mensili', titolo: 'Mensili', tipo: 'mensile' },
    ],
    settimanale: [
        { chiave: 'settimanali', titolo: 'Settimanali', tipo: 'settimanale' },
        { chiave: 'oggi', titolo: 'Oggi', tipo: 'giornaliera', soloOggi: true },
    ],
    mensile: [
        { chiave: 'mensili', titolo: 'Mensili', tipo: 'mensile' },
        { chiave: 'questa-settimana', titolo: 'Questa settimana', tipo: 'settimanale', soloOggi: true },
        { chiave: 'oggi', titolo: 'Oggi', tipo: 'giornaliera', soloOggi: true },
    ],
};

// Il backend salva la data come mezzanotte UTC (es. 2026-10-05T00:00:00.000Z): diventa la mezzanotte italiana dello stesso giorno
// poi il periodo parte dal lunedì per le settimanali e dal primo del mese per le mensili
function inizioDelPeriodo(todo) {
    const data = new Date(todo.data_attuale);
    const inizio = new Date(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate());

    // getDay: 0 = domenica, 1 = lunedì... quindi si torna indietro fino al lunedì
    if (todo.tipo === 'settimanale') inizio.setDate(inizio.getDate() - ((inizio.getDay() + 6) % 7));
    if (todo.tipo === 'mensile') inizio.setDate(1);

    return inizio;
}

// Fine del periodo di un to-do: un giorno, una settimana o un mese dopo l'inizio
function fineDelPeriodo(todo) {
    const fine = inizioDelPeriodo(todo);
    if (todo.tipo === 'giornaliera') fine.setDate(fine.getDate() + 1);
    else if (todo.tipo === 'settimanale') fine.setDate(fine.getDate() + 7);
    else fine.setMonth(fine.getMonth() + 1);
    return fine;
}


// true se la lista vale nel giorno indicato (il suo periodo lo comprende): la usano i gruppi "Oggi" e "Questa settimana" della colonna
export function todoValeOggi(todo, oggi) {
    return inizioDelPeriodo(todo) <= oggi && fineDelPeriodo(todo) > oggi;
}

// Da dove arriva una lista rimandata: il giorno, la settimana o il mese in cui era prevista
// la data arriva come mezzanotte UTC: si prende solo il giorno
function testoOrigine(todo) {
    const data = new Date(todo.data_originale);
    const giorno = new Date(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate());

    if (todo.tipo === 'mensile') {
        return `da ${giorno.toLocaleDateString('it-IT', { month: 'long' })}`;
    }

    if (todo.tipo === 'settimanale') {
        // La settimana va dal lunedì alla domenica (es. "dal 21/09 – 27/09")
        giorno.setDate(giorno.getDate() - ((giorno.getDay() + 6) % 7));
        const domenica = new Date(giorno);
        domenica.setDate(domenica.getDate() + 6);
        const formato = { day: '2-digit', month: '2-digit' };
        return `dal ${giorno.toLocaleDateString('it-IT', formato)} – ${domenica.toLocaleDateString('it-IT', formato)}`;
    }

    return `dal ${giorno.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}`;
}

// Ordine scelto, ricordato nel browser: è solo una preferenza di visualizzazione, se non c'è (o non è valido) si usa l'ordine manuale
function leggiOrdine(chiave) {
    const salvato = localStorage.getItem(chiave);
    return ORDINI.some((ordine) => ordine.valore === salvato) ? salvato : ORDINE_PREDEFINITO;
}

function salvaOrdine(chiave, ordine) {
    localStorage.setItem(chiave, ordine);
}

// Restituisce una copia degli oggetti nell'ordine scelto, con le stesse regole del backend
// - campoTesto: il campo per l'ordine alfabetico ('titolo' per le liste, 'testo' per gli elementi)
// - dati: da ogni oggetto prende quello con i campi da confrontare (di solito l'oggetto stesso)
function ordina(oggetti, ordine, campoTesto, dati = (oggetto) => oggetto) {
    const perDataCreazione = (a, b) => new Date(dati(a).creato_il) - new Date(dati(b).creato_il);
    const copia = [...oggetti];

    if (ordine === 'alfabetico') {
        return copia.sort((a, b) => (dati(a)[campoTesto] || '').localeCompare(dati(b)[campoTesto] || ''));
    }

    if (ordine === 'data_creazione') {
        return copia.sort(perDataCreazione);
    }

    if (ordine === 'priorita') {
        // A parità di priorità, prima il più vecchio
        return copia.sort((a, b) =>
            (VALORE_PRIORITA[dati(a).priorita] ?? VALORE_SENZA_PRIORITA)
            - (VALORE_PRIORITA[dati(b).priorita] ?? VALORE_SENZA_PRIORITA)
            || perDataCreazione(a, b));
    }

    // Manuale: l'ordine deciso trascinando
    return copia.sort((a, b) => dati(a).posizione - dati(b).posizione);
}

// Salva nel backend il nuovo ordine manuale
// Le posizioni che gli oggetti avevano già vengono ridistribuite nel nuovo ordine, così non si toccano quelle delle liste di altri periodi. Si salvano solo quelle cambiate
async function salvaPosizioni(oggettiInOrdine, percorsoModifica) {
    const posizioni = oggettiInOrdine.map((oggetto) => oggetto.posizione).sort((a, b) => a - b);

    // Ogni posizione deve essere più grande di quella prima: se due sono uguali, l'ordine non è sicuro
    for (let indice = 1; indice < posizioni.length; indice++) {
        if (posizioni[indice] <= posizioni[indice - 1]) posizioni[indice] = posizioni[indice - 1] + 1;
    }

    await Promise.all(oggettiInOrdine.map(async (oggetto, indice) => {
        if (oggetto.posizione === posizioni[indice]) return;
        await chiamaApi(`${percorsoModifica}/${oggetto.id}`, { metodo: 'PUT', corpo: { posizione: posizioni[indice] } });
        oggetto.posizione = posizioni[indice];
    }));
}

// Permette di riordinare i figli di "contenitore" trascinandoli per la loro maniglia ([data-maniglia]).
// Alla fine, se l'ordine è cambiato, chiama alSpostamento con i figli nel nuovo ordine.
// Usa il drag and drop del browser: funziona col mouse ma non col dito (da implementare con SortableJS)
function rendiOrdinabile(contenitore, alSpostamento) {
    // Segno per riconoscere il contenitore: le maniglie di un contenitore dentro (es. gli elementi
    // dentro una card) non devono spostare i figli di questo
    contenitore.dataset.ordinabile = '';

    let trascinato = null;
    let ordinePrima = [];

    // Figlio diretto del contenitore che contiene "elemento" (null se non c'è)
    function figlioCon(elemento) {
        return [...contenitore.children].find((figlio) => figlio.contains(elemento)) || null;
    }

    // Si può trascinare solo partendo dalla maniglia
    contenitore.addEventListener('mousedown', (evento) => {
        const maniglia = evento.target.closest('[data-maniglia]');
        if (!maniglia || maniglia.closest('[data-ordinabile]') !== contenitore) return;
        figlioCon(maniglia).draggable = true;
    });

    // Se si lascia il mouse senza trascinare, niente resta trascinabile
    contenitore.addEventListener('mouseup', () => {
        if (trascinato) return;
        [...contenitore.children].forEach((figlio) => { figlio.draggable = false; });
    });

    contenitore.addEventListener('dragstart', (evento) => {
        if (evento.target.parentElement !== contenitore) return;
        trascinato = evento.target;
        ordinePrima = [...contenitore.children];
        // Senza questa riga alcuni browser non fanno partire il trascinamento
        evento.dataTransfer.setData('text/plain', '');
        evento.dataTransfer.effectAllowed = 'move';
        trascinato.classList.add('opacity-50');
    });

    // Mentre si trascina: il figlio trascinato va prima o dopo quello sotto il mouse, a seconda che il mouse sia nella sua metà alta o bassa
    contenitore.addEventListener('dragover', (evento) => {
        if (!trascinato) return;
        evento.preventDefault();

        const sotto = figlioCon(evento.target);
        if (!sotto || sotto === trascinato) return;

        const rettangolo = sotto.getBoundingClientRect();
        const metaBassa = evento.clientY > rettangolo.top + rettangolo.height / 2;
        contenitore.insertBefore(trascinato, metaBassa ? sotto.nextSibling : sotto);
    });

    contenitore.addEventListener('drop', (evento) => {
        if (trascinato) evento.preventDefault();
    });

    contenitore.addEventListener('dragend', () => {
        if (!trascinato) return;

        trascinato.classList.remove('opacity-50');
        trascinato.draggable = false;
        trascinato = null;

        const ordineDopo = [...contenitore.children];
        const cambiato = ordineDopo.some((figlio, indice) => figlio !== ordinePrima[indice]);
        if (cambiato) alSpostamento(ordineDopo);
    });
}

// Maniglia per trascinare (icona con tre puntini), visibile solo con l'ordine manuale
function creaManiglia(etichetta) {
    const maniglia = document.createElement('span');
    maniglia.className = 'mt-0.5 shrink-0 cursor-grab text-base-content/40';
    maniglia.setAttribute('aria-label', etichetta);
    maniglia.dataset.maniglia = '';
    maniglia.appendChild(creaIcona(EllipsisVertical, 16));
    return maniglia;
}

// Menu per scegliere l'ordine: bottone tondo che apre l'elenco dei criteri, lo stesso menu serve per i gruppi di liste e per gli elementi di ogni card
// - etichetta: testo del fumetto e per i lettori di schermo (es. "Ordina liste")
// - ordineIniziale: il criterio già scelto
// - alCambio: chiamata con il nuovo criterio
// - classeTooltip: dove compare il fumetto
function creaMenuOrdine(etichetta, ordineIniziale, alCambio, classeTooltip = 'tooltip tooltip-left') {
    let ordineScelto = ordineIniziale;

    const contenitore = document.createElement('div');
    contenitore.className = 'relative shrink-0';
    // Segno per riconoscere il menu: i clic qui dentro non aprono la card in modifica
    contenitore.dataset.ordine = '';

    // Cerchio con il bordo spesso del colore del calendario: leggero passando sopra, pieno quando la tendina è aperta 
    const bottone = document.createElement('button');
    bottone.type = 'button';
    bottone.className = 'btn btn-ghost btn-sm btn-circle outline-none border-2 hover:border-(--colore-calendario)/50 hover:bg-(--colore-calendario)/10';
    bottone.setAttribute('aria-label', etichetta);
    bottone.setAttribute('aria-expanded', 'false');
    bottone.appendChild(creaIcona(ArrowUpDown, 14));

    // Fumetto con lo stile dell'app (tooltip di daisyUI)
    const contenitoreTooltip = document.createElement('div');
    contenitoreTooltip.className = classeTooltip;
    contenitoreTooltip.dataset.tip = etichetta;
    contenitoreTooltip.appendChild(bottone);

    // Tendina bianca con il bordo del colore del calendario, come le card
    const menu = document.createElement('ul');
    menu.className = 'menu hidden absolute right-0 top-full z-20 mt-1 w-44 rounded-box border-2 border-(--colore-calendario)/40 bg-base-100 p-2 shadow-lg';

    // Bottoni delle voci, per evidenziare quella scelta
    const voci = [];

    // Evidenzia la voce del criterio scelto con il colore del calendario chiaro
    function aggiornaVoci() {
        voci.forEach(({ bottoneVoce, valore }) => {
            const scelta = valore === ordineScelto;
            bottoneVoce.classList.toggle('bg-(--colore-calendario)/20', scelta);
            bottoneVoce.classList.toggle('font-semibold', scelta);
        });
    }

    ORDINI.forEach((ordine) => {
        const elemento = document.createElement('li');

        const bottoneVoce = document.createElement('button');
        bottoneVoce.type = 'button';
        // Passando sopra, la voce si colora appena del colore del calendario
        bottoneVoce.className = 'hover:bg-(--colore-calendario)/10';
        bottoneVoce.textContent = ordine.testo;
        bottoneVoce.addEventListener('click', () => {
            ordineScelto = ordine.valore;
            aggiornaVoci();
            chiudi();
            alCambio(ordine.valore);
        });

        voci.push({ bottoneVoce, valore: ordine.valore });
        elemento.appendChild(bottoneVoce);
        menu.appendChild(elemento);
    });

    // Cliccando fuori dal menu, il menu si chiude
    function chiudiFuori(evento) {
        if (!contenitore.contains(evento.target)) chiudi();
    }

    function apri() {
        menu.classList.remove('hidden');
        bottone.setAttribute('aria-expanded', 'true');
        // Bottone "acceso" mentre la tendina è aperta: bordo e sfondo del colore del calendario
        bottone.classList.add('border-(--colore-calendario)', 'bg-(--colore-calendario)/15');
        // Con la tendina aperta il fumetto non serve
        contenitoreTooltip.classList.remove('tooltip');
        document.addEventListener('click', chiudiFuori);
    }

    function chiudi() {
        menu.classList.add('hidden');
        bottone.setAttribute('aria-expanded', 'false');
        bottone.classList.remove('border-(--colore-calendario)', 'bg-(--colore-calendario)/15');
        contenitoreTooltip.classList.add('tooltip');
        document.removeEventListener('click', chiudiFuori);
    }

    bottone.addEventListener('click', () => {
        if (menu.classList.contains('hidden')) apri();
        else chiudi();
    });

    aggiornaVoci();
    contenitore.appendChild(contenitoreTooltip);
    contenitore.appendChild(menu);
    return contenitore;
}

// Riga di un elemento: maniglia (solo con l'ordine manuale), casella da spuntare, puntino della priorità e testo, barrato quando è fatto.
// La spunta si salva subito nel backend
// dopoSpunta avvisa la card che qualcosa è cambiato
function creaRigaElemento(elemento, possoModificare, dopoSpunta, conManiglia) {
    const riga = document.createElement('li');
    riga.className = 'flex items-start gap-1';
    // Serve a riconoscere l'elemento dopo averlo trascinato
    riga.dataset.id = elemento.id;

    if (conManiglia) riga.appendChild(creaManiglia('Trascina per spostare l\'elemento'));

    const etichetta = document.createElement('label');
    etichetta.className = 'flex min-w-0 flex-1 items-center gap-2 text-sm cursor-pointer';

    // La casella prende il colore del calendario 
    const casella = document.createElement('input');
    casella.type = 'checkbox';
    casella.className = 'checkbox checkbox-sm shrink-0 [--input-color:var(--colore-calendario)]';
    casella.checked = elemento.completato;
    casella.disabled = !possoModificare;

    const testo = document.createElement('span');
    testo.className = 'min-w-0 wrap-break-word';
    testo.textContent = elemento.testo;

    const contenitoreTesto = document.createElement('span');
    contenitoreTesto.className = 'min-w-0';
    contenitoreTesto.appendChild(testo);

    // Sugli elementi fatti, passando sopra il testo, il fumetto dice chi li ha completati
    function aggiornaFumetto() {
        const testoFumetto = testoCompletato(elemento);
        contenitoreTesto.classList.toggle('tooltip', Boolean(testoFumetto));
        if (testoFumetto) contenitoreTesto.dataset.tip = testoFumetto;
    }

    // Testo barrato e più chiaro se l'elemento è fatto
    function aggiornaTesto() {
        testo.classList.toggle('line-through', casella.checked);
        testo.classList.toggle('text-base-content/50', casella.checked);
    }

    casella.addEventListener('change', async () => {
        // Bloccata durante il salvataggio, così non si clicca due volte
        casella.disabled = true;

        try {
            const aggiornato = await chiamaApi(`/elementi-to-do/completa/${elemento.id}`, {
                metodo: 'PUT',
                corpo: { completato: casella.checked },
            });
            // Il backend dice com'è davvero l'elemento dopo il salvataggio
            if (aggiornato && typeof aggiornato.completato === 'boolean') {
                casella.checked = aggiornato.completato;
            }
            elemento.completato = casella.checked;
            // Il backend dice anche chi l'ha spuntato e chi l'ha modificato per ultimo
            if (aggiornato) {
                elemento.completato_da = aggiornato.completato_da;
                elemento.modificato_da = aggiornato.modificato_da;
                elemento.modificato_il = aggiornato.modificato_il;
            }
            aggiornaFumetto();
            dopoSpunta();
        } catch (errore) {
            // Se il salvataggio non va, la casella torna com'era
            casella.checked = !casella.checked;
            mostraToast(errore.message);
        } finally {
            casella.disabled = false;
            aggiornaTesto();
        }
    });

    aggiornaTesto();
    etichetta.appendChild(casella);

    // Il puntino c'è solo se l'elemento ha una priorità, con il fumetto dell'app che la dice
    if (PUNTINI_PRIORITA[elemento.priorita]) {
        const puntino = document.createElement('span');
        puntino.className = PUNTINI_PRIORITA[elemento.priorita];

        const tooltipPuntino = document.createElement('span');
        tooltipPuntino.className = 'tooltip flex shrink-0';
        tooltipPuntino.dataset.tip = `Priorità ${BADGE_PRIORITA[elemento.priorita].testo.toLowerCase()}`;
        tooltipPuntino.appendChild(puntino);
        etichetta.appendChild(tooltipPuntino);
    }

    etichetta.appendChild(contenitoreTesto);
    aggiornaFumetto();
    riga.appendChild(etichetta);
    return riga;
}

// Card di una lista: maniglia (solo con l'ordine manuale), titolo, priorità, rimando, menu dell'ordine degli elementi e gli elementi
// - ricaricaColonna: ricarica tutta la colonna (dopo un rimando o se un salvataggio non va)
// - apriTodo: apre la lista in modifica
function creaCardTodo(todo, elementi, possoModificare, conManiglia, ricaricaColonna, apriTodo) {
    const card = document.createElement('div');
    // Bianca con un bordo leggero del colore del calendario, per staccarsi dallo sfondo della colonna
    card.className = 'rounded-box border-2 border-(--colore-calendario)/40 bg-base-100 p-3 flex flex-col gap-2';
    // Serve a riconoscere la lista dopo averla trascinata
    card.dataset.id = todo.id;

    // Clic sulla card (ma non su caselle, bottoni, maniglie e menu): la lista si apre in modifica
    if (possoModificare) {
        // Passando sopra, il bordo diventa del colore pieno del calendario: si capisce che la card si apre
        card.classList.add('cursor-pointer', 'transition-colors', 'hover:border-(--colore-calendario)');
        card.addEventListener('click', (clic) => {
            if (clic.target.closest('input, button, label, [data-maniglia], [data-ordine]')) return;
            apriTodo(todo, elementi);
        });
    }

    // Intestazione: maniglia e titolo a sinistra, bottone "Rimanda" a destra
    // La riga sotto il titolo prende il colore del calendario
    const intestazione = document.createElement('div');
    intestazione.className = 'flex items-start justify-between gap-2 border-b-2 border-(--colore-calendario) pb-2';

    const parteSinistra = document.createElement('div');
    parteSinistra.className = 'flex min-w-0 flex-1 flex-col gap-0.5';

    // Priorità a sinistra, centrata in altezza rispetto al titolo anche quando va su due righe
    const titolo = document.createElement('h3');
    titolo.className = 'flex items-center gap-2 text-sm font-medium';

    // Maniglia dentro la riga del titolo: così è centrata come il badge
    if (conManiglia) {
        const maniglia = creaManiglia('Trascina per spostare la lista');
        // Il piccolo spostamento in basso serve agli elementi, qui no
        maniglia.classList.remove('mt-0.5');
        titolo.appendChild(maniglia);
    }

    if (BADGE_PRIORITA[todo.priorita]) {
        const badge = document.createElement('span');
        badge.className = BADGE_PRIORITA[todo.priorita].classi;
        badge.textContent = BADGE_PRIORITA[todo.priorita].testo;
        titolo.appendChild(badge);
    }

    // Il testo sta nella sua colonna: quando va a capo, resta allineato a destra del badge
    // min-w-0 e wrap-break-word: le parole lunghissime vanno a capo invece di uscire dalla card
    const testoTitolo = document.createElement('span');
    testoTitolo.className = 'min-w-0 wrap-break-word';
    testoTitolo.textContent = todo.titolo;
    titolo.appendChild(testoTitolo);

    parteSinistra.appendChild(titolo);

    // Quante volte la lista è stata spostata al periodo dopo
    if (todo.volte_rimandato > 0) {
        const rimandata = document.createElement('p');
        rimandata.className = 'text-xs text-base-content/60';
        // Es. "Rimandata 1 volta · dal 30/09"
        const volte = todo.volte_rimandato === 1 ? '1 volta' : `${todo.volte_rimandato} volte`;
        rimandata.textContent = `Rimandata ${volte} · ${testoOrigine(todo)}`;
        parteSinistra.appendChild(rimandata);
    }

    intestazione.appendChild(parteSinistra);

    // Bottone "Rimanda" con il fumetto sotto, così non copre il titolo: solo per chi può modificare
    const contenitoreRimanda = document.createElement('div');
    contenitoreRimanda.className = 'tooltip tooltip-bottom';
    contenitoreRimanda.dataset.tip = 'Rimanda';

    // Stesso aspetto del bottone dell'ordine: tondo, con l'anello del colore del calendario passando sopra
    const bottoneRimanda = document.createElement('button');
    bottoneRimanda.type = 'button';
    bottoneRimanda.className = 'btn btn-ghost btn-sm btn-circle outline-none border-2 hover:border-(--colore-calendario)/50 hover:bg-(--colore-calendario)/10';
    bottoneRimanda.setAttribute('aria-label', 'Rimanda al periodo dopo');
    bottoneRimanda.appendChild(creaIcona(Forward, 18));
    contenitoreRimanda.appendChild(bottoneRimanda);

    bottoneRimanda.addEventListener('click', async () => {
        bottoneRimanda.disabled = true;
        try {
            await chiamaApi(`/todos/rimanda/${todo.id}`, { metodo: 'PUT' });
            ricaricaColonna();
        } catch (errore) {
            bottoneRimanda.disabled = false;
            mostraToast(errore.message);
        }
    });

    if (possoModificare) intestazione.appendChild(contenitoreRimanda);

    // Una lista completata non si può rimandare (il backend la rifiuterebbe): completa = ha elementi e sono tutti fatti, come calcola il backend
    function aggiornaRimanda() {
        const completa = elementi.length > 0 && elementi.every((elemento) => elemento.completato);
        contenitoreRimanda.classList.toggle('hidden', completa);
    }

    card.appendChild(intestazione);

    // i(dettagli) in basso a destra: apre la finestra con chi ha creato, modificato e completato
    function aggiungiDettagli() {
        const rigaDettagli = document.createElement('div');
        rigaDettagli.className = 'flex justify-end';
        rigaDettagli.appendChild(creaBottoneDettagli({
            titolo: todo.titolo,
            priorita: todo.priorita,
            oggetto: todo,
            femminile: true,
            elementi,
        }));
        card.appendChild(rigaDettagli);
    }

    // Elementi
    if (elementi.length === 0) {
        const vuoto = document.createElement('p');
        vuoto.className = 'text-xs text-base-content/60';
        vuoto.textContent = 'Nessun elemento';
        card.appendChild(vuoto);
        aggiungiDettagli();
        return card;
    }

    // Ordine degli elementi di questa lista: scelto con il menu e ricordato nel browser
    const chiaveOrdine = `ordine-elementi-${todo.id}`;
    let ordineElementi = leggiOrdine(chiaveOrdine);

    const elenco = document.createElement('ul');
    elenco.className = 'flex flex-col gap-1.5';

    // Dopo la spunta di un elemento aggiorno anche la to do (chi l'ha modificata, quando, quanti elementi sono fatti e se è completata),
    // così la i(dettagli) è giusta senza ricaricare. Poi ricontrollo "Rimanda"
    function dopoSpuntaElemento(elemento) {
        todo.modificato_da = elemento.modificato_da;
        todo.modificato_il = elemento.modificato_il;

        todo.numero_completati = elementi.filter((elementoLista) => elementoLista.completato).length;
        const completa = todo.numero_completati === elementi.length;
        todo.data_completamento = completa ? elemento.modificato_il : null;

        aggiornaRimanda();
    }

    // Disegna gli elementi nell'ordine scelto; le maniglie solo con l'ordine manuale
    function disegnaElementi() {
        elenco.innerHTML = '';
        const conManiglieElementi = possoModificare && ordineElementi === 'posizione' && elementi.length > 1;

        ordina(elementi, ordineElementi, 'testo').forEach((elemento) => {
            elenco.appendChild(creaRigaElemento(elemento, possoModificare, () => dopoSpuntaElemento(elemento), conManiglieElementi));
        });
    }

    // Menu dell'ordine tra la linea del titolo e gli elementi: serve solo con almeno 2 elementi
    if (elementi.length > 1) {
        const rigaOrdine = document.createElement('div');
        rigaOrdine.className = 'flex justify-end';
        rigaOrdine.appendChild(creaMenuOrdine('Ordina elementi', ordineElementi, (nuovoOrdine) => {
            ordineElementi = nuovoOrdine;
            salvaOrdine(chiaveOrdine, nuovoOrdine);
            disegnaElementi();
        }));
        card.appendChild(rigaOrdine);
    }

    // Trascinando un elemento si salva il nuovo ordine manuale
    rendiOrdinabile(elenco, async (righe) => {
        const inOrdine = righe.map((riga) => elementi.find((elemento) => elemento.id === riga.dataset.id));
        try {
            await salvaPosizioni(inOrdine, '/elementi-to-do/modifica');
        } catch (errore) {
            mostraToast(errore.message);
            ricaricaColonna();
        }
    });

    disegnaElementi();
    card.appendChild(elenco);
    aggiornaRimanda();
    aggiungiDettagli();
    return card;
}

// Colonna TO DO accanto al calendario: mostra le liste del periodo visibile, divise in gruppi.
// - calendario: il calendario della pagina (serve id e permessi)
// - apriTodo: chiamata con lista ed elementi quando si clicca una card, per modificarla
// Restituisce l'elemento, le funzioni per cambiare periodo e ricaricare, e le liste mostrate
export function creaPannelloTodo(calendario, apriTodo) {
    // Tutte le liste del calendario e il periodo mostrato da FullCalendar
    let todos = [];
    let periodoMostrato = null;
    // Se si cambia periodo mentre si caricano gli elementi, i risultati vecchi si ignorano
    let numeroAggiornamento = 0;
    // Gruppi mostrati adesso, ognuno con le sue liste ed elementi
    let gruppiVisibili = [];

    // Sugli schermi grandi il riquadro è alto quanto il calendario e scorre da solo
    const pannello = document.createElement('aside');
    pannello.className = 'relative min-h-64';

    const riquadro = document.createElement('div');
    // Bordo leggero del colore del calendario, senza sfondo
    riquadro.className = 'flex flex-col gap-3 rounded-box border border-(--colore-calendario)/60 p-3 lg:absolute lg:inset-0';

    // Intestazione: solo il titolo al centro (l'ordine è in ogni gruppo)
    const intestazione = document.createElement('h2');
    intestazione.className = 'flex items-center justify-center gap-2 text-xl font-semibold';
    const icona = creaIcona(ListTodo, 22);
    // Icona del colore del calendario
    icona.classList.add('text-(--colore-calendario)');
    intestazione.append('TO DO');
    intestazione.appendChild(icona);

    // Scorre solo in verticale: i fumetti invisibili vicino al bordo non devono far comparire la barra orizzontale
    const lista = document.createElement('div');
    lista.className = 'flex flex-col gap-5 overflow-y-auto overflow-x-hidden max-h-96 lg:max-h-none lg:flex-1 lg:min-h-0';

    const caricamento = document.createElement('span');
    caricamento.className = 'loading loading-spinner loading-sm text-primary';
    lista.appendChild(caricamento);

    riquadro.appendChild(intestazione);
    riquadro.appendChild(lista);
    pannello.appendChild(riquadro);

    // Crea un gruppo: titoletto con una linea, menu dell'ordine e le sue card (o "–" se è vuoto)
    function creaGruppo({ gruppo, voci }) {
        const sezione = document.createElement('section');
        sezione.className = 'flex flex-col gap-3';

        // Ordine delle liste di questo gruppo: scelto con il menu e ricordato nel browser
        const chiaveOrdine = `ordine-liste-${calendario.id}-${gruppo.chiave}`;
        const ordine = leggiOrdine(chiaveOrdine);

        // Titoletto al centro tra due linee uguali, icona ordine in fondo a destra
        // Le linee sono bordi: il browser li allinea ai pixel, così hanno tutte lo stesso spessore
        const rigaTitolo = document.createElement('div');
        rigaTitolo.className = 'flex items-center gap-2';

        // Spazio largo come il bottone ordina: con quello a destra, tiene il titolo al centro della colonna
        const spazioSinistra = document.createElement('div');
        spazioSinistra.className = 'size-8 shrink-0';

        const lineaSinistra = document.createElement('div');        
        // Grigio neutro preso dal colore del testo (al 50%): fa solo da separatore
        lineaSinistra.className = 'flex-1 border-t border-base-content/50';

        const titoloGruppo = document.createElement('h3');
        titoloGruppo.className = 'text-xs font-semibold uppercase tracking-wide text-(--colore-calendario)';
        titoloGruppo.textContent = gruppo.titolo;

        const lineaDestra = document.createElement('div');
        lineaDestra.className = 'flex-1 border-t border-base-content/50';

        rigaTitolo.appendChild(spazioSinistra);
        rigaTitolo.appendChild(lineaSinistra);
        rigaTitolo.appendChild(titoloGruppo);
        rigaTitolo.appendChild(lineaDestra);

        // Il menu dell'ordine serve solo se nel gruppo c'è qualcosa da ordinare, altrimenti al suo posto c'è uno spazio uguale, così i titoli restano allineati
        if (voci.length > 0) {
            rigaTitolo.appendChild(creaMenuOrdine('Ordina liste', ordine, (nuovoOrdine) => {
                salvaOrdine(chiaveOrdine, nuovoOrdine);
                disegnaListe();
            }));
        } else {
            const spazioDestra = document.createElement('div');
            spazioDestra.className = 'size-8 shrink-0';
            rigaTitolo.appendChild(spazioDestra);
        }

        sezione.appendChild(rigaTitolo);

        // Gruppo vuoto: un trattino al posto delle card
        if (voci.length === 0) {
            const vuoto = document.createElement('p');
            vuoto.className = 'text-center text-sm text-base-content/50';
            vuoto.textContent = '–';
            sezione.appendChild(vuoto);
            return sezione;
        }

        // Card del gruppo: si trascinano solo dentro il gruppo
        const contenitoreCard = document.createElement('div');
        contenitoreCard.className = 'flex flex-col gap-3';

        const conManiglie = calendario.posso_modificare && ordine === 'posizione' && voci.length > 1;

        ordina(voci, ordine, 'titolo', ({ todo }) => todo).forEach(({ todo, elementi }) => {
            contenitoreCard.appendChild(creaCardTodo(todo, elementi, calendario.posso_modificare, conManiglie, caricaTodos, apriTodo));
        });

        // Trascinando una card si salva il nuovo ordine manuale del gruppo
        rendiOrdinabile(contenitoreCard, async (card) => {
            const inOrdine = card.map((elemento) => voci.find(({ todo }) => todo.id === elemento.dataset.id).todo);
            try {
                await salvaPosizioni(inOrdine, '/todos/modifica');
            } catch (errore) {
                mostraToast(errore.message);
                caricaTodos();
            }
        });

        sezione.appendChild(contenitoreCard);
        return sezione;
    }

    // Disegna tutti i gruppi mostrati
    function disegnaListe() {
        lista.innerHTML = '';
        gruppiVisibili.forEach((gruppoVisibile) => lista.appendChild(creaGruppo(gruppoVisibile)));
    }

    // Liste di un gruppo, tra tutte quelle del calendario:
    // - gruppo normale: liste del suo tipo il cui periodo si sovrappone a quello mostrato
    // - gruppo "soloOggi": liste del suo tipo che valgono oggi
    function listeDelGruppo(gruppo, inizio, fine, oggi) {
        return todos.filter((todo) => {
            if (todo.tipo !== gruppo.tipo) return false;
            if (gruppo.soloOggi) return todoValeOggi(todo, oggi);
            return inizioDelPeriodo(todo) < fine && fineDelPeriodo(todo) > inizio;
        });
    }

    // Prepara i gruppi della vista mostrata, con le liste e i loro elementi, e li disegna
    async function mostraTodos() {
        if (!periodoMostrato) return;

        const numero = ++numeroAggiornamento;
        const { inizio, fine, tipoVista } = periodoMostrato;

        const oggi = new Date();
        const comprendeOggi = oggi >= inizio && oggi < fine;

        // I gruppi "di oggi" compaiono solo se la vista comprende oggi
        const gruppi = (GRUPPI_PER_VISTA[tipoVista] || [])
            .filter((gruppo) => !gruppo.soloOggi || comprendeOggi)
            .map((gruppo) => ({ gruppo, liste: listeDelGruppo(gruppo, inizio, fine, oggi) }));

        try {
            // Elementi di tutte le liste mostrate (se la lista arriva già con gli elementi li usa)
            const gruppiConElementi = await Promise.all(gruppi.map(async ({ gruppo, liste }) => {
                const elementiPerTodo = await Promise.all(
                    liste.map((todo) => todo.elementi || chiamaApi(`/elementi-to-do/lista/${todo.id}`)),
                );
                return { gruppo, voci: liste.map((todo, indice) => ({ todo, elementi: elementiPerTodo[indice] })) };
            }));

            if (numero !== numeroAggiornamento) return;

            gruppiVisibili = gruppiConElementi;
            disegnaListe();
        } catch (errore) {
            mostraToast(errore.message);
        }
    }

    // Carica dal backend tutte le liste del calendario
    async function caricaTodos() {
        try {
            todos = await chiamaApi(`/todos/lista/${calendario.id}`);
            mostraTodos();
        } catch (errore) {
            caricamento.remove();
            mostraToast(errore.message);
        }
    }

    caricaTodos();

    return {
        elemento: pannello,
        // Chiamata da FullCalendar ogni volta che cambia periodo o vista (tipoVista: 'giornaliera', 'settimanale' o 'mensile', per scegliere i gruppi)
        mostraPeriodo: (inizio, fine, tipoVista) => {
            periodoMostrato = { inizio, fine, tipoVista };
            mostraTodos();
        },
        // Per ricaricare dopo aver creato o modificato una lista
        ricarica: caricaTodos,
        // Liste mostrate adesso, con i loro elementi, nell'ordine dei gruppi
        leggiVisibili: () => gruppiVisibili.flatMap(({ voci }) => voci),
    };
}