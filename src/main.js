
import './style.css';
// Cally: il calendarietto (calendar-date) usato nella pagina del calendario e nei form
import 'cally';

import { paginaLogin } from './pages/login-page.js';

import { paginaAreaPersonale } from './pages/area-personale-page.js';

import { paginaCalendario } from './pages/calendario-page.js';

import { utenteLoggato } from './autenticazione.js';

import { paginaNotifiche } from './pages/notifiche-page.js';

import { paginaImpostazioniCalendario } from './pages/impostazioni-calendario-page.js';

import { paginaImpostazioni } from './pages/impostazioni-page.js';

import { paginaResoconti } from './pages/resoconti-page.js';

import { avviaControlloNotifiche, fermaControlloNotifiche } from './components/controllo-notifiche.js';

// Associa ogni indirizzo alla funzione che crea la pagina
const rotte = {
  '#/login': paginaLogin,
  '#/area-personale': paginaAreaPersonale,
  '#/calendario': paginaCalendario,
  '#/notifiche': paginaNotifiche,
  '#/impostazioni-calendario': paginaImpostazioniCalendario,
  '#/impostazioni': paginaImpostazioni,
  '#/resoconti': paginaResoconti,
};

// Pagine che si possono vedere solo dopo il login
const rottePrivate = ['#/area-personale', '#/calendario', '#/notifiche', '#/impostazioni-calendario', '#/impostazioni', '#/resoconti'];

function mostraPagina() {
  // Se l'URL non ha il #, parte dal login
  const hash = window.location.hash || '#/login';

  // Divide l'indirizzo nella pagina e nell'eventuale parametro:
  // '#/calendario/123' diventa pagina '#/calendario' e parametro '123'
  const [, nomePagina, parametro] = hash.split('/');
  const pagina = `#/${nomePagina}`;

  // Il controllo delle notifiche nuove è attivo solo con un utente loggato
  if (utenteLoggato()) {
    avviaControlloNotifiche();
  } else {
    fermaControlloNotifiche();
  }

  // Se l'indirizzo non esiste, rimanda al login
  if (!rotte[pagina]) {
    window.location.hash = '#/login';
    return;
  }

  // Senza login, le pagine private rimandano al login
  if (rottePrivate.includes(pagina) && !utenteLoggato()) {
    window.location.hash = '#/login';
    return;
  }

  // Chi ha già fatto il login non rivede la pagina di login
  if (pagina === '#/login' && utenteLoggato()) {
    window.location.hash = '#/area-personale';
    return;
  }

  const app = document.querySelector('#app');
  app.innerHTML = '';
  app.appendChild(rotte[pagina](parametro));
}

// Ogni volta che cambia il # nell'URL, mostra la pagina giusta
window.addEventListener('hashchange', mostraPagina);

// Al primo caricamento
mostraPagina();