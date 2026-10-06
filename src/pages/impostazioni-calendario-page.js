
import { ChevronLeft, X } from 'lucide';

import { chiamaApi } from '../api.js';

import { utenteCorrente } from '../autenticazione.js';

import { creaNavbar } from '../components/navbar.js';
import { creaCardSezione } from '../components/card-sezione.js';
import { creaIcona } from '../components/icona.js';
import { mostraToast } from '../components/messaggio_errore.js';
import { chiediConferma } from '../components/conferma.js';
import { creaTavolozzaColori } from '../components/tavolozza-colori.js';
import {
    aggiungiCampo,
    aggiungiSelezione,
    creaTestoErrore,
    mostraErrore,
    creaBottoneInvio,
    impostaCaricamento,
} from '../components/form.js';

// Colore usato per i calendari che non ne hanno uno (lo stesso della pagina del calendario)
const COLORE_PREDEFINITO = '#cb6ce6';

// Lunghezza massima del nome, la stessa controllata dal backend
const LUNGHEZZA_MASSIMA_NOME = 50;

// Viste: il valore va al backend, il testo si vede nella pagina
const VISTE = [
    { valore: 'giornaliera', testo: 'Giornaliera' },
    { valore: 'settimanale', testo: 'Settimanale' },
    { valore: 'mensile', testo: 'Mensile' },
    { valore: 'annuale', testo: 'Annuale' },
];

// Chi può modificare un calendario condiviso (gli stessi testi del form di creazione)
const PERMESSI = [
    { valore: 'solo_amministratore', testo: 'Solo io' },
    { valore: 'tutti', testo: 'Tutti i membri' },
    { valore: 'personalizzato', testo: 'Decido io per ogni membro' },
];

// Scritta accanto ai membri che non hanno ancora accettato l'invito o riufiutato
const TESTI_STATO_INVITO = {
    in_attesa: 'In attesa',
    rifiutato: 'Ha rifiutato',
};

// Testo di una vista o di un permesso a partire dal suo valore (es. 'mensile' --> 'Mensile')
function testoDi(opzioni, valore) {
    const opzione = opzioni.find((voce) => voce.valore === valore);
    return opzione ? opzione.testo : valore;
}

// Nome e cognome di una persona, con l'email se mancano
function nomeCompleto(persona) {
    const nome = [persona.nome, persona.cognome].filter(Boolean).join(' ');
    return nome || persona.email || 'Utente';
}

