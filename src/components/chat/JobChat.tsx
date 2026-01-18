import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Send, MessageSquare } from 'lucide-react'
import { motion } from 'framer-motion'

interface Message {
    id: string
    sender_id: string
    content: string
    created_at: string
}

interface JobChatProps {
    jobId: string
    currentUserId: string
    title?: string
}

export function JobChat({ jobId, currentUserId, title = "Comunicazioni" }: JobChatProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetchMessages()

        // Subscribe to new messages
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
                    setMessages(prev => [...prev, newMsg])
                    scrollToBottom()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [jobId])

    const fetchMessages = async () => {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('job_id', jobId)
                .order('created_at', { ascending: true })

            if (error) throw error
            setMessages((data || []) as any)
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
        if (!newMessage.trim()) return

        try {
            const { error } = await supabase
                .from('messages')
                .insert({
                    job_id: jobId,
                    sender_id: currentUserId,
                    content: newMessage.trim()
                })

            if (error) throw error
            setNewMessage('')
            // Optimistic update is risky with RLS if not careful, sticking to subscription or explicit state update
            // We rely on subscription for now, but to be snappy we can append pending
        } catch (error) {
            console.error('Error sending message:', error)
            alert('Errore invio messaggio')
        }
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
            <div className="p-4 border-b border-gray-200 bg-white flex items-center gap-2">
                <MessageSquare size={18} className="text-orange-500" />
                <h3 className="font-semibold text-gray-900">{title}</h3>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[500px]"
            >
                {loading ? (
                    <div className="text-center text-gray-400 py-8">Caricamento messaggi...</div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-gray-400 py-8 text-sm">
                        Nessun messaggio. Scrivi qualcosa per iniziare la conversazione.
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender_id === currentUserId
                        return (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${isMe
                                        ? 'bg-orange-500 text-white rounded-br-none'
                                        : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                                        }`}
                                >
                                    {msg.content}
                                    <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-orange-100' : 'text-gray-400'}`}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })
                )}
            </div>

            <form onSubmit={sendMessage} className="p-2 bg-white border-t border-gray-200 flex gap-2">
                <input
                    type="text"
                    placeholder="Scrivi un messaggio..."
                    className="flex-1 px-4 py-2 bg-gray-50 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                />
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="p-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 disabled:opacity-50"
                >
                    <Send size={18} />
                </motion.button>
            </form>
        </div>
    )
}
