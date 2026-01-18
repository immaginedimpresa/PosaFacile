import { motion } from 'framer-motion'
import type { ReactNode } from 'react'


interface MotionProps {
    children: ReactNode
    className?: string
    delay?: number
}

export const FadeIn = ({ children, className, delay = 0 }: MotionProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay, ease: "easeOut" }}
        className={className}
    >
        {children}
    </motion.div>
)

export const SlideUp = ({ children, className, delay = 0 }: MotionProps) => (
    <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
        className={className}
    >
        {children}
    </motion.div>
)

export const ScaleIn = ({ children, className, delay = 0 }: MotionProps) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay }}
        className={className}
    >
        {children}
    </motion.div>
)

export const StaggerContainer = ({ children, className, delay = 0 }: MotionProps) => (
    <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        variants={{
            hidden: {},
            show: {
                transition: {
                    staggerChildren: 0.1,
                    delayChildren: delay,
                },
            },
        }}
        className={className}
    >
        {children}
    </motion.div>
)
