/**
 * Sorgente unica dei metadati SEO e dei dati strutturati.
 *
 * Serve due consumatori diversi:
 *  - il browser, tramite l'hook useSeo, quando si naviga fra le rotte;
 *  - lo script di build, che scrive gli stessi metadati dentro l'HTML
 *    statico di ogni pagina, perché i crawler che non eseguono JavaScript
 *    (compresi quelli dei modelli linguistici) vedono solo quello.
 *
 * Tenere i due allineati richiede che le definizioni stiano in un posto solo.
 */

export const SITE = {
    name: 'PosaFacile',
    /** Sovrascrivibile con VITE_SITE_URL per ambienti diversi dalla produzione. */
    url: (import.meta.env?.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '')
        || 'https://posafacile.it',
    locale: 'it_IT',
    lang: 'it',
    description:
        'Materiali, preventivo e posa in un unico progetto: scegli le piastrelle, '
        + 'calcola il costo voce per voce e prenota un posatore verificato della tua zona.',
    /** Immagine di condivisione predefinita. */
    ogImage: '/images/living-naturale.jpg',
    twitter: undefined as string | undefined,
} as const

export interface SeoMeta {
    title: string
    description: string
    /** Percorso assoluto della pagina, senza dominio. */
    path: string
    image?: string
    /** Pagine che non devono finire nell'indice (aree private, flussi). */
    noindex?: boolean
    type?: 'website' | 'article' | 'product'
    /** Dati strutturati aggiuntivi della pagina. */
    jsonLd?: Record<string, unknown>[]
}

export const absoluteUrl = (path: string): string =>
    path.startsWith('http') ? path : `${SITE.url}${path.startsWith('/') ? path : `/${path}`}`

/* ------------------------------------------------------------------ */
/* Dati strutturati riutilizzabili                                     */
/* ------------------------------------------------------------------ */

/**
 * L'organizzazione. È il nodo a cui tutto il resto si riferisce, ed è quello
 * che i motori generativi citano quando devono attribuire una risposta.
 */
export const organizationJsonLd = (): Record<string, unknown> => ({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE.url}/#organization`,
    name: SITE.name,
    url: SITE.url,
    logo: absoluteUrl('/logo-icon.svg'),
    description: SITE.description,
    areaServed: { '@type': 'Country', name: 'Italia' },
    knowsAbout: [
        'posa di piastrelle',
        'gres porcellanato',
        'ristrutturazione bagno',
        'preventivo pavimenti',
        'posatori certificati',
    ],
})

export const websiteJsonLd = (): Record<string, unknown> => ({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE.url}/#website`,
    url: SITE.url,
    name: SITE.name,
    description: SITE.description,
    inLanguage: SITE.lang,
    publisher: { '@id': `${SITE.url}/#organization` },
    potentialAction: {
        '@type': 'SearchAction',
        target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE.url}/catalog?search={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
    },
})

/** Il servizio vero e proprio: fornitura più posa, con la zona coperta. */
export const serviceJsonLd = (): Record<string, unknown> => ({
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${SITE.url}/#service`,
    name: 'Fornitura e posa di pavimenti e rivestimenti',
    serviceType: 'Posa di piastrelle e gres porcellanato',
    provider: { '@id': `${SITE.url}/#organization` },
    areaServed: { '@type': 'Country', name: 'Italia' },
    description:
        'Scelta del materiale, preventivo dettagliato con costo di posa e servizi accessori, '
        + 'assegnazione di un posatore verificato e gestione del cantiere fino alla consegna.',
    offers: {
        '@type': 'Offer',
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
    },
})

export const breadcrumbJsonLd = (
    items: { name: string; path: string }[],
): Record<string, unknown> => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: absoluteUrl(item.path),
    })),
})

export const faqJsonLd = (
    entries: { question: string; answer: string }[],
): Record<string, unknown> => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((entry) => ({
        '@type': 'Question',
        name: entry.question,
        acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    })),
})

/* ------------------------------------------------------------------ */
/* Prodotto                                                            */
/* ------------------------------------------------------------------ */

export interface ProductForSeo {
    id: string
    name: string
    slug: string
    sku?: string | null
    description?: string | null
    images?: unknown
    price_per_sqm?: number | string | null
    material?: string | null
    color_name?: string | null
    finish?: string | null
    format_width?: number | null
    format_height?: number | null
    stock_qty?: number | string | null
    status?: string | null
}

const MATERIAL_LABELS: Record<string, string> = {
    gres: 'Gres porcellanato',
    ceramic: 'Ceramica',
    cotto: 'Cotto',
    natural_stone: 'Pietra naturale',
}

/** "60×60 cm" dal formato in millimetri. */
export const formatLabel = (w?: number | null, h?: number | null): string | null =>
    w && h ? `${Math.round(w / 10)}×${Math.round(h / 10)} cm` : null

/**
 * Descrizione di ripiego quando il prodotto non ne ha una.
 * Un testo generato dagli attributi è meglio di un campo vuoto: dice al
 * motore di cosa si tratta, senza inventare nulla che non sia a catalogo.
 */
