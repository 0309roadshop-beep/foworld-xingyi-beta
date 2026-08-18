import type { ReactNode } from 'react'

interface DecorativePanelProps {
  children: ReactNode
  className?: string
  glow?: boolean
}

export function DecorativePanel({
  children,
  className = '',
  glow = false,
}: DecorativePanelProps) {
  return (
    <div
      className={`mythic-panel relative overflow-hidden ${glow ? 'mythic-panel-glow' : ''} ${className}`}
    >
      {/* 四角装饰 */}
      <span className="panel-corner panel-corner-tl" />
      <span className="panel-corner panel-corner-tr" />
      <span className="panel-corner panel-corner-bl" />
      <span className="panel-corner panel-corner-br" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
