
import { ChevronLeft, ChevronRight } from 'lucide';

import { chiamaApi } from '../api.js';

import { creaNavbar } from '../components/navbar.js';

import { creaCardSezione } from '../components/card-sezione.js';
import { creaIcona } from '../components/icona.js';
import { mostraToast } from '../components/messaggio_errore.js';

import { dataAAAAMMGG } from '../utility/date.js';

// Colore usato per i calendari che non ne hanno uno (lo stesso della pagina del calendario)
const COLORE_PREDEFINITO = '#cb6ce6';

// Periodi del resoconto: il valore va al backend, il resto serve ai testi della pagina
// (es. "ultime 6 settimane": "ultimi"/"ultime" cambia con il maschile e il femminile)
const PERIODI = [
    { valore: 'giornaliera', testo: 'Giornaliero', frase: 'In questo giorno', tipoTodo: 'giornaliere', ultimi: 'ultimi', plurale: 'giorni' },
    { valore: 'settimanale', testo: 'Settimanale', frase: 'In questa settimana', tipoTodo: 'settimanali', ultimi: 'ultime', plurale: 'settimane' },
    { valore: 'mensile', testo: 'Mensile', frase: 'In questo mese', tipoTodo: 'mensili', ultimi: 'ultimi', plurale: 'mesi' },
];

// Quanti periodi mostra il grafico dell'andamento (il periodo scelto e quelli prima)
const NUMERO_PERIODI_ANDAMENTO = 6;

// Colori delle barre: tutte nel colore del calendario, più chiare per rimandate e da fare
const CLASSI_BARRE = {
    completati: 'h-full rounded-full bg-(--colore-calendario)',
    rimandati: 'h-full rounded-full bg-(--colore-calendario)/60',
    da_fare: 'h-full rounded-full bg-(--colore-calendario)/30',
};

// Colonne del grafico dell'andamento: piena quella del periodo scelto, più chiare le altre
const CLASSE_COLONNA_SCELTA = 'w-full max-w-10 rounded-t-lg bg-(--colore-calendario)';
const CLASSE_COLONNA_ALTRA = 'w-full max-w-10 rounded-t-lg bg-(--colore-calendario)/50';

// Le date del resoconto arrivano come mezzanotte UTC: si scrivono in UTC, così il giorno resta quello giusto
const FORMATO_UTC = { timeZone: 'UTC' };

// Sposta una data di "quanti" periodi avanti (positivo) o indietro (negativo)
function spostaData(data, periodo, quanti) {
    const nuova = new Date(data);
    if (periodo === 'giornaliera') nuova.setDate(nuova.getDate() + quanti);
    if (periodo === 'settimanale') nuova.setDate(nuova.getDate() + 7 * quanti);
    if (periodo === 'mensile') {
        // Prima il giorno 1, così dal 31 non si salta un mese (es. 31 gennaio + 1 mese → marzo)
        nuova.setDate(1);
        nuova.setMonth(nuova.getMonth() + quanti);
    }
    return nuova;
}

