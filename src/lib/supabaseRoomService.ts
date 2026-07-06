import type {
  ChoiceVisibility,
  CreateRoomOptions,
  GameView,
  RoomSettings,
} from '../types/game'
import {
  findWinner,
  generateRoomCode,
  pickColor,
} from './gameLogic'
import { setActiveRoomCode, setSessionPlayerId } from './session'
import { supabase } from './supabase'
import type { RoomService } from './roomService'

const BOT_NAMES = ['Luna', 'Sol', 'Nova', 'Kai', 'Zoe']

function generateId(): string {
  return crypto.randomUUID()
}

type RpcView = {
  room: GameView['room']
  players: GameView['players']
  currentRound: GameView['currentRound']
  choices: ChoiceVisibility[]
  history: GameView['history']
  myPlayerId: string
  isHost: boolean
}

async function fetchView(
  code: string,
  playerId: string,
): Promise<GameView | null> {
  const { data, error } = await supabase.rpc('fetch_game_view', {
    p_room_code: code.toUpperCase(),
    p_player_id: playerId,
  })
  if (error || !data) return null
  const v = data as RpcView
  return {
    room: v.room,
    players: v.players,
    currentRound: v.currentRound,
    choices: v.choices,
    history: v.history,
    myPlayerId: v.myPlayerId,
    isHost: v.isHost,
  }
}

async function getRoomId(code: string): Promise<string | null> {
  const { data } = await supabase
    .from('rooms')
    .select('id')
    .eq('code', code.toUpperCase())
    .maybeSingle()
  return data?.id ?? null
}

function botPickNumber(
  minNum: number,
  maxNum: number,
  history: GameView['history'],
): number {
  if (history.length === 0) {
    return minNum + Math.floor(Math.random() * Math.min(20, maxNum - minNum + 1))
  }
  const lastMean =
    history[history.length - 1].choices.reduce((a, c) => a + c.number, 0) /
    history[history.length - 1].choices.length
  const base = Math.max(minNum, Math.round(lastMean * 0.6 + Math.random() * 10))
  return Math.min(maxNum, base + Math.floor(Math.random() * 5))
}

const botTimers = new Map<string, ReturnType<typeof setTimeout>>()
const deadlineIntervals = new Map<string, ReturnType<typeof setInterval>>()

export class SupabaseRoomService implements RoomService {
  private listeners = new Map<
    string,
    Map<(view: GameView | null) => void, string>
  >()
  private channels = new Map<string, ReturnType<typeof supabase.channel>>()

  private notify(code: string) {
    const upper = code.toUpperCase()
    const subs = this.listeners.get(upper)
    if (!subs) return

    for (const [fn, playerId] of subs) {
      void fetchView(upper, playerId).then((view) => {
        fn(view)
        if (view?.room.demoMode && view.isHost && view.room.phase === 'selecting') {
          this.scheduleBots(view)
        }
        if (view?.room.phase === 'selecting' && view.isHost) {
          this.startDeadlineWatcher(upper, playerId)
        }
      })
    }
  }

