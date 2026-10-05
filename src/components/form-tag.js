
import { chiamaApi } from '../api.js';

import { chiediConferma } from './conferma.js';

import { creaTavolozzaColori } from './tavolozza-colori.js';

import {
    aggiungiCampo,
    creaTestoErrore,
    mostraErrore,
    creaBottoneInvio,
    impostaCaricamento,
} from './form.js';

import { creaInfoAutori } from './info-autori.js';

// Lunghezza massima del nome, la stessa controllata dal backend
const LUNGHEZZA_MASSIMA_NOME = 30;

// Form per creare o modificare un tag
// - calendario: il calendario del tag
// - tag: il tag da modificare, come arriva dal backend (assente = nuovo tag)
// - alSalvataggio: chiamata con il messaggio da mostrare dopo creazione, modifica o eliminazione
export function creaFormTag({ calendario, tag = null, alSalvataggio }) {
    const inModifica = tag !== null;

    const form = document.createElement('form');
    form.className = 'flex flex-col gap-3';
    // Gli errori li mostro io con la scritta rossa, non il fumetto del browser
    form.noValidate = true;
    if (inModifica) form.appendChild(creaInfoAutori(tag));

    // Nome
    const inputNome = aggiungiCampo(form, 'tag-nome', 'Nome', 'text');
    inputNome.maxLength = LUNGHEZZA_MASSIMA_NOME;
    inputNome.placeholder = 'Es. Università';
    // All'apertura della finestra il cursore parte da qui, così si può scrivere subito
    inputNome.autofocus = true;

    // Colore: parte da quello del tag o del calendario, come nel form evento
    const etichettaColore = document.createElement('p');
    etichettaColore.textContent = 'Colore';
    // Il colore del calendario è il primo cerchio, così si riconosce e si può riscegliere
    const coloriAggiuntivi = calendario.colore
        ? [{ colore: calendario.colore, descrizione: 'Colore del calendario' }]
        : [];
    const tavolozza = creaTavolozzaColori((inModifica ? tag.colore : calendario.colore) || undefined, coloriAggiuntivi);
    form.appendChild(etichettaColore);
    form.appendChild(tavolozza.elemento);

    // Errori e bottoni
    const errore = creaTestoErrore();
    form.appendChild(errore);

    const bottoneSalva = creaBottoneInvio(inModifica ? 'Salva modifiche' : 'Crea tag');
    form.appendChild(bottoneSalva);

    let bottoneElimina = null;
    if (inModifica) {
        bottoneElimina = document.createElement('button');
        bottoneElimina.type = 'button';
        bottoneElimina.className = 'btn btn-outline btn-error';
        bottoneElimina.textContent = 'Elimina tag';
        form.appendChild(bottoneElimina);

    }

    // Valori di partenza
    if (inModifica) inputNome.value = tag.nome;

    // Invio del form al backend
    form.addEventListener('submit', async (eventoInvio) => {
        eventoInvio.preventDefault();

        const dati = {
            nome: inputNome.value.trim(),
            colore: tavolozza.leggiColore(),
        };

        if (!dati.nome) {
            mostraErrore(errore, 'Il nome è obbligatorio');
            return;
        }

        impostaCaricamento(bottoneSalva, true);

        try {
            if (inModifica) {
                await chiamaApi(`/tags/modifica/${tag.id}`, { metodo: 'PUT', corpo: dati });
                alSalvataggio('Tag modificato!');
            } else {
                await chiamaApi(`/tags/crea/${calendario.id}`, { metodo: 'POST', corpo: dati });
                alSalvataggio('Tag creato!');
            }
        } catch (erroreBackend) {
            // Il messaggio arriva dal backend (es. esiste già un tag con questo nome)
            mostraErrore(errore, erroreBackend.message);
        } finally {
            impostaCaricamento(bottoneSalva, false);
        }
    });

    // Eliminazione, con conferma: dice anche su quanti eventi è usato
    if (bottoneElimina) {
        bottoneElimina.addEventListener('click', async () => {
            const usato = tag.numero_eventi === 1 ? 'su 1 evento' : `su ${tag.numero_eventi} eventi`;
            const testo = tag.numero_eventi > 0
                ? `Il tag "${tag.nome}" è usato ${usato}: verrà tolto e poi eliminato definitivamente. Vuoi continuare?`
                : `Il tag "${tag.nome}" verrà eliminato definitivamente. Vuoi continuare?`;

            const scelta = await chiediConferma(
                'Eliminare il tag?',
                testo,
                [{ testo: 'Elimina', valore: 'elimina', pericolosa: true }],
            );

            if (!scelta) return;

            impostaCaricamento(bottoneElimina, true);

            try {
                await chiamaApi(`/tags/elimina/${tag.id}`, { metodo: 'DELETE' });
                alSalvataggio('Tag eliminato');
            } catch (erroreBackend) {
                mostraErrore(errore, erroreBackend.message);
            } finally {
                impostaCaricamento(bottoneElimina, false);
            }
        });
    }

    return form;
}