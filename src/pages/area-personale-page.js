
import { Bell, Settings, LogOut, Plus, User, Users } from 'lucide';

import { chiamaApi } from '../api.js';

import { esci, utenteCorrente } from '../autenticazione.js';

import { creaNavbar } from '../components/navbar.js';
import { creaIcona } from '../components/icona.js';
import { mostraToast } from '../components/messaggio_errore.js';
import { creaFinestra } from '../components/finestra.js';
import { creaFormCalendario } from '../components/form-calendario.js';
import { creaRiquadroOggi } from '../components/riquadro-oggi.js';

// Colore usato per i calendari che non ne hanno uno
const COLORE_PREDEFINITO = '#cb6ce6';

// Crea un bottone rotondo con solo l'icona (notifiche, impostazioni)
function creaBottoneIcona(icona, etichetta, indirizzo) {
    const link = document.createElement('a');
    link.href = indirizzo;
    link.className = 'btn btn-ghost btn-circle';
    // Senza testo visibile, l'etichetta serve ai lettori di schermo
    link.setAttribute('aria-label', etichetta);
    link.appendChild(creaIcona(icona));
    return link;
}

// Testo dei membri: "nessun membro", "1 membro", "3 membri"
function testoMembri(numero) {
    if (numero === 0) return 'nessun membro';
    if (numero === 1) return '1 membro';
    return `${numero} membri`;
}

// Crea la card di un calendario, che porta alla sua pagina
function creaCardCalendario(calendario) {
    const card = document.createElement('a');
    card.href = `#/calendario/${calendario.id}`;
    card.className = 'card bg-base-100 border border-base-300 overflow-hidden aspect-[4/3] transition hover:shadow-md hover:-translate-y-0.5';

    // Striscia in alto con il colore scelto dall'utente 
    const striscia = document.createElement('div');
    striscia.className = 'h-2';
    striscia.style.backgroundColor = calendario.colore || COLORE_PREDEFINITO;

    const corpo = document.createElement('div');
    corpo.className = 'card-body p-4 gap-2';

    const nome = document.createElement('h2');
    nome.className = 'card-title text-lg';
    nome.textContent = calendario.nome;

    // Personale, condiviso da me o condiviso con me
    const info = document.createElement('p');
    info.className = 'flex items-center gap-2 text-sm text-base-content/70';

    if (calendario.tipo === 'personale') {
        info.appendChild(creaIcona(User, 16));
        info.append('Personale');
    } else {
        info.appendChild(creaIcona(Users, 16));
        const proprietario = calendario.mio_ruolo === 'amministratore' ? 'Condiviso' : 'Condiviso con te';
        info.append(`${proprietario} · ${testoMembri(calendario.numero_membri)}`);
    }

    corpo.appendChild(nome);
    corpo.appendChild(info);
    card.appendChild(striscia);
    card.appendChild(corpo);

    return card;
}

// Crea la card tratteggiata "Nuovo calendario": cliccandola chiama "alClic"
function creaCardNuovoCalendario(alClic) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'card border-2 border-dashed border-primary/50 text-primary aspect-[4/3] items-center justify-center gap-2 cursor-pointer transition hover:bg-base-100';
    card.addEventListener('click', alClic);

    const testo = document.createElement('span');
    testo.className = 'font-medium';
    testo.textContent = 'Nuovo calendario';

    card.appendChild(creaIcona(Plus, 28));
    card.appendChild(testo);
    return card;
}

