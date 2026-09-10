/**
 * Generazione statica per SEO e motori generativi.
 *
 * PosaFacile è un'applicazione a pagina singola: senza questo passaggio ogni
 * indirizzo restituisce lo stesso guscio vuoto, con un unico titolo e nessun
 * contenuto. I motori di ricerca eseguono JavaScript, ma con ritardo e senza
 * garanzie; i crawler dei modelli linguistici, che oggi portano una quota
 * crescente di traffico qualificato, in genere non lo eseguono affatto.
 *
 * Lo script, dopo la build di Vite:
 *  1. legge i prodotti pubblicati;
 *  2. scrive robots.txt e sitemap.xml;
 *  3. per ogni rotta pubblica scrive un HTML statico con i metadati corretti,
 *     i dati strutturati e una versione testuale del contenuto.
 *
 * I metadati provengono dalle stesse definizioni usate dall'applicazione
 * (src/lib/seo.ts): il testo che legge un crawler e quello che vede un utente
 * restano allineati.
 */

import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DIST = join(ROOT, 'dist')

const SITE_URL = (process.env.VITE_SITE_URL || 'https://posafacile.it').replace(/\/$/, '')

/**
 * Interruttore di pre-lancio, gemello di SITE_INDEXABLE in src/lib/seo.ts.
 *
 * Spento (predefinito): ogni pagina esce con `noindex`, non si scrive la
 * sitemap e robots.txt chiude la porta ai crawler che ignorano gli header.
 * Si riaccende con VITE_SITE_INDEXABLE=true nell'ambiente di build.
 */
const INDEXABLE = process.env.VITE_SITE_INDEXABLE === 'true'
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dgkejtsseshiankefhgy.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY
    || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRna2VqdHNzZXNoaWFua2VmaGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNDk1NTMsImV4cCI6MjEwMzkyNTU1M30.QNbBnL4zwK6xjMQuJSt7uJyCw_RABueogMRXmQLebeE'

const SITE_NAME = 'PosaFacile'
const SITE_DESCRIPTION =
    'Materiali, preventivo e posa in un unico progetto: scegli le piastrelle, calcola il '
    + 'costo voce per voce e prenota un posatore verificato della tua zona.'

const MATERIAL_LABELS = {
    gres: 'Gres porcellanato',
    ceramic: 'Ceramica',
    cotto: 'Cotto',
    natural_stone: 'Pietra naturale',
}

const escapeHtml = (value) =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')

const abs = (path) => (String(path).startsWith('http') ? path : `${SITE_URL}${path}`)
const formatLabel = (w, h) => (w && h ? `${Math.round(w / 10)}×${Math.round(h / 10)} cm` : null)

/* ------------------------------------------------------------------ */
/* Prodotti                                                            */
/* ------------------------------------------------------------------ */

