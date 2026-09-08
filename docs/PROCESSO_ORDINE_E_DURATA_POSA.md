# Processo ordine e regola di calcolo dei giorni di posa

Documento di riferimento per la barra di stato dell'ordine e per la stima della
durata dei lavori. Descrive il processo reale, i punti in cui si blocca, e la
regola con cui si calcolano i giorni — quella che compare in preventivo e che il
professionista conferma.

---

## 1. Analisi del processo

### 1.1 Perché `order_status` non basta

L'enum `order_status` (`new → confirmed → assigned → material_shipped →
material_delivered → in_progress → completed`) è una sequenza lineare. Il
processo reale non lo è:

- **Le verifiche corrono in parallelo.** Mentre il magazzino controlla la
  disponibilità del materiale, il posatore sta ancora decidendo se accettare
  l'incarico. Con un solo campo di stato una delle due informazioni si perde.
- **Ci sono attese che non sono ritardi.** Se manca la misura di un vano o
  l'accesso al cantiere, l'ordine è fermo *in attesa del cliente*: non è
  "indietro di stato", è bloccato su una persona diversa.
- **Alcuni passaggi sono avvisi, non stati.** "Prepara la stanza" è una
  comunicazione con una scadenza (X giorni prima dell'inizio), non una fase di
  lavorazione.
- **Il cliente vuole sapere di chi è la palla.** Un unico badge "Confermato" non
  risponde alla domanda "cosa state aspettando?".

Da qui la scelta: `orders.status` resta il riassunto per elenchi e filtri;
il dettaglio vive in `order_milestones`, una riga per tappa con stato proprio,
timestamp, responsabile e nota visibile al cliente.

### 1.2 Le tappe

| # | Tappa | Chiave | Responsabile | Chiude quando |
|---|-------|--------|--------------|----------------|
| 1 | Ordine ricevuto | `order_placed` | Sistema | L'ordine è creato (automatico) |
| 2 | Pagamento confermato | `payment_confirmed` | Cliente | Il pagamento è incassato |
| 3 | Materiale confermato in magazzino | `material_check` | Admin | Disponibilità verificata e merce riservata |
| 4 | Professionista confermato | `professional_confirmed` | Posatore | Il posatore accetta l'incarico |
| 5 | Informazioni aggiuntive | `info_pending` | Cliente | Il cliente invia quanto richiesto *(opzionale, bloccante)* |
| 6 | OK, si parte | `green_light` | Admin | Tutte le verifiche sono chiuse |
| 7 | Data confermata | `date_confirmed` | Admin | Data di inizio concordata con il posatore |
| 8 | Materiale spedito | `material_shipped` | Admin | La merce parte dal magazzino |
| 9 | Materiale ricevuto in cantiere | `material_delivered` | Cliente | Consegna verificata all'indirizzo di posa |
| 10 | Prepara la stanza | `room_prep_notice` | Cliente | Avviso inviato, 3 giorni prima dell'inizio |
| 11 | Attività iniziata | `work_started` | Posatore | Il posatore apre il cantiere |
| 12 | Lavori completati | `work_completed` | Posatore | Il posatore chiude il cantiere |
| 13 | Ordine chiuso | `closed` | Admin | Chiusura amministrativa *(opzionale)* |

**Stati di una tappa:** `pending` (da fare) · `active` (in corso, calcolato
automaticamente sulla prima tappa aperta) · `blocked` (in attesa di qualcuno) ·
`done` (chiusa) · `skipped` (non prevista per questo ordine).

### 1.3 Punti di blocco e chi li sblocca

| Blocco | Chi lo apre | Chi lo chiude | Effetto |
|--------|-------------|---------------|---------|
| Materiale non disponibile | Admin (`material_check` → `blocked`) | Admin, quando la merce rientra | Il cliente vede il motivo e la nuova previsione |
| Posatore non conferma | Sistema (tappa 4 aperta) | Posatore, o admin riassegnando | Blocca la conferma della data |
| Informazioni mancanti | Admin (`info_pending` → `blocked`, con nota) | Admin, a informazioni ricevute | La palla passa esplicitamente al cliente |
| Durata non confermata | Il posatore non ha confermato le giornate | Posatore | Si può fissare la data ma su una stima non validata |

### 1.4 Regole di coerenza

1. **La milestone esplicita vince sullo stato.** Una tappa messa a mano non viene
   sovrascritta da un cambio di `order_status`.
2. **Una tappa `pending` mai toccata non porta informazione.** Se lo stato
   dell'ordine dice che è già stata superata, vale lo stato — così gli ordini
   creati prima della timeline mostrano comunque un avanzamento sensato.
3. **Chiudere una tappa scrive sempre un timestamp**, anche se chi la chiude non
   lo indica: una timeline senza date non serve a nessuno.
4. **Riaprire una tappa cancella il timestamp.** Non si mostra una data di
   completamento per qualcosa che è tornato aperto.

---

## 2. La regola per il calcolo dei giorni

### 2.1 Le tre grandezze da non confondere

| Grandezza | Cos'è | A chi serve |
|-----------|-------|-------------|
| **Giornate-uomo** (`laborDays`) | Il lavoro complessivo da fare, indipendente da quante persone lo eseguono | Compenso del posatore |
| **Giorni di cantiere** (`workDays`) | Quanti giorni la squadra sta in cantiere | Agenda, pianificazione |
| **Durata totale** (`calendarDays`) | Giorni di cantiere più le attese tecniche | Cliente: "quanti giorni ho casa occupata" |

Confondere le prime due è ciò che produce stime assurde. Sommare tutte le
lavorazioni in fila, con un solo operatore, trasforma 260 mq in quasi tre mesi.
In cantiere si va in squadra, si carica mentre si demolisce, si stucca mentre si
posa.

### 2.2 Formula della posa

```
resa_pavimento  = resa_base(classe_formato)
resa_parete     = resa_pavimento × 0,62

