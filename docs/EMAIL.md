# Sistema email

Tutte le email di PosaFacile escono da **Resend**, dal dominio verificato
`posafacile.com`, mittente `no-reply@posafacile.com`.

Ci sono due famiglie, che passano da strade diverse ma hanno la stessa grafica.

## 1. Email transazionali (ordini, cantieri, avvisi)

```
trigger Postgres  →  dispatch_notification()  →  email_outbox
                                                      │
                          cron (ogni 2 min) ──────────┘
                                   │
                          Edge Function send-emails  →  Resend
```

L'invio non sta dentro ai trigger di proposito: una transazione di ordine non
deve dipendere dalla raggiungibilità di un servizio esterno. Il trigger accoda e
basta; se Resend è irraggiungibile la riga resta in coda e si riprova.

| Pezzo | Dove |
| :--- | :--- |
| Coda | `public.email_outbox` |
| Accodamento | `public.dispatch_notification()` |
| Dati per i template | `public.get_email_order_context(order_id)` |
| Scheduler | `cron.job` → `public.drain_email_outbox()` (pg_cron + pg_net) |
| Invio e impaginazione | `supabase/functions/send-emails/` |

### Ritentativi

Ogni riga ha `attempts`. Si riprova fino a 3 volte, poi resta `failed` con
`last_error` leggibile. Le righe `sent` conservano il `provider_message_id`, che
è la chiave per ritrovare l'invio nei log di Resend.

### Template

Un file per famiglia in `supabase/functions/send-emails/`:

- `format.ts` — date, importi, metri quadri, indirizzi in italiano
- `layout.ts` — impaginazione (tabelle e stili inline: è l'unico HTML che
  Outlook e Gmail rendono allo stesso modo)
- `templates.ts` — un template per evento
- `sample.ts` — dati finti per le anteprime

La chiave del template si risolve dal più specifico al più generico:

1. la colonna `template` scritta dal trigger (`metadata.email_template`)
2. `evento.ruolo.variante` — variante è `metadata.step` o `metadata.status`
3. `evento.ruolo`
4. `evento`
5. `generic`

Quindi **un evento nuovo parte lo stesso**, impaginato col template generico,
anche se nessuno gli ha ancora scritto un testo dedicato.

### Anteprime e test

La funzione accetta, oltre alla chiamata normale:

```bash
URL=https://<ref>.supabase.co/functions/v1/send-emails
KEY=<service role key oppure JWT di un utente admin>

# Non invia nulla, dice solo cosa partirebbe
curl -X POST "$URL" -H "Authorization: Bearer $KEY" \
  -H 'Content-Type: application/json' -d '{"dry_run":true}'

# Restituisce l'HTML di un template, con dati di esempio
curl -X POST "$URL" -H "Authorization: Bearer $KEY" \
  -H 'Content-Type: application/json' -d '{"preview":"room_prep_reminder.customer"}'

# Spedisce quel template a un indirizzo, con oggetto [TEST]
curl -X POST "$URL" -H "Authorization: Bearer $KEY" \
  -H 'Content-Type: application/json' \
  -d '{"preview":"job_assigned.professional","test_to":"io@esempio.it"}'
```

L'accesso è ristretto a service role e utenti con ruolo `admin`: `verify_jwt` da
solo accetterebbe anche la anon key, che è pubblica.

## 2. Email di autenticazione

Conferma registrazione, recupero password, invito posatore, magic link e cambio
indirizzo **non passano dalla coda**: le manda GoTrue, il servizio auth di
Supabase.

Vanno configurate dalla dashboard, in due punti:

**Authentication → Emails → SMTP Settings** — altrimenti restano sull'SMTP
condiviso di Supabase, che ha un limite di 4 email l'ora e un mittente
`@supabase.io`:

| Campo | Valore |
| :--- | :--- |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | la API key di Resend |
| Sender email | `no-reply@posafacile.com` |
| Sender name | `PosaFacile` |

**Authentication → Emails → Templates** — il corpo di ciascuna email si incolla
da `supabase/auth-templates/`:

| Template dashboard | File |
| :--- | :--- |
| Confirm signup | `confirmation.html` |
| Reset password | `recovery.html` |
| Invite user | `invite.html` |
| Magic link | `magic-link.html` |
| Change email address | `email-change.html` |

I segnaposto `{{ .ConfirmationURL }}`, `{{ .Email }}` e `{{ .NewEmail }}` sono
quelli di GoTrue e vanno lasciati come sono.

## Segreti

Sui secret delle Edge Function (`supabase secrets set`):

| Nome | Valore |
| :--- | :--- |
| `RESEND_API_KEY` | chiave API di Resend |
| `RESEND_FROM` | `PosaFacile <no-reply@posafacile.com>` |
| `RESEND_REPLY_TO` | `supporto@posafacile.com` |
| `APP_BASE_URL` | `https://posafacile.com` |

Nel Vault del database (li legge solo il cron):

| Nome | Valore |
| :--- | :--- |
| `send_emails_url` | URL della Edge Function |
| `send_emails_key` | chiave con cui il cron si autentica |

Stanno nel Vault e non nel comando del cron perché `cron.job` è una tabella
leggibile: una service role key incollata lì sarebbe una chiave in chiaro.

## Preferenze

`public.notification_preferences` decide, per evento e ruolo, se l'avviso esce
in piattaforma, per email, o entrambi. La ricerca va dalla preferenza personale
dell'utente al default del suo ruolo. L'elenco visibile in
`/admin/notifications` viene da `NOTIFICATION_EVENT_DEFINITIONS` in
`src/types/notifications.ts`: un evento aggiunto solo lato database resta
invisibile all'admin finché non compare anche lì.

## Elenco degli eventi

**Cliente** — benvenuto, preventivo salvato, ordine confermato, pagamento
ricevuto, posatore assegnato, materiale confermato, via libera, data confermata,
materiale spedito, materiale consegnato, prepara la stanza, lavori iniziati,
posa completata, ordine annullato, richiesta informazioni, informazioni
ricevute, nuovo messaggio in chat.

**Posatore** — benvenuto, profilo abilitato, nuovo cantiere assegnato, materiale
in cantiere, cantiere annullato, nuovo messaggio in chat.

**Amministrazione** — nuovo ordine, pagamento incassato, cantiere assegnato,
durata confermata o corretta dal posatore, nuova iscrizione posatore, cambi di
stato, giacenza sotto soglia.
