import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    X,
    User,
    Mail,
    Phone,
    Building2,
    Calendar,
    Receipt,
    FileText,
    MapPin,
    Save,
    ExternalLink,
    Clock,
    AlertCircle,
    CheckCircle2,
    Edit3,
    FileCheck
} from 'lucide-react'
import {
    type FullCustomerDetails,
    fetchCustomerDetails,
    updateCustomerAdminNotes
} from '@/services/customersService'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'

interface CustomerDetailDrawerProps {
    customerId: string | null
    isOpen: boolean
    onClose: () => void
    onEdit: (customer: FullCustomerDetails) => void
}

export function CustomerDetailDrawer({
    customerId,
    isOpen,
    onClose,
    onEdit
}: CustomerDetailDrawerProps) {
    const [details, setDetails] = useState<FullCustomerDetails | null>(null)
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<'overview' | 'quotes' | 'orders'>('overview')
    const [adminNotes, setAdminNotes] = useState('')
    const [savingNotes, setSavingNotes] = useState(false)

    useEffect(() => {
        if (!customerId || !isOpen) {
            setDetails(null)
            return
        }

        let isMounted = true
        setLoading(true)

        fetchCustomerDetails(customerId)
            .then(data => {
                if (isMounted) {
                    setDetails(data)
                    setAdminNotes(data.admin_notes || '')
                }
            })
            .catch(err => {
                console.error(err)
                toast.error('Impossibile caricare i dati del cliente')
            })
            .finally(() => {
                if (isMounted) setLoading(false)
            })

        return () => {
            isMounted = false
        }
    }, [customerId, isOpen])

    const handleSaveNotes = async () => {
        if (!customerId) return
        setSavingNotes(true)
        try {
            await updateCustomerAdminNotes(customerId, adminNotes)
            toast.success('Note amministrative aggiornate con successo')
            if (details) {
                setDetails({ ...details, admin_notes: adminNotes })
            }
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || 'Errore nel salvataggio delle note')
        } finally {
            setSavingNotes(false)
        }
    }

    if (!isOpen) return null

    const fullName = details
        ? [details.first_name, details.last_name].filter(Boolean).join(' ') || details.email
        : 'Caricamento...'

    const initials = details
        ? ((details.first_name?.[0] || '') + (details.last_name?.[0] || '')).toUpperCase() || 'U'
        : ''

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 overflow-hidden">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-stone-900/50 backdrop-blur-xs transition-opacity cursor-pointer"
                />

                {/* Slide-over panel */}
                <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                        className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col"
                    >
                        {/* Drawer Header */}
                        <div className="p-6 bg-stone-900 text-white flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-orange-500 text-white font-bold text-xl flex items-center justify-center shadow-md">
                                    {initials}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-bold text-white">{fullName}</h2>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                            details?.customer_type === 'company'
                                                ? 'bg-purple-900/60 text-purple-200 border border-purple-400/40'
                                                : 'bg-emerald-900/60 text-emerald-200 border border-emerald-400/40'
                                        }`}>
                                            {details?.customer_type === 'company' ? 'Azienda' : 'Privato'}
                                        </span>
                                    </div>
                                    <p className="text-stone-300 text-xs mt-0.5 flex items-center gap-1.5">
                                        <Mail size={13} className="text-stone-400" />
                                        <span>{details?.email}</span>
                                    </p>
                                    {details?.company_name && (
                                        <p className="text-stone-400 text-xs flex items-center gap-1.5 mt-0.5">
                                            <Building2 size={13} className="text-stone-400" />
                                            <span>{details.company_name}</span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {details && (
                                    <button
                                        type="button"
                                        onClick={() => onEdit(details)}
                                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                                        title="Modifica anagrafica"
                                    >
                                        <Edit3 size={18} />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Top Highlights KPI strip */}
                        <div className="grid grid-cols-3 border-b border-stone-200 bg-stone-50/80 px-6 py-3 text-center divide-x divide-stone-200">
                            <div>
                                <p className="text-[11px] font-semibold uppercase text-stone-500">Spesa Totale</p>
                                <p className="text-base font-bold text-orange-600 mt-0.5">
                                    € {(details?.total_spent || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold uppercase text-stone-500">Ordini Effettuati</p>
                                <p className="text-base font-bold text-stone-900 mt-0.5">
                                    {details?.orders_count || 0}
                                </p>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold uppercase text-stone-500">Preventivi Bozze</p>
                                <p className="text-base font-bold text-stone-900 mt-0.5">
                                    {details?.quotes_count || 0}
                                </p>
                            </div>
                        </div>

                        {/* Nav Tabs */}
                        <div className="flex border-b border-stone-200 px-6 gap-6 bg-white">
                            <button
                                type="button"
                                onClick={() => setActiveTab('overview')}
                                className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                                    activeTab === 'overview'
                                        ? 'border-orange-500 text-orange-600'
                                        : 'border-transparent text-stone-500 hover:text-stone-800'
                                }`}
                            >
                                <User size={15} />
                                <span>Panoramica & Note</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('quotes')}
                                className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                                    activeTab === 'quotes'
                                        ? 'border-orange-500 text-orange-600'
                                        : 'border-transparent text-stone-500 hover:text-stone-800'
                                }`}
                            >
                                <FileText size={15} />
                                <span>Preventivi ({details?.quotes.length || 0})</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('orders')}
                                className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                                    activeTab === 'orders'
                                        ? 'border-orange-500 text-orange-600'
                                        : 'border-transparent text-stone-500 hover:text-stone-800'
                                }`}
                            >
                                <Receipt size={15} />
                                <span>Ordini ({details?.orders.length || 0})</span>
                            </button>
                        </div>

                        {/* Drawer Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {loading ? (
                                <div className="py-20 text-center text-stone-400">
                                    <Clock size={32} className="mx-auto animate-spin mb-3 text-orange-500" />
                                    <p className="text-sm font-medium">Caricamento scheda cliente in corso...</p>
                                </div>
                            ) : details ? (
                                <>
                                    {activeTab === 'overview' && (
                                        <div className="space-y-6">
                                            {/* Anagrafica & Recapiti */}
                                            <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200">
                                                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3.5">
                                                    Dati di Contatto & Fiscali
                                                </h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                                                    <div>
                                                        <span className="text-stone-400 text-xs block">Email</span>
                                                        <span className="font-semibold text-stone-900 break-all">{details.email}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-stone-400 text-xs block">Telefono</span>
                                                        {details.phone ? (
                                                            <div className="flex items-center gap-2 font-semibold text-stone-900">
                                                                <span>{details.phone}</span>
                                                                <a
                                                                    href={`tel:${details.phone}`}
                                                                    className="text-orange-600 hover:text-orange-700"
                                                                    title="Chiama"
                                                                >
                                                                    <Phone size={14} />
                                                                </a>
                                                            </div>
                                                        ) : (
                                                            <span className="text-stone-400 italic">Non indicato</span>
                                                        )}
                                                    </div>

                                                    {details.customer_type === 'company' ? (
                                                        <>
                                                            <div>
                                                                <span className="text-stone-400 text-xs block">Ragione Sociale</span>
                                                                <span className="font-semibold text-stone-900">
                                                                    {details.company_name || 'Non specificata'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-stone-400 text-xs block">Partita IVA</span>
                                                                <span className="font-mono font-semibold text-stone-900">
                                                                    {details.vat_number || 'Non specificata'}
                                                                </span>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div>
                                                            <span className="text-stone-400 text-xs block">Codice Fiscale</span>
                                                            <span className="font-mono font-semibold text-stone-900">
                                                                {details.fiscal_code || 'Non indicato'}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div>
                                                        <span className="text-stone-400 text-xs block">Data Registrazione</span>
                                                        <span className="font-medium text-stone-800">
                                                            {details.created_at
                                                                ? new Date(details.created_at).toLocaleDateString('it-IT', {
                                                                      day: '2-digit',
                                                                      month: 'long',
                                                                      year: 'numeric'
                                                                  })
                                                                : '—'}
                                                        </span>
                                                    </div>

                                                    <div>
                                                        <span className="text-stone-400 text-xs block">Stato Account</span>
                                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full mt-0.5">
                                                            <CheckCircle2 size={12} />
                                                            <span>Attivo</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Indirizzi Salvati */}
                                            <div className="bg-white rounded-2xl p-5 border border-stone-200">
                                                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3 flex items-center justify-between">
                                                    <span>Indirizzi Registrati ({details.addresses.length})</span>
                                                    <MapPin size={15} className="text-stone-400" />
                                                </h3>

                                                {details.addresses.length === 0 ? (
                                                    <p className="text-xs text-stone-400 italic">Nessun indirizzo salvato nel profilo.</p>
                                                ) : (
                                                    <div className="space-y-2.5">
                                                        {details.addresses.map(addr => (
                                                            <div
                                                                key={addr.id}
                                                                className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs flex items-center justify-between"
                                                            >
                                                                <div>
                                                                    <p className="font-semibold text-stone-900">
                                                                        {addr.street || 'Indirizzo'}
                                                                    </p>
                                                                    <p className="text-stone-500 text-[11px]">
                                                                        {[addr.postal_code, addr.city, addr.province]
                                                                            .filter(Boolean)
                                                                            .join(' ')}
                                                                    </p>
                                                                </div>
                                                                {addr.is_default && (
                                                                    <span className="bg-orange-100 text-orange-700 font-bold text-[10px] px-2 py-0.5 rounded-full">
                                                                        Predefinito
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Note Amministratore (CRM) */}
                                            <div className="bg-amber-50/70 rounded-2xl p-5 border border-amber-200">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                                                        <AlertCircle size={14} className="text-amber-600" />
                                                        <span>Note Interne Admin (CRM)</span>
                                                    </h3>
                                                    <span className="text-[10px] text-amber-700 font-medium">Visibili solo allo staff</span>
                                                </div>
                                                <p className="text-xs text-amber-800/80 mb-3">
                                                    Aggiungi promemoria, preferenze del cliente, o storico telefonico per il team.
                                                </p>
                                                <textarea
                                                    rows={4}
                                                    value={adminNotes}
                                                    onChange={e => setAdminNotes(e.target.value)}
                                                    placeholder="Es. Richiamato il 15/09, vuole posa pavimento per villetta a Novembre. Mandata offerta con sconto 5%..."
                                                    className="w-full text-xs sm:text-sm p-3 bg-white rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-900 resize-none shadow-xs"
                                                />
                                                <div className="flex justify-end mt-2.5">
                                                    <button
                                                        type="button"
                                                        onClick={handleSaveNotes}
                                                        disabled={savingNotes}
                                                        className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
                                                    >
                                                        <Save size={14} />
                                                        <span>{savingNotes ? 'Salvataggio...' : 'Salva Note'}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'quotes' && (
                                        <div className="space-y-4">
                                            {details.quotes.length === 0 ? (
                                                <div className="py-12 text-center text-stone-400">
                                                    <FileText size={36} className="mx-auto mb-2 text-stone-300" />
                                                    <p className="text-sm font-semibold text-stone-600">Nessun preventivo salvato</p>
                                                    <p className="text-xs text-stone-400 mt-1">Il cliente non ha ancora preventivi configurati.</p>
                                                </div>
                                            ) : (
                                                details.quotes.map(quote => (
                                                    <div
                                                        key={quote.id}
                                                        className="p-4 bg-stone-50 rounded-2xl border border-stone-200 hover:border-orange-300 transition-all group"
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div>
                                                                <h4 className="font-bold text-stone-900 text-sm">
                                                                    {quote.name || 'Preventivo Configurato'}
                                                                </h4>
                                                                <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-2">
                                                                    <Calendar size={12} />
                                                                    <span>
                                                                        {new Date(quote.created_at).toLocaleDateString('it-IT')}
                                                                    </span>
                                                                    {quote.city && (
                                                                        <>
                                                                            <span>•</span>
                                                                            <span className="flex items-center gap-1">
                                                                                <MapPin size={11} />
                                                                                {quote.city} ({quote.provincia})
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </p>
                                                            </div>
                                                            <span className="text-sm font-bold text-orange-600">
                                                                € {(quote.total || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-stone-200/80 text-[11px] text-stone-600">
                                                            <div>
                                                                <span className="text-stone-400 block">Progetto</span>
                                                                <span className="font-semibold text-stone-800 capitalize">
                                                                    {quote.project_type || '—'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-stone-400 block">Superficie</span>
                                                                <span className="font-semibold text-stone-800">
                                                                    {Number(quote.floor_sqm || 0) + Number(quote.wall_sqm || 0)} mq
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-stone-400 block">Posa</span>
                                                                <span className="font-semibold text-stone-800 capitalize">
                                                                    {quote.laying_type || '—'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="mt-3.5 flex justify-end">
                                                            <Link
                                                                to={`/configuratore?quote=${quote.id}`}
                                                                target="_blank"
                                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors"
                                                            >
                                                                <span>Apri configurazione</span>
                                                                <ExternalLink size={13} />
                                                            </Link>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'orders' && (
                                        <div className="space-y-4">
                                            {details.orders.length === 0 ? (
                                                <div className="py-12 text-center text-stone-400">
                                                    <Receipt size={36} className="mx-auto mb-2 text-stone-300" />
                                                    <p className="text-sm font-semibold text-stone-600">Nessun ordine effettuato</p>
                                                    <p className="text-xs text-stone-400 mt-1">Il cliente non ha ancora finalizzato ordini.</p>
                                                </div>
                                            ) : (
                                                details.orders.map(order => (
                                                    <div
                                                        key={order.id}
                                                        className="p-4 bg-stone-50 rounded-2xl border border-stone-200 hover:border-stone-300 transition-all"
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-mono font-bold text-stone-900 text-sm">
                                                                        #{order.order_number || order.id.slice(0, 8)}
                                                                    </span>
                                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                                                        order.status === 'completed'
                                                                            ? 'bg-emerald-100 text-emerald-800'
                                                                            : order.status === 'cancelled'
                                                                                ? 'bg-red-100 text-red-800'
                                                                                : 'bg-amber-100 text-amber-800'
                                                                    }`}>
                                                                        {order.status}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-stone-500 mt-1 flex items-center gap-2">
                                                                    <Calendar size={12} />
                                                                    <span>
                                                                        {order.created_at
                                                                            ? new Date(order.created_at).toLocaleDateString('it-IT')
                                                                            : '—'}
                                                                    </span>
                                                                    {order.scheduled_date && (
                                                                        <>
                                                                            <span>•</span>
                                                                            <span>Posa prevista: {new Date(order.scheduled_date).toLocaleDateString('it-IT')}</span>
                                                                        </>
                                                                    )}
                                                                </p>
                                                            </div>
                                                            <span className="text-base font-bold text-stone-900">
                                                                € {(order.total || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                                            </span>
                                                        </div>

                                                        {order.installation_address && (
                                                            <p className="text-xs text-stone-600 mt-2.5 flex items-center gap-1.5 pt-2 border-t border-stone-200/80">
                                                                <MapPin size={13} className="text-stone-400 shrink-0" />
                                                                <span className="truncate">{order.installation_address}</span>
                                                            </p>
                                                        )}

                                                        <div className="mt-3 flex justify-end">
                                                            <Link
                                                                to="/admin/orders"
                                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-700 hover:text-stone-900 transition-colors"
                                                            >
                                                                <span>Gestisci in Ordini</span>
                                                                <FileCheck size={13} />
                                                            </Link>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : null}
                        </div>

                        {/* Drawer Footer */}
                        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 rounded-xl transition-all cursor-pointer"
                            >
                                Chiudi
                            </button>
                            {details && (
                                <button
                                    type="button"
                                    onClick={() => onEdit(details)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-xs"
                                >
                                    <Edit3 size={14} />
                                    <span>Modifica Anagrafica</span>
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </AnimatePresence>
    )
}
