import { motion } from 'framer-motion'
import { Droplets } from 'lucide-react'
import { useCallback } from 'react'
import { useGameStore } from '../../store/gameStore'

const AFFINITY_NAME = '御水亲和'

export interface WaterAffinityRewardProps {
  onComplete?: () => void
}

/**
 * 御水亲和徽章 — 静水试炼结算
 */
export function WaterAffinityReward({ onComplete }: WaterAffinityRewardProps) {
  const { unlockAffinity } = useGameStore()

  const handleAccept = useCallback(() => {
    unlockAffinity(AFFINITY_NAME)
    onComplete?.()
  }, [unlockAffinity, onComplete])

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-sky-900/40 px-4 py-8">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 40%, rgba(14,116,144,0.35) 0%, rgba(7,16,28,0.95) 55%, #050a12 100%)',
        }}
      />
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute left-1/2 h-32 w-32 -translate-x-1/2 rounded-full border border-cyan-400/15"
          style={{ top: `${28 + i * 8}%` }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 3.2 + i * 0.5, repeat: Infinity, delay: i * 0.4 }}
        />
      ))}

      <div className="relative z-10 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="relative mb-5 flex h-24 w-24 items-center justify-center"
        >
          <motion.div
            className="absolute inset-0 rounded-full bg-cyan-400/20 blur-xl"
            animate={{ opacity: [0.4, 0.75, 0.4], scale: [0.95, 1.08, 0.95] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          />
          <div
            className="relative flex h-20 w-20 items-center justify-center rounded-full border border-cyan-300/45 bg-gradient-to-b from-cyan-400/25 to-sky-900/60 shadow-[0_0_40px_rgba(34,211,238,0.45)]"
            style={{
              clipPath: 'polygon(50% 0%, 92% 25%, 92% 75%, 50% 100%, 8% 75%, 8% 25%)',
            }}
          >
            <Droplets className="h-9 w-9 text-cyan-100 drop-shadow-[0_0_12px_rgba(125,211,252,0.9)]" />
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mb-2 text-sm font-medium tracking-wide text-cyan-100"
        >
          完成静水试炼，地脉共鸣成功！
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mb-1 text-base font-semibold text-sky-bright"
        >
          【{AFFINITY_NAME}】
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="mb-6 max-w-xs text-xs leading-relaxed text-mist-muted"
        >
          你掌握了水流的呼吸。获得被动增益【御水亲和】——在未来面对狂暴水系磁场时，它将保护你的罗盘免受干扰。
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          type="button"
          onClick={handleAccept}
          className="w-full max-w-xs rounded-xl border border-cyan-400/40 bg-gradient-to-r from-cyan-800/50 to-sky-900/40 py-3.5 text-sm font-medium text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.15)] active:scale-[0.98]"
        >
          收下徽章
        </motion.button>
      </div>
    </div>
  )
}

export default WaterAffinityReward
