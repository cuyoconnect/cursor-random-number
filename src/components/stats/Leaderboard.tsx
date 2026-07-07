import { motion } from 'framer-motion'
import type { Player, PlayerRanking } from '../../types/game'
import { getPlayerName } from '../../lib/gameLogic'
import { getPlayerRank } from '../../lib/strategyAnalysis'

interface LeaderboardProps {
  rankings: PlayerRanking[]
  players: Player[]
  highlightPlayerId?: string
  variant?: 'compact' | 'full' | 'podium'
  title?: string
}

const MEDALS = ['🥇', '🥈', '🥉'] as const

function RankingRow({
  rank,
  ranking,
  players,
  highlighted,
  large,
}: {
  rank: number
  ranking: PlayerRanking
  players: Player[]
  highlighted: boolean
  large?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.03 }}
      className={`flex items-center justify-between py-2 border-b border-border-subtle last:border-0 ${
        highlighted ? 'bg-bg-elevated -mx-2 px-2 rounded-lg' : ''
      } ${large ? 'py-3' : ''}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={`text-text-muted shrink-0 font-mono ${
            large ? 'w-8 text-base' : 'w-6 text-sm'
          }`}
        >
          #{rank}
        </span>
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{
            backgroundColor:
              players.find((p) => p.id === ranking.playerId)?.color ?? '#888',
          }}
        />
        <span className={`font-medium truncate ${large ? 'text-lg' : ''}`}>
          {getPlayerName(players, ranking.playerId)}
        </span>
      </div>
      <div className={`flex gap-3 shrink-0 ${large ? 'text-base' : 'text-sm'} text-text-secondary`}>
        {ranking.wins > 0 && (
          <span className="hidden sm:inline">{ranking.wins} victorias</span>
        )}
        <span className="font-semibold text-text-primary">
          {ranking.points} pts
        </span>
      </div>
    </motion.div>
  )
}

function PodiumHeader({
  rankings,
  players,
  large,
}: {
  rankings: PlayerRanking[]
  players: Player[]
  large?: boolean
}) {
  const top3 = rankings.slice(0, 3)
  if (top3.length === 0) return null

  return (
    <div className={`grid grid-cols-3 gap-3 mb-4 ${large ? 'gap-4 mb-6' : ''}`}>
      {[1, 0, 2].map((idx) => {
        const ranking = top3[idx]
        if (!ranking) {
          return <div key={idx} />
        }
        const rank = idx + 1
        const isFirst = rank === 1
        return (
          <motion.div
            key={ranking.playerId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: rank * 0.1 }}
            className={`text-center rounded-xl border border-border-subtle bg-bg-elevated ${
              isFirst ? 'order-2 -mt-2' : rank === 2 ? 'order-1 mt-4' : 'order-3 mt-4'
            } ${large ? 'p-5' : 'p-3'}`}
          >
            <span className={large ? 'text-3xl' : 'text-2xl'}>
              {MEDALS[rank - 1]}
            </span>
            <p className={`font-medium mt-1 truncate ${large ? 'text-lg' : 'text-sm'}`}>
              {getPlayerName(players, ranking.playerId)}
            </p>
            <p className={`text-text-primary font-semibold ${large ? 'text-xl' : ''}`}>
              {ranking.points} pts
            </p>
          </motion.div>
        )
      })}
    </div>
  )
}

export function Leaderboard({
  rankings,
  players,
  highlightPlayerId,
  variant = 'full',
  title = 'Tabla de posiciones',
}: LeaderboardProps) {
  const large = variant === 'full'

  if (variant === 'podium') {
    return (
      <div>
        <h2 className={`font-medium mb-4 ${large ? 'text-xl' : ''}`}>{title}</h2>
        <PodiumHeader rankings={rankings} players={players} large={large} />
      </div>
    )
  }

  const displayRankings =
    variant === 'compact' ? rankings.slice(0, 5) : rankings

  const highlightRank = highlightPlayerId
    ? getPlayerRank(rankings, highlightPlayerId)
    : null
  const highlightRanking =
    highlightPlayerId && highlightRank && highlightRank > 5
      ? rankings.find((r) => r.playerId === highlightPlayerId)
      : null

  return (
    <div>
      {variant !== 'compact' && (
        <h2 className={`font-medium mb-4 ${large ? 'text-xl' : ''}`}>{title}</h2>
      )}
      {variant === 'full' && (
        <PodiumHeader rankings={rankings} players={players} large={large} />
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
            />
          </>
        )}
      </div>
      {variant === 'compact' && highlightRank && highlightRank <= 5 && (
        <p className="text-xs text-text-muted mt-2 text-center">
          Tu posición: #{highlightRank}
        </p>
      )}
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
    <div className={`space-y-2 ${large ? 'space-y-3' : ''}`}>
      {placements.map((p) => (
        <div
          key={p.playerId}
          className={`flex items-center justify-between rounded-lg bg-bg-elevated border border-border-subtle ${
            large ? 'px-5 py-3' : 'px-4 py-2'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className={large ? 'text-2xl' : 'text-xl'}>
              {MEDALS[p.rank - 1] ?? `#${p.rank}`}
            </span>
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
