import { motion } from 'framer-motion'
import { Flame, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

export interface IronFlowerConfirmProps {
  /** 观演冷却秒数，0 表示可立即点击 */
  watchCooldownSeconds?: number
  onComplete?: () => void
}

/**
 * 打铁花观演确认 — 玩家亲证非遗灵火表演后，方可进入浴火亲和结算
 */
export function IronFlowerConfirm({
  watchCooldownSeconds = 8,
  onComplete,
}: IronFlowerConfirmProps) {
  const [remaining, setRemaining] = useState(Math.max(0, watchCooldownSeconds))
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (remaining <= 0) return
    const id = window.setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [remaining])

  const handleConfirm = useCallback(() => {
    if (remaining > 0 || confirmed) return
    setConfirmed(true)
    window.setTimeout(() => onComplete?.(), 400)
  }, [remaining, confirmed, onComplete])

  const ready = remaining <= 0

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-amber-900/40 bg-[#120808]/95 px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(245,100,30,0.22),transparent_65%)]" />

      <div className="relative z-10 flex flex-col items-center text-center">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5], scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 2.4, repeat: Infinity }}
          className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-orange-400/40 bg-orange-950/50"
        >
          <Flame className="h-8 w-8 text-orange-300" />
        </motion.div>

        <p className="mb-1 text-sm font-medium text-orange-100">水寨中心露台 · 非遗打铁花</p>
        <p className="mb-5 max-w-xs text-[11px] leading-relaxed text-mist-muted">
          铁水泼向夜空，化作漫天星雨。请在安全区域静观表演，待星火落定后再汲取灵火。
        </p>

        {!ready && (
          <p className="mb-4 flex items-center gap-1.5 text-xs text-amber-200/80">
            <Sparkles className="h-3.5 w-3.5" />
            观演中… {remaining}s 后可汲取灵火
          </p>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!ready || confirmed}
          className="w-full max-w-xs rounded-xl border border-orange-400/50 bg-gradient-to-r from-orange-900/60 to-red-950/55 py-3.5 text-sm font-semibold tracking-wide text-orange-50 shadow-[0_0_28px_rgba(251,146,60,0.25)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
        >
          【 观演完毕：汲取非遗灵火 】
        </button>
      </div>
    </div>
  )
}

export default IronFlowerConfirm
