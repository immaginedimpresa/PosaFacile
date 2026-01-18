import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

// Note: I'm not installing class-variance-authority yet, I'll use a simpler approach first 
// to avoid extra deps if possible, or I'll just use standard tailwind. 
// Actually, standard tailwind is cleaner for now without cva if I don't want to install it.
// Let's check if I want to install cva. It's very useful. 
// For now I'll stick to manual clsx to be fast and dependency-light unless I feel mapped variants are needed.
// Actually, I'll just install cva, it's tiny.

// Wait, I can't interactively decide to install cva in the middle of writing file. 
// I'll write a version without CVA for now to be safe, or just run the install command now.
// I'll run the install command with the other UI components.
// I'll defer writing this file until I install CVA.
// WRONG. I should just write a simple component.

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary'
    size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'default', size = 'default', ...props }, ref) => {
        const variants = {
            default: 'bg-primary text-primary-foreground hover:bg-primary/90',
            destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
            outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
            secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
            ghost: 'hover:bg-accent hover:text-accent-foreground',
            link: 'text-primary underline-offset-4 hover:underline',
        }

        const sizes = {
            default: 'h-10 px-4 py-2',
            sm: 'h-9 rounded-md px-3',
            lg: 'h-11 rounded-md px-8',
            icon: 'h-10 w-10',
        }

        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            />
        )
    }
)
Button.displayName = 'Button'

export { Button }
