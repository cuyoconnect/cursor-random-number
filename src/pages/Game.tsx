import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { PageShell } from '../components/layout/PageShell'
import { NumberPicker } from '../components/game/NumberPicker'
import { PlayerChip } from '../components/game/PlayerChip'
import { RevealStage } from '../components/game/RevealStage'
import { DistributionChart } from '../components/stats/DistributionChart'
import {
  Leaderboard,
  PositionBadge,
  RoundPodiumCard,
} from '../components/stats/Leaderboard'
import { Button } from '../components/ui/Button'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { Card } from '../components/ui/Card'
import type { GameView } from '../types/game'
import { findRoundPodium, findWinner, getPlayerName } from '../lib/gameLogic'
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
  isHost?: boolean
  onTogglePresentation?: () => void
}

export function Game({
  view,
  onSubmitChoice,
  onCompleteReveal,
  onNextRound,
  presentationMode,
  isHost: isHostProp,
  onTogglePresentation,
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
  const roundPodium = findRoundPodium(roundChoicesFull)
  const histogram = getRoundHistogram(roundChoicesFull)
  const histData = buildHistogramData(histogram, room.minNum, room.maxNum)
  const histMax = getDistributionMax(histogram)

  const containerClass = presentationMode
    ? 'max-w-3xl mx-auto'
    : 'px-6 py-6 safe-bottom max-w-lg mx-auto'

  const titleClass = presentationMode ? 'text-5xl' : 'text-3xl'

  if (room.phase === 'selecting') {
    return (
      <PageShell
        presentationMode={presentationMode}
        isHost={isHostProp}
        onTogglePresentation={onTogglePresentation}
      >
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

          {!presentationMode && (
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
          )}

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

          <div>
            <h2 className="text-sm font-medium text-text-secondary mb-3">
              Estado del grupo
            </h2>
            <div className="flex flex-wrap gap-2">
              {players.map((player) => {
                const choice = choices.find((c) => c.playerId === player.id)
                const rank = getPlayerRank(analysis.rankings, player.id)
                return (
                  <PlayerChip
                    key={player.id}
                    player={player}
                    status={choice?.hasSubmitted ? 'submitted' : 'waiting'}
                    rank={presentationMode && rank ? rank : undefined}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </PageShell>
    )
  }

  if (room.phase === 'revealing') {
    return (
      <PageShell
        presentationMode={presentationMode}
        isHost={isHostProp}
        onTogglePresentation={onTogglePresentation}
      >
        {showPositionBadge && !presentationMode && (
          <PositionBadge
            rankings={analysis.rankings}
            players={players}
            playerId={myPlayerId}
          />
        )}
        <div className={presentationMode ? '' : 'px-6 py-6 safe-bottom'}>
          <RevealStage
            players={players}
            choices={choices}
            onComplete={onCompleteReveal}
            isHost={isHost}
            large={presentationMode}
          />
        </div>
      </PageShell>
    )
  }

  if (room.phase === 'round_summary') {
    const winnerName = roundResult.winnerId
      ? getPlayerName(players, roundResult.winnerId)
      : null

    return (
      <PageShell
        presentationMode={presentationMode}
        isHost={isHostProp}
        onTogglePresentation={onTogglePresentation}
      >
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
            {winnerName ? (
              <>
                <h1 className={`${titleClass} font-normal tracking-tight mb-1`}>
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
                <h1 className={`${titleClass} font-normal tracking-tight mb-1`}>
                  Sin ganador
                </h1>
                <p className="text-text-secondary">Todos repitieron números</p>
              </>
            )}
          </motion.div>

          <Card className="mb-6">
            <h2 className="font-medium mb-4 text-sm text-text-secondary">
              Podio de la ronda
            </h2>
            <p className="text-xs text-text-muted mb-3">
              1° = 3 pts · 2° = 2 pts · 3° = 1 pt
            </p>
            <RoundPodiumCard
              placements={roundPodium.placements}
              players={players}
              large={presentationMode}
            />
          </Card>

          <Card className="mb-6">
            <h2 className="font-medium mb-4 text-sm text-text-secondary">
              Distribución de la ronda
            </h2>
            <DistributionChart data={histData} maxCount={histMax} compact />
          </Card>

          {!presentationMode && (
            <Card className="mb-6">
              <Leaderboard
                rankings={analysis.rankings}
                players={players}
                highlightPlayerId={myPlayerId}
                variant="compact"
                title="Tabla de posiciones"
              />
            </Card>
          )}

          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {choices
              .filter((c) => c.number !== undefined)
              .map((c) => {
                const player = players.find((p) => p.id === c.playerId)!
                const rank = getPlayerRank(analysis.rankings, c.playerId)
                return (
                  <PlayerChip
                    key={c.playerId}
                    player={player}
                    number={c.number}
                    status={
                      c.playerId === roundResult.winnerId ? 'winner' : undefined
                    }
                    rank={presentationMode && rank ? rank : undefined}
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
      </PageShell>
    )
  }

  return null
}