async function fetchProducts() {
    const url = `${SUPABASE_URL}/rest/v1/products`
        + '?select=id,name,slug,sku,description,images,price_per_sqm,material,color_name,'
        + 'finish,format_width,format_height,stock_qty,status,updated_at,category'
        + '&status=eq.active&order=created_at.asc'

    try {
        const response = await fetch(url, {
            headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return await response.json()
    } catch (error) {
        // Un problema di rete non deve far fallire il deploy: si generano
        // comunque le pagine statiche, senza quelle dei prodotti.
        console.warn(`[seo] prodotti non recuperati (${error.message}): sitemap senza schede prodotto`)
        return []
    }
}

const productDescription = (p) => {
    if (p.description && p.description.trim().length > 40) return p.description.trim()
    const parti = [
        MATERIAL_LABELS[p.material] ?? p.material,
        formatLabel(p.format_width, p.format_height),
        p.color_name ? `colore ${p.color_name}` : null,
        p.finish ? `finitura ${p.finish}` : null,
    ].filter(Boolean)
    const prezzo = Number(p.price_per_sqm)
    const coda = Number.isFinite(prezzo) && prezzo > 0
        ? ` Prezzo ${prezzo.toFixed(2).replace('.', ',')} € al mq, posa inclusa nel preventivo.`
        : ''
    return `${p.name}: ${parti.join(', ')}.${coda} Calcola il preventivo con materiale, posa e `
        + 'servizi accessori e prenota un posatore verificato della tua zona.'
}

const productJsonLd = (p) => {
    const prezzo = Number(p.price_per_sqm)
    const images = (Array.isArray(p.images) ? p.images : []).filter(Boolean).map(abs)
    const additional = [
        formatLabel(p.format_width, p.format_height)
            && { '@type': 'PropertyValue', name: 'Formato', value: formatLabel(p.format_width, p.format_height) },
        p.material && { '@type': 'PropertyValue', name: 'Materiale', value: MATERIAL_LABELS[p.material] ?? p.material },
        p.finish && { '@type': 'PropertyValue', name: 'Finitura', value: p.finish },
        p.color_name && { '@type': 'PropertyValue', name: 'Colore', value: p.color_name },
    ].filter(Boolean)

    return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        '@id': `${SITE_URL}/products/${p.slug}#product`,
        name: p.name,
        description: productDescription(p),
        image: images,
        sku: p.sku || p.id,
        category: 'Pavimenti e rivestimenti',
        material: MATERIAL_LABELS[p.material] ?? p.material ?? undefined,
        color: p.color_name ?? undefined,
        brand: { '@type': 'Brand', name: SITE_NAME },
        additionalProperty: additional,
        offers: {
            '@type': 'Offer',
            url: `${SITE_URL}/products/${p.slug}`,
            priceCurrency: 'EUR',
            price: Number.isFinite(prezzo) ? prezzo.toFixed(2) : undefined,
            priceSpecification: Number.isFinite(prezzo)
                ? {
                    '@type': 'UnitPriceSpecification',
                    price: prezzo.toFixed(2),
                    priceCurrency: 'EUR',
                    unitCode: 'MTK',
                    unitText: 'metro quadro',
                }
                : undefined,
            availability: Number(p.stock_qty ?? 1) > 0
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
            seller: { '@id': `${SITE_URL}/#organization` },
        },
    }
}

/** Contenuto testuale della scheda: è ciò che legge chi non esegue JavaScript. */
const productContent = (p) => {
    const prezzo = Number(p.price_per_sqm)
    const righe = [
        formatLabel(p.format_width, p.format_height) && `<li>Formato: ${escapeHtml(formatLabel(p.format_width, p.format_height))}</li>`,
        p.material && `<li>Materiale: ${escapeHtml(MATERIAL_LABELS[p.material] ?? p.material)}</li>`,
        p.color_name && `<li>Colore: ${escapeHtml(p.color_name)}</li>`,
        p.finish && `<li>Finitura: ${escapeHtml(p.finish)}</li>`,
        Number.isFinite(prezzo) && `<li>Prezzo: ${prezzo.toFixed(2).replace('.', ',')} € al mq</li>`,
    ].filter(Boolean).join('')

    return `<article>
      <h1>${escapeHtml(p.name)}</h1>
      <p>${escapeHtml(productDescription(p))}</p>
      <ul>${righe}</ul>
      <p><a href="${SITE_URL}/configuratore">Calcola il preventivo con posa inclusa</a> ·
         <a href="${SITE_URL}/catalog">Torna al catalogo</a></p>
    </article>`
}

/* ------------------------------------------------------------------ */
/* Dati strutturati comuni                                             */
/* ------------------------------------------------------------------ */

const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: abs('/logo-icon.svg'),
    description: SITE_DESCRIPTION,
    areaServed: { '@type': 'Country', name: 'Italia' },
    knowsAbout: [
        'posa di piastrelle', 'gres porcellanato', 'ristrutturazione bagno',
        'preventivo pavimenti', 'posatori certificati',
    ],
}

const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: 'it',
    publisher: { '@id': `${SITE_URL}/#organization` },
    potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/catalog?search={search_term_string}` },
        'query-input': 'required name=search_term_string',
    },
}

const service = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${SITE_URL}/#service`,
    name: 'Fornitura e posa di pavimenti e rivestimenti',
    serviceType: 'Posa di piastrelle e gres porcellanato',
    provider: { '@id': `${SITE_URL}/#organization` },
    areaServed: { '@type': 'Country', name: 'Italia' },
    description: SITE_DESCRIPTION,
}

const breadcrumb = (items) => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
        '@type': 'ListItem', position: i + 1, name: item.name, item: abs(item.path),
    })),
})

