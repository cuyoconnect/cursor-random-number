import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { NumberPicker } from '../components/game/NumberPicker'
import { PlayerChip } from '../components/game/PlayerChip'
import { RevealStage } from '../components/game/RevealStage'
import { DistributionChart } from '../components/stats/DistributionChart'
import { Button } from '../components/ui/Button'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { Card } from '../components/ui/Card'
import type { GameView } from '../types/game'
import { findWinner, getPlayerName } from '../lib/gameLogic'
import { buildHistogramData, getDistributionMax, getRoundHistogram } from '../lib/strategyAnalysis'

interface GameProps {
  view: GameView
  onSubmitChoice: (number: number) => void
  onCompleteReveal: () => void
  onNextRound: () => void
}

export function Game({
  view,
  onSubmitChoice,
  onCompleteReveal,
  onNextRound,
}: GameProps) {
  const { room, players, currentRound, choices, isHost } = view
  const [selectedNumber, setSelectedNumber] = useState(
    Math.floor((room.minNum + room.maxNum) / 2),
  )

  const myChoice = choices.find((c) => c.playerId === view.myPlayerId)
  const hasSubmitted = myChoice?.hasSubmitted ?? false

  const deadline = currentRound?.deadline
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

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

  const roundResult = findWinner(roundChoicesFull)
  const histogram = getRoundHistogram(roundChoicesFull)
  const histData = buildHistogramData(histogram, room.minNum, room.maxNum)
  const histMax = getDistributionMax(histogram)

  if (room.phase === 'selecting') {
    return (
      <Layout>
        <div className="px-6 py-6 safe-bottom max-w-lg mx-auto">
          <div className="text-center mb-8">
            <p className="text-text-secondary text-sm">Ronda</p>
            <h1 className="text-3xl font-normal tracking-tight">
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

          <Card className="mb-6">
            <NumberPicker
              min={room.minNum}
              max={room.maxNum}
              value={selectedNumber}
              onChange={setSelectedNumber}
              onSubmit={() => onSubmitChoice(selectedNumber)}
              submitted={hasSubmitted}
            />
          </Card>

          <div>
            <h2 className="text-sm font-medium text-text-secondary mb-3">
              Estado del grupo
            </h2>
            <div className="flex flex-wrap gap-2">
              {players.map((player) => {
                const choice = choices.find((c) => c.playerId === player.id)
                return (
                  <PlayerChip
                    key={player.id}
                    player={player}
                    status={choice?.hasSubmitted ? 'submitted' : 'waiting'}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (room.phase === 'revealing') {
    return (
      <Layout>
        <div className="px-6 py-6 safe-bottom">
          <RevealStage
            players={players}
            choices={choices}
            onComplete={onCompleteReveal}
            isHost={isHost}
          />
        </div>
      </Layout>
    )
  }

  if (room.phase === 'round_summary') {
    const winnerName = roundResult.winnerId
      ? getPlayerName(players, roundResult.winnerId)
      : null

    return (
      <Layout>
        <div className="px-6 py-6 safe-bottom max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-8"
          >
            <p className="text-text-secondary text-sm mb-1">
              Ronda {room.currentRound}
            </p>
            {winnerName ? (
              <>
                <h1 className="text-3xl font-normal tracking-tight mb-1">
                  Ganó {winnerName}
                </h1>
                <p className="text-text-secondary">
                  con el número{' '}
                  {roundResult.winningNumber !== null && (
                    <AnimatedNumber
                      value={roundResult.winningNumber}
                      className="text-text-primary font-medium text-xl font-mono"
                    />
                  )}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-normal tracking-tight mb-1">Sin ganador</h1>
                <p className="text-text-secondary">
                  Todos repitieron números
                </p>
              </>
            )}
          </motion.div>

          <Card className="mb-6">
            <h2 className="font-medium mb-4 text-sm text-text-secondary">
              Distribución de la ronda
            </h2>
            <DistributionChart
              data={histData}
              maxCount={histMax}
              compact
            />
          </Card>

          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {choices
              .filter((c) => c.number !== undefined)
              .map((c) => {
                const player = players.find((p) => p.id === c.playerId)!
                return (
                  <PlayerChip
                    key={c.playerId}
                    player={player}
                    number={c.number}
                    status={
                      c.playerId === roundResult.winnerId ? 'winner' : undefined
                    }
                  />
                )
              })}
          </div>

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
      </Layout>
    )
  }

  return null
}
