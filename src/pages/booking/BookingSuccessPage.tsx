
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, Home, FileText } from 'lucide-react'

export function BookingSuccessPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
            >
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle size={40} />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">Prenotazione Confermata!</h1>
                <p className="text-gray-500 mb-8">
                    Grazie per aver scelto i nostri servizi. Abbiamo ricevuto il tuo ordine e ti abbiamo inviato un'email di conferma.
                </p>

                <div className="space-y-3">
                    <Link
                        to="/dashboard/orders"
                        className="flex items-center justify-center w-full py-3 px-4 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors"
                    >
                        <FileText size={18} className="mr-2" />
                        Vais ai Miei Ordini
                    </Link>

                    <Link
                        to="/"
                        className="flex items-center justify-center w-full py-3 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                    >
                        <Home size={18} className="mr-2" />
                        Torna alla Home
                    </Link>
                </div>
            </motion.div>
        </div>
    )
}
