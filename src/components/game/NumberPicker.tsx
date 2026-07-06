import { motion } from 'framer-motion'
import { useState } from 'react'
import { AnimatedNumber } from '../ui/AnimatedNumber'

interface NumberPickerProps {
  min: number
  max: number
  value: number
  onChange: (value: number) => void
  onSubmit: () => void
  submitted: boolean
  disabled?: boolean
}

export function NumberPicker({
  min,
  max,
  value,
  onChange,
  onSubmit,
  submitted,
  disabled,
}: NumberPickerProps) {
  const [inputValue, setInputValue] = useState(String(value))

  const handleSlider = (v: number) => {
    onChange(v)
    setInputValue(String(v))
  }

  const handleInput = (raw: string) => {
    setInputValue(raw)
    const parsed = parseInt(raw, 10)
    if (!isNaN(parsed)) {
      onChange(Math.min(max, Math.max(min, parsed)))
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <AnimatedNumber
          value={value}
          className="font-mono text-7xl font-medium tracking-tight text-text-primary"
        />
        <p className="text-text-secondary mt-2 text-sm">
          Elegí un número entre {min} y {max}
        </p>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => handleSlider(parseInt(e.target.value, 10))}
        disabled={submitted || disabled}
        className="w-full h-1 rounded-full appearance-none bg-bg-elevated cursor-pointer disabled:opacity-40"
      />

      <Input
        type="number"
        min={min}
        max={max}
        value={inputValue}
        onChange={(e) => handleInput(e.target.value)}
        disabled={submitted || disabled}
        label="O escribí el número"
      />

      {!submitted ? (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onSubmit}
          disabled={disabled}
          className="w-full py-4 rounded-full bg-accent text-accent-foreground font-medium text-lg hover:bg-accent-hover transition-colors disabled:opacity-40"
        >
          Confirmar elección
        </motion.button>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-4 rounded-full bg-bg-elevated text-text-secondary font-medium border border-border-subtle"
        >
          Elección enviada — esperando al resto
        </motion.div>
      )}
    </div>
  )
}

function Input({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block">
      {label && (
        <span className="block text-sm font-medium text-text-secondary mb-2">
          {label}
        </span>
      )}
      <input
        className="w-full px-4 py-3 rounded-lg bg-bg-elevated border border-border-subtle text-text-primary font-mono focus:outline-none focus:ring-1 focus:ring-border-medium focus:border-border-medium"
        {...props}
      />
    </label>
  )
}
