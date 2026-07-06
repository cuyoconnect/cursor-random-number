import NumberFlow, { type Format } from '@number-flow/react'

interface AnimatedNumberProps {
  value: number
  className?: string
  format?: Format
  locales?: string | string[]
}

/**
 * Número animado con efecto blur/slot (mismo stack que kast-wordle).
 * @see NERDCONF/kast-wordle — Countdown, CalledNumbersBoard
 */
export function AnimatedNumber({
  value,
  className = '',
  format,
  locales,
}: AnimatedNumberProps) {
  return (
    <NumberFlow
      value={value}
      locales={locales}
      format={{ useGrouping: false, ...format }}
      className={`inline-flex tabular-nums [--number-flow-mask-height:0.12em] ${className}`}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    />
  )
}
