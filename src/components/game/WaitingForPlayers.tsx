import { motion, useReducedMotion } from 'framer-motion'
import { stringHash } from 'facehash'
import { useMemo, useState } from 'react'
import type { ChoiceVisibility, Player } from '../../types/game'
import { PlayerAvatar } from './PlayerAvatar'

interface WaitingForPlayersProps {
  players: Player[]
  choices: ChoiceVisibility[]
  timeLeft?: number | null
}

function randomHorizontal(playerId: string, cycle: number) {
  const hash = stringHash(`${playerId}-${cycle}`)
  return 8 + (hash % 84)
}

function cycleDuration(playerId: string) {
  return 3.8 + (stringHash(`${playerId}-speed`) % 24) / 10
}

function RisingAvatarBubble({
  player,
  startDelay,
  reduceMotion,
}: {
  player: Player
  startDelay: number
  reduceMotion: boolean | null
}) {
  const [cycle, setCycle] = useState(0)
  const left = useMemo(
    () => randomHorizontal(player.id, cycle),
    [player.id, cycle],
  )
  const duration = cycleDuration(player.id)

  if (reduceMotion) {
    return (
      <div
        className="absolute bottom-10 -translate-x-1/2 opacity-70"
        style={{ left: `${randomHorizontal(player.id, 0)}%` }}
      >
        <PlayerAvatar player={player} size={48} />
      </div>
    )
  }

  return (
    <motion.div
      key={cycle}
      className="absolute bottom-6 -translate-x-1/2 will-change-transform"
      style={{ left: `${left}%` }}
      initial={{ opacity: 0, y: 0, scale: 0.92 }}
      animate={{
        opacity: [0, 0.85, 0.85, 0],
        y: [0, -300],
        scale: [0.92, 1, 1, 0.96],
      }}
      transition={{
        duration,
        delay: cycle === 0 ? startDelay : 0,
        times: [0, 0.18, 0.72, 1],
        ease: 'easeOut',
      }}
      onAnimationComplete={() => setCycle((c) => c + 1)}
    >
      <PlayerAvatar player={player} size={48} enableBlink />
    </motion.div>
  )
}

export function WaitingForPlayers({
  players,
  choices,
  timeLeft,
}: WaitingForPlayersProps) {
  const reduceMotion = useReducedMotion()
  const submittedCount = players.filter((p) =>
    choices.find((c) => c.playerId === p.id)?.hasSubmitted,
  ).length
  const pendingPlayers = players.filter(
    (p) => !choices.find((c) => c.playerId === p.id)?.hasSubmitted,
  )

  return (
    <div className="relative min-h-[360px] overflow-hidden rounded-xl">
      <div className="absolute inset-0 pointer-events-none">
        {pendingPlayers.map((player, index) => (
          <RisingAvatarBubble
            key={player.id}
            player={player}
            startDelay={index * 0.55}
            reduceMotion={reduceMotion}
          />
        ))}
      </div>

      <div className="absolute inset-0 z-10 flex items-center justify-center px-6 pointer-events-none">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-text-secondary text-center"
        >
          {pendingPlayers.length > 0 ? 'Esperando al resto' : 'Casi listos'}
          {' · '}
          {submittedCount}/{players.length}
          {timeLeft !== null && timeLeft !== undefined && ` · ${timeLeft}s`}
        </motion.p>
      </div>
    </div>
  )
}
