import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Address {
    address: string
    city: string
    cap: string
    province: string
}

interface Professional {
    id: string
    full_name: string
    company_name: string
    rating: number
    years_experience: number
    bio: string
}

interface BookingState {
    // Order info
    orderId: string | null
    cartItems: any[] // Prodotti nel carrello
    totalAmount: number

    // Installation details
    installationAddress: Address | null
    selectedProfessional: Professional | null
    selectedDate: Date | null
    scheduledTimeSlot: string | null // 'mattina' | 'pomeriggio'

    // Actions
    setOrderId: (id: string) => void
    setCartItems: (items: any[]) => void
    setTotalAmount: (amount: number) => void
    setInstallationAddress: (address: Address) => void
    setSelectedProfessional: (pro: Professional) => void
    setSelectedDate: (date: Date) => void
    setScheduledTimeSlot: (slot: string | null) => void
    reset: () => void
}

export const useBookingStore = create<BookingState>()(
    persist(
        (set) => ({
            // Initial state
            orderId: null,
            cartItems: [],
            totalAmount: 0,
            installationAddress: null,
            selectedProfessional: null,
            selectedDate: null,
            scheduledTimeSlot: null,

            // Actions
            setOrderId: (id) => set({ orderId: id }),
            setCartItems: (items) => set({ cartItems: items }),
            setTotalAmount: (amount) => set({ totalAmount: amount }),
            setInstallationAddress: (address) => set({ installationAddress: address }),
            setSelectedProfessional: (pro) => set({ selectedProfessional: pro }),
            setSelectedDate: (date) => set({ selectedDate: date }),
            setScheduledTimeSlot: (slot) => set({ scheduledTimeSlot: slot }),
            reset: () => set({
                orderId: null,
                cartItems: [],
                totalAmount: 0,
                installationAddress: null,
                selectedProfessional: null,
                selectedDate: null,
                scheduledTimeSlot: null
            })
        }),
        {
            name: 'booking-storage', // Persist in localStorage
            partialize: (state) => ({
                // Solo questi campi vengono salvati in localStorage
                installationAddress: state.installationAddress,
                selectedProfessional: state.selectedProfessional,
                selectedDate: state.selectedDate,
                scheduledTimeSlot: state.scheduledTimeSlot,
                cartItems: state.cartItems,
                totalAmount: state.totalAmount
            })
        }
    )
)
