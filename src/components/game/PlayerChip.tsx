import { motion } from 'framer-motion'
import type { Player } from '../../types/game'
import { AnimatedNumber } from '../ui/AnimatedNumber'
import { PlayerAvatar } from './PlayerAvatar'

interface PlayerChipProps {
  player: Player
  status?: 'waiting' | 'submitted' | 'winner'
  number?: number
  size?: 'sm' | 'md'
  rank?: number
  presentationMode?: boolean
}

export function PlayerChip({
  player,
  status = 'waiting',
  number,
  size = 'md',
  rank,
  presentationMode = false,
}: PlayerChipProps) {
  const sizeClasses = size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-base'
  const avatarSize = presentationMode ? 40 : size === 'sm' ? 24 : 28

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-2 rounded-lg bg-bg-elevated border border-border-subtle ${sizeClasses}`}
    >
      <PlayerAvatar player={player} size={avatarSize} />
      {rank !== undefined && (
        <span className="text-text-muted text-xs font-mono">#{rank}</span>
      )}
      <span className="font-medium">{player.nickname}</span>
      {status === 'submitted' && (
        <span className="text-text-secondary text-sm">✓</span>
      )}
      {status === 'winner' && (
        <span className="text-text-primary text-sm">★</span>
      )}
      {number !== undefined && (
        <AnimatedNumber
          value={number}
          className="font-mono font-medium ml-1 text-sm text-text-primary"
        />
      )}
    </motion.div>
  )
}
