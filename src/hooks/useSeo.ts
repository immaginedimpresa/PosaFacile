import { useEffect } from 'react'
import { SITE, SITE_INDEXABLE, absoluteUrl, isNoindexPath, type SeoMeta } from '@/lib/seo'

/** Crea o aggiorna un tag <meta>, senza duplicarlo a ogni navigazione. */
const setMeta = (attr: 'name' | 'property', key: string, content: string | null) => {
    const selector = `meta[${attr}="${key}"]`
    let tag = document.head.querySelector<HTMLMetaElement>(selector)

    if (content === null) {
        tag?.remove()
        return
    }
    if (!tag) {
        tag = document.createElement('meta')
        tag.setAttribute(attr, key)
        document.head.appendChild(tag)
    }
    tag.setAttribute('content', content)
}

const setLink = (rel: string, href: string) => {
    let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
    if (!tag) {
        tag = document.createElement('link')
        tag.setAttribute('rel', rel)
        document.head.appendChild(tag)
    }
    tag.setAttribute('href', href)
}

/** I dati strutturati aggiunti dall'app sono marcati, per poterli sostituire. */
const JSONLD_ATTR = 'data-seo-jsonld'

const setJsonLd = (blocks: Record<string, unknown>[]) => {
    document.head
        .querySelectorAll(`script[${JSONLD_ATTR}]`)
        .forEach((node) => node.remove())

    for (const block of blocks) {
        const script = document.createElement('script')
        script.type = 'application/ld+json'
        script.setAttribute(JSONLD_ATTR, 'true')
        script.textContent = JSON.stringify(block)
        document.head.appendChild(script)
    }
}

/**
 * Applica i metadati della pagina corrente.
 *
 * Serve alla navigazione dentro l'applicazione e agli strumenti che eseguono
 * JavaScript. I crawler che non lo eseguono leggono invece l'HTML statico
 * generato in fase di build da `scripts/generate-seo.mjs`, che usa gli stessi
 * dati: se cambi qualcosa qui, cambialo nella sorgente condivisa `lib/seo.ts`.
 */
export function useSeo(meta: SeoMeta | null) {
    useEffect(() => {
        if (!meta) return

        const canonical = absoluteUrl(meta.path)
        const image = absoluteUrl(meta.image ?? SITE.ogImage)
        // Finché il sito è schermato la decisione non è della singola pagina:
        // un `noindex: false` esplicito non deve poter riaprire una porta.
        const noindex = !SITE_INDEXABLE || (meta.noindex ?? isNoindexPath(meta.path))

        document.title = meta.title
        setMeta('name', 'description', meta.description)
        setLink('canonical', canonical)

        // Le pagine private non devono finire nell'indice, né essere seguite.
        setMeta(
            'name',
            'robots',
            noindex
                ? 'noindex, nofollow, noarchive, nosnippet, noimageindex'
                : 'index, follow, max-image-preview:large',
        )

        setMeta('property', 'og:type', meta.type ?? 'website')
        setMeta('property', 'og:site_name', SITE.name)
        setMeta('property', 'og:locale', SITE.locale)
        setMeta('property', 'og:title', meta.title)
        setMeta('property', 'og:description', meta.description)
        setMeta('property', 'og:url', canonical)
        setMeta('property', 'og:image', image)

        setMeta('name', 'twitter:card', 'summary_large_image')
        setMeta('name', 'twitter:title', meta.title)
        setMeta('name', 'twitter:description', meta.description)
        setMeta('name', 'twitter:image', image)

        setJsonLd(noindex ? [] : (meta.jsonLd ?? []))
    }, [meta])
}
