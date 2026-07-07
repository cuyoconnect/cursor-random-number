import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { PageShell } from '../components/layout/PageShell'
import { NumberPicker } from '../components/game/NumberPicker'
import { WaitingForPlayers } from '../components/game/WaitingForPlayers'
import { DistributionChart } from '../components/stats/DistributionChart'
import { Leaderboard, PositionBadge } from '../components/stats/Leaderboard'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import type { GameView } from '../types/game'
import { findRoundPodium, getPlayerName } from '../lib/gameLogic'
import {
  analyzeSession,
  buildHistogramData,
  getDistributionMax,
  getPlayerRank,
  getRoundHistogram,
} from '../lib/strategyAnalysis'

interface GameProps {
  view: GameView
  onSubmitChoice: (number: number) => void
  onCompleteReveal: () => void
  onNextRound: () => void
  presentationMode?: boolean
}

export function Game({
  view,
  onSubmitChoice,
  onCompleteReveal,
  onNextRound,
  presentationMode,
}: GameProps) {
  const { room, players, currentRound, choices, history, isHost, myPlayerId } =
    view
  const [selectedNumber, setSelectedNumber] = useState(
    Math.floor((room.minNum + room.maxNum) / 2),
  )

  const myChoice = choices.find((c) => c.playerId === myPlayerId)
  const hasSubmitted = myChoice?.hasSubmitted ?? false

  const deadline = currentRound?.deadline
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  const analysis = useMemo(
    () => analyzeSession(players, history),
    [players, history],
  )

  const showPositionBadge = history.length > 0

  useEffect(() => {
    if (!deadline || room.phase !== 'selecting') {
      setTimeLeft(null)
      return
    }
    const tick = () => {
      setTimeLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)))
    }
    tick()
    const interval = setInterval(tick, 500)
    return () => clearInterval(interval)
  }, [deadline, room.phase])

  useEffect(() => {
    if (room.phase !== 'revealing' || !isHost) return
    void onCompleteReveal()
  }, [room.phase, isHost, onCompleteReveal])

  const roundChoicesFull = useMemo(() => {
    return choices
      .filter((c) => c.hasSubmitted && c.number !== undefined)
      .map((c) => ({
        playerId: c.playerId,
        number: c.number!,
        roundId: currentRound?.id ?? '',
        submittedAt: 0,
      }))
  }, [choices, currentRound])

  const histogram = getRoundHistogram(roundChoicesFull)
  const histData = buildHistogramData(histogram, room.minNum, room.maxNum)
  const histMax = getDistributionMax(histogram)

  const roundNumbers = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of choices) {
      if (c.hasSubmitted && c.number !== undefined) {
        map[c.playerId] = c.number
      }
    }
    return map
  }, [choices])

  const roundPointsByPlayer = useMemo(() => {
    const { placements } = findRoundPodium(roundChoicesFull)
    const map: Record<string, number> = {}
    for (const choice of roundChoicesFull) {
      map[choice.playerId] = 0
    }
    for (const placement of placements) {
      map[placement.playerId] = placement.points
    }
    return map
  }, [roundChoicesFull])

  const containerClass = presentationMode
    ? 'max-w-3xl mx-auto'
    : 'px-6 py-6 safe-bottom max-w-lg mx-auto'

  const titleClass = presentationMode ? 'text-5xl' : 'text-3xl'

  if (room.phase === 'selecting') {
    return (
      <PageShell presentationMode={presentationMode}>
        {showPositionBadge && !presentationMode && (
          <PositionBadge
            rankings={analysis.rankings}
            players={players}
            playerId={myPlayerId}
          />
        )}
        <div className={containerClass}>
          <div className="text-center mb-8">
            <p className="text-text-secondary text-sm">Ronda</p>
            <h1 className={`${titleClass} font-normal tracking-tight`}>
              {room.currentRound}{' '}
              <span className="text-text-secondary font-normal">
                de {room.totalRounds}
              </span>
            </h1>
            {timeLeft !== null && (
              <div className="mt-4">
                <div className="h-1 bg-bg-elevated rounded-full overflow-hidden max-w-xs mx-auto border border-border-subtle">
                  <motion.div
                    className="h-full bg-text-primary"
                    animate={{ width: `${(timeLeft / 60) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-xs text-text-muted mt-1 font-mono">{timeLeft}s</p>
              </div>
            )}
          </div>

          {!presentationMode &&
            (hasSubmitted ? (
              <WaitingForPlayers
                players={players}
                choices={choices}
                timeLeft={timeLeft}
              />
            ) : (
              <Card className="mb-6 !bg-transparent !border-0 shadow-none">
                <NumberPicker
                  min={room.minNum}
                  max={room.maxNum}
                  value={selectedNumber}
                  onChange={setSelectedNumber}
                  onSubmit={() => onSubmitChoice(selectedNumber)}
                  submitted={hasSubmitted}
                />
              </Card>
            ))}

          {presentationMode && (
            <Card className="mb-6 text-center py-8">
              <p className="text-text-secondary text-lg">
                {players.filter((p) => {
                  const c = choices.find((ch) => ch.playerId === p.id)
                  return c?.hasSubmitted
                }).length}{' '}
                de {players.length} jugadores enviaron su número
              </p>
              {timeLeft !== null && (
                <p className="text-4xl font-mono mt-4">{timeLeft}s</p>
              )}
            </Card>
          )}
        </div>
      </PageShell>
    )
  }

  if (room.phase === 'revealing') {
    return (
      <PageShell presentationMode={presentationMode}>
        <div className={`${containerClass} text-center text-text-secondary py-12`}>
          Calculando resultados...
        </div>
      </PageShell>
    )
  }

  if (room.phase === 'round_summary') {
    const myRank = getPlayerRank(analysis.rankings, myPlayerId)
    const myRanking = analysis.rankings.find((r) => r.playerId === myPlayerId)
    const nextRankAbove =
      myRanking && myRank && myRank > 1
        ? analysis.rankings
            .slice(0, myRank - 1)
            .reverse()
            .find((r) => r.points > myRanking.points)
        : null
    const pointsBehind =
      myRanking && nextRankAbove
        ? nextRankAbove.points - myRanking.points
        : null

    return (
      <PageShell presentationMode={presentationMode}>
        {showPositionBadge && !presentationMode && (
          <PositionBadge
            rankings={analysis.rankings}
            players={players}
            playerId={myPlayerId}
          />
        )}
        <div className={containerClass}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-8"
          >
            <p className="text-text-secondary text-sm mb-1">
              Ronda {room.currentRound}
            </p>
            {myRank === 1 ? (
              <h1 className={`${titleClass} font-normal tracking-tight`}>
                Estás ganando
              </h1>
            ) : nextRankAbove && pointsBehind !== null && pointsBehind > 0 ? (
              <h1 className={`${titleClass} font-normal tracking-tight`}>
                {pointsBehind}{' '}
                {pointsBehind === 1 ? 'punto' : 'puntos'} por debajo de:{' '}
                {getPlayerName(players, nextRankAbove.playerId)}
              </h1>
            ) : (
              <h1 className={`${titleClass} font-normal tracking-tight`}>
                Seguí jugando
              </h1>
            )}
          </motion.div>

          <div className="mb-6">
            <h2 className="font-medium mb-4 text-sm text-text-secondary">
              Distribución de la ronda
            </h2>
            <DistributionChart
              data={histData}
              maxCount={histMax}
              compact
              centered
              groupInterval={5}
              minNum={room.minNum}
              maxNum={room.maxNum}
              playerChoice={choices.find((c) => c.playerId === myPlayerId)?.number}
              showCollisionColors={false}
            />
          </div>

          {!presentationMode && (
            <div className="mb-6">
              <Leaderboard
                rankings={analysis.rankings}
                players={players}
                highlightPlayerId={myPlayerId}
                variant="compact"
                title="Tabla de posiciones"
                roundNumbers={roundNumbers}
                roundPointsByPlayer={roundPointsByPlayer}
              />
            </div>
          )}

          {isHost ? (
            <Button size="lg" onClick={onNextRound}>
              Siguiente ronda
            </Button>
          ) : (
            <p className="text-center text-text-secondary text-sm">
              Esperando siguiente ronda...
            </p>
          )}
        </div>
      </PageShell>
    )
  }

  return null
}
