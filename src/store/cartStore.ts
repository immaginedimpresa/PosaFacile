import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
    id: string // Unix timestamp or uuid
    productId: string
    productName: string
    productImage: string
    pricePerSqm: number

    // Configuration
    sqm: number
    wastePercentage: number
    totalSqm: number // sqm + waste

    // Addons
    layingPattern: string
    includeInstallation: boolean
    installationPrice: number

    totalPrice: number
}

interface CartState {
    items: CartItem[]
    addItem: (item: CartItem) => void
    removeItem: (itemId: string) => void
    clearCart: () => void
    getTotal: () => number
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            addItem: (item) => set((state) => ({ items: [...state.items, item] })),
            removeItem: (itemId) => set((state) => ({
                items: state.items.filter((i) => i.id !== itemId)
            })),
            clearCart: () => set({ items: [] }),
            getTotal: () => get().items.reduce((acc, item) => acc + item.totalPrice, 0),
        }),
        {
            name: 'posa-facile-cart',
        }
    )
)
