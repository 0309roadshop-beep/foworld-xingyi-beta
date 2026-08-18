import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { preventGhostActivation } from '../../utils/touchInteraction'
import { RockSilhouette, SeaLionSilhouette } from './gorgeSilhouettes'

export interface GorgeSeaLionTraceProps {
  onComplete?: () => void
}

const SILHOUETTES = [
  { id: 'rock-a', node: <RockSilhouette className="h-full w-full" /> },
  { id: 'sealion', node: <SeaLionSilhouette className="h-full w-full" /> },
  { id: 'rock-b', node: <RockSilhouette className="h-full w-full" /> },
] as const

const CORRECT_SEALION_INDEX = 1
const COMPLETE_MS = 1200

/**
 * 海狮飞瀑波段解密 — 辨识海狮化石灵纹共鸣，完成后独立结算
 */
export function GorgeSeaLionTrace({ onComplete }: GorgeSeaLionTraceProps) {
  const [sealionToast, setSealionToast] = useState(false)
  const [sealionLit, setSealionLit] = useState(false)
  const [shakeId, setShakeId] = useState<string | null>(null)
  const completingRef = useRef(false)

  const handleSealionPick = useCallback(
    (index: number, id: string) => {
      if (sealionLit || completingRef.current) return

      if (index !== CORRECT_SEALION_INDEX) {
        setShakeId(id)
        window.setTimeout(() => setShakeId(null), 420)
        return
      }

      completingRef.current = true
      setSealionLit(true)
      setSealionToast(true)
      window.setTimeout(() => {
        setSealionToast(false)
        onComplete?.()
      }, COMPLETE_MS)
    },
    [sealionLit, onComplete],
  )

  return (
    <div className="relative flex min-h-[min(68dvh,26rem)] w-full flex-col overflow-hidden rounded-xl border border-sky-muted/15 bg-void-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(56,189,248,0.08),transparent_55%)]" />

      <div className="relative z-10 flex flex-1 flex-col px-4 pb-6 pt-5">
        <p className="mb-1 text-center text-[10px] tracking-[0.35em] text-mist-muted">
          海狮飞瀑 · 波段解密
        </p>
        <p className="mb-4 text-center text-xs text-mist-faint">
          飞瀑轰鸣中辨识灵纹频段，点击发出共鸣的海狮化石剪影
        </p>

        <AnimatePresence>
          {sealionToast && (
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-3 text-center text-sm text-gold-bright"
            >
              化石共鸣，获得【海狮和弦】
            </motion.p>
          )}
        </AnimatePresence>

        <div className="mx-auto grid w-full max-w-md flex-1 grid-cols-3 gap-3 content-center">
          {SILHOUETTES.map((item, index) => {
            const isCorrect = index === CORRECT_SEALION_INDEX
            const lit = isCorrect && sealionLit
            const shaking = shakeId === item.id

            return (
              <button
                key={item.id}
                type="button"
                aria-label={`岩石剪影 ${index + 1}`}
                onPointerDown={(e: ReactPointerEvent<HTMLButtonElement>) => {
                  preventGhostActivation(e)
                  handleSealionPick(index, item.id)
                }}
                disabled={sealionLit}
                className={`flex min-h-[9.5rem] flex-col items-center justify-end rounded-2xl border px-2 pb-4 pt-6 transition-colors ${
                  lit
                    ? 'border-gold-bright/70 bg-gold-muted/10 shadow-[0_0_28px_rgba(212,175,55,0.35)]'
                    : 'border-mist-faint/20 bg-void-900/50 active:bg-void-800/60'
                } ${shaking ? 'animate-[gorge-shake_0.4s_ease-in-out]' : ''}`}
                style={{ touchAction: 'none' }}
              >
                <div
                  className={`mb-3 flex h-24 w-full items-end justify-center text-mist-faint/70 ${
                    lit ? 'text-gold-bright/90' : ''
                  }`}
                >
                  {item.node}
                </div>
                <span className="text-[10px] text-mist-muted">灵纹 {index + 1}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default GorgeSeaLionTrace
