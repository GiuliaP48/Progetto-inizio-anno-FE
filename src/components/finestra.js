
import { X } from 'lucide';

import { creaIcona } from './icona.js';

// Finestra che si apre sopra la pagina (modal" di daisyUI), con titolo e contenuto
// Si chiude con la X, con il tasto Esc o cliccando sullo sfondo scuro
// Restituisce l'elemento da aggiungere alla pagina e le funzioni per aprirla e chiuderla
// Con larga: true la finestra è più ampia, per i form con tanti campi (es. l'evento)
export function creaFinestra(titolo, contenuto, { larga = false } = {}) {
    const finestra = document.createElement('dialog');
    finestra.className = 'modal';

    const box = document.createElement('div');
    box.className = larga ? 'modal-box max-w-2xl' : 'modal-box max-w-md';

    // Intestazione: titolo a sinistra, X a destra
    const intestazione = document.createElement('div');
    intestazione.className = 'flex items-center justify-between mb-4';

    const testoTitolo = document.createElement('h2');
    testoTitolo.className = 'text-2xl font-bold';
    testoTitolo.textContent = titolo;

    const bottoneChiudi = document.createElement('button');
    bottoneChiudi.type = 'button';
    bottoneChiudi.className = 'btn btn-ghost btn-circle btn-sm';
    bottoneChiudi.setAttribute('aria-label', 'Chiudi');
    bottoneChiudi.appendChild(creaIcona(X, 18));
    bottoneChiudi.addEventListener('click', () => finestra.close());

    intestazione.appendChild(testoTitolo);
    intestazione.appendChild(bottoneChiudi);

    // Sfondo scuro: cliccandolo la finestra si chiude
    const sfondo = document.createElement('form');
    sfondo.method = 'dialog';
    sfondo.className = 'modal-backdrop';

    const bottoneSfondo = document.createElement('button');
    bottoneSfondo.textContent = 'Chiudi';
    sfondo.appendChild(bottoneSfondo);

    // Ordine composizione finestra
    box.appendChild(intestazione);
    box.appendChild(contenuto);
    finestra.appendChild(box);
    finestra.appendChild(sfondo);

    return {
        elemento: finestra,
        apri: () => finestra.showModal(),
        chiudi: () => finestra.close(),
    };
}