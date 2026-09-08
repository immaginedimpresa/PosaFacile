import { useState, useEffect, useMemo } from 'react'
import {
    Users,
    Search,
    Download,
    RefreshCw,
    UserCheck,
    FileText,
    TrendingUp,
    Phone,
    Mail,
    Building2,
    Eye,
    Edit3,
    ArrowUpDown,
    Check,
    Copy,
    MessageSquare,
    AlertCircle
} from 'lucide-react'
import {
    type CustomerSummary,
    fetchCustomers
} from '@/services/customersService'
import { CustomerDetailDrawer } from '@/components/admin/CustomerDetailDrawer'
import { CustomerEditModal } from '@/components/admin/CustomerEditModal'
import { toast } from 'sonner'

export function AdminCustomersPage() {
    const [customers, setCustomers] = useState<CustomerSummary[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Filtri e ricerca
    const [searchTerm, setSearchTerm] = useState('')
    const [typeFilter, setTypeFilter] = useState<'all' | 'private' | 'company'>('all')
    const [activityFilter, setActivityFilter] = useState<'all' | 'with_orders' | 'with_quotes' | 'inactive'>('all')
    const [sortBy, setSortBy] = useState<'date_desc' | 'spent_desc' | 'orders_desc' | 'quotes_desc' | 'name_asc'>('date_desc')

    // Modali e Drawer
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
    const [editingCustomer, setEditingCustomer] = useState<CustomerSummary | null>(null)
    const [copiedEmail, setCopiedEmail] = useState<string | null>(null)

    const loadData = async (isManualRefresh = false) => {
        if (isManualRefresh) setRefreshing(true)
        else setLoading(true)
        setError(null)

        try {
            const data = await fetchCustomers()
            setCustomers(data)
        } catch (err: any) {
            console.error('Error loading customers:', err)
            setError(err.message || 'Errore durante il caricamento dei clienti')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    // Copia rapida email negli appunti
    const handleCopyEmail = (email: string) => {
        navigator.clipboard.writeText(email)
        setCopiedEmail(email)
        toast.success(`Email ${email} copiata negli appunti`)
        setTimeout(() => setCopiedEmail(null), 2000)
    }

    // Esportazione CSV
    const handleExportCSV = () => {
        if (customers.length === 0) {
            toast.error('Nessun cliente da esportare')
            return
        }

        const headers = [
            'ID',
            'Nome',
            'Cognome',
            'Email',
            'Telefono',
            'Tipo',
            'Ragione Sociale',
            'Partita IVA',
            'Codice Fiscale',
            'Ordini',
            'Preventivi',
            'Totale Speso (€)',
            'Data Iscrizione',
            'Note Admin'
        ]

        const rows = filteredCustomers.map(c => [
            `"${c.id}"`,
            `"${c.first_name || ''}"`,
            `"${c.last_name || ''}"`,
            `"${c.email}"`,
            `"${c.phone || ''}"`,
            `"${c.customer_type === 'company' ? 'Azienda' : 'Privato'}"`,
            `"${c.company_name || ''}"`,
            `"${c.vat_number || ''}"`,
            `"${c.fiscal_code || ''}"`,
            c.orders_count,
            c.quotes_count,
            c.total_spent.toFixed(2),
            c.created_at ? new Date(c.created_at).toLocaleDateString('it-IT') : '',
            `"${(c.admin_notes || '').replace(/"/g, '""')}"`
        ])

        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement('a')
        link.setAttribute('href', encodedUri)
        link.setAttribute('download', `clienti_posafacile_${new Date().toISOString().slice(0, 10)}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success('Esportazione CSV completata!')
    }

    // Filtraggio e Ordinamento
    const filteredCustomers = useMemo(() => {
        let result = [...customers]

        // Ricerca testuale
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase().trim()
            result = result.filter(c => {
                const fullName = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase()
                const email = (c.email || '').toLowerCase()
                const phone = (c.phone || '').toLowerCase()
                const company = (c.company_name || '').toLowerCase()
                const vat = (c.vat_number || '').toLowerCase()
                const fiscal = (c.fiscal_code || '').toLowerCase()

                return (
                    fullName.includes(q) ||
                    email.includes(q) ||
                    phone.includes(q) ||
                    company.includes(q) ||
                    vat.includes(q) ||
                    fiscal.includes(q)
                )
            })
        }

        // Filtro tipologia
        if (typeFilter !== 'all') {
            result = result.filter(c => c.customer_type === typeFilter)
        }

        // Filtro attività
        if (activityFilter === 'with_orders') {
            result = result.filter(c => c.orders_count > 0)
        } else if (activityFilter === 'with_quotes') {
            result = result.filter(c => c.quotes_count > 0 && c.orders_count === 0)
        } else if (activityFilter === 'inactive') {
            result = result.filter(c => c.orders_count === 0 && c.quotes_count === 0)
        }

        // Ordinamento
        result.sort((a, b) => {
            switch (sortBy) {
                case 'date_desc':
                    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
                case 'spent_desc':
                    return b.total_spent - a.total_spent
                case 'orders_desc':
                    return b.orders_count - a.orders_count
                case 'quotes_desc':
                    return b.quotes_count - a.quotes_count
                case 'name_asc': {
                    const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim() || a.email
                    const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim() || b.email
                    return nameA.localeCompare(nameB)
                }
                default:
                    return 0
            }
        })

        return result
    }, [customers, searchTerm, typeFilter, activityFilter, sortBy])

    // Metriche aggregate KPI
    const metrics = useMemo(() => {
        const total = customers.length
        const privateCount = customers.filter(c => c.customer_type === 'private').length
        const companyCount = customers.filter(c => c.customer_type === 'company').length
        const withOrders = customers.filter(c => c.orders_count > 0).length
        const totalQuotes = customers.reduce((acc, c) => acc + c.quotes_count, 0)
        const totalRevenue = customers.reduce((acc, c) => acc + c.total_spent, 0)

        return {
            total,
            privateCount,
            companyCount,
            withOrders,
            totalQuotes,
            totalRevenue
        }
    }, [customers])

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-3">
                        <Users className="w-8 h-8 text-orange-500" />
                        <span>Gestione Clienti</span>
                    </h1>
                    <p className="text-sm text-stone-500 mt-1">
                        Consulta anagrafiche, preventivi salvati nel configuratore e storico ordini di tutti i clienti.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => loadData(true)}
                        disabled={refreshing || loading}
                        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs sm:text-sm font-semibold transition-all active:scale-95 cursor-pointer shadow-xs disabled:opacity-50"
                        title="Ricarica elenco"
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin text-orange-500' : ''} />
                        <span className="hidden sm:inline">Aggiorna</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2.5 bg-stone-900 hover:bg-black text-white text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-md"
                    >
                        <Download size={16} />
                        <span>Esporta CSV</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* 1. Totale Clienti */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Totale Clienti</p>
                        <p className="text-2xl font-bold text-stone-900 mt-0.5">{metrics.total}</p>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                            {metrics.privateCount} privati • {metrics.companyCount} aziende
                        </p>
                    </div>
                </div>

                {/* 2. Clienti Attivi con Ordini */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <UserCheck size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Clienti con Ordini</p>
                        <p className="text-2xl font-bold text-stone-900 mt-0.5">{metrics.withOrders}</p>
                        <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                            {metrics.total > 0 ? ((metrics.withOrders / metrics.total) * 100).toFixed(0) : 0}% tasso di conversione
                        </p>
                    </div>
                </div>

                {/* 3. Preventivi Generati */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <FileText size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Preventivi Configurati</p>
                        <p className="text-2xl font-bold text-stone-900 mt-0.5">{metrics.totalQuotes}</p>
                        <p className="text-[11px] text-stone-400 mt-0.5">Bozze salvate dagli utenti</p>
                    </div>
                </div>

                {/* 4. Volume d'Affari Generato */}
                <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Fatturato Ordini</p>
                        <p className="text-2xl font-bold text-purple-700 mt-0.5">
                            € {metrics.totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                            Valore complessivo generato
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-xs mb-6 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Cerca cliente per nome, email, telefono, P.IVA..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                    />
                </div>

                {/* Dropdowns / Pills */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Tipologia */}
                    <select
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value as any)}
                        className="text-xs bg-stone-50 border border-stone-200 px-3 py-2 rounded-xl text-stone-700 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                    >
                        <option value="all">Tutti i tipi</option>
                        <option value="private">Solo Privati</option>
                        <option value="company">Solo Aziende (P.IVA)</option>
                    </select>

                    {/* Attività */}
                    <select
                        value={activityFilter}
                        onChange={e => setActivityFilter(e.target.value as any)}
                        className="text-xs bg-stone-50 border border-stone-200 px-3 py-2 rounded-xl text-stone-700 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                    >
                        <option value="all">Tutta l'attività</option>
                        <option value="with_orders">Con Ordini Conclusi</option>
                        <option value="with_quotes">Solo Preventivi (Lead)</option>
                        <option value="inactive">Senza Attività</option>
                    </select>

                    {/* Ordinamento */}
                    <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 px-2 py-1 rounded-xl">
                        <ArrowUpDown size={14} className="text-stone-400 shrink-0" />
                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value as any)}
                            className="text-xs bg-transparent border-none text-stone-700 font-medium focus:outline-none cursor-pointer pr-2"
                        >
                            <option value="date_desc">Più recenti</option>
                            <option value="spent_desc">Maggior spesa (LTV)</option>
                            <option value="orders_desc">Più ordini</option>
                            <option value="quotes_desc">Più preventivi</option>
                            <option value="name_asc">Nome (A-Z)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 text-sm">
                    <AlertCircle size={18} className="shrink-0" />
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={() => loadData()}
                        className="ml-auto underline font-bold hover:text-red-900 cursor-pointer"
                    >
                        Riprova
                    </button>
                </div>
            )}

            {/* Main Table / Content */}
            <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
                {loading ? (
                    <div className="py-24 text-center text-stone-400">
                        <RefreshCw size={36} className="mx-auto mb-3 animate-spin text-orange-500" />
                        <p className="text-sm font-semibold text-stone-700">Caricamento clienti in corso...</p>
                    </div>
                ) : filteredCustomers.length === 0 ? (
                    <div className="py-20 text-center text-stone-400">
                        <Users size={40} className="mx-auto mb-2 text-stone-300" />
                        <p className="text-base font-bold text-stone-700">Nessun cliente trovato</p>
                        <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                            {searchTerm || typeFilter !== 'all' || activityFilter !== 'all'
                                ? 'Nessun risultato corrisponde ai filtri selezionati. Prova a reimpostare i criteri di ricerca.'
                                : 'Non sono ancora presenti clienti registrati con ruolo customer.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-stone-200 bg-stone-50/70 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                                    <th className="py-3.5 px-4 sm:px-6">Cliente</th>
                                    <th className="py-3.5 px-4">Contatti</th>
                                    <th className="py-3.5 px-4">Tipologia</th>
                                    <th className="py-3.5 px-4 text-center">Preventivi</th>
                                    <th className="py-3.5 px-4 text-center">Ordini</th>
                                    <th className="py-3.5 px-4 text-right">Spesa Totale</th>
                                    <th className="py-3.5 px-4">Data Iscrizione</th>
                                    <th className="py-3.5 px-4 sm:px-6 text-right">Azioni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100 text-xs sm:text-sm">
                                {filteredCustomers.map(customer => {
                                    const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.email
                                    const initials = ((customer.first_name?.[0] || '') + (customer.last_name?.[0] || '')).toUpperCase() || 'U'

                                    return (
                                        <tr
                                            key={customer.id}
                                            className="hover:bg-orange-50/40 transition-colors group cursor-pointer"
                                            onClick={() => setSelectedCustomerId(customer.id)}
                                        >
                                            {/* Cliente (Avatar + Nome + Note indicator) */}
                                            <td className="py-3.5 px-4 sm:px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center shrink-0">
                                                        {initials}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <p className="font-bold text-stone-900 truncate">{fullName}</p>
                                                            {customer.admin_notes && (
                                                                <span
                                                                    title="Presenti note amministrative"
                                                                    className="w-2 h-2 rounded-full bg-amber-500 shrink-0"
                                                                />
                                                            )}
                                                        </div>
                                                        {customer.company_name && (
                                                            <p className="text-[11px] text-stone-500 truncate flex items-center gap-1 mt-0.5">
                                                                <Building2 size={11} className="text-stone-400 shrink-0" />
                                                                <span>{customer.company_name}</span>
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Contatti (Email + Telefono) */}
                                            <td className="py-3.5 px-4" onClick={e => e.stopPropagation()}>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 text-stone-700 text-xs">
                                                        <Mail size={12} className="text-stone-400 shrink-0" />
                                                        <span className="truncate max-w-[170px]">{customer.email}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopyEmail(customer.email)}
                                                            className="text-stone-400 hover:text-stone-700 p-0.5 rounded cursor-pointer"
                                                            title="Copia email"
                                                        >
                                                            {copiedEmail === customer.email ? (
                                                                <Check size={12} className="text-emerald-600" />
                                                            ) : (
                                                                <Copy size={12} />
                                                            )}
                                                        </button>
                                                    </div>

                                                    {customer.phone && (
                                                        <div className="flex items-center gap-1.5 text-stone-500 text-xs">
                                                            <Phone size={12} className="text-stone-400 shrink-0" />
                                                            <span>{customer.phone}</span>
                                                            <a
                                                                href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-emerald-600 hover:text-emerald-700 p-0.5"
                                                                title="Chat WhatsApp"
                                                            >
                                                                <MessageSquare size={12} />
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Tipologia */}
                                            <td className="py-3.5 px-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                                    customer.customer_type === 'company'
                                                        ? 'bg-purple-100 text-purple-700'
                                                        : 'bg-stone-100 text-stone-700'
                                                }`}>
                                                    {customer.customer_type === 'company' ? 'Azienda' : 'Privato'}
                                                </span>
                                            </td>

                                            {/* Preventivi */}
                                            <td className="py-3.5 px-4 text-center">
                                                {customer.quotes_count > 0 ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                                        {customer.quotes_count}
                                                    </span>
                                                ) : (
                                                    <span className="text-stone-300 font-mono">—</span>
                                                )}
                                            </td>

                                            {/* Ordini */}
                                            <td className="py-3.5 px-4 text-center">
                                                {customer.orders_count > 0 ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                                        {customer.orders_count}
                                                    </span>
                                                ) : (
                                                    <span className="text-stone-300 font-mono">—</span>
                                                )}
                                            </td>

                                            {/* Totale Speso */}
                                            <td className="py-3.5 px-4 text-right">
                                                <span className={`font-bold ${
                                                    customer.total_spent > 0 ? 'text-stone-900' : 'text-stone-400'
                                                }`}>
                                                    € {customer.total_spent.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>

                                            {/* Data Iscrizione */}
                                            <td className="py-3.5 px-4 text-stone-500 text-xs">
                                                {customer.created_at
                                                    ? new Date(customer.created_at).toLocaleDateString('it-IT')
                                                    : '—'}
                                            </td>

                                            {/* Azioni */}
                                            <td className="py-3.5 px-4 sm:px-6 text-right" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedCustomerId(customer.id)}
                                                        className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                                                        title="Visualizza scheda completa"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingCustomer(customer)}
                                                        className="p-1.5 rounded-lg text-stone-600 hover:text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer"
                                                        title="Modifica anagrafica"
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Slide-over Drawer Scheda Cliente */}
            <CustomerDetailDrawer
                customerId={selectedCustomerId}
                isOpen={!!selectedCustomerId}
                onClose={() => setSelectedCustomerId(null)}
                onEdit={cust => {
                    setEditingCustomer(cust)
                }}
            />

            {/* Modal Modifica Dati Cliente */}
            <CustomerEditModal
                customer={editingCustomer}
                isOpen={!!editingCustomer}
                onClose={() => setEditingCustomer(null)}
                onSuccess={() => {
                    loadData(true)
                }}
            />
        </div>
    )
}
