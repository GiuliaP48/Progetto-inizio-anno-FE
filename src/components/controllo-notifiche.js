
import { chiamaApi } from '../api.js';

import { mostraToast } from './messaggio_errore.js';

// Ogni quanto chiedere al backend se ci sono notifiche nuove (60000 = 1 minuto)
const INTERVALLO = 60000;

// Quanto resta visibile il popup di una notifica (6000 = 6 secondi)
const DURATA_POPUP = 6000;

// Id delle notifiche già viste. null = il primo controllo non è ancora stato fatto:
// al primo controllo si segnano quelle che ci sono già, senza mostrarle come nuove
let idConosciuti = null;

// Il controllo che si ripete ogni tot secondi (null = fermo, non è ancora partito)
let timer = null;

// Chiede le notifiche non lette, mostra un popup per quelle nuove e comunica il nuovo numero
// alle pagine che lo mostrano (es. la campanella dell'area personale), che lo aggiornano da sole
async function controlla() {
    try {
        const nonLette = await chiamaApi('/notifiche/lista?stato=non_lette');

        // Al primo controllo niente popup: le notifiche che c'erano già si vedono dal numero sulla campanella, altrimenti arriverebbero tutte insieme
        if (idConosciuti) {
            nonLette
                .filter((notifica) => !idConosciuti.has(notifica.id))
                .forEach((notifica) => mostraToast(notifica.messaggio, 'notifica', DURATA_POPUP));
        } else {
            idConosciuti = new Set();
        }

        nonLette.forEach((notifica) => idConosciuti.add(notifica.id));

        window.dispatchEvent(new CustomEvent('notifiche-aggiornate', { detail: nonLette.length }));
    } catch {
        // Se la richiesta non riesce (es. backend spento) non si fa niente apposta: il controllo riparte
        // da solo al giro dopo
    }
}

// Fa partire il controllo (se è già partito non fa niente)
export function avviaControlloNotifiche() {
    if (timer) return;

    controlla();
    timer = setInterval(controlla, INTERVALLO);
}

// Ferma il controllo (es. dopo il logout) e cancella l'elenco delle notifiche già viste
// Così, se poi entra un'altra persona, il suo primo controllo riparte da zero: le sue notifiche vecchie non le compaiono come nuove
export function fermaControlloNotifiche() {
    clearInterval(timer);
    timer = null;
    idConosciuti = null;
}