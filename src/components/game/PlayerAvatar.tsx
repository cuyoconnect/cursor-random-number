import { Facehash } from 'facehash'
import type { Player } from '../../types/game'

/** Paleta default de facehash.dev (pink, amber, blue, orange, emerald) */
const FACEHASH_COLORS = [
  '#ec4899',
  '#f59e0b',
  '#3b82f6',
  '#f97316',
  '#10b981',
] as const

interface PlayerAvatarProps {
  player: Player
  size?: number
  className?: string
  enableBlink?: boolean
}

export function PlayerAvatar({
  player,
  size = 20,
  className = '',
  enableBlink = false,
}: PlayerAvatarProps) {
  return (
    <Facehash
      name={player.id}
      size={size}
      colors={[...FACEHASH_COLORS]}
      variant="gradient"
      intensity3d="dramatic"
      showInitial={false}
      interactive={false}
      enableBlink={enableBlink}
      className={`shrink-0 rounded-lg text-black ${className}`}
    />
  )
}
