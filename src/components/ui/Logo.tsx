import React from 'react'

interface LogoIconProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string
    className?: string
}

/**
 * Icona Flat a 1 Colore (Staggered Floor Tiles / Posa a Correre)
 * Icona vettoriale minimalista monocromatica che rappresenta la posa perfetta delle piastrelle.
 * Utilizza fill="currentColor" per adattarsi a qualsiasi colore di sfondo o testo.
 */
export function LogoIcon({ size = 24, className = '', ...props }: LogoIconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-hidden="true"
            {...props}
        >
            {/* Fila Superiore: Piastrella lunga a sinistra + Piastrella corta a destra */}
            <rect x="2.5" y="2.5" width="12" height="8.5" rx="2" />
            <rect x="16.5" y="2.5" width="5" height="8.5" rx="2" />

            {/* Fila Inferiore: Piastrella corta a sinistra + Piastrella lunga a destra */}
            <rect x="2.5" y="13" width="5" height="8.5" rx="2" />
            <rect x="9.5" y="13" width="12" height="8.5" rx="2" />
        </svg>
    )
}

interface LogoProps {
    variant?: 'default' | 'light' | 'dark' | 'orange' | 'monochrome'
    size?: 'sm' | 'md' | 'lg'
    showIconBadge?: boolean
    iconOnly?: boolean
    badgeText?: string
    className?: string
}

/**
 * Componente Logo completo di PosaFacile con i nuovi colori del brand:
 * - Grigio grafite profondo / Bianco per "Posa"
 * - Arancio terracotta vibrante (#f97316) per "Facile"
 * - Icona flat a 1 colore
 */
export function Logo({
    variant = 'default',
    size = 'md',
    showIconBadge = true,
    iconOnly = false,
    badgeText,
    className = '',
}: LogoProps) {
    // Dimensioni in base al parametro size
    const sizeConfig = {
        sm: {
            iconSize: 18,
            badgeSize: 'h-8 w-8',
            textSize: 'text-lg',
            badgeRadius: 'rounded-lg',
        },
        md: {
            iconSize: 22,
            badgeSize: 'h-9 w-9',
            textSize: 'text-xl',
            badgeRadius: 'rounded-xl',
        },
        lg: {
            iconSize: 26,
            badgeSize: 'h-11 w-11',
            textSize: 'text-2xl',
            badgeRadius: 'rounded-2xl',
        },
    }[size]

    // Colori testo
    const posaColor = variant === 'light' ? 'text-white' : variant === 'monochrome' ? 'text-current' : 'text-stone-900'
    const facileColor = variant === 'light' ? 'text-orange-400' : variant === 'monochrome' ? 'text-current' : 'text-orange-500'

    // Stile badge icona
    const badgeStyle = {
        default: 'bg-orange-500 text-white shadow-md shadow-orange-500/20 group-hover:bg-orange-600',
        light: 'bg-white/10 text-orange-400 border border-white/20 group-hover:bg-white/20',
        dark: 'bg-stone-900 text-orange-400 border border-stone-800 group-hover:border-stone-700',
        orange: 'bg-orange-500 text-white shadow-lg shadow-orange-500/25',
        monochrome: 'bg-current text-background',
    }[variant]

    return (
        <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
            {showIconBadge ? (
                <div
                    className={`${sizeConfig.badgeSize} ${sizeConfig.badgeRadius} ${badgeStyle} flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:scale-105`}
                >
                    <LogoIcon size={sizeConfig.iconSize} />
                </div>
            ) : (
                <LogoIcon
                    size={sizeConfig.iconSize + 2}
                    className={`${facileColor} flex-shrink-0 transition-transform duration-200 group-hover:scale-105`}
                />
            )}

            {!iconOnly && (
                <div className="flex items-center gap-1.5 leading-none">
                    <span className={`font-display font-extrabold tracking-tight ${sizeConfig.textSize} ${posaColor}`}>
                        Posa<span className={facileColor}>Facile</span>
                    </span>
                    {badgeText && (
                        <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-700 border border-stone-200">
                            {badgeText}
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}
