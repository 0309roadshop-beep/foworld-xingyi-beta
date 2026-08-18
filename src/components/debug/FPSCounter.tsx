import { useEffect, useRef, type MutableRefObject } from 'react'
import { createPortal } from 'react-dom'

interface FPSCounterProps {
  active?: boolean
  /** 由外部游戏主循环每帧调用，帧率与游戏循环一致 */
  samplerRef?: MutableRefObject<((now: number) => void) | null>
}

/**
 * 屏幕固定左上角 FPS — Portal 到 body，不受游戏容器 transform/overflow 影响
 */
export function FPSCounter({ active = true, samplerRef }: FPSCounterProps) {
  const labelRef = useRef<HTMLDivElement>(null)
  const framesRef = useRef(0)
  const lastRef = useRef(performance.now())
  const rafRef = useRef(0)

  useEffect(() => {
    if (!active) {
      if (samplerRef) samplerRef.current = null
      return
    }

    const publish = (now: number) => {
      framesRef.current += 1
      const elapsed = now - lastRef.current
      if (elapsed < 500) return
      const fps = Math.round((framesRef.current * 1000) / elapsed)
      framesRef.current = 0
      lastRef.current = now
      if (labelRef.current) labelRef.current.textContent = `${fps} FPS`
    }

    if (samplerRef) {
      samplerRef.current = publish
      return () => {
        samplerRef.current = null
      }
    }

    const loop = (now: number) => {
      publish(now)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [active, samplerRef])

  if (!active || typeof document === 'undefined') return null

  return createPortal(
    <div ref={labelRef} className="fps-counter" aria-hidden>
      -- FPS
    </div>,
    document.body,
  )
}