export function paginaAreaPersonale() {
    const utente = utenteCorrente();

    // Sfondo e contenuto a tutta pagina
    const contenitore = document.createElement('div');
    contenitore.className = 'min-h-screen bg-base-200 p-4';

    const contenuto = document.createElement('div');
    contenuto.className = 'flex flex-col gap-6';

    // Barra in alto: notifiche e impostazioni vicine, logout più distante
    const bottoneEsci = document.createElement('button');
    bottoneEsci.type = 'button';
    bottoneEsci.className = 'btn btn-outline btn-sm ml-4';
    bottoneEsci.appendChild(creaIcona(LogOut, 16));
    bottoneEsci.append('Esci');

    bottoneEsci.addEventListener('click', async () => {
        await esci();
        window.location.hash = '#/login';
    });

    // Campanella con il numero delle notifiche non lette (parte nascosto)
    const bottoneNotifiche = creaBottoneIcona(Bell, 'Notifiche', '#/notifiche');
    bottoneNotifiche.classList.add('indicator');

    const numeroNotifiche = document.createElement('span');
    numeroNotifiche.className = 'indicator-item badge badge-primary badge-sm hidden';
    bottoneNotifiche.appendChild(numeroNotifiche);

    const navbar = creaNavbar([
        bottoneNotifiche,
        creaBottoneIcona(Settings, 'Impostazioni', '#/impostazioni'),
        bottoneEsci,
    ]);

    // Saluto 
    const saluto = document.createElement('h1');
    saluto.className = 'text-4xl font-bold px-8';
    saluto.textContent = `Ciao, ${utente.nome}`;

    // Card "Oggi": eventi, to do e note di oggi da tutti i calendari
    const riquadroOggi = creaRiquadroOggi();

    // Sottotitoli in corsivo sopra il riepilogo e sopra i calendari
    const sottotitoloOggi = document.createElement('h2');
    sottotitoloOggi.className = 'w-fit px-8 text-lg italic -mb-3 bg-linear-to-r from-blu-logo to-rosa-logo bg-clip-text text-transparent';
    sottotitoloOggi.textContent = 'Il riepilogo di oggi';

    const sottotitoloCalendari = document.createElement('h2');
    sottotitoloCalendari.className = 'w-fit px-8 text-lg italic -mb-3 bg-linear-to-r from-blu-logo to-rosa-logo bg-clip-text text-transparent';
    sottotitoloCalendari.textContent = 'I tuoi calendari';

    // Griglia dei calendari (con la rotellina finché non arrivano)
    // Tante colonne quante ne entrano, ognuna larga almeno 208px
    const griglia = document.createElement('section');
    griglia.className = 'grid grid-cols-[repeat(auto-fill,minmax(208px,1fr))] gap-4 px-4';

    const caricamento = document.createElement('span');
    caricamento.className = 'loading loading-spinner loading-md text-primary';
    griglia.appendChild(caricamento);

    // Ordine composizione area personale
    contenuto.appendChild(navbar);
    contenuto.appendChild(saluto);
    contenuto.appendChild(sottotitoloOggi);
    contenuto.appendChild(riquadroOggi.elemento);
    contenuto.appendChild(sottotitoloCalendari);
    contenuto.appendChild(griglia);
    contenitore.appendChild(contenuto);

    // Caricamento dei calendari dal backend
    async function caricaCalendari() {
        try {
            const calendari = await chiamaApi('/calendari/lista');

            griglia.innerHTML = '';
            calendari.forEach((calendario) => griglia.appendChild(creaCardCalendario(calendario)));
            griglia.appendChild(creaCardNuovoCalendario(() => finestraNuovoCalendario.apri()));
            // La card "Oggi" usa gli stessi calendari, così non si chiedono due volte al backend
            riquadroOggi.mostra(calendari);
        } catch (errore) {
            caricamento.remove();
            mostraToast(errore.message);
        }
    }

    // Finestra per creare un nuovo calendario
    // dopo la creazione si chiude e la griglia si ricarica con la nuova card
    const finestraNuovoCalendario = creaFinestra('Nuovo calendario', creaFormCalendario(() => {
        finestraNuovoCalendario.chiudi();
        mostraToast('Calendario creato!', 'successo');
        caricaCalendari();
    }));
    contenitore.appendChild(finestraNuovoCalendario.elemento);

    // Numero delle notifiche non lette
    async function caricaNumeroNotifiche() {
        try {
            const nonLette = await chiamaApi('/notifiche/lista?stato=non_lette');
            numeroNotifiche.textContent = nonLette.length > 9 ? '9+' : nonLette.length;
            numeroNotifiche.classList.toggle('hidden', nonLette.length === 0);
        } catch {
            // Se non ci riesce, la campanella resta senza numero: non serve disturbare l'utente
        }
    }

    // Il controllo delle notifiche (in tutte le pagine) avvisa quando il numero cambia
    function aggiornaNumeroNotifiche(evento) {
        // Se nel frattempo si è cambiata pagina, smette di ascoltare
        if (!document.body.contains(contenitore)) {
            window.removeEventListener('notifiche-aggiornate', aggiornaNumeroNotifiche);
            return;
        }
        const numero = evento.detail;
        numeroNotifiche.textContent = numero > 9 ? '9+' : numero;
        numeroNotifiche.classList.toggle('hidden', numero === 0);
    }

    window.addEventListener('notifiche-aggiornate', aggiornaNumeroNotifiche);

    caricaNumeroNotifiche();

    caricaCalendari();

    return contenitore;
}