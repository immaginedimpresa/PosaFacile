import { Facebook, Instagram, Linkedin, Twitter } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'

export function Footer() {
    return (
        <footer className="bg-stone-950 text-stone-300 py-14 border-t border-stone-800">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div>
                        <div className="mb-4">
                            <Logo variant="light" size="md" />
                        </div>
                        <p className="text-sm text-stone-400 leading-relaxed">
                            La prima piattaforma integrata per la vendita e posa di piastrelle.
                            Qualità garantita, prezzi trasparenti.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-4">Servizi</h4>
                        <ul className="space-y-2 text-sm">
                            <li><a href="#" className="hover:text-white transition-colors">Vendita Piastrelle</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Servizio di Posa</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Visualizzazione AI</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Preventivo Online</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-4">Supporto</h4>
                        <ul className="space-y-2 text-sm">
                            <li><a href="#" className="hover:text-white transition-colors">Contattaci</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Termini e Condizioni</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-4">Social</h4>
                        <div className="flex space-x-4">
                            <a href="#" className="hover:text-white transition-colors"><Facebook size={20} /></a>
                            <a href="#" className="hover:text-white transition-colors"><Instagram size={20} /></a>
                            <a href="#" className="hover:text-white transition-colors"><Twitter size={20} /></a>
                            <a href="#" className="hover:text-white transition-colors"><Linkedin size={20} /></a>
                        </div>
                    </div>
                </div>
                <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
                    <p>&copy; {new Date().getFullYear()} PosaFacile. Tutti i diritti riservati.</p>
                </div>
            </div>
        </footer>
    )
}
