
import { Info, CircleCheck, Circle } from 'lucide';

import { creaFinestra } from './finestra.js';

import { creaIcona } from './icona.js';

import { creaInfoAutori } from './info-autori.js';

import { BADGE_PRIORITA, PUNTINI_PRIORITA } from './pannello-todo.js';

// Bottone tondo i(dettagli), come bottone ordina e Rimanda: passando sopra compare l'anello del colore del calendario
// cliccandolo si apre solo la finestra, non anche la modifica della card
export function creaBottoneDettagli(dettagli) {
    const bottone = document.createElement('button');
    bottone.type = 'button';
    bottone.className = 'btn btn-ghost btn-sm btn-circle outline-none border-2 hover:border-(--colore-calendario)/50 hover:bg-(--colore-calendario)/10';
    bottone.setAttribute('aria-label', 'Dettagli');
    bottone.appendChild(creaIcona(Info, 16));

    bottone.addEventListener('click', (clic) => {
        clic.stopPropagation();
        // La finestra non conosce il colore del calendario: lo si legge dal bottone e glielo si passa
        const colore = getComputedStyle(bottone).getPropertyValue('--colore-calendario').trim();
        apriFinestraDettagli({ ...dettagli, colore });
    });

    return bottone;
}

// Nomi dei tipi per il titoletto della nota
const TITOLI_TIPO = {
    giornaliera: 'Giornaliera',
    settimanale: 'Settimanale',
    mensile: 'Mensile',
};

// Titoletto al centro tra due linee, come i gruppi della colonna TO DO
function creaTitoletto(testo) {
    const riga = document.createElement('div');
    riga.className = 'flex items-center gap-2';

    const lineaSinistra = document.createElement('div');
    lineaSinistra.className = 'flex-1 border-t border-(--colore-calendario)/50';

    const titolo = document.createElement('h3');
    titolo.className = 'shrink-0 text-xs font-semibold uppercase tracking-wide text-(--colore-calendario)';
    titolo.textContent = testo;

    const lineaDestra = document.createElement('div');
    lineaDestra.className = 'flex-1 border-t border-(--colore-calendario)/50';

    riga.appendChild(lineaSinistra);
    riga.appendChild(titolo);
    riga.appendChild(lineaDestra);
    return riga;
}

// Testo della nota in un post-it come quello del pannello: bordo del colore del calendario righe del quaderno e angolo in basso a destra piegato. Qui è largo quanto la finestra
// e il testo si vede tutto (pb-5 per tenere l'ultima riga lontana dall'angolo piegato)
function creaPostIt(testo) {
    const postIt = document.createElement('div');
    postIt.className = 'relative';

    // Il bordo è uno sfondo del colore del calendario con 2px di spazio intorno al foglio bianco, così segue anche l'angolo tagliato
    const bordo = document.createElement('div');
    bordo.className = 'rounded-box bg-(--colore-calendario)/40 p-0.5 [clip-path:polygon(0_0,100%_0,100%_calc(100%-24px),calc(100%-24px)_100%,0_100%)]';

    const foglio = document.createElement('div');
    foglio.className = 'rounded-[calc(var(--radius-box)-2px)] bg-base-100 p-3 pb-5 [clip-path:polygon(0_0,100%_0,100%_calc(100%-22.4px),calc(100%-22.4px)_100%,0_100%)]';

    // Righe del quaderno: una riga sottile ogni 24px, alta quanto una riga di testo (leading-6)
    const testoNota = document.createElement('p');
    testoNota.className = 'text-sm leading-6 whitespace-pre-line wrap-break-word bg-[linear-gradient(to_bottom,transparent_calc(100%-1px),color-mix(in_srgb,var(--colore-calendario)_30%,transparent)_calc(100%-1px))] bg-size-[100%_24px]';
    testoNota.textContent = testo;

    // Piega del foglio: triangolo del colore del calendario chiaro nell'angolo tagliato
    const piega = document.createElement('div');
    piega.className = 'absolute bottom-0 right-0 size-6 rounded-tl-md bg-(--colore-calendario)/40 [clip-path:polygon(0_0,100%_0,0_100%)]';

    foglio.appendChild(testoNota);
    bordo.appendChild(foglio);
    postIt.appendChild(bordo);
    postIt.appendChild(piega);
    return postIt;
}

