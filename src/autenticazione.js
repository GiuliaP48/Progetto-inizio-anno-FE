
import { chiamaApi, salvaSessione, salvaUtente, cancellaSessione, leggiSessione } from './api.js';

// Login: se va bene salva i dati di accesso e restituisce l'utente
export async function accedi(email, password) {
    const dati = await chiamaApi('/utenti/login', {
        metodo: 'POST',
        corpo: { email, password },
    });

    salvaSessione(dati);
    return dati.utente;
}

// Registrazione: crea l'utente ma non fa il login
export function registrati(nome, cognome, email, password) {
    return chiamaApi('/utenti/registrazione', {
        metodo: 'POST',
        corpo: { nome, cognome, email, password },
    });
}

// Logout: avvisa il backend e cancella i dati di accesso, i dati vengono cancellati anche se il backend non risponde
export async function esci() {
    const { refreshToken } = leggiSessione();

    try {
        await chiamaApi('/utenti/logout', {
            metodo: 'DELETE',
            corpo: { refreshToken },
        });
    } catch {
        // Il logout nel browser avviene comunque
    } finally {
        cancellaSessione();
    }
}

// Dopo la modifica del profilo: aggiorna nome, cognome ed email dell'utente salvati
export function aggiornaUtenteCorrente(utente) {
    salvaUtente(utente);
}

// Restituisce l'utente che ha fatto il login (null se nessuno)
export function utenteCorrente() {
    return leggiSessione().utente;
}

// true se c'è un utente che ha fatto il login
export function utenteLoggato() {
    return Boolean(leggiSessione().token);
}