/* ------------------------------------------------------------------ */
/* Pagine statiche                                                     */
/* ------------------------------------------------------------------ */

const staticPages = [
    {
        path: '/',
        priority: '1.0',
        changefreq: 'weekly',
        title: 'PosaFacile — Piastrelle e posa: preventivo online in pochi minuti',
        description:
            'Scegli le piastrelle, guarda come stanno a casa tua con l’anteprima AI e ricevi un '
            + 'preventivo con materiale, posa e servizi. Posatori verificati in tutta Italia.',
        jsonLd: [organization, website, service],
        content: `<h1>PosaFacile: il tuo nuovo pavimento, dall’idea alla posa</h1>
          <p>${escapeHtml(SITE_DESCRIPTION)}</p>
          <h2>Come funziona</h2>
          <ol>
            <li>Scegli il materiale dal catalogo e provalo nella tua stanza con l’anteprima AI.</li>
            <li>Indica superficie, tipo di posa e servizi: il preventivo mostra ogni voce di costo
                e i giorni di cantiere stimati.</li>
            <li>Scegli il posatore della tua zona e la data. Il materiale arriva in cantiere,
                tu segui l’avanzamento dalla tua area personale.</li>
          </ol>
          <p><a href="${SITE_URL}/catalog">Catalogo piastrelle</a> ·
             <a href="${SITE_URL}/configuratore">Calcola il preventivo</a> ·
             <a href="${SITE_URL}/professionisti">Sei un posatore?</a></p>`,
    },
    {
        path: '/catalog',
        priority: '0.9',
        changefreq: 'daily',
        title: 'Catalogo piastrelle e gres porcellanato — prezzi al mq | PosaFacile',
        description:
            'Gres porcellanato, ceramica, effetto legno e marmo: filtra per formato, colore e '
            + 'finitura, confronta i prezzi al metro quadro e calcola subito il costo con la posa.',
        jsonLd: [breadcrumb([{ name: 'Home', path: '/' }, { name: 'Catalogo', path: '/catalog' }])],
        content: `<h1>Catalogo piastrelle e gres porcellanato</h1>
          <p>Tutti i materiali disponibili, con il prezzo al metro quadro e il costo della posa
             calcolabile in preventivo.</p>`,
    },
    {
        path: '/professionisti',
        priority: '0.8',
        changefreq: 'monthly',
        title: 'Diventa posatore PosaFacile — cantieri già pronti, materiale incluso',
        description:
            'Entra nella rete di posatori PosaFacile: ricevi cantieri già misurati e quotati, con '
            + 'il materiale consegnato e un solo committente che paga. Nessuna esclusiva.',
        jsonLd: [breadcrumb([{ name: 'Home', path: '/' }, { name: 'Diventa posatore', path: '/professionisti' }])],
        content: `<h1>Sei un professionista della posa?</h1>
          <p>Ricevi cantieri già misurati e quotati: il cliente ha scelto materiale, metratura e
             tipo di posa prima che tu li veda. Il materiale lo acquista e consegna PosaFacile,
             tu non anticipi nulla e fatturi a un solo committente.</p>
          <h2>Come funziona per te</h2>
          <ol>
            <li>Ricevi la proposta con superficie, formato, servizi e compenso.</li>
            <li>Confermi o correggi le giornate di cantiere stimate.</li>
            <li>Il materiale arriva in cantiere prima dell’inizio dei lavori.</li>
            <li>Apri il cantiere, documenti con le foto e lo chiudi dall’app.</li>
            <li>Il compenso matura alla chiusura: nessun sollecito da fare.</li>
          </ol>`,
    },
    {
        path: '/come-funziona',
        priority: '0.9',
        changefreq: 'weekly',
        title: 'Come funziona PosaFacile — Fornitura materiale e posatori verificati',
        description:
            'Scopri come funziona PosaFacile per privati e imprese: piastrelle di prima scelta, preventivo fisso al centesimo, consegna al piano e posatori certificati con DURC e assicurazione.',
        jsonLd: [breadcrumb([{ name: 'Home', path: '/' }, { name: 'Come funziona', path: '/come-funziona' }])],
        content: `<h1>Come funziona PosaFacile: pavimenti e posa senza sorprese</h1>
          <p>Materiali di prima scelta consegnati al piano, preventivo chiaro al centesimo con sfrido calcolato,
             posatori qualificati con DURC e assicurazione e un unico committente responsabile.</p>
          <h2>Le 5 fasi per i privati</h2>
          <ol>
            <li>Scelta del materiale o anteprima AI sulla foto della tua stanza.</li>
            <li>Preventivo trasparente con calcolo dello sfrido e manodopera inclusa.</li>
            <li>Scelta del maestro posatore e blocco data sul calendario.</li>
            <li>Consegna diretta al piano di piastrelle e colle prima dell’avvio lavori.</li>
            <li>Esecuzione a regola d’arte, aggiornamenti in tempo reale e collaudo finale.</li>
          </ol>
          <h2>Per le imprese e i professionisti (B2B)</h2>
          <p>Squadre di posa specializzate su commessa, fatturazione unica, DURC sempre valido e rispetto dei cronoprogrammi per imprese edili, general contractor e showroom.</p>`,
    },
    {
        path: '/prova-ai',
        priority: '0.8',
        changefreq: 'monthly',
        title: 'Anteprima AI: come sta il pavimento a casa tua | PosaFacile',
        description:
            'Carica la foto della tua stanza, scegli la piastrella e guarda il risultato prima di '
            + 'decidere. Gratis, senza registrazione, e da lì passi direttamente al preventivo.',
        jsonLd: [breadcrumb([{ name: 'Home', path: '/' }, { name: 'Anteprima AI', path: '/prova-ai' }])],
        content: `<h1>Guarda il pavimento nella tua stanza prima di decidere</h1>
          <p>Carica una foto del pavimento o della parete, scegli la piastrella dal catalogo e
             l’anteprima ti mostra il risultato con lo schema di posa che preferisci. È gratis e
             non serve registrarsi: dal risultato passi direttamente al preventivo.</p>`,
    },
    {
        path: '/configuratore',
        priority: '0.9',
        changefreq: 'weekly',
        title: 'Preventivo pavimenti online — materiale, posa e servizi | PosaFacile',
        description:
            'Calcola quanto costa il tuo nuovo pavimento: materiale, manodopera, demolizione, '
            + 'massetto e battiscopa voce per voce, con i giorni di cantiere stimati.',
        jsonLd: [breadcrumb([{ name: 'Home', path: '/' }, { name: 'Preventivo', path: '/configuratore' }])],
        content: `<h1>Calcola il preventivo del tuo pavimento</h1>
          <p>Indica ambiente, superficie, tipo di posa e servizi accessori: il preventivo mostra
             separatamente il costo del materiale, quello della manodopera e ogni lavorazione
             aggiuntiva, insieme ai giorni di cantiere stimati.</p>`,
    },
]

