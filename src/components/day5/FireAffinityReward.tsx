import { AnimatePresence, motion } from 'framer-motion'
import { Flame } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useGameStore } from '../../store/gameStore'

export const FIRE_AFFINITY_NAME = '浴火亲和'

export interface FireAffinityRewardProps {
  onComplete?: () => void
}

/**
 * 浴火亲和获取 — 须在「观演完毕」确认后进入
 * 仅解锁亲和并继续主线，不触发 endDay
 */
export function FireAffinityReward({ onComplete }: FireAffinityRewardProps) {
  const { unlockAffinity } = useGameStore()
  const [showFullscreen, setShowFullscreen] = useState(true)
  const [rewarded, setRewarded] = useState(false)

  useEffect(() => {
    if (!showFullscreen || rewarded) return
    const id = window.setTimeout(() => {
      unlockAffinity(FIRE_AFFINITY_NAME)
      setRewarded(true)
    }, 1200)
    return () => window.clearTimeout(id)
  }, [showFullscreen, rewarded, unlockAffinity])

  const handleDismiss = useCallback(() => {
    setShowFullscreen(false)
    onComplete?.()
  }, [onComplete])

  const fullscreen = (
    <AnimatePresence>
      {showFullscreen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-center overflow-hidden bg-black/92 px-6"
          style={{ width: '100vw', height: '100dvh' }}
        >
          <motion.div
            className="pointer-events-none absolute inset-0"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            style={{
              background:
                'radial-gradient(circle at 50% 45%, rgba(251,120,40,0.45) 0%, rgba(120,20,10,0.2) 40%, transparent 70%)',
            }}
          />

          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="pointer-events-none absolute left-1/2 h-40 w-40 -translate-x-1/2 rounded-full border border-orange-400/20"
              style={{ top: `${18 + i * 8}%` }}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.1, 0.5, 0.1] }}
              transition={{ duration: 2.2 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}

          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.3 }}
            className="relative z-10 mb-8 flex h-28 w-28 items-center justify-center"
          >
            <motion.div
              className="absolute inset-0 rounded-full bg-orange-500/35 blur-2xl"
              animate={{ opacity: [0.4, 0.9, 0.4], scale: [0.9, 1.15, 0.9] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
            <div
              className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-orange-300/60 bg-gradient-to-b from-orange-400/40 to-red-950/80 shadow-[0_0_60px_rgba(251,146,60,0.7)]"
              style={{
                clipPath: 'polygon(50% 0%, 92% 25%, 92% 75%, 50% 100%, 8% 75%, 8% 25%)',
              }}
            >
              <Flame className="h-11 w-11 text-orange-50 drop-shadow-[0_0_20px_rgba(251,146,60,1)]" />
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="relative z-10 text-center text-xl font-bold tracking-wide text-gold-bright"
          >
            成功解锁【{FIRE_AFFINITY_NAME}】！
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="relative z-10 mt-3 max-w-xs text-center text-xs leading-relaxed text-mist-muted"
          >
            非遗匠火已烙入灵脉。水寨千灯正在共鸣——结印之机已至。
          </motion.p>

          {rewarded && (
            <motion.button
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              type="button"
              onClick={handleDismiss}
              className="relative z-10 mt-10 w-full max-w-xs rounded-xl border border-orange-400/50 bg-orange-950/60 py-3.5 text-sm font-medium text-orange-50 active:scale-[0.98]"
            >
              灵火已融，前往千灯结印
            </motion.button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <>
      {typeof document !== 'undefined' && createPortal(fullscreen, document.body)}
      {!showFullscreen && (
        <p className="py-4 text-center text-sm text-spirit">【{FIRE_AFFINITY_NAME}】已解锁</p>
      )}
    </>
  )
}

export default FireAffinityReward
