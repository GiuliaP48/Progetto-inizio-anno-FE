
// Selettore "a ruote", come quello dell'iPhone: un campo che, cliccato, apre sotto una o più colonne da scorrere (es. ore e minuti)
// Il valore scelto è quello che si ferma nella fascia evidenziata al centro

// Altezza di una riga delle ruote in pixel: deve corrispondere alla classe h-8 (h-8 = 32px)
const ALTEZZA_RIGA = 32;

// Crea il selettore
// - etichetta: testo per i lettori di schermo (es. "Inizio: ora")
// - colonne: una lista di colonne, ognuna è una lista di { valore, testo }
// - formatta: trasforma i valori scelti nel testo del campo (es. ['10', '30'] --> "10:30")
// Restituisce l'elemento da mettere nel form e le funzioni per leggere e impostare i valori
export function creaSelettoreOrari({ etichetta, colonne, formatta }) {
    // Valori scelti, uno per colonna: all'inizio il primo di ogni colonna
    const selezione = colonne.map((opzioni) => opzioni[0].valore);

    const contenitore = document.createElement('div');
    contenitore.className = 'flex flex-col gap-2';

    // Il campo ha lo stesso aspetto dei menu a tendina del form
    const campo = document.createElement('button');
    campo.type = 'button';
    campo.className = 'select w-full text-left';
    campo.setAttribute('aria-label', etichetta);
    campo.setAttribute('aria-expanded', 'false');

    // Pannello con le ruote: si apre sotto il campo e spinge in giù il resto del form
    const pannello = document.createElement('div');
    pannello.className = 'relative flex gap-1 rounded-box border border-base-300 bg-base-100 p-1 hidden';

    // Fascia evidenziata al centro: il valore che ci si ferma dentro è quello scelto
    // top-17 = 4px di bordo/padding + 2 righe da 32px sopra
    const fascia = document.createElement('div');
    fascia.className = 'pointer-events-none absolute inset-x-1 top-17 h-8 rounded-field fascia-selettore';
    pannello.appendChild(fascia);

    const ruote = [];

    // Aggiorna il testo del campo con i valori scelti
    function aggiornaCampo() {
        campo.textContent = formatta(selezione);
    }

    // Evidenzia in una ruota la riga scelta
    function evidenzia(ruota, indiceScelto) {
        [...ruota.children].forEach((riga, indice) => {
            riga.classList.toggle('font-bold', indice === indiceScelto);
        });
    }

    colonne.forEach((opzioni, numeroColonna) => {
        // py-16 lascia spazio sopra e sotto, così anche la prima e l'ultima riga possono arrivare nella fascia centrale. La barra di scorrimento è nascosta
        const ruota = document.createElement('div');
        ruota.className = 'relative flex-1 h-40 overflow-y-auto snap-y snap-mandatory py-16 [scrollbar-width:none]';

        opzioni.forEach((opzione, indice) => {
            const riga = document.createElement('div');
            riga.className = 'h-8 flex items-center justify-center snap-center cursor-pointer select-none';
            riga.textContent = opzione.testo;
            // Cliccando una riga, la ruota la porta al centro
            riga.addEventListener('click', () => {
                ruota.scrollTo({ top: indice * ALTEZZA_RIGA, behavior: 'smooth' });
            });
            ruota.appendChild(riga);
        });

        // Quando la ruota smette di scorrere, legge quale riga è al centro
        let timer = null;
        ruota.addEventListener('scroll', () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                const indice = Math.min(opzioni.length - 1, Math.max(0, Math.round(ruota.scrollTop / ALTEZZA_RIGA)));
                selezione[numeroColonna] = opzioni[indice].valore;
                evidenzia(ruota, indice);
                aggiornaCampo();
            }, 80);
        });

        ruote.push({ ruota, opzioni });
        pannello.appendChild(ruota);
    });

    // Porta ogni ruota sul valore scelto (senza animazione)
    function posizionaRuote() {
        ruote.forEach(({ ruota, opzioni }, numeroColonna) => {
            const indice = Math.max(0, opzioni.findIndex((opzione) => opzione.valore === selezione[numeroColonna]));
            ruota.scrollTop = indice * ALTEZZA_RIGA;
            evidenzia(ruota, indice);
        });
    }

    // Cliccando fuori dal selettore, il pannello si chiude
    function chiudiFuori(evento) {
        if (!contenitore.contains(evento.target)) chiudi();
    }

    function apri() {
        pannello.classList.remove('hidden');
        campo.setAttribute('aria-expanded', 'true');
        // Le ruote si posizionano solo quando sono visibili
        posizionaRuote();
        document.addEventListener('click', chiudiFuori);
    }

    function chiudi() {
        pannello.classList.add('hidden');
        campo.setAttribute('aria-expanded', 'false');
        document.removeEventListener('click', chiudiFuori);
    }

    campo.addEventListener('click', () => {
        if (pannello.classList.contains('hidden')) apri();
        else chiudi();
    });

    contenitore.appendChild(campo);
    contenitore.appendChild(pannello);
    aggiornaCampo();

    return {
        elemento: contenitore,
        // Valori scelti, uno per colonna (es. ['10', '30'])
        leggi: () => [...selezione],
        // Imposta i valori, uno per colonna
        imposta: (valori) => {
            valori.forEach((valore, numeroColonna) => {
                selezione[numeroColonna] = valore;
            });
            aggiornaCampo();
        },
    };
}