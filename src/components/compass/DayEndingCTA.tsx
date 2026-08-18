import { motion } from 'framer-motion'

export interface DayEndingCTAProps {
  day: number
  onEndDay: () => void
  className?: string
}

/**
 * 统一「今日圆满」收束面板 — Day 2~7 主线完成后由玩家手动结束行程
 */
export function DayEndingCTA({ day, onEndDay, className = '' }: DayEndingCTAProps) {
  return (
    <div
      className={`flex min-h-[200px] flex-col items-center justify-center px-4 py-8 text-center ${className}`}
    >
      <p className="mb-2 text-xs tracking-[0.35em] text-spirit">DAY {day} · 今日圆满</p>
      <p className="mb-1 text-sm leading-relaxed text-mist">
        今日主线任务已全部完成
      </p>
      <p className="mb-5 max-w-xs text-[11px] leading-relaxed text-mist-faint">
        可继续完成下方支线，或点击下方按钮收束今日行程
      </p>
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={onEndDay}
        className="w-full max-w-xs rounded-xl border border-gold-muted/35 bg-gold-muted/10 py-3 text-sm font-medium text-gold-bright active:bg-gold-muted/20"
      >
        结束今日行程
      </motion.button>
    </div>
  )
}

export default DayEndingCTA