  private async setupChannel(code: string) {
    const upper = code.toUpperCase()
    if (this.channels.has(upper)) return

    const roomId = await getRoomId(upper)
    if (!roomId) return

    const channel = supabase
      .channel(`room:${upper}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        () => this.notify(upper),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
        () => this.notify(upper),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rounds', filter: `room_id=eq.${roomId}` },
        () => this.notify(upper),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'choices' },
        () => this.notify(upper),
      )
      .subscribe()

    this.channels.set(upper, channel)
  }

  subscribe(
    code: string,
    playerId: string,
    listener: (view: GameView | null) => void,
  ): () => void {
    const upper = code.toUpperCase()
    if (!this.listeners.has(upper)) {
      this.listeners.set(upper, new Map())
    }
    this.listeners.get(upper)!.set(listener, playerId)

    void this.setupChannel(upper).then(() => {
      void fetchView(upper, playerId).then((view) => {
        listener(view)
        if (view?.room.demoMode && view.isHost && view.room.phase === 'selecting') {
          this.scheduleBots(view)
        }
        if (view?.room.phase === 'selecting' && view.isHost) {
          this.startDeadlineWatcher(upper, playerId)
        }
      })
    })

    return () => {
      this.listeners.get(upper)?.delete(listener)
      if (this.listeners.get(upper)?.size === 0) {
        const ch = this.channels.get(upper)
        if (ch) void supabase.removeChannel(ch)
        this.channels.delete(upper)
        const interval = deadlineIntervals.get(upper)
        if (interval) clearInterval(interval)
        deadlineIntervals.delete(upper)
      }
    }
  }

  private scheduleBots(view: GameView) {
    if (view.room.phase !== 'selecting' || !view.currentRound) return
    const code = view.room.code

    for (const player of view.players.filter((p) => p.isBot)) {
      const key = `${code}_${view.currentRound.id}_${player.id}`
      if (botTimers.has(key)) continue

      const choice = view.choices.find((c) => c.playerId === player.id)
      if (choice?.hasSubmitted) continue

      const delay = 800 + Math.random() * 2500
      const timer = setTimeout(() => {
        botTimers.delete(key)
        const num = botPickNumber(view.room.minNum, view.room.maxNum, view.history)
        void this.submitChoiceInternal(code, player.id, num)
      }, delay)
      botTimers.set(key, timer)
    }
  }

  private startDeadlineWatcher(code: string, hostPlayerId: string) {
    const upper = code.toUpperCase()
    if (deadlineIntervals.has(upper)) return

    const interval = setInterval(() => {
      void fetchView(upper, hostPlayerId).then(async (view) => {
        if (!view || view.room.phase !== 'selecting' || !view.currentRound) return
        const allSubmitted = view.choices.every((c) => c.hasSubmitted)
        const expired =
          view.currentRound.deadline !== null &&
          Date.now() >= view.currentRound.deadline
        if (allSubmitted || expired) {
          await this.transitionToRevealing(upper, hostPlayerId)
        }
      })
    }, 800)

    deadlineIntervals.set(upper, interval)
  }

  async createRoom(
    options: CreateRoomOptions,
  ): Promise<{ code: string; playerId: string }> {
    let code = generateRoomCode()
    let exists = true
    while (exists) {
      const { data } = await supabase
        .from('rooms')
        .select('id')
        .eq('code', code)
        .maybeSingle()
      exists = !!data
      if (exists) code = generateRoomCode()
    }

    const playerId = generateId()
    setSessionPlayerId(playerId)

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({
        code,
        phase: 'lobby',
        total_rounds: options.totalRounds ?? 5,
        min_num: options.minNum ?? 1,
        max_num: options.maxNum ?? 100,
        demo_mode: options.demoMode ?? false,
      })
      .select('id')
      .single()

    if (roomError || !room) throw new Error(roomError?.message ?? 'No se pudo crear la sala')

    const { error: playerError } = await supabase.from('players').insert({
      id: playerId,
      room_id: room.id,
      nickname: options.nickname.trim() || 'Anfitrión',
      color: pickColor(0),
      is_bot: false,
    })

    if (playerError) throw new Error(playerError.message)

    await supabase.from('rooms').update({ host_id: playerId }).eq('id', room.id)

    if (options.demoMode) {
      const bots = BOT_NAMES.map((name, i) => ({
        id: generateId(),
        room_id: room.id,
        nickname: name,
        color: pickColor(i + 1),
        is_bot: true,
      }))
      await supabase.from('players').insert(bots)
    }

    setActiveRoomCode(code)
    return { code, playerId }
  }

  async joinRoom(
    code: string,
    nickname: string,
  ): Promise<{ playerId: string } | { error: string }> {
    const upper = code.toUpperCase().trim()
    const { data: room } = await supabase
      .from('rooms')
      .select('id, phase')
      .eq('code', upper)
      .maybeSingle()

    if (!room) return { error: 'Sala no encontrada' }
    if (room.phase !== 'lobby') return { error: 'La partida ya comenzó' }

    const playerId = generateId()
    setSessionPlayerId(playerId)

    const { count } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', room.id)

    const { error } = await supabase.from('players').insert({
      id: playerId,
      room_id: room.id,
      nickname: nickname.trim() || 'Jugador',
      color: pickColor(count ?? 0),
      is_bot: false,
    })

    if (error) return { error: error.message }

    setActiveRoomCode(upper)
    return { playerId }
  }

  async updateSettings(
    hostId: string,
    code: string,
    settings: RoomSettings,
  ): Promise<boolean> {
    const { error } = await supabase
      .from('rooms')
      .update({
        total_rounds: settings.totalRounds,
        min_num: settings.minNum,
        max_num: settings.maxNum,
      })
      .eq('code', code.toUpperCase())
      .eq('host_id', hostId)
      .eq('phase', 'lobby')

    return !error
  }

  async startGame(hostId: string, code: string): Promise<boolean> {
    const upper = code.toUpperCase()
    const view = await fetchView(upper, hostId)
    if (!view || !view.isHost || view.room.phase !== 'lobby') return false
    if (view.players.length < 2) return false

    const { data: room } = await supabase
      .from('rooms')
      .select('id, total_rounds')
      .eq('code', upper)
      .single()
    if (!room) return false

    const roundNumber = 1
    const { data: round, error: roundError } = await supabase
      .from('rounds')
      .insert({
        room_id: room.id,
        round_number: roundNumber,
        status: 'selecting',
        deadline: new Date(Date.now() + 60_000).toISOString(),
      })
      .select('id')
      .single()

    if (roundError || !round) return false

    const { error } = await supabase
      .from('rooms')
      .update({
        phase: 'selecting',
        current_round: roundNumber,
      })
      .eq('id', room.id)
      .eq('host_id', hostId)

    return !error
  }

  async submitChoice(
    code: string,
    playerId: string,
    number: number,
  ): Promise<boolean> {
    return this.submitChoiceInternal(code, playerId, number)
  }

  private async submitChoiceInternal(
    code: string,
    playerId: string,
    number: number,
  ): Promise<boolean> {
    const view = await fetchView(code.toUpperCase(), playerId)
    if (!view || view.room.phase !== 'selecting' || !view.currentRound) return false
    if (number < view.room.minNum || number > view.room.maxNum) return false

    const { data: existing } = await supabase
      .from('choices')
      .select('id')
      .eq('round_id', view.currentRound.id)
      .eq('player_id', playerId)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('choices')
        .update({ number, submitted_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (error) return false
    } else {
      const { error } = await supabase.from('choices').insert({
        round_id: view.currentRound.id,
        player_id: playerId,
        number,
      })
      if (error) return false
    }

    const updated = await fetchView(code.toUpperCase(), playerId)
    if (updated && updated.choices.every((c) => c.hasSubmitted)) {
      const hostId = updated.room.hostId
      await this.transitionToRevealing(code.toUpperCase(), hostId)
    }
    return true
  }

  private async transitionToRevealing(code: string, actorId: string): Promise<boolean> {
    const view = await fetchView(code, actorId)
    if (!view || view.room.phase !== 'selecting' || !view.currentRound) return false

    const roundId = view.currentRound.id
    const { data: room } = await supabase
      .from('rooms')
      .select('id, min_num, max_num')
      .eq('code', code)
      .single()
    if (!room) return false

    for (const player of view.players) {
      const choice = view.choices.find((c) => c.playerId === player.id)
      if (!choice?.hasSubmitted) {
        const num = player.isBot
          ? botPickNumber(room.min_num, room.max_num, view.history)
          : room.min_num +
            Math.floor(Math.random() * (room.max_num - room.min_num + 1))
        await supabase.from('choices').insert({
          round_id: roundId,
          player_id: player.id,
          number: num,
        })
      }
    }

    const { data: allChoices } = await supabase
      .from('choices')
      .select('player_id, number, round_id, submitted_at')
      .eq('round_id', roundId)

    const choices = (allChoices ?? []).map((c) => ({
      playerId: c.player_id,
      number: c.number,
      roundId: c.round_id,
      submittedAt: new Date(c.submitted_at).getTime(),
    }))

    const { winnerId } = findWinner(choices)

    await supabase
      .from('rounds')
      .update({ status: 'revealing', winner_id: winnerId })
      .eq('id', roundId)

    await supabase
      .from('rooms')
      .update({ phase: 'revealing' })
      .eq('id', room.id)

    return true
  }

  async completeReveal(hostId: string, code: string): Promise<boolean> {
    const upper = code.toUpperCase()
    const view = await fetchView(upper, hostId)
    if (!view || !view.isHost || view.room.phase !== 'revealing' || !view.currentRound) {
      return false
    }

    const { data: room } = await supabase
      .from('rooms')
      .select('id, current_round, total_rounds')
      .eq('code', upper)
      .single()
    if (!room) return false

    await supabase
      .from('rounds')
      .update({ status: 'completed' })
      .eq('id', view.currentRound.id)

    const nextPhase =
      room.current_round >= room.total_rounds ? 'session_stats' : 'round_summary'

    await supabase.from('rooms').update({ phase: nextPhase }).eq('id', room.id)
    return true
  }

  async nextRound(hostId: string, code: string): Promise<boolean> {
    const upper = code.toUpperCase()
    const view = await fetchView(upper, hostId)
    if (!view || !view.isHost || view.room.phase !== 'round_summary') return false

    const { data: room } = await supabase
      .from('rooms')
      .select('id, current_round')
      .eq('code', upper)
      .single()
    if (!room) return false

    const roundNumber = room.current_round + 1
    const { error: roundError } = await supabase.from('rounds').insert({
      room_id: room.id,
      round_number: roundNumber,
      status: 'selecting',
      deadline: new Date(Date.now() + 60_000).toISOString(),
    })
    if (roundError) return false

    const { error } = await supabase
      .from('rooms')
      .update({ phase: 'selecting', current_round: roundNumber })
      .eq('id', room.id)

    return !error
  }

  async playAgain(hostId: string, code: string): Promise<boolean> {
    const upper = code.toUpperCase()
    const { data: room } = await supabase
      .from('rooms')
      .select('id')
      .eq('code', upper)
      .eq('host_id', hostId)
      .maybeSingle()
    if (!room) return false

    const { data: rounds } = await supabase
      .from('rounds')
      .select('id')
      .eq('room_id', room.id)
    const roundIds = (rounds ?? []).map((r) => r.id)

    if (roundIds.length > 0) {
      await supabase.from('choices').delete().in('round_id', roundIds)
      await supabase.from('rounds').delete().eq('room_id', room.id)
    }

    await supabase
      .from('rooms')
      .update({ phase: 'lobby', current_round: 0 })
      .eq('id', room.id)

    return true
  }

  async leaveRoom(code: string, playerId: string): Promise<void> {
    const upper = code.toUpperCase()
    const { data: room } = await supabase
      .from('rooms')
      .select('id, host_id')
      .eq('code', upper)
      .maybeSingle()
    if (!room) return

    await supabase.from('players').delete().eq('id', playerId)

    const { count } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', room.id)

    if ((count ?? 0) === 0) {
      await supabase.from('rooms').delete().eq('id', room.id)
      setActiveRoomCode(null)
      return
    }

    if (room.host_id === playerId) {
      const { data: nextHost } = await supabase
        .from('players')
        .select('id')
        .eq('room_id', room.id)
        .order('joined_at')
        .limit(1)
        .maybeSingle()
      if (nextHost) {
        await supabase.from('rooms').update({ host_id: nextHost.id }).eq('id', room.id)
      }
    }
  }

  async getView(code: string, playerId: string): Promise<GameView | null> {
    return fetchView(code.toUpperCase(), playerId)
  }
}

export const supabaseRoomService = new SupabaseRoomService()
