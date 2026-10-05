
import { createElement } from 'lucide';

// Crea un'icona Lucide della dimensione indicata
// Le icone prendono il colore del testo in cui si trovano
export function creaIcona(icona, dimensione = 20) {
    const svg = createElement(icona);
    svg.setAttribute('width', dimensione);
    svg.setAttribute('height', dimensione);
    svg.setAttribute('aria-hidden', 'true');
    return svg;
}