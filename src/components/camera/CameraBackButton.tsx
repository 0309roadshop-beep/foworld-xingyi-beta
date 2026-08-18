import { ChevronLeft } from 'lucide-react'
import type { PointerEvent as ReactPointerEvent } from 'react'

export interface CameraBackButtonProps {
  onClick: () => void
  /** 按钮文案，默认「返回」 */
  label?: string
  className?: string
}

/**
 * AR / 取景画面左上角安全返回按钮（适配刘海屏 safe-area）
 */
export function CameraBackButton({ onClick, label = '返回', className }: CameraBackButtonProps) {
  return (
    <button
      type="button"
      onPointerDown={(e: ReactPointerEvent<HTMLButtonElement>) => {
        e.preventDefault()
        onClick()
      }}
      className={`camera-back-btn ${className ?? ''}`}
      style={{ touchAction: 'manipulation' }}
      aria-label={label}
    >
      <ChevronLeft className="camera-back-btn__icon" aria-hidden />
      <span>{label}</span>
    </button>
  )
}
