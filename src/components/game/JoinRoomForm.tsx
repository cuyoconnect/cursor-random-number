import { motion } from 'framer-motion'
import { useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { roomService } from '../../lib/roomService'
import { setSessionPlayerId } from '../../lib/session'

interface JoinRoomFormProps {
  initialCode?: string
  lockCode?: boolean
  onJoined: (code: string) => void
}

function normalizeCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
}

export function JoinRoomForm({
  initialCode = '',
  lockCode = false,
  onJoined,
}: JoinRoomFormProps) {
  const [nickname, setNickname] = useState('')
  const [joinCode, setJoinCode] = useState(() => normalizeCode(initialCode))
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
      const result = await roomService.joinRoom(joinCode.trim(), nickname.trim())
      if ('error' in result) {
        setError(result.error)
        return
      }
      setSessionPlayerId(result.playerId)
      onJoined(joinCode.trim().toUpperCase())
    } finally {
      setSubmitting(false)
    }
  }

  return (
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
          if (lockCode) return
          setJoinCode(normalizeCode(e.target.value))
          setError('')
        }}
        readOnly={lockCode}
        maxLength={8}
        className="uppercase tracking-widest text-xl font-mono font-medium"
      />

      {error && <p className="text-text-secondary text-sm">{error}</p>}

      <Button size="lg" onClick={handleJoin} disabled={submitting}>
        {submitting ? 'Uniéndose...' : 'Unirse'}
      </Button>
    </motion.div>
  )
}
