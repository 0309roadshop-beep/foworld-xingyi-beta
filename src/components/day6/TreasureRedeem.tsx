import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useGameStore } from '../../store/gameStore'

const SNACKS = [
  {
    id: 'yangroufen',
    name: '兴义羊肉粉',
    shop: '街心花园 · 老字号粉铺',
    cost: 200,
    icon: '🍜',
    tint: 'from-amber-50/90 to-orange-50/70',
  },
  {
    id: 'jianfen',
    name: '特色剪粉',
    shop: '街心花园 · 晨间小摊',
    cost: 150,
    icon: '🥢',
    tint: 'from-stone-50/90 to-amber-50/60',
  },
  {
    id: 'binglianggao',
    name: '冰凉糕',
    shop: '街心花园 · 夏日冰坊',
    cost: 120,
    icon: '🧊',
    tint: 'from-sky-50/90 to-cyan-50/70',
  },
] as const

type Snack = (typeof SNACKS)[number]
type Phase = 'list' | 'confirm' | 'voucher' | 'burning' | 'done'

function VoucherSigil({ token }: { token: number }) {
  return (
    <div className="relative mx-auto mb-5 flex h-28 w-28 items-center justify-center">
      <motion.div
        className="absolute inset-0 rounded-full border border-gold-bright/40"
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute inset-2 rounded-full border border-dashed border-cyan-300/50"
        animate={{ rotate: -360 }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute inset-5 rounded-full bg-gradient-to-br from-gold-muted/30 to-cyan-400/20"
        animate={{ opacity: [0.4, 0.85, 0.4], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span className="relative font-mono text-[10px] tracking-widest text-gold-bright/90">
        {String(token).slice(-6)}
      </span>
    </div>
  )
}

interface RedeemVoucherProps {
  snack: Snack
  token: number
  onVerify: () => void
}

function RedeemVoucher({ snack, token, onVerify }: RedeemVoucherProps) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-void-950 px-5 py-8">
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(245,215,110,0.12),transparent_55%)]"
        animate={{ opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-gold-muted/35 bg-gradient-to-b from-[#1a1510] to-void-950 p-5 shadow-[0_0_40px_rgba(245,215,110,0.15)]"
      >
        <motion.div
          className="pointer-events-none absolute -inset-1 opacity-60"
          style={{
            background:
              'linear-gradient(105deg, transparent 40%, rgba(253,230,138,0.35) 50%, transparent 60%)',
            backgroundSize: '200% 100%',
          }}
          animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
        />

        <p className="relative mb-1 text-center text-[10px] tracking-[0.35em] text-gold-muted">
          FOWORLD · 实体馈赠核销券
        </p>
        <p className="relative mb-4 text-center text-lg font-semibold text-amber-100">
          {snack.name}
        </p>

        <VoucherSigil token={token} />

        <p className="relative mb-6 text-center text-sm leading-relaxed text-mist">
          请向店主展示此界面，点击下方按钮核销
        </p>

        <p className="relative mb-4 text-center text-[10px] text-mist-faint">
          {snack.shop} · 消耗 {snack.cost} 灵源
        </p>

        <button
          type="button"
          onClick={onVerify}
          className="relative w-full rounded-xl border border-gold-bright/50 bg-gradient-to-r from-gold-muted/30 to-amber-600/20 py-4 text-base font-semibold tracking-wide text-gold-bright shadow-[0_0_20px_rgba(245,215,110,0.2)] active:scale-[0.98]"
        >
          店主确认核销
        </button>
      </motion.div>
    </div>
  )
}

export interface TreasureRedeemProps {
  onComplete?: () => void
}

/** 烟火寻宝 — 街心花园 O2O 灵源兑换核销 */
export function TreasureRedeem({ onComplete }: TreasureRedeemProps) {
  const { lingyuan, spendLingyuan } = useGameStore()

  const [phase, setPhase] = useState<Phase>('list')
  const [pending, setPending] = useState<Snack | null>(null)
  const [redeemed, setRedeemed] = useState<Snack | null>(null)
  const [voucherToken] = useState(() => Date.now())

  const displayBalance = useMemo(() => lingyuan, [lingyuan])

  const handlePick = useCallback((snack: Snack) => {
    if (phase !== 'list' || lingyuan < snack.cost) return
    setPending(snack)
    setPhase('confirm')
  }, [phase, lingyuan])

  const handleConfirm = useCallback(() => {
    if (!pending || lingyuan < pending.cost) return
    setRedeemed(pending)
    setPhase('voucher')
  }, [pending, lingyuan])

  const handleVerify = useCallback(() => {
    if (!redeemed) return
    setPhase('burning')
    window.setTimeout(() => {
      spendLingyuan(redeemed.cost)
      setPhase('done')
      window.setTimeout(() => onComplete?.(), 1400)
    }, 900)
  }, [redeemed, spendLingyuan, onComplete])

  const handleCancel = useCallback(() => {
    setPending(null)
    setPhase('list')
  }, [])

  useEffect(() => {
    if (phase !== 'voucher' && phase !== 'burning') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [phase])

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-amber-200/20 bg-[#f8f4ec]/5 px-4 py-2.5">
        <span className="text-base">✨</span>
        <span className="text-sm text-mist">
          灵源：<span className="font-semibold text-gold-bright">{displayBalance}</span>
        </span>
      </div>

      <p className="mb-3 text-center text-[11px] text-mist-muted">
        烟火寻宝 · 街心花园 · 凝结灵源，换取人间烟火
      </p>

      <div className="space-y-3">
        {SNACKS.map((snack) => {
          const canAfford = lingyuan >= snack.cost
          return (
            <div
              key={snack.id}
              className={`overflow-hidden rounded-2xl border border-amber-900/15 bg-gradient-to-br ${snack.tint} shadow-[2px_3px_0_rgba(120,90,50,0.12)]`}
            >
              <div className="flex items-stretch gap-0 border-b border-amber-900/10 border-dashed bg-[#faf6ef]/95 p-3">
                <span className="flex w-14 shrink-0 items-center justify-center text-3xl">
                  {snack.icon}
                </span>
                <div className="min-w-0 flex-1 border-l border-dashed border-amber-900/15 pl-3">
                  <p className="text-sm font-bold text-stone-800">{snack.name}</p>
                  <p className="text-[10px] text-stone-500">{snack.shop}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end justify-center pl-2">
                  <span className="text-xs font-medium text-amber-800/80">-{snack.cost} 灵源</span>
                </div>
              </div>
              <div className="bg-[#f5f0e6]/80 px-3 py-2">
                <button
                  type="button"
                  disabled={!canAfford || phase !== 'list'}
                  onClick={() => handlePick(snack)}
                  className="w-full rounded-lg border border-amber-800/20 bg-white/60 py-2 text-xs font-medium text-amber-900 disabled:opacity-40 active:bg-white/90"
                >
                  {canAfford ? '兑换' : '灵源不足'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {phase === 'done' && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 text-center text-sm text-gold-bright"
        >
          享用人间烟火吧！
        </motion.p>
      )}

      {/* 二次确认 */}
      <AnimatePresence>
        {phase === 'confirm' && pending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-void-950/70 px-5 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="w-full max-w-xs rounded-2xl border border-amber-200/25 bg-[#faf6ef] p-5 text-center shadow-xl"
            >
              <p className="mb-2 text-sm font-medium text-stone-800">确认兑换</p>
              <p className="mb-5 text-[12px] leading-relaxed text-stone-600">
                是否消耗 <span className="font-semibold text-amber-800">{pending.cost} 灵源</span>
                凝结实体馈赠？
                <br />
                <span className="text-stone-500">{pending.name}</span>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 rounded-xl border border-stone-300 py-2.5 text-xs text-stone-600"
                >
                  再想想
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-1 rounded-xl border border-amber-700/30 bg-amber-100 py-2.5 text-xs font-medium text-amber-900"
                >
                  确认兑换
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 全屏动态核销券 */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {phase === 'voucher' && redeemed && (
              <motion.div
                key="voucher"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50"
              >
                <RedeemVoucher snack={redeemed} token={voucherToken} onVerify={handleVerify} />
              </motion.div>
            )}
            {phase === 'burning' && redeemed && (
              <motion.div
                key="burn"
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.85 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-void-950"
              >
                <motion.div
                  initial={{ scale: 1, rotate: 0 }}
                  animate={{ scale: 0.2, rotate: 12, opacity: 0 }}
                  transition={{ duration: 0.8, ease: 'easeIn' }}
                  className="h-48 w-72 rounded-2xl border border-gold-bright/40 bg-gradient-to-b from-amber-100/20 to-transparent"
                />
                {Array.from({ length: 12 }).map((_, i) => (
                  <motion.span
                    key={i}
                    className="absolute h-1 w-1 rounded-full bg-orange-400"
                    initial={{ opacity: 1, x: 0, y: 0 }}
                    animate={{
                      opacity: 0,
                      x: (Math.random() - 0.5) * 120,
                      y: (Math.random() - 0.5) * 120,
                    }}
                    transition={{ duration: 0.7, delay: i * 0.03 }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  )
}

export default TreasureRedeem
