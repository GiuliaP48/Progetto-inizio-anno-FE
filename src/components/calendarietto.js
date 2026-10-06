
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide';

import { creaIcona } from './icona.js';

// Crea il calendarietto Cally, un mese alla volta, con le frecce per cambiarlo
// - alScelta: funzione chiamata quando si clicca un giorno; riceve il giorno scelto (es. "2026-10-05")
// Restituisce l'elemento e la funzione "mostra", che apre il calendarietto su un giorno
// a "mostra" si può dare anche un giorno massimo: i giorni dopo diventano grigi e non si possono scegliere (serve a "Fino al", che non può andare oltre il limite della ricorrenza)
export function creaCalendarietto(alScelta) {
    const calendarietto = document.createElement('calendar-date');
    calendarietto.className = 'cally';
    // Nomi dei mesi e dei giorni in italiano, e la settimana che parte dal lunedì
    calendarietto.setAttribute('locale', 'it-IT');
    calendarietto.setAttribute('first-day-of-week', '1');

    // Frecce per il mese prima e dopo: Cally le mette al loro posto grazie a "slot"
    const frecciaPrecedente = creaIcona(ChevronLeft, 16);
    frecciaPrecedente.setAttribute('slot', 'previous');
    frecciaPrecedente.setAttribute('aria-label', 'Mese precedente');

    const frecciaSuccessiva = creaIcona(ChevronRight, 16);
    frecciaSuccessiva.setAttribute('slot', 'next');
    frecciaSuccessiva.setAttribute('aria-label', 'Mese successivo');

    calendarietto.appendChild(frecciaPrecedente);
    calendarietto.appendChild(frecciaSuccessiva);
    calendarietto.appendChild(document.createElement('calendar-month'));

    calendarietto.addEventListener('change', () => alScelta(calendarietto.value));

    // Apre il calendarietto sul giorno indicato (AAAA-MM-GG)
    // "massimo" (facoltativo) è l'ultimo giorno che si può scegliere: quelli dopo diventano grigi
    function mostra(giorno, massimo = '') {
        calendarietto.value = giorno || '';
        if (giorno) calendarietto.focusedDate = giorno;

        if (massimo) calendarietto.setAttribute('max', massimo);
        else calendarietto.removeAttribute('max');
    }

    return { elemento: calendarietto, mostra };
}


// Mette il calendarietto in un campo data dei form, al posto di quello del browser
// Il campo resta lo stesso (valore, giorno massimo, data scritta a mano): cambia solo il calendarietto che si apre
// Scelto un giorno, il campo lo riceve come se l'avesse scritto l'utente (evento "change"), così i controlli che ci sono già nei form continuano a funzionare
export function aggiungiCalendariettoAlCampo(campo) {
    // Contenitore del campo, del bottone e della finestrella, che si apre sotto il campo
    const zona = document.createElement('div');
    zona.className = 'relative min-w-0';
    campo.parentNode.insertBefore(zona, campo);
    zona.appendChild(campo);

    // Nasconde l'icona del calendarietto del browser
    // e lascia spazio a destra (pr-10) per la mia icona cliccabile, così la data scritta non ci finisce sotto
    campo.classList.add('pr-10', '[&::-webkit-calendar-picker-indicator]:hidden');

    const bottone = document.createElement('button');
    bottone.type = 'button';
    bottone.className = 'btn btn-ghost btn-sm btn-circle absolute right-1 top-1/2 -translate-y-1/2';
    bottone.setAttribute('aria-label', 'Scegli il giorno');
    bottone.appendChild(creaIcona(CalendarDays, 16));

    const finestrella = document.createElement('div');
    // Bordo lilla dell'app, come il menu del "+": nei form il calendarietto è un popup della finestra
    finestrella.className = 'absolute right-0 top-full z-30 mt-2 hidden rounded-box border-2 border-lilla-bordo bg-base-100 p-2 shadow-lg';

    // Chiude la finestrella, mentre è aperta si controllano i clic su tutta la pagina (per chiuderla
    // cliccando fuori): quando è chiusa quel controllo non serve più, e si toglie
    function chiudi() {
        // Il form torna alla sua altezza
        campo.form.style.paddingBottom = '';
        finestrella.classList.add('hidden');
        document.removeEventListener('click', chiudiFuori);
    }

    // Cliccando fuori dal campo e dal calendarietto, si chiude
    function chiudiFuori(evento) {
        if (!zona.contains(evento.target)) chiudi();
    }

    const calendarietto = creaCalendarietto((giorno) => {
        chiudi();
        campo.value = giorno;
        campo.dispatchEvent(new Event('change', { bubbles: true }));
    });
    // Nei form il calendarietto è lilla, come l'app: solo per lui il colore del calendario diventa il lilla
    // (quello accanto a "Oggi" nella pagina del calendario resta del colore del calendario)
    calendarietto.elemento.style.setProperty('--colore-calendario', 'var(--color-primary)');
    finestrella.appendChild(calendarietto.elemento);

    // Si apre sul giorno del campo (o su oggi, se è vuoto), con lo stesso giorno massimo del campo.
    // Se il campo è disattivato (es. to do già rimandata), il calendarietto non si apre
    bottone.addEventListener('click', () => {
        if (campo.disabled) return;

        if (finestrella.classList.contains('hidden')) {
            calendarietto.mostra(campo.value, campo.max);
            finestrella.classList.remove('hidden');

            // Se il calendarietto esce oltre la fine del form, aggiungo in fondo al form lo spazio che manca:
            // così la finestra si allunga e il calendarietto si vede tutto
            const spazioMancante = finestrella.getBoundingClientRect().bottom - campo.form.getBoundingClientRect().bottom;
            if (spazioMancante > 0) campo.form.style.paddingBottom = `${spazioMancante}px`;
            finestrella.scrollIntoView({ block: 'nearest' });
            document.addEventListener('click', chiudiFuori);
        } else {
            chiudi();
        }
    });

    zona.appendChild(bottone);
    zona.appendChild(finestrella);
}