
import { ChevronLeft, Laptop, Smartphone, Tablet } from 'lucide';

import { chiamaApi } from '../api.js';

import { utenteCorrente, aggiornaUtenteCorrente, esci } from '../autenticazione.js';

import { creaNavbar } from '../components/navbar.js';
import { creaCardSezione } from '../components/card-sezione.js';
import { creaIcona } from '../components/icona.js';
import { mostraToast } from '../components/messaggio_errore.js';
import { chiediConferma } from '../components/conferma.js';
import {
    aggiungiCampo,
    creaTestoErrore,
    mostraErrore,
    creaBottoneInvio,
    impostaCaricamento,
    aggiungiOcchioPassword
} from '../components/form.js';

import { formattaData } from '../utility/date.js';

// Lunghezza massima, la stessa controllata dal backend
const LUNGHEZZA_MASSIMA_NOME = 50;

// Durata di una sessione nel backend (DURATA_REFRESH_TOKEN_GIORNI): la scadenza è sempre
// "ultimo utilizzo + 30 giorni", perché si imposta così al login e a ogni rinnovo
const GIORNI_DURATA_SESSIONE = 30;

// Ultimo utilizzo di una sessione, ricavato dalla scadenza (scadenza − 30 giorni)
function ultimoUtilizzo(sessione) {
    const data = new Date(sessione.scadenza);
    data.setDate(data.getDate() - GIORNI_DURATA_SESSIONE);
    return data;
}

// Icona del dispositivo in base al nome che gli dà il backend (es. "iPhone di Giulia", "Computer di Giulia")
function iconaDispositivo(nome) {
    if (nome.startsWith('iPhone') || nome.startsWith('Telefono')) return Smartphone;
    if (nome.startsWith('iPad') || nome.startsWith('Tablet')) return Tablet;
    return Laptop;
}

// Le sessioni dello stesso dispositivo diventano una riga sola: ogni login apre una sessione nuova,
// quindi lo stesso computer può averne tante. Le sessioni arrivano già dalla più recente
function raggruppaPerDispositivo(sessioni) {
    const gruppi = [];

    sessioni.forEach((sessione) => {
        const gruppo = gruppi.find((elemento) => elemento.dispositivo === sessione.dispositivo);
        if (gruppo) {
            gruppo.sessioni += 1;
            return;
        }
        gruppi.push({ dispositivo: sessione.dispositivo, scadenza: sessione.scadenza, sessioni: 1 });
    });

    return gruppi;
}

// Riga di un dispositivo: icona, nome e, sotto, l'ultimo utilizzo
function creaRigaDispositivo(sessione) {
    const riga = document.createElement('div');
    riga.className = 'flex items-center gap-3 py-2';

    // Icona dentro un cerchio lilla chiaro, nei colori dell'app
    const icona = document.createElement('span');
    icona.className = 'flex size-10 shrink-0 items-center justify-center rounded-full bg-lilla-chiaro text-primary';
    icona.appendChild(creaIcona(iconaDispositivo(sessione.dispositivo), 20));

    const testi = document.createElement('div');
    testi.className = 'flex min-w-0 flex-col';

    const nome = document.createElement('p');
    nome.className = 'truncate font-medium';
    nome.textContent = sessione.dispositivo;

    const utilizzo = document.createElement('p');
    utilizzo.className = 'text-sm text-base-content/60';
    // Se lo stesso dispositivo ha più sessioni aperte, si dice quante sono
    utilizzo.textContent = sessione.sessioni > 1
        ? `Ultimo utilizzo: ${formattaData(ultimoUtilizzo(sessione))} · ${sessione.sessioni} sessioni`
        : `Ultimo utilizzo: ${formattaData(ultimoUtilizzo(sessione))}`;

    testi.appendChild(nome);
    testi.appendChild(utilizzo);
    riga.appendChild(icona);
    riga.appendChild(testi);
    return riga;
}

