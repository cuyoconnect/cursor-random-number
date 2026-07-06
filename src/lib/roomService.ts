import type {
  CreateRoomOptions,
  GameView,
  RoomSettings,
} from '../types/game'
import { isSupabaseConfigured } from './supabase'
import { localRoomService } from './localRoomService'
import { supabaseRoomService } from './supabaseRoomService'

export interface RoomService {
  createRoom(
    options: CreateRoomOptions,
  ): Promise<{ code: string; playerId: string }>
  joinRoom(
    code: string,
    nickname: string,
  ): Promise<{ playerId: string } | { error: string }>
  updateSettings(
    hostId: string,
    code: string,
    settings: RoomSettings,
  ): Promise<boolean>
  startGame(hostId: string, code: string): Promise<boolean>
  submitChoice(code: string, playerId: string, number: number): Promise<boolean>
  completeReveal(hostId: string, code: string): Promise<boolean>
  nextRound(hostId: string, code: string): Promise<boolean>
  playAgain(hostId: string, code: string): Promise<boolean>
  leaveRoom(code: string, playerId: string): Promise<void>
  subscribe(
    code: string,
    playerId: string,
    listener: (view: GameView | null) => void,
  ): () => void
  getView(code: string, playerId: string): Promise<GameView | null>
}

/** Adapt LocalRoomService sync API to async interface */
const localAdapter: RoomService = {
  createRoom: (o) => Promise.resolve(localRoomService.createRoom(o)),
  joinRoom: (c, n) => Promise.resolve(localRoomService.joinRoom(c, n)),
  updateSettings: (h, c, s) =>
    Promise.resolve(localRoomService.updateSettings(h, c, s)),
  startGame: (h, c) => Promise.resolve(localRoomService.startGame(h, c)),
  submitChoice: (c, p, n) =>
    Promise.resolve(localRoomService.submitChoice(c, p, n)),
  completeReveal: (h, c) =>
    Promise.resolve(localRoomService.completeReveal(h, c)),
  nextRound: (h, c) => Promise.resolve(localRoomService.nextRound(h, c)),
  playAgain: (h, c) => Promise.resolve(localRoomService.playAgain(h, c)),
  leaveRoom: (c, p) => Promise.resolve(localRoomService.leaveRoom(c, p)),
  subscribe: (c, p, l) => localRoomService.subscribe(c, p, l),
  getView: (c, p) => Promise.resolve(localRoomService.getView(c, p)),
}

export const roomService: RoomService = isSupabaseConfigured
  ? supabaseRoomService
  : localAdapter

export const usingSupabase = isSupabaseConfigured
