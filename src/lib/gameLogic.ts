import type { Choice, Player, RoundResult } from '../types/game'

export interface WinnerResult {
  winnerId: string | null
  winningNumber: number | null
  uniqueChoices: Choice[]
  duplicateNumbers: Set<number>
}

export function findWinner(choices: Choice[]): WinnerResult {
  const freq = new Map<number, number>()
  for (const c of choices) {
    freq.set(c.number, (freq.get(c.number) ?? 0) + 1)
  }

  const duplicateNumbers = new Set<number>()
  for (const [num, count] of freq) {
    if (count > 1) duplicateNumbers.add(num)
  }

  const uniqueChoices = choices.filter((c) => freq.get(c.number) === 1)
  if (uniqueChoices.length === 0) {
    return { winnerId: null, winningNumber: null, uniqueChoices, duplicateNumbers }
  }

  const winner = uniqueChoices.reduce((min, c) =>
    c.number < min.number ? c : min,
  )
  return {
    winnerId: winner.playerId,
    winningNumber: winner.number,
    uniqueChoices,
    duplicateNumbers,
  }
}

export function getRoundChoices(
  choices: Choice[],
  roundId: string,
): Choice[] {
  return choices.filter((c) => c.roundId === roundId)
}

export function buildRoundResult(
  roundId: string,
  roundNumber: number,
  choices: Choice[],
): RoundResult {
  const roundChoices = getRoundChoices(choices, roundId)
  const { winnerId } = findWinner(roundChoices)
  return { roundId, roundNumber, winnerId, choices: roundChoices }
}

export function getPlayerOutcome(
  playerId: string,
  roundChoices: Choice[],
): 'won' | 'unique' | 'duplicate' {
  const result = findWinner(roundChoices)
  if (result.winnerId === playerId) return 'won'
  const playerChoice = roundChoices.find((c) => c.playerId === playerId)
  if (!playerChoice) return 'duplicate'
  if (result.duplicateNumbers.has(playerChoice.number)) return 'duplicate'
  return 'unique'
}

export function getPlayerName(players: Player[], playerId: string): string {
  return players.find((p) => p.id === playerId)?.nickname ?? 'Desconocido'
}

export function mean(numbers: number[]): number {
  if (numbers.length === 0) return 0
  return numbers.reduce((a, b) => a + b, 0) / numbers.length
}

export function median(numbers: number[]): number {
  if (numbers.length === 0) return 0
  const sorted = [...numbers].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export const PLAYER_COLORS = [
  '#f7f7f4',
  '#d9d5cf',
  '#b6b9be',
  '#9ca3af',
  '#8a8780',
  '#6b6560',
  '#52524e',
  '#3d3d3a',
]

export function pickColor(index: number): string {
  return PLAYER_COLORS[index % PLAYER_COLORS.length]
}
