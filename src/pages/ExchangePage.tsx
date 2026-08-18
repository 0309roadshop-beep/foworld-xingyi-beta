import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Droplets,
  Store,
  Ticket,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MobileShell } from '../components/layout/MobileShell'
import { ProductCard } from '../components/ui/ProductCard'
import { RedeemSuccessModal } from '../components/ui/RedeemSuccessModal'
import { usePlayer } from '../context/PlayerContext'
import { MOCK_MERCHANTS, getMerchantProducts } from '../mock/data'
import type { MerchantProduct, RedeemedVoucher } from '../types'

export default function ExchangePage() {
  const navigate = useNavigate()
  const { player, vouchers, redeemProduct } = usePlayer()
  const [selectedMerchantId, setSelectedMerchantId] = useState(MOCK_MERCHANTS[0].id)
  const [successVoucher, setSuccessVoucher] = useState<RedeemedVoucher | null>(
    null,
  )

  const selectedMerchant = MOCK_MERCHANTS.find((m) => m.id === selectedMerchantId)!
  const products = getMerchantProducts(selectedMerchantId)
  const unusedVouchers = vouchers.filter((v) => !v.used)

  const handleRedeem = (product: MerchantProduct) => {
    const voucher = redeemProduct(product.id)
    if (voucher) setSuccessVoucher(voucher)
  }

  return (
    <MobileShell className="flex flex-col">
      <header className="relative z-10 flex shrink-0 items-center gap-3 px-4 py-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-muted/20 bg-void-800/80 transition-colors active:bg-void-700"
        >
          <ArrowLeft className="h-4 w-4 text-mist" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-medium text-mist">灵源兑换</h1>
          <p className="text-[11px] text-mist-faint">合作商户 · 灵源滴换好礼</p>
        </div>
        {unusedVouchers.length > 0 && (
          <button
            type="button"
            onClick={() => navigate('/profile', { state: { tab: 'vouchers' } })}
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-gold-muted/20 bg-void-800/80"
          >
            <Ticket className="h-4 w-4 text-gold-muted" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-spirit text-[9px] font-bold text-void-900">
              {unusedVouchers.length}
            </span>
          </button>
        )}
      </header>

      <div className="relative z-10 flex-1 overflow-y-auto overscroll-none px-4 pb-6 scrollbar-none">
        {/* 余额 */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel mb-5 flex items-center justify-between p-4"
        >
          <div>
            <p className="text-xs text-mist-muted">可用灵源滴</p>
            <div className="flex items-center gap-1.5">
              <Droplets className="h-5 w-5 text-spirit" />
              <span className="text-2xl font-medium text-spirit">
                {player.spiritDrops}
              </span>
            </div>
          </div>
          <div className="text-right text-[11px] text-mist-faint">
            <p>完成任务 · AR 扫描</p>
            <p>积累灵源即可兑换</p>
          </div>
        </motion.div>

        {/* 商户选择 */}
        <div className="mb-4 flex gap-2">
          {MOCK_MERCHANTS.map((merchant) => (
            <button
              key={merchant.id}
              type="button"
              onClick={() => setSelectedMerchantId(merchant.id)}
              className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl border p-3 transition-all ${
                selectedMerchantId === merchant.id
                  ? 'border-gold-muted/50 bg-gold-muted/10 shadow-glow'
                  : 'border-void-600/60 bg-void-800/40'
              }`}
            >
              <span className="text-2xl">{merchant.emoji}</span>
              <span
                className={`text-center text-[11px] font-medium leading-tight ${
                  selectedMerchantId === merchant.id
                    ? 'text-gold-bright'
                    : 'text-mist-muted'
                }`}
              >
                {merchant.name}
              </span>
            </button>
          ))}
        </div>

        {/* 商户详情 */}
        <motion.div
          key={selectedMerchantId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 rounded-xl border border-sky/20 bg-sky-deep/15 p-3"
        >
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-jade" />
            <span className="text-sm font-medium text-mist">{selectedMerchant.name}</span>
          </div>
          <p className="mt-1 text-xs text-mist-muted">{selectedMerchant.tagline}</p>
          <p className="mt-0.5 text-[11px] text-mist-faint">{selectedMerchant.address}</p>
        </motion.div>

        {/* 商品列表 */}
        <div className="mb-2 flex items-center gap-2">
          <div className="h-px flex-1 bg-gradient-to-r from-gold-muted/30 to-transparent" />
          <span className="text-xs tracking-widest text-mist-muted">可兑换商品</span>
          <div className="h-px flex-1 bg-gradient-to-l from-gold-muted/30 to-transparent" />
        </div>

        <div className="space-y-2">
          {products.map((product, i) => (
            <ProductCard
              key={product.id}
              product={product}
              balance={player.spiritDrops}
              onRedeem={handleRedeem}
              index={i}
            />
          ))}
        </div>
      </div>

      <RedeemSuccessModal
        voucher={successVoucher}
        onClose={() => setSuccessVoucher(null)}
      />
    </MobileShell>
  )
}
