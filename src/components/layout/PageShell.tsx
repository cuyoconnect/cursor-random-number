import type { ReactNode } from 'react'
import { Layout } from './Layout'

interface PageShellProps {
  children: ReactNode
  presentationMode?: boolean
  isHost?: boolean
  onTogglePresentation?: () => void
}

export function PageShell({
  children,
  presentationMode,
  isHost,
  onTogglePresentation,
}: PageShellProps) {
  if (presentationMode) {
    return <>{children}</>
  }

  return (
    <Layout isHost={isHost} onTogglePresentation={onTogglePresentation}>
      {children}
    </Layout>
  )
}
