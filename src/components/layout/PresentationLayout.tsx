import type { ReactNode } from 'react'
import type { GameView } from '../../types/game'
import { analyzeSession } from '../../lib/strategyAnalysis'
import { Leaderboard } from '../stats/Leaderboard'

interface PresentationLayoutProps {
  view: GameView
  children: ReactNode
}

export function PresentationLayout({
  view,
  children,
}: PresentationLayoutProps) {
  const { players, history } = view
  const analysis = analyzeSession(players, history)

  return (
    <div className="min-h-dvh flex flex-col bg-bg-canvas">
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
