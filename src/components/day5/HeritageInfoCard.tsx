import { motion } from 'framer-motion'
import { BookOpen } from 'lucide-react'
import type { HeritagePhotoItem } from '../../config/day5HeritageConfig'

export interface HeritageInfoCardProps {
  point: HeritagePhotoItem
  onCollect: () => void
}

/** 非遗科普信息卡 — 上传核验通过后弹出，点击「收录」方算完成 */
export function HeritageInfoCard({ point, onCollect }: HeritageInfoCardProps) {
  return (
    <motion.div
      initial={{ scale: 0.88, opacity: 0, y: 16 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 340, damping: 24 }}
      className="mx-auto w-[min(92vw,320px)] overflow-hidden rounded-2xl border border-gold-muted/35 bg-gradient-to-b from-[#1a2420] to-[#0d1412] shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
    >
      <div className="border-b border-white/8 bg-gradient-to-r from-teal-muted/15 to-transparent px-4 py-3">
        <div className="flex items-center gap-2 text-gold-muted">
          <BookOpen className="h-4 w-4" />
          <span className="text-[10px] tracking-[0.25em]">非遗图鉴 · InfoCard</span>
        </div>
      </div>

      <div className="px-4 py-4">
        <h3 className="mb-1 text-center text-lg font-semibold tracking-wide text-gold-bright">
          {point.title}
        </h3>
        <p className="mb-3 text-center text-[11px] text-mist-muted">{point.subtitle}</p>

        <div className="mb-4 rounded-xl border border-white/8 bg-black/25 px-3 py-3">
          <p className="text-[11px] leading-relaxed text-mist">{point.lore}</p>
        </div>

        <p className="mb-4 text-center text-[10px] text-mist-faint">
          系统图鉴已记录该非遗印记，收录后将写入今日灵纹档案
        </p>

        <button
          type="button"
          onClick={onCollect}
          className="w-full rounded-xl border border-gold-muted/50 bg-gradient-to-r from-gold-muted/25 to-amber-100/20 py-3.5 text-sm font-semibold tracking-widest text-amber-100 shadow-[0_0_20px_rgba(245,215,110,0.2)] active:scale-[0.98]"
        >
          收录
        </button>
      </div>
    </motion.div>
  )
}

export default HeritageInfoCard
