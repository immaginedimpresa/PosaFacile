import * as React from "react"
import { cn } from "@/lib/utils"

// Simplified Dialog implementation
interface DialogProps {
    open: boolean
    onOpenChange?: (open: boolean) => void
    children: React.ReactNode
}

export function Dialog({ open, children }: DialogProps) {
    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            {children}
        </div>
    )
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
    onInteractOutside?: (e: Event) => void
    onEscapeKeyDown?: (e: KeyboardEvent) => void
}

export function DialogContent({
    className,
    children,
    onInteractOutside,
    onEscapeKeyDown,
    ...props
}: DialogContentProps) {
    React.useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onEscapeKeyDown?.(e)
            }
        }
        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [onEscapeKeyDown])

    return (
        <div
            className={cn(
                "bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200",
                className
            )}
            onClick={(e) => e.stopPropagation()}
            {...props}
        >
            {children}
        </div>
    )
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("flex flex-col space-y-1.5 text-center sm:text-left p-6 pb-0", className)}
            {...props}
        />
    )
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h2
            className={cn("text-lg font-semibold leading-none tracking-tight", className)}
            {...props}
        />
    )
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
    return (
        <p
            className={cn("text-sm text-muted-foreground", className)}
            {...props}
        />
    )
}
