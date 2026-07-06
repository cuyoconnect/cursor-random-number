import type {
  Choice,
  Player,
  PlayerRanking,
  RoundResult,
  SessionAnalysis,
  StrategyInsight,
  StrategyType,
} from '../types/game'
import { findWinner, mean, median } from './gameLogic'

const STRATEGY_LABELS: Record<
  StrategyType,
  { label: string; description: string }
> = {
  converger: {
    label: 'Converger',
    description: 'Bajaste tu número en cada ronda, buscando ganar por la mínima diferencia.',
  },
  ancla: {
    label: 'Ancla',
    description: 'Mantuviste un rango similar de números ronda tras ronda.',
  },
  contrarian: {
    label: 'Contrarian',
    description: 'Subiste cuando la media bajaba — apostaste contra la tendencia del grupo.',
  },
  meta_gamer: {
    label: 'Meta-gamer',
    description: 'Tus elecciones rondaron la media o mediana del grupo, pensando un paso adelante.',
  },
  caotico: {
    label: 'Caótico',
    description: 'Alta varianza entre rondas — impredecible para el resto.',
  },
  equilibrado: {
    label: 'Equilibrado',
    description: 'Mezclaste estrategias sin un patrón dominante claro.',
  },
}

function variance(numbers: number[]): number {
  if (numbers.length < 2) return 0
  const m = mean(numbers)
  return numbers.reduce((acc, n) => acc + (n - m) ** 2, 0) / numbers.length
}

function getPlayerNumbers(
  playerId: string,
  history: RoundResult[],
): number[] {
  return history
    .map((r) => r.choices.find((c) => c.playerId === playerId)?.number)
    .filter((n): n is number => n !== undefined)
}

function detectStrategy(
  playerId: string,
  history: RoundResult[],
): StrategyType {
  const numbers = getPlayerNumbers(playerId, history)
  if (numbers.length < 2) return 'equilibrado'

  const varNum = variance(numbers)
  const range = Math.max(...numbers) - Math.min(...numbers)

  const isConverger = numbers.every(
    (n, i) => i === 0 || n <= numbers[i - 1],
  )
  if (isConverger && range >= 3) return 'converger'

  const isAncla = range <= 5
  if (isAncla) return 'ancla'

  if (varNum > 400) return 'caotico'

  let contrarianScore = 0
  let metaScore = 0
  for (let i = 1; i < history.length; i++) {
    const prevChoices = history[i - 1].choices.map((c) => c.number)
    const prevMean = mean(prevChoices)
    const curr = numbers[i]
    const prev = numbers[i - 1]
    if (prevMean < mean(history[i - 1].choices.map((c) => c.number)) && curr > prev) {
      contrarianScore++
    }
    const roundMean = mean(history[i].choices.map((c) => c.number))
    const roundMedian = median(history[i].choices.map((c) => c.number))
    if (Math.abs(curr - (roundMean - 1)) <= 3 || Math.abs(curr - (roundMedian - 1)) <= 3) {
      metaScore++
    }
  }

  if (contrarianScore >= 2) return 'contrarian'
  if (metaScore >= 2) return 'meta_gamer'

  return 'equilibrado'
}

function countCollisions(playerId: string, history: RoundResult[]): number {
  let collisions = 0
  for (const round of history) {
    const choice = round.choices.find((c) => c.playerId === playerId)
    if (!choice) continue
    const { duplicateNumbers } = findWinner(round.choices)
    if (duplicateNumbers.has(choice.number)) collisions++
  }
  return collisions
}

function countUniquePicks(playerId: string, history: RoundResult[]): number {
  let uniques = 0
  for (const round of history) {
    const choice = round.choices.find((c) => c.playerId === playerId)
    if (!choice) continue
    const { duplicateNumbers } = findWinner(round.choices)
    if (!duplicateNumbers.has(choice.number)) uniques++
  }
  return uniques
}

export function analyzeSession(
  players: Player[],
  history: RoundResult[],
): SessionAnalysis {
  const distribution = new Map<number, number>()
  for (const round of history) {
    for (const c of round.choices) {
      distribution.set(c.number, (distribution.get(c.number) ?? 0) + 1)
    }
  }

  const insights: StrategyInsight[] = players.map((player) => {
    const type = detectStrategy(player.id, history)
    const meta = STRATEGY_LABELS[type]
    return {
      playerId: player.id,
      type,
      label: meta.label,
      description: meta.description,
    }
  })

  const rankings: PlayerRanking[] = players
    .map((player) => {
      const wins = history.filter((r) => r.winnerId === player.id).length
      const uniquePicks = countUniquePicks(player.id, history)
      const collisions = countCollisions(player.id, history)
      const score = wins * 10 + uniquePicks * 3 - collisions
      return { playerId: player.id, wins, uniquePicks, collisions, score }
    })
    .sort((a, b) => b.score - a.score)

  return { distribution, insights, rankings, roundResults: history }
}

export function getDistributionMax(distribution: Map<number, number>): number {
  let max = 0
  for (const count of distribution.values()) {
    if (count > max) max = count
  }
  return max
}

export function buildHistogramData(
  distribution: Map<number, number>,
  minNum: number,
  maxNum: number,
): { number: number; count: number }[] {
  const data: { number: number; count: number }[] = []
  for (let n = minNum; n <= maxNum; n++) {
    data.push({ number: n, count: distribution.get(n) ?? 0 })
  }
  return data
}

export function getRoundHistogram(choices: Choice[]): Map<number, number> {
  const map = new Map<number, number>()
  for (const c of choices) {
    map.set(c.number, (map.get(c.number) ?? 0) + 1)
  }
  return map
}
