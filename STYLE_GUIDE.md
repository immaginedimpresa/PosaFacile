# PosaFacile Design System & Style Guide

Questa guida stabilisce lo standard visivo, architetturale e di interazione per l'intera suite PosaFacile (Portale Amministrazione, Portale Professionisti, Configuratore e Store Pubblico).

Tutti i nuovi componenti, pagine e refactoring devono aderire scrupolosamente a queste linee guida per garantire un'esperienza utente omogenea, moderna e premium.

---

## 1. Filosofia Visiva & Identità

- **Estetica**: Artigianale, affidabile, rigorosa ma calda ("Warm Modernist").
- **Tonalità di base**: Neutri caldi della pietra (`stone`), nero solido per le sidebar e per elementi di ancoraggio (`stone-900`), e accenti arancione brillante (`orange-500`) come marchio identificativo della posa e del cantiere.
- **Micro-interazioni**: Feedback tattile con transizioni fluide (`transition-all`, pulsanti con effetto press `active:scale-95`).
- **Niente UI improvvisate**: Nessun popup `alert()` o `confirm()` nativo del browser; utilizzare unicamente `toast` tramite Sonner.

---

## 2. Tavolozza Colori (Color Palette)

### 2.1 Neutri Primari (Warm Stone)
| Token Tailwind | Utilizzo |
| :--- | :--- |
| `bg-stone-50/70` | Sfondo generale della piattaforma (`body`, `main`) |
| `bg-white` | Sfondo di schede (cards), tabelle, modali e container |
| `bg-stone-100/70` | Controlli segmentati, badge disabilitati, hover secondari |
| `border-stone-200/90` | Bordature standard di card, separatori e campi input |
| `text-stone-900` | Titoli principali, importi KPI e testi ad alto contrasto |
| `text-stone-600` / `text-stone-700` | Testo del corpo, etichette attive, valori tabelle |
| `text-stone-400` / `text-stone-500` | Sottotitoli, etichette uppercase e placeholder |
| `bg-stone-900` | Barra laterale (Sidebar desktop/mobile), pulsanti scuri di conferma |

### 2.2 Colore Brand (Orange PosaFacile)
| Token Tailwind | Utilizzo |
| :--- | :--- |
| `bg-orange-500` | Pulsanti primari (Call to Action), voci di navigazione attive |
| `hover:bg-orange-600` | Stato hover dei bottoni primari |
| `bg-orange-50` / `bg-orange-50/50` | Sfondo dei badge attivi, card informative del brand |
| `text-orange-600` | Testo in risalto, icone brand, link attivi |
| `border-orange-200/80` | Bordi di risalto per elementi selezionati |
| `shadow-orange-500/20` | Ombra morbida per CTA e badge con effetto "elevation" |

### 2.3 Colori Semantici (Feedback & Stati)
- **Verde / Smeraldo (Completato, Confermato, Disponibile, Online)**:
  - Badge: `bg-emerald-50 text-emerald-700 border-emerald-200/80`
  - Icon Badge: `bg-emerald-50 text-emerald-600`
  - Azione: `bg-emerald-600 hover:bg-emerald-700 text-white`
- **Ambra / Giallo (In Attesa, Bozze, Attenzione, Note)**:
  - Badge: `bg-amber-50 text-amber-700 border-amber-200/80`
  - Alert Box: `bg-amber-50/70 text-amber-900 border-amber-200/70`
- **Blu / Indaco (Accettato, Luoghi, Chat, Documentazione)**:
  - Badge: `bg-blue-50 text-blue-700 border-blue-200/80`
  - Icon Badge: `bg-blue-50 text-blue-600`
- **Rosso / Rosa (Non Disponibile, Annullato, Destruttivo, Blocco)**:
  - Badge: `bg-rose-50 text-rose-700 border-rose-200/80`
  - Bottone Blocco/Elimina: `bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/15`

---

## 3. Tipografia & Gerarchia

- **Font Family**: Inter, SF Pro, o sans-serif di sistema a peso pieno.
- **H1 (Titolo Pagina)**: `text-2xl sm:text-3xl font-black text-stone-900 tracking-tight`
- **Sottotitolo Pagina**: `text-stone-500 text-sm mt-0.5`
- **H2 (Sezione Card)**: `text-base sm:text-lg font-bold text-stone-900`
- **H3 (Sottosezione)**: `text-sm sm:text-base font-bold text-stone-900`
- **KPI / Valori in rilievo**: `text-2xl sm:text-3xl font-black text-stone-900 tracking-tight`
- **Etichetta Metrica (KPI Label)**: `text-[11px] font-bold text-stone-400 uppercase tracking-wider`
- **Corpo del testo**: `text-sm font-medium text-stone-700 leading-relaxed`

---

## 4. Layout e Griglie

### 4.1 Container Principali
- **Dashboard, Liste, Calendari e Grandi Tabelle**:
  ```tsx
  <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
  ```
- **Pagine di Dettaglio, Moduli Anagrafici e Impostazioni Profilo**:
  ```tsx
  <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
  ```

