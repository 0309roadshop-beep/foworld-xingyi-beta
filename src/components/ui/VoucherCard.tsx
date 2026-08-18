import { motion } from 'framer-motion'
import { Copy, Ticket } from 'lucide-react'
import { useState } from 'react'
import type { RedeemedVoucher } from '../../types'

interface VoucherCardProps {
  voucher: RedeemedVoucher
  index?: number
}

export function VoucherCard({ voucher, index = 0 }: VoucherCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(voucher.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`overflow-hidden rounded-xl border ${
        voucher.used
          ? 'border-void-600/40 bg-void-800/30 opacity-60'
          : 'border-gold-muted/30 bg-void-800/60'
      }`}
    >
      <div className="flex items-center justify-between border-b border-void-600/40 bg-void-900/50 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Ticket className="h-3.5 w-3.5 text-gold-muted" />
          <span className="text-xs text-mist-muted">{voucher.merchantName}</span>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] ${
            voucher.used
              ? 'bg-void-700 text-mist-faint'
              : 'bg-spirit-dim/40 text-spirit'
          }`}
        >
          {voucher.used ? '已使用' : '待核销'}
        </span>
      </div>

      <div className="p-3">
        <h4 className="mb-2 text-sm font-medium text-mist">{voucher.productName}</h4>
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-sm tracking-wider text-gold-bright">
            {voucher.code}
          </p>
          {!voucher.used && (
            <button
              type="button"
              onClick={handleCopy}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-void-600/60 px-2 py-1 text-[10px] text-mist-muted active:bg-void-700/40"
            >
              <Copy className="h-3 w-3" />
              {copied ? '已复制' : '复制'}
            </button>
          )}
        </div>
        <p className="mt-2 text-[10px] text-mist-faint">兑换于 {voucher.redeemedAt}</p>
      </div>
    </motion.div>
  )
}