/* ------------------------------------------------------------------ */
/* Scrittura                                                           */
/* ------------------------------------------------------------------ */

/**
 * Riporta il guscio allo stato neutro.
 *
 * Il file di partenza è dist/index.html, che però è anche la destinazione
 * della home: senza questa pulizia, rieseguire lo script senza ricompilare
 * impilerebbe i metadati di una pagina su quelli di un'altra.
 */
function cleanShell(html) {
    return html
        .replace(/\n?\s*<noscript>[\s\S]*?<\/noscript>/gi, '')
        .replace(/\n?\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, '')
        .replace(/\n?\s*<link rel="canonical"[^>]*>/gi, '')
        .replace(/\n?\s*<meta (?:property="og:|name="twitter:|name="robots")[^>]*>/gi, '')
}

/** Inserisce metadati, dati strutturati e contenuto nel guscio generato da Vite. */
function buildHtml(shell, page) {
    const canonical = abs(page.path)
    const image = abs(page.image || '/images/living-naturale.jpg')

    const head = [
        `<title>${escapeHtml(page.title)}</title>`,
        `<meta name="description" content="${escapeHtml(page.description)}" />`,
        `<link rel="canonical" href="${canonical}" />`,
        INDEXABLE
            ? '<meta name="robots" content="index, follow, max-image-preview:large" />'
            : '<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />',
        `<meta property="og:type" content="${page.type || 'website'}" />`,
        `<meta property="og:site_name" content="${SITE_NAME}" />`,
        '<meta property="og:locale" content="it_IT" />',
        `<meta property="og:title" content="${escapeHtml(page.title)}" />`,
        `<meta property="og:description" content="${escapeHtml(page.description)}" />`,
        `<meta property="og:url" content="${canonical}" />`,
        `<meta property="og:image" content="${image}" />`,
        '<meta name="twitter:card" content="summary_large_image" />',
        `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`,
        `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`,
        `<meta name="twitter:image" content="${image}" />`,
        ...(INDEXABLE ? (page.jsonLd || []) : []).map(
            (block) => `<script type="application/ld+json">${JSON.stringify(block)}</script>`,
        ),
    ].join('\n    ')

    let html = shell
        // Il guscio ha già titolo e descrizione generici: vanno sostituiti,
        // non affiancati, altrimenti restano due tag concorrenti.
        .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
        .replace(/<meta\s+name="description"[^>]*>\s*/i, '')
        .replace('</head>', `  ${head}\n  </head>`)

    // A sito schermato la sitemap non viene scritta: lasciarne il rimando
    // significherebbe indicare ai crawler un file che non esiste.
    if (!INDEXABLE) {
        html = html.replace(/\n?\s*<link rel="sitemap"[^>]*>/i, '')
    }

    // Il contenuto testuale sta in <noscript>: è quello che vede chi non
    // esegue JavaScript, e coincide con quanto mostra la pagina.
    if (page.content) {
        html = html.replace(
            '<div id="root"></div>',
            `<div id="root"></div>\n    <noscript>\n      ${page.content}\n    </noscript>`,
        )
    }
    return html
}

