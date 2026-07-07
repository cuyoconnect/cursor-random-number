import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageShell } from '../components/layout/PageShell'
import { DistributionChart } from '../components/stats/DistributionChart'
import { Leaderboard } from '../components/stats/Leaderboard'
import { Button } from '../components/ui/Button'
import type { GameView } from '../types/game'
import {
  analyzeSession,
  buildHistogramData,
  getDistributionMax,
  getRoundHistogram,
} from '../lib/strategyAnalysis'
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
  const [selectedRoundIndex, setSelectedRoundIndex] = useState(0)

  const analysis = useMemo(
    () => analyzeSession(players, history),
    [players, history],
  )

  const selectedRound = history[selectedRoundIndex]

  const roundChart = useMemo(() => {
    if (!selectedRound) return null

    const histogram = getRoundHistogram(selectedRound.choices)

    return {
      data: buildHistogramData(histogram, room.minNum, room.maxNum),
      maxCount: getDistributionMax(histogram),
      playerChoice: selectedRound.choices.find((c) => c.playerId === myPlayerId)
        ?.number,
    }
  }, [selectedRound, room.minNum, room.maxNum, myPlayerId])

  const leave = () => {
    setActiveRoomCode(null)
    navigate('/')
  }

  const containerClass = presentationMode
    ? 'max-w-3xl mx-auto pb-8'
    : 'px-6 py-6 safe-bottom max-w-lg mx-auto'

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
          <div className="mb-6">
            <Leaderboard
              rankings={analysis.rankings}
              players={players}
              highlightPlayerId={myPlayerId}
              variant="podium"
              title="Ranking final"
            />
          </div>
        )}

        {!presentationMode && (
          <>
            <div className="mb-6 relative z-10">
              <h2 className="font-medium mb-3">Distribución por ronda</h2>
              {history.length > 0 ? (
                <>
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {history.map((round, index) => (
                      <button
                        key={round.roundId}
                        type="button"
                        onClick={() => setSelectedRoundIndex(index)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          selectedRoundIndex === index
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-bg-elevated text-text-primary border border-border-subtle hover:border-border-medium'
                        }`}
                      >
                        Ronda {round.roundNumber}
                      </button>
                    ))}
                  </div>
                  {roundChart && (
                    <DistributionChart
                      data={roundChart.data}
                      maxCount={roundChart.maxCount}
                      centered
                      groupInterval={5}
                      minNum={room.minNum}
                      maxNum={room.maxNum}
                      playerChoice={roundChart.playerChoice}
                      showCollisionColors={false}
                    />
                  )}
                </>
              ) : (
                <p className="text-text-secondary text-sm text-center py-8">
                  Sin rondas jugadas
                </p>
              )}
            </div>

          </>
        )}

        {presentationMode && (
          <div className="mb-6">
            <Leaderboard
              rankings={analysis.rankings}
              players={players}
              highlightPlayerId={myPlayerId}
              variant="podium"
              title="Ranking final"
            />
          </div>
        )}

        <div
          className={
            presentationMode
              ? 'flex gap-3 mt-6'
              : 'mt-8 space-y-3'
          }
        >
          <div
            className={
              presentationMode ? 'flex gap-3 w-full' : 'space-y-3 w-full'
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