export function paginaImpostazioniCalendario(calendarioId) {
    const utente = utenteCorrente();

    // Dati del calendario (con amministratore e membri) e vista preferita, arrivano dal backend
    let calendario = null;
    let preferenza = null;

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

    // Intestazione: striscia e pallino del colore del calendario, come nella sua pagina
    const intestazione = document.createElement('section');
    intestazione.className = 'card bg-base-100 border border-base-300 overflow-hidden';

    const striscia = document.createElement('div');
    striscia.className = 'h-2';

    const titolo = document.createElement('h1');
    titolo.className = 'card-body flex-row items-center gap-3 text-2xl font-bold';

    const testoImpostazioni = document.createElement('span');
    testoImpostazioni.textContent = 'Impostazioni';

    // Separatore grigio tra "Impostazioni" e il nome del calendario
    const separatore = document.createElement('span');
    separatore.className = 'text-base-content/40';
    separatore.textContent = '·';

    // "Calendario" normale e il nome nel colore del calendario
    const testoCalendario = document.createElement('span');
    testoCalendario.append('Calendario ');

    const nomeCalendario = document.createElement('span');
    testoCalendario.appendChild(nomeCalendario);

    titolo.appendChild(testoImpostazioni);
    titolo.appendChild(separatore);
    titolo.appendChild(testoCalendario);
    intestazione.appendChild(striscia);
    intestazione.appendChild(titolo);


    // Zona delle card, larga al massimo come un form, al centro
    const sezione = document.createElement('div');
    sezione.className = 'flex flex-col gap-4 w-full max-w-2xl mx-auto';

    const caricamento = document.createElement('span');
    caricamento.className = 'loading loading-spinner loading-md text-primary self-center';
    sezione.appendChild(caricamento);

    // Ordine composizione Impostazioni calendario
    contenitore.appendChild(navbar);
    contenitore.appendChild(sezione);

    // Colora striscia, pallino e nome nel titolo.
    // Il colore cambia per ogni calendario
    function aggiornaIntestazione(colore, nome) {
        striscia.style.backgroundColor = colore;
        nomeCalendario.style.color = colore;
        nomeCalendario.textContent = nome;
    }

    // Card "Generale": nome e colore (li cambia solo l'amministratore), tipo solo da leggere
    function creaCardGenerale(sonoAmministratore) {
        const { card, corpo } = creaCardSezione('Generale');

        const testoTipo = document.createElement('p');
        testoTipo.className = 'text-sm text-base-content/70';
        testoTipo.textContent = calendario.tipo === 'condiviso'
            ? 'Tipo: condiviso (non si può cambiare)'
            : 'Tipo: personale (non si può cambiare)';

        // I membri vedono solo nome e tipo
        if (!sonoAmministratore) {
            const testoNome = document.createElement('p');
            testoNome.textContent = `Nome: ${calendario.nome}`;

            const spiegazione = document.createElement('p');
            spiegazione.className = 'text-sm text-base-content/70';
            spiegazione.textContent = 'Nome e colore li può cambiare solo l\'amministratore';

            corpo.appendChild(testoNome);
            corpo.appendChild(testoTipo);
            corpo.appendChild(spiegazione);
            return card;
        }

        const form = document.createElement('form');
        form.className = 'flex flex-col gap-3';
        // Gli errori li mostro io con la scritta rossa, non il fumetto del browser
        form.noValidate = true;

        const inputNome = aggiungiCampo(form, 'impostazioni-nome', 'Nome', 'text');
        inputNome.maxLength = LUNGHEZZA_MASSIMA_NOME;
        inputNome.value = calendario.nome;

        const etichettaColore = document.createElement('p');
        etichettaColore.textContent = 'Colore';
        const tavolozza = creaTavolozzaColori(calendario.colore || undefined);
        form.appendChild(etichettaColore);
        form.appendChild(tavolozza.elemento);

        // Anteprima: scegliendo un colore la striscia e il pallino in alto cambiano subito, ma il colore si salva solo con "Salva"
        function mostraAnteprimaColore() {
            const colore = tavolozza.leggiColore();
            striscia.style.backgroundColor = colore;
            nomeCalendario.style.color = colore;
        }

        tavolozza.elemento.addEventListener('click', mostraAnteprimaColore);
        tavolozza.elemento.addEventListener('input', mostraAnteprimaColore);

        form.appendChild(testoTipo);

        const errore = creaTestoErrore();
        form.appendChild(errore);

        const bottoneSalva = creaBottoneInvio('Salva');
        form.appendChild(bottoneSalva);

        form.addEventListener('submit', async (eventoInvio) => {
            eventoInvio.preventDefault();

            // Un nome fatto solo di spazi per il browser non è vuoto: lo controllo io
            if (inputNome.value.trim() === '') {
                mostraErrore(errore, 'Il nome è obbligatorio');
                return;
            }

            impostaCaricamento(bottoneSalva, true);

            try {
                calendario = await chiamaApi(`/calendari/modifica/${calendarioId}`, {
                    metodo: 'PUT',
                    corpo: { nome: inputNome.value.trim(), colore: tavolozza.leggiColore() },
                });

                aggiornaIntestazione(calendario.colore || COLORE_PREDEFINITO, calendario.nome);
                mostraToast('Calendario modificato!', 'successo');
            } catch (erroreBackend) {
                // Il messaggio arriva dal backend (es. nome troppo lungo)
                mostraErrore(errore, erroreBackend.message);
            } finally {
                impostaCaricamento(bottoneSalva, false);
            }
        });

        corpo.appendChild(form);
        return card;
    }

    // Card "Vista preferita": la vista con cui si apre il calendario, si salva subito
    function creaCardVista(sonoAmministratore) {
        const { card, corpo } = creaCardSezione('Vista preferita');

        const selectVista = aggiungiSelezione(corpo, 'impostazioni-vista', 'Il calendario si apre con la vista', VISTE);
        selectVista.value = preferenza.vista;

        const spiegazione = document.createElement('p');
        spiegazione.className = 'text-sm text-base-content/70';
        corpo.appendChild(spiegazione);

        // Per chi ha scelto una vista propria: torna a quella del calendario
        const bottoneVistaCalendario = document.createElement('button');
        bottoneVistaCalendario.type = 'button';
        bottoneVistaCalendario.className = 'btn btn-ghost btn-sm self-start';
        corpo.appendChild(bottoneVistaCalendario);

        // La spiegazione cambia con chi apre la pagina e da dove arriva la vista
        function aggiornaSpiegazione() {
            const vistaCalendario = testoDi(VISTE, preferenza.vista_calendario);
            const vistaPropria = !sonoAmministratore && preferenza.origine === 'propria';

            if (sonoAmministratore) {
                spiegazione.textContent = 'È la vista del calendario: la usano anche i membri che non ne hanno scelta una loro';
            } else if (vistaPropria) {
                spiegazione.textContent = `Hai scelto una vista tua. La vista del calendario è: ${vistaCalendario}`;
            } else {
                spiegazione.textContent = 'Stai usando la vista scelta per il calendario';
            }

            bottoneVistaCalendario.textContent = `Usa la vista del calendario (${vistaCalendario})`;
            // Il bottone serve solo se la vista propria è diversa da quella del calendario
            bottoneVistaCalendario.classList.toggle('hidden', !vistaPropria || preferenza.vista === preferenza.vista_calendario);
        }

        // Salva la vista scelta; se il backend risponde con un errore, il menu torna com'era
        async function salvaVista(vista) {
            try {
                preferenza = await chiamaApi(`/preferenze-vista/imposta/${calendarioId}`, {
                    metodo: 'PUT',
                    corpo: { vista },
                });
                selectVista.value = preferenza.vista;
                aggiornaSpiegazione();
                mostraToast('Vista salvata!', 'successo');
            } catch (erroreBackend) {
                selectVista.value = preferenza.vista;
                mostraToast(erroreBackend.message);
            }
        }

        selectVista.addEventListener('change', () => salvaVista(selectVista.value));
        bottoneVistaCalendario.addEventListener('click', () => salvaVista(preferenza.vista_calendario));

        aggiornaSpiegazione();
        return card;
    }

    // Card "Membri": chi può modificare, elenco dei membri e inviti (solo calendari condivisi)
    function creaCardMembri(sonoAmministratore) {
        const { card, corpo } = creaCardSezione('Membri');

        // Chi può modificare: l'amministratore lo cambia (si salva subito), i membri lo leggono
        let selectPermesso = null;

        if (sonoAmministratore) {
            selectPermesso = aggiungiSelezione(corpo, 'impostazioni-permesso', 'Chi può modificare', PERMESSI);
            selectPermesso.value = calendario.permesso_modifica;

            selectPermesso.addEventListener('change', async () => {
                try {
                    calendario = await chiamaApi(`/calendari/modifica/${calendarioId}`, {
                        metodo: 'PUT',
                        corpo: { permesso_modifica: selectPermesso.value },
                    });
                    // Con "Decido io per ogni membro" accanto ai membri compaiono le spunte
                    disegnaElenco();
                    mostraToast('Salvato!', 'successo');
                } catch (erroreBackend) {
                    selectPermesso.value = calendario.permesso_modifica;
                    mostraToast(erroreBackend.message);
                }
            });
        } else {
            // Testi per chi non è amministratore
            const TESTI_PERMESSO_MEMBRO = {
                solo_amministratore: 'solo l\'amministratore',
                tutti: 'tutti i membri',
                personalizzato: 'l\'amministratore decide per ogni membro',
            };

            const testoPermesso = document.createElement('p');
            testoPermesso.textContent = `Chi può modificare: ${TESTI_PERMESSO_MEMBRO[calendario.permesso_modifica]}`;
            corpo.appendChild(testoPermesso);
        }

        const elenco = document.createElement('div');
        elenco.className = 'flex flex-col divide-y divide-base-300';
        corpo.appendChild(elenco);

        // Crea la riga di una persona: nome, email sotto e, a destra, gli elementi della lista
        // "elementiDestra" (es. la scritta "Amministratore", lo stato dell'invito, la spunta, la ✕)
        function creaRigaPersona(persona, elementiDestra) {
            const riga = document.createElement('div');
            riga.className = 'flex items-center gap-3 py-2';

            const testi = document.createElement('div');
            testi.className = 'flex min-w-0 flex-1 flex-col';

            const nome = document.createElement('p');
            nome.className = 'truncate font-medium';
            nome.textContent = nomeCompleto(persona);

            const email = document.createElement('p');
            email.className = 'truncate text-sm text-base-content/60';
            email.textContent = persona.email || '';

            testi.appendChild(nome);
            testi.appendChild(email);
            riga.appendChild(testi);
            elementiDestra.forEach((elemento) => riga.appendChild(elemento));

            return riga;
        }

        // Spunta "Può modificare" di un membro: si salva subito, se c'è un errore torna com'era
        function creaSpuntaPermesso(membro) {
            const etichetta = document.createElement('label');
            etichetta.className = 'flex shrink-0 cursor-pointer items-center gap-2 text-sm';

            const spunta = document.createElement('input');
            spunta.type = 'checkbox';
            spunta.className = 'checkbox checkbox-sm';
            spunta.checked = membro.puo_modificare;

            spunta.addEventListener('change', async () => {
                try {
                    calendario = await chiamaApi(`/calendari/permesso-modifica/${calendarioId}/${membro.utente_id}`, {
                        metodo: 'PUT',
                        corpo: { puo_modificare: spunta.checked },
                    });
                    mostraToast('Salvato!', 'successo');
                } catch (erroreBackend) {
                    spunta.checked = !spunta.checked;
                    mostraToast(erroreBackend.message);
                }
            });

            etichetta.appendChild(spunta);
            etichetta.append('Può modificare');
            return etichetta;
        }

        // Bottone ✕ per togliere un membro (solo amministratore), con conferma
        function creaBottoneRimuovi(membro) {
            const bottone = document.createElement('button');
            bottone.type = 'button';
            bottone.className = 'btn btn-ghost btn-sm btn-square';
            bottone.setAttribute('aria-label', `Togli ${nomeCompleto(membro)}`);
            bottone.appendChild(creaIcona(X, 16));

            bottone.addEventListener('click', async () => {
                const scelta = await chiediConferma(
                    'Togliere il membro?',
                    `${nomeCompleto(membro)} non vedrà più questo calendario. Vuoi continuare?`,
                    [{ testo: 'Togli', valore: 'togli', pericolosa: true }],
                );

                if (!scelta) return;

                impostaCaricamento(bottone, true);

                try {
                    calendario = await chiamaApi(`/calendari/rimuovi-membro/${calendarioId}/${membro.utente_id}`, { metodo: 'DELETE' });
                    disegnaElenco();
                    mostraToast('Membro tolto', 'successo');
                } catch (erroreBackend) {
                    impostaCaricamento(bottone, false);
                    mostraToast(erroreBackend.message);
                }
            });

            return bottone;
        }

        // Ridisegna l'elenco: prima l'amministratore, poi i membri.
        // Si richiama dopo ogni cambio (invito, rimozione, permesso)
        function disegnaElenco() {
            elenco.innerHTML = '';

            const scrittaAmministratore = document.createElement('span');
            scrittaAmministratore.className = 'badge badge-sm badge-ghost shrink-0';
            scrittaAmministratore.textContent = 'Amministratore';
            elenco.appendChild(creaRigaPersona(calendario.amministratore, [scrittaAmministratore]));

            calendario.membri.forEach((membro) => {
                const elementiDestra = [];

                // Chi non ha ancora accettato ha la scritta dello stato
                if (membro.stato_invito !== 'accettato') {
                    const stato = document.createElement('span');
                    stato.className = 'badge badge-sm badge-ghost shrink-0';
                    stato.textContent = TESTI_STATO_INVITO[membro.stato_invito];
                    elementiDestra.push(stato);
                }
                // Chi non è amministratore vede accanto a ogni membro cosa può fare
                // (con "personalizzato" decide la spunta che l'amministratore ha messo a quel membro)
                if (!sonoAmministratore && membro.stato_invito === 'accettato') {
                    const puoModificare = calendario.permesso_modifica === 'tutti'
                        || (calendario.permesso_modifica === 'personalizzato' && membro.puo_modificare);

                    // Accanto al mio nome "Puoi", accanto agli altri "Può"
                    const sonoIo = membro.utente_id === utente.id;

                    const permesso = document.createElement('span');
                    permesso.className = 'badge badge-sm badge-ghost shrink-0';
                    permesso.textContent = !puoModificare ? 'Solo lettura' : sonoIo ? 'Puoi modificare' : 'Può modificare';
                    elementiDestra.push(permesso);
                }
                // La spunta serve solo con "Decido io per ogni membro" e a chi ha accettato
                if (sonoAmministratore && calendario.permesso_modifica === 'personalizzato' && membro.stato_invito === 'accettato') {
                    elementiDestra.push(creaSpuntaPermesso(membro));
                }

                if (sonoAmministratore) elementiDestra.push(creaBottoneRimuovi(membro));

                elenco.appendChild(creaRigaPersona(membro, elementiDestra));
            });
        }

        disegnaElenco();

        // Invito tramite email: solo l'amministratore
        if (sonoAmministratore) {
            const formInvito = document.createElement('form');
            formInvito.className = 'flex flex-col gap-3';
            // Gli errori li mostro io con la scritta rossa, non il fumetto del browser
            formInvito.noValidate = true;

            const inputEmail = aggiungiCampo(formInvito, 'impostazioni-invito', 'Invita qualcuno con la sua email', 'email');

            const erroreInvito = creaTestoErrore();
            formInvito.appendChild(erroreInvito);

            const bottoneInvita = creaBottoneInvio('Invita');
            formInvito.appendChild(bottoneInvita);

            formInvito.addEventListener('submit', async (eventoInvio) => {
                eventoInvio.preventDefault();

                if (inputEmail.value.trim() === '') {
                    mostraErrore(erroreInvito, 'L\'email è obbligatoria');
                    return;
                }

                impostaCaricamento(bottoneInvita, true);

                try {
                    calendario = await chiamaApi(`/calendari/invita/${calendarioId}`, {
                        metodo: 'POST',
                        corpo: { email: inputEmail.value.trim() },
                    });
                    inputEmail.value = '';
                    erroreInvito.textContent = '';
                    disegnaElenco();
                    mostraToast('Invito inviato!', 'successo');
                } catch (erroreBackend) {
                    // Il messaggio arriva dal backend (es. utente non trovato, già membro)
                    mostraErrore(erroreInvito, erroreBackend.message);
                } finally {
                    impostaCaricamento(bottoneInvita, false);
                }
            });

            corpo.appendChild(formInvito);
        }

        return card;
    }

    // Card in fondo: elimina il calendario (amministratore) o esci (membro), con conferma 
    function creaCardElimina(sonoAmministratore) {
        const { card, corpo } = creaCardSezione(sonoAmministratore ? 'Elimina calendario' : 'Esci dal calendario');

        const spiegazione = document.createElement('p');
        spiegazione.className = 'text-sm text-base-content/70';
        // Nei condivisi il calendario sparisce anche per i membri; nei personali c'è solo chi lo ha creato
        if (!sonoAmministratore) {
            spiegazione.textContent = 'Non vedrai più questo calendario. Per rientrare servirà un nuovo invito';
        } else if (calendario.tipo === 'condiviso') {
            spiegazione.textContent = 'Il calendario verrà eliminato per tutti i membri, con tutto quello che contiene';
        } else {
            spiegazione.textContent = 'Il calendario verrà eliminato, con tutto quello che contiene';
        }

        const bottone = document.createElement('button');
        bottone.type = 'button';
        bottone.className = 'btn btn-outline btn-error';
        bottone.textContent = sonoAmministratore ? 'Elimina calendario' : 'Esci dal calendario';

        bottone.addEventListener('click', async () => {
            const scelta = await chiediConferma(
                sonoAmministratore ? 'Eliminare il calendario?' : 'Uscire dal calendario?',
                sonoAmministratore
                    ? `"${calendario.nome}" verrà eliminato definitivamente, con tutto quello che contiene. Vuoi continuare?`
                    : `Non vedrai più "${calendario.nome}". Vuoi continuare?`,
                [{ testo: sonoAmministratore ? 'Elimina' : 'Esci', valore: 'conferma', pericolosa: true }],
            );

            if (!scelta) return;

            impostaCaricamento(bottone, true);

            try {
                if (sonoAmministratore) {
                    await chiamaApi(`/calendari/elimina/${calendarioId}`, { metodo: 'DELETE' });
                    mostraToast('Calendario eliminato', 'successo');
                } else {
                    // Uscire vuol dire togliere sé stessi dai membri
                    await chiamaApi(`/calendari/rimuovi-membro/${calendarioId}/${utente.id}`, { metodo: 'DELETE' });
                    mostraToast('Sei uscito dal calendario', 'successo');
                }

                window.location.hash = '#/area-personale';
            } catch (erroreBackend) {
                impostaCaricamento(bottone, false);
                mostraToast(erroreBackend.message);
            }
        });

        corpo.appendChild(spiegazione);
        corpo.appendChild(bottone);
        return card;
    }

    // Caricamento dal backend
    async function caricaImpostazioni() {
        try {
            [calendario, preferenza] = await Promise.all([
                chiamaApi(`/calendari/dettagli/${calendarioId}`),
                chiamaApi(`/preferenze-vista/visualizza/${calendarioId}`),
            ]);

            const sonoAmministratore = calendario.utente_id === utente.id;

            aggiornaIntestazione(calendario.colore || COLORE_PREDEFINITO, calendario.nome);
            // Il colore del calendario serve anche ai componenti che lo usano (es. tavolozza)
            contenitore.style.setProperty('--colore-calendario', calendario.colore || COLORE_PREDEFINITO);

            caricamento.remove();
            sezione.appendChild(intestazione);
            sezione.appendChild(creaCardGenerale(sonoAmministratore));
            sezione.appendChild(creaCardVista(sonoAmministratore));
            // I membri ci sono solo nei calendari condivisi
            if (calendario.tipo === 'condiviso') sezione.appendChild(creaCardMembri(sonoAmministratore));
            sezione.appendChild(creaCardElimina(sonoAmministratore));
        } catch (errore) {
            // Calendario inesistente o senza accesso: si torna all'area personale
            mostraToast(errore.message);
            window.location.hash = '#/area-personale';
        }
    }

    caricaImpostazioni();

    return contenitore;
}