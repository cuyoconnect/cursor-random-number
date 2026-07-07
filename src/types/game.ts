export type RoomPhase =
  | 'lobby'
  | 'selecting'
  | 'revealing'
  | 'round_summary'
  | 'session_stats'

export type RoundStatus = 'selecting' | 'revealing' | 'completed'

export interface Room {
  id: string
  code: string
  hostId: string
  phase: RoomPhase
  totalRounds: number
  currentRound: number
  minNum: number
  maxNum: number
  demoMode: boolean
  createdAt: number
}

export interface Player {
  id: string
  roomId: string
  nickname: string
  color: string
  isBot?: boolean
}

export interface Round {
  id: string
  roomId: string
  roundNumber: number
  status: RoundStatus
  winnerId: string | null
  deadline: number | null
}

export interface Choice {
  roundId: string
  playerId: string
  number: number
  submittedAt: number
}

export interface ChoiceVisibility {
  playerId: string
  hasSubmitted: boolean
  number?: number
}

export interface RoundResult {
  roundId: string
  roundNumber: number
  winnerId: string | null
  choices: Choice[]
}

export interface StoredRoom {
  room: Room
  players: Player[]
  rounds: Round[]
  choices: Choice[]
  history: RoundResult[]
}

export interface GameView {
  room: Room
  players: Player[]
  currentRound: Round | null
  choices: ChoiceVisibility[]
  history: RoundResult[]
  myPlayerId: string
  isHost: boolean
}

export interface CreateRoomOptions {
  nickname: string
  demoMode?: boolean
  totalRounds?: number
  minNum?: number
  maxNum?: number
}

export interface RoomSettings {
  totalRounds: number
  minNum: number
  maxNum: number
}

export type StrategyType =
  | 'converger'
  | 'ancla'
  | 'contrarian'
  | 'meta_gamer'
  | 'caotico'
  | 'equilibrado'

export interface StrategyInsight {
  playerId: string
  type: StrategyType
  label: string
  description: string
}

export interface PodiumFinishes {
  first: number
  second: number
  third: number
}

export interface PlayerRanking {
  playerId: string
  points: number
  wins: number
  podiumFinishes: PodiumFinishes
  collisions: number
}

export interface SessionAnalysis {
  distribution: Map<number, number>
  insights: StrategyInsight[]
  rankings: PlayerRanking[]
  roundResults: RoundResult[]
}
