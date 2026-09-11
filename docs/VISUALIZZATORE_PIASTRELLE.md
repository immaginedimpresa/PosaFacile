# Visualizzatore: proiezione della texture (v2)

## Requisito

Applicare **la foto della piastrella selezionata** al pavimento o alla parete della foto caricata, con le proporzioni del formato e lo schema di posa scelto. Titolo, descrizione, nome del materiale, colore testuale e tipo di stanza non devono determinarne l'aspetto.

## Analisi del percorso precedente

Il backend escludeva già titolo e descrizione dalla query prodotto. La discrepanza non era quindi causata da quei campi nel codice attuale, ma poteva essere prodotta da questi passaggi:

- Ricerca euristica delle fughe nel campione, ritagli e deformazioni per costruire uno swatch. Le venature potevano essere scambiate per fughe.
- `gemini-2.5-flash-image` rigenerava il fotogramma: il materiale veniva interpretato, non semplicemente proiettato.
- La segmentazione `image-segmentation-001` risultava indisponibile secondo le annotazioni presenti nel codice.
- Il ripiego cercava la superficie nelle differenze fra originale e generato: anche gli errori su arredi potevano diventare superficie da sostituire.
- Quando la maschera mancava o era implausibile, il risultato generativo completo veniva comunque restituito.
- La sfumatura espandeva la maschera sugli oggetti; la codifica JPEG finale modificava anche i pixel esterni.
- In assenza di formato veniva inventato un 60×60 cm; i millimetri venivano arrotondati dopo la conversione.

I moduli di generazione, riallineamento, swatch euristico e maschera da differenze sono stati rimossi dal percorso e dal repository.

## Alternative esaminate

| Soluzione | Vantaggi | Limiti rispetto al requisito |
| --- | --- | --- |
| Editing con Gemini 3.1 Flash Image / 3 Pro Image | Modelli più recenti, integrazione nella luce della scena | Possono reinterpretare materiale e geometria; non garantiscono l'applicazione dei pixel del prodotto |
| Segmentazione + omografia + texture | Il campione determina il materiale; posa e proporzioni sono calcoli verificabili | La geometria automatica resta una stima; richiede una maschera corretta |
| Proiezione con calibrazione manuale/3D | Scala misurabile e controllo della geometria | Richiede punti di riferimento o misure aggiuntive dell'utente |

È stata implementata la seconda soluzione, coerente con la precisazione dell'utente. Non viene usato un modello generativo per produrre l'immagine finale e non è stato addestrato un nuovo modello.

Fonti primarie consultate l'11 settembre 2026:

