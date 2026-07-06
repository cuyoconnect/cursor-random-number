import type {
  Choice,
  ChoiceVisibility,
  CreateRoomOptions,
  GameView,
  RoomSettings,
  StoredRoom,
} from '../types/game'
import {
  buildRoundResult,
  findWinner,
  generateRoomCode,
  getRoundChoices,
  pickColor,
} from './gameLogic'
import { setActiveRoomCode, setSessionPlayerId } from './session'

const STORAGE_PREFIX = 'unico_room_'
const CHANNEL_NAME = 'unico_game'

type Listener = (view: GameView | null) => void

function storageKey(code: string): string {
  return `${STORAGE_PREFIX}${code.toUpperCase()}`
}

function generateId(): string {
  return crypto.randomUUID()
}

const BOT_NAMES = ['Luna', 'Sol', 'Nova', 'Kai', 'Zoe']

function loadRoom(code: string): StoredRoom | null {
  try {
    const raw = localStorage.getItem(storageKey(code))
    if (!raw) return null
    return JSON.parse(raw) as StoredRoom
  } catch {
    return null
  }
}

function saveRoom(state: StoredRoom): void {
  localStorage.setItem(storageKey(state.room.code), JSON.stringify(state))
}

function sanitizeChoices(
  state: StoredRoom,
  viewerPlayerId: string,
): ChoiceVisibility[] {
  const round = state.rounds.find(
    (r) => r.roundNumber === state.room.currentRound,
  )
  if (!round) return []

  const roundChoices = getRoundChoices(state.choices, round.id)
  const canReveal =
    state.room.phase === 'revealing' ||
    state.room.phase === 'round_summary' ||
    state.room.phase === 'session_stats' ||
    round.status !== 'selecting'

  return state.players.map((player) => {
    const choice = roundChoices.find((c) => c.playerId === player.id)
    const hasSubmitted = !!choice
    if (!hasSubmitted) {
      return { playerId: player.id, hasSubmitted: false }
    }
    if (canReveal || player.id === viewerPlayerId) {
      return { playerId: player.id, hasSubmitted: true, number: choice!.number }
    }
    return { playerId: player.id, hasSubmitted: true }
  })
}

function toGameView(state: StoredRoom, myPlayerId: string): GameView {
  const currentRound =
    state.rounds.find((r) => r.roundNumber === state.room.currentRound) ??
    null
  return {
    room: state.room,
    players: state.players,
    currentRound,
    choices: sanitizeChoices(state, myPlayerId),
    history: state.history,
    myPlayerId,
    isHost: state.room.hostId === myPlayerId,
  }
}

function addBots(state: StoredRoom, count = 3): StoredRoom {
  const existingBots = state.players.filter((p) => p.isBot).length
  const toAdd = Math.max(0, count - existingBots)
  const newPlayers = [...state.players]
  for (let i = 0; i < toAdd; i++) {
    newPlayers.push({
      id: generateId(),
      roomId: state.room.id,
      nickname: BOT_NAMES[(existingBots + i) % BOT_NAMES.length],
      color: pickColor(newPlayers.length),
      isBot: true,
    })
  }
  return { ...state, players: newPlayers }
}

function botPickNumber(state: StoredRoom): number {
  const { minNum, maxNum } = state.room
  const prevRounds = state.history
  if (prevRounds.length === 0) {
    return minNum + Math.floor(Math.random() * Math.min(20, maxNum - minNum + 1))
  }
  const lastMean =
    prevRounds[prevRounds.length - 1].choices.reduce((a, c) => a + c.number, 0) /
    prevRounds[prevRounds.length - 1].choices.length
  const base = Math.max(minNum, Math.round(lastMean * 0.6 + Math.random() * 10))
  return Math.min(maxNum, base + Math.floor(Math.random() * 5))
}

const botTimers = new Map<string, ReturnType<typeof setTimeout>>()

function scheduleBotMoves(state: StoredRoom, service: LocalRoomService): void {
  const round = state.rounds.find(
    (r) => r.roundNumber === state.room.currentRound,
  )
  if (!round || state.room.phase !== 'selecting') return

  for (const player of state.players.filter((p) => p.isBot)) {
    const key = `${state.room.code}_${round.id}_${player.id}`
    if (botTimers.has(key)) continue

    const existing = getRoundChoices(state.choices, round.id).find(
      (c) => c.playerId === player.id,
    )
    if (existing) continue

    const delay = 800 + Math.random() * 2500
    const timer = setTimeout(() => {
      botTimers.delete(key)
      const fresh = loadRoom(state.room.code)
      if (!fresh || fresh.room.phase !== 'selecting') return
      const num = botPickNumber(fresh)
      service.submitChoiceInternal(fresh.room.code, player.id, num)
    }, delay)
    botTimers.set(key, timer)
  }
}

function checkAllSubmitted(state: StoredRoom): boolean {
  const round = state.rounds.find(
    (r) => r.roundNumber === state.room.currentRound,
  )
  if (!round) return false
  const submitted = getRoundChoices(state.choices, round.id)
  return submitted.length >= state.players.length
}

