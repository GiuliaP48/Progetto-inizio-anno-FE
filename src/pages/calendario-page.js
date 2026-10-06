
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import multiMonthPlugin from '@fullcalendar/multimonth';
import interactionPlugin from '@fullcalendar/interaction';
import itLocale from '@fullcalendar/core/locales/it';

import { ChevronLeft, ChevronRight, Plus, CalendarDays, Tag, StickyNote, ListTodo, Settings, ChartColumn } from 'lucide';

import { chiamaApi } from '../api.js';

import { creaNavbar } from '../components/navbar.js';
import { creaIcona } from '../components/icona.js';
import { mostraToast } from '../components/messaggio_errore.js';
import { creaFinestra } from '../components/finestra.js';
import { creaFormEvento } from '../components/form-evento.js';
import { apriDettagliEvento } from '../components/finestra-evento.js';
import { creaPannelloTodo, BADGE_PRIORITA } from '../components/pannello-todo.js';
import { creaFormTodo } from '../components/form-todo.js';
import { creaPannelloNote } from '../components/pannello-note.js';
import { creaFormNota } from '../components/form-nota.js';
import { creaFormTag } from '../components/form-tag.js';
import { creaInfoAutori, impostaCalendarioPersonale } from '../components/info-autori.js';
import { creaCalendarietto } from '../components/calendarietto.js';

import { giornoTuttoIlGiorno, aggiungiGiorni, formattaDataOra, formattaData, formattaOra, dataAAAAMMGG } from '../utility/date.js';

// Colore usato per i calendari che non ne hanno uno
const COLORE_PREDEFINITO = '#cb6ce6';

// Viste del calendario: nome usato dal backend (preferenza vista) --> nome usato da FullCalendar
const VISTE = [
    { nome: 'giornaliera', testo: 'Giornaliera', fullCalendar: 'timeGridDay' },
    { nome: 'settimanale', testo: 'Settimanale', fullCalendar: 'timeGridWeek' },
    { nome: 'mensile', testo: 'Mensile', fullCalendar: 'dayGridMonth' },
    { nome: 'annuale', testo: 'Annuale', fullCalendar: 'multiMonthYear' },
];

// Voci del menu "+"
const VOCI_MENU = [
    { nome: 'evento', testo: 'evento', icona: CalendarDays, attiva: true },
    { nome: 'tag', testo: 'tag', icona: Tag, attiva: true },
    { nome: 'nota', testo: 'nota', icona: StickyNote, attiva: true },
    { nome: 'todo', testo: 'to do', icona: ListTodo, attiva: true },
];

// Tipo proposto per un nuovo to-do in base alla vista (es. dalla settimanale --> settimanale)
const TIPO_TODO_PER_VISTA = {
    timeGridDay: 'giornaliera',
    timeGridWeek: 'settimanale',
    dayGridMonth: 'mensile',
};

// Durata sotto la quale un evento è "corto" (es. 15 minuti): orario e titolo sulla stessa riga.
// In millisecondi; va d'accordo con eventShortHeight (righe di mezz'ora da 32px)
const DURATA_EVENTO_CORTO = 30 * 60 * 1000;

// Durata da cui un evento con l'orario è "lungo" (24 ore o più): si mostra in alto,
// nella riga "Tutto il giorno", come una barra, invece di riempire la griglia delle ore
const DURATA_EVENTO_LUNGO = 24 * 60 * 60 * 1000;

// Altezza del calendario nelle viste con le ore (giornaliera e settimanale): tre quarti dello schermo,
// con lo scroll dentro la griglia, così titolo, frecce e "+" restano sempre visibili
// Mensile e annuale invece sono alte quanto serve
const ALTEZZA_VISTE_CON_ORE = '75vh';

// Ora da cui partono le viste con le ore (giornaliera e settimanale)
const ORA_DI_PARTENZA = '07:00:00';

// Crea un bottone piccolo con solo l'icona (frecce avanti e indietro)
function creaBottoneFreccia(icona, etichetta) {
    const bottone = document.createElement('button');
    bottone.type = 'button';
    bottone.className = 'btn btn-ghost btn-sm btn-circle';
    bottone.setAttribute('aria-label', etichetta);
    bottone.appendChild(creaIcona(icona, 18));
    return bottone;
}

// Trasforma un evento del backend nel formato che usa FullCalendar.
// Gli eventi di tutto il giorno usano solo il giorno, e per FullCalendar la fine è il giorno DOPO l'ultimo (es. evento del 3 ottobre: fine il 4)
function eventoPerFullCalendar(evento, coloreCalendario) {
    const colore = evento.colore || coloreCalendario;

    const dati = {
        id: evento.id,
        title: evento.titolo,
        // Sfondo tenue e testo scuro dello stesso colore: leggibile con qualsiasi colore, il colore pieno resta per il bordo
        backgroundColor: `color-mix(in oklab, ${colore} 18%, white)`,
        borderColor: colore,

        textColor: `color-mix(in oklab, ${colore} 70%, black)`,
        // L'evento originale del backend, per aprirlo in modifica
        extendedProps: { evento },
    };

    if (evento.tutto_il_giorno) {
        return {
            ...dati,
            allDay: true,
            start: giornoTuttoIlGiorno(evento.data_inizio),
            end: aggiungiGiorni(giornoTuttoIlGiorno(evento.data_fine), 1),
        };
    }
    // Evento lungo (24 ore o più): barra nella riga "Tutto il giorno", con l'ora di inizio nel titolo
    // (es. "18:00 Vacanze … 19:00", con le ore non in grassetto), perché nella barra l'orario non si vedrebbe.
    // Il form legge comunque gli orari veri dall'evento del backend (extendedProps)
    const inizio = new Date(evento.data_inizio);
    const fine = new Date(evento.data_fine);

    if (fine - inizio >= DURATA_EVENTO_LUNGO) {
        // Per FullCalendar la fine è il giorno DOPO l'ultimo; se l'evento finisce a mezzanotte
        // quel giorno non conta (es. fino a mercoledì 00:00 --> l'ultimo giorno è martedì)
        const finisceAMezzanotte = fine.getHours() === 0 && fine.getMinutes() === 0;

        return {
            ...dati,
            // Ore di inizio e fine a parte, non in grassetto come il titolo: vanno ai lati della barra 
            extendedProps: { evento, oraInizio: formattaOra(evento.data_inizio), oraFine: formattaOra(evento.data_fine) },
            allDay: true,
            start: dataAAAAMMGG(inizio),
            end: finisceAMezzanotte ? dataAAAAMMGG(fine) : aggiungiGiorni(dataAAAAMMGG(fine), 1),
        };
    }

    return { ...dati, start: evento.data_inizio, end: evento.data_fine };
}

