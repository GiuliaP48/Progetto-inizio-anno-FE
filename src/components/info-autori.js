
import { formattaData } from '../utility/date.js';

// true quando il calendario aperto è personale: lì il nome non serve
// e si scrivono solo le date (es. "Creata il 04/10/2026"). Lo imposta la pagina del calendario
let calendarioPersonale = false;

// Chiamata dalla pagina del calendario appena sa se il calendario è personale o condiviso
export function impostaCalendarioPersonale(personale) {
    calendarioPersonale = personale;
}

// Nome e cognome di una persona come la manda il backend ({ utente_id, nome, cognome }), oppure null
export function nomePersona(persona) {
    if (!persona || !persona.nome) return null;
    return `${persona.nome} ${persona.cognome || ''}`.trim();
}

// Testi su chi ha creato, chi ha modificato per ultimo e chi ha completato
// La modifica c'è solo se qualcuno ha cambiato qualcosa dopo la creazione
// Il completamento: per gli elementi il backend salva la persona ma non la data, per la to do la data ma non la persona
// - oggetto: come arriva dal backend (creato_da, creato_il, modificato_da, modificato_il, completato_da, data_completamento)
// - femminile: true per le cose femminili (la nota e la to do), così si scrive "Creata", "Modificata"...
export function testiAutori(oggetto, femminile = false) {
    // Parole al maschile, oppure al femminile
    let creato = 'Creato';
    let modificato = 'Modificato';
    let completato = 'Completato';

    if (femminile) {
        creato = 'Creata';
        modificato = 'Modificata';
        completato = 'Completata';
    }

    const testi = [];

    // Nei calendari personali solo le date, senza il nome
    const creatore = nomePersona(oggetto.creato_da);
    if (creatore && calendarioPersonale) {
        if (oggetto.creato_il) testi.push(`${creato} il ${formattaData(oggetto.creato_il)}`);
    } else if (creatore) {
        testi.push(oggetto.creato_il
            ? `${creato} da ${creatore} il ${formattaData(oggetto.creato_il)}`
            : `${creato} da ${creatore}`);
    }

    const modificatore = nomePersona(oggetto.modificato_da);
    if (modificatore && calendarioPersonale) {
        if (oggetto.modificato_il) testi.push(`${modificato} il ${formattaData(oggetto.modificato_il)}`);
    } else if (modificatore) {
        testi.push(oggetto.modificato_il
            ? `${modificato} da ${modificatore} il ${formattaData(oggetto.modificato_il)}`
            : `${modificato} da ${modificatore}`);
    }

    // Elemento spuntato: "Completato da" senza la data, quindi nei calendari personali non si scrive (la spunta basta)
    const chiHaCompletato = oggetto.completato ? nomePersona(oggetto.completato_da) : null;
    if (chiHaCompletato && !calendarioPersonale) {
        testi.push(`${completato} da ${chiHaCompletato}`);
    }

    // To do completata (tutti gli elementi spuntati): "Completata il" con la data, senza il nome
    if (oggetto.data_completamento && oggetto.numero_completati === oggetto.numero_elementi) {
        testi.push(`${completato} il ${formattaData(oggetto.data_completamento)}`);
    }

    return testi;
}

// Righe piccole e grigie, una sotto l'altra, con i testi di testiAutori, si usano nelle finestre di modifica, negli elenchi di scelta e sulle card
export function creaInfoAutori(oggetto, femminile = false) {
    // empty:hidden: se il backend non manda niente, il blocco non occupa spazio
    const info = document.createElement('div');
    info.className = 'flex flex-col text-xs text-base-content/60 empty:hidden';

    testiAutori(oggetto, femminile).forEach((testo) => {
        const riga = document.createElement('p');
        riga.textContent = testo;
        info.appendChild(riga);
    });

    return info;
}

// Testo del fumetto sugli elementi spuntati delle to do (es. "Completato da Giulia Romano"), nei calendari personali niente fumetto
export function testoCompletato(elemento) {
    const chi = elemento.completato ? nomePersona(elemento.completato_da) : null;
    if (!chi || calendarioPersonale) return null;
    return `Completato da ${chi}`;
}