function checkDeadline(state: StoredRoom): boolean {
  const round = state.rounds.find(
    (r) => r.roundNumber === state.room.currentRound,
  )
  if (!round?.deadline) return false
  return Date.now() >= round.deadline
}

export class LocalRoomService {
  private channel: BroadcastChannel
  private listeners = new Map<string, Set<Listener>>()
  private deadlineIntervals = new Map<string, ReturnType<typeof setInterval>>()

  constructor() {
    this.channel = new BroadcastChannel(CHANNEL_NAME)
    this.channel.onmessage = (event) => {
      const { code } = event.data as { code: string }
      this.notify(code)
    }
    window.addEventListener('storage', (event) => {
      if (event.key?.startsWith(STORAGE_PREFIX)) {
        const code = event.key.replace(STORAGE_PREFIX, '')
        this.notify(code)
      }
    })
  }

  private notify(code: string): void {
    const subs = this.listeners.get(code.toUpperCase())
    if (!subs) return
    const state = loadRoom(code)
    for (const listener of subs) {
      if (!state) {
        listener(null)
        continue
      }
      const sessionPlayerId = this.getViewerForRoom(code)
      listener(toGameView(state, sessionPlayerId))
    }
  }

  private getViewerForRoom(code: string): string {
    const state = loadRoom(code)
    if (!state) return ''
    const stored = localStorage.getItem(`unico_viewer_${code.toUpperCase()}`)
    if (stored && state.players.some((p) => p.id === stored)) return stored
    return state.room.hostId
  }

  private setViewer(code: string, playerId: string): void {
    localStorage.setItem(`unico_viewer_${code.toUpperCase()}`, playerId)
  }

  private broadcast(code: string): void {
    this.channel.postMessage({ code: code.toUpperCase() })
    this.notify(code)
  }

  private persist(state: StoredRoom): void {
    saveRoom(state)
    this.broadcast(state.room.code)
  }

  subscribe(code: string, playerId: string, listener: Listener): () => void {
    const upper = code.toUpperCase()
    this.setViewer(upper, playerId)
    if (!this.listeners.has(upper)) {
      this.listeners.set(upper, new Set())
    }
    this.listeners.get(upper)!.add(listener)

    const state = loadRoom(upper)
    listener(state ? toGameView(state, playerId) : null)

    return () => {
      this.listeners.get(upper)?.delete(listener)
    }
  }

  createRoom(options: CreateRoomOptions): { code: string; playerId: string } {
    const playerId = generateId()
    setSessionPlayerId(playerId)

    let code = generateRoomCode()
    while (loadRoom(code)) {
      code = generateRoomCode()
    }

    const room = {
      id: generateId(),
      code,
      hostId: playerId,
      phase: 'lobby' as const,
      totalRounds: options.totalRounds ?? 5,
      currentRound: 0,
      minNum: options.minNum ?? 1,
      maxNum: options.maxNum ?? 100,
      demoMode: options.demoMode ?? false,
      createdAt: Date.now(),
    }

    const player = {
      id: playerId,
      roomId: room.id,
      nickname: options.nickname.trim() || 'Anfitrión',
      color: pickColor(0),
    }

    let state: StoredRoom = {
      room,
      players: [player],
      rounds: [],
      choices: [],
      history: [],
    }

    if (options.demoMode) {
      state = addBots(state, 3)
    }

    this.persist(state)
    this.setViewer(code, playerId)
    setActiveRoomCode(code)
    return { code, playerId }
  }

  joinRoom(
    code: string,
    nickname: string,
  ): { playerId: string } | { error: string } {
    const upper = code.toUpperCase().trim()
    const state = loadRoom(upper)
    if (!state) return { error: 'Sala no encontrada' }
    if (state.room.phase !== 'lobby') {
      return { error: 'La partida ya comenzó' }
    }

    const playerId = generateId()
    setSessionPlayerId(playerId)

    const player = {
      id: playerId,
      roomId: state.room.id,
      nickname: nickname.trim() || 'Jugador',
      color: pickColor(state.players.length),
    }

    state.players.push(player)
    this.persist(state)
    this.setViewer(upper, playerId)
    setActiveRoomCode(upper)
    return { playerId }
  }

  updateSettings(hostId: string, code: string, settings: RoomSettings): boolean {
    const state = loadRoom(code)
    if (!state || state.room.hostId !== hostId) return false
    if (state.room.phase !== 'lobby') return false

    state.room.totalRounds = settings.totalRounds
    state.room.minNum = settings.minNum
    state.room.maxNum = settings.maxNum
    this.persist(state)
    return true
  }

  startGame(hostId: string, code: string): boolean {
    const state = loadRoom(code)
    if (!state || state.room.hostId !== hostId) return false
    if (state.room.phase !== 'lobby') return false
    if (state.players.length < 2) return false

    return this.startRound(state)
  }

  private startRound(state: StoredRoom): boolean {
    const roundNumber = state.room.currentRound + 1
    const round = {
      id: generateId(),
      roomId: state.room.id,
      roundNumber,
      status: 'selecting' as const,
      winnerId: null,
      deadline: Date.now() + 60_000,
    }

    state.rounds.push(round)
    state.room.currentRound = roundNumber
    state.room.phase = 'selecting'
    this.persist(state)
    scheduleBotMoves(state, this)
    this.startDeadlineWatcher(state.room.code)
    return true
  }

