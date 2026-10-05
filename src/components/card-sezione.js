
// Crea una card bianca con il titolo (se c'è): restituisce la card e il corpo dove mettere il contenuto
// La usano le pagine delle impostazioni (calendario e profilo) e dei resoconti
export function creaCardSezione(titolo = null) {
    const card = document.createElement('section');
    card.className = 'card bg-base-100 border border-base-300';

    const corpo = document.createElement('div');
    corpo.className = 'card-body gap-3';

    if (titolo) {
        const testoTitolo = document.createElement('h2');
        testoTitolo.className = 'card-title text-lg';
        testoTitolo.textContent = titolo;
        corpo.appendChild(testoTitolo);
    }

    card.appendChild(corpo);
    return { card, corpo };
}