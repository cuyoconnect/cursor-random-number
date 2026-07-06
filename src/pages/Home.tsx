import { motion } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { roomService } from '../lib/roomService'
import { setSessionPlayerId } from '../lib/session'

export function Home() {
  const navigate = useNavigate()
  const [nickname, setNickname] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [demoMode, setDemoMode] = useState(false)
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleCreate = async () => {
    if (!nickname.trim()) {
      setError('Ingresá tu nombre')
      return
    }
    setSubmitting(true)
    try {
      const { code, playerId } = await roomService.createRoom({
        nickname: nickname.trim(),
        demoMode,
      })
      setSessionPlayerId(playerId)
      navigate(`/room/${code}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear sala')
    } finally {
      setSubmitting(false)
    }
  }

  const handleJoin = async () => {
    if (!nickname.trim()) {
      setError('Ingresá tu nombre')
      return
    }
    if (joinCode.trim().length < 4) {
      setError('Ingresá un código válido')
      return
    }
    setSubmitting(true)
    try {
      const result = await roomService.joinRoom(joinCode.trim(), nickname.trim())
      if ('error' in result) {
        setError(result.error)
        return
      }
      setSessionPlayerId(result.playerId)
      navigate(`/room/${joinCode.trim().toUpperCase()}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center px-6 py-8 safe-bottom min-h-[calc(100dvh-4rem)]">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-text-muted mb-4">
            Cursor Meetup · Mendoza
          </p>
          <h1 className="text-5xl font-normal tracking-[-0.03em] mb-3">Único</h1>
          <p className="text-text-secondary text-lg max-w-xs mx-auto leading-relaxed">
            Elegí el menor número que nadie más elija
          </p>
        </motion.div>

        {mode === 'menu' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full max-w-sm space-y-4"
          >
            <Card
              onClick={() => setMode('create')}
              className="hover:border-border-medium transition-colors"
            >
              <h2 className="text-xl font-medium mb-1">Crear sala</h2>
              <p className="text-text-secondary text-sm">
                Invitá amigos con un código de 6 letras
              </p>
            </Card>
            <Card
              onClick={() => setMode('join')}
              className="hover:border-border-medium transition-colors"
            >
              <h2 className="text-xl font-medium mb-1">Unirse</h2>
              <p className="text-text-secondary text-sm">
                Ingresá el código que te compartieron
              </p>
            </Card>
          </motion.div>
        )}

        {mode === 'create' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full max-w-sm space-y-5"
          >
            <Input
              label="Tu nombre"
              placeholder="Ana"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value)
                setError('')
              }}
              autoFocus
            />

            <label className="flex items-center gap-3 p-4 rounded-lg bg-bg-elevated border border-border-subtle cursor-pointer hover:border-border-medium transition-colors">
              <input
                type="checkbox"
                checked={demoMode}
                onChange={(e) => setDemoMode(e.target.checked)}
                className="w-5 h-5 rounded accent-text-primary"
              />
              <div>
                <span className="font-medium block">Modo demo</span>
                <span className="text-sm text-text-secondary">
                  Agrega bots para probar solo
                </span>
              </div>
            </label>

            {error && <p className="text-text-secondary text-sm">{error}</p>}

            <Button size="lg" onClick={handleCreate} disabled={submitting}>
              {submitting ? 'Creando...' : 'Crear sala'}
            </Button>
            <Button variant="ghost" onClick={() => setMode('menu')}>
              Volver
            </Button>
          </motion.div>
        )}

        {mode === 'join' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full max-w-sm space-y-5"
          >
            <Input
              label="Tu nombre"
              placeholder="Juan"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value)
                setError('')
              }}
              autoFocus
            />
            <Input
              label="Código de sala"
              placeholder="ABC123"
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value.toUpperCase())
                setError('')
              }}
              maxLength={6}
              className="uppercase tracking-widest text-center text-xl font-mono font-medium"
            />

            {error && <p className="text-text-secondary text-sm">{error}</p>}

            <Button size="lg" onClick={handleJoin} disabled={submitting}>
              {submitting ? 'Uniéndose...' : 'Unirse'}
            </Button>
            <Button variant="ghost" onClick={() => setMode('menu')}>
              Volver
            </Button>
          </motion.div>
        )}

        <footer className="mt-auto pt-12 text-center">
          <a
            href="https://cursor.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            Powered by Cursor
          </a>
        </footer>
      </div>
    </Layout>
  )
}
