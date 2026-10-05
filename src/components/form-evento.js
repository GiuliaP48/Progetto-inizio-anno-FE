
import { chiamaApi } from '../api.js';

import { creaTavolozzaColori } from './tavolozza-colori.js';

import { chiediConferma } from './conferma.js';

import { creaSelettoreOrari } from './selettore-orari.js';

import { creaSelettoreTag } from './selettore-tag.js';

import { aggiungiCalendariettoAlCampo } from './calendarietto.js';

import {
    aggiungiCampo,
    aggiungiAreaTesto,
    aggiungiSelezione,
    creaTestoErrore,
    mostraErrore,
    creaBottoneInvio,
    impostaCaricamento,
} from './form.js';

import { creaInfoAutori } from './info-autori.js';

import {
    dataAAAAMMGG,
    oraHHMM,
    dataOraPerBackend,
    giornoTuttoIlGiorno,
    formattaData,
} from '../utility/date.js';

// Lunghezze massime, le stesse controllate dal backend
const LUNGHEZZA_MASSIMA_TITOLO = 100;
const LUNGHEZZA_MASSIMA_DESCRIZIONE = 1000;

// Ricorrenze: il valore va al backend, il testo si vede nel form
export const RICORRENZE = [
    { valore: '', testo: 'Nessuna' },
    { valore: 'giornaliera', testo: 'Ogni giorno' },
    { valore: 'settimanale', testo: 'Ogni settimana' },
    { valore: 'mensile', testo: 'Ogni mese' },
    { valore: 'annuale', testo: 'Ogni anno' },
];

// Durata massima di una serie, in anni, per ogni ricorrenza: gli stessi limiti del backend
// Se "Fino al" resta vuoto, la serie arriva comunque fino a qui
const ANNI_MASSIMI_RICORRENZA = {
    giornaliera: 1,
    settimanale: 2,
    mensile: 3,
    annuale: 5,
};

// Avvisi: minuti prima dell'inizio dell'evento ('' = nessun avviso).
// Con "Personalizzato" si scelgono giorni, ore e minuti insieme (es. 1 ora e 30 minuti)
const AVVISI = [
    { valore: '', testo: 'Nessun avviso' },
    { valore: '0', testo: "All'inizio dell'evento" },
    { valore: '5', testo: '5 minuti prima' },
    { valore: '15', testo: '15 minuti prima' },
    { valore: '30', testo: '30 minuti prima' },
    { valore: '60', testo: '1 ora prima' },
    { valore: '1440', testo: '1 giorno prima' },
    { valore: 'personalizzato', testo: 'Personalizzato' },
];

// Minuti in un'ora e in un giorno, per convertire l'avviso personalizzato
export const MINUTI_IN_UN_ORA = 60;
export const MINUTI_IN_UN_GIORNO = 24 * 60;

// Testo con il numero e la parola giusta al singolare o al plurale (es. "1 ora", "2 ore")
export function quantita(numero, singolare, plurale) {
    return `${numero} ${Number(numero) === 1 ? singolare : plurale}`;
}

// Inizio della ripetizione successiva di un evento (es. ogni settimana --> 7 giorni dopo).
// Serve a controllare che ogni ripetizione finisca prima che parta quella dopo
function prossimaRipetizione(data, ricorrenza) {
    const prossima = new Date(data);
    if (ricorrenza === 'giornaliera') prossima.setDate(prossima.getDate() + 1);
    if (ricorrenza === 'settimanale') prossima.setDate(prossima.getDate() + 7);
    if (ricorrenza === 'mensile') prossima.setMonth(prossima.getMonth() + 1);
    if (ricorrenza === 'annuale') prossima.setFullYear(prossima.getFullYear() + 1);
    return prossima;
}

// Numeri da 0 a "quanti-1" con due cifre (es. 0 → "00"): servono per ore e minuti
function numeriDueCifre(quanti) {
    return Array.from({ length: quanti }, (_, numero) => {
        const testo = String(numero).padStart(2, '0');
        return { valore: testo, testo };
    });
}

