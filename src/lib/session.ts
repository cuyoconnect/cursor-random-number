const SESSION_KEY = 'unico_session'

export interface PlayerSession {
  playerId: string
  sessionToken: string
}

function generateId(): string {
  return crypto.randomUUID()
}

export function getSession(): PlayerSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PlayerSession
  } catch {
    return null
  }
}

export function getOrCreateSession(): PlayerSession {
  const existing = getSession()
  if (existing) return existing
  const session: PlayerSession = {
    playerId: generateId(),
    sessionToken: generateId(),
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function setSessionPlayerId(playerId: string): void {
  const session = getOrCreateSession()
  session.playerId = playerId
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function getActiveRoomCode(): string | null {
  return localStorage.getItem('unico_active_room')
}

export function setActiveRoomCode(code: string | null): void {
  if (code) {
    localStorage.setItem('unico_active_room', code)
  } else {
    localStorage.removeItem('unico_active_room')
  }
}
