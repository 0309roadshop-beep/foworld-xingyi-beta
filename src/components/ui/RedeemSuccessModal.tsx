import { motion } from 'framer-motion'
import { CheckCircle2, Copy, X } from 'lucide-react'
import { useState } from 'react'
import type { RedeemedVoucher } from '../../types'
import { ModalOverlay } from './ModalOverlay'

interface RedeemSuccessModalProps {
  voucher: RedeemedVoucher | null
  onClose: () => void
}

export function RedeemSuccessModal({ voucher, onClose }: RedeemSuccessModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!voucher) return
    try {
      await navigator.clipboard.writeText(voucher.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  if (!voucher) return null

  return (
    <ModalOverlay open onBackdropClick={onClose}>
      <motion.div
        initial={{ y: 16, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 12, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-gold-muted/20 bg-void-900 px-6 pb-6 pt-6"
      >
            <div className="mb-5 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-spirit" />
                <div>
                  <h3 className="text-lg font-medium text-mist">兑换成功</h3>
                  <p className="text-xs text-mist-muted">出示兑换码给商家核销</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-void-800 text-mist-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 rounded-xl border border-gold-muted/20 bg-void-800/60 p-4 text-center">
              <p className="mb-1 text-xs text-mist-muted">{voucher.merchantName}</p>
              <p className="mb-4 text-base font-medium text-gold-bright">
                {voucher.productName}
              </p>

              <div className="rounded-lg border border-dashed border-gold-muted/30 bg-void-950/80 px-4 py-3">
                <p className="mb-1 text-[10px] tracking-widest text-mist-faint">
                  兑换码
                </p>
                <p className="font-mono text-xl font-bold tracking-[0.2em] text-gold-bright">
                  {voucher.code}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-void-600/60 py-2 text-xs text-mist-muted active:bg-void-700/40"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? '已复制' : '复制兑换码'}
              </button>
            </div>

            <p className="text-center text-[11px] text-mist-faint">
              兑换码 7 天内有效 · 可在个人中心「我的券」中查看
            </p>
      </motion.div>
    </ModalOverlay>
  )
}
