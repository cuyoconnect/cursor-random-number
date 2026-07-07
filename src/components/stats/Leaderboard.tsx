import { motion } from 'framer-motion'
import type { Player, PlayerRanking } from '../../types/game'
import { getPlayerName } from '../../lib/gameLogic'
import { getPlayerRank } from '../../lib/strategyAnalysis'
import { PlayerAvatar } from '../game/PlayerAvatar'
import { MedalIcon } from '../ui/MedalIcon'

interface LeaderboardProps {
  rankings: PlayerRanking[]
  players: Player[]
  highlightPlayerId?: string
  variant?: 'compact' | 'full' | 'podium'
  title?: string
  roundNumbers?: Record<string, number>
}

function RankingRow({
  rank,
  ranking,
  players,
  highlighted,
  large,
  showMedals = false,
  roundNumber,
}: {
  rank: number
  ranking: PlayerRanking
  players: Player[]
  highlighted: boolean
  large?: boolean
  showMedals?: boolean
  roundNumber?: number
}) {
  const player = players.find((p) => p.id === ranking.playerId)!
  const rankLabel =
    showMedals && rank <= 3 ? (
      <MedalIcon rank={rank as 1 | 2 | 3} size={large ? 'md' : 'sm'} />
    ) : (
      <span
        className={`text-text-muted shrink-0 font-mono ${
          large ? 'w-8 text-base' : 'w-6 text-sm'
        }`}
      >
        #{rank}
      </span>
    )

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.03 }}
      className={`flex items-center justify-between gap-3 py-2 border-b border-border-subtle last:border-0 ${
        highlighted ? 'bg-bg-elevated -mx-2 px-2 rounded-lg' : ''
      } ${large ? 'py-3' : ''}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {rankLabel}
        <PlayerAvatar player={player} size={large ? (rank === 1 ? 36 : 28) : 28} />
        <div className="min-w-0">
          <span
            className={`font-medium truncate block ${
              large && rank === 1 ? 'text-lg' : ''
            }`}
          >
            {getPlayerName(players, ranking.playerId)}
          </span>
        </div>
      </div>
      <span
        className={`font-semibold text-text-primary shrink-0 ${
          large ? 'text-base' : 'text-sm'
        }`}
      >
        {ranking.points} pts
        {roundNumber !== undefined && (
          <span className="text-text-muted ml-1 font-mono font-normal">
            ({roundNumber})
          </span>
        )}
      </span>
    </motion.div>
  )
}

export function Leaderboard({
  rankings,
  players,
  highlightPlayerId,
  variant = 'full',
  title = 'Tabla de posiciones',
  roundNumbers,
}: LeaderboardProps) {
  const large = variant === 'full' || variant === 'podium'
  const topCount = variant === 'compact' || variant === 'podium' ? 3 : rankings.length
  const displayRankings =
    variant === 'full' ? rankings : rankings.slice(0, topCount)

  const highlightRank = highlightPlayerId
    ? getPlayerRank(rankings, highlightPlayerId)
    : null
  const highlightRanking =
    (variant === 'compact' || variant === 'podium') &&
    highlightPlayerId &&
    highlightRank &&
    highlightRank > topCount
      ? rankings.find((r) => r.playerId === highlightPlayerId)
      : variant === 'full' &&
          highlightPlayerId &&
          highlightRank &&
          highlightRank > 5
        ? rankings.find((r) => r.playerId === highlightPlayerId)
        : null

  return (
    <div>
      {variant !== 'compact' && (
        <h2 className={`font-medium mb-4 ${large ? 'text-xl' : ''}`}>{title}</h2>
      )}
      <div
        className={
          variant === 'full'
            ? 'overflow-y-auto max-h-[calc(100vh-280px)] pr-1'
            : ''
        }
      >
        {displayRankings.map((ranking, i) => (
          <RankingRow
            key={ranking.playerId}
            rank={i + 1}
            ranking={ranking}
            players={players}
            highlighted={ranking.playerId === highlightPlayerId}
            large={large}
            showMedals={variant === 'full' || variant === 'podium'}
            roundNumber={roundNumbers?.[ranking.playerId]}
          />
        ))}
        {highlightRanking && highlightRank && (
          <>
            <div className="py-2 text-center text-text-muted text-sm">···</div>
            <RankingRow
              rank={highlightRank}
              ranking={highlightRanking}
              players={players}
              highlighted
              large={large}
              roundNumber={roundNumbers?.[highlightRanking.playerId]}
            />
          </>
        )}
      </div>
    </div>
  )
}

export function PositionBadge({
  rankings,
  players,
  playerId,
}: {
  rankings: PlayerRanking[]
  players: Player[]
  playerId: string
}) {
  const rank = getPlayerRank(rankings, playerId)
  const ranking = rankings.find((r) => r.playerId === playerId)
  if (!rank || !ranking) return null

  return (
    <div className="sticky top-0 z-10 bg-bg-chrome/95 backdrop-blur-sm border-b border-border-subtle px-4 py-2 text-center text-sm">
      <span className="text-text-secondary">Tu posición: </span>
      <span className="font-semibold text-text-primary">
        #{rank} de {players.length}
      </span>
      <span className="text-text-muted mx-2">·</span>
      <span className="font-semibold text-text-primary">{ranking.points} pts</span>
    </div>
  )
}

export function RoundPodiumCard({
  placements,
  players,
  large,
}: {
  placements: { playerId: string; rank: number; points: number; number: number }[]
  players: Player[]
  large?: boolean
}) {
  if (placements.length === 0) {
    return (
      <p className="text-text-secondary text-sm text-center">
        Sin podio — todos repitieron números
      </p>
    )
  }

  return (
    <div>
      {placements.map((p) => (
        <div
          key={p.playerId}
          className={`flex items-center justify-between border-b border-border-subtle last:border-0 ${
            large ? 'py-3' : 'py-2'
          }`}
        >
          <div className="flex items-center gap-3">
            {p.rank <= 3 ? (
              <MedalIcon rank={p.rank as 1 | 2 | 3} size={large ? 'md' : 'sm'} />
            ) : (
              <span
                className={`text-text-muted shrink-0 font-mono ${
                  large ? 'w-8 text-base' : 'w-6 text-sm'
                }`}
              >
                #{p.rank}
              </span>
            )}
            <span className={`font-medium ${large ? 'text-lg' : ''}`}>
              {getPlayerName(players, p.playerId)}
            </span>
          </div>
          <div className={`text-right ${large ? 'text-base' : 'text-sm'}`}>
            <span className="font-semibold text-text-primary">+{p.points} pts</span>
            <span className="text-text-muted ml-2 font-mono">({p.number})</span>
          </div>
        </div>
      ))}
    </div>
  )
}