// Riga di un elemento della to do: cerchio (spuntato se fatto), puntino della priorità, testo e sotto chi l'ha creato, modificato e completato
function creaRigaElemento(elemento) {
    const riga = document.createElement('li');
    riga.className = 'flex flex-col gap-1';

    const intestazione = document.createElement('div');
    intestazione.className = 'flex items-center gap-2';

    const icona = creaIcona(elemento.completato ? CircleCheck : Circle, 16);
    icona.classList.add('shrink-0', 'text-(--colore-calendario)');
    intestazione.appendChild(icona);

    // Il puntino c'è solo se l'elemento ha una priorità
    // Senza priorità metto un puntino invisibile, che occupa lo stesso spazio: così i testi restano allineati
    if (PUNTINI_PRIORITA[elemento.priorita]) {
        const puntino = document.createElement('span');
        puntino.className = PUNTINI_PRIORITA[elemento.priorita];
        intestazione.appendChild(puntino);
    } else {
        const spazioPuntino = document.createElement('span');
        spazioPuntino.className = 'size-2 shrink-0';
        intestazione.appendChild(spazioPuntino);
    }

    const testo = document.createElement('span');
    testo.className = 'min-w-0 wrap-break-word text-sm';
    testo.textContent = elemento.testo;
    intestazione.appendChild(testo);

    riga.appendChild(intestazione);

    // pl-6: le righe "Creato da…" partono sotto il testo dell'elemento, non sotto il cerchio della spunta
    const autori = creaInfoAutori(elemento);
    autori.classList.add('pl-6');
    riga.appendChild(autori);

    return riga;
}

// Apre la finestra "Dettagli" di una to do o di una nota. Ognuna passa solo quello che ha, il resto resta vuoto:
// - to do: titolo, priorita, elementi
// - nota: testo, tipo, periodo (già scritto in breve, es. "28/09 – 04/10")
// - tutte e due: oggetto (la to do o la nota intera, per "Creata da…"), femminile e colore del calendario
export function apriFinestraDettagli({
    titolo = '',
    priorita = null,
    testo = '',
    tipo = '',
    periodo = '',
    oggetto,
    femminile = false,
    elementi = [],
    colore = '',
}) {
    const contenuto = document.createElement('div');
    contenuto.className = 'flex flex-col gap-4';

    // In alto: titolo con la priorità (to do) oppure tipo, periodo e post-it (nota)
    const parteAlta = document.createElement('div');
    parteAlta.className = 'flex flex-col gap-2';

    if (titolo) {
        const rigaTitolo = document.createElement('div');
        rigaTitolo.className = 'flex items-center gap-2';

        if (BADGE_PRIORITA[priorita]) {
            const badge = document.createElement('span');
            badge.className = BADGE_PRIORITA[priorita].classi;
            badge.textContent = BADGE_PRIORITA[priorita].testo;
            rigaTitolo.appendChild(badge);
        }

        const testoTitolo = document.createElement('p');
        testoTitolo.className = 'min-w-0 wrap-break-word font-semibold text-(--colore-calendario)';
        testoTitolo.textContent = titolo;
        rigaTitolo.appendChild(testoTitolo);

        parteAlta.appendChild(rigaTitolo);
    }

    if (testo) {
        // Nota: il tipo tra due linee, come nel pannello NOTE, e sotto il periodo nel colore del calendario
        if (TITOLI_TIPO[tipo]) parteAlta.appendChild(creaTitoletto(TITOLI_TIPO[tipo]));

        if (periodo) {
            const testoPeriodo = document.createElement('p');
            testoPeriodo.className = 'text-center text-sm font-semibold text-(--colore-calendario)';
            testoPeriodo.textContent = periodo;
            parteAlta.appendChild(testoPeriodo);
        }

        parteAlta.appendChild(creaPostIt(testo));
    }

    parteAlta.appendChild(creaInfoAutori(oggetto, femminile));
    contenuto.appendChild(parteAlta);

    // Elementi della to do, nel loro ordine, sotto il titoletto
    if (elementi.length > 0) {
        const elenco = document.createElement('ul');
        elenco.className = 'flex flex-col gap-3';

        [...elementi]
            .sort((a, b) => a.posizione - b.posizione)
            .forEach((elemento) => elenco.appendChild(creaRigaElemento(elemento)));

        contenuto.appendChild(creaTitoletto('Elementi'));
        contenuto.appendChild(elenco);
    }

    // Titolo della finestra: le to do hanno il titolo, le note il testo (come "Dettagli evento")
    const finestra = creaFinestra(titolo ? 'Dettagli to do' : 'Dettagli nota', contenuto);
    // Il colore del calendario cambia per ogni calendario, quindi va nello stile:
    // la finestra è fuori dal contenitore della pagina e non lo riceverebbe
    // Si dà alla finestra il colore del calendario letto dal bottone
    if (colore) finestra.elemento.style.setProperty('--colore-calendario', colore);

    // La finestra si toglie dalla pagina quando si chiude
    finestra.elemento.addEventListener('close', () => finestra.elemento.remove());
    document.body.appendChild(finestra.elemento);
    finestra.apri();
}