import { motion } from 'framer-motion'
import type { StrategyInsight } from '../../types/game'
import type { Player } from '../../types/game'
import { PlayerAvatar } from '../game/PlayerAvatar'

interface StrategyCardProps {
  insight: StrategyInsight
  player: Player
}

const TYPE_ICONS: Record<string, string> = {
  converger: '📉',
  ancla: '⚓',
  contrarian: '🔄',
  meta_gamer: '🧠',
  caotico: '🎲',
  equilibrado: '⚖️',
}

export function StrategyCard({ insight, player }: StrategyCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="panel rounded-xl p-5"
    >
      <div className="flex items-start gap-3">
        <span
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 bg-bg-elevated border border-border-subtle"
        >
          {TYPE_ICONS[insight.type] ?? '🎯'}
        </span>
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <PlayerAvatar player={player} size={28} />
            <span className="font-medium">{player.nickname}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-bg-elevated text-text-secondary font-medium border border-border-subtle">
              {insight.label}
            </span>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">
            {insight.description}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
