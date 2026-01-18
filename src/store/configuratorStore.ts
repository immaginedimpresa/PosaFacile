import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Database } from '@/types/supabase'

type Product = Database['public']['Tables']['products']['Row']

// Step 1: Project Type
export interface ProjectInfo {
    ambiente: 'bagno' | 'cucina' | 'soggiorno' | 'camera' | 'esterno' | 'altro' | null
    intervento: 'nuova_costruzione' | 'ristrutturazione' | 'sostituzione' | null
    rimuoverePavimento: boolean
    fareMassetto: boolean
}

// Step 2: Product Selection
export interface SelectedProduct {
    id: string
    name: string
    slug: string
    price_per_sqm: number
    images: string[]
    category: Product['category']
    material: Product['material']
}

// Step 3: Dimensions
export interface Dimensions {
    pavimentoMq: number
    paretiMq: number
    sfridoPercent: number // Default 10%
}

// Step 4: Laying Type
export type LayingType = 'dritta' | 'diagonale' | 'correre' | 'spina' | 'mosaico'

export const LAYING_TYPE_LABELS: Record<LayingType, string> = {
    dritta: 'Dritta (standard)',
    diagonale: 'Diagonale',
    correre: 'A correre (sfalsata)',
    spina: 'Spina di pesce',
    mosaico: 'Mosaico/Decorativo',
}

export const LAYING_TYPE_SURCHARGE: Record<LayingType, number> = {
    dritta: 0,
    diagonale: 0.15,
    correre: 0.10,
    spina: 0.25,
    mosaico: 0.40,
}

// Step 5: Additional Services
export interface AdditionalServices {
    demolizione: boolean
    massetto: boolean
    impermeabilizzazione: boolean
    smaltimento: boolean
    battiscopa: boolean
    battiscopaMetri: number
    soglie: boolean
    soglieQty: number
}

// Service prices (configurable)
export const SERVICE_PRICES = {
    demolizione: 12, // €/mq
    massetto: 18, // €/mq
    impermeabilizzazione: 25, // €/mq
    smaltimento: 8, // €/mq
    battiscopa: 6, // €/metro
    soglie: 35, // €/pezzo
}

// Step 6: Location & Date
export interface LocationInfo {
    indirizzo: string
    citta: string
    provincia: string
    cap: string
    dataPreferita: string | null
    flessibile: boolean
}

// Step 7: Professional Selection
export interface SelectedProfessional {
    id: string
    full_name: string
    company_name: string
    rating: number
}

// Base laying rate (configurable per zone)
const BASE_LAYING_RATE = 25 // €/mq

interface ConfiguratorState {
    currentStep: number
    projectInfo: ProjectInfo
    selectedProduct: SelectedProduct | null
    dimensions: Dimensions
    layingType: LayingType
    services: AdditionalServices
    location: LocationInfo
    selectedProfessional: SelectedProfessional | null
    selectedDate: Date | null
    aiResultImage: string | null

    // Actions
    setCurrentStep: (step: number) => void
    nextStep: () => void
    prevStep: () => void

    setProjectInfo: (info: Partial<ProjectInfo>) => void
    setSelectedProduct: (product: SelectedProduct | null) => void
    setDimensions: (dims: Partial<Dimensions>) => void
    setLayingType: (type: LayingType) => void
    setServices: (services: Partial<AdditionalServices>) => void
    setLocation: (loc: Partial<LocationInfo>) => void
    setSelectedProfessional: (pro: SelectedProfessional | null) => void
    setSelectedDate: (date: Date | null) => void
    setAiResultImage: (image: string | null) => void

    // Computed
    getTotalMq: () => number
    getMaterialCost: () => number
    getLayingCost: () => number
    getServicesCost: () => number
    getSubtotal: () => number
    getVat: () => number
    getTotal: () => number

    // Reset
    reset: () => void
}

const initialState = {
    currentStep: 1,
    projectInfo: {
        ambiente: null,
        intervento: null,
        rimuoverePavimento: false,
        fareMassetto: false,
    },
    selectedProduct: null,
    dimensions: {
        pavimentoMq: 0,
        paretiMq: 0,
        sfridoPercent: 10,
    },
    layingType: 'dritta' as LayingType,
    services: {
        demolizione: false,
        massetto: false,
        impermeabilizzazione: false,
        smaltimento: false,
        battiscopa: false,
        battiscopaMetri: 0,
        soglie: false,
        soglieQty: 0,
    },
    location: {
        indirizzo: '',
        citta: '',
        provincia: '',
        cap: '',
        dataPreferita: null,
        flessibile: true,
    },
    selectedProfessional: null,
    selectedDate: null,
    aiResultImage: null,
}

export const useConfiguratorStore = create<ConfiguratorState>()(
    persist(
        (set, get) => ({
            ...initialState,

            setCurrentStep: (step) => set({ currentStep: step }),
            nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 9) })),
            prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),

            setProjectInfo: (info) => set((state) => ({
                projectInfo: { ...state.projectInfo, ...info }
            })),

            setSelectedProduct: (product) => set({ selectedProduct: product }),

            setDimensions: (dims) => set((state) => ({
                dimensions: { ...state.dimensions, ...dims }
            })),

            setLayingType: (type) => set({ layingType: type }),

            setServices: (services) => set((state) => ({
                services: { ...state.services, ...services }
            })),

            setLocation: (loc) => set((state) => ({
                location: { ...state.location, ...loc }
            })),

            setSelectedProfessional: (pro) => set({ selectedProfessional: pro }),
            setSelectedDate: (date) => set({ selectedDate: date }),

            setAiResultImage: (image) => set({ aiResultImage: image }),

            getTotalMq: () => {
                const { dimensions } = get()
                const baseMq = dimensions.pavimentoMq + dimensions.paretiMq
                const sfridoMq = baseMq * (dimensions.sfridoPercent / 100)
                return baseMq + sfridoMq
            },

            getMaterialCost: () => {
                const { selectedProduct } = get()
                if (!selectedProduct) return 0
                return get().getTotalMq() * selectedProduct.price_per_sqm
            },

            getLayingCost: () => {
                const { layingType, dimensions } = get()
                const baseMq = dimensions.pavimentoMq + dimensions.paretiMq
                const surcharge = LAYING_TYPE_SURCHARGE[layingType]
                return baseMq * BASE_LAYING_RATE * (1 + surcharge)
            },

            getServicesCost: () => {
                const { services, dimensions } = get()
                const baseMq = dimensions.pavimentoMq + dimensions.paretiMq
                let cost = 0

                if (services.demolizione) cost += baseMq * SERVICE_PRICES.demolizione
                if (services.massetto) cost += baseMq * SERVICE_PRICES.massetto
                if (services.impermeabilizzazione) cost += baseMq * SERVICE_PRICES.impermeabilizzazione
                if (services.smaltimento) cost += baseMq * SERVICE_PRICES.smaltimento
                if (services.battiscopa) cost += services.battiscopaMetri * SERVICE_PRICES.battiscopa
                if (services.soglie) cost += services.soglieQty * SERVICE_PRICES.soglie

                return cost
            },

            getSubtotal: () => {
                return get().getMaterialCost() + get().getLayingCost() + get().getServicesCost()
            },

            getVat: () => {
                return get().getSubtotal() * 0.22
            },

            getTotal: () => {
                return get().getSubtotal() + get().getVat()
            },

            reset: () => set(initialState),
        }),
        {
            name: 'posafacile-configurator',
        }
    )
)