export function paginaImpostazioni() {
    const utente = utenteCorrente();

    // Sfondo e contenuto a tutta pagina
    const contenitore = document.createElement('div');
    contenitore.className = 'min-h-screen bg-base-200 p-4 flex flex-col gap-6';

    // Navbar con "Indietro": torna all'area personale
    const bottoneIndietro = document.createElement('a');
    bottoneIndietro.href = '#/area-personale';
    bottoneIndietro.className = 'btn btn-ghost btn-sm';
    bottoneIndietro.appendChild(creaIcona(ChevronLeft, 16));
    bottoneIndietro.append('Indietro');

    const navbar = creaNavbar([bottoneIndietro]);

    // Dispositivi connessi: solo un'informazione (niente da salvare), quindi sta nell'intestazione
    const titoloDispositivi = document.createElement('h2');
    titoloDispositivi.className = 'text-sm font-semibold text-base-content/70';
    titoloDispositivi.textContent = 'Dispositivi connessi';

    const elencoDispositivi = document.createElement('div');
    elencoDispositivi.className = 'flex flex-col divide-y divide-base-300';

    const caricamentoDispositivi = document.createElement('span');
    caricamentoDispositivi.className = 'loading loading-spinner loading-sm text-primary';
    elencoDispositivi.appendChild(caricamentoDispositivi);

    // Intestazione: striscia con il gradiente dell'app (qui non c'è un calendario)
    const intestazione = document.createElement('section');
    intestazione.className = 'card bg-base-100 border border-base-300 overflow-hidden';

    const striscia = document.createElement('div');
    striscia.className = 'h-2 bg-linear-to-r from-blu-logo to-rosa-logo';

    const corpoIntestazione = document.createElement('div');
    corpoIntestazione.className = 'card-body gap-4';

    const titolo = document.createElement('h1');
    titolo.className = 'text-2xl font-bold';
    titolo.textContent = 'Impostazioni profilo';

    corpoIntestazione.appendChild(titolo);
    corpoIntestazione.appendChild(titoloDispositivi);
    corpoIntestazione.appendChild(elencoDispositivi);
    intestazione.appendChild(striscia);
    intestazione.appendChild(corpoIntestazione);

    // Card "Dati personali": nome, cognome ed email
    const { card: cardDati, corpo: corpoDati } = creaCardSezione('Dati personali');

    const formDati = document.createElement('form');
    formDati.className = 'flex flex-col gap-3';
    // Gli errori li mostro io con la scritta rossa, non il fumetto del browser
    formDati.noValidate = true;

    const inputNome = aggiungiCampo(formDati, 'profilo-nome', 'Nome', 'text');
    inputNome.maxLength = LUNGHEZZA_MASSIMA_NOME;
    inputNome.value = utente.nome;

    const inputCognome = aggiungiCampo(formDati, 'profilo-cognome', 'Cognome', 'text');
    inputCognome.maxLength = LUNGHEZZA_MASSIMA_NOME;
    inputCognome.value = utente.cognome;

    const inputEmail = aggiungiCampo(formDati, 'profilo-email', 'Email', 'email');
    inputEmail.value = utente.email;

    const erroreDati = creaTestoErrore();
    formDati.appendChild(erroreDati);

    const bottoneSalvaDati = creaBottoneInvio('Salva');
    formDati.appendChild(bottoneSalvaDati);

    corpoDati.appendChild(formDati);

    // Card "Cambia password": a parte, così non si cambia per sbaglio salvando i dati
    const { card: cardPassword, corpo: corpoPassword } = creaCardSezione('Cambia password');

    const formPassword = document.createElement('form');
    formPassword.className = 'flex flex-col gap-3';
    // Gli errori li mostro io con la scritta rossa, non il fumetto del browser
    formPassword.noValidate = true;

    const inputPasswordAttuale = aggiungiCampo(formPassword, 'profilo-password-attuale', 'Password attuale', 'password');
    const inputNuovaPassword = aggiungiCampo(formPassword, 'profilo-nuova-password', 'Nuova password', 'password');
    const inputRipetiPassword = aggiungiCampo(formPassword, 'profilo-ripeti-password', 'Ripeti la nuova password', 'password');
    aggiungiOcchioPassword(inputPasswordAttuale);
    aggiungiOcchioPassword(inputNuovaPassword);
    aggiungiOcchioPassword(inputRipetiPassword);

    const errorePassword = creaTestoErrore();
    formPassword.appendChild(errorePassword);

    const bottoneCambiaPassword = creaBottoneInvio('Cambia password');
    formPassword.appendChild(bottoneCambiaPassword);

    corpoPassword.appendChild(formPassword);

    // Card "Elimina account", con conferma
    const { card: cardElimina, corpo: corpoElimina } = creaCardSezione('Elimina account');

    const spiegazioneElimina = document.createElement('p');
    spiegazioneElimina.className = 'text-sm text-base-content/70';
    spiegazioneElimina.textContent = 'I tuoi calendari personali verranno eliminati. Quelli condivisi passeranno al primo membro che ha accettato l\'invito, oppure verranno eliminati se non ce n\'è nessuno';
    const bottoneElimina = document.createElement('button');
    bottoneElimina.type = 'button';
    bottoneElimina.className = 'btn btn-outline btn-error';
    bottoneElimina.textContent = 'Elimina account';

    corpoElimina.appendChild(spiegazioneElimina);
    corpoElimina.appendChild(bottoneElimina);

    // Ordine composizione Impostazioni: card una sotto l'altra, larghe al massimo come un form, al centro
    const sezione = document.createElement('div');
    sezione.className = 'flex flex-col gap-4 w-full max-w-2xl mx-auto';

    sezione.appendChild(intestazione);
    sezione.appendChild(cardDati);
    sezione.appendChild(cardPassword);
    sezione.appendChild(cardElimina);
    contenitore.appendChild(navbar);
    contenitore.appendChild(sezione);

    // Salvataggio di nome, cognome ed email
    formDati.addEventListener('submit', async (eventoInvio) => {
        eventoInvio.preventDefault();

        const dati = {
            nome: inputNome.value.trim(),
            cognome: inputCognome.value.trim(),
            email: inputEmail.value.trim(),
        };

        if (!dati.nome || !dati.cognome || !dati.email) {
            mostraErrore(erroreDati, 'Nome, cognome ed email sono obbligatori');
            return;
        }

        impostaCaricamento(bottoneSalvaDati, true);

        try {
            const utenteAggiornato = await chiamaApi(`/utenti/modifica/${utente.id}`, { metodo: 'PUT', corpo: dati });
            // Aggiorna i dati salvati nel browser: così anche il saluto dell'area personale cambia subito
            aggiornaUtenteCorrente(utenteAggiornato);
            erroreDati.textContent = '';
            mostraToast('Profilo modificato!', 'successo');
        } catch (erroreBackend) {
            // Il messaggio arriva dal backend (es. email già registrata, nome con caratteri non ammessi)
            mostraErrore(erroreDati, erroreBackend.message);
        } finally {
            impostaCaricamento(bottoneSalvaDati, false);
        }
    });

    // Cambio della password
    formPassword.addEventListener('submit', async (eventoInvio) => {
        eventoInvio.preventDefault();

        if (!inputPasswordAttuale.value || !inputNuovaPassword.value || !inputRipetiPassword.value) {
            mostraErrore(errorePassword, 'Password attuale, nuova password e ripetizione sono obbligatorie');
            return;
        }

        if (inputNuovaPassword.value !== inputRipetiPassword.value) {
            mostraErrore(errorePassword, 'Le due nuove password non sono uguali');
            return;
        }

        impostaCaricamento(bottoneCambiaPassword, true);

        try {
            await chiamaApi(`/utenti/modifica/${utente.id}`, {
                metodo: 'PUT',
                corpo: { password: inputNuovaPassword.value, password_attuale: inputPasswordAttuale.value },
            });
            // Svuota i campi: le password non devono restare scritte nella pagina
            formPassword.reset();
            errorePassword.textContent = '';
            mostraToast('Password cambiata!', 'successo');
        } catch (erroreBackend) {
            // Il messaggio arriva dal backend (es. password troppo corta, password attuale sbagliata)
            mostraErrore(errorePassword, erroreBackend.message);
        } finally {
            impostaCaricamento(bottoneCambiaPassword, false);
        }
    });

    // Eliminazione dell'account: dopo si esce e si torna al login
    bottoneElimina.addEventListener('click', async () => {
        const scelta = await chiediConferma(
            'Eliminare l\'account?',
            'Il tuo account verrà eliminato definitivamente, insieme ai tuoi calendari personali. Vuoi continuare?',
            [{ testo: 'Elimina', valore: 'elimina', pericolosa: true }],
        );

        if (!scelta) return;

        impostaCaricamento(bottoneElimina, true);

        try {
            await chiamaApi(`/utenti/elimina/${utente.id}`, { metodo: 'DELETE' });
            // L'account non c'è più: si cancellano anche i dati di accesso salvati nel browser
            await esci();
            mostraToast('Account eliminato', 'successo');
            window.location.hash = '#/login';
        } catch (erroreBackend) {
            impostaCaricamento(bottoneElimina, false);
            mostraToast(erroreBackend.message);
        }
    });

    // Caricamento dei dispositivi dal backend: solo le sessioni non scadute, la più recente in cima
    async function caricaDispositivi() {
        try {
            const sessioni = await chiamaApi('/utenti/sessioni');
            const attive = sessioni
                .filter((sessione) => new Date(sessione.scadenza) > new Date())
                .sort((a, b) => new Date(b.scadenza) - new Date(a.scadenza));

            elencoDispositivi.innerHTML = '';

            if (attive.length === 0) {
                const vuoto = document.createElement('p');
                vuoto.className = 'text-sm text-base-content/60';
                vuoto.textContent = 'Nessun dispositivo connesso';
                elencoDispositivi.appendChild(vuoto);
                return;
            }

            raggruppaPerDispositivo(attive).forEach((gruppo) => elencoDispositivi.appendChild(creaRigaDispositivo(gruppo)));
        } catch (errore) {
            caricamentoDispositivi.remove();
            mostraToast(errore.message);
        }
    }

    caricaDispositivi();

    return contenitore;
}