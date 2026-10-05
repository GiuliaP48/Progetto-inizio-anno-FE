
import { chiamaApi } from '../api.js';

import { chiediConferma } from './conferma.js';

import { aggiungiCalendariettoAlCampo } from './calendarietto.js';

import {
    aggiungiCampo,
    aggiungiSelezione,
    aggiungiAreaTesto,
    creaTestoErrore,
    mostraErrore,
    creaBottoneInvio,
    impostaCaricamento,
} from './form.js';

import { creaInfoAutori } from './info-autori.js';

import { dataAAAAMMGG, giornoTuttoIlGiorno } from '../utility/date.js';

// Lunghezza massima del testo, la stessa controllata dal backend
const LUNGHEZZA_MASSIMA_TESTO = 1000;

// Tipi di nota: il valore va al backend, il testo si vede nel form
const TIPI = [
    { valore: 'giornaliera', testo: 'Giornaliera' },
    { valore: 'settimanale', testo: 'Settimanale' },
    { valore: 'mensile', testo: 'Mensile' },
];

// Spiegazione sotto la data, che cambia con il tipo scelto
const SPIEGAZIONI_TIPO = {
    giornaliera: 'La nota vale solo per questo giorno',
    settimanale: 'La nota vale per tutta la settimana di questo giorno, da lunedì a domenica',
    mensile: 'La nota vale per tutto il mese di questo giorno',
};

// Form per creare o modificare una nota
// - calendario: il calendario in cui si trova la nota
// - nota: la nota da modificare, come arriva dal backend (assente = nuova nota)
// - giornoProposto e tipoProposto: da dove parte una nuova nota (es. la settimana mostrata)
// - alSalvataggio: chiamata con il messaggio da mostrare dopo creazione, modifica o eliminazione
export function creaFormNota({
    calendario,
    nota = null,
    giornoProposto = new Date(),
    tipoProposto = 'giornaliera',
    alSalvataggio,
}) {
    const inModifica = nota !== null;

    const form = document.createElement('form');
    form.className = 'flex flex-col gap-3';
    // Gli errori li mostrio io con la scritta rossa, non il fumetto del browser
    form.noValidate = true;
    if (inModifica) form.appendChild(creaInfoAutori(nota, true));

    // Testo della nota
    const areaTesto = aggiungiAreaTesto(form, 'nota-testo', 'Testo');
    areaTesto.rows = 6;
    areaTesto.maxLength = LUNGHEZZA_MASSIMA_TESTO;
    areaTesto.placeholder = 'Scrivi la nota...';
    // All'apertura della finestra il cursore parte da qui, così si può scrivere subito
    areaTesto.autofocus = true;

    // Tipo e giorno
    const selectTipo = aggiungiSelezione(form, 'nota-tipo', 'Tipo', TIPI);
    const inputGiorno = aggiungiCampo(form, 'nota-giorno', 'Giorno', 'date');
    // Il calendarietto Cally al posto di quello del browser
    aggiungiCalendariettoAlCampo(inputGiorno);

    const spiegazioneTipo = document.createElement('p');
    spiegazioneTipo.className = 'text-sm text-base-content/70';
    form.appendChild(spiegazioneTipo);

    function aggiornaSpiegazione() {
        spiegazioneTipo.textContent = SPIEGAZIONI_TIPO[selectTipo.value];
    }

    selectTipo.addEventListener('change', aggiornaSpiegazione);

    // Errori e bottoni
    const errore = creaTestoErrore();
    form.appendChild(errore);

    const bottoneSalva = creaBottoneInvio(inModifica ? 'Salva modifiche' : 'Crea nota');
    form.appendChild(bottoneSalva);

    let bottoneElimina = null;
    if (inModifica) {
        bottoneElimina = document.createElement('button');
        bottoneElimina.type = 'button';
        bottoneElimina.className = 'btn btn-outline btn-error';
        bottoneElimina.textContent = 'Elimina nota';
        form.appendChild(bottoneElimina);

    }

    // Valori di partenza
    if (inModifica) {
        areaTesto.value = nota.testo;
        selectTipo.value = nota.tipo;
        // La data arriva come mezzanotte UTC: si prende solo il giorno
        inputGiorno.value = giornoTuttoIlGiorno(nota.data);
    } else {
        selectTipo.value = tipoProposto;
        inputGiorno.value = dataAAAAMMGG(giornoProposto);
    }

    aggiornaSpiegazione();

    // Invio del form al backend
    form.addEventListener('submit', async (eventoInvio) => {
        eventoInvio.preventDefault();

        const dati = {
            testo: areaTesto.value.trim(),
            data: inputGiorno.value,
            tipo: selectTipo.value,
        };

        if (!dati.testo) {
            mostraErrore(errore, 'Il testo è obbligatorio');
            return;
        }

        if (!dati.data) {
            mostraErrore(errore, 'Il giorno è obbligatorio');
            return;
        }

        impostaCaricamento(bottoneSalva, true);

        try {
            if (inModifica) {
                await chiamaApi(`/note/modifica/${nota.id}`, { metodo: 'PUT', corpo: dati });
                alSalvataggio('Nota modificata!');
            } else {
                await chiamaApi(`/note/crea/${calendario.id}`, { metodo: 'POST', corpo: dati });
                alSalvataggio('Nota creata!');
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
                'Eliminare la nota?',
                'La nota verrà eliminata definitivamente. Vuoi continuare?',
                [{ testo: 'Elimina', valore: 'elimina', pericolosa: true }],
            );

            if (!scelta) return;

            impostaCaricamento(bottoneElimina, true);

            try {
                await chiamaApi(`/note/elimina/${nota.id}`, { metodo: 'DELETE' });
                alSalvataggio('Nota eliminata');
            } catch (erroreBackend) {
                mostraErrore(errore, erroreBackend.message);
            } finally {
                impostaCaricamento(bottoneElimina, false);
            }
        });
    }

    return form;
}