export function paginaCalendario(calendarioId) {
    // Dati del calendario (nome, colore, permessi) e il calendario di FullCalendar
    let calendario = null;
    let calendarioVisuale = null;
    // Colonna dei to-do, creata quando arriva il calendario
    let pannelloTodo = null;
    // Pannello delle note, creato quando arriva il calendario
    let pannelloNote = null;

    // Sfondo e contenuto a tutta pagina
    const contenitore = document.createElement('div');
    contenitore.className = 'min-h-screen bg-base-200 p-4 flex flex-col gap-6';

    // Navbar con "I miei calendari"
    const bottoneCalendari = document.createElement('a');
    bottoneCalendari.href = '#/area-personale';
    bottoneCalendari.className = 'btn btn-ghost btn-sm';
    bottoneCalendari.appendChild(creaIcona(ChevronLeft, 16));
    bottoneCalendari.append('I miei calendari');

    const navbar = creaNavbar([bottoneCalendari]);

    // Card del calendario, con la striscia del suo colore in alto
    const card = document.createElement('section');
    card.className = 'card bg-base-100 border border-base-300 overflow-hidden';

    const striscia = document.createElement('div');
    striscia.className = 'h-2';

    const corpo = document.createElement('div');
    corpo.className = 'card-body gap-4';

    // Riga 1: nome del calendario a sinistra, scelta della vista a destra
    const rigaSuperiore = document.createElement('div');
    rigaSuperiore.className = 'flex flex-wrap items-center justify-between gap-3';

    const nomeCalendario = document.createElement('p');
    nomeCalendario.className = 'flex items-center gap-2 font-medium text-base-content/70';

    const pallino = document.createElement('span');
    pallino.className = 'size-3 rounded-full';
    nomeCalendario.appendChild(pallino);

    const testoNome = document.createElement('span');
    nomeCalendario.appendChild(testoNome);

    const schedeVista = document.createElement('div');
    schedeVista.className = 'tabs tabs-box';

    VISTE.forEach((vista) => {
        const scheda = document.createElement('button');
        scheda.type = 'button';
        scheda.className = 'tab';
        scheda.textContent = vista.testo;
        scheda.dataset.vista = vista.fullCalendar;
        scheda.addEventListener('click', () => calendarioVisuale?.changeView(vista.fullCalendar));
        schedeVista.appendChild(scheda);
    });

    rigaSuperiore.appendChild(nomeCalendario);
    rigaSuperiore.appendChild(schedeVista);

    // Riga 2: periodo mostrato a sinistra; frecce, "Oggi" e "+" a destra
    const rigaPeriodo = document.createElement('div');
    rigaPeriodo.className = 'flex flex-wrap items-center justify-between gap-3';

    const titoloPeriodo = document.createElement('h1');
    titoloPeriodo.className = 'text-3xl font-bold';

    const comandi = document.createElement('div');
    comandi.className = 'flex items-center gap-2';

    const bottonePrecedente = creaBottoneFreccia(ChevronLeft, 'Periodo precedente');
    const bottoneOggi = document.createElement('button');
    bottoneOggi.type = 'button';
    bottoneOggi.className = 'btn btn-outline btn-sm';
    bottoneOggi.textContent = 'Oggi';
    const bottoneSuccessivo = creaBottoneFreccia(ChevronRight, 'Periodo successivo');

    bottonePrecedente.addEventListener('click', () => calendarioVisuale?.prev());
    bottoneOggi.addEventListener('click', () => calendarioVisuale?.today());
    bottoneSuccessivo.addEventListener('click', () => calendarioVisuale?.next());

    // Calendarietto per saltare a un giorno: si apre con il bottone accanto a "Oggi", in una finestrella bianca con il bordo del colore del calendario
    const zonaCalendarietto = document.createElement('div');
    zonaCalendarietto.className = 'relative';

    const bottoneCalendarietto = creaBottoneFreccia(CalendarDays, 'Scegli un giorno');

    const finestrellaCalendarietto = document.createElement('div');
    finestrellaCalendarietto.className = 'absolute right-0 top-full z-20 mt-2 hidden rounded-box border-2 border-(--colore-calendario)/60 bg-base-100 p-2 shadow-lg';

    // Scelto un giorno, il calendario ci va restando nella stessa vista
    const calendarietto = creaCalendarietto((giorno) => {
        finestrellaCalendarietto.classList.add('hidden');
        calendarioVisuale?.gotoDate(giorno);
    });
    finestrellaCalendarietto.appendChild(calendarietto.elemento);

    // Si apre sul giorno che si sta guardando
    bottoneCalendarietto.addEventListener('click', () => {
        if (calendarioVisuale) calendarietto.mostra(dataAAAAMMGG(calendarioVisuale.getDate()));
        finestrellaCalendarietto.classList.toggle('hidden');
    });

    zonaCalendarietto.appendChild(bottoneCalendarietto);
    zonaCalendarietto.appendChild(finestrellaCalendarietto);

    comandi.appendChild(bottonePrecedente);
    comandi.appendChild(bottoneOggi);
    comandi.appendChild(zonaCalendarietto);
    comandi.appendChild(bottoneSuccessivo);

    rigaPeriodo.appendChild(titoloPeriodo);
    rigaPeriodo.appendChild(comandi);

    // Menu "+" con le due schede Aggiungi e Modifica
    const zonaMenu = document.createElement('div');
    zonaMenu.className = 'relative ml-2 hidden';

    const bottonePiu = document.createElement('button');
    bottonePiu.type = 'button';
    // Passando sopra compare un anello lilla intorno, come il bordo degli altri bottoni rotondi
    bottonePiu.className = 'btn btn-circle border-0 text-white bg-linear-to-r from-blu-logo to-rosa-logo outline-none hover:ring-2 hover:ring-primary hover:ring-offset-2 hover:ring-offset-base-100';
    bottonePiu.setAttribute('aria-label', 'Aggiungi o modifica');
    bottonePiu.appendChild(creaIcona(Plus, 22));

    const menu = document.createElement('div');
    // Menu del "+" bianco con il bordo lilla dell'app, come gli altri menu
    menu.className = 'absolute right-0 top-full mt-2 z-20 w-64 card bg-base-100 border-2 border-lilla-bordo text-lilla-scuro shadow-lg p-3 gap-2 hidden';

    const schedeMenu = document.createElement('div');
    // Fondo delle schede lilla, come il resto del menu
    schedeMenu.className = 'tabs tabs-box bg-lilla-bordo/40';

    let modalitaMenu = 'aggiungi';

    const schedaAggiungi = document.createElement('button');
    schedaAggiungi.type = 'button';
    schedaAggiungi.className = 'tab tab-active flex-1 outline-none';
    schedaAggiungi.textContent = 'Aggiungi';

    const schedaModifica = document.createElement('button');
    schedaModifica.type = 'button';
    schedaModifica.className = 'tab flex-1 outline-none';
    schedaModifica.textContent = 'Modifica';

    // Cambia scheda e aggiorna i testi delle voci (es. "Aggiungi evento" / "Modifica evento")
    function scegliModalita(modalita) {
        modalitaMenu = modalita;
        schedaAggiungi.classList.toggle('tab-active', modalita === 'aggiungi');
        schedaModifica.classList.toggle('tab-active', modalita === 'modifica');

        const azione = modalita === 'aggiungi' ? 'Aggiungi' : 'Modifica';
        bottoniMenu.forEach(({ testo, voce }) => {
            testo.textContent = `${azione} ${voce.testo}`;
        });
    }

    schedaAggiungi.addEventListener('click', () => scegliModalita('aggiungi'));
    schedaModifica.addEventListener('click', () => scegliModalita('modifica'));
    schedeMenu.appendChild(schedaAggiungi);
    schedeMenu.appendChild(schedaModifica);

    const listaMenu = document.createElement('ul');
    listaMenu.className = 'menu w-full p-0';

    // Bottoni delle voci, per poter cambiare il loro testo quando si cambia scheda
    const bottoniMenu = [];

    VOCI_MENU.forEach((voce) => {
        const elemento = document.createElement('li');
        // Le voci non ancora pronte restano visibili ma disattivate
        if (!voce.attiva) elemento.className = 'menu-disabled';

        const bottone = document.createElement('button');
        bottone.type = 'button';
        // Passando sopra, la voce si colora di lilla chiaro invece che di grigio
        bottone.className = 'justify-center outline-none hover:bg-lilla-chiaro';
        // Icona della voce e testo accanto
        const testo = document.createElement('span');
        bottone.appendChild(creaIcona(voce.icona, 16));
        bottone.appendChild(testo);
        bottoniMenu.push({ testo, voce });

        bottone.disabled = !voce.attiva;
        bottone.addEventListener('click', () => {
            menu.classList.add('hidden');
            sceltaMenu(voce.nome);
        });

        // Testi di partenza delle voci, con la scheda "Aggiungi" selezionata
        scegliModalita('aggiungi');

        elemento.appendChild(bottone);
        listaMenu.appendChild(elemento);
    });

    menu.appendChild(schedeMenu);
    menu.appendChild(listaMenu);
    zonaMenu.appendChild(bottonePiu);
    zonaMenu.appendChild(menu);
    comandi.appendChild(zonaMenu);

    bottonePiu.addEventListener('click', () => menu.classList.toggle('hidden'));

    // Cliccando fuori, il menu del "+" e il calendarietto si chiudono
    function chiudiMenuFuori(evento) {
        // Se nel frattempo si è cambiata pagina, smette di ascoltare
        if (!document.body.contains(contenitore)) {
            document.removeEventListener('click', chiudiMenuFuori);
            return;
        }
        if (!zonaMenu.contains(evento.target)) {
            menu.classList.add('hidden');
        }
        if (!zonaCalendarietto.contains(evento.target)) {
            finestrellaCalendarietto.classList.add('hidden');
        }
    }

    document.addEventListener('click', chiudiMenuFuori);

    // Spazio per FullCalendar
    const elementoCalendario = document.createElement('div');

    const caricamento = document.createElement('span');
    caricamento.className = 'loading loading-spinner loading-md text-primary';
    elementoCalendario.appendChild(caricamento);

    // Calendario a sinistra e colonna dei to-do a destra (sotto, sugli schermi piccoli)
    const zonaCalendario = document.createElement('div');
    zonaCalendario.className = 'grid gap-4 lg:grid-cols-[1fr_288px]';
    // Senza min-w-0 FullCalendar non si restringe dentro la griglia
    elementoCalendario.className = 'min-w-0';
    // Coloro tutte le linee del calendario con il colore del calendario, ma più chiaro
    elementoCalendario.style.setProperty('--fc-border-color', 'color-mix(in srgb, var(--colore-calendario) 40%, transparent)');
    zonaCalendario.appendChild(elementoCalendario);

    // Ordine composizione Calendario
    corpo.appendChild(rigaSuperiore);
    corpo.appendChild(rigaPeriodo);
    corpo.appendChild(zonaCalendario);
    card.appendChild(striscia);
    card.appendChild(corpo);
    contenitore.appendChild(navbar);
    contenitore.appendChild(card);

    // Apre la finestra dell'evento: nuovo (con l'inizio proposto) oppure in modifica.
    // Ogni volta si crea una finestra nuova, che si toglie dalla pagina quando si chiude
    function apriFinestraEvento({ evento = null, inizioProposto } = {}) {
        let finestra = null;

        const form = creaFormEvento({
            calendario,
            evento,
            inizioProposto,
            alSalvataggio: (messaggio) => {
                finestra.chiudi();
                mostraToast(messaggio, 'successo');
                calendarioVisuale.refetchEvents();
            },
        });

        finestra = creaFinestra(evento ? 'Modifica evento' : 'Nuovo evento', form, { larga: true });
        finestra.elemento.addEventListener('close', () => finestra.elemento.remove());
        contenitore.appendChild(finestra.elemento);
        finestra.apri();
    }

    // Apre la finestra con gli eventi del periodo mostrato, per scegliere quale modificare
    function apriSceltaEvento() {
        const eventi = calendarioVisuale.getEvents().sort((a, b) => a.start - b.start);

        const lista = document.createElement('ul');
        lista.className = 'menu w-full p-0 max-h-96 overflow-y-auto flex-nowrap';

        let finestra = null;

        if (eventi.length === 0) {
            const vuoto = document.createElement('p');
            vuoto.className = 'text-base-content/60';
            vuoto.textContent = 'Nessun evento in questo periodo';
            lista.appendChild(vuoto);
        }

        eventi.forEach((eventoVisuale) => {
            const evento = eventoVisuale.extendedProps.evento;

            const elemento = document.createElement('li');
            const bottone = document.createElement('button');
            bottone.type = 'button';
            bottone.className = 'flex items-center gap-3';

            const pallinoEvento = document.createElement('span');
            pallinoEvento.className = 'size-2.5 rounded-full shrink-0';
            // Il colore cambia per ogni evento: prendo quello del bordo, che è pieno (lo sfondo è schiarito)
            pallinoEvento.style.backgroundColor = eventoVisuale.borderColor;

            const testi = document.createElement('span');
            testi.className = 'flex flex-col items-start';

            const titolo = document.createElement('span');
            titolo.textContent = evento.titolo;

            const quando = document.createElement('span');
            quando.className = 'text-xs text-base-content/60';
            quando.textContent = evento.tutto_il_giorno
                ? `${formattaData(eventoVisuale.start)} · tutto il giorno`
                : formattaDataOra(evento.data_inizio);

            testi.appendChild(titolo);
            testi.appendChild(quando);
            testi.appendChild(creaInfoAutori(evento));
            bottone.appendChild(pallinoEvento);
            bottone.appendChild(testi);

            bottone.addEventListener('click', () => {
                finestra.chiudi();
                apriFinestraEvento({ evento });
            });

            elemento.appendChild(bottone);
            lista.appendChild(elemento);
        });

        finestra = creaFinestra('Quale evento vuoi modificare?', lista);
        finestra.elemento.addEventListener('close', () => finestra.elemento.remove());
        contenitore.appendChild(finestra.elemento);
        finestra.apri();
    }

    // Apre la finestra del to-do: nuovo (con giorno e tipo della vista) oppure in modifica
    function apriFinestraTodo({ todo = null, elementi = [] } = {}) {
        let finestra = null;

        const form = creaFormTodo({
            calendario,
            todo,
            elementi,
            giornoProposto: giornoNelPeriodoMostrato(),
            tipoProposto: TIPO_TODO_PER_VISTA[calendarioVisuale.view.type] || 'giornaliera',
            alSalvataggio: (messaggio) => {
                finestra.chiudi();
                mostraToast(messaggio, 'successo');
                pannelloTodo.ricarica();
            },
        });

        finestra = creaFinestra(todo ? 'Modifica to do' : 'Nuova To do', form, { larga: true });
        finestra.elemento.addEventListener('close', () => finestra.elemento.remove());
        contenitore.appendChild(finestra.elemento);
        finestra.apri();
    }

    // Apre la finestra con le liste mostrate nella colonna, per scegliere quale modificare
    function apriSceltaTodo() {
        const visibili = pannelloTodo.leggiVisibili();

        const lista = document.createElement('ul');
        lista.className = 'menu w-full p-0 max-h-96 overflow-y-auto flex-nowrap';

        let finestra = null;

        if (visibili.length === 0) {
            const vuoto = document.createElement('p');
            vuoto.className = 'text-base-content/60';
            vuoto.textContent = 'Nessun to do in questo periodo';
            lista.appendChild(vuoto);
        }

        visibili.forEach(({ todo, elementi }) => {
            const elemento = document.createElement('li');
            const bottone = document.createElement('button');
            bottone.type = 'button';
            bottone.className = 'flex flex-col items-start gap-0';

            // Titolo con il badge della priorità davanti, come nella colonna TO DO
            const titolo = document.createElement('span');
            titolo.className = 'flex items-center gap-2';

            if (BADGE_PRIORITA[todo.priorita]) {
                const badge = document.createElement('span');
                badge.className = BADGE_PRIORITA[todo.priorita].classi;
                badge.textContent = BADGE_PRIORITA[todo.priorita].testo;
                titolo.appendChild(badge);
            }

            titolo.append(todo.titolo);

            const dettagli = document.createElement('span');
            dettagli.className = 'text-xs text-base-content/60';
            dettagli.textContent = `${todo.tipo.charAt(0).toUpperCase() + todo.tipo.slice(1)} · ${elementi.length} ${elementi.length === 1 ? 'elemento' : 'elementi'}`;

            bottone.appendChild(titolo);
            bottone.appendChild(dettagli);
            bottone.appendChild(creaInfoAutori(todo, true));

            bottone.addEventListener('click', () => {
                finestra.chiudi();
                apriFinestraTodo({ todo, elementi });
            });

            elemento.appendChild(bottone);
            lista.appendChild(elemento);
        });

        finestra = creaFinestra('Quale to do vuoi modificare?', lista);
        finestra.elemento.addEventListener('close', () => finestra.elemento.remove());
        contenitore.appendChild(finestra.elemento);
        finestra.apri();
    }

    // Giorno già scritto nel campo "Giorno" quando si crea una nuova to do o una nuova nota dal "+": oggi, se il periodo che si sta guardando lo comprende, altrimenti il primo giorno di quel periodo.
    // Es. guardando la settimana prossima, il form parte dal suo lunedì invece che da oggi
    function giornoNelPeriodoMostrato() {
        const oggi = new Date();
        const { currentStart, currentEnd } = calendarioVisuale.view;
        return oggi >= currentStart && oggi < currentEnd ? oggi : new Date(currentStart);
    }

    // Apre la finestra della nota: nuova (con giorno e tipo della vista) oppure in modifica
    function apriFinestraNota({ nota = null } = {}) {
        let finestra = null;

        const form = creaFormNota({
            calendario,
            nota,
            giornoProposto: giornoNelPeriodoMostrato(),
            tipoProposto: TIPO_TODO_PER_VISTA[calendarioVisuale.view.type] || 'giornaliera',
            alSalvataggio: (messaggio) => {
                finestra.chiudi();
                mostraToast(messaggio, 'successo');
                pannelloNote.ricarica();
            },
        });

        finestra = creaFinestra(nota ? 'Modifica nota' : 'Nuova nota', form, { larga: true });
        finestra.elemento.addEventListener('close', () => finestra.elemento.remove());
        contenitore.appendChild(finestra.elemento);
        finestra.apri();
    }

    // Apre la finestra con le note mostrate nella fascia, per scegliere quale modificare
    function apriSceltaNota() {
        const visibili = pannelloNote.leggiVisibili();

        const lista = document.createElement('ul');
        lista.className = 'menu w-full p-0 max-h-96 overflow-y-auto flex-nowrap';

        let finestra = null;

        if (visibili.length === 0) {
            const vuoto = document.createElement('p');
            vuoto.className = 'text-base-content/60';
            vuoto.textContent = 'Nessuna nota in questo periodo';
            lista.appendChild(vuoto);
        }

        visibili.forEach((nota) => {
            const elemento = document.createElement('li');
            const bottone = document.createElement('button');
            bottone.type = 'button';
            bottone.className = 'flex flex-col items-start gap-0';

            // Le prime parole della nota, su una riga sola
            const testo = document.createElement('span');
            testo.className = 'line-clamp-1';
            testo.textContent = nota.testo;

            const dettagli = document.createElement('span');
            dettagli.className = 'text-xs text-base-content/60';
            dettagli.textContent = nota.tipo.charAt(0).toUpperCase() + nota.tipo.slice(1);

            bottone.appendChild(testo);
            bottone.appendChild(dettagli);
            bottone.appendChild(creaInfoAutori(nota, true));

            bottone.addEventListener('click', () => {
                finestra.chiudi();
                apriFinestraNota({ nota });
            });

            elemento.appendChild(bottone);
            lista.appendChild(elemento);
        });

        finestra = creaFinestra('Quale nota vuoi modificare?', lista);
        finestra.elemento.addEventListener('close', () => finestra.elemento.remove());
        contenitore.appendChild(finestra.elemento);
        finestra.apri();
    }

    // Apre la finestra del tag: nuovo oppure in modifica.
    // Dopo il salvataggio si ricaricano gli eventi, che mostrano nomi e colori dei tag
    function apriFinestraTag({ tag = null } = {}) {
        let finestra = null;

        const form = creaFormTag({
            calendario,
            tag,
            alSalvataggio: (messaggio) => {
                finestra.chiudi();
                mostraToast(messaggio, 'successo');
                calendarioVisuale.refetchEvents();
            },
        });

        finestra = creaFinestra(tag ? 'Modifica tag' : 'Nuovo tag', form, { larga: true });
        finestra.elemento.addEventListener('close', () => finestra.elemento.remove());
        contenitore.appendChild(finestra.elemento);
        finestra.apri();
    }

    // Apre la finestra con tutti i tag del calendario, per scegliere quale modificare
    async function apriSceltaTag() {
        let tags = [];

        try {
            tags = await chiamaApi(`/tags/lista/${calendario.id}`);
        } catch (errore) {
            mostraToast(errore.message);
            return;
        }

        const lista = document.createElement('ul');
        lista.className = 'menu w-full p-0 max-h-96 overflow-y-auto flex-nowrap';

        let finestra = null;

        if (tags.length === 0) {
            const vuoto = document.createElement('p');
            vuoto.className = 'text-base-content/60';
            vuoto.textContent = 'Nessun tag in questo calendario';
            lista.appendChild(vuoto);
        }

        tags.forEach((tag) => {
            const elemento = document.createElement('li');
            const bottone = document.createElement('button');
            bottone.type = 'button';
            bottone.className = 'flex items-center gap-3';

            // Pallino del colore del tag: cambia per ogni tag, quindi va nello stile
            const pallino = document.createElement('span');
            pallino.className = 'size-3 shrink-0 rounded-full';
            pallino.style.backgroundColor = tag.colore || calendario.colore;

            const testi = document.createElement('span');
            testi.className = 'flex flex-col items-start';

            const nome = document.createElement('span');
            nome.textContent = tag.nome;

            const dettagli = document.createElement('span');
            dettagli.className = 'text-xs text-base-content/60';
            dettagli.textContent = tag.numero_eventi === 1 ? '1 evento' : `${tag.numero_eventi} eventi`;

            testi.appendChild(nome);
            testi.appendChild(dettagli);
            testi.appendChild(creaInfoAutori(tag));
            bottone.appendChild(pallino);
            bottone.appendChild(testi);

            bottone.addEventListener('click', () => {
                finestra.chiudi();
                apriFinestraTag({ tag });
            });

            elemento.appendChild(bottone);
            lista.appendChild(elemento);
        });

        finestra = creaFinestra('Quale tag vuoi modificare?', lista);
        finestra.elemento.addEventListener('close', () => finestra.elemento.remove());
        contenitore.appendChild(finestra.elemento);
        finestra.apri();
    }

    // Cosa fare quando si sceglie una voce del menu "+"
    function sceltaMenu(nome) {
        if (nome === 'evento' && modalitaMenu === 'aggiungi') {
            apriFinestraEvento({ inizioProposto: inizioPropostoDaVista() });
        } else if (nome === 'evento') {
            apriSceltaEvento();
        } else if (nome === 'todo' && modalitaMenu === 'aggiungi') {
            apriFinestraTodo();
        } else if (nome === 'todo') {
            apriSceltaTodo();
        } else if (nome === 'nota' && modalitaMenu === 'aggiungi') {
            apriFinestraNota();
        } else if (nome === 'nota') {
            apriSceltaNota();
        } else if (nome === 'tag' && modalitaMenu === 'aggiungi') {
            apriFinestraTag();
        } else if (nome === 'tag') {
            apriSceltaTag();
        }
    }

    // Inizio proposto per un nuovo evento: adesso, se il periodo mostrato comprende oggi, altrimenti alle 9:00 del primo giorno mostrato
    function inizioPropostoDaVista() {
        const adesso = new Date();
        const { currentStart, currentEnd } = calendarioVisuale.view;

        if (adesso >= currentStart && adesso < currentEnd) {
            // Arrotonda all'ora successiva (es. 14:20 → 15:00)
            adesso.setHours(adesso.getHours() + 1, 0, 0, 0);
            return adesso;
        }

        const inizio = new Date(currentStart);
        inizio.setHours(9, 0, 0, 0);
        return inizio;
    }

    // Caricamento del calendario e avvio di FullCalendar
    async function caricaCalendario() {
        try {
            // Nome, colore e permessi arrivano dalla lista dei calendari dell'utente, la preferenza vista, se non c'è, è la mensile
            const [calendari, preferenza] = await Promise.all([
                chiamaApi('/calendari/lista'),
                chiamaApi(`/preferenze-vista/visualizza/${calendarioId}`).catch(() => ({ vista: 'mensile' })),
            ]);

            calendario = calendari.find((elemento) => elemento.id === calendarioId);

            if (!calendario) {
                mostraToast('Calendario non trovato');
                window.location.hash = '#/area-personale';
                return;
            }
            // Nei calendari personali le info autori mostrano solo le date
            impostaCalendarioPersonale(calendario.tipo === 'personale');

            const colore = calendario.colore || COLORE_PREDEFINITO;

            // Il colore scelto dall'utente cambia per ogni calendario
            striscia.style.backgroundColor = colore;
            pallino.style.backgroundColor = colore;
            // Lo stesso colore va anche a FullCalendar (oggi, linea dell'ora attuale)
            contenitore.style.setProperty('--colore-calendario', colore);
            testoNome.textContent = calendario.nome;

            // Il "+" si vede solo a chi può modificare il calendario
            zonaMenu.classList.toggle('hidden', !calendario.posso_modificare);

            // Colonna dei to-do accanto al calendario
            pannelloTodo = creaPannelloTodo(calendario, (todo, elementi) => apriFinestraTodo({ todo, elementi }));
            zonaCalendario.appendChild(pannelloTodo.elemento);

            // Pannello delle note sotto il calendario e la colonna dei to-do
            pannelloNote = creaPannelloNote(calendario, (nota) => apriFinestraNota({ nota }));
            corpo.appendChild(pannelloNote.elemento);

            // Riga in fondo, sotto le note: impostazioni del calendario a destra a sinistra i resoconti
            const rigaFondo = document.createElement('div');
            rigaFondo.className = 'flex items-center justify-between gap-2';

            const bottoneImpostazioni = document.createElement('a');
            bottoneImpostazioni.href = `#/impostazioni-calendario/${calendarioId}`;
            // Passando sopra diventa lilla, come i bottoni della navbar ("I miei calendari")
            bottoneImpostazioni.className = 'btn btn-ghost btn-sm hover:bg-primary/15 hover:text-primary';
            bottoneImpostazioni.appendChild(creaIcona(Settings, 16));
            bottoneImpostazioni.append('Impostazioni calendario');

            // Resoconti a sinistra, con lo stesso stile di "Impostazioni"
            const bottoneResoconti = document.createElement('a');
            bottoneResoconti.href = `#/resoconti/${calendarioId}`;
            bottoneResoconti.className = 'btn btn-ghost btn-sm hover:bg-primary/15 hover:text-primary';
            bottoneResoconti.appendChild(creaIcona(ChartColumn, 16));
            bottoneResoconti.append('Resoconti');

            rigaFondo.appendChild(bottoneResoconti);

            rigaFondo.appendChild(bottoneImpostazioni);
            corpo.appendChild(rigaFondo);

            const vistaIniziale = VISTE.find((vista) => vista.nome === preferenza.vista) || VISTE[2];

            caricamento.remove();

            calendarioVisuale = new Calendar(elementoCalendario, {
                plugins: [dayGridPlugin, timeGridPlugin, multiMonthPlugin, interactionPlugin],
                locale: itLocale,
                initialView: vistaIniziale.fullCalendar,
                // La barra con titolo e bottoni la faccio io , con lo stile dell'app
                headerToolbar: false,
                // Viste con le ore: altezza fissa con lo scroll dentro; mensile e annuale alte quanto serve
                // Questa è l'altezza all'apertura: quando si cambia vista la aggiorna datesSet
                height: vistaIniziale.fullCalendar.startsWith('timeGrid') ? ALTEZZA_VISTE_CON_ORE : 'auto',
                // Viste con le ore: la griglia parte già da ORA_DI_PARTENZA (si può comunque scorrere su e giù)
                scrollTime: ORA_DI_PARTENZA,
                nowIndicator: true,
                // Eventi nello stesso orario uno accanto all'altro, senza che uno copra l'altro
                slotEventOverlap: false,
                // Nomi e numeri dei giorni cliccabili: aprono quel giorno nella vista giornaliera
                navLinks: true,
                // Righe di mezz'ora più alte (32px), solo nelle viste con le ore:
                // FullCalendar fissa l'altezza nel suo CSS, per questo serve "!" (vince sul suo)
                slotLaneClassNames: ['h-8!'],
                // Eventi brevi (es. 15 minuti) alti almeno una riga: orario e titolo si leggono
                eventMinHeight: 22,
                // Sotto 32px FullCalendar mette orario e titolo sulla stessa riga: con righe di mezz'ora
                // da 32px (h-8) vuol dire sotto i 30 minuti, come DURATA_EVENTO_CORTO
                eventShortHeight: 32,
                // Cliccando un giorno si apre la mia vista giornaliera (con le ore), non quella predefinita di FullCalendar
                navLinkDayClick: 'timeGridDay',
                // Scritta "Tutto il giorno" su due righe e centrata: così la colonna degli orari resta stretta e i giorni hanno più spazio
                // allDayContent: la scritta "Tutto il giorno" la disegno io al posto di FullCalendar
                allDayContent: () => {
                    const scritta = document.createElement('span');
                    scritta.className = 'block text-center leading-tight';

                    ['Tutto', 'il giorno'].forEach((parola) => {
                        const riga = document.createElement('span');
                        riga.className = 'block';
                        riga.textContent = parola;
                        scritta.appendChild(riga);
                    });

                    return { domNodes: [scritta] };
                },
                // Nella vista mensile al massimo 3 eventi per giorno, gli altri in "+ altri"
                dayMaxEvents: 3,
                // Un evento che finisce prima delle 9 del mattino dopo (es. turno di notte 22:00–06:00)
                // conta solo per il giorno in cui inizia: nelle viste mensile e annuale è un evento solo, non due
                nextDayThreshold: '09:00:00',
                // Orari scritti come 08:00, 09:00...
                slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
                // Orari degli eventi scritti come 10:00 (e non 10)
                eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
                // Opzioni per le singole viste
                views: {
                    // Giornaliera e settimanale: solo l'ora di inizio, come nella mensile
                    // (la fine si vede da dove finisce il blocco nella griglia, e negli eventi stretti non si taglia più)
                    timeGrid: {
                        displayEventEnd: false,
                    },
                    // Annuale: niente orario, al massimo 6 pallini per giorno (stanno su una riga),
                    // gli altri in un "+2" corto, che occupa più o meno lo spazio di un pallino
                    multiMonthYear: {
                        displayEventTime: false,
                        dayMaxEvents: 6,
                        moreLinkContent: (altri) => `+${altri.num}`,
                    },
                },
                // Più spazio tra il bordo dell'evento e i testi. Nelle viste con le ore l'evento diventa anche un "contenitore",
                // così quello che c'è dentro sa quanto è largo. Lo metto qui perché FullCalendar lo tiene anche quando ridisegna l'evento
                eventClassNames: (info) => info.view.type.startsWith('timeGrid')
                    ? ['px-1.5', 'py-[3px]', '@container']
                    : ['px-1.5', 'py-[3px]'],
                // Nelle viste con le ore (giornaliera e settimanale): tag dell'evento sulla riga dell'orario e, negli eventi bassi e stretti, orario nascosto per lasciare posto al titolo
                // Negli eventi lunghi (tutte le viste): ora di fine in fondo alla barra
                eventDidMount: (info) => {
                    // Evento lungo: ora di inizio prima del titolo e ora di fine in fondo alla barra, in tutte le viste.
                    // L'inizio solo nel primo pezzo e la fine solo nell'ultimo: se la barra continua nella settimana dopo, l'evento comincia e finisce lì
                    const { oraInizio, oraFine } = info.event.extendedProps;
                    const rigaBarra = info.el.querySelector('.fc-event-main-frame');

                    if (oraInizio && info.isStart && rigaBarra) {
                        const testoInizio = document.createElement('span');
                        testoInizio.className = 'shrink-0 pr-1';
                        testoInizio.textContent = oraInizio;
                        rigaBarra.prepend(testoInizio);
                    }

                    if (oraFine && info.isEnd && rigaBarra) {
                        const testoFine = document.createElement('span');
                        testoFine.className = 'ml-auto shrink-0 pl-2';
                        testoFine.textContent = oraFine;
                        rigaBarra.appendChild(testoFine);
                    }
                    if (!info.view.type.startsWith('timeGrid')) return;

                    const tags = info.event.extendedProps.evento.tags || [];
                    // Evento corto (sotto i 30 minuti): FullCalendar mette orario e titolo sulla stessa riga.
                    // Si guarda la durata perché quando parte eventDidMount FullCalendar non sa ancora l'altezza
                    const corto = info.event.end !== null && info.event.end - info.event.start < DURATA_EVENTO_CORTO;
                    if (!corto && tags.length === 0) return;

                    // L'evento diventa un "contenitore": quello che c'è dentro sa quanto è largo
                    // (i badge diventano pallini e, negli eventi bassi, l'orario si nasconde)
                    info.el.classList.add('@container');

                    // Evento basso e stretto: senza orario resta lo spazio per il titolo
                    // (l'orario si capisce dalla posizione nella griglia)
                    const orario = info.el.querySelector('.fc-event-time');
                    if (corto && orario) orario.classList.add('@max-[96px]:hidden');

                    if (tags.length === 0) return;

                    const fila = document.createElement('div');
                    // min-w-0: la fila può restringersi, così i badge si accorciano invece di uscire dall'evento.
                    // Negli eventi bassi la fila va in fondo alla riga, staccata dal titolo
                    fila.className = corto
                        ? 'ml-auto flex min-w-0 items-center gap-1 pl-1'
                        : 'flex min-w-0 items-center gap-1';

                    tags.forEach((tag) => {
                        // Il colore cambia per ogni tag, quindi va nello stile (senza colore: quello del calendario)
                        const colore = tag.colore || calendario.colore;

                        // Badge con il nome: si vede quando l'evento è abbastanza largo
                        const badge = document.createElement('span');
                        badge.className = 'min-w-0 truncate rounded-full px-1 text-[10px] font-semibold leading-4 text-white @max-[96px]:hidden';
                        badge.style.backgroundColor = colore;
                        badge.textContent = tag.nome;

                        // Pallino: prende il posto del badge quando l'evento è più stretto di 96px
                        const pallino = document.createElement('span');
                        pallino.className = 'hidden size-2.5 shrink-0 rounded-full @max-[96px]:block';
                        pallino.style.backgroundColor = colore;

                        fila.appendChild(badge);
                        fila.appendChild(pallino);
                    });

                    // Evento basso: i tag vanno in fondo alla riga, dopo il titolo
                    // (dentro la riga dell'orario finirebbero prima del " - " che FullCalendar aggiunge)
                    if (corto) {
                        const rigaUnica = info.el.querySelector('.fc-event-main-frame');
                        const titolo = info.el.querySelector('.fc-event-title-container');
                        if (!rigaUnica) return;
                        // min-w-0: il titolo si accorcia invece di spingere i tag fuori dall'evento
                        if (titolo) titolo.classList.add('min-w-0');
                        rigaUnica.appendChild(fila);
                        return;
                    }

                    // I tag vanno sulla riga dell'orario, a destra, così non coprono il titolo
                    // gli eventi di tutto il giorno non hanno l'orario: lì vanno accanto al titolo
                    const riga = orario || info.el.querySelector('.fc-event-title-container');
                    if (!riga) return;
                    riga.classList.add('flex', 'items-center', 'justify-between', 'gap-0.5');
                    riga.appendChild(fila);
                },

                // Eventi del periodo mostrato: FullCalendar li chiede ogni volta che si cambia periodo
                events: async (periodo, successo, fallimento) => {
                    try {
                        const da = encodeURIComponent(periodo.start.toISOString());
                        const a = encodeURIComponent(periodo.end.toISOString());
                        const eventi = await chiamaApi(`/eventi/lista/${calendarioId}?da=${da}&a=${a}`);
                        successo(eventi.map((evento) => eventoPerFullCalendar(evento, colore)));
                    } catch (errore) {
                        mostraToast(errore.message);
                        fallimento(errore);
                    }
                },

                // Ogni volta che cambia periodo o vista: aggiorna il titolo e la scheda attiva
                datesSet: (periodo) => {
                    const titolo = periodo.view.title;
                    titoloPeriodo.textContent = titolo.charAt(0).toUpperCase() + titolo.slice(1);

                    schedeVista.querySelectorAll('.tab').forEach((scheda) => {
                        scheda.classList.toggle('tab-active', scheda.dataset.vista === periodo.view.type);
                    });
                    // Altezza della vista: fissa con lo scroll in giornaliera e settimanale, alta quanto serve nelle altre.
                    // Si cambia solo se è diversa, perché cambiarla ridisegna il calendario
                    const altezza = periodo.view.type.startsWith('timeGrid') ? ALTEZZA_VISTE_CON_ORE : 'auto';
                    if (calendarioVisuale && calendarioVisuale.getOption('height') !== altezza) {
                        calendarioVisuale.setOption('height', altezza);
                        // Arrivando da mensile o annuale lo scroll nasce solo adesso: lo porto a ORA_DI_PARTENZA
                        // Si aspettano due "giri" del browser (requestAnimationFrame), perché FullCalendar
                        // ridisegna il calendario con la nuova altezza un attimo dopo, e prima lo scroll non c'è ancora
                        if (altezza !== 'auto') {
                            requestAnimationFrame(() => requestAnimationFrame(() => calendarioVisuale.scrollToTime(ORA_DI_PARTENZA)));
                        }
                    }
                    // La colonna mostra i to-do del periodo vero (es. solo ottobre),
                    // senza i giorni del mese prima e dopo che la vista mensile mostra
                    // Nella vista annuale la colonna non c'è: i to-do sono solo giornalieri, settimanali o mensili.
                    // Senza colonna, il calendario prende tutta la larghezza
                    const vistaAnnuale = periodo.view.type === 'multiMonthYear';
                    pannelloTodo.elemento.classList.toggle('hidden', vistaAnnuale);

                    pannelloNote.elemento.classList.toggle('hidden', vistaAnnuale);
                    zonaCalendario.classList.toggle('lg:grid-cols-[1fr_288px]', !vistaAnnuale);

                    // Negli altri casi la colonna mostra i to-do del periodo vero (es. solo ottobre),
                    // senza i giorni del mese prima e dopo che la vista mensile mostra
                    if (!vistaAnnuale) pannelloTodo.mostraPeriodo(periodo.view.currentStart, periodo.view.currentEnd, TIPO_TODO_PER_VISTA[periodo.view.type]);
                    if (!vistaAnnuale) pannelloNote.mostraPeriodo(periodo.view.currentStart, periodo.view.currentEnd, TIPO_TODO_PER_VISTA[periodo.view.type]);
                },

                // Clic su un giorno o un orario vuoto: nuovo evento che parte da lì
                dateClick: (clic) => {
                    // Nella vista annuale il clic su un giorno apre quel giorno nella vista giornaliera
                    if (clic.view.type === 'multiMonthYear') {
                        calendarioVisuale.changeView('timeGridDay', clic.date);
                        return;
                    }
                    if (!calendario.posso_modificare) return;

                    const inizioProposto = new Date(clic.date);
                    // Nella vista mensile e annuale il clic è su un giorno intero, senza ora: il nuovo evento parte alle 9:00
                    if (clic.allDay) inizioProposto.setHours(9, 0, 0, 0);

                    apriFinestraEvento({ inizioProposto });
                },

                // Clic su un evento: si apre la finestra con i dettagli, che vedono tutti i membri.
                // Chi può modificare il calendario ha anche il bottone "Modifica", che apre il form
                eventClick: (clic) => {
                    const evento = clic.event.extendedProps.evento;

                    apriDettagliEvento({
                        evento,
                        coloreEvento: clic.event.borderColor,
                        coloreCalendario: colore,
                        possoModificare: calendario.posso_modificare,
                        alModifica: () => apriFinestraEvento({ evento }),
                    });
                },
            });

            calendarioVisuale.render();
        } catch (errore) {
            caricamento.remove();
            mostraToast(errore.message);
        }
    }

    caricaCalendario();

    return contenitore;
}