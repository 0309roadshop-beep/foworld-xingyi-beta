import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

export interface GorgeBridgeLinkProps {
  onComplete?: () => void
}

const SWIPE_THRESHOLD_PX = 72
const BRIDGE_TOAST_MS = 1000

/**
 * 谷底断桥解密 — 水平滑过连通地脉，完成后独立结算
 */
export function GorgeBridgeLink({ onComplete }: GorgeBridgeLinkProps) {
  const [bridgeLinked, setBridgeLinked] = useState(false)
  const [bridgeToast, setBridgeToast] = useState(false)
  const swipeStartX = useRef<number | null>(null)
  const completingRef = useRef(false)

  const handleBridgePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (bridgeLinked || completingRef.current) return
      swipeStartX.current = e.clientX
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [bridgeLinked],
  )

  const handleBridgePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (bridgeLinked || completingRef.current || swipeStartX.current == null) return
      const deltaX = e.clientX - swipeStartX.current
      swipeStartX.current = null
      if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return

      completingRef.current = true
      setBridgeLinked(true)
      setBridgeToast(true)
      window.setTimeout(() => {
        setBridgeToast(false)
        onComplete?.()
      }, BRIDGE_TOAST_MS)
    },
    [bridgeLinked, onComplete],
  )

  return (
    <div className="relative flex min-h-[min(68dvh,26rem)] w-full flex-col overflow-hidden rounded-xl border border-sky-muted/15 bg-void-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(56,189,248,0.08),transparent_55%)]" />

      <div className="relative z-10 flex flex-1 flex-col px-4 pb-6 pt-5">
        <p className="mb-1 text-center text-[10px] tracking-[0.35em] text-mist-muted">
          谷底断桥 · 地脉连线
        </p>
        <p className="mb-4 text-center text-xs text-mist-faint">
          湿滑栈道上，在屏幕任意位置水平滑过即可连通断桥地脉
        </p>

        <AnimatePresence>
          {bridgeToast && (
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-3 text-center text-sm text-spirit"
            >
              地脉连通，获得【断桥副歌】
            </motion.p>
          )}
        </AnimatePresence>

        <div
          className="relative mx-auto flex min-h-[14rem] w-full max-w-sm flex-1 touch-none flex-col justify-center"
          onPointerDown={handleBridgePointerDown}
          onPointerUp={handleBridgePointerUp}
          onPointerCancel={() => {
            swipeStartX.current = null
          }}
        >
          <div className="relative flex items-center justify-between px-2 py-8">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-full border-2 shadow-[0_0_24px_rgba(94,234,212,0.35)] ${
                bridgeLinked ? 'border-spirit bg-spirit/20' : 'border-sky-bright/60 bg-sky-deep/20'
              }`}
            >
              <span className="h-3 w-3 rounded-full bg-sky-bright shadow-[0_0_12px_rgba(125,211,252,0.9)]" />
            </div>

            <div className="relative mx-3 h-px flex-1 border-t-2 border-dashed border-mist-faint/35">
              {bridgeLinked && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                  className="absolute inset-y-[-1px] left-0 right-0 origin-left border-t-2 border-spirit shadow-[0_0_16px_rgba(94,234,212,0.65)]"
                />
              )}
            </div>

            <div
              className={`flex h-16 w-16 items-center justify-center rounded-full border-2 shadow-[0_0_24px_rgba(94,234,212,0.35)] ${
                bridgeLinked ? 'border-spirit bg-spirit/20' : 'border-sky-bright/60 bg-sky-deep/20'
              }`}
            >
              <span className="h-3 w-3 rounded-full bg-sky-bright shadow-[0_0_12px_rgba(125,211,252,0.9)]" />
            </div>
          </div>

          {!bridgeLinked && (
            <p className="mt-4 text-center text-[11px] tracking-widest text-sky-bright/70">
              ← 任意位置水平滑动 →
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default GorgeBridgeLink