// Selettore a ruote per l'ora: una ruota per le ore e una per i minuti
function creaSelettoreOra(etichetta) {
    return creaSelettoreOrari({
        etichetta,
        colonne: [numeriDueCifre(24), numeriDueCifre(60)],
        formatta: ([ore, minuti]) => `${ore}:${minuti}`,
    });
}

// Opzioni di una ruota da 0 a "quanti-1", con l'unità scritta accanto (es. "2 ore")
function opzioniConUnita(quanti, singolare, plurale) {
    return Array.from({ length: quanti }, (_, numero) => ({
        valore: String(numero),
        testo: quantita(numero, singolare, plurale),
    }));
}

// Selettore a ruote per l'avviso personalizzato: giorni, ore e minuti insieme, così non serve fare i conti (es. "1 ora e 30 minuti prima")
function creaSelettoreAvviso() {
    return creaSelettoreOrari({
        etichetta: 'Avviso personalizzato',
        colonne: [
            opzioniConUnita(31, 'giorno', 'giorni'),
            opzioniConUnita(24, 'ora', 'ore'),
            opzioniConUnita(60, 'minuto', 'minuti'),
        ],
        // Scrive solo le parti diverse da zero (es. "1 giorno e 30 minuti prima")
        formatta: ([giorni, ore, minuti]) => {
            const parti = [];
            if (giorni !== '0') parti.push(quantita(giorni, 'giorno', 'giorni'));
            if (ore !== '0') parti.push(quantita(ore, 'ora', 'ore'));
            if (minuti !== '0') parti.push(quantita(minuti, 'minuto', 'minuti'));

            if (parti.length === 0) return "All'inizio dell'evento";

            const ultima = parti.pop();
            return parti.length > 0 ? `${parti.join(', ')} e ${ultima} prima` : `${ultima} prima`;
        },
    });
}

// Crea la riga "Inizio" o "Fine": etichetta, giorno e ora affiancati
// L'ora si sceglie con le ruote di ore e minuti
// Restituisce il campo del giorno e il selettore dell'ora, così il form può leggerli e nascondere l'ora
function aggiungiDataOra(form, id, etichetta) {
    const testo = document.createElement('p');
    testo.textContent = etichetta;

    const riga = document.createElement('div');
    riga.className = 'grid grid-cols-2 items-start gap-2';

    const giorno = document.createElement('input');
    giorno.id = `${id}-giorno`;
    giorno.type = 'date';
    giorno.className = 'input w-full';
    giorno.required = true;
    giorno.setAttribute('aria-label', `${etichetta}: giorno`);

    const ora = creaSelettoreOra(`${etichetta}: ora`);

    riga.appendChild(giorno);
    // Il calendarietto Cally al posto di quello del browser
    aggiungiCalendariettoAlCampo(giorno);
    riga.appendChild(ora.elemento);
    form.appendChild(testo);
    form.appendChild(riga);

    return { testo, riga, giorno, ora };
}

