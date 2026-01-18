# POSAFACILE
## Piattaforma E-commerce per Servizi di Posa Piastrelle
### Business Plan e Specifiche Tecniche Complete

**Versione:** 1.0  
**Data:** Dicembre 2024  
**Stack Tecnologico:** Vite + React + Supabase

---

# INDICE

1. [Executive Summary](#1-executive-summary)
2. [Modello di Business](#2-modello-di-business)
3. [Architettura Piattaforma](#3-architettura-piattaforma)
4. [Stack Tecnologico](#4-stack-tecnologico)
5. [Area Admin](#5-area-admin)
6. [Area Professionisti](#6-area-professionisti)
7. [Area Clienti](#7-area-clienti)
8. [Funzionalità AI](#8-funzionalità-ai)
9. [Database Schema (Supabase)](#9-database-schema-supabase)
10. [Autenticazione e Sicurezza](#10-autenticazione-e-sicurezza)
11. [Integrazioni Esterne](#11-integrazioni-esterne)
12. [Roadmap di Sviluppo](#12-roadmap-di-sviluppo)
13. [KPI e Metriche](#13-kpi-e-metriche)
14. [Aspetti Legali](#14-aspetti-legali)

---

# 1. EXECUTIVE SUMMARY

## 1.1 Vision

PosaFacile rivoluziona il settore della posa piastrelle in Italia, offrendo un'esperienza cliente completamente digitalizzata che unisce:
- Selezione del prodotto da catalogo
- Visualizzazione AI del risultato finale nel proprio ambiente
- Prenotazione del servizio di posa professionale

Il tutto in un'unica piattaforma integrata sotto **un unico brand**.

## 1.2 Mission

Semplificare e rendere accessibile a privati e aziende il processo di ristrutturazione e posa piastrelle, garantendo:
- Qualità costante
- Trasparenza nei prezzi
- Professionalità certificata

Attraverso una rete di posatori che operano **esclusivamente sotto il brand PosaFacile**.

## 1.3 Cosa NON è PosaFacile

**PosaFacile NON è un marketplace.** È un brand unico che:
- Vende direttamente le piastrelle ai clienti
- Gestisce una rete di professionisti collaboratori (non venditori indipendenti)
- Controlla l'intera esperienza cliente dall'ordine alla posa completata
- Garantisce standard qualitativi uniformi su tutto il territorio servito

## 1.4 Proposta di Valore Unica (UVP)

| Feature | Descrizione |
|---------|-------------|
| **Visualizzazione AI** | Il cliente carica una foto del suo ambiente e vede come apparirà la piastrella scelta |
| **Preventivo Istantaneo** | Calcolo automatico basato su metratura, tipo di posa e zona geografica |
| **Prenotazione Smart** | Sistema di booking integrato con disponibilità real-time dei professionisti |
| **Qualità Garantita** | Rete di professionisti selezionati e formati secondo gli standard PosaFacile |
| **Brand Unico** | Esperienza coerente e riconoscibile in tutto il territorio |

## 1.5 Target di Mercato

### B2C - Clienti Privati
- Proprietari di casa che vogliono ristrutturare bagno, cucina o pavimenti
- Nuovi acquirenti immobiliari che personalizzano la nuova casa
- Persone che cercano soluzioni chiavi in mano senza gestire più fornitori

### B2B - Clienti Business
- PMI che necessitano di lavori spot (negozi, uffici)
- Amministratori di condominio per aree comuni
- Imprese edili che esternalizzano la posa
- Hotel, ristoranti e attività commerciali

---

# 2. MODELLO DI BUSINESS

## 2.1 Revenue Streams

| Fonte di Ricavo | Margine Stimato | Descrizione |
|-----------------|-----------------|-------------|
| Vendita Piastrelle | 25-40% | Margine sulla vendita del materiale |
| Servizio di Posa | 15-25% | Fee sulla manodopera dei professionisti |
| Servizi Accessori | 30-50% | Massetto, impermeabilizzazione, demolizione, smaltimento |
| Premium Features | 100% | Visualizzazione AI avanzata, progetti 3D personalizzati |

## 2.2 Struttura Compensi Professionisti

I professionisti PosaFacile sono **collaboratori** che lavorano sotto il brand aziendale:

- **Tariffa base garantita:** Compenso minimo per mq in base alla zona geografica
- **Bonus qualità:** Incentivi basati su recensioni clienti (rating > 4.5) e zero contestazioni
- **Bonus volume:** Maggiorazioni per professionisti ad alto rendimento mensile
- **Formazione inclusa:** Corsi periodici sulle nuove tecniche e materiali (obbligatori)

## 2.3 Pricing Strategy - Fattori di Calcolo

| Fattore | Impatto sul Prezzo |
|---------|-------------------|
| Tipo di piastrella | Base del calcolo materiale |
| Metratura totale | Sconti volume oltre 50mq |
| Tipo di posa | +0% dritta, +15% diagonale, +25% spina, +30% mosaico |
| Zona geografica | Coefficiente territoriale (1.0 - 1.4) |
| Stagionalità | -10% bassa stagione, +10% alta stagione |
| Urgenza | +20% consegna express (< 7 giorni) |

## 2.4 Proiezioni Finanziarie

| KPI | Anno 1 | Anno 2 | Anno 3 |
|-----|--------|--------|--------|
| GMV (Gross Merchandise Value) | €500.000 | €2.000.000 | €5.000.000 |
| Ordini completati | 200 | 800 | 2.000 |
| Ordine medio | €2.500 | €2.500 | €2.500 |
| Margine lordo | 25% | 28% | 30% |
| Professionisti attivi | 20 | 80 | 200 |
| Zone coperte (province) | 5 | 20 | 50 |

---

# 3. ARCHITETTURA PIATTAFORMA

## 3.1 Le Tre Aree Principali

```
┌─────────────────────────────────────────────────────────────────┐
│                        POSAFACILE                                │
├─────────────────┬─────────────────────┬─────────────────────────┤
│   ADMIN PANEL   │   PRO DASHBOARD     │    CUSTOMER PORTAL      │
│                 │                     │                         │
│ • Gestione      │ • Gestione lavori   │ • Catalogo piastrelle   │
│   catalogo      │ • Calendario        │ • Visualizzazione AI    │
│ • Gestione      │ • Disponibilità     │ • Configuratore         │
│   professionisti│ • Pagamenti         │   preventivo            │
│ • Ordini        │ • Comunicazioni     │ • Checkout/Pagamento    │
│ • Analytics     │ • Documenti         │ • Tracking ordine       │
│ • Comunicazioni │                     │ • Area personale        │
│ • Configurazione│                     │                         │
└─────────────────┴─────────────────────┴─────────────────────────┘
```

## 3.2 Flusso Utente Cliente

```
1. SCOPERTA
   │
   ▼
2. CATALOGO ──────► Filtri, ricerca, dettaglio prodotto
   │
   ▼
3. VISUALIZZAZIONE AI ──────► Upload foto → Rendering piastrella nell'ambiente
   │
   ▼
4. CONFIGURATORE PREVENTIVO
   │  • Selezione piastrella
   │  • Metratura (mq pavimento + mq pareti)
   │  • Tipo di posa
   │  • Servizi accessori
   │  • Indirizzo
   │  • Data preferita
   │
   ▼
5. CHECKOUT ──────► Riepilogo → Pagamento → Conferma
   │
   ▼
6. TRACKING ──────► Stati ordine → Spedizione → Posa → Completamento
   │
   ▼
7. RECENSIONE
```

## 3.3 Flusso Gestione Ordine (Admin)

```
NUOVO ORDINE
     │
     ▼
VERIFICA PAGAMENTO ──────► Se fallito → Contatta cliente
     │
     ▼
ASSEGNAZIONE PROFESSIONISTA ──────► Algoritmo matching zona + disponibilità
     │
     ▼
ORDINE MATERIALE AL FORNITORE
     │
     ▼
SPEDIZIONE MATERIALE ──────► Tracking corriere
     │
     ▼
CONFERMA CONSEGNA MATERIALE
     │
     ▼
ESECUZIONE LAVORO ──────► Check-in/Check-out professionista
     │
     ▼
COMPLETAMENTO ──────► Firma cliente → Richiesta recensione
     │
     ▼
PAGAMENTO PROFESSIONISTA
```

---

# 4. STACK TECNOLOGICO

## 4.1 Overview

| Layer | Tecnologia | Motivazione |
|-------|------------|-------------|
| **Frontend** | Vite + React | Performance, DX eccellente, ecosystem maturo |
| **Styling** | Tailwind CSS | Utility-first, veloce da sviluppare |
| **UI Components** | shadcn/ui | Componenti accessibili, personalizzabili |
| **State Management** | Zustand | Leggero, semplice, TypeScript-friendly |
| **Backend/DB** | Supabase | PostgreSQL, Auth, Storage, Realtime tutto incluso |
| **AI** | Replicate / OpenAI | Modelli ML per visualizzazione |
| **Payments** | Stripe | Standard di settore, Stripe Connect per payout |
| **Hosting** | Vercel | Deploy automatico, edge functions |

## 4.2 Struttura Progetto React

```
src/
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── layout/             # Header, Footer, Sidebar, etc.
│   ├── catalog/            # ProductCard, ProductGrid, Filters
│   ├── configurator/       # Steps del preventivo
│   ├── ai/                 # AIVisualizer component
│   ├── checkout/           # Cart, PaymentForm
│   ├── admin/              # Componenti area admin
│   └── pro/                # Componenti area professionisti
│
├── pages/
│   ├── public/             # Home, Catalog, Product, About
│   ├── auth/               # Login, Register, ResetPassword
│   ├── customer/           # Dashboard, Orders, Profile
│   ├── admin/              # Dashboard, Products, Orders, Pros, Settings
│   └── pro/                # Dashboard, Jobs, Calendar, Earnings
│
├── hooks/
│   ├── useAuth.js
│   ├── useProducts.js
│   ├── useOrders.js
│   ├── useAvailability.js
│   └── useAIVisualization.js
│
├── lib/
│   ├── supabase.js         # Client Supabase
│   ├── stripe.js           # Integrazione Stripe
│   ├── ai.js               # API visualizzazione AI
│   └── utils.js
│
├── store/
│   ├── cartStore.js
│   ├── userStore.js
│   └── configStore.js
│
└── styles/
    └── globals.css
```

## 4.3 Supabase Services Utilizzati

| Servizio | Uso |
|----------|-----|
| **Database (PostgreSQL)** | Tutti i dati applicativi |
| **Auth** | Autenticazione utenti (email, Google, phone) |
| **Storage** | Immagini prodotti, documenti professionisti, foto lavori |
| **Realtime** | Notifiche, chat, aggiornamenti stato ordine |
| **Edge Functions** | Webhook Stripe, elaborazione AI, invio email |
| **Row Level Security** | Controllo accessi granulare per ruolo |

---

# 5. AREA ADMIN

## 5.1 Dashboard Principale

### KPI Real-time
- Ordini oggi / settimana / mese
- Fatturato con confronto periodo precedente
- Conversion rate (preventivi → ordini)
- Professionisti attivi / in pausa / nuove richieste
- Ticket supporto aperti
- Rating medio recensioni ultimi 30 giorni

### Grafici
- Andamento vendite (line chart con drill-down per categoria)
- Mappa geografica ordini (heatmap)
- Top 10 piastrelle vendute
- Top 10 professionisti per volume/rating
- Funnel: visita → preventivo → ordine → completamento

## 5.2 Gestione Catalogo Piastrelle

### Scheda Prodotto - Campi

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| sku | string | Codice univoco |
| name | string | Nome commerciale |
| slug | string | URL-friendly per SEO |
| description | text | Descrizione completa |
| category | enum | floor, wall, outdoor, mosaic |
| material | enum | gres, ceramic, cotto, natural_stone |
| format_width | integer | Larghezza in mm |
| format_height | integer | Altezza in mm |
| thickness | decimal | Spessore in mm |
| finish | enum | matt, glossy, textured, lappato |
| color_name | string | Nome colore |
| color_hex | string | Codice esadecimale |
| style_tags | array | Moderno, Classico, Industrial, etc. |
| price_per_sqm | decimal | Prezzo vendita €/mq |
| cost_per_sqm | decimal | Costo acquisto €/mq (solo admin) |
| min_order_sqm | decimal | Ordine minimo in mq |
| stock_qty | decimal | Quantità disponibile |
| lead_time_days | integer | Giorni approvvigionamento |
| supplier_id | uuid | Riferimento fornitore |
| images | jsonb | Array URL immagini galleria |
| tileable_image | string | Texture per rendering AI |
| datasheet_url | string | Scheda tecnica PDF |
| certifications | array | CE, R9-R13, PEI, etc. |
| status | enum | draft, active, out_of_stock, discontinued |
| seo_title | string | Meta title |
| seo_description | string | Meta description |

### Funzionalità Gestione Catalogo
- **Import massivo:** Upload CSV/Excel con mapping campi
- **Editor visuale:** Drag-and-drop per ordinare immagini
- **Duplicazione:** Crea varianti da prodotto esistente
- **Storico prezzi:** Tracking modifiche nel tempo
- **Filtri avanzati:** Ricerca per qualsiasi attributo
- **Azioni bulk:** Modifica multipla prezzo, stato, categoria
- **Preview:** Anteprima pagina prodotto

## 5.3 Gestione Professionisti

### Processo Onboarding

```
1. CANDIDATURA
   │ Form con dati anagrafici e professionali
   ▼
2. VERIFICA DOCUMENTI
   │ P.IVA, Assicurazione RC, Portfolio lavori, DURC
   ▼
3. COLLOQUIO
   │ Videochiamata valutazione competenze
   ▼
4. FORMAZIONE
   │ Corso online standard PosaFacile (obbligatorio)
   ▼
5. TEST PRATICO
   │ Primo lavoro supervisionato
   ▼
6. ATTIVAZIONE
   │ Profilo attivo nel sistema
```

### Scheda Professionista

| Sezione | Dati | Azioni Admin |
|---------|------|--------------|
| Anagrafica | Nome, cognome, CF, P.IVA, contatti | Modifica, blocco account |
| Documenti | Assicurazione, DURC, Visura camerale | Upload, verifica, alert scadenze |
| Zone Operative | CAP/Province servite, raggio km | Assegnazione/modifica zone |
| Competenze | Tipi posa certificati | Aggiunta/rimozione skill |
| Performance | Lavori completati, rating, puntualità | Report dettagliato |
| Pagamenti | IBAN, storico bonifici | Esecuzione pagamenti |
| Calendario | Disponibilità, ferie | Vista e modifica forzata |

### Azioni sui Professionisti
- **Sospensione temporanea:** Blocca nuove assegnazioni
- **Disattivazione:** Rimozione completa dalla rete
- **Riassegnazione lavori:** Sposta lavori ad altro professionista
- **Modifica tariffa:** Adeguamento compensi individuali
- **Badge:** Assegnazione Top Performer, Specialista, etc.
- **Comunicazioni:** Email/push individuali o broadcast

## 5.4 Gestione Ordini

### Stati Ordine

| Stato | Descrizione | Azioni Disponibili |
|-------|-------------|-------------------|
| new | Ordine appena creato | Conferma, Modifica, Annulla |
| confirmed | Pagamento ricevuto | Assegna professionista |
| assigned | Professionista assegnato | Riassegna, Contatta |
| material_shipped | Piastrelle in consegna | Tracking, Segnala problema |
| material_delivered | Materiale arrivato | Conferma consegna |
| in_progress | Posa in corso | Monitora, Supporto |
| completed | Lavoro terminato | Richiedi recensione |
| disputed | Reclamo aperto | Gestisci contestazione |
| refunded | Rimborso effettuato | Archivia |

### Dettaglio Ordine (Vista Admin)
- Dati cliente completi
- Prodotti ordinati con quantità e prezzi
- Servizi accessori
- Indirizzo consegna/lavoro con mappa
- Professionista assegnato con contatti
- Timeline stati con timestamp
- Comunicazioni (chat interna)
- Documenti (fattura, DDT, foto)
- Note interne

## 5.5 Sistema Comunicazioni

### Canali
- **Chat interna:** Conversazioni 1:1 o thread per ordine
- **Email:** Template automatici + manuali
- **Push notifications:** Per app mobile/PWA
- **SMS:** Per comunicazioni urgenti

### Template Automatici

| Evento | Destinatario | Canale |
|--------|--------------|--------|
| Nuovo ordine | Admin | Email, Push |
| Ordine confermato | Cliente | Email |
| Ordine assegnato | Cliente, Professionista | Email, Push |
| Spedizione partita | Cliente | Email, Push, SMS |
| Promemoria appuntamento | Cliente, Professionista | Push, SMS (24h prima) |
| Lavoro completato | Cliente | Email, Push |
| Richiesta recensione | Cliente | Email (48h dopo) |
| Nuova recensione | Admin, Professionista | Email, Push |
| Documento in scadenza | Professionista, Admin | Email (30/15/7/1 gg) |
| Pagamento effettuato | Professionista | Email, Push |

## 5.6 Configurazione Sistema

- **Tariffe posa per zona:** €/mq per provincia/regione
- **Coefficienti stagionali:** Maggiorazioni/sconti per periodi
- **Tipologie posa:** Metodi e relativi supplementi %
- **Servizi accessori:** Prezzi demolizione, massetto, etc.
- **Metodi pagamento:** Attivazione gateway
- **Email templates:** Personalizzazione comunicazioni
- **Termini e condizioni:** Documenti legali
- **FAQ:** Contenuti sezione aiuto

---

# 6. AREA PROFESSIONISTI

## 6.1 Dashboard Professionista

### Pannello Riepilogo
- **Lavori in programma:** Lista prossimi con countdown
- **Lavoro corrente:** Dettagli con timer attivo
- **Nuove richieste:** Lavori proposti in attesa conferma
- **Guadagni del mese:** Totale maturato e prossimo pagamento
- **Rating attuale:** Media e trend
- **Messaggi non letti:** Badge notifica

## 6.2 Gestione Calendario

### Viste Disponibili
- **Giornaliera:** Slot orari con dettaglio lavori
- **Settimanale:** Panoramica 7 giorni
- **Mensile:** Calendario compatto con indicatori
- **Sync:** Integrazione Google Calendar / Apple Calendar

### Impostazione Disponibilità

| Funzione | Descrizione |
|----------|-------------|
| Orari standard | Orario lavorativo settimanale (es: Lun-Ven 8-18) |
| Eccezioni | Giorni specifici non disponibili |
| Blocchi ricorrenti | Es: ogni mercoledì pomeriggio off |
| Buffer tra lavori | Tempo minimo tra fine e inizio successivo |
| Preavviso minimo | Anticipo minimo prenotazioni (es: 48h) |
| Raggio massimo | Distanza max dal domicilio per accettare lavori |
| Modalità pausa | Sospensione temporanea |

## 6.3 Gestione Lavori

### Workflow Lavoro

```
1. PROPOSTA RICEVUTA
   │ Notifica push + email con dettagli
   ▼
2. ACCETTAZIONE / RIFIUTO
   │ Conferma o rifiuto motivato (entro 4h)
   ▼
3. CONFERMA MATERIALE
   │ Verifica arrivo piastrelle presso cliente
   ▼
4. CHECK-IN CANTIERE
   │ Registrazione inizio lavoro (geolocalizzata)
   ▼
5. FOTO AVANZAMENTO
   │ Upload documentazione in corso d'opera
   ▼
6. SEGNALAZIONE PROBLEMI (se necessario)
   │ Report anomalie con foto e descrizione
   ▼
7. CHECK-OUT CANTIERE
   │ Fine lavoro con foto risultato finale
   ▼
8. FIRMA CLIENTE
   │ Raccolta firma digitale di accettazione
```

### Scheda Lavoro (Vista Professionista)
- **Cliente:** Nome, telefono, indirizzo con navigatore integrato
- **Piastrella:** Foto, formato, quantità totale
- **Posa:** Tipo richiesto, mq pavimento, mq pareti
- **Servizi extra:** Battiscopa, soglie, etc.
- **Compenso:** Totale con dettaglio voci
- **Note:** Istruzioni speciali cliente/admin
- **Chat:** Comunicazione diretta con cliente e admin

## 6.4 Area Finanziaria

### Pannello Guadagni
- **Saldo attuale:** Totale maturato non pagato
- **Prossimo pagamento:** Data e importo previsto
- **Storico pagamenti:** Lista bonifici con dettaglio
- **Report mensile:** Riepilogo scaricabile
- **Fatture:** Generazione automatica verso PosaFacile

### Calcolo Compenso

| Voce | Calcolo | Esempio |
|------|---------|---------|
| Compenso base | €/mq × mq totali | €15 × 25mq = €375 |
| Maggiorazione posa | % su base per tipo | +15% diagonale = €56,25 |
| Servizi extra | Tariffa fissa/mq | Battiscopa €3/m × 15m = €45 |
| Bonus qualità | Rating > 4.5 | +5% = €23,81 |
| **Totale lordo** | Somma voci | **€500,06** |
| Ritenuta | Secondo regime fiscale | Variabile |

## 6.5 Profilo e Impostazioni

- **Dati personali:** Modifica contatti, foto profilo
- **Documenti:** Upload aggiornamenti assicurazione, DURC
- **Competenze:** Richiesta nuove specializzazioni
- **Zone operative:** Proposta modifica aree servite
- **Dati bancari:** IBAN per accrediti
- **Notifiche:** Preferenze canali e tipologie
- **Formazione:** Accesso a corsi e materiali didattici

---

# 7. AREA CLIENTI

## 7.1 Homepage

### Elementi
- **Hero section:** CTA "Inizia il tuo progetto" con visual d'impatto
- **Come funziona:** 3 step (Scegli → Visualizza → Prenota)
- **Categorie:** Accesso rapido per tipologia/stile
- **Progetti ispiratori:** Gallery lavori completati
- **Recensioni:** Testimonianze verificate
- **FAQ:** Domande frequenti
- **Contatti:** Chat, telefono, form

## 7.2 Catalogo Piastrelle

### Filtri Disponibili

| Filtro | Opzioni | UI Element |
|--------|---------|------------|
| Categoria | Pavimento, Rivestimento, Esterno, Mosaico | Toggle buttons |
| Materiale | Gres, Ceramica, Cotto, Pietra | Checkbox |
| Formato | Piccolo/Medio/Grande/XXL | Range slider |
| Colore | Palette visuale | Color picker |
| Stile | Moderno, Classico, Industrial, etc. | Tag selezionabili |
| Prezzo | Range €/mq | Double slider |
| Finitura | Matt, Lucida, Strutturata | Checkbox |
| Ambiente | Bagno, Cucina, Living, Esterno | Icon buttons |

### Scheda Prodotto
- Gallery fotografica full-screen con zoom
- Specifiche tecniche complete
- Prezzo al mq e stima per metratura
- Disponibilità e tempi di consegna
- **Pulsante "Visualizza nel tuo ambiente"** (AI)
- **Pulsante "Richiedi preventivo"**
- Prodotti correlati
- Scheda tecnica scaricabile

## 7.3 Configuratore Preventivo

### STEP 1 - Tipo di Progetto
- **Ambiente:** Bagno, Cucina, Soggiorno, Camera, Esterno, Altro
- **Intervento:** Nuova costruzione, Ristrutturazione, Sostituzione
- **Stato attuale:** Pavimento da rimuovere? Massetto da fare?

### STEP 2 - Piastrella
- Selezione dal catalogo (se non già scelta)
- Riepilogo caratteristiche e prezzo

### STEP 3 - Dimensioni
- **Input metratura:** Manuale o calcolo da dimensioni stanza
- Superficie pavimento (mq)
- Superficie pareti (mq) se applicabile
- **Sfrido automatico:** +10% consigliato (modificabile)

### STEP 4 - Tipo di Posa
- **Dritta (standard):** +0%
- **Diagonale:** +15%
- **A correre (sfalsata):** +10%
- **Spina di pesce:** +25%
- **Mosaico/Decorativo:** +30-50%
- Preview visuale del pattern

### STEP 5 - Servizi Accessori
- [ ] Demolizione pavimento esistente: €XX/mq
- [ ] Preparazione massetto: €XX/mq
- [ ] Impermeabilizzazione: €XX/mq
- [ ] Smaltimento materiale: €XX/mq
- [ ] Battiscopa: €XX/metro lineare
- [ ] Soglie e profili: €XX/pezzo

### STEP 6 - Località e Data
- **Indirizzo:** Autocomplete Google Maps
- **Verifica copertura:** Check disponibilità zona
- **Data preferita:** Calendario con slot disponibili
- **Opzione flessibile:** "Sono flessibile sulla data"

### STEP 7 - Riepilogo e Pagamento
- Dettaglio completo tutte le voci:
  - Materiale: €XXX
  - Posa: €XXX
  - Servizi: €XXX
  - IVA: €XXX
  - **TOTALE: €XXX**
- Metodi pagamento: Carta, Bonifico, PayPal, Klarna, Scalapay
- Accettazione T&C
- **Conferma ordine**

## 7.4 Area Personale Cliente

### Dashboard
- **I miei ordini:** Lista con stato e tracking
- **Preventivi salvati:** Bozze non completate
- **I miei progetti:** Visualizzazioni AI salvate
- **Wishlist:** Piastrelle preferite
- **Messaggi:** Comunicazioni con PosaFacile
- **Documenti:** Fatture, garanzie, manuali
- **Recensioni:** Feedback sui lavori completati

### Tracking Ordine (Timeline Visuale)
1. ✓ Ordine confermato
2. ✓ Pagamento ricevuto
3. ○ Materiale in preparazione
4. ○ Spedizione in corso (link tracking)
5. ○ Materiale consegnato
6. ○ Appuntamento posa (data, professionista)
7. ○ Lavoro in corso
8. ○ Lavoro completato

---

# 8. FUNZIONALITÀ AI

## 8.1 Visualizzazione Piastrella in Ambiente

### Flusso Utente

```
1. UPLOAD FOTO
   │ Cliente carica foto del proprio ambiente
   ▼
2. RILEVAMENTO AUTOMATICO
   │ AI identifica superfici pavimento/pareti
   ▼
3. SELEZIONE AREA
   │ Utente conferma/modifica area da piastrellare
   ▼
4. APPLICAZIONE TEXTURE
   │ Piastrella applicata con prospettiva corretta
   ▼
5. OPZIONI POSA
   │ Cambio direzione (dritta, diagonale, spina)
   ▼
6. CONFRONTO
   │ Slider before/after
   ▼
7. SALVATAGGIO
   │ Download o salva nel progetto
```

### Specifiche Tecniche

| Componente | Tecnologia | Note |
|------------|------------|------|
| Segmentazione superfici | Segment Anything Model (SAM) | Via Replicate API |
| Stima profondità | MiDaS / DPT | Per prospettiva 3D |
| Texture mapping | Trasformazione omografica | Correzione prospettica |
| Illuminazione | Analisi luce ambiente | Adattamento texture |
| Rendering finale | Blending con ombre/riflessi | Realismo |

### Requisiti
- **Tempo elaborazione:** < 10 secondi
- **Formati supportati:** JPG, PNG, HEIC fino a 20MB
- **Risoluzione output:** Uguale o superiore all'input

## 8.2 Chatbot Assistenza

### Funzionalità
- Risposte FAQ automatiche
- Guida alla scelta piastrella
- Supporto configurazione preventivo
- Escalation a operatore umano
- Disponibile 24/7

### Integrazione
- OpenAI GPT-4 / Claude API
- Knowledge base prodotti PosaFacile
- Storico conversazioni in Supabase

## 8.3 Raccomandazioni Prodotti

- Suggerimenti basati su:
  - Ambiente selezionato
  - Budget indicato
  - Stile preferito
  - Acquisti/visualizzazioni precedenti
- "Clienti che hanno scelto X hanno scelto anche Y"

---

# 9. DATABASE SCHEMA (SUPABASE)

## 9.1 Tabelle Principali

### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  encrypted_password VARCHAR(255),
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'professional', 'customer')),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  avatar_url TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);
```

### customers
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  customer_type VARCHAR(20) NOT NULL CHECK (customer_type IN ('private', 'business')),
  company_name VARCHAR(255),
  vat_number VARCHAR(20),
  fiscal_code VARCHAR(16),
  billing_address_id UUID REFERENCES addresses(id),
  newsletter_consent BOOLEAN DEFAULT FALSE,
  marketing_consent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### professionals
```sql
CREATE TABLE professionals (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  vat_number VARCHAR(20) NOT NULL,
  fiscal_code VARCHAR(16) NOT NULL,
  iban VARCHAR(34),
  insurance_expiry DATE,
  insurance_doc_url TEXT,
  durc_expiry DATE,
  durc_doc_url TEXT,
  rating_avg DECIMAL(2,1) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  jobs_completed INTEGER DEFAULT 0,
  base_rate_per_sqm DECIMAL(10,2),
  max_radius_km INTEGER DEFAULT 50,
  home_location GEOGRAPHY(POINT, 4326),
  onboarding_status VARCHAR(20) DEFAULT 'pending' 
    CHECK (onboarding_status IN ('pending', 'documents', 'training', 'trial', 'active')),
  badges JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### products
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(20) CHECK (category IN ('floor', 'wall', 'outdoor', 'mosaic')),
  material VARCHAR(20) CHECK (material IN ('gres', 'ceramic', 'cotto', 'natural_stone')),
  format_width INTEGER,
  format_height INTEGER,
  thickness DECIMAL(4,1),
  finish VARCHAR(20) CHECK (finish IN ('matt', 'glossy', 'textured', 'lappato')),
  color_name VARCHAR(50),
  color_hex CHAR(7),
  style_tags TEXT[],
  price_per_sqm DECIMAL(10,2) NOT NULL,
  cost_per_sqm DECIMAL(10,2),
  min_order_sqm DECIMAL(6,2) DEFAULT 1,
  stock_qty DECIMAL(10,2),
  lead_time_days INTEGER DEFAULT 7,
  supplier_id UUID REFERENCES suppliers(id),
  images JSONB DEFAULT '[]',
  tileable_image_url TEXT,
  datasheet_url TEXT,
  certifications TEXT[],
  status VARCHAR(20) DEFAULT 'draft' 
    CHECK (status IN ('draft', 'active', 'out_of_stock', 'discontinued')),
  seo_title VARCHAR(70),
  seo_description VARCHAR(160),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### orders
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(20) UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  professional_id UUID REFERENCES professionals(id),
  status VARCHAR(20) DEFAULT 'new'
    CHECK (status IN ('new', 'confirmed', 'assigned', 'material_shipped', 
           'material_delivered', 'in_progress', 'completed', 'disputed', 'refunded')),
  project_type VARCHAR(20),
  intervention_type VARCHAR(20),
  laying_type VARCHAR(20),
  floor_sqm DECIMAL(8,2),
  wall_sqm DECIMAL(8,2),
  delivery_address_id UUID REFERENCES addresses(id),
  scheduled_date DATE,
  scheduled_time_slot VARCHAR(20),
  material_total DECIMAL(10,2),
  laying_total DECIMAL(10,2),
  services_total DECIMAL(10,2),
  subtotal DECIMAL(10,2),
  vat_amount DECIMAL(10,2),
  total DECIMAL(10,2),
  professional_payout DECIMAL(10,2),
  payment_method VARCHAR(20),
  payment_status VARCHAR(20) DEFAULT 'pending',
  payment_intent_id VARCHAR(255),
  notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### order_items
```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity_sqm DECIMAL(8,2),
  unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2)
);
```

### order_services
```sql
CREATE TABLE order_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  service_type VARCHAR(30),
  quantity DECIMAL(8,2),
  unit VARCHAR(20),
  unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2)
);
```

## 9.2 Tabelle di Supporto

### addresses
```sql
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  label VARCHAR(50),
  street VARCHAR(255),
  city VARCHAR(100),
  province VARCHAR(50),
  postal_code VARCHAR(10),
  country VARCHAR(50) DEFAULT 'IT',
  location GEOGRAPHY(POINT, 4326),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### professional_zones
```sql
CREATE TABLE professional_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  province VARCHAR(50),
  postal_codes TEXT[],
  is_active BOOLEAN DEFAULT TRUE
);
```

### professional_skills
```sql
CREATE TABLE professional_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  skill_type VARCHAR(50),
  certified BOOLEAN DEFAULT FALSE,
  certified_at DATE
);
```

### availability_slots
```sql
CREATE TABLE availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_slot VARCHAR(20),
  status VARCHAR(20) DEFAULT 'available' 
    CHECK (status IN ('available', 'booked', 'blocked')),
  order_id UUID REFERENCES orders(id),
  UNIQUE(professional_id, date, time_slot)
);
```

### reviews
```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) UNIQUE,
  customer_id UUID REFERENCES customers(id),
  professional_id UUID REFERENCES professionals(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  photos JSONB DEFAULT '[]',
  is_public BOOLEAN DEFAULT TRUE,
  admin_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### messages
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID,
  sender_id UUID REFERENCES users(id),
  recipient_id UUID REFERENCES users(id),
  order_id UUID REFERENCES orders(id),
  content TEXT,
  attachments JSONB DEFAULT '[]',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### notifications
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type VARCHAR(50),
  title VARCHAR(255),
  body TEXT,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### ai_visualizations
```sql
CREATE TABLE ai_visualizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  product_id UUID REFERENCES products(id),
  original_image_url TEXT,
  result_image_url TEXT,
  laying_type VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### zone_rates
```sql
CREATE TABLE zone_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province VARCHAR(50) UNIQUE,
  region VARCHAR(50),
  laying_rate_per_sqm DECIMAL(10,2),
  coefficient DECIMAL(3,2) DEFAULT 1.0
);
```

### suppliers
```sql
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  address TEXT,
  avg_lead_time_days INTEGER,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 9.3 Row Level Security (RLS) Policies

```sql
-- Users can only read their own data
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Customers can only see their orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers view own orders" ON orders
  FOR SELECT USING (
    auth.uid() = customer_id 
    OR auth.uid() = professional_id
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Products are public readable
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are viewable by everyone" ON products
  FOR SELECT USING (status = 'active' OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Admin full access policies
CREATE POLICY "Admin full access" ON users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
```

## 9.4 Database Functions

```sql
-- Calcolo disponibilità professionisti per zona e data
CREATE OR REPLACE FUNCTION get_available_professionals(
  p_postal_code TEXT,
  p_date DATE,
  p_time_slot TEXT DEFAULT NULL
)
RETURNS TABLE (
  professional_id UUID,
  name TEXT,
  rating DECIMAL,
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    u.first_name || ' ' || u.last_name,
    p.rating_avg,
    ST_Distance(p.home_location, a.location) / 1000
  FROM professionals p
  JOIN users u ON u.id = p.id
  JOIN professional_zones pz ON pz.professional_id = p.id
  JOIN addresses a ON a.postal_code = p_postal_code
  WHERE p.onboarding_status = 'active'
    AND u.status = 'active'
    AND p_postal_code = ANY(pz.postal_codes)
    AND NOT EXISTS (
      SELECT 1 FROM availability_slots s
      WHERE s.professional_id = p.id
        AND s.date = p_date
        AND (p_time_slot IS NULL OR s.time_slot = p_time_slot)
        AND s.status != 'available'
    );
END;
$$ LANGUAGE plpgsql;

-- Aggiornamento rating professionista
CREATE OR REPLACE FUNCTION update_professional_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE professionals SET
    rating_avg = (SELECT AVG(rating) FROM reviews WHERE professional_id = NEW.professional_id),
    rating_count = (SELECT COUNT(*) FROM reviews WHERE professional_id = NEW.professional_id)
  WHERE id = NEW.professional_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_review_created
AFTER INSERT ON reviews
FOR EACH ROW EXECUTE FUNCTION update_professional_rating();
```

---

# 10. AUTENTICAZIONE E SICUREZZA

## 10.1 Supabase Auth

### Metodi di Autenticazione
- **Email/Password:** Standard con verifica email
- **Magic Link:** Login senza password via email
- **Google OAuth:** One-click login
- **Phone OTP:** Verifica via SMS (opzionale)

### Configurazione
```javascript
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

### Hook Autenticazione
```javascript
// src/hooks/useAuth.js
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
```

## 10.2 Ruoli e Permessi

| Ruolo | Accessi |
|-------|---------|
| **admin** | Tutto: catalogo, ordini, professionisti, config |
| **professional** | Solo propri dati, lavori assegnati, calendario |
| **customer** | Solo propri dati, ordini, preventivi |
| **guest** | Catalogo pubblico, creazione preventivo |

## 10.3 Protezione Route (React Router)

```jsx
// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, role } = useAuth()

  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" />
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" />
  }

  return children
}
```

## 10.4 Sicurezza Dati

- **Crittografia:** TLS 1.3 in transito (gestito da Supabase/Vercel)
- **RLS:** Row Level Security su tutte le tabelle sensibili
- **Backup:** Automatici giornalieri (Supabase)
- **2FA:** Per account admin (Supabase Auth)
- **Rate Limiting:** Su API pubbliche
- **Input Validation:** Zod schema validation
- **CORS:** Configurato per dominio produzione

---

# 11. INTEGRAZIONI ESTERNE

## 11.1 Pagamenti - Stripe

### Setup
```javascript
// src/lib/stripe.js
import { loadStripe } from '@stripe/stripe-js'

export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
```

### Checkout Flow
1. Frontend crea ordine in Supabase (status: pending)
2. Chiama Edge Function per creare PaymentIntent
3. Stripe Elements raccoglie dati carta
4. Conferma pagamento
5. Webhook aggiorna status ordine

### Stripe Connect (Payout Professionisti)
- Ogni professionista ha Connected Account
- Payout automatici settimanali/mensili
- Dashboard earnings in tempo reale

## 11.2 Spedizioni

| Corriere | Uso | Integrazione |
|----------|-----|--------------|
| BRT | Spedizioni pesanti | API tracking |
| GLS | Alternativa | API tracking |

### Tracking
- Webhook corriere → Supabase → Notifica cliente
- Aggiornamento automatico stato ordine

## 11.3 Comunicazioni

| Servizio | Uso |
|----------|-----|
| **Resend** | Email transazionali (conferme, notifiche) |
| **Twilio** | SMS (OTP, promemoria urgenti) |
| **Firebase FCM** | Push notifications |

## 11.4 AI Services

| Servizio | Uso | Costo Stimato |
|----------|-----|---------------|
| **Replicate** | SAM, MiDaS per visualizzazione | ~$0.05/render |
| **OpenAI** | Chatbot assistenza | ~$0.01/conversazione |
| **Cloudinary** | Ottimizzazione immagini | Free tier + $89/mo |

## 11.5 Altri Servizi

| Servizio | Uso |
|----------|-----|
| **Google Maps** | Geocoding, autocomplete, mappe |
| **Google Calendar API** | Sync calendario professionisti |
| **Fatture in Cloud** | Fatturazione elettronica |
| **Google Analytics 4** | Analytics |
| **Hotjar** | Heatmaps, recordings |
| **Intercom** | Live chat, help desk |

---

# 12. ROADMAP DI SVILUPPO

## Fase 1 - MVP (Settimane 1-8)

### Obiettivo
Lancio versione base per validare il mercato

### Deliverables

**Settimana 1-2: Setup**
- [ ] Repo Git + struttura progetto Vite/React
- [ ] Supabase project + schema base
- [ ] Auth (email/password)
- [ ] Deploy Vercel (staging)

**Settimana 3-4: Catalogo**
- [ ] Pagine: Home, Catalogo, Prodotto
- [ ] Filtri e ricerca base
- [ ] Admin: CRUD prodotti

**Settimana 5-6: Preventivo e Checkout**
- [ ] Configuratore preventivo (tutti gli step)
- [ ] Integrazione Stripe
- [ ] Conferma ordine + email

**Settimana 7-8: Admin Base**
- [ ] Dashboard ordini
- [ ] Gestione stati ordine
- [ ] Lista professionisti (manuale)

## Fase 2 - Core Features (Settimane 9-16)

### Obiettivo
Completamento funzionalità principali

### Deliverables

**Settimana 9-10: Calendario**
- [ ] Sistema disponibilità professionisti
- [ ] Booking slot nel preventivo
- [ ] Sync Google Calendar

**Settimana 11-12: Professionisti**
- [ ] Dashboard professionista completa
- [ ] Workflow lavori (check-in/out)
- [ ] Upload foto

**Settimana 13-14: Comunicazioni**
- [ ] Chat interna
- [ ] Sistema notifiche
- [ ] Template email

**Settimana 15-16: Pagamenti**
- [ ] Stripe Connect setup
- [ ] Payout professionisti
- [ ] Dashboard earnings

## Fase 3 - AI & Polish (Settimane 17-24)

### Obiettivo
Differenziazione con AI + rifinitura UX

### Deliverables

**Settimana 17-19: Visualizzazione AI**
- [ ] Integrazione Replicate (SAM + MiDaS)
- [ ] UI visualizzatore
- [ ] Salvataggio progetti

**Settimana 20-21: Recensioni**
- [ ] Sistema recensioni
- [ ] Moderazione admin
- [ ] Display pubblico

**Settimana 22-24: Polish**
- [ ] Performance optimization
- [ ] SEO
- [ ] Bug fixing
- [ ] Test utenti

## Fase 4 - Scale (Mese 7-12)

- [ ] Espansione geografica
- [ ] App mobile (PWA o React Native)
- [ ] Programma referral
- [ ] B2B portal
- [ ] Chatbot AI

---

# 13. KPI E METRICHE

## 13.1 Business

| KPI | Target M6 | Target M12 |
|-----|-----------|------------|
| GMV | €200.000 | €500.000 |
| Ordini completati | 80 | 200 |
| Ordine medio | €2.500 | €2.500 |
| Margine lordo | 25% | 28% |
| Professionisti attivi | 10 | 20 |
| Province coperte | 3 | 5 |

## 13.2 Piattaforma

| Metrica | Target |
|---------|--------|
| Conversion visita → preventivo | > 5% |
| Conversion preventivo → ordine | > 25% |
| Tempo completamento preventivo | < 5 min |
| Rating medio clienti | > 4.5/5 |
| Tasso reclami | < 3% |
| Tempo risposta supporto | < 4 ore |
| Uptime | > 99.5% |
| Page load time | < 2 sec |
| Uso visualizzazione AI | > 40% preventivi |

## 13.3 Professionisti

| Metrica | Target |
|---------|--------|
| Tasso accettazione lavori | > 85% |
| Puntualità | > 95% |
| Rating medio | > 4.3/5 |
| Retention annua | > 80% |
| Lavori/professionista/mese | 3-5 |

---

# 14. ASPETTI LEGALI

## 14.1 GDPR e Privacy

- **Privacy Policy:** Documento completo conforme GDPR
- **Cookie Policy:** Banner con gestione consensi
- **Registro trattamenti:** Documentazione interna
- **DPA:** Con tutti i fornitori che trattano dati
- **Diritti interessati:** Procedure per accesso, rettifica, cancellazione
- **Data retention:** Policy per categoria dato

## 14.2 E-commerce

- **Diritto di recesso:** 14 giorni per prodotti (esclusi servizi)
- **Prezzi:** Sempre IVA inclusa, chiari
- **Garanzia legale:** 24 mesi sui prodotti
- **ODR:** Link piattaforma UE per controversie
- **PSD2:** Strong Customer Authentication (via Stripe)

## 14.3 Rapporto Professionisti

- **Inquadramento:** Collaboratori con P.IVA propria
- **Contratto:** Accordo di collaborazione (non dipendenza)
- **Requisiti:** 
  - P.IVA attiva
  - Assicurazione RC professionale
  - DURC regolare
  - Formazione sicurezza

## 14.4 Documenti da Preparare

1. Termini e Condizioni Clienti
2. Termini e Condizioni Professionisti
3. Privacy Policy
4. Cookie Policy
5. Contratto di Collaborazione Professionisti
6. SLA (Service Level Agreement)

---

# CONCLUSIONI

Questo documento fornisce una base completa per lo sviluppo di PosaFacile. 

## Priorità Immediate

1. **Setup progetto:** Vite + React + Supabase
2. **Schema database:** Implementare tabelle principali
3. **Auth:** Sistema autenticazione multi-ruolo
4. **Catalogo:** Frontend + Admin CRUD
5. **Checkout:** Integrazione Stripe

## Fattori Critici di Successo

- **Qualità rete professionisti:** Selezione rigorosa, formazione continua
- **User experience:** Processo preventivo intuitivo e veloce
- **Visualizzazione AI:** Elemento differenziante fondamentale
- **Servizio clienti:** Supporto eccellente pre e post vendita
- **Catalogo prodotti:** Ampia scelta con prezzi competitivi

---

**Fine Documento**

*PosaFacile - Versione 1.0 - Dicembre 2024*
