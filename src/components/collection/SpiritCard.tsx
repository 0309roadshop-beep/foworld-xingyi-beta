import { motion } from 'framer-motion'
import { Lock, Sparkles } from 'lucide-react'
import type { SpiritCatalogEntry } from '../../config/spiritCatalog'
import { RARITY_STYLE } from '../ui/FragmentCard'

const RARITY_LABEL: Record<SpiritCatalogEntry['rarity'], string> = {
  common: '普通',
  rare: '稀有',
  legendary: '传说',
}

interface SpiritCardProps {
  spirit: SpiritCatalogEntry
  unlocked: boolean
  index?: number
  onSelect?: (spirit: SpiritCatalogEntry) => void
}

export function SpiritCard({ spirit, unlocked, index = 0, onSelect }: SpiritCardProps) {
  const style = RARITY_STYLE[spirit.rarity]

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect?.(spirit)}
      aria-label={
        unlocked ? `查看${spirit.name}` : `查看 Day ${spirit.catalogDay} 未召唤幻兽灵影`
      }
      className={`spirit-catalog-card relative overflow-hidden rounded-2xl border text-left transition-shadow ${
        unlocked
          ? `${style.border} bg-void-800/70 shadow-[0_0_20px_rgba(52,211,153,0.08)] active:shadow-glow`
          : 'border-gold-muted/15 bg-void-900/72'
      }`}
    >
      {/* 卡面插画区 */}
      <div
        className={`spirit-catalog-art relative flex aspect-[9/14] items-end justify-center overflow-hidden ${
          unlocked
            ? 'bg-gradient-to-b from-jade-deep/20 via-void-900/40 to-void-950/80'
            : 'bg-gradient-to-b from-void-800/40 to-void-950/90'
        }`}
      >
        {unlocked ? (
          <>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_80%,rgba(52,211,153,0.15),transparent_60%)]" />
            <img
              src={spirit.assetUrl}
              alt={spirit.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-void-950/65 via-transparent to-transparent" />
            <Sparkles className="absolute right-2 top-2 h-3.5 w-3.5 text-gold-bright/70" />
          </>
        ) : (
          <>
            <img
              src={spirit.assetUrl}
              alt={`Day ${spirit.catalogDay} 未召唤幻兽灵影`}
              className="absolute inset-0 h-full w-full object-cover opacity-65 saturate-[0.72] contrast-90"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-void-950 via-void-950/10 to-void-950/25" />
            <div className="absolute inset-x-2 bottom-2.5 flex items-center justify-center gap-1.5 rounded-full border border-gold-muted/20 bg-void-950/78 px-2 py-1.5 backdrop-blur-md">
              <Lock className="h-3 w-3 text-gold-muted/75" />
              <span className="text-[9px] tracking-[0.16em] text-mist-muted">灵影未召唤</span>
            </div>
          </>
        )}

        <span className="absolute left-2 top-2 rounded-full border border-gold-muted/30 bg-void-950/70 px-1.5 py-0.5 text-[9px] text-gold-muted">
          Day {spirit.catalogDay}
        </span>
      </div>

      {/* 卡面信息 */}
      <div className="border-t border-void-600/40 p-2.5">
        <div className="mb-1 flex items-start justify-between gap-1">
          <h4
            className={`truncate text-sm font-medium ${unlocked ? 'text-mist' : 'text-mist-faint'}`}
          >
            {unlocked ? spirit.name : `Day ${spirit.catalogDay} · 未召唤`}
          </h4>
          <span
            className={`shrink-0 rounded px-1 py-0.5 text-[9px] ${unlocked ? style.badge : 'bg-void-700 text-mist-faint'}`}
          >
            {RARITY_LABEL[spirit.rarity]}
          </span>
        </div>
        <p className="line-clamp-2 text-[10px] leading-relaxed text-mist-faint">
          {unlocked ? spirit.description : '灵影已收录，完成对应主线关键步骤后显现真名'}
        </p>
        {unlocked && (
          <p className="mt-1.5 truncate text-[9px] text-jade-bright/80">
            来源 · {spirit.unlockQuest}
          </p>
        )}
      </div>
    </motion.button>
  )
}

export default SpiritCard
