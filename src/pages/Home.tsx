import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { HowToPlaySheet } from '../components/HowToPlaySheet'
import { Layout } from '../components/layout/Layout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { roomService } from '../lib/roomService'
import { setSessionPlayerId } from '../lib/session'

function normalizeCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
}

export function Home() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const codeFromUrl = normalizeCode(searchParams.get('code') ?? '')
  const [nickname, setNickname] = useState('')
  const [joinCode, setJoinCode] = useState(codeFromUrl)
  const [demoMode, setDemoMode] = useState(false)
  const [mode, setMode] = useState<'join' | 'create'>('join')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [howToOpen, setHowToOpen] = useState(false)

  useEffect(() => {
    if (codeFromUrl) {
      setJoinCode(codeFromUrl)
      setMode('join')
    }
  }, [codeFromUrl])

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
    if (joinCode.trim().length < 6) {
      setError('Ingresá un código válido')
      return
    }
    setSubmitting(true)
    try {
      const code = joinCode.trim().toUpperCase()
      const result = await roomService.joinRoom(code, nickname.trim())
      if ('error' in result) {
        setError(result.error)
        return
      }
      setSessionPlayerId(result.playerId)
      navigate(`/room/${code}`)
    } finally {
      setSubmitting(false)
    }
  }

  const switchMode = (next: 'join' | 'create') => {
    setMode(next)
    setError('')
  }

  return (
    <Layout showHeader={false}>
      <div className="flex min-h-dvh flex-col px-6 safe-bottom">
        <div className="flex flex-1 flex-col items-center justify-center py-8 w-full">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <img
              src="/cursor-meetup-mendoza-trimmed.avif"
              alt="Cursor Meetup Mendoza"
              width={442}
              height={336}
              className="w-full max-w-[220px] mx-auto mb-4 h-auto"
              decoding="async"
            />
            <p className="text-text-secondary text-lg max-w-xs mx-auto leading-relaxed">
              Gana el número más bajo… si nadie más lo eligió
            </p>
            <button
              type="button"
              onClick={() => setHowToOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3-3" />
              </svg>
              ¿Cómo se juega?
            </button>
          </motion.div>

          {mode === 'join' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
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
                placeholder="CURSOR07"
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(normalizeCode(e.target.value))
                  setError('')
                }}
                maxLength={8}
                className="uppercase tracking-widest text-xl font-mono font-medium"
              />

              {error && <p className="text-text-secondary text-sm">{error}</p>}

              <Button size="lg" onClick={handleJoin} disabled={submitting}>
                {submitting ? 'Uniéndose...' : 'Unirse'}
              </Button>
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
              <Button variant="ghost" onClick={() => switchMode('join')}>
                Volver
              </Button>
            </motion.div>
          )}
        </div>

        <footer className="pb-8 text-center space-y-3 shrink-0">
          {mode === 'join' && (
            <button
              type="button"
              onClick={() => switchMode('create')}
              className="text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              ¿Organizás? <span className="underline underline-offset-2">Crear sala</span>
            </button>
          )}
          <a
            href="https://cursor.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            Powered by Cursor
          </a>
        </footer>
      </div>

      <HowToPlaySheet open={howToOpen} onClose={() => setHowToOpen(false)} />
    </Layout>
  )
}