// Testo del periodo per la riga in alto (es. "28 set – 4 ott 2026", "ottobre 2026")
function testoPeriodo(resoconto) {
    const inizio = new Date(resoconto.data_inizio);
    const fine = new Date(resoconto.data_fine);

    if (resoconto.periodo === 'giornaliera') {
        return inizio.toLocaleDateString('it-IT', { ...FORMATO_UTC, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }

    if (resoconto.periodo === 'settimanale') {
        const testoInizio = inizio.toLocaleDateString('it-IT', { ...FORMATO_UTC, day: 'numeric', month: 'short' });
        const testoFine = fine.toLocaleDateString('it-IT', { ...FORMATO_UTC, day: 'numeric', month: 'short', year: 'numeric' });
        return `${testoInizio} – ${testoFine}`;
    }

    return inizio.toLocaleDateString('it-IT', { ...FORMATO_UTC, month: 'long', year: 'numeric' });
}

// Testo corto sotto le colonne dell'andamento (es. "28/09", oppure "ott" per i mesi)
function etichettaBreve(resoconto) {
    const inizio = new Date(resoconto.data_inizio);

    if (resoconto.periodo === 'mensile') {
        return inizio.toLocaleDateString('it-IT', { ...FORMATO_UTC, month: 'short' });
    }

    return inizio.toLocaleDateString('it-IT', { ...FORMATO_UTC, day: '2-digit', month: '2-digit' });
}

// Testo del periodo migliore nella descrizione dell'andamento (es. "giovedì 1 ottobre", "la settimana del 28 settembre", "ottobre 2026")
function testoPeriodoMigliore(resoconto) {
    const inizio = new Date(resoconto.data_inizio);

    if (resoconto.periodo === 'giornaliera') {
        return inizio.toLocaleDateString('it-IT', { ...FORMATO_UTC, weekday: 'long', day: 'numeric', month: 'long' });
    }

    if (resoconto.periodo === 'settimanale') {
        return `la settimana del ${inizio.toLocaleDateString('it-IT', { ...FORMATO_UTC, day: 'numeric', month: 'long' })}`;
    }

    return inizio.toLocaleDateString('it-IT', { ...FORMATO_UTC, month: 'long', year: 'numeric' });
}

// Percentuale delle to do ancora da fare (il backend dà solo le percentuali di completate e rimandate)
function percentualeDaFare(resoconto) {
    return resoconto.totale > 0 ? Math.round((resoconto.da_fare / resoconto.totale) * 100) : 0;
}

// Descrizione scritta del periodo (femminile: "la to do")
function descrizioneResoconto(resoconto, periodo) {
    if (resoconto.totale === 0) {
        return `${periodo.frase} non c'erano to do ${periodo.tipoTodo}`;
    }

    const frase = `${periodo.frase} hai completato ${resoconto.completati} to do su ${resoconto.totale} (${resoconto.percentuale_completati}%)`;

    const dettagli = [];
    if (resoconto.rimandati === 1) dettagli.push('1 è stata rimandata');
    if (resoconto.rimandati > 1) dettagli.push(`${resoconto.rimandati} sono state rimandate`);
    if (resoconto.da_fare === 1) dettagli.push('1 è ancora da fare');
    if (resoconto.da_fare > 1) dettagli.push(`${resoconto.da_fare} sono ancora da fare`);

    return dettagli.length > 0 ? `${frase}. ${dettagli.join(' e ')}.` : `${frase}.`;
}

// Riga di una barra orizzontale: nome, barra piena in percentuale e numero
function creaBarra(etichetta, numero, percentuale, classeBarra) {
    const riga = document.createElement('div');
    riga.className = 'grid grid-cols-[6rem_1fr_32px] items-center gap-3';

    const testo = document.createElement('span');
    testo.className = 'text-sm';
    testo.textContent = etichetta;

    const fondo = document.createElement('div');
    fondo.className = 'h-3 overflow-hidden rounded-full bg-(--colore-calendario)/15';

    const pieno = document.createElement('div');
    pieno.className = classeBarra;
    // La larghezza cambia con i dati, quindi va nello stile
    pieno.style.width = `${percentuale}%`;
    fondo.appendChild(pieno);

    const valore = document.createElement('span');
    valore.className = 'text-right text-sm font-semibold';
    valore.textContent = numero;

    riga.appendChild(testo);
    riga.appendChild(fondo);
    riga.appendChild(valore);
    return riga;
}

export function paginaResoconti(calendarioId) {
    // Periodo scelto e giorno di riferimento (si parte da oggi, resoconto settimanale)
    let periodoScelto = PERIODI[1];
    let dataScelta = new Date();
    // Numero dell'ultima richiesta: se si cambia periodo in fretta, le risposte vecchie si ignorano
    let ultimaRichiesta = 0;

    // Sfondo e contenuto a tutta pagina
    const contenitore = document.createElement('div');
    contenitore.className = 'min-h-screen bg-base-200 p-4 flex flex-col gap-6';

    // Navbar con "Indietro": torna al calendario
    const bottoneIndietro = document.createElement('a');
    bottoneIndietro.href = `#/calendario/${calendarioId}`;
    bottoneIndietro.className = 'btn btn-ghost btn-sm';
    bottoneIndietro.appendChild(creaIcona(ChevronLeft, 16));
    bottoneIndietro.append('Indietro');

    const navbar = creaNavbar([bottoneIndietro]);

    // Intestazione: striscia del colore del calendario e titolo, come nelle impostazioni
    const intestazione = document.createElement('section');
    intestazione.className = 'card bg-base-100 border border-base-300 overflow-hidden';

    const striscia = document.createElement('div');
    striscia.className = 'h-2 bg-(--colore-calendario)';

    const titolo = document.createElement('h1');
    titolo.className = 'card-body flex-row items-center gap-3 text-2xl font-bold';

    const testoResoconti = document.createElement('span');
    testoResoconti.textContent = 'Resoconti to do';

    // Separatore grigio tra "Resoconti" e il nome del calendario
    const separatore = document.createElement('span');
    separatore.className = 'text-base-content/40';
    separatore.textContent = '·';

    // "Calendario" normale e il nome nel colore del calendario
    const testoCalendario = document.createElement('span');
    testoCalendario.append('Calendario ');

    const nomeCalendario = document.createElement('span');
    nomeCalendario.className = 'text-(--colore-calendario)';
    testoCalendario.appendChild(nomeCalendario);

    titolo.appendChild(testoResoconti);
    titolo.appendChild(separatore);
    titolo.appendChild(testoCalendario);
    intestazione.appendChild(striscia);
    intestazione.appendChild(titolo);

    // Scelta del periodo: schede come quelle delle viste, e frecce per spostarsi 
    const { card: cardScelta, corpo: corpoScelta } = creaCardSezione();

    const rigaScelta = document.createElement('div');
    rigaScelta.className = 'flex flex-wrap items-center justify-between gap-3';

    const schede = document.createElement('div');
    schede.className = 'tabs tabs-box';

    PERIODI.forEach((periodo) => {
        const scheda = document.createElement('button');
        scheda.type = 'button';
        scheda.className = periodo === periodoScelto ? 'tab tab-active' : 'tab';
        scheda.textContent = periodo.testo;

        scheda.addEventListener('click', () => {
            periodoScelto = periodo;
            schede.querySelectorAll('.tab').forEach((elemento) => elemento.classList.remove('tab-active'));
            scheda.classList.add('tab-active');
            caricaResoconti();
        });

        schede.appendChild(scheda);
    });

    const navigazione = document.createElement('div');
    navigazione.className = 'flex items-center gap-2';

    const bottonePrima = document.createElement('button');
    bottonePrima.type = 'button';
    bottonePrima.className = 'btn btn-ghost btn-sm btn-circle';
    bottonePrima.setAttribute('aria-label', 'Periodo precedente');
    bottonePrima.appendChild(creaIcona(ChevronLeft, 16));

    const testoDelPeriodo = document.createElement('span');
    testoDelPeriodo.className = 'min-w-40 text-center font-medium';

    const bottoneDopo = document.createElement('button');
    bottoneDopo.type = 'button';
    bottoneDopo.className = 'btn btn-ghost btn-sm btn-circle';
    bottoneDopo.setAttribute('aria-label', 'Periodo successivo');
    bottoneDopo.appendChild(creaIcona(ChevronRight, 16));

    bottonePrima.addEventListener('click', () => {
        dataScelta = spostaData(dataScelta, periodoScelto.valore, -1);
        caricaResoconti();
    });

    bottoneDopo.addEventListener('click', () => {
        dataScelta = spostaData(dataScelta, periodoScelto.valore, 1);
        caricaResoconti();
    });

    navigazione.appendChild(bottonePrima);
    navigazione.appendChild(testoDelPeriodo);
    navigazione.appendChild(bottoneDopo);
    rigaScelta.appendChild(schede);
    rigaScelta.appendChild(navigazione);

    // Il resoconto conta solo le to do dello stesso tipo del periodo: lo scrivo nella pagina, così i numeri non sorprendono
    const notaTipo = document.createElement('p');
    notaTipo.className = 'text-sm text-base-content/70';

    corpoScelta.appendChild(rigaScelta);
    corpoScelta.appendChild(notaTipo);

    // Card del periodo scelto: cerchio con la percentuale, barre e descrizione
    const { card: cardPeriodo, corpo: corpoPeriodo } = creaCardSezione();

    const rigaGrafici = document.createElement('div');
    rigaGrafici.className = 'flex flex-wrap items-center gap-8';

    // Cerchio di daisyUI che si riempie con la percentuale delle completate
    const cerchio = document.createElement('div');
    cerchio.className = 'radial-progress shrink-0 text-xl font-bold text-(--colore-calendario)';
    cerchio.setAttribute('role', 'progressbar');
    cerchio.style.setProperty('--size', '128px');
    cerchio.style.setProperty('--thickness', '12px');

    const barre = document.createElement('div');
    barre.className = 'flex min-w-60 flex-1 flex-col gap-3';

    const descrizione = document.createElement('p');

    rigaGrafici.appendChild(cerchio);
    rigaGrafici.appendChild(barre);
    corpoPeriodo.appendChild(rigaGrafici);
    corpoPeriodo.appendChild(descrizione);

    // Card dell'andamento: colonne con la percentuale delle completate negli ultimi periodi
    const { card: cardAndamento, corpo: corpoAndamento } = creaCardSezione();

    const titoloAndamento = document.createElement('h2');
    titoloAndamento.className = 'card-title text-lg';

    const colonne = document.createElement('div');
    colonne.className = 'flex items-end gap-3';

    const descrizioneAndamento = document.createElement('p');

    corpoAndamento.appendChild(titoloAndamento);
    corpoAndamento.appendChild(colonne);
    corpoAndamento.appendChild(descrizioneAndamento);

    // ordine composizione card: card una sotto l'altra, al centro
    const sezione = document.createElement('div');
    sezione.className = 'flex flex-col gap-4 w-full max-w-3xl mx-auto';

    const caricamento = document.createElement('span');
    caricamento.className = 'loading loading-spinner loading-md text-primary self-center';
    sezione.appendChild(caricamento);

    contenitore.appendChild(navbar);
    contenitore.appendChild(sezione);

    // Chiede al backend il resoconto del periodo che contiene la data indicata
    function chiediResoconto(data) {
        return chiamaApi(`/todos/resoconto/${calendarioId}?periodo=${periodoScelto.valore}&data=${dataAAAAMMGG(data)}`);
    }

    // Disegna cerchio, barre e descrizione del periodo scelto
    function mostraPeriodo(resoconto) {
        testoDelPeriodo.textContent = testoPeriodo(resoconto);
        notaTipo.textContent = `Il resoconto ${periodoScelto.testo.toLowerCase()} conta solo le to do ${periodoScelto.tipoTodo}`;

        // Il valore cambia con i dati, quindi va nello stile (daisyUI lo legge da --value)
        cerchio.style.setProperty('--value', resoconto.percentuale_completati);
        cerchio.setAttribute('aria-valuenow', resoconto.percentuale_completati);
        cerchio.textContent = `${resoconto.percentuale_completati}%`;

        barre.innerHTML = '';
        barre.appendChild(creaBarra('Completate', resoconto.completati, resoconto.percentuale_completati, CLASSI_BARRE.completati));
        barre.appendChild(creaBarra('Rimandate', resoconto.rimandati, resoconto.percentuale_rimandati, CLASSI_BARRE.rimandati));
        barre.appendChild(creaBarra('Da fare', resoconto.da_fare, percentualeDaFare(resoconto), CLASSI_BARRE.da_fare));

        descrizione.textContent = descrizioneResoconto(resoconto, periodoScelto);
    }

    // Disegna le colonne dell'andamento: l'ultima è il periodo scelto
    function mostraAndamento(resoconti) {
        titoloAndamento.textContent = `Andamento: ${periodoScelto.ultimi} ${NUMERO_PERIODI_ANDAMENTO} ${periodoScelto.plurale}`;
        colonne.innerHTML = '';

        resoconti.forEach((resoconto, posizione) => {
            const colonna = document.createElement('div');
            colonna.className = 'flex flex-1 flex-col items-center gap-1';

            const percentuale = document.createElement('span');
            percentuale.className = 'text-xs font-semibold';
            percentuale.textContent = resoconto.totale > 0 ? `${resoconto.percentuale_completati}%` : '–';

            // "Pista" alta fissa: la colonna dentro è alta in percentuale
            const pista = document.createElement('div');
            pista.className = 'flex h-32 w-full items-end justify-center';

            const barra = document.createElement('div');
            barra.className = posizione === resoconti.length - 1 ? CLASSE_COLONNA_SCELTA : CLASSE_COLONNA_ALTRA;
            // L'altezza cambia con i dati, quindi va nello stile (almeno 4px, così anche lo 0% si vede)
            barra.style.height = `max(4px, ${resoconto.percentuale_completati}%)`;
            pista.appendChild(barra);

            const etichetta = document.createElement('span');
            etichetta.className = 'text-xs text-base-content/60';
            etichetta.textContent = etichettaBreve(resoconto);

            colonna.appendChild(percentuale);
            colonna.appendChild(pista);
            colonna.appendChild(etichetta);
            colonne.appendChild(colonna);
        });

        // Descrizione: il periodo con la percentuale più alta, contando solo quelli con delle to do
        const conTodo = resoconti.filter((resoconto) => resoconto.totale > 0);

        if (conTodo.length === 0) {
            descrizioneAndamento.textContent = `In questi periodi non c'erano to do ${periodoScelto.tipoTodo}`;
            return;
        }

        const migliore = conTodo.reduce((primo, altro) => (altro.percentuale_completati > primo.percentuale_completati ? altro : primo));
        descrizioneAndamento.textContent = `Il periodo migliore è stato ${testoPeriodoMigliore(migliore)}, con il ${migliore.percentuale_completati}% delle to do completate.`;
    }
    // Caricamento dal backend: il periodo scelto e quelli prima, tutti insieme
    async function caricaResoconti() {
        const numeroRichiesta = ++ultimaRichiesta;

        try {
            const date = Array.from({ length: NUMERO_PERIODI_ANDAMENTO }, (_, posizione) =>
                spostaData(dataScelta, periodoScelto.valore, posizione - (NUMERO_PERIODI_ANDAMENTO - 1)));
            const resoconti = await Promise.all(date.map((data) => chiediResoconto(data)));

            // Nel frattempo è partita un'altra richiesta: questa risposta è vecchia
            if (numeroRichiesta !== ultimaRichiesta) return;

            mostraPeriodo(resoconti[resoconti.length - 1]);
            mostraAndamento(resoconti);
        } catch (errore) {
            mostraToast(errore.message);
        }
    }

    // Avvio: prima nome e colore del calendario, poi i resoconti
    async function avvia() {
        try {
            const calendario = await chiamaApi(`/calendari/dettagli/${calendarioId}`);
            // Il colore cambia per ogni calendario: va nella variabile usata dalle classi (striscia, barre, cerchio)
            contenitore.style.setProperty('--colore-calendario', calendario.colore || COLORE_PREDEFINITO);
            nomeCalendario.textContent = calendario.nome;

            caricamento.remove();
            sezione.appendChild(intestazione);
            sezione.appendChild(cardScelta);
            sezione.appendChild(cardPeriodo);
            sezione.appendChild(cardAndamento);

            await caricaResoconti();
        } catch (errore) {
            // Calendario inesistente o senza accesso: si torna all'area personale
            mostraToast(errore.message);
            window.location.hash = '#/area-personale';
        }
    }

    avvia();

    return contenitore;
}