
import { X, Plus } from 'lucide';

import { chiamaApi } from '../api.js';

import { chiediConferma } from './conferma.js';

import { creaIcona } from './icona.js';

import { aggiungiCalendariettoAlCampo } from './calendarietto.js';

import { BADGE_PRIORITA, PUNTINI_PRIORITA } from './pannello-todo.js';
import {
    aggiungiCampo,
    aggiungiSelezione,
    creaTestoErrore,
    mostraErrore,
    creaBottoneInvio,
    impostaCaricamento,
} from './form.js';

import { creaInfoAutori } from './info-autori.js';
import { dataAAAAMMGG, giornoTuttoIlGiorno } from '../utility/date.js';

// Lunghezze massime, le stesse controllate dal backend
const LUNGHEZZA_MASSIMA_TITOLO = 100;
const LUNGHEZZA_MASSIMA_ELEMENTO = 200;

// Tipi di lista: il valore va al backend, il testo si vede nel form
const TIPI = [
    { valore: 'giornaliera', testo: 'Giornaliera' },
    { valore: 'settimanale', testo: 'Settimanale' },
    { valore: 'mensile', testo: 'Mensile' },
];

// Spiegazione sotto la data, che cambia con il tipo scelto
const SPIEGAZIONI_TIPO = {
    giornaliera: 'La lista vale solo per questo giorno',
    settimanale: 'La lista vale per tutta la settimana di questo giorno, da lunedì a domenica',
    mensile: 'La lista vale per tutto il mese di questo giorno',
};

// Priorità: '' = nessuna (è facoltativa sia per la lista sia per gli elementi)
const PRIORITA = [
    { valore: '', testo: 'Nessuna' },
    { valore: 'bassa', testo: 'Bassa' },
    { valore: 'media', testo: 'Media' },
    { valore: 'alta', testo: 'Alta' },
];

// Crea un menu a tendina piccolo, senza etichetta sopra (per le righe degli elementi)
function creaSelezionePiccola(etichetta, opzioni) {
    const select = document.createElement('select');
    select.className = 'select select-sm w-28';
    select.setAttribute('aria-label', etichetta);

    opzioni.forEach((opzione) => {
        const elemento = document.createElement('option');
        elemento.value = opzione.valore;
        elemento.textContent = opzione.testo;
        select.appendChild(elemento);
    });

    return select;
}

