
import { creaFinestra } from './finestra.js';

// Chiede una conferma in una finestra, con un testo e dei bottoni a scelta
// "scelte" è una lista di { testo, valore, pericolosa } 
// le scelte "pericolose" (es. elimina) sono rosse
// Restituisce il valore scelto, oppure null se si chiude
export function chiediConferma(titolo, testo, scelte) {
    return new Promise((risolvi) => {
        let sceltaFatta = null;

        const contenuto = document.createElement('div');
        contenuto.className = 'flex flex-col gap-4';

        const paragrafo = document.createElement('p');
        paragrafo.textContent = testo;

        const bottoni = document.createElement('div');
        bottoni.className = 'flex flex-wrap justify-end gap-2';

        const finestra = creaFinestra(titolo, contenuto);

        scelte.forEach((scelta) => {
            const bottone = document.createElement('button');
            bottone.type = 'button';
            bottone.className = scelta.pericolosa ? 'btn btn-outline btn-error' : 'btn btn-outline';
            bottone.textContent = scelta.testo;
            bottone.addEventListener('click', () => {
                sceltaFatta = scelta.valore;
                finestra.chiudi();
            });
            bottoni.appendChild(bottone);
        });

        const bottoneAnnulla = document.createElement('button');
        bottoneAnnulla.type = 'button';
        bottoneAnnulla.className = 'btn btn-outline';
        bottoneAnnulla.textContent = 'Annulla';
        bottoneAnnulla.addEventListener('click', () => finestra.chiudi());
        bottoni.prepend(bottoneAnnulla);

        contenuto.appendChild(paragrafo);
        contenuto.appendChild(bottoni);

        // Quando la finestra si chiude, in qualsiasi modo (un bottone, la X, Esc o il clic sullo sfondo),
        // dà la risposta a chi l'ha aperta: il valore del bottone premuto, oppure null se si è chiusa senza scegliere
        // Poi si toglie dalla pagina
        finestra.elemento.addEventListener('close', () => {
            finestra.elemento.remove();
            risolvi(sceltaFatta);
        });

        document.body.appendChild(finestra.elemento);
        finestra.apri();
    });
}