import type { ReactNode } from 'react'
import { Layout } from './Layout'

interface PageShellProps {
  children: ReactNode
  presentationMode?: boolean
  isHost?: boolean
  onTogglePresentation?: () => void
}

export function PageShell({
  children,
  presentationMode,
  isHost,
  onTogglePresentation,
}: PageShellProps) {
  if (presentationMode) {
    return <>{children}</>
  }

  return (
    <Layout showHeader={false} isHost={isHost} onTogglePresentation={onTogglePresentation}>
      {isHost && onTogglePresentation && (
        <button
          type="button"
          onClick={onTogglePresentation}
          className="fixed top-4 right-4 z-50 text-xs font-medium text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-full border border-border-subtle bg-bg-canvas/90 backdrop-blur-sm hover:bg-bg-elevated transition-colors"
        >
          Modo presentación
        </button>
      )}
      {children}
    </Layout>
  )
}
