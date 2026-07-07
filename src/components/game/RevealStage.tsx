import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import type { ChoiceVisibility, Player } from '../../types/game'
import { findWinner, shuffle } from '../../lib/gameLogic'
import { AnimatedNumber } from '../ui/AnimatedNumber'
import { PlayerChip } from './PlayerChip'

interface RevealStageProps {
  players: Player[]
  choices: ChoiceVisibility[]
  onComplete: () => void
  isHost: boolean
  large?: boolean
}

type Phase = 'countdown' | 'reveal' | 'winner'

export function RevealStage({
  players,
  choices,
  onComplete,
  isHost,
  large,
}: RevealStageProps) {
  const [phase, setPhase] = useState<Phase>('countdown')
  const [countdown, setCountdown] = useState(3)
  const [revealedCount, setRevealedCount] = useState(0)

  const revealOrder = useMemo(
    () => shuffle(choices.filter((c) => c.hasSubmitted)),
    [choices],
  )

  const fullChoices = choices
    .filter((c) => c.hasSubmitted && c.number !== undefined)
    .map((c) => ({ playerId: c.playerId, number: c.number!, roundId: '', submittedAt: 0 }))

  const result = findWinner(fullChoices)
  const winnerPlayer = players.find((p) => p.id === result.winnerId)

  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown <= 0) {
      setPhase('reveal')
      return
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 800)
    return () => clearTimeout(t)
  }, [phase, countdown])

  useEffect(() => {
    if (phase !== 'reveal') return
    if (revealedCount >= revealOrder.length) {
      const t = setTimeout(() => setPhase('winner'), 600)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setRevealedCount((c) => c + 1), 450)
    return () => clearTimeout(t)
  }, [phase, revealedCount, revealOrder.length])

  useEffect(() => {
    if (phase !== 'winner') return
    const t = setTimeout(() => {
      if (isHost) onComplete()
    }, 3500)
    return () => clearTimeout(t)
  }, [phase, isHost, onComplete])

  const visibleChoices = revealOrder.slice(0, revealedCount)

  const countdownSize = large ? 'text-9xl' : 'text-8xl'
  const revealWidth = large ? 'max-w-2xl' : 'max-w-md'
  const winnerNumberSize = large ? 'text-8xl' : 'text-6xl'
  const winnerNameSize = large ? 'text-4xl' : 'text-2xl'

  return (
    <div className={`flex flex-col items-center justify-center min-h-[60vh] px-4 ${large ? 'min-h-[70vh]' : ''}`}>
      <AnimatePresence mode="wait">
        {phase === 'countdown' && (
          <motion.div
            initial={{ scale: 1.15, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className={`${countdownSize} font-normal text-text-primary tracking-[-0.03em]`}
          >
            {countdown > 0 ? (
              <AnimatedNumber value={countdown} className={`${countdownSize} font-normal`} />
            ) : (
              '¡'
            )}
          </motion.div>
        )}

        {phase === 'reveal' && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`w-full ${revealWidth} space-y-3`}
          >
            <h2 className={`text-center font-medium mb-6 text-text-secondary ${large ? 'text-3xl' : 'text-xl'}`}>
              Revelando elecciones...
            </h2>
            {visibleChoices.map((choice, i) => {
              const player = players.find((p) => p.id === choice.playerId)!
              const isDuplicate =
                choice.number !== undefined &&
                result.duplicateNumbers.has(choice.number)
              const isUnique =
                choice.number !== undefined &&
                result.uniqueChoices.some(
                  (u) => u.playerId === choice.playerId,
                )
              const isWinner = choice.playerId === result.winnerId

              return (
                <motion.div
                  key={choice.playerId}
                  initial={{ opacity: 0, x: -30, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 25,
                    delay: i * 0.05,
                  }}
                  className={`flex items-center justify-between rounded-lg border ${
                    large ? 'p-5' : 'p-4'
                  } ${
                    isWinner
                      ? 'bg-bg-elevated border-border-medium shadow-[0_0_24px_rgba(247,247,244,0.08)]'
                      : isDuplicate
                        ? 'bg-bg-chrome border-border-subtle opacity-50'
                        : isUnique
                          ? 'bg-bg-chrome border-border-medium'
                          : 'bg-bg-chrome border-border-subtle'
                  }`}
                >
                  <PlayerChip player={player} size="sm" />
                  <motion.div
                    animate={isDuplicate ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ repeat: isDuplicate ? 2 : 0, duration: 0.4 }}
                    className={
                      isDuplicate
                        ? 'text-text-muted line-through'
                        : isWinner
                          ? 'text-text-primary'
                          : 'text-text-secondary'
                    }
                  >
                    {choice.number !== undefined && (
                      <AnimatedNumber
                        value={choice.number}
                        className={`font-medium font-mono ${large ? 'text-4xl' : 'text-2xl'}`}
                      />
                    )}
                  </motion.div>
                </motion.div>
              )
            })}
          </motion.div>
        )}

        {phase === 'winner' && (
          <motion.div
            key="winner"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="text-center space-y-4"
          >
            {winnerPlayer ? (
              <>
                <Confetti />
                <motion.div
                  animate={{ scale: [1, 1.03, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className={`font-normal tracking-[-0.03em] text-text-primary ${winnerNumberSize}`}
                >
                  {result.winningNumber !== null && (
                    <AnimatedNumber
                      value={result.winningNumber}
                      className={`font-normal font-mono ${winnerNumberSize}`}
                    />
                  )}
                </motion.div>
                <p className={`font-medium ${winnerNameSize}`}>
                  ¡{winnerPlayer.nickname} gana!
                </p>
                <p className="text-text-secondary">
                  Menor número único de la ronda
                </p>
              </>
            ) : (
              <>
                <p className="text-4xl text-text-muted">—</p>
                <p className="text-2xl font-medium">Sin ganador</p>
                <p className="text-text-secondary">
                  Todos eligieron números repetidos
                </p>
              </>
            )}
            {!isHost && (
              <p className="text-sm text-text-secondary mt-4">
                Esperando al anfitrión...
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Confetti() {
  const particles = Array.from({ length: 16 }, (_, i) => i)
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {particles.map((i) => (
        <motion.div
          key={i}
          initial={{
            x: '50vw',
            y: '40vh',
            opacity: 1,
            scale: 0,
          }}
          animate={{
            x: `${20 + Math.random() * 60}vw`,
            y: `${10 + Math.random() * 80}vh`,
            opacity: 0,
            scale: 1,
            rotate: Math.random() * 360,
          }}
          transition={{ duration: 1.5 + Math.random(), ease: 'easeOut' }}
          className="absolute w-1.5 h-1.5 rounded-full bg-text-primary"
          style={{ opacity: 0.3 + (i % 3) * 0.15 }}
        />
      ))}
    </div>
  )
}
