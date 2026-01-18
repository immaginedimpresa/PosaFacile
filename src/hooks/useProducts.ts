import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

type Product = Database['public']['Tables']['products']['Row']
type ProductInsert = Database['public']['Tables']['products']['Insert']
type ProductUpdate = Database['public']['Tables']['products']['Update']

interface UseProductsOptions {
    status?: Product['status']
    category?: Product['category']
    search?: string
    limit?: number
    offset?: number
}

interface UseProductsReturn {
    products: Product[]
    loading: boolean
    error: Error | null
    total: number
    refetch: () => Promise<void>
    createProduct: (product: ProductInsert) => Promise<{ data: Product | null; error: Error | null }>
    updateProduct: (id: string, updates: ProductUpdate) => Promise<{ data: Product | null; error: Error | null }>
    deleteProduct: (id: string) => Promise<{ error: Error | null }>
}

export function useProducts(options: UseProductsOptions = {}): UseProductsReturn {
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)
    const [total, setTotal] = useState(0)

    const { status, category, search, limit = 50, offset = 0 } = options

    const fetchProducts = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            let query = supabase
                .from('products')
                .select('*', { count: 'exact' })

            // Apply filters
            if (status) {
                query = query.eq('status', status)
            }
            if (category) {
                query = query.eq('category', category)
            }
            if (search) {
                query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
            }

            // Pagination
            query = query.range(offset, offset + limit - 1)
            query = query.order('created_at', { ascending: false })

            const { data, error: queryError, count } = await query

            if (queryError) {
                throw new Error(queryError.message)
            }

            setProducts(data || [])
            setTotal(count || 0)
        } catch (err) {
            setError(err as Error)
            console.error('Error fetching products:', err)
        } finally {
            setLoading(false)
        }
    }, [status, category, search, limit, offset])

    useEffect(() => {
        fetchProducts()
    }, [fetchProducts])

    const createProduct = async (product: ProductInsert) => {
        try {
            const { data, error: insertError } = await supabase
                .from('products')
                .insert(product as never)
                .select()
                .single<Product>()

            if (insertError) {
                return { data: null, error: new Error(insertError.message) }
            }

            // Refetch to update list
            await fetchProducts()
            return { data, error: null }
        } catch (err) {
            return { data: null, error: err as Error }
        }
    }

    const updateProduct = async (id: string, updates: ProductUpdate) => {
        try {
            const { data, error: updateError } = await supabase
                .from('products')
                .update(updates as never)
                .eq('id', id)
                .select()
                .single<Product>()

            if (updateError) {
                return { data: null, error: new Error(updateError.message) }
            }

            // Refetch to update list
            await fetchProducts()
            return { data, error: null }
        } catch (err) {
            return { data: null, error: err as Error }
        }
    }

    const deleteProduct = async (id: string) => {
        try {
            const { error: deleteError } = await supabase
                .from('products')
                .delete()
                .eq('id', id)

            if (deleteError) {
                return { error: new Error(deleteError.message) }
            }

            // Refetch to update list
            await fetchProducts()
            return { error: null }
        } catch (err) {
            return { error: err as Error }
        }
    }

    return {
        products,
        loading,
        error,
        total,
        refetch: fetchProducts,
        createProduct,
        updateProduct,
        deleteProduct,
    }
}

// Hook to get a single product by ID or slug
export function useProduct(idOrSlug: string) {
    const [product, setProduct] = useState<Product | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        const fetchProduct = async () => {
            setLoading(true)
            setError(null)

            try {
                // Try to fetch by slug first, then by id
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)

                const { data, error: queryError } = await supabase
                    .from('products')
                    .select('*')
                    .eq(isUUID ? 'id' : 'slug', idOrSlug)
                    .single()

                if (queryError) {
                    throw new Error(queryError.message)
                }

                setProduct(data)
            } catch (err) {
                setError(err as Error)
                console.error('Error fetching product:', err)
            } finally {
                setLoading(false)
            }
        }

        if (idOrSlug) {
            fetchProduct()
        }
    }, [idOrSlug])

    return { product, loading, error }
}
