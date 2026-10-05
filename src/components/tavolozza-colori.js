
// Colori proposti, in ordine come nell'arcobaleno
const COLORI = ['#f5b83d', '#f97366', '#34b37e', '#2fa6c4', '#5170ff', '#8b5cf6', '#cb6ce6', '#ff66c4'];

// Nomi dei colori proposti, che compaiono passando con il mouse sopra i cerchi
const NOMI_COLORI = {
    '#f5b83d': 'Giallo',
    '#f97366': 'Corallo',
    '#34b37e': 'Verde',
    '#2fa6c4': 'Azzurro',
    '#5170ff': 'Blu',
    '#8b5cf6': 'Viola',
    '#cb6ce6': 'Lilla',
    '#ff66c4': 'Rosa',
};

// Sfondo del cerchio per scegliere un altro colore, fatto con gli stessi colori della tavolozza
const SFONDO_ARCOBALENO = `conic-gradient(${[...COLORI, COLORI[0]].join(', ')})`;

// Avvolge un elemento nel tooltip di daisyUI: passando con il mouse compare il testo, con lo stile dell'app (al posto del fumetto del browser)
// "classe" sceglie la posizione: sopra (tooltip), a destra (tooltip tooltip-inizio) o a sinistra (tooltip tooltip-fine)
function conTooltip(elemento, testo, classe = 'tooltip') {
    const tooltip = document.createElement('span');
    tooltip.className = classe;
    // Flex: così il tooltip è alto esattamente quanto il cerchio, e tutti i cerchi restano allineati
    tooltip.classList.add('flex');
    tooltip.dataset.tip = testo;
    tooltip.appendChild(elemento);
    return tooltip;
}

// Crea la tavolozza: un cerchio per ogni colore, più uno arcobaleno per sceglierne un altro
// Il colore scelto con l'arcobaleno compare in un cerchio suo, prima dell'arcobaleno, così l'arcobaleno resta sempre riconoscibile
// "coloriAggiuntivi" sono colori da mettere all'inizio con la loro descrizione (es. { colore: '#4a90d9', descrizione: 'Colore del calendario' })
// Restituisce l'elemento da mettere nel form e una funzione che legge il colore scelto
export function creaTavolozzaColori(coloreIniziale = COLORI[0], coloriAggiuntivi = []) {
    // I colori si confrontano in minuscolo: "#4A90D9" e "#4a90d9" sono lo stesso colore
    const iniziale = coloreIniziale.toLowerCase();
    let coloreScelto = iniziale;

    // Colori aggiuntivi sempre all'inizio, poi la tavolozza senza ripetere quei colori
    const aggiuntivi = coloriAggiuntivi
        .map((elemento) => ({ ...elemento, colore: elemento.colore.toLowerCase() }));

    const tuttiIColori = [
        ...aggiuntivi,
        ...COLORI
            .filter((colore) => !aggiuntivi.some((elemento) => elemento.colore === colore))
            .map((colore) => ({ colore, descrizione: NOMI_COLORI[colore] })),
    ];

    const contenitore = document.createElement('div');
    contenitore.className = 'flex flex-nowrap items-center gap-4';

    const bottoni = [];

    // Cerchio del colore personalizzato: compare solo dopo averne scelto uno con l'arcobaleno (o se il colore di partenza non è tra quelli proposti)
    let colorePersonalizzato = null;

    const cerchioPersonalizzato = document.createElement('button');
    cerchioPersonalizzato.type = 'button';
    cerchioPersonalizzato.className = 'size-7 rounded-full cursor-pointer ring-base-content ring-offset-2 ring-offset-base-100';
    cerchioPersonalizzato.setAttribute('aria-label', 'Colore personalizzato');
    cerchioPersonalizzato.addEventListener('click', () => seleziona(colorePersonalizzato));

    // Il tooltip avvolge il cerchio: è lui che si nasconde e si mostra
    // È il primo della fila: il testo va a destra, altrimenti uscirebbe dal bordo della finestra
    const tooltipPersonalizzato = conTooltip(cerchioPersonalizzato, 'Colore personalizzato', 'tooltip tooltip-inizio');
    tooltipPersonalizzato.classList.add('hidden');

    // Cerchio arcobaleno con dentro il selettore del browser, reso invisibile:
    // si vede il cerchio, ma cliccandolo si apre la scelta di qualsiasi colore
    const cerchioAltro = document.createElement('div');
    cerchioAltro.className = 'relative size-7 rounded-full ring-base-content ring-offset-2 ring-offset-base-100';
    cerchioAltro.style.background = SFONDO_ARCOBALENO;

    const altroColore = document.createElement('input');
    altroColore.type = 'color';
    // Valore di partenza: è anche quello a cui torna quando il form viene svuotato
    altroColore.setAttribute('value', iniziale);
    altroColore.className = 'absolute inset-0 size-full opacity-0 cursor-pointer';
    altroColore.setAttribute('aria-label', 'Scegli un altro colore');
    altroColore.addEventListener('input', () => seleziona(altroColore.value));
    cerchioAltro.appendChild(altroColore);

    // Segna come scelto il colore indicato e toglie il segno dagli altri.
    // Un colore non proposto va nel cerchio personalizzato, che resta visibile
    // anche se poi si sceglie un altro colore, così si può tornare a lui
    function seleziona(colore) {
        coloreScelto = colore.toLowerCase();

        bottoni.forEach((bottone) => {
            const scelto = bottone.dataset.colore === coloreScelto;
            bottone.classList.toggle('ring-2', scelto);
            bottone.setAttribute('aria-pressed', scelto);
        });

        const coloreAltro = !tuttiIColori.some((elemento) => elemento.colore === coloreScelto);

        if (coloreAltro) {
            colorePersonalizzato = coloreScelto;
            // Il colore cambia secondo la scelta
            cerchioPersonalizzato.style.backgroundColor = coloreScelto;
            tooltipPersonalizzato.classList.remove('hidden');
        }

        cerchioPersonalizzato.classList.toggle('ring-2', coloreAltro);
        cerchioPersonalizzato.setAttribute('aria-pressed', coloreAltro);
    }

    tuttiIColori.forEach(({ colore, descrizione }, indice) => {
        const bottone = document.createElement('button');
        bottone.type = 'button';
        bottone.className = 'size-7 rounded-full cursor-pointer ring-base-content ring-offset-2 ring-offset-base-100';
        // Il colore cambia per ogni cerchio
        bottone.style.backgroundColor = colore;
        bottone.dataset.colore = colore;
        bottone.setAttribute('aria-label', descrizione);

        bottone.addEventListener('click', () => seleziona(colore));

        bottoni.push(bottone);
        // Il primo cerchio ha il testo a destra, gli altri sopra
        contenitore.appendChild(conTooltip(bottone, descrizione, indice === 0 ? 'tooltip tooltip-inizio' : 'tooltip'));
    });

    // Il colore personalizzato va all'inizio, così il colore attuale dell'evento è il primo cerchio
    contenitore.prepend(tooltipPersonalizzato);
    // L'arcobaleno è l'ultimo: il testo va a sinistra, per non uscire dal bordo della finestra
    contenitore.appendChild(conTooltip(cerchioAltro, 'Scegli un altro colore', 'tooltip tooltip-fine'));
    seleziona(iniziale);

    return {
        elemento: contenitore,
        leggiColore: () => coloreScelto,
    };
}