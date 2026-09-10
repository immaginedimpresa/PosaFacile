import { supabase } from '@/lib/supabase'
import type {
    ExistingProduct,
    PlannedImportRow,
    ValidatedImportRow,
} from '@/lib/productCsvImport'
import {
    runProductImport,
    type ImportProgress,
} from '@/lib/productImportRunner'

/** Check the whole file, independently of the admin list's filters and 50-row pagination. */
export async function findImportConflicts(
    rows: ValidatedImportRow[],
): Promise<ExistingProduct[]> {
    const skus = [
        ...new Set(rows.map((row) => row.product.sku).filter(Boolean)),
    ]
    const slugs = [
        ...new Set(rows.map((row) => row.product.slug).filter(Boolean)),
    ]
    const found = new Map<string, ExistingProduct>()
    for (
        let index = 0;
        index < Math.max(skus.length, slugs.length);
        index += 100
    ) {
        const queries = []
        if (index < skus.length)
            queries.push(
                supabase
                    .from('products')
                    .select('id,sku,slug')
                    .in('sku', skus.slice(index, index + 100)),
            )
        if (index < slugs.length)
            queries.push(
                supabase
                    .from('products')
                    .select('id,sku,slug')
                    .in('slug', slugs.slice(index, index + 100)),
            )
        for (const result of await Promise.all(queries)) {
            if (result.error)
                throw new Error(
                    'Non è stato possibile controllare gli SKU del catalogo. Riprova prima di importare.',
                )
            result.data?.forEach((product) => found.set(product.id, product))
        }
    }
    return [...found.values()]
}

export function importProductCatalog(
    plan: PlannedImportRow[],
    onProgress: (progress: ImportProgress) => void,
    shouldStop: () => boolean,
) {
    return runProductImport(
        plan,
        {
            create: async (products) => {
                const { data, error } = await supabase
                    .from('products')
                    .insert(products)
                    .select('sku')
                if (error) return { message: error.message, code: error.code }
                if (data?.length !== products.length)
                    return {
                        message:
                            'La risposta del server non conferma tutti i prodotti.',
                    }
                return null
            },
            update: async (id, patch) => {
                const { data, error } = await supabase
                    .from('products')
                    .update(patch)
                    .eq('id', id)
                    .select('id')
                    .maybeSingle()
                if (error) return { message: error.message, code: error.code }
                if (!data)
                    return {
                        message:
                            'Prodotto non più presente o non aggiornabile. Ricarica l’anteprima.',
                        code: 'PGRST116',
                    }
                return null
            },
        },
        onProgress,
        shouldStop,
    )
}
