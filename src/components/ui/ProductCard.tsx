import { motion } from 'framer-motion'
import { Droplets } from 'lucide-react'
import type { MerchantProduct } from '../../types'

interface ProductCardProps {
  product: MerchantProduct
  balance: number
  onRedeem: (product: MerchantProduct) => void
  index?: number
}

export function ProductCard({
  product,
  balance,
  onRedeem,
  index = 0,
}: ProductCardProps) {
  const canAfford = balance >= product.price
  const soldOut = product.stock <= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-3 rounded-xl border border-void-600/60 bg-void-800/50 p-3"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-void-700/60 text-2xl">
        {product.emoji}
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-medium text-mist">{product.name}</h4>
        <p className="truncate text-[11px] text-mist-faint">{product.description}</p>
        <div className="mt-1.5 flex items-center gap-1">
          <Droplets className="h-3 w-3 text-spirit" />
          <span className="text-sm font-medium text-spirit">{product.price}</span>
          <span className="text-[10px] text-mist-faint">灵源滴</span>
        </div>
      </div>

      <button
        type="button"
        disabled={!canAfford || soldOut}
        onClick={() => onRedeem(product)}
        className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
          canAfford && !soldOut
            ? 'border border-gold-muted/40 bg-gold-muted/15 text-gold-bright active:scale-95'
            : 'border border-void-600/40 bg-void-700/40 text-mist-faint'
        }`}
      >
        {soldOut ? '已兑完' : canAfford ? '兑换' : '不足'}
      </button>
    </motion.div>
  )
}
