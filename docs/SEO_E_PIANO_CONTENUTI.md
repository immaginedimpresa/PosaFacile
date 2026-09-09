# SEO, motori generativi e piano di espansione delle pagine

Stato del lavoro fatto e piano per le pagine da aggiungere. Il criterio non è
"più pagine", ma: **ogni pagina deve rispondere a una domanda che qualcuno fa
davvero, e portare al preventivo**.

---

## 1. Da dove si partiva

Un'applicazione a pagina singola serviva lo stesso HTML per ogni indirizzo:
un titolo unico, una descrizione unica, nessun contenuto. Verificato con una
richiesta senza JavaScript su una scheda prodotto: **zero occorrenze** del nome
del prodotto, del prezzo o di qualunque testo.

Perché conta più del solito:

- **Ricerca classica.** Google esegue JavaScript, ma in una seconda passata,
  con ritardo e senza garanzie. Titoli e descrizioni identici su tutte le
  pagine impediscono comunque di posizionarsi su query diverse.
- **Motori generativi.** I crawler di ChatGPT, Perplexity e simili in genere
  **non eseguono JavaScript**: leggono l'HTML grezzo. Per loro il sito era una
  pagina vuota. È il canale che cresce più in fretta per le ricerche di tipo
  "quanto costa posare 40 mq di gres", ed era completamente precluso.

---

## 2. Cosa è stato fatto

### 2.1 Sorgente unica dei metadati

`src/lib/seo.ts` contiene titoli, descrizioni e costruttori di dati
strutturati. Da lì attingono sia l'applicazione sia lo script di build: il
testo che legge un crawler e quello che vede un utente non possono divergere.

I titoli dichiarano il beneficio e una parola chiave reale, non il nome della
sezione: *"Catalogo"* non è una ricerca che qualcuno fa, *"catalogo piastrelle
gres porcellanato prezzi al mq"* sì.

### 2.2 Metadati per pagina

`useSeo()` applica titolo, descrizione, canonical, Open Graph, Twitter Card e
dati strutturati a ogni cambio di rotta. Le aree private (`/dashboard`,
`/admin`, `/pro`, `/booking`, `/checkout`, autenticazione) sono marcate
`noindex, nofollow`: non devono comparire nei risultati e non devono disperdere
autorità.

### 2.3 Dati strutturati

| Schema | Dove | A cosa serve |
|---|---|---|
| `Organization` | ovunque | Il nodo a cui tutto si riferisce; è ciò che un motore generativo cita come fonte |
| `WebSite` + `SearchAction` | home | Abilita la ricerca diretta nei risultati |
| `Service` | home | Dichiara cosa si vende: fornitura **e** posa, con area servita |
| `Product` + `Offer` | ogni scheda | Prezzo, disponibilità, formato, materiale, finitura, colore |
| `BreadcrumbList` | catalogo, schede, pagine | Percorso di navigazione nei risultati |
| `FAQPage` | home, professionisti | Risposte diritte, il formato che i motori generativi riusano |

Sul prodotto il prezzo è dichiarato come `UnitPriceSpecification` con unità
`MTK` (metro quadro): senza questa precisazione 65,00 € verrebbe letto come
prezzo a pezzo, e il risultato arricchito direbbe una cosa falsa.

Quando un prodotto non ha descrizione, ne viene composta una dagli attributi
reali a catalogo — materiale, formato, colore, finitura, prezzo. Non inventa
nulla che non sia nel database, ed è meglio di un campo vuoto.

### 2.4 HTML statico per ogni pagina

`scripts/generate-seo.mjs` gira dopo la build di Vite (agganciato a
`npm run build`) e scrive un file HTML per ogni rotta pubblica, con metadati,
dati strutturati e una versione testuale del contenuto in `<noscript>`.

Il contenuto testuale **coincide** con quello che la pagina mostra: non è testo
nascosto per i motori, è ciò che vede chi non esegue JavaScript.

Genera anche:

- **`sitemap.xml`** con tutte le pagine pubbliche e le schede prodotto lette
  dal database, con `lastmod` preso da `updated_at`;
- **`robots.txt`** che esclude le aree riservate e **ammette esplicitamente**
  GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot e
  Google-Extended.

Lo script è idempotente e non blocca il deploy: se il database non risponde,
le pagine statiche vengono generate comunque, senza le schede prodotto.

### 2.5 Verifica

Su `/products/marmo-statuario-bianco`, senza eseguire JavaScript:

```
<title>Marmo Statuario Bianco 80×80 cm — € 65.00/mq | PosaFacile</title>
"price":"65.00"  "unitText":"metro quadro"  "availability":"InStock"
<h1>Marmo Statuario Bianco</h1> + descrizione + specifiche complete
```

---

## 3. Cosa manca ancora

Da fare prima di considerare chiuso il capitolo tecnico:

1. **Dominio definitivo.** Tutto usa `https://posafacile.it`, sovrascrivibile
   con `VITE_SITE_URL`. Va impostato quello vero prima di inviare la sitemap.
