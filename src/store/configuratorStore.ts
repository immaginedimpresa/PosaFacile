import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Database } from '@/types/supabase'
import { estimateLayingDuration, type DurationEstimate } from '@/lib/layingDuration'
import {
    campoPosa,
    layingRate,
    markupMultiplier,
    serviceRate,
    type MarkupOverrides,
    type ProfessionalRates,
} from '@/services/ratesService'
import {
    calculateDeliveryCost,
    fetchLogisticsSettings,
    type LogisticsSettings,
    type DeliveryBreakdown,
} from '@/services/settingsService'

type Product = Database['public']['Tables']['products']['Row']

// Step 1: Project Type
export interface ProjectInfo {
    ambiente: 'bagno' | 'cucina' | 'soggiorno' | 'camera' | 'esterno' | 'altro' | null
    intervento: 'nuova_costruzione' | 'ristrutturazione' | 'sostituzione' | null
    rimuoverePavimento: boolean
    fareMassetto: boolean
}

// Logistica di Consegna & Accesso al Cantiere (Piano, Scarico, Montacarichi, Sosta)
export type FloorType = 'ground' | 'upper'
export type DeliveryDestination = 'floor' | 'box' | 'street'
export type MaterialHandling = 'client' | 'pro' | 'carrier'

export interface DeliveryAccessInfo {
    floorType: FloorType
    floorNumber: number
    destination: DeliveryDestination
    handlingBy: MaterialHandling
    hasUnloadingZone: boolean
    hasFreightElevator: boolean
    logisticsNotes: string
}

// Step 2: Product Selection
export interface SelectedProduct {
    id: string
    name: string
    slug: string
    price_per_sqm: number
    images: string[]
    /** Il campione per l'anteprima AI: vedi `tileSampleUrl`. */
    tileable_image_url?: string | null
    category: Product['category']
    material: Product['material']
    /** Formato in mm: determina la resa di posa, quindi i giorni di cantiere. */
    format_width?: number | null
    format_height?: number | null
    /** Giorni di approvvigionamento: spostano la prima data utile, non la durata. */
    lead_time_days?: number | null
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

// Step 6: Location & Date
export interface LocationInfo {
    indirizzo: string
    civico: string
    citta: string
    provincia: string
    cap: string
    /** Coordinate del luogo di posa: servono ai professionisti che coprono un raggio. */
    lat: number | null
    lon: number | null
    dataPreferita: string | null
    flessibile: boolean
}

// Step 7: Professional Selection
export interface SelectedProfessional {
    id: string
    full_name: string
    company_name: string
    rating: number
    /** Tariffa di posa del professionista, al netto del markup di piattaforma. */
    price_per_sqm: number | null
    markup_percent: number
    markup_fixed: number
    /** Margini per singola voce; le assenti usano markup_percent. */
    markup_overrides?: MarkupOverrides | null
}

/** Numero utilizzabile, oppure il valore di ripiego indicato. */
function num(value: unknown, fallback = 0): number {
    const n = Number(value)
    return Number.isFinite(n) ? n : fallback
}

export interface ConfiguratorState {
    currentStep: number
    activeQuoteId: string | null
    projectInfo: ProjectInfo
    selectedProduct: SelectedProduct | null
    dimensions: Dimensions
    layingType: LayingType
    services: AdditionalServices
    location: LocationInfo
    deliveryAccess: DeliveryAccessInfo
    logisticsSettings: LogisticsSettings | null
    selectedProfessional: SelectedProfessional | null
    /** Tariffe del posatore scelto: sono loro a fare il preventivo. */
    professionalRates: ProfessionalRates | null
    selectedDate: Date | null
    aiRoomImage: string | null
    aiResultImage: string | null

    // Actions
    setCurrentStep: (step: number) => void
    setActiveQuoteId: (id: string | null) => void
    nextStep: () => void
    prevStep: () => void
    loadFromSavedQuote: (quote: any) => void

    setProjectInfo: (info: Partial<ProjectInfo>) => void
    setSelectedProduct: (product: SelectedProduct | null) => void
    setDimensions: (dims: Partial<Dimensions>) => void
    setLayingType: (type: LayingType) => void
    setServices: (services: Partial<AdditionalServices>) => void
    setLocation: (loc: Partial<LocationInfo>) => void
    setDeliveryAccess: (access: Partial<DeliveryAccessInfo>) => void
    deliverySubStep: number
    setDeliverySubStep: (step: number) => void
    loadLogisticsSettings: (force?: boolean) => Promise<void>
    setSelectedProfessional: (pro: SelectedProfessional | null) => void
    setProfessionalRates: (rates: ProfessionalRates | null) => void
    setSelectedDate: (date: Date | null) => void
    setAiRoomImage: (image: string | null) => void
    setAiResultImage: (image: string | null) => void