### 4.2 Sidebar & Layout Base (`ProLayout` / `AdminLayout`)
- Sfondo sidebar desktop: `bg-stone-900 text-stone-300 border-r border-stone-800`
- Logo Badge: `w-10 h-10 rounded-2xl bg-orange-500 text-white font-black flex items-center justify-center shadow-lg shadow-orange-500/25`
- Indicatori rotta attiva:
  ```tsx
  className={({ isActive }) =>
    isActive
      ? "flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-orange-500 text-white font-bold shadow-md shadow-orange-500/20"
      : "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800/60 font-medium"
  }
  ```

---

## 5. Anatomia dei Componenti Standard

### 5.1 Intestazione Pagina (Page Header)
Tutte le pagine devono presentare un'intestazione standard con badge icona a sinistra e bottoni di azione rapida a destra:
```tsx
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600 flex-shrink-0">
            <Icon className="w-6 h-6" />
        </div>
        <div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">Titolo Pagina</h1>
            <p className="text-stone-500 text-sm mt-0.5">Descrizione sintetica della funzione della vista</p>
        </div>
    </div>
    <div className="flex items-center gap-3">
        {/* Pulsanti Azione */}
    </div>
</div>
```

### 5.2 Schede KPI (Metric Strip)
Griglia a 4 colonne per presentare le metriche essenziali:
```tsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center justify-between">
        <div>
            <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Totale Cantieri</p>
            <p className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight mt-1">24</p>
            <p className="text-xs text-stone-500 mt-1 font-medium">Assegnati questo mese</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
            <Hammer className="w-6 h-6" />
        </div>
    </div>
</div>
```

### 5.3 Barra Filtri e Ricerca (Toolbar Strip)
```tsx
<div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
    {/* Campo di ricerca */}
    <div className="relative w-full sm:w-80">
        <Search className="absolute left-3.5 top-3 text-stone-400" size={18} />
        <input
            type="text"
            placeholder="Cerca per cliente, indirizzo o ID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
        />
    </div>
    {/* Segmented Filter Pills */}
    <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-1 bg-stone-100/70 rounded-xl border border-stone-200/60">
        <button className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-stone-900 shadow-xs">
            Tutti
        </button>
        <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-stone-500 hover:text-stone-900">
            In Corso
        </button>
    </div>
</div>
```

### 5.4 Schede Contenuto & Tabelle Dati
- Contenitore Card: `bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden`
- Intestazione Sezione Card: `p-6 border-b border-stone-100 flex items-center justify-between`
- Intestazione Tabella:
  ```tsx
  <thead className="bg-stone-50/80 border-b border-stone-100 text-[11px] font-bold uppercase tracking-wider text-stone-400">
  ```
- Righe Tabella:
  ```tsx
  <tbody className="divide-y divide-stone-100 text-sm">
      <tr className="hover:bg-stone-50/50 transition-colors">
  ```

### 5.5 Campi Input & Controlli Form
- Input di testo, date, select:
  ```tsx
  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-medium transition-all outline-none"
  ```
- Input disabilitato:
  ```tsx
  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-100/70 text-stone-500 text-sm font-medium cursor-not-allowed"
  ```

### 5.6 Bottoni (Buttons)
- **Pulsante Primario Brand (Arancione)**:
  ```tsx
  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
  ```
- **Pulsante Secondario / Scuro**:
  ```tsx
  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-900 hover:bg-black text-white rounded-xl text-sm font-bold shadow-md active:scale-95 transition-all cursor-pointer"
  ```
- **Pulsante Outline / Neutro**:
  ```tsx
  className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-white hover:bg-stone-100 text-stone-700 rounded-xl border border-stone-200/90 text-xs font-bold shadow-2xs active:scale-95 transition-all cursor-pointer"
  ```
- **Pulsante Distruttivo**:
  ```tsx
  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-md shadow-rose-600/15 active:scale-95 transition-all cursor-pointer"
  ```

### 5.7 Badge di Stato (Status Pills)
Formato compatto e pillola arrotondata:
```tsx
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs bg-emerald-50 text-emerald-700 border-emerald-200/80">
    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
    Completato
</span>
```

---

## 6. Feedback & Notifiche (Sonner Toast)

Non usare mai `alert()` nativo. Utilizzare esclusivamente `sonner`:
```tsx
import { toast } from 'sonner'

// Successo
toast.success('Modifiche salvate con successo!')

// Errore
toast.error('Impossibile salvare i dati: riprova più tardi')

// Azione con caricamento
const toastId = toast.loading('Salvataggio in corso...')
// Al termine:
toast.success('Completato!', { id: toastId })
```

---

## 7. Checklist di Conformità per Nuove Funzionalità

Prima di considerare concluso lo sviluppo di una nuova pagina o componente, verificare:
- [ ] Il container esterno utilizza `container mx-auto px-4 py-8` con `max-w-7xl` o `max-w-5xl`.
- [ ] I font e i pesi rispettano la scala tipografica (`font-black` per titoli e KPI, `font-bold` per sezioni e bottoni).
- [ ] Le card hanno `rounded-2xl border border-stone-200/90 shadow-xs`.
- [ ] I controlli input hanno `rounded-xl` con focus ring arancione `focus:ring-orange-500/20`.
- [ ] I bottoni hanno transizione morbida e feedback tattile `active:scale-95`.
- [ ] I messaggi di conferma ed errore usano `toast` di Sonner.
- [ ] Non vi sono colori improvvisati o elementi disallineati rispetto alla palette `stone` e `orange`.