2. **Search Console e Bing Webmaster.** Verifica proprietà e invio sitemap.
3. **Immagini.** Oggi si caricano a dimensione piena; servono `width`/`height`
   e formati moderni. Pesa sui Core Web Vitals, che sono un fattore di
   posizionamento.
4. **Il bundle è di 1,3 MB.** Va spezzato per rotta: incide sul primo
   caricamento, quindi sul posizionamento e sulla conversione.
5. **`AggregateRating` sulle schede** quando ci saranno recensioni reali.
   Dichiararlo senza recensioni è una violazione delle linee guida.

---

## 4. Piano delle pagine da aggiungere

Ordinato per rapporto fra ritorno e sforzo. Ogni gruppo indica la domanda a cui
risponde, perché è quella la chiave sia per la ricerca classica sia per i
motori generativi.

### Priorità alta — si costruiscono sui dati già in casa

**4.1 Pagine per città e provincia** — *"posatore piastrelle Milano"*
La copertura territoriale dei posatori è già nel database
(`professional_zones`, raggio o provincia). Da lì si generano pagine come
`/posa-piastrelle/milano`: quanti posatori coprono la zona, tempi medi,
prezzi indicativi, recensioni locali. È la ricerca commerciale con l'intento
più caldo che esista in questo settore.
**Attenzione:** vanno generate solo per le zone realmente coperte. Centinaia di
pagine identiche con il nome del comune cambiato sono contenuto scadente e
vengono declassate.

**4.2 Pagine per materiale e formato** — *"gres effetto legno prezzi"*
`/piastrelle/gres-porcellanato`, `/piastrelle/effetto-legno`,
`/piastrelle/grandi-formati`. Filtrano il catalogo esistente e aggiungono un
testo che spiega quando quel materiale conviene, come si posa e quanto costa
posarlo. Collegano alle schede: distribuiscono autorità dove serve.

**4.3 Pagine per ambiente** — *"ristrutturare bagno quanto costa"*
`/pavimenti/bagno`, `/pavimenti/cucina`, `/pavimenti/esterno`. Qui il
contenuto ce l'abbiamo già ed è nostro: il motore di stima della durata
conosce le rese per ambiente. Una pagina che dice *"un bagno da 8 mq con
demolizione e impermeabilizzazione richiede circa 6 giornate-uomo, 4 giorni di
cantiere"* risponde a una domanda precisa con un dato che nessun concorrente
ha. È esattamente il tipo di risposta che un motore generativo cita.

### Priorità media — richiedono redazione

**4.4 Calcolatori pubblici** — *"quanti mq di piastrelle servono"*
Pagine autonome che espongono pezzi del configuratore: calcolo dello sfrido,
stima dei giorni di posa, costo al mq per tipo di posa. Attraggono ricerche
informative e portano dentro al preventivo con un passaggio solo. Il codice
esiste già (`layingDuration.ts`), va solo esposto.

**4.5 Guide operative** — *"differenza gres e ceramica"*, *"posa a spina di
pesce costo"*, *"quanto dura il massetto prima di piastrellare"*
Sono le domande che i clienti fanno prima di decidere. Le risposte le abbiamo
scritte nell'analisi dei processi: vanno riscritte per il pubblico.

**4.6 Pagine di confronto** — *"gres o parquet"*, *"posa dritta o diagonale"*
Intento comparativo, alta propensione all'acquisto, poca concorrenza di
qualità in italiano.

### Priorità bassa — necessarie ma non urgenti

**4.7 Fiducia e conformità:** chi siamo, come lavoriamo, garanzie, condizioni
di servizio, privacy, cookie. Servono anche per l'`Organization` schema e per
la fiducia dei motori generativi, che privilegiano fonti identificabili.

**4.8 Casi reali:** cantieri conclusi con foto prima/dopo, superficie, durata
effettiva, materiale usato. Alimentano `ImageObject` e sono l'unico contenuto
che i concorrenti non possono copiare.

---

## 5. Nota sui motori generativi

Ottimizzare per un modello linguistico non è ottimizzare per un motore di
ricerca con altre parole. Tre differenze pratiche:

1. **Contano i dati verificabili, non le parole chiave.** "Il miglior servizio
   di posa" non viene citato da nessuno. "Un bagno da 8 mq richiede circa 6
   giornate-uomo" sì, perché è una risposta.
2. **La struttura conta più della prosa.** Tabelle, elenchi numerati, domande
   con risposta diretta sotto. I dati strutturati sono leggibili senza
   interpretazione.
3. **L'attribuzione richiede un'entità riconoscibile.** `Organization` coerente
   ovunque, sempre lo stesso `@id`, pagine istituzionali reali.

Il patrimonio più difendibile che questo progetto ha sono **i dati di
cantiere**: rese reali, durate confermate dai posatori, prezzi per lavorazione.
Nessun concorrente li ha. Pubblicarli in forma aggregata — "in media un
soggiorno da 45 mq si posa in 2,5 giorni con una squadra di due" — è la
strategia con il ritorno più alto, ed è anche quella che si costruisce da sola
man mano che i cantieri si chiudono.
