import { useCallback, useEffect, useState } from 'react'
import type { GameView, RoomSettings } from '../types/game'
import { roomService } from '../lib/roomService'

export function useGameState(code: string | undefined, playerId: string | null) {
  const [view, setView] = useState<GameView | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!code || !playerId) {
      setView(null)
      setLoading(false)
      return
    }

    setLoading(true)
    const unsubscribe = roomService.subscribe(code, playerId, (next) => {
      setView(next)
      setLoading(false)
    })

    return unsubscribe
  }, [code, playerId])

  const updateSettings = useCallback(
    async (settings: RoomSettings) => {
      if (!view) return false
      return roomService.updateSettings(view.myPlayerId, code!, settings)
    },
    [view, code],
  )

  const startGame = useCallback(async () => {
    if (!view) return false
    return roomService.startGame(view.myPlayerId, code!)
  }, [view, code])

  const submitChoice = useCallback(
    async (number: number) => {
      if (!view) return false
      return roomService.submitChoice(code!, view.myPlayerId, number)
    },
    [view, code],
  )

  const completeReveal = useCallback(async () => {
    if (!view) return false
    return roomService.completeReveal(view.myPlayerId, code!)
  }, [view, code])

  const nextRound = useCallback(async () => {
    if (!view) return false
    return roomService.nextRound(view.myPlayerId, code!)
  }, [view, code])

  const playAgain = useCallback(async () => {
    if (!view) return false
    return roomService.playAgain(view.myPlayerId, code!)
  }, [view, code])

  const leaveRoom = useCallback(() => {
    if (!view || !code) return
    void roomService.leaveRoom(code, view.myPlayerId)
  }, [view, code])

  return {
    view,
    loading,
    updateSettings,
    startGame,
    submitChoice,
    completeReveal,
    nextRound,
    playAgain,
    leaveRoom,
  }
}
