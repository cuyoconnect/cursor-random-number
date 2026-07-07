import { useEffect, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PresentationLayout } from '../components/layout/PresentationLayout'
import { useGameState } from '../hooks/useGameState'
import { usePresentationMode } from '../hooks/usePresentationMode'
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

  const { presentationMode, setPresentationMode, togglePresentationMode } =
    usePresentationMode(view?.isHost ?? false)

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

  const presentationProps = {
    presentationMode,
    isHost: view.isHost,
    onTogglePresentation: togglePresentationMode,
  }

  let content: ReactNode

  switch (view.room.phase) {
    case 'lobby':
      content = (
        <Lobby
          view={view}
          onStart={startGame}
          onUpdateSettings={updateSettings}
          {...presentationProps}
        />
      )
      break
    case 'selecting':
    case 'revealing':
    case 'round_summary':
      content = (
        <Game
          view={view}
          onSubmitChoice={submitChoice}
          onCompleteReveal={completeReveal}
          onNextRound={nextRound}
          {...presentationProps}
        />
      )
      break
    case 'session_stats':
      content = (
        <SessionStats
          view={view}
          onPlayAgain={playAgain}
          {...presentationProps}
        />
      )
      break
    default:
      content = null
  }

  if (presentationMode) {
    return (
      <PresentationLayout
        view={view}
        onExitPresentation={() => setPresentationMode(false)}
      >
        {content}
      </PresentationLayout>
    )
  }

  return content
}
