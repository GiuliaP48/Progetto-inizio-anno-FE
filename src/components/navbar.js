
import titolo from '../assets/DaybyDay_titolo.png';

// Barra in alto uguale in tutte le pagine dopo il login: a sinistra il titolo dell'app, a destra gli elementi passati da ogni pagina ( notifiche e logout nell'area personale, "Indietro" nelle altre)
export function creaNavbar(elementiDestra = []) {
    const navbar = document.createElement('header');
    navbar.className = 'navbar bg-base-100/50 border border-base-300 rounded-box px-4';

    // Cliccando il titolo si torna sempre all'area personale
    const linkTitolo = document.createElement('a');
    linkTitolo.href = '#/area-personale';

    // Il testo alternativo viene letto al posto dell'immagine dai lettori di schermo
    const immagineTitolo = document.createElement('img');
    immagineTitolo.src = titolo;
    immagineTitolo.alt = 'DayByDay';
    immagineTitolo.className = 'h-6';
    linkTitolo.appendChild(immagineTitolo);

    const destra = document.createElement('div');
    destra.className = 'flex items-center gap-1 ml-auto';
    elementiDestra.forEach((elemento) => destra.appendChild(elemento));

    navbar.appendChild(linkTitolo);
    navbar.appendChild(destra);

    return navbar;
}