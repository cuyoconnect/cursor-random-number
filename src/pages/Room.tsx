import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { JoinRoomForm } from '../components/game/JoinRoomForm'
import { Layout } from '../components/layout/Layout'
import { PresentationLayout } from '../components/layout/PresentationLayout'
import { useGameState } from '../hooks/useGameState'
import { usePresentationMode } from '../hooks/usePresentationMode'
import { getSession, setActiveRoomCode } from '../lib/session'
import { Game } from './Game'
import { Lobby } from './Lobby'
import { SessionStats } from './SessionStats'

function normalizeCode(value: string | undefined): string {
  if (!value) return ''
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}

function RoomJoinScreen({
  code,
  onJoined,
}: {
  code: string
  onJoined: () => void
}) {
  return (
    <Layout showHeader={false}>
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-8 safe-bottom">
        <div className="text-center mb-10">
          <p className="text-text-secondary text-sm mb-2">Unirse a la sala</p>
          <p className="font-mono text-4xl font-semibold tracking-[0.2em] text-text-primary">
            {code}
          </p>
        </div>
        <JoinRoomForm
          initialCode={code}
          lockCode
          onJoined={() => onJoined()}
        />
      </div>
    </Layout>
  )
}

export function Room() {
  const { code: rawCode } = useParams<{ code: string }>()
  const code = normalizeCode(rawCode)
  const navigate = useNavigate()
  const [playerId, setPlayerId] = useState<string | null>(
    () => getSession()?.playerId ?? null,
  )

  const {
    view,
    loading,
    updateSettings,
    startGame,
    submitChoice,
    completeReveal,
    nextRound,
    playAgain,
  } = useGameState(code || undefined, playerId)

  const { presentationMode } = usePresentationMode(view?.isHost ?? false)

  useEffect(() => {
    if (code) setActiveRoomCode(code)
  }, [code])

  useEffect(() => {
    if (!code) {
      navigate('/', { replace: true })
    }
  }, [code, navigate])

  const needsJoin = !playerId || (!loading && !view)

  if (!code) {
    return null
  }

  if (needsJoin) {
    return (
      <RoomJoinScreen
        code={code}
        onJoined={() => {
          const session = getSession()
          setPlayerId(session?.playerId ?? null)
        }}
      />
    )
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
    return <PresentationLayout view={view}>{content}</PresentationLayout>
  }

  return content
}
