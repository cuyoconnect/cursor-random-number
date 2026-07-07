import type { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
  showHeader?: boolean
  isHost?: boolean
  onTogglePresentation?: () => void
}

export function Layout({
  children,
  showHeader = true,
  isHost,
  onTogglePresentation,
}: LayoutProps) {
  return (
    <div className="min-h-dvh flex flex-col">
      {showHeader && (
        <header className="px-6 pt-6 pb-2 flex items-center justify-between max-w-lg mx-auto w-full">
          <a
            href="https://cursor.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-secondary hover:text-text-primary text-sm font-medium transition-colors"
          >
            cursor.com
          </a>
          {isHost && onTogglePresentation && (
            <button
              type="button"
              onClick={onTogglePresentation}
              className="text-xs font-medium text-text-secondary hover:text-text-primary px-3 py-1 rounded-full border border-border-subtle hover:bg-bg-elevated transition-colors"
            >
              Modo presentación
            </button>
          )}
        </header>
      )}
      <main className="flex-1">{children}</main>
    </div>
  )
}
