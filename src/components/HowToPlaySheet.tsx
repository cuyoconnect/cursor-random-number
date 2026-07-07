import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { Button } from './ui/Button'

const STEPS = [
  {
    title: 'Elegí un número',
    body: 'En cada ronda todos eligen un número al mismo tiempo, sin decirlo.',
  },
  {
    title: 'Si se choca, queda fuera',
    body: 'Si dos o más personas eligen el mismo número, ese número no suma puntos.',
  },
  {
    title: 'Gana el menor único',
    body: 'De los números que nadie más eligió, gana el más bajo.',
  },
] as const

interface HowToPlaySheetProps {
  open: boolean
  onClose: () => void
}

export function HowToPlaySheet({ open, onClose }: HowToPlaySheetProps) {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.button
            type="button"
            aria-label="Cerrar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="how-to-play-title"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="relative z-10 w-full max-w-md mx-auto rounded-t-2xl sm:rounded-2xl border border-border-subtle bg-bg-canvas p-6 safe-bottom shadow-2xl"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border-subtle sm:hidden" />

            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2
                  id="how-to-play-title"
                  className="text-xl font-medium tracking-tight text-text-primary"
                >
                  ¿Cómo se juega?
                </h2>
                <p className="text-sm text-text-secondary mt-1">
                  En 3 pasos.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-text-muted hover:text-text-primary transition-colors p-1 -mr-1 -mt-1"
                aria-label="Cerrar"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <ol className="space-y-4 mb-6">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-bg-elevated border border-border-subtle text-sm font-medium flex items-center justify-center text-text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-text-primary">{step.title}</p>
                    <p className="text-sm text-text-secondary mt-0.5 leading-relaxed">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="rounded-xl border border-border-subtle bg-bg-elevated/60 px-4 py-3 mb-6">
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted mb-1">
                Ejemplo
              </p>
              <p className="text-sm text-text-secondary leading-relaxed">
                Si salen <span className="text-text-primary font-mono">3, 4, 4, 7</span>
                , el <span className="text-text-primary font-medium">4</span> se
                choca y queda fuera. Quedan <span className="font-mono text-text-primary">3</span> y{' '}
                <span className="font-mono text-text-primary">7</span>: gana el{' '}
                <span className="text-text-primary font-medium">3</span>.
              </p>
            </div>

            <Button size="lg" onClick={onClose}>
              Entendido
            </Button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
