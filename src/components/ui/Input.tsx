import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <label className="block w-full">
      {label && (
        <span className="block text-sm font-medium text-text-secondary mb-2">
          {label}
        </span>
      )}
      <input
        className={`w-full px-4 py-3 rounded-lg bg-bg-elevated border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-border-medium focus:border-border-medium transition-all ${className}`}
        {...props}
      />
    </label>
  )
}
