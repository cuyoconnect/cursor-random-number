import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  className?: string
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

const variants = {
  primary:
    'bg-accent text-accent-foreground hover:bg-accent-hover',
  secondary:
    'bg-transparent text-text-primary border border-border-medium hover:border-text-secondary hover:bg-bg-elevated',
  ghost: 'text-text-secondary hover:text-text-primary hover:bg-accent-muted',
}

const sizes = {
  sm: 'px-4 py-2 text-sm rounded-full',
  md: 'px-6 py-3 text-base rounded-full',
  lg: 'px-8 py-4 text-lg rounded-full w-full',
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  onClick,
  type = 'button',
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      whileHover={{ scale: disabled ? 1 : 1.01 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </motion.button>
  )
}
