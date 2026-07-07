import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'unico:presentationMode'

export function usePresentationMode(isHost: boolean) {
  const [presentationMode, setPresentationModeState] = useState(false)

  useEffect(() => {
    if (!isHost) {
      setPresentationModeState(false)
      return
    }
    try {
      setPresentationModeState(sessionStorage.getItem(STORAGE_KEY) === 'true')
    } catch {
      setPresentationModeState(false)
    }
  }, [isHost])

  const setPresentationMode = useCallback(
    (enabled: boolean) => {
      if (!isHost) return
      setPresentationModeState(enabled)
      try {
        if (enabled) {
          sessionStorage.setItem(STORAGE_KEY, 'true')
        } else {
          sessionStorage.removeItem(STORAGE_KEY)
        }
      } catch {
        /* ignore */
      }
    },
    [isHost],
  )

  const togglePresentationMode = useCallback(() => {
    setPresentationMode(!presentationMode)
  }, [presentationMode, setPresentationMode])

  return {
    presentationMode: isHost && presentationMode,
    setPresentationMode,
    togglePresentationMode,
  }
}
