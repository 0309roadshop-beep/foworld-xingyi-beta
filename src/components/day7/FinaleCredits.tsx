import { motion } from 'framer-motion'
import { useCallback } from 'react'

const CREDIT_LINES = [
  '七日寻灵 · 终章落幕',
  'FOWORLD 贵州兴义内测',
  '',
  '寻灵师，谢谢你走完这段旅程。',
  '从青铜残影到地心阵核，',
  '从万峰云海到街心烟火，',
  '山河记得你来过的痕迹。',
  '',
  '百灵绘卷已成，罗盘微光将熄。',
  '愿喀斯特的风，仍在你耳畔低语。',
  '',
  '—— 罗盘灵',
]

export interface FinaleCreditsProps {
  onComplete?: () => void
}

/** 终局落幕 — 结局 Credits */
export function FinaleCredits({ onComplete }: FinaleCreditsProps) {
  const handleFinish = useCallback(() => {
    onComplete?.()
  }, [onComplete])

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-mist-faint/15 bg-void-950 py-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background: 'radial-gradient(circle at 50% 30%, rgba(56,189,248,0.12), transparent 60%)',
        }}
      />
      <motion.div
        className="relative z-10 flex flex-col items-center gap-3 px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2 }}
      >
        {CREDIT_LINES.map((line, i) =>
          line ? (
            <p
              key={i}
              className={`text-center leading-relaxed ${
                i === 0 ? 'text-sm font-medium tracking-[0.3em] text-gold-bright' : 'text-xs text-mist-muted'
              }`}
            >
              {line}
            </p>
          ) : (
            <div key={i} className="h-2" />
          ),
        )}
        <button
          type="button"
          onClick={handleFinish}
          className="mt-6 w-full max-w-xs rounded-xl border border-gold-muted/35 bg-gold-muted/10 py-3 text-sm font-medium text-gold-bright active:bg-gold-muted/20"
        >
          合上罗盘 · 圆满落幕
        </button>
      </motion.div>
    </div>
  )
}

export default FinaleCredits
