import type { ReactNode } from 'react'
import { MythicBackground } from './MythicBackground'

interface MobileShellProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'immersive'
}

export function MobileShell({
  children,
  className = '',
  variant = 'default',
}: MobileShellProps) {
  return (
    <div
      className={`realm-experience-shell mobile-shell ${variant === 'immersive' ? 'mobile-shell-immersive' : ''} ${className}`}
    >
      <MythicBackground />
      {children}
    </div>
  )
}