    // Computed
    getTotalMq: () => number
    getMaterialCost: () => number
    getLayingCost: () => number
    getServicesCost: () => number
    getDeliveryBreakdown: () => DeliveryBreakdown
    getDeliveryCost: () => number
    getSubtotal: () => number
    getVat: () => number
    getTotal: () => number
    getDurationEstimate: () => DurationEstimate

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
        civico: '',
        citta: '',
        provincia: '',
        cap: '',
        lat: null,
        lon: null,
        dataPreferita: null,
        flessibile: true,
    },
    deliveryAccess: {
        floorType: 'ground' as FloorType,
        floorNumber: 0,
        destination: 'street' as DeliveryDestination,
        handlingBy: 'client' as MaterialHandling,
        hasUnloadingZone: true,
        hasFreightElevator: false,
        logisticsNotes: '',
    },
    deliverySubStep: 1,
    logisticsSettings: null as LogisticsSettings | null,
    activeQuoteId: null,
    selectedProfessional: null,
    professionalRates: null,
    selectedDate: null,
    aiRoomImage: null,
    aiResultImage: null,
}

export const useConfiguratorStore = create<ConfiguratorState>()(
    persist(
        (set, get) => ({
            ...initialState,

            setCurrentStep: (step) => set({ currentStep: step }),
            setActiveQuoteId: (id) => set({ activeQuoteId: id }),
            nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 11) })),
            prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),

            loadFromSavedQuote: (quote: any) => {
                if (!quote) return

                const product = quote.product ? {
                    id: quote.product.id,
                    name: quote.product.name,
                    slug: quote.product.slug || quote.product.name?.toLowerCase().replace(/\s+/g, '-'),
                    price_per_sqm: Number(quote.product.price_per_sqm) || 0,
                    images: quote.product.images || [],
                    category: quote.product.category || 'floor',
                    material: quote.product.material || 'Gres porcellanato',
                    format_width: quote.product.format_width ?? null,
                    format_height: quote.product.format_height ?? null,
                    lead_time_days: quote.product.lead_time_days ?? null,
                } : null

                const servicesObj = typeof quote.services === 'object' && quote.services !== null
                    ? quote.services
                    : {}

                set({
                    activeQuoteId: quote.id,
                    currentStep: 11, // Go straight to summary
                    projectInfo: {
                        ambiente: quote.project_type || 'soggiorno',
                        intervento: 'ristrutturazione',
                        rimuoverePavimento: false,
                        fareMassetto: false,
                    },
                    selectedProduct: product,
                    dimensions: {
                        pavimentoMq: Number(quote.square_meters) || 0,
                        paretiMq: 0,
                        sfridoPercent: 10,
                    },
                    layingType: (quote.laying_type as LayingType) || 'dritta',
                    services: {
                        demolizione: Boolean(servicesObj.demolizione),
                        massetto: Boolean(servicesObj.massetto),
                        impermeabilizzazione: Boolean(servicesObj.impermeabilizzazione),
                        smaltimento: Boolean(servicesObj.smaltimento),
                        battiscopa: Boolean(servicesObj.battiscopa),
                        battiscopaMetri: Number(servicesObj.battiscopaMetri) || 0,
                        soglie: Boolean(servicesObj.soglie),
                        soglieQty: Number(servicesObj.soglieQty) || 0,
                    },
                    location: {
                        indirizzo: (servicesObj.street_name || (quote.address || '').split(',')[0]).trim(),
                        civico: servicesObj.civico || (quote.address?.includes(',') ? quote.address.split(',')[1].trim() : ''),
                        citta: quote.city || '',
                        provincia: quote.provincia || '',
                        cap: quote.cap || '',
                        lat: null,
                        lon: null,
                        dataPreferita: quote.scheduled_date || null,
                        flessibile: true,
                    },
                    deliveryAccess: {
                        floorType: (quote.delivery_access?.floorType || servicesObj.delivery_access?.floorType || 'ground'),
                        floorNumber: Number(quote.delivery_access?.floorNumber ?? servicesObj.delivery_access?.floorNumber ?? 0),
                        destination: (quote.delivery_access?.destination || servicesObj.delivery_access?.destination || 'street'),
                        handlingBy: (quote.delivery_access?.handlingBy || servicesObj.delivery_access?.handlingBy || (quote.delivery_access?.destination === 'floor' ? 'carrier' : 'client')),
                        hasUnloadingZone: (quote.delivery_access?.hasUnloadingZone ?? servicesObj.delivery_access?.hasUnloadingZone ?? true),
                        hasFreightElevator: (quote.delivery_access?.hasFreightElevator ?? servicesObj.delivery_access?.hasFreightElevator ?? false),
                        logisticsNotes: quote.delivery_access?.logisticsNotes || servicesObj.delivery_access?.logisticsNotes || '',
                    },
                    selectedDate: quote.scheduled_date ? new Date(quote.scheduled_date) : null,
                    aiRoomImage: null,
                    aiResultImage: quote.ai_result_image || null,
                })
            },

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

            setLocation: (loc) => set((state) => {
                const provinceChanged =
                    loc.provincia !== undefined &&
                    loc.provincia.trim().toUpperCase() !== state.location.provincia.trim().toUpperCase()
                return {
                    location: { ...state.location, ...loc },
                    ...(provinceChanged
                        ? { selectedProfessional: null, professionalRates: null }
                        : {}),
                }
            }),

            setDeliveryAccess: (access) => set((state) => ({
                deliveryAccess: { ...state.deliveryAccess, ...access }
            })),

            setDeliverySubStep: (step) => set({ deliverySubStep: Math.max(1, Math.min(4, step)) }),

            loadLogisticsSettings: async (force = false) => {
                try {
                    const settings = await fetchLogisticsSettings(force)
                    set({ logisticsSettings: settings })
                } catch (e) {
                    console.warn('Errore nel caricamento impostazioni logistica:', e)
                }
            },

            setSelectedProfessional: (pro) => set({ selectedProfessional: pro }),
            setProfessionalRates: (rates) => set({ professionalRates: rates }),
            setSelectedDate: (date) => set({ selectedDate: date }),

            setAiRoomImage: (image) => set({ aiRoomImage: image }),
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
                const { layingType, dimensions, selectedProfessional, professionalRates } = get()
                const baseMq = dimensions.pavimentoMq + dimensions.paretiMq
                // La tariffa e' quella dichiarata dal posatore per quello schema:
                // non piu' una base unica con una maggiorazione uguale per tutti.
                const tariffa = layingRate(professionalRates, layingType)
                // Il margine puo' essere diverso per schema di posa.
                const conMargine = tariffa * markupMultiplier(
                    campoPosa(layingType),
                    selectedProfessional?.markup_percent,
                    selectedProfessional?.markup_overrides,
                )
                // Il margine fisso e' una tantum: non va moltiplicato per i metri quadri.
                const oneOff = num(selectedProfessional?.markup_fixed)
                return baseMq * conMargine + oneOff
            },

            getServicesCost: () => {
                const { services, dimensions, professionalRates, selectedProfessional } = get()
                const baseMq = dimensions.pavimentoMq + dimensions.paretiMq
                const tariffa = (chiave: string) => serviceRate(professionalRates, chiave)
                    * markupMultiplier(
                        chiave,
                        selectedProfessional?.markup_percent,
                        selectedProfessional?.markup_overrides,
                    )
                let cost = 0

                if (services.demolizione) cost += baseMq * tariffa('demolizione')
                if (services.massetto) cost += baseMq * tariffa('massetto')
                if (services.impermeabilizzazione) cost += baseMq * tariffa('impermeabilizzazione')
                if (services.smaltimento) cost += baseMq * tariffa('smaltimento')
                if (services.battiscopa) cost += services.battiscopaMetri * tariffa('battiscopa')
                if (services.soglie) cost += services.soglieQty * tariffa('soglie')

                return cost
            },

            getDeliveryBreakdown: () => {
                const { deliveryAccess, logisticsSettings, dimensions, professionalRates, selectedProfessional } = get()
                if (!logisticsSettings) {
                    get().loadLogisticsSettings()
                }
                const baseMq = (dimensions?.pavimentoMq || 0) + (dimensions?.paretiMq || 0)
                return calculateDeliveryCost(deliveryAccess, logisticsSettings, {
                    baseMq,
                    rates: professionalRates,
                    markupPercent: selectedProfessional?.markup_percent,
                    markupOverrides: selectedProfessional?.markup_overrides,
                })
            },

            getDeliveryCost: () => {
                return get().getDeliveryBreakdown().total
            },

            getSubtotal: () => {
                return get().getMaterialCost() + get().getLayingCost() + get().getServicesCost() + get().getDeliveryCost()
            },

            getVat: () => {
                return get().getSubtotal() * 0.22
            },

            getTotal: () => {
                return get().getSubtotal() + get().getVat()
            },

            /**
             * Giornate di cantiere stimate sui dati del configuratore.
             * È la stima che finisce in preventivo e che il professionista
             * conferma o corregge quando accetta l'incarico.
             */
            getDurationEstimate: () => {
                const { dimensions, layingType, projectInfo, selectedProduct, services } = get()
                return estimateLayingDuration({
                    floorSqm: dimensions.pavimentoMq,
                    wallSqm: dimensions.paretiMq,
                    layingType,
                    ambiente: projectInfo.ambiente,
                    intervento: projectInfo.intervento,
                    tileWidthMm: selectedProduct?.format_width,
                    tileHeightMm: selectedProduct?.format_height,
                    services,
                })
            },

            reset: () => set(initialState),
        }),
        {
            name: 'posafacile-configurator',
            // Il professionista ha acquisito tariffa e markup: senza questa migrazione
            // uno stato salvato in precedenza resterebbe privo di quei campi.
            version: 1,
            migrate: (persisted: any, fromVersion: number) => {
                if (fromVersion < 1 && persisted?.selectedProfessional) {
                    const pro = persisted.selectedProfessional
                    if (pro.price_per_sqm === undefined) {
                        // Va riscelto: la tariffa si legge solo dall'elenco professionisti.
                        persisted.selectedProfessional = null
                    }
                }
                return persisted
            },
        }
    )
)