- [Google: segmentazione conversazionale con Gemini 2.5](https://developers.googleblog.com/conversational-image-segmentation-gemini-2-5/), mappe PNG entro bounding box e configurazione senza thinking.
- [Google: image understanding e contorni](https://ai.google.dev/gemini-api/docs/image-understanding), coordinate normalizzate e segmentazione.
- [OpenCV: omografie e correzione prospettica](https://docs.opencv.org/4.12.0/d9/dab/tutorial_homography.html), trasformazione proiettiva di superfici piane.
- [Google Cloud: Gemini 3.1 Flash Image](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-1-flash-image), alternativa generativa esaminata e non adottata nel risultato finale.

## Percorso implementato

1. Foto normalizzata nel browser a massimo 1280 px, orientamento applicato dal decoder del browser; formati caricabili JPG, PNG e WebP.
2. Campione caricato separatamente. La query al catalogo seleziona **solo** `format_width, format_height`. Il formato è obbligatorio, in millimetri; la conversione in cm conserva i decimali.
3. Gemini vision riceve **solo la stanza**. Produce maschere della superficie, escludendo mobili, tappeti e aperture. I PNG locali alle bounding box sono posizionati nella foto, non dilatati su tutto il fotogramma. Se la risposta non contiene PNG decodificabili, si richiedono contorni vettoriali con regioni disgiunte e buchi; se anche questi falliscono, si restituisce un errore.
4. Una seconda richiesta riceve stanza e maschere e stima una regione rettangolare di riferimento per ogni piano, con dimensioni approssimative. Le quattro corrispondenze definiscono l'omografia. Pareti con orientamento diverso hanno piani separati.
5. `render.ts` proietta la foto del campione, senza ritagli euristici, selezione semantica del materiale, specchiature casuali o ridisegno delle venature. `texture.ts` determina le coordinate delle pose dritta, diagonale, correre, spina e mosaico. Il mosaico ripete il foglio completo.
6. Una mappa di luminanza a bassa frequenza, calcolata sul pavimento originale e normalizzata entro la maschera, modula il campione per riprendere parte dell'illuminazione. Non viene miscelato il colore originale della superficie. Interpolazione, mipmap e copertura subpixel delle fughe limitano scalettature e aliasing.
7. Sfumatura **verso l'interno** e PNG finale: i pixel a maschera zero rimangono identici all'immagine normalizzata, inclusi i buchi degli oggetti.
8. Cache in memoria per worker: massimo tre analisi, cinque minuti, senza persistenza delle foto. Cambiare prodotto o scala può riutilizzare maschere e prospettiva; il riuso non è garantito fra worker diversi o dopo scadenza.

## Campione e misure

Il campione dovrebbe essere una foto frontale di **una piastrella**, ritagliata sul materiale, senza bordi commerciali, testo o arredi. Per il mosaico deve rappresentare un foglio completo. Si preferisce `tileable_image_url`; per compatibilità resta il ripiego sulla prima immagine della gallery. Una gallery d'ambiente non diventa automaticamente un campione valido: il motore ripeterebbe anche gli elementi presenti nella foto. Nessun dato di catalogo è stato modificato automaticamente.

Il renderer conserva le proporzioni numeriche della piastrella. La scala metrica della stanza non può essere ricavata con certezza da una sola fotografia non calibrata: le dimensioni del piano sono stimate. Il controllo “Dimensione apparente” corregge questa stima fra 50% e 200%; non modifica il formato in catalogo. La UI dichiara questa limitazione.

L'illuminazione è un'approssimazione diffusa: riflessi speculari, riflessioni di specchi/vetri, spessore e materiali PBR non sono simulati. Le maschere AI possono ancora sbagliare contorni o oggetti sottili. Superfici curve o scale richiedono una geometria diversa. Non viene restituita una stanza interamente rigenerata in caso di errore.

## Configurazione server e rilascio

Richiede il secret Supabase già previsto `GOOGLE_SERVICE_ACCOUNT` (JSON del service account). Opzioni **solo server**, senza prefisso `VITE_`:

```text
GOOGLE_CLOUD_PROJECT=<facoltativo; altrimenti project_id del service account>
VISUALIZER_VERTEX_REGION=global
VISUALIZER_VISION_MODEL=gemini-2.5-flash
```

La regione `global` usa `aiplatform.googleapis.com`, non `global-aiplatform.googleapis.com`. Il modello configurato deve supportare immagini in ingresso e `thinkingBudget: 0`. Un override verso una famiglia incompatibile richiede l'adattamento della configurazione. Non viene effettuato alcun downgrade automatico a un generatore di immagini.

Il frontend locale invoca ancora la funzione **remota** Supabase: aggiornare solo Vite non attiva il nuovo algoritmo sul server. Dopo revisione occorre distribuire `visualize-tile` e verificare l'accesso al modello con il service account reale:

```sh
supabase functions deploy visualize-tile --project-ref <project-ref>
```

Questa modifica non esegue il deploy. Le credenziali Google del server non erano disponibili all'esecuzione locale: le risposte vision sono state simulate nei test, quindi la qualità della segmentazione e della prospettiva automatiche va ancora verificata su foto reali tramite il servizio configurato. Non è documentato alcun miglioramento percettivo misurato su un benchmark live.

## Verifiche riproducibili

```sh
npm run build
deno check supabase/functions/visualize-tile/index.ts
deno test --allow-net=deno.land supabase/functions/visualize-tile/visualizer_test.ts
```

I test non fanno chiamate AI a pagamento. `deno.land` serve ai decoder WASM di ImageScript. Sono verificate conversione delle unità, esclusione del testo prodotto, omografie, pose rettangolari e spina, bordi e buchi, invarianza fuori maschera anche dopo codifica PNG, determinismo, box delle maschere, contorni vettoriali, cache e pipeline con risposte vision simulate.

Per una verifica live usare almeno: stanza con tappeto e gambe sottili; stanza in verticale; pavimento chiaro e scuro; formato 20×120; pareti su due piani. Richiedere `debug: true` per maschere, copertura e geometrie. Confrontare originale, contorni e posa, non soltanto l'impressione generale dell'immagine finale.
