import type { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
  showHeader?: boolean
}

export function Layout({ children, showHeader = true }: LayoutProps) {
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
          <span className="text-xs font-medium tracking-wide uppercase text-text-primary bg-bg-elevated px-3 py-1 rounded-full border border-border-subtle">
            Meetup · Mendoza
          </span>
        </header>
      )}
      <main className="flex-1">{children}</main>
    </div>
  )
}
