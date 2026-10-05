
import { BACKEND_URL } from './env.js';

// Nomi usati per salvare i dati di accesso nel browser
const CHIAVE_TOKEN = 'token';
const CHIAVE_REFRESH_TOKEN = 'refreshToken';
const CHIAVE_UTENTE = 'utente';

// Tempo massimo di attesa di una risposta del backend (15 secondi): se il backend è acceso ma bloccato,
// la richiesta si interrompe e compare l'errore, invece di aspettare per sempre
const TEMPO_MASSIMO_RISPOSTA = 15000;

// Dati di accesso salvati nel browser

// Salva token, refresh token e utente (quelli che arrivano dal login)
export function salvaSessione(dati) {
    localStorage.setItem(CHIAVE_TOKEN, dati.token);
    localStorage.setItem(CHIAVE_REFRESH_TOKEN, dati.refreshToken);
    localStorage.setItem(CHIAVE_UTENTE, JSON.stringify(dati.utente));
}

// Aggiorna solo i dati dell'utente salvati (es. dopo la modifica del profilo) --> token e refresh token restano quelli di prima
export function salvaUtente(utente) {
    localStorage.setItem(CHIAVE_UTENTE, JSON.stringify(utente));
}

// Cancella tutti i dati di accesso (logout o sessione scaduta)
export function cancellaSessione() {
    localStorage.removeItem(CHIAVE_TOKEN);
    localStorage.removeItem(CHIAVE_REFRESH_TOKEN);
    localStorage.removeItem(CHIAVE_UTENTE);
}

// Restituisce i dati di accesso salvati (null dove mancano)
export function leggiSessione() {
    const utente = localStorage.getItem(CHIAVE_UTENTE);

    return {
        token: localStorage.getItem(CHIAVE_TOKEN),
        refreshToken: localStorage.getItem(CHIAVE_REFRESH_TOKEN),
        utente: utente ? JSON.parse(utente) : null,
    };
}

// Rinnovo del token

// Se più richieste trovano il token scaduto nello stesso momento, il rinnovo deve partire una volta sola: le altre aspettano questo invece di chiedere al backend tanti token nuovi tutti insieme
let rinnovoInCorso = null;

function rinnovaToken() {
    if (!rinnovoInCorso) {
        rinnovoInCorso = eseguiRinnovo().finally(() => {
            rinnovoInCorso = null;
        });
    }

    return rinnovoInCorso;
}

// Chiede al backend un nuovo token --> restituisce true se ci è riuscito
async function eseguiRinnovo() {
    const { refreshToken } = leggiSessione();

    if (!refreshToken) {
        return false;
    }

    try {
        const risposta = await fetch(`${BACKEND_URL}/utenti/rinnova`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
            signal: AbortSignal.timeout(TEMPO_MASSIMO_RISPOSTA),
        });

        if (!risposta.ok) {
            // Il backend dice che il refresh token non vale più (codici sotto il 500,
            // es. 401): la sessione è finita davvero, quindi bisogna rifare il login
            if (risposta.status < 500) {
                return false;
            }

            // Codici dal 500 in su: è il server ad avere un problema (es. non raggiunge il database), ma la sessione è ancora buona, quindi niente logout
            throw new Error('Il server non risponde correttamente. Riprova tra poco');
        }

        // Il backend risponde solo con il nuovo token: il refresh token resta lo stesso, quindi non va aggiornato
        const dati = await risposta.json();
        localStorage.setItem(CHIAVE_TOKEN, dati.token);
        return true;

    } catch {
        // Rete assente, backend spento o errore del server (500 in su): la sessione è ancora buona, quindi niente logout
        // l'errore arriva a chi ha fatto la richiesta, che mostra il messaggio
        throw new Error('Il server non risponde correttamente. Riprova tra poco');
    }
}

// Chiamate al backend

// Legge il corpo della risposta come JSON (alcune risposte sono vuote)
async function leggiRisposta(risposta) {
    const testo = await risposta.text();
    return testo ? JSON.parse(testo) : null;
}

// Funzione unica per parlare con il backend: restituisce i dati della risposta oppure lancia un errore con il messaggio del backend
export async function chiamaApi(percorso, { metodo = 'GET', corpo } = {}, giaRinnovato = false) {
    const intestazioni = {};
    const { token } = leggiSessione();

    if (corpo !== undefined) {
        intestazioni['Content-Type'] = 'application/json';
    }

    if (token) {
        intestazioni.Authorization = `Bearer ${token}`;
    }

    let risposta;

    try {
        risposta = await fetch(`${BACKEND_URL}${percorso}`, {
            method: metodo,
            headers: intestazioni,
            body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
            signal: AbortSignal.timeout(TEMPO_MASSIMO_RISPOSTA),
        });
    } catch {
        // fetch fallisce così quando il backend è spento o irraggiungibile
        throw new Error('Impossibile contattare il server. Riprova tra poco');
    }

    const dati = await leggiRisposta(risposta);

    // Token scaduto: lo rinnova e ripete la richiesta una sola volta
    if (risposta.status === 401 && dati?.errore === 'Token scaduto' && !giaRinnovato) {
        const rinnovato = await rinnovaToken();

        if (rinnovato) {
            return chiamaApi(percorso, { metodo, corpo }, true);
        }

        // Anche il refresh token non è più valido: si torna al login
        cancellaSessione();
        window.location.hash = '#/login';

        const errore = new Error('Sessione scaduta, accedi di nuovo');
        errore.stato = 401;
        throw errore;
    }

    if (!risposta.ok) {
        const errore = new Error(dati?.errore || 'Si è verificato un errore, riprova');
        errore.stato = risposta.status;
        throw errore;
    }

    return dati;
}