// Form per creare o modificare un evento
// - calendario: il calendario in cui si trova l'evento (serve id e colore)
// - evento: l'evento da modificare, come arriva dal backend (assente = nuovo evento)
// - inizioProposto: data e ora da cui parte un nuovo evento (es. il giorno cliccato)
// - alSalvataggio: chiamata con il messaggio da mostrare dopo creazione, modifica o eliminazione
export function creaFormEvento({ calendario, evento = null, inizioProposto = new Date(), alSalvataggio }) {
    const inModifica = evento !== null;
    const ricorrente = inModifica && Boolean(evento.ricorrenza);

    const form = document.createElement('form');
    form.className = 'flex flex-col gap-3';

    // Gli errori li mostro io con la scritta rossa, non il fumetto del browser
    form.noValidate = true;

    // Titolo e descrizione 
    const inputTitolo = aggiungiCampo(form, 'evento-titolo', 'Titolo', 'text');
    inputTitolo.maxLength = LUNGHEZZA_MASSIMA_TITOLO;
    // All'apertura della finestra il cursore parte da qui, così si può scrivere subito
    inputTitolo.autofocus = true;

    const areaDescrizione = aggiungiAreaTesto(form, 'evento-descrizione', 'Descrizione (facoltativa)');
    areaDescrizione.maxLength = LUNGHEZZA_MASSIMA_DESCRIZIONE;

    // Tutto il giorno
    const etichettaTuttoIlGiorno = document.createElement('label');
    etichettaTuttoIlGiorno.className = 'flex items-center gap-3 cursor-pointer';

    const interruttoreTuttoIlGiorno = document.createElement('input');
    interruttoreTuttoIlGiorno.type = 'checkbox';
    interruttoreTuttoIlGiorno.className = 'toggle toggle-primary';

    etichettaTuttoIlGiorno.append('Tutto il giorno');
    etichettaTuttoIlGiorno.appendChild(interruttoreTuttoIlGiorno);
    form.appendChild(etichettaTuttoIlGiorno);

    // Inizio e fine
    const inizio = aggiungiDataOra(form, 'evento-inizio', 'Inizio');
    const fine = aggiungiDataOra(form, 'evento-fine', 'Fine');

    // Un evento di tutto il giorno dura solo quel giorno: si sceglie il giorno e spariscono gli orari e tutta la riga "Fine"
    function aggiornaOrari() {
        const tuttoIlGiorno = interruttoreTuttoIlGiorno.checked;

        inizio.testo.textContent = tuttoIlGiorno ? 'Giorno' : 'Inizio';
        inizio.ora.elemento.classList.toggle('hidden', tuttoIlGiorno);

        fine.testo.classList.toggle('hidden', tuttoIlGiorno);
        fine.riga.classList.toggle('hidden', tuttoIlGiorno);
        // Un campo nascosto non deve essere obbligatorio, altrimenti il form non parte
        fine.giorno.required = !tuttoIlGiorno;
    }

    interruttoreTuttoIlGiorno.addEventListener('change', aggiornaOrari);

    // Ricorrenza: si sceglie solo alla creazione
    let selectRicorrenza = null;
    let inputFineRicorrenza = null;
    let selectAmbito = null;

    if (!inModifica) {
        selectRicorrenza = aggiungiSelezione(form, 'evento-ricorrenza', 'Ricorrenza', RICORRENZE);

        // "Fino al" compare solo se l'evento si ripete
        const sezioneFineRicorrenza = document.createElement('div');
        sezioneFineRicorrenza.className = 'flex flex-col gap-3 hidden';
        inputFineRicorrenza = aggiungiCampo(sezioneFineRicorrenza, 'evento-fine-ricorrenza', 'Fino al (facoltativo)', 'date');
        inputFineRicorrenza.required = false;
        aggiungiCalendariettoAlCampo(inputFineRicorrenza);

        // Scritta grigia sotto "Fino al": dice fin quando si ripete l'evento se il campo resta vuoto
        const testoFineRicorrenza = document.createElement('p');
        testoFineRicorrenza.className = 'text-sm text-base-content/60';
        sezioneFineRicorrenza.appendChild(testoFineRicorrenza);
        form.appendChild(sezioneFineRicorrenza);

        // Data massima di "Fino al" e scritta grigia, in base alla ricorrenza e al giorno di inizio
        // (es. ogni giorno dal 12/10/2026 --> al massimo il 12/10/2027): nel calendarietto i giorni dopo diventano grigi
        function aggiornaFineRicorrenza() {
            const ricorrenza = selectRicorrenza.value;
            sezioneFineRicorrenza.classList.toggle('hidden', ricorrenza === '');
            // Senza ricorrenza "Fino al" non serve: si svuota, così non resta una data vecchia nascosta
            if (ricorrenza === '') {
                inputFineRicorrenza.value = '';
                // Una data scritta a metà (es. solo l'anno) non si cancella con value = '': cambiando tipo e rimettendolo il browser svuota anche quella
                inputFineRicorrenza.type = 'text';
                inputFineRicorrenza.type = 'date';
                return;
            }

            const anni = ANNI_MASSIMI_RICORRENZA[ricorrenza];
            testoFineRicorrenza.textContent = `Se vuoto: si ripete per ${quantita(anni, 'anno', 'anni')}`;

            // Senza giorno di inizio non c'è un limite da calcolare
            if (!inizio.giorno.value) {
                inputFineRicorrenza.max = '';
                return;
            }

            const dataMassima = new Date(`${inizio.giorno.value}T00:00:00`);
            dataMassima.setFullYear(dataMassima.getFullYear() + anni);
            inputFineRicorrenza.max = dataAAAAMMGG(dataMassima);
        }

        // Il limite cambia sia con la ricorrenza sia con il giorno di inizio
        selectRicorrenza.addEventListener('change', aggiornaFineRicorrenza);
        inizio.giorno.addEventListener('change', aggiornaFineRicorrenza);
    } else if (ricorrente) {
        // In modifica la ricorrenza non si può cambiare: si mostra solo come informazione
        const testoRicorrenza = RICORRENZE.find((ricorrenza) => ricorrenza.valore === evento.ricorrenza).testo;
        const informazione = document.createElement('p');
        informazione.className = 'text-sm text-base-content/70';
        informazione.textContent = evento.fine_ricorrenza
            ? `${testoRicorrenza} fino al ${formattaData(evento.fine_ricorrenza)}`
            : testoRicorrenza;
        form.appendChild(informazione);

        selectAmbito = aggiungiSelezione(form, 'evento-ambito', 'Applica le modifiche a', [
            { valore: 'singola', testo: 'Solo questo evento' },
            { valore: 'serie', testo: 'Tutta la serie' },
        ]);
    }

    // Colore: parte da quello dell'evento o del calendario
    const etichettaColore = document.createElement('p');
    etichettaColore.textContent = 'Colore';
    // Il colore del calendario è il primo cerchio, così si riconosce e si può riscegliere
    const coloriAggiuntivi = calendario.colore
        ? [{ colore: calendario.colore, descrizione: 'Colore del calendario' }]
        : [];
    const tavolozza = creaTavolozzaColori((inModifica ? evento.colore : calendario.colore) || undefined, coloriAggiuntivi);
    form.appendChild(etichettaColore);
    form.appendChild(tavolozza.elemento);

    // Tag: badge da accendere e spegnere
    const etichettaTag = document.createElement('p');
    etichettaTag.textContent = 'Tag';
    const selettoreTag = creaSelettoreTag(calendario, inModifica ? evento.tags.map((tag) => tag.id) : []);
    form.appendChild(etichettaTag);
    form.appendChild(selettoreTag.elemento);

    // Collega e scollega i tag dell'evento
    // - serie: true per mettere e togliere i tag a tutta la serie (eventi che si ripetono)
    // Su un solo evento si mandano solo i tag cambiati; sulla serie si mandano tutti i tag accesi,
    // così anche quelli messi prima solo a questo evento passano alle altre ripetizioni
    async function salvaTag(eventoId, idPrima, serie) {
        const idDopo = selettoreTag.leggi();
        const rottaAggiungi = serie ? 'aggiungi-tag-serie' : 'aggiungi-tag';
        const rottaRimuovi = serie ? 'rimuovi-tag-serie' : 'rimuovi-tag';
        const daAggiungere = serie ? idDopo : idDopo.filter((id) => !idPrima.includes(id));

        for (const tagId of daAggiungere) {
            try {
                await chiamaApi(`/eventi/${rottaAggiungi}/${eventoId}`, { metodo: 'POST', corpo: { tag_id: tagId } });
            } catch (errore) {
                // 409: tutta la serie ha già questo tag, quindi va già bene così
                if (errore.stato !== 409) throw errore;
            }
        }

        for (const tagId of idPrima.filter((id) => !idDopo.includes(id))) {
            await chiamaApi(`/eventi/${rottaRimuovi}/${eventoId}`, { metodo: 'DELETE', corpo: { tag_id: tagId } });
        }
    }

    // Avviso
    const selectAvviso = aggiungiSelezione(form, 'evento-avviso', 'Avviso', AVVISI);

    // Avviso personalizzato: ruote di giorni, ore e minuti, compaiono solo con "Personalizzato", parte da "15 minuti prima"
    const selettoreAvviso = creaSelettoreAvviso();
    selettoreAvviso.imposta(['0', '0', '15']);
    form.appendChild(selettoreAvviso.elemento);

    function aggiornaAvviso() {
        selettoreAvviso.elemento.classList.toggle('hidden', selectAvviso.value !== 'personalizzato');
    }

    selectAvviso.addEventListener('change', aggiornaAvviso);

    // Errori e bottoni
    const errore = creaTestoErrore();
    form.appendChild(errore);

    const bottoneSalva = creaBottoneInvio(inModifica ? 'Salva modifiche' : 'Crea evento');
    form.appendChild(bottoneSalva);

    let bottoneElimina = null;
    if (inModifica) {
        bottoneElimina = document.createElement('button');
        bottoneElimina.type = 'button';
        bottoneElimina.className = 'btn btn-outline btn-error';
        bottoneElimina.textContent = 'Elimina evento';
        form.appendChild(bottoneElimina);

        // In fondo: chi ha creato e modificato l'evento e quando
        form.appendChild(creaInfoAutori(evento));
    }

    // Valori di partenza
    if (inModifica) {
        inputTitolo.value = evento.titolo;
        areaDescrizione.value = evento.descrizione || '';
        interruttoreTuttoIlGiorno.checked = evento.tutto_il_giorno;
        impostaAvviso(evento.avviso);

        if (evento.tutto_il_giorno) {
            inizio.giorno.value = giornoTuttoIlGiorno(evento.data_inizio);
            fine.giorno.value = giornoTuttoIlGiorno(evento.data_fine);
            inizio.ora.imposta(['09', '00']);
            fine.ora.imposta(['10', '00']);
        } else {
            inizio.giorno.value = dataAAAAMMGG(evento.data_inizio);
            inizio.ora.imposta(oraHHMM(evento.data_inizio).split(':'));
            fine.giorno.value = dataAAAAMMGG(evento.data_fine);
            fine.ora.imposta(oraHHMM(evento.data_fine).split(':'));
        }
    } else {
        // Nuovo evento: dura un'ora a partire dall'inizio proposto
        const inizioEvento = new Date(inizioProposto);
        const fineEvento = new Date(inizioEvento.getTime() + 60 * 60 * 1000);
        inizio.giorno.value = dataAAAAMMGG(inizioEvento);
        inizio.ora.imposta(oraHHMM(inizioEvento).split(':'));
        fine.giorno.value = dataAAAAMMGG(fineEvento);
        fine.ora.imposta(oraHHMM(fineEvento).split(':'));
    }

    aggiornaOrari();
    aggiornaAvviso();

    // Mette nel form un avviso salvato (in minuti): se è tra quelli proposti lo sceglie dal menu,
    // altrimenti usa "Personalizzato" dividendolo in giorni, ore e minuti (es. 90 --> 1 ora e 30 minuti)
    function impostaAvviso(minuti) {
        if (minuti === null || minuti === undefined) {
            selectAvviso.value = '';
        } else if (AVVISI.some((avviso) => avviso.valore === String(minuti))) {
            selectAvviso.value = String(minuti);
        } else {
            selectAvviso.value = 'personalizzato';
            const giorni = Math.floor(minuti / MINUTI_IN_UN_GIORNO);
            const ore = Math.floor((minuti % MINUTI_IN_UN_GIORNO) / MINUTI_IN_UN_ORA);
            selettoreAvviso.imposta([String(giorni), String(ore), String(minuti % MINUTI_IN_UN_ORA)]);
        }
    }

    // Legge l'avviso scelto, in minuti (null = nessun avviso)
    function leggiAvviso() {
        if (selectAvviso.value === '') return null;
        if (selectAvviso.value === 'personalizzato') {
            const [giorni, ore, minuti] = selettoreAvviso.leggi().map(Number);
            return giorni * MINUTI_IN_UN_GIORNO + ore * MINUTI_IN_UN_ORA + minuti;
        }
        return Number(selectAvviso.value);
    }

    // Legge i campi e prepara i dati per il backend
    // Gli eventi di tutto il giorno si mandano come sola data (AAAA-MM-GG)
    function leggiDati() {
        const tuttoIlGiorno = interruttoreTuttoIlGiorno.checked;

        const dati = {
            titolo: inputTitolo.value.trim(),
            tutto_il_giorno: tuttoIlGiorno,
            data_inizio: tuttoIlGiorno ? inizio.giorno.value : dataOraPerBackend(inizio.giorno.value, inizio.ora.leggi().join(':')),
            // Tutto il giorno: la fine è lo stesso giorno dell'inizio
            data_fine: tuttoIlGiorno ? inizio.giorno.value : dataOraPerBackend(fine.giorno.value, fine.ora.leggi().join(':')),

        };

        const descrizione = areaDescrizione.value.trim();
        const avviso = leggiAvviso();

        // Se il colore è quello del calendario non si salva: così l'evento lo segue anche se cambia
        const colore = tavolozza.leggiColore();
        const coloreDelCalendario = calendario.colore && colore.toLowerCase() === calendario.colore.toLowerCase();

        if (inModifica) {
            // In modifica null toglie descrizione, avviso e colore proprio
            dati.descrizione = descrizione || null;
            dati.avviso = avviso;
            dati.colore = coloreDelCalendario ? null : colore;
        } else {
            if (descrizione) dati.descrizione = descrizione;
            if (avviso !== null) dati.avviso = avviso;
            if (!coloreDelCalendario) dati.colore = colore;
        }

        return dati;
    }

    // Controlli prima di inviare: restituisce il messaggio di errore, oppure null se va tutto bene
    function controllaDati(dati) {
        if (dati.titolo === '') {
            return 'Il titolo è obbligatorio';
        }

        if (dati.data_fine < dati.data_inizio) {
            return "La fine non può essere prima dell'inizio";
        }

        // Evento che si ripete: deve finire prima della ripetizione successiva, altrimenti le ripetizioni si sovrappongono (es. ogni giorno per 11 giorni)
        // Può passare la mezzanotte (es. turno di notte 22:00–06:00 ogni giorno)
        // In creazione si guarda la ricorrenza scelta, in modifica quella che l'evento ha già (vale sia per "Solo questo evento" sia per "Tutta la serie")
        const ricorrenza = inModifica ? evento.ricorrenza : selectRicorrenza.value;

        if (ricorrenza && !interruttoreTuttoIlGiorno.checked) {
            const inizioEvento = new Date(`${inizio.giorno.value}T${inizio.ora.leggi().join(':')}`);
            const fineEvento = new Date(`${fine.giorno.value}T${fine.ora.leggi().join(':')}`);

            if (fineEvento >= prossimaRipetizione(inizioEvento, ricorrenza)) {
                const testoRicorrenza = RICORRENZE.find((voce) => voce.valore === ricorrenza).testo;
                return `Un evento che si ripete ${testoRicorrenza.toLowerCase()} deve finire prima della ripetizione successiva`;
            }
        }

        // "Fino al" scritto a metà (es. solo l'anno): per il browser è vuoto, ma chi l'ha scritto voleva una data
        if (selectRicorrenza && selectRicorrenza.value !== '' && inputFineRicorrenza.validity.badInput) {
            return '"Fino al" non è una data completa';
        }
        // "Fino al" oltre la data massima: nel calendarietto i giorni dopo sono grigi,
        // ma la data si può ancora scrivere a mano
        if (selectRicorrenza && selectRicorrenza.value !== ''
            && inputFineRicorrenza.value && inputFineRicorrenza.max
            && inputFineRicorrenza.value > inputFineRicorrenza.max) {
            const anni = ANNI_MASSIMI_RICORRENZA[selectRicorrenza.value];
            return `"Fino al" può essere al massimo ${quantita(anni, 'anno', 'anni')} dopo l'inizio`;
        }
        return null;
    }

    // Invio del form al backend
    form.addEventListener('submit', async (eventoInvio) => {
        eventoInvio.preventDefault();

        const dati = leggiDati();
        const problema = controllaDati(dati);

        if (problema) {
            mostraErrore(errore, problema);
            return;
        }

        impostaCaricamento(bottoneSalva, true);

        try {
            if (!inModifica) {
                dati.calendario_ids = [calendario.id];

                if (selectRicorrenza.value !== '') {
                    dati.ricorrenza = selectRicorrenza.value;
                    if (inputFineRicorrenza.value) {
                        dati.fine_ricorrenza = inputFineRicorrenza.value;
                    }
                }

                // Il backend restituisce l'evento creato: con il suo id si collegano i tag scelti
                const nuovoEvento = await chiamaApi('/eventi/crea', { metodo: 'POST', corpo: dati });
                // Se l'evento si ripete, i tag vanno a tutte le ripetizioni
                await salvaTag(nuovoEvento.id, [], Boolean(dati.ricorrenza));
                alSalvataggio('Evento creato!');

            } else {
                // Negli eventi ricorrenti si sceglie se modificare solo questo o tutta la serie
                const percorso = selectAmbito && selectAmbito.value === 'serie' ? 'modifica-serie' : 'modifica';
                await chiamaApi(`/eventi/${percorso}/${evento.id}`, { metodo: 'PUT', corpo: dati });
                // I tag seguono la scelta "Applica le modifiche a": solo questo evento o tutta la serie
                await salvaTag(evento.id, evento.tags.map((tag) => tag.id), percorso === 'modifica-serie');
                alSalvataggio('Evento modificato!');
            }
        } catch (erroreBackend) {
            // Il messaggio arriva dal backend (es. data non valida)
            mostraErrore(errore, erroreBackend.message);
        } finally {
            impostaCaricamento(bottoneSalva, false);
        }
    });

    // Eliminazione, con conferma
    if (bottoneElimina) {
        bottoneElimina.addEventListener('click', async () => {
            const scelte = ricorrente
                ? [
                    { testo: 'Solo questo', valore: 'elimina', pericolosa: true },
                    { testo: 'Tutta la serie', valore: 'elimina-serie', pericolosa: true },
                ]
                : [{ testo: 'Elimina', valore: 'elimina', pericolosa: true }];

            const percorso = await chiediConferma(
                'Eliminare l\'evento?',
                ricorrente
                    ? `"${evento.titolo}" si ripete: vuoi eliminare solo questo evento o tutta la serie?`
                    : `"${evento.titolo}" verrà eliminato definitivamente. Vuoi continuare?`,
                scelte,
            );

            if (!percorso) return;

            impostaCaricamento(bottoneElimina, true);

            try {
                await chiamaApi(`/eventi/${percorso}/${evento.id}`, { metodo: 'DELETE' });
                alSalvataggio('Evento eliminato');
            } catch (erroreBackend) {
                mostraErrore(errore, erroreBackend.message);
            } finally {
                impostaCaricamento(bottoneElimina, false);
            }
        });
    }

    return form;
}