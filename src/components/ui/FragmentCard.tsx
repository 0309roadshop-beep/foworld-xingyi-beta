import { motion } from 'framer-motion'
import type { Fragment, FragmentRarity } from '../../types'

const RARITY_STYLE: Record<
  FragmentRarity,
  { border: string; badge: string; label: string }
> = {
  common: {
    border: 'border-mist-faint/20',
    badge: 'bg-void-700 text-mist-muted',
    label: '普通',
  },
  rare: {
    border: 'border-jade/40',
    badge: 'bg-jade-deep/60 text-jade-bright',
    label: '稀有',
  },
  legendary: {
    border: 'border-gold-muted/50 shadow-glow',
    badge: 'bg-gold-muted/20 text-gold-bright',
    label: '传说',
  },
}

interface FragmentCardProps {
  fragment: Fragment
  index?: number
}

export function FragmentCard({ fragment, index = 0 }: FragmentCardProps) {
  const style = RARITY_STYLE[fragment.rarity]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className={`relative rounded-xl border bg-void-800/60 p-3 ${style.border}`}
    >
      {fragment.quantity > 1 && (
        <span className="absolute right-2 top-2 rounded-full bg-void-900/80 px-1.5 py-0.5 text-[10px] text-mist-muted">
          ×{fragment.quantity}
        </span>
      )}

      <div className="mb-2 flex h-12 items-center justify-center text-3xl">
        {fragment.emoji}
      </div>

      <h4 className="mb-1 truncate text-sm font-medium text-mist">
        {fragment.name}
      </h4>

      <span
        className={`mb-2 inline-block rounded px-1.5 py-0.5 text-[10px] ${style.badge}`}
      >
        {style.label}
      </span>

      <p className="line-clamp-2 text-[11px] leading-relaxed text-mist-faint">
        {fragment.description}
      </p>

      <p className="mt-2 truncate text-[10px] text-mist-faint/70">
        来源 · {fragment.source}
      </p>
    </motion.div>
  )
}

export { RARITY_STYLE }
