import { motion } from 'framer-motion'
import { useState } from 'react'
import { PageShell } from '../components/layout/PageShell'
import { Button } from '../components/ui/Button'
import { PlayerChip } from '../components/game/PlayerChip'
import type { GameView, RoomSettings } from '../types/game'

interface LobbyProps {
  view: GameView
  onStart: () => void
  onUpdateSettings: (settings: RoomSettings) => void
  presentationMode?: boolean
}

const ROUND_OPTIONS = [3, 5, 10]

export function Lobby({
  view,
  onStart,
  onUpdateSettings,
  presentationMode,
}: LobbyProps) {
  const { room, players, isHost, myPlayerId } = view
  const [totalRounds, setTotalRounds] = useState(room.totalRounds)
  const [minNum, setMinNum] = useState(room.minNum)
  const [maxNum, setMaxNum] = useState(room.maxNum)

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code)
    } catch {
      /* clipboard unavailable */
    }
  }

  const applySettings = (rounds: number) => {
    setTotalRounds(rounds)
    if (isHost) {
      onUpdateSettings({ totalRounds: rounds, minNum, maxNum })
    }
  }

  const canStart = players.length >= 2

  const containerClass = presentationMode
    ? 'max-w-3xl mx-auto'
    : 'px-6 py-6 safe-bottom max-w-lg mx-auto'

  return (
    <PageShell presentationMode={presentationMode}>
      <div className={containerClass}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <p className="text-text-secondary text-sm mb-2">Código de sala</p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={copyCode}
            className={`font-mono font-semibold tracking-[0.12em] text-text-primary ${
              presentationMode ? 'text-6xl' : 'text-4xl'
            }`}
          >
            {room.code}
          </motion.button>
        </motion.div>

        <div className="mb-6">
          <h2 className="font-medium mb-4">
            Jugadores ({players.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {[...players]
              .sort((a, b) => {
                if (a.id === myPlayerId) return -1
                if (b.id === myPlayerId) return 1
                return 0
              })
              .map((player) => (
                <PlayerChip
                  key={player.id}
                  player={player}
                  presentationMode={presentationMode}
                  isSelf={player.id === myPlayerId}
                />
              ))}
          </div>
          {room.demoMode && (
            <p className="text-xs text-text-muted mt-3">
              Modo demo — incluye bots automáticos
            </p>
          )}
        </div>

        {isHost && (
          <div className="mb-6 space-y-5">
            <h2 className="font-medium">Configuración</h2>

            <div>
              <p className="text-sm text-text-secondary mb-2">Rondas</p>
              <div className="flex gap-2">
                {ROUND_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => applySettings(n)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      totalRounds === n
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-bg-elevated text-text-primary border border-border-subtle hover:border-border-medium'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="text-text-secondary block mb-1">Mínimo</span>
                <input
                  type="number"
                  value={minNum}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10)
                    setMinNum(v)
                    onUpdateSettings({ totalRounds, minNum: v, maxNum })
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-bg-elevated text-text-primary focus:outline-none focus:ring-1 focus:ring-border-medium"
                />
              </label>
              <label className="text-sm">
                <span className="text-text-secondary block mb-1">Máximo</span>
                <input
                  type="number"
                  value={maxNum}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10)
                    setMaxNum(v)
                    onUpdateSettings({ totalRounds, minNum, maxNum: v })
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-bg-elevated text-text-primary focus:outline-none focus:ring-1 focus:ring-border-medium"
                />
              </label>
            </div>
          </div>
        )}

        {isHost ? (
          <Button size="lg" onClick={onStart} disabled={!canStart}>
            {canStart ? 'Empezar partida' : 'Esperando jugadores...'}
          </Button>
        ) : (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-center text-text-secondary py-4"
          >
            Esperando que el anfitrión inicie...
          </motion.div>
        )}

        {!canStart && isHost && (
          <p className="text-center text-sm text-text-muted mt-3">
            Compartí el código — se necesitan al menos 2 jugadores
          </p>
        )}
      </div>
    </PageShell>
  )
}
