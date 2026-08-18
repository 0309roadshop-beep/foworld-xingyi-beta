import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import type { SpiritCatalogEntry } from '../../config/spiritCatalog'
import { RARITY_STYLE } from '../ui/FragmentCard'

interface SpiritDetailSheetProps {
  spirit: SpiritCatalogEntry | null
  unlocked: boolean
  onClose: () => void
}

export function SpiritDetailSheet({ spirit, unlocked, onClose }: SpiritDetailSheetProps) {
  const style = spirit ? RARITY_STYLE[spirit.rarity] : null

  return (
    <AnimatePresence>
      {spirit && style && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-void-950/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="spirit-detail-sheet fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[92dvh] max-w-lg overflow-y-auto rounded-t-2xl border border-gold-muted/25 bg-gradient-to-b from-void-800/95 to-void-950/98 px-4 pb-8 pt-3 shadow-[0_-8px_40px_rgba(0,0,0,0.5)] scrollbar-none"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-gold-muted">
                <Sparkles className="h-3.5 w-3.5" />
                {unlocked ? '幻兽召唤卡' : '未召唤幻兽灵影'}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-mist-muted active:bg-void-700/60"
                aria-label="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div
              className={`mb-4 overflow-hidden rounded-xl border ${style.border} bg-void-900/60`}
            >
              <div className="relative flex max-h-[52dvh] min-h-[320px] items-center justify-center bg-gradient-to-b from-jade-deep/25 via-transparent to-void-950/80">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_90%,rgba(52,211,153,0.2),transparent_55%)]" />
                <img
                  src={spirit.assetUrl}
                  alt={unlocked ? spirit.name : `Day ${spirit.catalogDay} 未召唤幻兽灵影`}
                  className={`max-h-[52dvh] w-full object-contain drop-shadow-[0_12px_32px_rgba(0,0,0,0.55)] ${unlocked ? '' : 'saturate-75'}`}
                />
                {!unlocked && (
                  <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-gold-muted/25 bg-void-950/80 px-3 py-1.5 backdrop-blur-md">
                    <span className="h-1.5 w-1.5 rounded-full bg-gold-muted/70" />
                    <span className="whitespace-nowrap text-[9px] tracking-[0.18em] text-gold-muted">
                      待召唤
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-medium text-gold-bright">
                {unlocked ? spirit.name : `Day ${spirit.catalogDay} · 未召唤灵影`}
              </h3>
              <span className={`rounded px-1.5 py-0.5 text-[10px] ${style.badge}`}>
                {unlocked
                  ? spirit.rarity === 'legendary'
                    ? '传说'
                    : spirit.rarity === 'rare'
                      ? '稀有'
                      : '普通'
                  : '未鉴定'}
              </span>
              {unlocked && (
                <span className="rounded border border-void-600/60 px-1.5 py-0.5 text-[10px] text-mist-muted">
                  {spirit.element}系
                </span>
              )}
              <span className="rounded border border-gold-muted/30 px-1.5 py-0.5 text-[10px] text-gold-muted">
                Day {spirit.catalogDay}
              </span>
            </div>

            <p className="mb-2 text-sm text-mist">
              {unlocked ? spirit.description : '灵影已经进入百灵收藏，真名与元素仍被封印。'}
            </p>
            <p className="mb-4 text-xs leading-relaxed text-mist-faint">
              {unlocked
                ? spirit.lore
                : '完成对应主线关键步骤后，这张灵影将正式苏醒并显现完整传说。'}
            </p>

            <div className="rounded-lg border border-void-600/50 bg-void-900/50 px-3 py-2.5">
              <p className="text-[10px] text-mist-muted">{unlocked ? '召唤来源' : '召唤条件'}</p>
              <p className="text-xs text-jade-bright">
                {unlocked ? spirit.unlockQuest : '完成对应主线召唤任务'}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default SpiritDetailSheet
