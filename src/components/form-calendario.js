
import { chiamaApi } from '../api.js';

import { creaTavolozzaColori } from './tavolozza-colori.js';

import {
    aggiungiCampo,
    aggiungiSelezione,
    creaTestoErrore,
    mostraErrore,
    creaBottoneInvio,
    impostaCaricamento,
} from './form.js';

// Lunghezza massima del nome, la stessa controllata dal backend
const LUNGHEZZA_MASSIMA_NOME = 50;

// Form per creare un calendario: nome, tipo, colore e, solo per i condivisi chi può modificare
// Quando il calendario è stato creato chiama "alCreazione" con i dati arrivati dal backend
export function creaFormCalendario(alCreazione) {
    const form = document.createElement('form');
    form.className = 'flex flex-col gap-3';
    // Gli errori li mostro io con la scritta rossa, non il fumetto del browser
    form.noValidate = true;

    const inputNome = aggiungiCampo(form, 'calendario-nome', 'Nome', 'text');
    inputNome.maxLength = LUNGHEZZA_MASSIMA_NOME;

    // All'apertura della finestra il cursore parte da qui, così si può scrivere subito
    inputNome.autofocus = true;

    const selectTipo = aggiungiSelezione(form, 'calendario-tipo', 'Tipo', [
        { valore: 'personale', testo: 'Personale (solo per te)' },
        { valore: 'condiviso', testo: 'Condiviso (puoi invitare altre persone)' },
    ]);

    // Colore: la tavolozza non è un campo singolo, quindi ha un'etichetta semplice
    const etichettaColore = document.createElement('p');
    etichettaColore.textContent = 'Colore';
    const tavolozza = creaTavolozzaColori();
    form.appendChild(etichettaColore);
    form.appendChild(tavolozza.elemento);

    // Permesso di modifica: vale solo per i calendari condivisi, quindi parte nascosto
    const sezionePermesso = document.createElement('div');
    sezionePermesso.className = 'flex flex-col gap-3 hidden';

    const selectPermesso = aggiungiSelezione(sezionePermesso, 'calendario-permesso', 'Chi può modificare', [
        { valore: 'solo_amministratore', testo: 'Solo io' },
        { valore: 'tutti', testo: 'Tutti i membri' },
        { valore: 'personalizzato', testo: 'Decido io per ogni membro' },
    ]);
    form.appendChild(sezionePermesso);

    const errore = creaTestoErrore();
    form.appendChild(errore);

    const bottoneCrea = creaBottoneInvio('Crea calendario');
    form.appendChild(bottoneCrea);

    // Mostra il permesso solo se il calendario è condiviso
    selectTipo.addEventListener('change', () => {
        sezionePermesso.classList.toggle('hidden', selectTipo.value !== 'condiviso');
    });

    // Invio del form al backend
    form.addEventListener('submit', async (evento) => {
        evento.preventDefault();

        // Un nome fatto solo di spazi per il browser non è vuoto: lo controllo io 
        if (inputNome.value.trim() === '') {
            mostraErrore(errore, 'Il nome è obbligatorio');
            return;
        }

        const corpo = {
            nome: inputNome.value.trim(),
            tipo: selectTipo.value,
            colore: tavolozza.leggiColore(),
        };

        if (selectTipo.value === 'condiviso') {
            corpo.permesso_modifica = selectPermesso.value;
        }

        impostaCaricamento(bottoneCrea, true);

        try {
            const nuovoCalendario = await chiamaApi('/calendari/crea', { metodo: 'POST', corpo });

            // Svuota il form, così la prossima volta riparte pulito
            form.reset();
            sezionePermesso.classList.add('hidden');

            alCreazione(nuovoCalendario);
        } catch (erroreBackend) {
            console.error(erroreBackend);
            // Il messaggio arriva dal backend (es. nome troppo lungo)
            mostraErrore(errore, erroreBackend.message);
        } finally {
            impostaCaricamento(bottoneCrea, false);
        }
    });

    return form;
}