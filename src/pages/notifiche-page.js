
import { ChevronLeft } from 'lucide';

import { chiamaApi } from '../api.js';

import { utenteCorrente } from '../autenticazione.js';

import { creaNavbar } from '../components/navbar.js';
import { creaIcona } from '../components/icona.js';
import { mostraToast } from '../components/messaggio_errore.js';
import { impostaCaricamento } from '../components/form.js';

import { formattaDataOra } from '../utility/date.js';

// Colore usato per i calendari che non ne hanno uno (lo stesso delle altre pagine)
const COLORE_PREDEFINITO = '#cb6ce6';

// Filtri della pagina: ognuno mostra i tipi di notifica indicati (null = tutti)
const FILTRI = [
    { testo: 'Tutte', tipi: null },
    { testo: 'Eventi', tipi: ['avviso_evento'] },
    { testo: 'Inviti', tipi: ['invito_calendario'] },
    {
        testo: 'Calendari',
        tipi: ['rimozione_calendario', 'uscita_calendario', 'eliminazione_calendario', 'nuovo_amministratore'],
    },
];

export function paginaNotifiche() {
    const utente = utenteCorrente();

    // Tutte le notifiche arrivate dal backend e il filtro scelto
    let notifiche = [];
    let filtroAttivo = FILTRI[0];

    // I miei calendari, per scrivere sopra ogni notifica da quale calendario arriva
    let calendariPerId = new Map();

    // Sfondo e contenuto a tutta pagina
    const contenitore = document.createElement('div');
    contenitore.className = 'min-h-screen bg-base-200 p-4 flex flex-col gap-6';

    // Navbar con "Indietro" 
    const bottoneIndietro = document.createElement('a');
    bottoneIndietro.href = '#/area-personale';
    bottoneIndietro.className = 'btn btn-ghost btn-sm';
    bottoneIndietro.appendChild(creaIcona(ChevronLeft, 16));
    bottoneIndietro.append('Indietro');

    const navbar = creaNavbar([bottoneIndietro]);

    // Contenuto: titolo, filtri e lista
    const sezione = document.createElement('section');
    sezione.className = 'flex flex-col gap-4 px-4';

    const titolo = document.createElement('h1');
    titolo.className = 'text-2xl font-bold';
    titolo.textContent = 'Le tue notifiche';

    // Filtri fatti a schede, come "Accedi" e "Registrati" nel login
    const schede = document.createElement('div');
    schede.className = 'tabs tabs-box w-fit';

    const lista = document.createElement('div');
    lista.className = 'flex flex-col gap-3';

    const caricamento = document.createElement('span');
    caricamento.className = 'loading loading-spinner loading-md text-primary';
    lista.appendChild(caricamento);

    FILTRI.forEach((filtro) => {
        const scheda = document.createElement('button');
        scheda.type = 'button';
        scheda.className = filtro === filtroAttivo ? 'tab tab-active' : 'tab';
        scheda.textContent = filtro.testo;

        scheda.addEventListener('click', () => {
            filtroAttivo = filtro;
            schede.querySelectorAll('.tab').forEach((elemento) => elemento.classList.remove('tab-active'));
            scheda.classList.add('tab-active');
            mostraNotifiche();
        });

        schede.appendChild(scheda);
    });

    // Ordine composizione notifiche
    sezione.appendChild(titolo);
    sezione.appendChild(schede);
    sezione.appendChild(lista);
    contenitore.appendChild(navbar);
    contenitore.appendChild(sezione);

    // Accetta o rifiuta un invito a un calendario
    // Dopo la risposta la notifica si elimina dal backend: l'invito non serve più, così la prossima volta non ricompare con i bottoni
    async function rispondiInvito(notifica, risposta, bottone, zonaBottoni) {
        impostaCaricamento(bottone, true);

        try {
            await chiamaApi(`/calendari/stato-invito/${notifica.calendario_id}/${utente.id}`, {
                metodo: 'PUT',
                corpo: { risposta },
            });

            zonaBottoni.textContent = risposta === 'accettato' ? 'Invito accettato' : 'Invito rifiutato';
            mostraToast(risposta === 'accettato' ? 'Invito accettato!' : 'Invito rifiutato', 'successo');
        } catch (errore) {
            // 409 = all'invito era già stata data una risposta: va eliminato anche lui
            // Gli altri errori invece si mostrano, e l'invito resta
            if (errore.stato !== 409) {
                impostaCaricamento(bottone, false);
                mostraToast(errore.message);
                return;
            }

            zonaBottoni.textContent = 'Hai già risposto a questo invito';
        }

        chiamaApi(`/notifiche/elimina/${notifica.id}`, { metodo: 'DELETE' }).catch(() => { });
    }

    // Crea la card di una notifica: pallino se non letta, messaggio, data e, per gli inviti, i bottoni per rispondere
    function creaCardNotifica(notifica) {
        const card = document.createElement('article');
        card.className = 'card bg-base-100 border border-base-300';

        const corpo = document.createElement('div');
        corpo.className = 'card-body p-4 flex-row items-start gap-3';

        // Pallino delle non lette: per quelle lette resta invisibile ma occupa lo stesso spazio, così i testi sono tutti allineati
        const pallino = document.createElement('span');
        pallino.className = notifica.letta
            ? 'size-2.5 rounded-full shrink-0 mt-2 invisible'
            : 'size-2.5 rounded-full shrink-0 mt-2 bg-primary';
        pallino.setAttribute('aria-label', notifica.letta ? 'Letta' : 'Non letta');

        const testi = document.createElement('div');
        testi.className = 'flex flex-col gap-1';

        // Calendario da cui arriva la notifica, nel suo colore (se è tra i miei calendari)
        const calendario = calendariPerId.get(notifica.calendario_id);
        if (calendario) {
            const colore = calendario.colore || COLORE_PREDEFINITO;

            const rigaCalendario = document.createElement('p');
            rigaCalendario.className = 'flex items-center gap-1.5 text-xs font-semibold';
            // Il colore cambia per ogni calendario, quindi va nello stile
            rigaCalendario.style.color = colore;

            const pallinoCalendario = document.createElement('span');
            pallinoCalendario.className = 'size-2 shrink-0 rounded-full';
            pallinoCalendario.style.backgroundColor = colore;

            rigaCalendario.appendChild(pallinoCalendario);
            rigaCalendario.append(calendario.nome);
            testi.appendChild(rigaCalendario);
        }

        const messaggio = document.createElement('p');
        messaggio.textContent = notifica.messaggio;

        const data = document.createElement('p');
        data.className = 'text-sm text-base-content/60';
        data.textContent = formattaDataOra(notifica.data_generazione);

        testi.appendChild(messaggio);
        testi.appendChild(data);

        if (notifica.tipo === 'invito_calendario') {
            const zonaBottoni = document.createElement('div');
            zonaBottoni.className = 'flex gap-2 mt-2 text-sm font-medium text-primary';

            const bottoneAccetta = document.createElement('button');
            bottoneAccetta.type = 'button';
            bottoneAccetta.className = 'btn btn-sm border-0 text-white bg-linear-to-r from-blu-logo to-rosa-logo';
            bottoneAccetta.textContent = 'Accetta';
            bottoneAccetta.addEventListener('click', () => rispondiInvito(notifica, 'accettato', bottoneAccetta, zonaBottoni));

            const bottoneRifiuta = document.createElement('button');
            bottoneRifiuta.type = 'button';
            bottoneRifiuta.className = 'btn btn-sm btn-outline';
            bottoneRifiuta.textContent = 'Rifiuta';
            bottoneRifiuta.addEventListener('click', () => rispondiInvito(notifica, 'rifiutato', bottoneRifiuta, zonaBottoni));

            zonaBottoni.appendChild(bottoneAccetta);
            zonaBottoni.appendChild(bottoneRifiuta);
            testi.appendChild(zonaBottoni);
        }

        corpo.appendChild(pallino);
        corpo.appendChild(testi);
        card.appendChild(corpo);

        return card;
    }

    // Disegna la lista con le sole notifiche del filtro scelto
    function mostraNotifiche() {
        lista.innerHTML = '';

        const daMostrare = filtroAttivo.tipi
            ? notifiche.filter((notifica) => filtroAttivo.tipi.includes(notifica.tipo))
            : notifiche;

        if (daMostrare.length === 0) {
            const vuoto = document.createElement('p');
            vuoto.className = 'text-base-content/60';
            vuoto.textContent = 'Nessuna notifica';
            lista.appendChild(vuoto);
            return;
        }

        daMostrare.forEach((notifica) => lista.appendChild(creaCardNotifica(notifica)));
    }

    // Caricamento dal backend
    async function caricaNotifiche() {
        try {
            // Notifiche e calendari insieme, in una volta sola
            const [risposta, calendari] = await Promise.all([
                chiamaApi('/notifiche/lista'),
                chiamaApi('/calendari/lista'),
            ]);
            calendariPerId = new Map(calendari.map((calendario) => [calendario.id, calendario]));

            // Le più recenti in cima
            notifiche = risposta.sort(
                (a, b) => new Date(b.data_generazione) - new Date(a.data_generazione)
            );
            mostraNotifiche();

            // Prima si mostrano i pallini, poi si segnano come lette in sottofondo
            // Gli inviti restano non letti finché non si risponde: così contano sulla campanella e il backend non li cancella con la pulizia delle notifiche lette vecchie
            notifiche
                .filter((notifica) => !notifica.letta && notifica.tipo !== 'invito_calendario')
                .forEach((notifica) => {
                    chiamaApi(`/notifiche/segna-letta/${notifica.id}`, { metodo: 'PUT' }).catch(() => { });
                });
        } catch (errore) {
            caricamento.remove();
            mostraToast(errore.message);
        }
    }

    caricaNotifiche();

    return contenitore;
}