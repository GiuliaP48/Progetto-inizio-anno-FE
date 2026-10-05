
// Funzioni per le date, usate in tutto il progetto.
// Il backend salva le date in UTC: il browser le converte da solo nell'ora italiana

// Aggiunge uno zero davanti ai numeri di una cifra (es. 5 --> "05")
function dueCifre(numero) {
    return String(numero).padStart(2, '0');
}

// Data nel formato GG/MM/AAAA (es. 01/10/2026)
export function formattaData(data) {
    return new Date(data).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

// Ora nel formato HH:MM (es. 09:30)
export function formattaOra(data) {
    return new Date(data).toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

// Data e ora insieme (es. 01/10/2026 alle 09:30)
export function formattaDataOra(data) {
    return `${formattaData(data)} alle ${formattaOra(data)}`;
}

// Data nel formato AAAA-MM-GG secondo l'ora italiana: serve per i campi data dei form  e per le date di note e to-do
// non uso toISOString().slice(0, 10) perché di notte, per il fuso orario, darebbe il giorno prima
export function dataAAAAMMGG(data) {
    const giorno = new Date(data);
    return `${giorno.getFullYear()}-${dueCifre(giorno.getMonth() + 1)}-${dueCifre(giorno.getDate())}`;
}

// Ora nel formato HH:MM secondo l'ora italiana: serve per i campi ora dei form
export function oraHHMM(data) {
    const ora = new Date(data);
    return `${dueCifre(ora.getHours())}:${dueCifre(ora.getMinutes())}`;
}

// Giorno e ora scritti nei campi del form (es. "2026-10-01" e "09:30") --> formato per il backend.
// Il browser converte l'ora italiana in UTC, ora legale compresa
export function dataOraPerBackend(giorno, ora) {
    return new Date(`${giorno}T${ora}`).toISOString();
}

// Giorno (AAAA-MM-GG) di un evento di tutto il giorno
// Questi eventi si salvano come sola data, cioè la mezzanotte in UTC; se un evento è stato salvato con la mezzanotte italiana, si legge il giorno italiano
export function giornoTuttoIlGiorno(data) {
    const giorno = new Date(data);
    const mezzanotteUtc = giorno.getUTCHours() === 0 && giorno.getUTCMinutes() === 0;
    return mezzanotteUtc ? giorno.toISOString().slice(0, 10) : dataAAAAMMGG(giorno);
}

// Aggiunge dei giorni a una data AAAA-MM-GG e la restituisce nello stesso formato
export function aggiungiGiorni(giorno, quanti) {
    const [anno, mese, numero] = giorno.split('-').map(Number);
    return new Date(Date.UTC(anno, mese - 1, numero + quanti)).toISOString().slice(0, 10);
}