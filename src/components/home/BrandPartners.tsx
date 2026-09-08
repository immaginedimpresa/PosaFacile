export function BrandPartners() {
    const brands = [
        { name: 'Marazzi', subtitle: 'Ceramiche Italiane' },
        { name: 'Florim', subtitle: 'Design Spaces' },
        { name: 'Atlas Concorde', subtitle: 'Luxury Surfaces' },
        { name: 'Mapei', subtitle: 'Adesivi e Sigillanti' },
        { name: 'Kerakoll', subtitle: 'Green Building' },
        { name: 'Fap Ceramiche', subtitle: 'Made in Italy' },
        { name: 'RagNo', subtitle: 'Ceramica 1949' },
        { name: 'Bisazza', subtitle: 'Mosaico d\'Autore' },
    ]

    return (
        <section className="border-y border-stone-200/80 bg-stone-50/70 py-8 overflow-hidden">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
                <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
                    <div className="flex-shrink-0 text-center md:text-left">
                        <span className="text-xs font-bold uppercase tracking-widest text-orange-600 block">
                            Partner Ufficiali
                        </span>
                        <p className="text-sm font-semibold text-stone-800">
                            I migliori marchi di piastrelle e colle per una posa perfetta
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 md:justify-end opacity-75 hover:opacity-100 transition-opacity">
                        {brands.map((b) => (
                            <div
                                key={b.name}
                                className="group flex flex-col items-center px-2 transition-transform duration-300 hover:scale-105"
                            >
                                <span className="font-display text-lg font-extrabold tracking-tight text-stone-800 group-hover:text-orange-600 transition-colors">
                                    {b.name}
                                </span>
                                <span className="text-[10px] uppercase tracking-wider text-stone-600">
                                    {b.subtitle}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