export const productDescription = (p: ProductForSeo): string => {
    if (p.description && p.description.trim().length > 40) return p.description.trim()

    const parti = [
        MATERIAL_LABELS[String(p.material)] ?? p.material,
        formatLabel(p.format_width, p.format_height),
        p.color_name ? `colore ${p.color_name}` : null,
        p.finish ? `finitura ${p.finish}` : null,
    ].filter(Boolean)

    const prezzo = Number(p.price_per_sqm)
    const coda = Number.isFinite(prezzo) && prezzo > 0
        ? ` Prezzo ${prezzo.toFixed(2).replace('.', ',')} € al mq, posa inclusa nel preventivo.`
        : ''

    return `${p.name}: ${parti.join(', ')}.${coda} Calcola il preventivo con materiale, `
        + 'posa e servizi accessori e prenota un posatore verificato della tua zona.'
}

export const productImages = (p: ProductForSeo): string[] => {
    const imgs = Array.isArray(p.images) ? (p.images as string[]) : []
    return imgs.filter((i) => typeof i === 'string' && i.length > 0).map(absoluteUrl)
}

/**
 * Schema del prodotto, generato dai dati reali della scheda.
 * `Offer` usa il prezzo al metro quadro: è l'unità con cui il materiale
 * viene effettivamente venduto, e dichiararlo evita risultati incoerenti.
 */
export const productJsonLd = (p: ProductForSeo): Record<string, unknown> => {
    const prezzo = Number(p.price_per_sqm)
    const disponibile = p.status === 'active' && Number(p.stock_qty ?? 1) > 0

    const additional = [
        p.format_width && p.format_height
            ? { '@type': 'PropertyValue', name: 'Formato', value: formatLabel(p.format_width, p.format_height) }
            : null,
        p.material ? { '@type': 'PropertyValue', name: 'Materiale', value: MATERIAL_LABELS[String(p.material)] ?? p.material } : null,
        p.finish ? { '@type': 'PropertyValue', name: 'Finitura', value: p.finish } : null,
        p.color_name ? { '@type': 'PropertyValue', name: 'Colore', value: p.color_name } : null,
    ].filter(Boolean)

    return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        '@id': `${SITE.url}/products/${p.slug}#product`,
        name: p.name,
        description: productDescription(p),
        image: productImages(p),
        sku: p.sku || p.id,
        category: 'Pavimenti e rivestimenti',
        material: MATERIAL_LABELS[String(p.material)] ?? p.material ?? undefined,
        color: p.color_name ?? undefined,
        brand: { '@type': 'Brand', name: SITE.name },
        additionalProperty: additional,
        offers: {
            '@type': 'Offer',
            url: `${SITE.url}/products/${p.slug}`,
            priceCurrency: 'EUR',
            price: Number.isFinite(prezzo) ? prezzo.toFixed(2) : undefined,
            // Il prezzo è al metro quadro: dirlo evita che venga letto come
            // prezzo a pezzo nei risultati arricchiti.
            priceSpecification: Number.isFinite(prezzo)
                ? {
                    '@type': 'UnitPriceSpecification',
                    price: prezzo.toFixed(2),
                    priceCurrency: 'EUR',
                    unitCode: 'MTK',
                    unitText: 'metro quadro',
                }
                : undefined,
            availability: disponibile
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
            seller: { '@id': `${SITE.url}/#organization` },
        },
    }
}

/* ------------------------------------------------------------------ */
/* Metadati delle pagine statiche                                      */
/* ------------------------------------------------------------------ */

/**
 * Ogni titolo dichiara il beneficio e una parola chiave reale, non il nome
 * della sezione. "Catalogo" non è una ricerca che qualcuno fa.
 */
export const STATIC_PAGES: Record<string, SeoMeta> = {
    home: {
        path: '/',
        title: 'PosaFacile — Piastrelle e posa: preventivo online in pochi minuti',
        description:
            'Scegli le piastrelle, guarda come stanno a casa tua con l’anteprima AI e '
            + 'ricevi un preventivo con materiale, posa e servizi. Posatori verificati in tutta Italia.',
    },
    catalog: {
        path: '/catalog',
        title: 'Catalogo piastrelle e gres porcellanato — prezzi al mq | PosaFacile',
        description:
            'Gres porcellanato, ceramica, effetto legno e marmo: filtra per formato, colore e '
            + 'finitura, confronta i prezzi al metro quadro e calcola subito il costo con la posa.',
    },
    professionals: {
        path: '/professionisti',
        title: 'Diventa posatore PosaFacile — cantieri già pronti, materiale incluso',
        description:
            'Entra nella rete di posatori PosaFacile: ricevi cantieri già misurati e quotati, '
            + 'con il materiale consegnato e un solo committente che paga. Nessuna esclusiva.',
    },
    aiTry: {
        path: '/prova-ai',
        title: 'Anteprima AI: come sta il pavimento a casa tua | PosaFacile',
        description:
            'Carica la foto della tua stanza, scegli la piastrella e guarda il risultato prima '
            + 'di decidere. Gratis, senza registrazione, e da lì passi direttamente al preventivo.',
    },
    configurator: {
        path: '/configuratore',
        title: 'Preventivo pavimenti online — materiale, posa e servizi | PosaFacile',
        description:
            'Calcola quanto costa il tuo nuovo pavimento: materiale, manodopera, demolizione, '
            + 'massetto e battiscopa voce per voce, con i giorni di cantiere stimati.',
    },
}

/** Rotte che non devono essere indicizzate: aree riservate e flussi di acquisto. */
export const NOINDEX_PREFIXES = [
    '/dashboard', '/admin', '/pro', '/booking', '/checkout',
    '/login', '/register', '/invite-accept', '/unauthorized', '/cart',
]

export const isNoindexPath = (path: string): boolean =>
    NOINDEX_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