async function writePage(page, shell) {
    const dir = page.path === '/' ? DIST : join(DIST, page.path)
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'index.html'), buildHtml(shell, page), 'utf8')
}

/**
 * Il meta robots delle pagine e l'header di Netlify sono due leve separate, e
 * al lancio si dimentica la seconda: si mette VITE_SITE_INDEXABLE=true, la
 * build dice che tutto è a posto, e il sito resta invisibile perché ogni
 * risposta continua a uscire con X-Robots-Tag: noindex. Meglio accorgersene qui
 * che fra tre settimane guardando Search Console.
 */
async function warnHeaderMismatch() {
    if (!INDEXABLE) return
    const config = join(ROOT, 'netlify.toml')
    if (!existsSync(config)) return

    const content = await readFile(config, 'utf8')
    if (/X-Robots-Tag\s*=\s*"[^"]*noindex/i.test(content)) {
        console.warn(
            '\n[seo] ATTENZIONE: le pagine sono indicizzabili, ma netlify.toml serve ancora\n'
            + '      X-Robots-Tag: noindex su tutte le risposte. Finché quel blocco resta,\n'
            + '      il sito NON verrà indicizzato. Rimuovilo da netlify.toml.\n',
        )
    }
}

async function main() {
    if (!existsSync(DIST)) {
        console.error('[seo] cartella dist assente: eseguire dopo la build di Vite')
        process.exit(0)
    }

    await warnHeaderMismatch()

    const shell = cleanShell(await readFile(join(DIST, 'index.html'), 'utf8'))
    const products = await fetchProducts()

    const productPages = products.map((p) => ({
        path: `/products/${p.slug}`,
        priority: '0.7',
        changefreq: 'weekly',
        lastmod: p.updated_at,
        title: `${p.name}${formatLabel(p.format_width, p.format_height) ? ` ${formatLabel(p.format_width, p.format_height)}` : ''}`
            + `${Number.isFinite(Number(p.price_per_sqm)) ? ` — € ${Number(p.price_per_sqm).toFixed(2)}/mq` : ''} | ${SITE_NAME}`,
        description: productDescription(p),
        image: (Array.isArray(p.images) ? p.images : [])[0],
        type: 'product',
        jsonLd: [
            productJsonLd(p),
            breadcrumb([
                { name: 'Home', path: '/' },
                { name: 'Catalogo', path: '/catalog' },
                { name: p.name, path: `/products/${p.slug}` },
            ]),
        ],
        content: productContent(p),
    }))

    const pages = [...staticPages, ...productPages]
    for (const page of pages) await writePage(page, shell)

    // --- sitemap ---
    const oggi = new Date().toISOString().slice(0, 10)
    const sitemap = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...pages.map((page) => [
            '  <url>',
            `    <loc>${abs(page.path)}</loc>`,
            `    <lastmod>${(page.lastmod || oggi).slice(0, 10)}</lastmod>`,
            `    <changefreq>${page.changefreq}</changefreq>`,
            `    <priority>${page.priority}</priority>`,
            '  </url>',
        ].join('\n')),
        '</urlset>',
        '',
    ].join('\n')

    if (INDEXABLE) {
        await writeFile(join(DIST, 'sitemap.xml'), sitemap, 'utf8')
    } else if (existsSync(join(DIST, 'sitemap.xml'))) {
        // Una sitemap rimasta da una build precedente continuerebbe a invitare
        // i motori su pagine che vogliamo nascoste.
        await rm(join(DIST, 'sitemap.xml'))
    }

    // --- robots ---
    //
    // A sito schermato NON si usa un semplice "Disallow: /" per Google: una
    // pagina bloccata da robots.txt non viene letta, quindi Google non vede il
    // noindex e può comunque elencare l'indirizzo se lo trova citato altrove.
    // La strada corretta è lasciarla leggere e dirle a chiare lettere di non
    // indicizzarla, cosa che fanno l'header X-Robots-Tag e il meta robots.
    //
    // Per i crawler che ignorano quei segnali — gli scraper dei modelli
    // linguistici, che leggono solo robots.txt — l'unica leva è il divieto
    // esplicito, e qui viene usata.
    const robots = INDEXABLE
        ? `# ${SITE_NAME}
User-agent: *
Allow: /
Disallow: /admin
Disallow: /pro
Disallow: /dashboard
Disallow: /booking
Disallow: /checkout
Disallow: /cart
Disallow: /login
Disallow: /register
Disallow: /invite-accept
Disallow: /unauthorized

# Motori generativi: ammessi sulle pagine pubbliche
User-agent: GPTBot
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Google-Extended
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`
        : `# ${SITE_NAME} — sito non ancora pubblico, nessuna indicizzazione.
#
# La scansione resta permessa di proposito: e' l'unico modo perche' i motori
# leggano il noindex servito nell'header X-Robots-Tag e nel meta robots. Un
# divieto di scansione qui otterrebbe l'effetto opposto, lasciando comparire
# l'indirizzo nudo nei risultati.

User-agent: *
Allow: /
Disallow: /admin
Disallow: /pro
Disallow: /dashboard
Disallow: /booking
Disallow: /checkout
Disallow: /cart
Disallow: /login
Disallow: /register
Disallow: /invite-accept
Disallow: /unauthorized

# Crawler che leggono solo robots.txt e ignorano il noindex: qui il divieto
# esplicito e' l'unica leva che funziona.
User-agent: GPTBot
Disallow: /
User-agent: OAI-SearchBot
Disallow: /
User-agent: ChatGPT-User
Disallow: /
User-agent: PerplexityBot
Disallow: /
User-agent: ClaudeBot
Disallow: /
User-agent: anthropic-ai
Disallow: /
User-agent: Google-Extended
Disallow: /
User-agent: CCBot
Disallow: /
User-agent: Bytespider
Disallow: /
User-agent: Amazonbot
Disallow: /
User-agent: Applebot-Extended
Disallow: /
User-agent: meta-externalagent
Disallow: /
`
    await writeFile(join(DIST, 'robots.txt'), robots, 'utf8')

    console.log(
        INDEXABLE
            ? `[seo] ${pages.length} pagine statiche (${productPages.length} prodotti), sitemap e robots.txt generati`
            : `[seo] ${pages.length} pagine statiche (${productPages.length} prodotti) con noindex: `
              + 'sito schermato dai motori, nessuna sitemap. '
              + 'Per pubblicarlo: VITE_SITE_INDEXABLE=true',
    )
}

// La generazione dei metadati non deve mai bloccare un deploy: se fallisce,
// il sito va online con il guscio predefinito e un errore nel log, invece di
// restare fermo alla versione precedente.
main().catch((error) => {
    console.error('[seo] generazione saltata:', error?.message || error)
    process.exit(0)
})