giornate_uomo_posa = (mq_pav / resa_pav + mq_par / resa_par) × K
K = k_schema × k_ambiente × k_intervento × k_formato_allungato × k_scala
```

**Rese base** (mq/giorno, un posatore, posa dritta a pavimento):

| Classe di formato | Area del pezzo | Resa | Esempi |
|---|---|---|---|
| Mosaico | ≤ 0,01 m² | 5 | fino a 10×10 |
| Piccolo | ≤ 0,09 m² | 14 | 20×20, 30×30 |
| Medio | ≤ 0,40 m² | **22** | 45×45, 60×60 |
| Grande | < 1,00 m² | 17 | 60×120, 80×80 |
| Lastra | ≥ 1,00 m² | 11 | 120×120 e oltre |

**Coefficienti:**

| Fattore | Valori |
|---|---|
| `k_schema` | dritta 1,00 · a correre 1,08 · diagonale 1,22 · **spina 1,50** · mosaico 1,35 |
| `k_ambiente` | bagno 1,35 · cucina 1,20 · esterno 1,10 · soggiorno/camera 1,00 · altro 1,05 |
| `k_intervento` | nuova costruzione 0,95 · ristrutturazione 1,10 · sostituzione 1,05 |
| `k_formato_allungato` | rapporto lati < 1,5 → 1,00 · < 2,5 → 1,05 · < 4 → 1,12 · ≥ 4 → 1,20 |
| `k_scala` | `(40 / mq_totali) ^ 0,12`, limitato fra 0,85 e 1,20 |

**L'economia di scala** è la correzione più importante. Il lavoro difficile sta
sul perimetro — tagli, raccordi, battute contro i muri — e il perimetro cresce
con la radice dell'area: la sua incidenza per metro quadro cala man mano che la
superficie aumenta. Un bagno da 8 mq è quasi tutto perimetro (+20%); un open
space da 260 mq è quasi tutto campo aperto (−15%).

### 2.3 Squadra e sovrapposizioni

**Dimensione della squadra**, proposta in base alla superficie e modificabile
dal professionista:

| Superficie totale | Operatori |
|---|---|
| fino a 20 mq | 1 |
| 21 – 120 mq | 2 |
| oltre 120 mq | 3 |

La squadra non scala in modo lineare: il secondo e il terzo operatore rendono
il 75% del primo. Resa = `1 + (n − 1) × 0,75` → 1,75× in due, 2,50× in tre.

**Quota sul percorso critico.** Non tutte le lavorazioni allungano il cantiere:
alcune si svolgono mentre se ne fa un'altra. Le giornate-uomo restano intere —
vanno pagate — ma sul calendario pesano meno.

| Lavorazione | Quota critica | Perché |
|---|---|---|
| Smaltimento macerie | 20% | Si carica in discarica mentre la demolizione prosegue |
| Stuccatura | 35% | Insegue la posa a un giorno di distanza: resta solo la coda |
| Battiscopa | 50% | Si sovrappone alla stuccatura |
| Soglie | 50% | Idem |
| Tutte le altre | 100% | Stanno sul percorso critico |

La stuccatura fa eccezione sui cantieri brevi (posa ≤ 1,5 giorni): lì non c'è
niente da sovrapporre e si aspetta la presa della colla, quindi conta 100% più
un giorno di attesa.

```
giorni_di_cantiere = Σ (giornate_uomo_fase × quota_critica) / resa_squadra
durata_totale      = ceil(giorni_di_cantiere) + attese_tecniche
```

### 2.3-bis Lavorazioni accessorie

| Fase | Resa | Attesa tecnica |
|---|---|---|
| Allestimento cantiere | 0,15 g + 1 g ogni 400 mq | — |
| Demolizione pavimento | 26 mq/g | — |
| Smaltimento macerie | 0,2 g + 1 g ogni 120 mq | — |
| Massetto | 35 mq/g | **3 g** (presa rapida) · **7 g/cm** (tradizionale) |
| Impermeabilizzazione | 32 mq/g | **1 g** |
| Stuccatura e siliconature | 45 mq/g | 1 g solo sui cantieri brevi |
| Battiscopa | 28 ml/g | — |
| Soglie | 6 pz/g | — |
| Pulizia e consegna | 0,15 g + 1 g ogni 400 mq | — |

### 2.3-ter Controlli di sanità

La stima si autodenuncia quando esce dal seminato, invece di produrre un numero
e basta:

- **oltre 22 giorni di cantiere** → affidabilità forzata a "bassa" e avviso che
  serve un sopralluogo prima di confermare la data;
- **oltre 40 mq con resa complessiva sotto 8 mq/giorno** → probabile errore
  nelle lavorazioni selezionate;
- **impermeabilizzazione su più di 40 mq in un ambiente che non è bagno o
  esterno** → quasi sempre una spunta lasciata per errore, e costa parecchio.

### 2.4 Arrotondamento e forchetta

- Le giornate si arrotondano **per eccesso alla mezza giornata**: non si manda
  una squadra in cantiere per due ore.
- **Minimo 1 giornata** per qualunque intervento.
- Al cliente si comunica una **forchetta −15% / +25%**: l'errore di stima è
  asimmetrico, i cantieri si allungano molto più spesso di quanto si accorcino.

### 2.5 Affidabilità dichiarata

| Livello | Quando |
|---|---|
| **Alta** | Formato noto, ambiente noto, nessuna lavorazione strutturale |
| **Media** | Formato o ambiente mancante, oppure demolizione/massetto in gioco, oppure oltre 120 mq |
| **Bassa** | Formato ignoto **e** lavorazioni strutturali: serve un sopralluogo |

La stima dichiara sempre le proprie assunzioni (`assumptions`): resa usata,
maggiorazioni applicate, ipotesi sul massetto. Un numero senza spiegazione non è
discutibile con il posatore.

### 2.6 Dal preventivo al calendario

1. **Preventivo** — il configuratore calcola la stima e la *congela* su
   `orders.duration_breakdown`. Una futura taratura delle rese non deve cambiare
   la durata già promessa a un cliente.
2. **Conferma del posatore** — le giornate le calcola PosaFacile, il
   professionista le corregge se il preventivo è sbagliato. Vede la stima, la
   modifica a mezze giornate e scrive il motivo dello scostamento.
   `confirmed_work_days` diventa **il numero valido per tutto ciò che sta a
   valle**: data di fine, agenda, compenso. Da lì in poi la stima originale
   resta solo come storico.

   Il codice deve passare da `effectiveDuration(order)`, mai da
   `durationForOrder(order)`, ogni volta che calcola una data: usare la stima
   dopo una conferma significa pianificare su un numero che il posatore ha già
   smentito. Se la data di inizio è già fissata quando arriva la correzione, è
   la funzione `confirm_order_duration` a ricalcolare `work_end_date` lato
   database — il posatore non ha il permesso di scrivere sulla riga ordine.
3. **Programmazione** — l'admin fissa l'inizio: la fine si calcola scorrendo il
   calendario **saltando sabato e domenica** e includendo le attese tecniche.
   Da qui parte l'avviso "prepara la stanza", 3 giorni prima.
4. **Prima data utile** — nel calendario le giornate in cui il materiale non può
   ancora essere in cantiere non sono selezionabili:

   ```
   attesa = max(materialLeadDays, lead_time_days del prodotto) + shippingTransitDays
   prima_data = primo giorno lavorativo dopo (oggi + attesa)
   ```

   `materialLeadDays` (giorni dall'ordine alla spedizione) e
   `shippingTransitDays` (trasporto fino al cantiere) sono impostazioni di
   piattaforma modificabili da **Admin → Impostazioni → Logistica &
   Disponibilità**, salvate su `platform_settings`. Se il prodotto scelto ha un
   approvvigionamento più lungo del valore di piattaforma, vince il prodotto.

---

## 3. Taratura sui dati reali

Le costanti sono tutte in `src/lib/layingDuration.ts`, dichiarate ed esportate
una per una. Il metodo di taratura, da ripetere ogni trimestre:

1. Sui cantieri chiusi, confrontare `estimated_work_days`,
   `confirmed_work_days` e le giornate effettive (`work_start_date` →
   `work_end_date` al netto delle attese).
2. Segmentare per classe di formato e per ambiente: sono le due variabili con
   più peso nella formula.
3. Correggere **una costante alla volta**, partendo dalle rese base. I
   coefficienti moltiplicativi si toccano solo se lo scostamento persiste dentro
   un singolo segmento.
4. Lo scostamento sistematico fra stima e conferma del posatore è il segnale più
   utile: se i posatori aggiungono sempre mezza giornata sui bagni, il
   `k_ambiente` del bagno è basso.

---

## 4. Mappa del codice

| File | Ruolo |
|---|---|
| `src/lib/layingDuration.ts` | Motore di stima: costanti, formula, calendario |
| `src/lib/orderTimeline.ts` | Definizione delle tappe, stati, derivazione, stili |
| `src/lib/orderDuration.ts` | Ponte fra la riga `orders` e il motore di stima |
| `src/services/orderTimelineService.ts` | Lettura/scrittura milestone, conferma durata, programmazione |
| `src/components/orders/OrderTimeline.tsx` | Barra di stato (cliente) |
| `src/components/orders/DurationCard.tsx` | Scheda durata con dettaglio fasi |
| `src/components/admin/OrderTimelineManager.tsx` | Checklist operativa admin |
| `src/components/pro/jobs/DurationConfirm.tsx` | Conferma giornate lato posatore |
| `supabase/migrations/20260908161250_order_timeline_and_duration.sql` | Tabella, colonne, RLS, trigger, backfill |
