
import { chiamaApi } from '../api.js';

import { mostraToast } from './messaggio_errore.js';

// Scelta dei tag di un evento: tutti i tag del calendario come badge da accendere e spegnere
// - calendario: il calendario dell'evento (servono id e colore)
// - idIniziali: gli id dei tag già collegati all'evento (vuoto per un evento nuovo)
// Restituisce l'elemento da mettere nel form e la funzione che legge gli id dei tag scelti
export function creaSelettoreTag(calendario, idIniziali = []) {
    // Id dei tag accesi
    const scelti = new Set(idIniziali);

    const contenitore = document.createElement('div');
    contenitore.className = 'flex flex-wrap gap-2';

    const caricamento = document.createElement('span');
    caricamento.className = 'loading loading-spinner loading-sm text-primary';
    contenitore.appendChild(caricamento);

    // Colori di un badge: acceso = pieno del colore del tag, spento = solo il contorno
    // Passando sopra, quello spento si colora appena e quello acceso diventa un po' più scuro
    function coloraBadge(badge, acceso) {
        badge.classList.toggle('bg-(--colore-tag)', acceso);
        badge.classList.toggle('text-white', acceso);
        badge.classList.toggle('hover:brightness-90', acceso);

        badge.classList.toggle('bg-transparent', !acceso);
        badge.classList.toggle('text-(--colore-tag)', !acceso);
        badge.classList.toggle('hover:bg-(--colore-tag)/15', !acceso);

        badge.setAttribute('aria-pressed', acceso);
    }

    // Crea il badge di un tag: cliccandolo si accende o si spegne
    function creaBadge(tag) {
        const badge = document.createElement('button');
        badge.type = 'button';
        badge.className = 'badge badge-md cursor-pointer border border-(--colore-tag) font-medium transition-colors';
        // Il colore cambia per ogni tag, quindi va nello stile, in una variabile usata dalle classi
        // (un tag senza colore prende quello del calendario)
        badge.style.setProperty('--colore-tag', tag.colore || calendario.colore);
        badge.textContent = tag.nome;
        coloraBadge(badge, scelti.has(tag.id));

        badge.addEventListener('click', () => {
            if (scelti.has(tag.id)) scelti.delete(tag.id);
            else scelti.add(tag.id);
            coloraBadge(badge, scelti.has(tag.id));
        });

        return badge;
    }

    // Carica i tag del calendario (il backend li manda già in ordine alfabetico)
    async function caricaTag() {
        try {
            const tags = await chiamaApi(`/tags/lista/${calendario.id}`);
            contenitore.innerHTML = '';

            if (tags.length === 0) {
                const vuoto = document.createElement('p');
                vuoto.className = 'text-sm text-base-content/60';
                vuoto.textContent = 'Nessun tag: creane uno dal menu +';
                contenitore.appendChild(vuoto);
                return;
            }

            tags.forEach((tag) => contenitore.appendChild(creaBadge(tag)));
        } catch (errore) {
            caricamento.remove();
            mostraToast(errore.message);
        }
    }

    caricaTag();

    return {
        elemento: contenitore,
        // Id dei tag accesi
        leggi: () => [...scelti],
    };
}