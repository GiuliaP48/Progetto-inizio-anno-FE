
import { Eye, EyeOff } from 'lucide';

import { creaIcona } from './icona.js';

// Pezzi condivisi dai form di tutte le pagine (login, calendari, eventi, ...)

// Crea un'etichetta + un campo, li aggiunge al form e restituisce il campo
export function aggiungiCampo(form, id, testo, tipo) {
    const etichetta = document.createElement('label');
    etichetta.htmlFor = id;
    etichetta.textContent = testo;

    const campo = document.createElement('input');
    campo.id = id;
    campo.type = tipo;
    campo.className = 'input w-full';
    campo.required = true;

    form.appendChild(etichetta);
    form.appendChild(campo);

    return campo;
}

// Crea un'etichetta + un menu a tendina, li aggiunge al form e restituisce la tendina
// "opzioni" è una lista di valore, testo: il valore va al backend, il testo si vede
export function aggiungiSelezione(form, id, testo, opzioni) {
    const etichetta = document.createElement('label');
    etichetta.htmlFor = id;
    etichetta.textContent = testo;

    const tendina = document.createElement('select');
    tendina.id = id;
    tendina.className = 'select w-full';

    opzioni.forEach((opzione) => {
        const voce = document.createElement('option');
        voce.value = opzione.valore;
        voce.textContent = opzione.testo;
        tendina.appendChild(voce);
    });

    form.appendChild(etichetta);
    form.appendChild(tendina);

    return tendina;
}

// Crea la scritta rossa per gli errori, "empty:hidden" la nasconde quando è vuota, così non occupa spazio
export function creaTestoErrore() {
    const testo = document.createElement('p');
    testo.className = 'text-error text-sm font-bold empty:hidden';
    return testo;
}

// Scrive l'errore e lo cancella dopo 3 secondi
export function mostraErrore(elemento, testo) {
    elemento.textContent = testo;

    // Se c'era già un timer attivo (errore precedente), lo annulla
    clearTimeout(elemento.timer);

    // Fa partire un nuovo timer che svuota la scritta dopo 3 secondi
    elemento.timer = setTimeout(() => {
        elemento.textContent = '';
    }, 3000);
}

// Crea il bottone di invio del form
export function creaBottoneInvio(testo) {
    const bottone = document.createElement('button');
    bottone.type = 'submit';
    bottone.className = 'btn border-0 text-white bg-linear-to-r from-blu-logo to-rosa-logo mt-2';
    bottone.textContent = testo;
    return bottone;
}

// Mostra o toglie la rotellina di caricamento sul bottone, mentre carica il bottone è disattivato, così non si può cliccare due volte
export function impostaCaricamento(bottone, inCaricamento) {
    bottone.disabled = inCaricamento;

    if (inCaricamento) {
        const rotellina = document.createElement('span');
        rotellina.className = 'loading loading-spinner loading-sm';
        bottone.prepend(rotellina);
    } else {
        bottone.querySelector('.loading')?.remove();
    }
}

// Crea un'etichetta + un'area di testo su più righe, le aggiunge al form e restituisce l'area, a differenza dei campi normali non è obbligatoria
export function aggiungiAreaTesto(form, id, testo) {
    const etichetta = document.createElement('label');
    etichetta.htmlFor = id;
    etichetta.textContent = testo;

    const area = document.createElement('textarea');
    area.id = id;
    area.className = 'textarea w-full';

    form.appendChild(etichetta);
    form.appendChild(area);

    return area;
}

// Mette un occhio dentro un campo password, a destra: cliccandolo la password si vede o torna nascosta
export function aggiungiOcchioPassword(campo) {
    // Contenitore del campo e dell'occhio, che sta dentro il campo
    const zona = document.createElement('div');
    zona.className = 'relative';
    campo.parentNode.insertBefore(zona, campo);
    zona.appendChild(campo);

    // Spazio a destra per l'occhio, così la password scritta non ci finisce sotto
    campo.classList.add('pr-10');

    const bottone = document.createElement('button');
    bottone.type = 'button';
    bottone.className = 'btn btn-ghost btn-sm btn-circle absolute right-1 top-1/2 -translate-y-1/2';

    // Mostra o nasconde la password, cambiando l'icona (occhio aperto o barrato) e il testo letto ad alta voce a chi non vede
    function mostra(visibile) {
        campo.type = visibile ? 'text' : 'password';
        bottone.replaceChildren(creaIcona(visibile ? Eye : EyeOff, 16));
        bottone.setAttribute('aria-label', visibile ? 'Nascondi la password' : 'Mostra la password');
    }

    bottone.addEventListener('click', () => mostra(campo.type === 'password'));

    // Quando il form si svuota, la password torna nascosta
    campo.form?.addEventListener('reset', () => mostra(false));

    mostra(false);
    zona.appendChild(bottone);
}