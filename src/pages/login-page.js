
import { mostraToast } from '../components/messaggio_errore.js';

import { accedi, registrati } from '../autenticazione.js';

import { aggiungiCampo, creaTestoErrore, mostraErrore, creaBottoneInvio, impostaCaricamento, aggiungiOcchioPassword } from '../components/form.js';

import logo from '../assets/DaybyDay_Logo.png';


export function paginaLogin() {
    // Sfondo a tutta pagina con il logo e la card al centro
    const contenitore = document.createElement('div');
    contenitore.className = 'min-h-screen flex flex-col items-center justify-center bg-base-200 p-4';

    const card = document.createElement('div');
    card.className = 'card bg-base-100/50 border border-base-300 w-full max-w-md';

    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';

    // Il titolo è il logo: il testo alternativo "DayByDay" viene letto al posto dell'immagine dai lettori di schermo
    const titolo = document.createElement('h1');
    titolo.className = 'mb-4';

    const immagineLogo = document.createElement('img');
    immagineLogo.src = logo;
    immagineLogo.alt = 'DayByDay';
    immagineLogo.className = 'w-72 max-w-full';
    titolo.appendChild(immagineLogo);

    // Schede
    const schede = document.createElement('div');
    schede.className = 'tabs tabs-box mb-4';

    const schedaAccedi = document.createElement('button');
    schedaAccedi.type = 'button';
    schedaAccedi.className = 'tab tab-active flex-1';
    schedaAccedi.textContent = 'Accedi';

    const schedaRegistrati = document.createElement('button');
    schedaRegistrati.type = 'button';
    schedaRegistrati.className = 'tab flex-1';
    schedaRegistrati.textContent = 'Registrati';

    schede.appendChild(schedaAccedi);
    schede.appendChild(schedaRegistrati);

    // Form di accesso
    const formAccedi = document.createElement('form');
    formAccedi.className = 'flex flex-col gap-3';
    // Gli errori li mostro io con la scritta rossa, non il fumetto del browser
    formAccedi.noValidate = true;

    const inputEmailAccedi = aggiungiCampo(formAccedi, 'accedi-email', 'Email', 'email');
    const inputPasswordAccedi = aggiungiCampo(formAccedi, 'accedi-password', 'Password', 'password');
    aggiungiOcchioPassword(inputPasswordAccedi);
    const erroreAccedi = creaTestoErrore();
    formAccedi.appendChild(erroreAccedi);
    const bottoneAccedi = creaBottoneInvio('Accedi');
    formAccedi.appendChild(bottoneAccedi);

    // Form di registrazione (parte nascosto)
    const formRegistrati = document.createElement('form');
    formRegistrati.className = 'flex flex-col gap-3 hidden';
    // Gli errori li mostro io con la scritta rossa, non il fumetto del browser
    formRegistrati.noValidate = true;

    const inputNome = aggiungiCampo(formRegistrati, 'reg-nome', 'Nome', 'text');
    const inputCognome = aggiungiCampo(formRegistrati, 'reg-cognome', 'Cognome', 'text');
    const inputEmailReg = aggiungiCampo(formRegistrati, 'reg-email', 'Email', 'email');
    const inputPasswordReg = aggiungiCampo(formRegistrati, 'reg-password', 'Password', 'password');
    aggiungiOcchioPassword(inputPasswordReg);
    const erroreRegistrati = creaTestoErrore();
    formRegistrati.appendChild(erroreRegistrati);
    const bottoneRegistrati = creaBottoneInvio('Registrati');
    formRegistrati.appendChild(bottoneRegistrati);

    // Ordine composizione form
    cardBody.appendChild(schede);
    cardBody.appendChild(formAccedi);
    cardBody.appendChild(formRegistrati);
    card.appendChild(cardBody);
    contenitore.appendChild(titolo);
    contenitore.appendChild(card);

    // Frase che presenta l'app, sotto la card, nei colori del logo
    const presentazione = document.createElement('p');
    presentazione.className = 'mt-12 text-center text-lg italic bg-linear-to-r from-blu-logo to-rosa-logo bg-clip-text text-transparent';
    presentazione.textContent = 'Il tuo tempo, giorno per giorno: eventi, to do e note in un solo calendario, da soli o con chi vuoi.';
    contenitore.appendChild(presentazione);

    // Cambio scheda
    function mostraSchedaAccedi() {
        erroreAccedi.textContent = '';
        erroreRegistrati.textContent = '';
        schedaAccedi.classList.add('tab-active');
        schedaRegistrati.classList.remove('tab-active');
        formAccedi.classList.remove('hidden');
        formRegistrati.classList.add('hidden');
    }

    function mostraSchedaRegistrati() {
        erroreAccedi.textContent = '';
        erroreRegistrati.textContent = '';
        schedaRegistrati.classList.add('tab-active');
        schedaAccedi.classList.remove('tab-active');
        formRegistrati.classList.remove('hidden');
        formAccedi.classList.add('hidden');
    }

    schedaAccedi.addEventListener('click', mostraSchedaAccedi);
    schedaRegistrati.addEventListener('click', mostraSchedaRegistrati);

    // Invio dei form al backend
    formAccedi.addEventListener('submit', async (evento) => {
        evento.preventDefault();

        impostaCaricamento(bottoneAccedi, true);

        try {
            await accedi(inputEmailAccedi.value.trim(), inputPasswordAccedi.value);
            window.location.hash = '#/area-personale';
        } catch (errore) {
            // Il messaggio arriva dal backend (es. credenziali sbagliate)
            mostraErrore(erroreAccedi, errore.message);
        } finally {
            impostaCaricamento(bottoneAccedi, false);
        }
    });

    formRegistrati.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        erroreRegistrati.textContent = '';

        impostaCaricamento(bottoneRegistrati, true);

        try {
            await registrati(
                inputNome.value.trim(),
                inputCognome.value.trim(),
                inputEmailReg.value.trim(),
                inputPasswordReg.value,
            );
            mostraToast('Registrazione completata! Ora puoi accedere', 'successo');
            // Porto l'email nella scheda Accedi, così basta scrivere la password, e svuoto il form di registrazione
            // (la password non deve restare scritta nella pagina)
            inputEmailAccedi.value = inputEmailReg.value.trim();
            formRegistrati.reset();
            mostraSchedaAccedi();
        } catch (errore) {
            // Il messaggio arriva dal backend (es. email già registrata)
            mostraErrore(erroreRegistrati, errore.message);
        } finally {
            impostaCaricamento(bottoneRegistrati, false);
        }
    });

    return contenitore;
}