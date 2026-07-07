import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageShell } from '../components/layout/PageShell'
import { DistributionChart } from '../components/stats/DistributionChart'
import { Leaderboard } from '../components/stats/Leaderboard'
import { RoundTimeline } from '../components/stats/RoundTimeline'
import { StrategyCard } from '../components/stats/StrategyCard'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import type { GameView } from '../types/game'
import {
  analyzeSession,
  buildHistogramData,
  getDistributionMax,
} from '../lib/strategyAnalysis'
import { getPlayerName } from '../lib/gameLogic'
import { setActiveRoomCode } from '../lib/session'

interface SessionStatsProps {
  view: GameView
  onPlayAgain: () => void
  presentationMode?: boolean
  isHost?: boolean
  onTogglePresentation?: () => void
}

export function SessionStats({
  view,
  onPlayAgain,
  presentationMode,
  isHost: isHostProp,
  onTogglePresentation,
}: SessionStatsProps) {
  const navigate = useNavigate()
  const { players, history, room, isHost, myPlayerId } = view

  const analysis = useMemo(
    () => analyzeSession(players, history),
    [players, history],
  )

  const histData = buildHistogramData(
    analysis.distribution,
    room.minNum,
    room.maxNum,
  )
  const histMax = getDistributionMax(analysis.distribution)

  const collisionZone = useMemo(() => {
    const repeated = new Set<number>()
    for (const [num, count] of analysis.distribution) {
      if (count > 1) repeated.add(num)
    }
    return repeated
  }, [analysis.distribution])

  const leave = () => {
    setActiveRoomCode(null)
    navigate('/')
  }

  const containerClass = presentationMode
    ? 'max-w-3xl mx-auto pb-8'
    : 'px-6 py-6 safe-bottom max-w-lg mx-auto pb-32'

  return (
    <PageShell
      presentationMode={presentationMode}
      isHost={isHostProp}
      onTogglePresentation={onTogglePresentation}
    >
      <div className={containerClass}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <p className="text-text-secondary text-sm mb-1">Fin de la sesión</p>
          <h1
            className={`font-normal tracking-[-0.03em] ${
              presentationMode ? 'text-5xl' : 'text-4xl'
            }`}
          >
            Resultados finales
          </h1>
          <p className="text-text-secondary mt-2">
            {history.length} rondas · {players.length} jugadores
          </p>
        </motion.div>

        {!presentationMode && (
          <Card className="mb-6">
            <Leaderboard
              rankings={analysis.rankings}
              players={players}
              highlightPlayerId={myPlayerId}
              variant="full"
              title="Ranking final"
            />
          </Card>
        )}

        {!presentationMode && (
          <>
            <Card className="mb-6">
              <h2 className="font-medium mb-1">Distribución global</h2>
              <p className="text-xs text-text-muted mb-4">
                Claro = elecciones únicas · Tenue = colisiones
              </p>
              <DistributionChart
                data={histData}
                maxCount={histMax}
                highlightNumbers={collisionZone}
              />
            </Card>

            <Card className="mb-6">
              <h2 className="font-medium mb-4">Timeline por jugador</h2>
              <RoundTimeline players={players} history={history} />
            </Card>

            <div className="mb-6 space-y-3">
              <h2 className="font-medium px-1">Estrategias detectadas</h2>
              {analysis.insights.map((insight) => {
                const player = players.find((p) => p.id === insight.playerId)!
                return (
                  <StrategyCard
                    key={insight.playerId}
                    insight={insight}
                    player={player}
                  />
                )
              })}
            </div>

            <Card className="mb-8">
              <h2 className="font-medium mb-4">Colisiones</h2>
              <div className="space-y-2">
                {analysis.rankings.map((rank) => (
                  <div
                    key={rank.playerId}
                    className="flex justify-between text-sm"
                  >
                    <span>{getPlayerName(players, rank.playerId)}</span>
                    <span className="text-text-muted font-medium">
                      {rank.collisions} choques
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {presentationMode && (
          <Card className="mb-6">
            <Leaderboard
              rankings={analysis.rankings}
              players={players}
              variant="podium"
              title="Podio final"
            />
          </Card>
        )}

        <div
          className={
            presentationMode
              ? 'flex gap-3 mt-6'
              : 'fixed bottom-0 left-0 right-0 p-6 bg-bg-chrome/95 border-t border-border-subtle safe-bottom backdrop-blur-sm'
          }
        >
          <div
            className={
              presentationMode
                ? 'flex gap-3 w-full'
                : 'max-w-lg mx-auto space-y-3 w-full'
            }
          >
            {isHost && (
              <Button size="lg" onClick={onPlayAgain} className={presentationMode ? 'flex-1' : ''}>
                Jugar de nuevo
              </Button>
            )}
            <Button
              variant="secondary"
              size="lg"
              onClick={leave}
              className={presentationMode ? 'flex-1' : ''}
            >
              Nueva sala
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
