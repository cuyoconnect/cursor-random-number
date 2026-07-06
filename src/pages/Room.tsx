import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGameState } from '../hooks/useGameState'
import { getSession, setActiveRoomCode } from '../lib/session'
import { Game } from './Game'
import { Lobby } from './Lobby'
import { SessionStats } from './SessionStats'

export function Room() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const session = getSession()
  const playerId = session?.playerId ?? null

  const {
    view,
    loading,
    updateSettings,
    startGame,
    submitChoice,
    completeReveal,
    nextRound,
    playAgain,
  } = useGameState(code, playerId)

  useEffect(() => {
    if (code) setActiveRoomCode(code)
  }, [code])

  useEffect(() => {
    if (!loading && !view && code) {
      const t = setTimeout(() => navigate('/'), 1500)
      return () => clearTimeout(t)
    }
  }, [loading, view, code, navigate])

  if (!playerId) {
    navigate('/')
    return null
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-bg-canvas">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!view) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-6 text-center">
        <p className="text-text-secondary">Sala no encontrada...</p>
      </div>
    )
  }

  switch (view.room.phase) {
    case 'lobby':
      return (
        <Lobby
          view={view}
          onStart={startGame}
          onUpdateSettings={updateSettings}
        />
      )
    case 'selecting':
    case 'revealing':
    case 'round_summary':
      return (
        <Game
          view={view}
          onSubmitChoice={submitChoice}
          onCompleteReveal={completeReveal}
          onNextRound={nextRound}
        />
      )
    case 'session_stats':
      return <SessionStats view={view} onPlayAgain={playAgain} />
    default:
      return null
  }
}