// Form per creare o modificare una lista to-do con i suoi elementi
// - calendario: il calendario in cui si trova la lista
// - todo: la lista da modificare, come arriva dal backend (assente = nuova lista)
// - elementi: gli elementi della lista da modificare
// - giornoProposto e tipoProposto: da dove parte una nuova lista (es. la settimana mostrata)
// - alSalvataggio: chiamata con il messaggio da mostrare dopo creazione, modifica o eliminazione
export function creaFormTodo({
    calendario,
    todo = null,
    elementi = [],
    giornoProposto = new Date(),
    tipoProposto = 'giornaliera',
    alSalvataggio,
}) {
    const inModifica = todo !== null;
    // Il backend non permette di cambiare tipo e data di una lista già rimandata
    const rimandata = inModifica && todo.volte_rimandato > 0;

    const form = document.createElement('form');
    form.className = 'flex flex-col gap-3';
    // Gli errori li mostro io con la scritta rossa, non il fumetto del browser
    form.noValidate = true;
    if (inModifica) form.appendChild(creaInfoAutori(todo, true));

    // Titolo: facoltativo, senza titolo il backend mette "To-do"
    const inputTitolo = aggiungiCampo(form, 'todo-titolo', 'Titolo (facoltativo)', 'text');
    inputTitolo.required = false;
    inputTitolo.maxLength = LUNGHEZZA_MASSIMA_TITOLO;
    inputTitolo.placeholder = 'To-do';
    // All'apertura della finestra il cursore parte da qui, così si può scrivere subito
    inputTitolo.autofocus = true;

    // Tipo e giorno
    const selectTipo = aggiungiSelezione(form, 'todo-tipo', 'Tipo', TIPI);
    const inputGiorno = aggiungiCampo(form, 'todo-giorno', 'Giorno', 'date');
    // Il calendarietto Cally al posto di quello del browser
    aggiungiCalendariettoAlCampo(inputGiorno);

    const spiegazioneTipo = document.createElement('p');
    spiegazioneTipo.className = 'text-sm text-base-content/70';
    form.appendChild(spiegazioneTipo);

    function aggiornaSpiegazione() {
        spiegazioneTipo.textContent = rimandata
            ? 'Questa lista è già stata rimandata: tipo e giorno non si possono più cambiare'
            : SPIEGAZIONI_TIPO[selectTipo.value];
    }

    selectTipo.addEventListener('change', aggiornaSpiegazione);

    // Priorità della lista
    const selectPriorita = aggiungiSelezione(form, 'todo-priorita', 'Priorità', PRIORITA);

    // Badge accanto all'etichetta "Priorità": mostra il colore che avrà la lista nella colonna
    const etichettaPriorita = form.querySelector('label[for="todo-priorita"]');
    const contenitoreBadge = document.createElement('span');
    contenitoreBadge.className = 'ml-2 inline-flex align-middle';
    etichettaPriorita.appendChild(contenitoreBadge);

    // Rifà il badge con la priorità scelta (con "Nessuna" non c'è)
    function aggiornaBadge() {
        contenitoreBadge.innerHTML = '';
        const priorita = BADGE_PRIORITA[selectPriorita.value];
        if (!priorita) return;

        const badge = document.createElement('span');
        badge.className = priorita.classi;
        badge.textContent = priorita.testo;
        contenitoreBadge.appendChild(badge);
    }

    selectPriorita.addEventListener('change', aggiornaBadge);

    // Elementi: una riga per elemento, con testo, priorità e bottone per toglierlo
    // Intestazione degli elementi, come le colonne di una tabella: "Elementi" a sinistra e "Priorità" sopra la colonna dei menu
    // Lo spazio vuoto a destra prende il posto del bottone ✕
    const intestazioneElementi = document.createElement('div');
    intestazioneElementi.className = 'flex items-center gap-2';

    const etichettaElementi = document.createElement('p');
    etichettaElementi.className = 'flex-1';
    etichettaElementi.textContent = 'Elementi';

    const testoPriorita = document.createElement('p');
    testoPriorita.className = 'w-28 pl-3';
    testoPriorita.textContent = 'Priorità';

    const spazioBottone = document.createElement('span');
    spazioBottone.className = 'w-8 shrink-0';

    intestazioneElementi.appendChild(etichettaElementi);
    intestazioneElementi.appendChild(testoPriorita);
    intestazioneElementi.appendChild(spazioBottone);
    form.appendChild(intestazioneElementi);

    // Senza elementi "Priorità" non serve: si nasconde e resta solo "Elementi"
    function aggiornaIntestazione() {
        testoPriorita.classList.toggle('hidden', righe.length === 0);
    }

    const elencoElementi = document.createElement('div');
    // empty:hidden: senza elementi il contenitore sparisce e non lascia spazio vuoto
    elencoElementi.className = 'flex flex-col gap-2 empty:hidden';
    form.appendChild(elencoElementi);

    // Righe mostrate nel form: ognuna ricorda l'elemento di partenza (null = elemento nuovo)
    const righe = [];
    // Elementi già salvati che sono stati tolti dal form: si eliminano al salvataggio
    const elementiDaEliminare = [];

    // Aggiunge una riga al form e restituisce il campo del testo, per poterci mettere il cursore
    function aggiungiRigaElemento(elemento = null) {
        const riga = document.createElement('div');
        riga.className = 'flex items-center gap-2';

        const inputTesto = document.createElement('input');
        inputTesto.type = 'text';
        inputTesto.className = 'input input-sm flex-1';
        inputTesto.maxLength = LUNGHEZZA_MASSIMA_ELEMENTO;
        inputTesto.placeholder = 'Cosa c\'è da fare?';
        inputTesto.setAttribute('aria-label', 'Testo dell\'elemento');

        const selectPrioritaElemento = creaSelezionePiccola('Priorità dell\'elemento', PRIORITA);

        // Puntino del colore della priorità, come nella colonna
        // Senza priorità resta solo lo spazio, così i campi delle righe restano allineati
        const puntino = document.createElement('span');

        function aggiornaPuntino() {
            puntino.className = PUNTINI_PRIORITA[selectPrioritaElemento.value] || 'size-2 shrink-0';
        }

        selectPrioritaElemento.addEventListener('change', aggiornaPuntino);

        const bottoneRimuovi = document.createElement('button');
        bottoneRimuovi.type = 'button';
        bottoneRimuovi.className = 'btn btn-ghost btn-sm btn-square';
        bottoneRimuovi.setAttribute('aria-label', 'Togli elemento');
        bottoneRimuovi.appendChild(creaIcona(X, 16));

        const datiRiga = { elemento, inputTesto, selectPrioritaElemento };

        if (elemento) {
            inputTesto.value = elemento.testo;
            selectPrioritaElemento.value = elemento.priorita || '';
        }

        aggiornaPuntino();

        // Invio in un elemento non salva il form: aggiunge una riga nuova sotto
        inputTesto.addEventListener('keydown', (tasto) => {
            if (tasto.key !== 'Enter') return;
            tasto.preventDefault();
            aggiungiRigaElemento().focus();
        });

        bottoneRimuovi.addEventListener('click', () => {
            contenitoreRiga.remove();
            righe.splice(righe.indexOf(datiRiga), 1);
            aggiornaIntestazione();
            if (elemento) elementiDaEliminare.push(elemento);
        });

        riga.appendChild(puntino);
        riga.appendChild(inputTesto);
        riga.appendChild(selectPrioritaElemento);
        riga.appendChild(bottoneRimuovi);
        // Riga
        const contenitoreRiga = document.createElement('div');
        contenitoreRiga.className = 'flex flex-col gap-1';
        contenitoreRiga.appendChild(riga);

        elencoElementi.appendChild(contenitoreRiga);
        righe.push(datiRiga);
        aggiornaIntestazione();

        return inputTesto;
    }

    const bottoneAggiungiElemento = document.createElement('button');
    bottoneAggiungiElemento.type = 'button';
    bottoneAggiungiElemento.className = 'btn btn-ghost btn-sm self-start';
    bottoneAggiungiElemento.appendChild(creaIcona(Plus, 16));
    bottoneAggiungiElemento.append('Aggiungi elemento');
    bottoneAggiungiElemento.addEventListener('click', () => aggiungiRigaElemento().focus());
    form.appendChild(bottoneAggiungiElemento);

    // Errori e bottoni
    const errore = creaTestoErrore();
    form.appendChild(errore);

    const bottoneSalva = creaBottoneInvio(inModifica ? 'Salva modifiche' : 'Crea to do');
    form.appendChild(bottoneSalva);

    let bottoneElimina = null;
    if (inModifica) {
        bottoneElimina = document.createElement('button');
        bottoneElimina.type = 'button';
        bottoneElimina.className = 'btn btn-outline btn-error';
        bottoneElimina.textContent = 'Elimina to do';
        form.appendChild(bottoneElimina);

    }

    // Valori di partenza
    if (inModifica) {
        inputTitolo.value = todo.titolo;
        selectTipo.value = todo.tipo;
        // La data arriva come mezzanotte UTC: si prende solo il giorno
        inputGiorno.value = giornoTuttoIlGiorno(todo.data_originale);
        selectPriorita.value = todo.priorita || '';

        [...elementi]
            .sort((a, b) => a.posizione - b.posizione)
            .forEach((elemento) => aggiungiRigaElemento(elemento));

        selectTipo.disabled = rimandata;
        inputGiorno.disabled = rimandata;
    } else {
        selectTipo.value = tipoProposto;
        inputGiorno.value = dataAAAAMMGG(giornoProposto);
        // Una nuova lista parte con una riga vuota, pronta da scrivere
        aggiungiRigaElemento();
    }

    aggiornaSpiegazione();
    aggiornaBadge();

    // Dati di un elemento per la creazione: la priorità si manda solo se c'è
    function datiNuovoElemento(riga) {
        const dati = { testo: riga.inputTesto.value.trim() };
        if (riga.selectPrioritaElemento.value) dati.priorita = riga.selectPrioritaElemento.value;
        return dati;
    }

    // Controlli prima di inviare: restituisce il messaggio di errore, oppure null se va tutto bene
    function controllaDati() {
        if (!inputGiorno.value) {
            return 'Il giorno è obbligatorio';
        }

        // Un elemento già salvato non si può svuotare: o si scrive o si toglie
        if (righe.some((riga) => riga.elemento && riga.inputTesto.value.trim() === '')) {
            return 'Il testo di un elemento non può essere vuoto: scrivilo o toglilo';
        }

        return null;
    }

    // Invio del form al backend
    form.addEventListener('submit', async (eventoInvio) => {
        eventoInvio.preventDefault();

        const problema = controllaDati();

        if (problema) {
            mostraErrore(errore, problema);
            return;
        }

        // Le righe nuove lasciate vuote si ignorano
        const righeDaSalvare = righe.filter((riga) => riga.inputTesto.value.trim() !== '');

        impostaCaricamento(bottoneSalva, true);

        try {
            if (!inModifica) {
                const datiTodo = {
                    titolo: inputTitolo.value.trim(),
                    data_originale: inputGiorno.value,
                    tipo: selectTipo.value,
                };
                if (selectPriorita.value) datiTodo.priorita = selectPriorita.value;

                const nuovoTodo = await chiamaApi(`/todos/crea/${calendario.id}`, { metodo: 'POST', corpo: datiTodo });

                // Gli elementi si creano uno alla volta, così restano nell'ordine in cui sono scritti
                for (const riga of righeDaSalvare) {
                    await chiamaApi(`/elementi-to-do/crea/${nuovoTodo.id}`, { metodo: 'POST', corpo: datiNuovoElemento(riga) });
                }

                alSalvataggio('To do creata!');
            } else {
                // In modifica null toglie la priorità; tipo e giorno solo se la lista non è stata rimandata
                const datiTodo = {
                    titolo: inputTitolo.value.trim(),
                    priorita: selectPriorita.value || null,
                };
                if (!rimandata) {
                    datiTodo.data_originale = inputGiorno.value;
                    datiTodo.tipo = selectTipo.value;
                }

                await chiamaApi(`/todos/modifica/${todo.id}`, { metodo: 'PUT', corpo: datiTodo });

                for (const elemento of elementiDaEliminare) {
                    await chiamaApi(`/elementi-to-do/elimina/${elemento.id}`, { metodo: 'DELETE' });
                }

                for (const riga of righeDaSalvare) {
                    if (!riga.elemento) {
                        await chiamaApi(`/elementi-to-do/crea/${todo.id}`, { metodo: 'POST', corpo: datiNuovoElemento(riga) });
                        continue;
                    }

                    // Elementi già salvati: si mandano solo se sono cambiati
                    const testo = riga.inputTesto.value.trim();
                    const priorita = riga.selectPrioritaElemento.value || null;
                    if (testo !== riga.elemento.testo || priorita !== (riga.elemento.priorita || null)) {
                        await chiamaApi(`/elementi-to-do/modifica/${riga.elemento.id}`, {
                            metodo: 'PUT',
                            corpo: { testo, priorita },
                        });
                    }
                }

                alSalvataggio('To do modificata!');
            }
        } catch (erroreBackend) {
            // Il messaggio arriva dal backend (es. data non valida)
            mostraErrore(errore, erroreBackend.message);
        } finally {
            impostaCaricamento(bottoneSalva, false);
        }
    });

    // Eliminazione, con conferma
    if (bottoneElimina) {
        bottoneElimina.addEventListener('click', async () => {
            const scelta = await chiediConferma(
                'Eliminare la to do?',
                `"${todo.titolo}" e tutti i suoi elementi verranno eliminati definitivamente. Vuoi continuare?`,
                [{ testo: 'Elimina', valore: 'elimina', pericolosa: true }],
            );

            if (!scelta) return;

            impostaCaricamento(bottoneElimina, true);

            try {
                await chiamaApi(`/todos/elimina/${todo.id}`, { metodo: 'DELETE' });
                alSalvataggio('To do eliminata');
            } catch (erroreBackend) {
                mostraErrore(errore, erroreBackend.message);
            } finally {
                impostaCaricamento(bottoneElimina, false);
            }
        });
    }

    return form;
}