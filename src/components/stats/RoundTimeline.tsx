import { motion } from 'framer-motion'
import type { Player, RoundResult } from '../../types/game'
import { getPlayerOutcome } from '../../lib/gameLogic'
import { PlayerAvatar } from '../game/PlayerAvatar'

interface RoundTimelineProps {
  players: Player[]
  history: RoundResult[]
}

const OUTCOME_COLORS = {
  won: '#f7f7f4',
  unique: 'rgba(247, 247, 244, 0.55)',
  duplicate: 'rgba(247, 247, 244, 0.25)',
}

export function RoundTimeline({ players, history }: RoundTimelineProps) {
  if (history.length === 0) return null

  return (
    <div className="space-y-4 overflow-x-auto">
      {players.map((player) => (
        <div key={player.id} className="min-w-[280px]">
          <div className="flex items-center gap-2 mb-2">
            <PlayerAvatar player={player} size={28} />
            <span className="text-sm font-medium">{player.nickname}</span>
          </div>
          <div className="flex items-center gap-3 pl-4">
            {history.map((round, i) => {
              const choice = round.choices.find((c) => c.playerId === player.id)
              const outcome = choice
                ? getPlayerOutcome(player.id, round.choices)
                : 'duplicate'

              return (
                <motion.div
                  key={round.roundId}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium font-mono border border-border-subtle"
                    style={{
                      backgroundColor: OUTCOME_COLORS[outcome],
                      color: outcome === 'won' ? '#26251e' : '#f7f7f4',
                    }}
                  >
                    {choice?.number ?? '—'}
                  </div>
                  <span className="text-[10px] text-text-muted">
                    R{round.roundNumber}
                  </span>
                </motion.div>
              )
            })}
          </div>
        </div>
      ))}

      <div className="flex gap-4 text-xs text-text-muted pt-2">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-text-primary" /> Ganó
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-text-secondary" /> Único
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-text-muted" /> Duplicado
        </span>
      </div>
    </div>
  )
}
