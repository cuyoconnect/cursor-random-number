import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { DistributionChart } from '../components/stats/DistributionChart'
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
}

export function SessionStats({ view, onPlayAgain }: SessionStatsProps) {
  const navigate = useNavigate()
  const { players, history, room, isHost } = view

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

  return (
    <Layout>
      <div className="px-6 py-6 safe-bottom max-w-lg mx-auto pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <p className="text-text-secondary text-sm mb-1">Fin de la sesión</p>
          <h1 className="text-4xl font-normal tracking-[-0.03em]">Estadísticas</h1>
          <p className="text-text-secondary mt-2">
            {history.length} rondas · {players.length} jugadores
          </p>
        </motion.div>

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

        <Card className="mb-6">
          <h2 className="font-medium mb-4">Ranking</h2>
          <div className="space-y-3">
            {analysis.rankings.map((rank, i) => (
              <motion.div
                key={rank.playerId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-text-muted w-6 text-sm font-mono">
                    #{i + 1}
                  </span>
                  <span className="font-medium">
                    {getPlayerName(players, rank.playerId)}
                  </span>
                </div>
                <div className="flex gap-4 text-sm text-text-secondary">
                  <span>{rank.wins} victorias</span>
                  <span>{rank.uniquePicks} únicos</span>
                  <span className="font-semibold text-text-primary">
                    {rank.score} pts
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>

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

        <div className="fixed bottom-0 left-0 right-0 p-6 bg-bg-chrome/95 border-t border-border-subtle safe-bottom backdrop-blur-sm">
          <div className="max-w-lg mx-auto space-y-3">
            {isHost && (
              <Button size="lg" onClick={onPlayAgain}>
                Jugar de nuevo
              </Button>
            )}
            <Button variant="secondary" size="lg" onClick={leave}>
              Nueva sala
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