  private startDeadlineWatcher(code: string): void {
    const upper = code.toUpperCase()
    if (this.deadlineIntervals.has(upper)) {
      clearInterval(this.deadlineIntervals.get(upper)!)
    }

    const interval = setInterval(() => {
      const state = loadRoom(upper)
      if (!state || state.room.phase !== 'selecting') {
        clearInterval(interval)
        this.deadlineIntervals.delete(upper)
        return
      }
      if (checkAllSubmitted(state) || checkDeadline(state)) {
        clearInterval(interval)
        this.deadlineIntervals.delete(upper)
        this.transitionToRevealing(state)
      }
    }, 500)

    this.deadlineIntervals.set(upper, interval)
  }

  submitChoice(
    code: string,
    playerId: string,
    number: number,
  ): boolean {
    return this.submitChoiceInternal(code, playerId, number)
  }

  submitChoiceInternal(
    code: string,
    playerId: string,
    number: number,
  ): boolean {
    const state = loadRoom(code)
    if (!state || state.room.phase !== 'selecting') return false

    const round = state.rounds.find(
      (r) => r.roundNumber === state.room.currentRound,
    )
    if (!round || round.status !== 'selecting') return false

    if (number < state.room.minNum || number > state.room.maxNum) return false

    const existing = getRoundChoices(state.choices, round.id).find(
      (c) => c.playerId === playerId,
    )
    if (existing) {
      existing.number = number
      existing.submittedAt = Date.now()
    } else {
      const choice: Choice = {
        roundId: round.id,
        playerId,
        number,
        submittedAt: Date.now(),
      }
      state.choices.push(choice)
    }

    this.persist(state)

    if (checkAllSubmitted(state)) {
      this.transitionToRevealing(state)
    }
    return true
  }

  private transitionToRevealing(state: StoredRoom): void {
    const round = state.rounds.find(
      (r) => r.roundNumber === state.room.currentRound,
    )
    if (!round) return

    for (const player of state.players.filter((p) => p.isBot)) {
      const existing = getRoundChoices(state.choices, round.id).find(
        (c) => c.playerId === player.id,
      )
      if (!existing) {
        state.choices.push({
          roundId: round.id,
          playerId: player.id,
          number: botPickNumber(state),
          submittedAt: Date.now(),
        })
      }
    }

    for (const player of state.players.filter((p) => !p.isBot)) {
      const existing = getRoundChoices(state.choices, round.id).find(
        (c) => c.playerId === player.id,
      )
      if (!existing) {
        state.choices.push({
          roundId: round.id,
          playerId: player.id,
          number:
            state.room.minNum +
            Math.floor(
              Math.random() * (state.room.maxNum - state.room.minNum + 1),
            ),
          submittedAt: Date.now(),
        })
      }
    }

    round.status = 'revealing'
    state.room.phase = 'revealing'
    const roundChoices = getRoundChoices(state.choices, round.id)
    const { winnerId } = findWinner(roundChoices)
    round.winnerId = winnerId
    this.persist(state)
  }

  completeReveal(hostId: string, code: string): boolean {
    const state = loadRoom(code)
    if (!state || state.room.hostId !== hostId) return false
    if (state.room.phase !== 'revealing') return false

    const round = state.rounds.find(
      (r) => r.roundNumber === state.room.currentRound,
    )
    if (!round) return false

    round.status = 'completed'
    const result = buildRoundResult(
      round.id,
      round.roundNumber,
      state.choices,
    )
    state.history.push(result)

    if (state.room.currentRound >= state.room.totalRounds) {
      state.room.phase = 'session_stats'
    } else {
      state.room.phase = 'round_summary'
    }

    this.persist(state)
    return true
  }

  nextRound(hostId: string, code: string): boolean {
    const state = loadRoom(code)
    if (!state || state.room.hostId !== hostId) return false
    if (state.room.phase !== 'round_summary') return false
    return this.startRound(state)
  }

  playAgain(hostId: string, code: string): boolean {
    const state = loadRoom(code)
    if (!state || state.room.hostId !== hostId) return false

    state.room.phase = 'lobby'
    state.room.currentRound = 0
    state.rounds = []
    state.choices = []
    state.history = []
    this.persist(state)
    return true
  }

  leaveRoom(code: string, playerId: string): void {
    const state = loadRoom(code)
    if (!state) return

    state.players = state.players.filter((p) => p.id !== playerId)
    if (state.players.length === 0) {
      localStorage.removeItem(storageKey(code))
      setActiveRoomCode(null)
      this.broadcast(code)
      return
    }

    if (state.room.hostId === playerId) {
      state.room.hostId = state.players[0].id
    }

    this.persist(state)
  }

  getView(code: string, playerId: string): GameView | null {
    const state = loadRoom(code)
    if (!state) return null
    return toGameView(state, playerId)
  }
}

export const localRoomService = new LocalRoomService()
