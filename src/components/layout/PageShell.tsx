import type { ReactNode } from 'react'
import { Layout } from './Layout'

interface PageShellProps {
  children: ReactNode
  presentationMode?: boolean
}

export function PageShell({ children, presentationMode }: PageShellProps) {
  if (presentationMode) {
    return <>{children}</>
  }

  return <Layout showHeader={false}>{children}</Layout>
}
