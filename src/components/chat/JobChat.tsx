import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Send, MessageSquare, ShieldCheck, User, Wrench, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface Message {
    id: string
    sender_id: string
    content: string
    created_at: string
}

interface JobChatProps {
    jobId: string
    currentUserId: string
    proUserId?: string | null
    customerUserId?: string | null
    title?: string
    subtitle?: string
    className?: string
}

interface SenderProfile {
    id: string
    name: string
    role: 'professional' | 'customer' | 'admin' | string
}

export function JobChat({
    jobId,
    currentUserId,
    proUserId,
    customerUserId,
    title = "Comunicazioni Cantiere",
    subtitle = "Canale diretto tra Cliente, Posatore e Ufficio Operativo",
    className = ""
}: JobChatProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [senders, setSenders] = useState<Record<string, SenderProfile>>({})
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!jobId) return
        fetchMessages()

        // Realtime subscription
        const channel = supabase
            .channel(`job_chat:${jobId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `job_id=eq.${jobId}`
                },
                (payload) => {
                    const newMsg = payload.new as Message
                    setMessages(prev => {
                        if (prev.some(m => m.id === newMsg.id)) return prev
                        return [...prev, newMsg]
                    })
                    fetchSenderProfile(newMsg.sender_id)
                    scrollToBottom()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [jobId])

    const fetchSenderProfile = async (senderId: string) => {
        if (senders[senderId]) return
        try {
            const { data } = await supabase
                .from('users')
                .select('id, first_name, last_name, role')
                .eq('id', senderId)
                .maybeSingle()

            if (data) {
                const name = `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Utente'
                setSenders(prev => ({
                    ...prev,
                    [senderId]: { id: data.id, name, role: data.role }
                }))
            }
        } catch {
            // Silently ignore profile fetch errors
        }
    }

    const fetchMessages = async () => {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('job_id', jobId)
                .order('created_at', { ascending: true })

            if (error) throw error
            const msgs = (data || []) as Message[]
            setMessages(msgs)

            // Fetch profiles for unique senders
            const uniqueSenderIds = Array.from(new Set(msgs.map(m => m.sender_id)))
            if (uniqueSenderIds.length > 0) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('id, first_name, last_name, role')
                    .in('id', uniqueSenderIds)

                if (userData) {
                    const profileMap: Record<string, SenderProfile> = {}
                    userData.forEach((u: any) => {
                        const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Utente'
                        profileMap[u.id] = { id: u.id, name, role: u.role }
                    })
                    setSenders(profileMap)
                }
            }

            scrollToBottom()
        } catch (error) {
            console.error('Error fetching messages:', error)
        } finally {
            setLoading(false)
        }
    }

    const scrollToBottom = () => {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight
            }
        }, 100)
    }

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        const trimmed = newMessage.trim()
        if (!trimmed || sending) return

        setSending(true)
        try {
            const { error } = await supabase
                .from('messages')
                .insert({
                    job_id: jobId,
                    sender_id: currentUserId,
                    content: trimmed
                })

            if (error) throw error
            setNewMessage('')
            scrollToBottom()

            // Salvagente notifica diretta: se il trigger postgres tarda o non è sincronizzato,
            // garantiamo che l'utente destinatario riceva la notifica in tempo reale a video
            const recipientId = currentUserId === proUserId ? customerUserId : proUserId
            if (recipientId) {
                const targetRole = currentUserId === proUserId ? 'customer' : 'professional'
                const mySenderName = senders[currentUserId]?.name || (currentUserId === proUserId ? 'Il Posatore' : 'Il Cliente')

                supabase.from('notifications' as any).insert({
                    user_id: recipientId,
                    target_role: targetRole,
                    title: `Nuovo messaggio da ${mySenderName}`,
                    message: trimmed.slice(0, 120),
                    type: 'message_received',
                    link: targetRole === 'customer' 
                        ? `/dashboard?tab=messages` 
                        : `/pro/jobs/${jobId}#chat-cantiere`,
                    channel: 'both',
                    metadata: { job_id: jobId }
                }).then(({ error: notifErr }) => {
                    if (notifErr) console.warn('Direct notification notice:', notifErr.message)
                })
            }
        } catch (error) {
            console.error('Error sending message:', error)
            alert('Non è stato possibile inviare il messaggio. Verifica i permessi o la connessione.')
        } finally {
            setSending(false)
        }
    }

    const getSenderMeta = (senderId: string) => {
        const isMe = senderId === currentUserId
        const profile = senders[senderId]

        let roleLabel = 'Utente'
        let RoleIcon = User
        let roleBadge = 'bg-stone-100 text-stone-600 border-stone-200'

        if (senderId === proUserId || profile?.role === 'professional') {
            roleLabel = 'Posatore Incaricato'
            RoleIcon = Wrench
            roleBadge = 'bg-purple-50 text-purple-700 border-purple-200/80'
        } else if (senderId === customerUserId || profile?.role === 'customer') {
            roleLabel = 'Cliente'
            RoleIcon = User
            roleBadge = 'bg-blue-50 text-blue-700 border-blue-200/80'
        } else if (profile?.role === 'admin') {
            roleLabel = 'Supporto PosaFacile'
            RoleIcon = ShieldCheck
            roleBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
        }

        const displayName = isMe ? 'Tu' : (profile?.name || roleLabel)

        return { isMe, displayName, roleLabel, RoleIcon, roleBadge }
    }

    return (
        <div className={`flex flex-col bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden ${className}`}>
            {/* Header Chat */}
            <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
                        <MessageSquare size={18} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-sm text-stone-900 truncate">{title}</h3>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                            </span>
                        </div>
                        <p className="text-[11px] text-stone-500 font-medium truncate mt-0.5">{subtitle}</p>
                    </div>
                </div>
            </div>

            {/* Area Messaggi */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 min-h-[260px] max-h-[420px] bg-stone-50/30"
            >
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-stone-400 gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                        <span className="text-xs font-medium">Caricamento conversazione...</span>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mb-3">
                            <MessageSquare size={22} />
                        </div>
                        <p className="font-extrabold text-stone-800 text-sm">Nessun messaggio ancora</p>
                        <p className="text-xs text-stone-500 max-w-xs mt-1 leading-relaxed">
                            Utilizza questo canale protetto per coordinare l'accesso, chiarire dettagli e scambiare comunicazioni sul cantiere.
                        </p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const { isMe, displayName, roleLabel, RoleIcon, roleBadge } = getSenderMeta(msg.sender_id)
                        const timeStr = msg.created_at
                            ? format(new Date(msg.created_at), 'd MMM, HH:mm', { locale: it })
                            : ''

                        return (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                            >
                                {/* Mittente e Ruolo */}
                                <div className={`flex items-center gap-1.5 mb-1 px-1 text-[11px] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <span className="font-bold text-stone-800">{displayName}</span>
                                    {!isMe && (
                                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${roleBadge}`}>
                                            <RoleIcon size={10} /> {roleLabel}
                                        </span>
                                    )}
                                </div>

                                {/* Fumetto Messaggio */}
                                <div
                                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-2xs ${
                                        isMe
                                            ? 'bg-orange-500 text-white rounded-tr-xs'
                                            : 'bg-white text-stone-900 border border-stone-200/80 rounded-tl-xs'
                                    }`}
                                >
                                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                    <p
                                        className={`text-[10px] mt-1 text-right font-medium ${
                                            isMe ? 'text-orange-100' : 'text-stone-400'
                                        }`}
                                    >
                                        {timeStr}
                                    </p>
                                </div>
                            </motion.div>
                        )
                    })
                )}
            </div>

            {/* Input Invio Messaggio */}
            <form onSubmit={sendMessage} className="p-3 bg-white border-t border-stone-100 flex items-center gap-2">
                <input
                    type="text"
                    placeholder="Scrivi un messaggio sul cantiere..."
                    className="flex-1 px-4 py-2.5 bg-stone-50 hover:bg-stone-100/70 focus:bg-white rounded-xl border border-stone-200/80 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/15 text-xs sm:text-sm text-stone-900 transition-all placeholder:text-stone-400"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={sending}
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="p-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center flex-shrink-0"
                    title="Invia messaggio"
                >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
            </form>
        </div>
    )
}

