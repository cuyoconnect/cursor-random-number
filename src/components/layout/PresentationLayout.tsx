import type { ReactNode } from 'react'
import type { GameView } from '../../types/game'
import { analyzeSession } from '../../lib/strategyAnalysis'
import { Leaderboard } from '../stats/Leaderboard'

interface PresentationLayoutProps {
  view: GameView
  children: ReactNode
  onExitPresentation: () => void
}

export function PresentationLayout({
  view,
  children,
  onExitPresentation,
}: PresentationLayoutProps) {
  const { players, history } = view
  const analysis = analyzeSession(players, history)

  return (
    <div className="min-h-dvh flex flex-col bg-bg-canvas">
      <header className="px-6 py-4 flex items-center justify-between border-b border-border-subtle">
        <div className="flex items-center gap-4">
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
          <span className="text-xs font-medium text-accent bg-accent/10 px-3 py-1 rounded-full">
            Modo presentación
          </span>
        </div>
        <button
          type="button"
          onClick={onExitPresentation}
          className="text-sm text-text-secondary hover:text-text-primary transition-colors px-3 py-1.5 rounded-lg border border-border-subtle hover:bg-bg-elevated"
        >
          Salir de presentación
        </button>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-0">
        <main className="overflow-y-auto p-6 lg:p-8">{children}</main>
        <aside className="border-t lg:border-t-0 lg:border-l border-border-subtle bg-bg-elevated/50 p-6 lg:p-8">
          <Leaderboard
            rankings={analysis.rankings}
            players={players}
            variant="full"
            title="Tabla de posiciones"
          />
        </aside>
      </div>
    </div>
  )
}
