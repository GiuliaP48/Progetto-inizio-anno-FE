
import { createElement, CircleCheck, Bell } from 'lucide';

// Classi per tipo
const CLASSI_PER_TIPO = {
    errore: 'alert alert-error',
    successo: 'alert border-0 text-white bg-linear-to-r from-blu-logo to-rosa-logo whitespace-nowrap',
    info: 'alert alert-info',
    avviso: 'alert alert-warning',
    notifica: 'alert border border-lilla-bordo bg-lilla-chiaro text-lilla-scuro',
};

// Icone dei toast, prese da Lucide
const ICONE_PER_TIPO = {
    successo: CircleCheck,
    notifica: Bell,
};

// Quanto resta visibile il toast (in millisecondi: 3000 = 3 secondi)
const DURATA_PREDEFINITA = 3000;

// Restituisce il contenitore dei toast in alto al centro, la prima volta lo crea, le volte successive riusa quello esistente
function prendiContenitoreToast() {
    let contenitore = document.querySelector('#contenitore-toast');

    if (!contenitore) {
        contenitore = document.createElement('div');
        contenitore.id = 'contenitore-toast';
        contenitore.className = 'toast toast-top toast-center top-24 z-50';
        document.body.appendChild(contenitore);
    }

    return contenitore;
}

export function mostraToast(testo, tipo = 'errore', durata = DURATA_PREDEFINITA) {
    const messaggio = document.createElement('div');
    messaggio.setAttribute('role', 'alert');
    messaggio.className = CLASSI_PER_TIPO[tipo] || CLASSI_PER_TIPO.errore;

    // Se il tipo ha un'icona, la crea e la mette prima del testo
    if (ICONE_PER_TIPO[tipo]) {
        const icona = createElement(ICONE_PER_TIPO[tipo]);
        icona.setAttribute('width', '20');
        icona.setAttribute('height', '20');
        messaggio.appendChild(icona);
    }

    const span = document.createElement('span');
    span.textContent = testo;
    messaggio.appendChild(span);

    prendiContenitoreToast().appendChild(messaggio);

    // Dopo "durata" millisecondi, toglie il toast dalla pagina
    setTimeout(() => {
        messaggio.remove();
    }, durata);
}