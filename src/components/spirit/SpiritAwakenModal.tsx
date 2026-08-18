import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { getSpiritByName } from '../../config/spiritCatalog'
import { ModalOverlay } from '../ui/ModalOverlay'

interface SpiritAwakenModalProps {
  spiritName: string | null
  onCollect: () => void
}

/**
 * 精灵唤醒全屏仪式感弹窗 — 最高层级，阻塞主线 nextStep 直至玩家收录
 */
export function SpiritAwakenModal({ spiritName, onCollect }: SpiritAwakenModalProps) {
  const activeName = spiritName ?? ''
  const entry = spiritName ? getSpiritByName(spiritName) : undefined
  const imageUrl = entry?.assetUrl ?? '/assets/puzzle-copper-chariot.png'

  return (
    <ModalOverlay open={Boolean(spiritName)}>
      <div className="relative flex w-full max-w-sm flex-col items-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 22, stiffness: 200 }}
          className="pointer-events-none absolute left-1/2 top-1/2 h-[min(80vw,320px)] w-[min(80vw,320px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.35)_0%,transparent_70%)]"
        />

        <motion.div
          initial={{ scale: 0.88, y: 24, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 280 }}
          className="relative z-10 w-full overflow-hidden rounded-2xl border border-gold-bright/40 bg-gradient-to-b from-void-800/95 to-void-950/98 shadow-[0_0_60px_rgba(212,175,55,0.25)]"
        >
            <div className="border-b border-gold-muted/20 bg-gradient-to-r from-jade-deep/30 via-gold-muted/10 to-jade-deep/30 px-4 py-3 text-center">
              <div className="mb-1 flex items-center justify-center gap-1.5 text-[10px] tracking-[0.4em] text-gold-muted">
                <Sparkles className="h-3.5 w-3.5 text-gold-bright" />
                灵韵觉醒
              </div>
              <h2 className="text-lg font-medium text-gold-bright">
                恭喜唤醒【{activeName}】
              </h2>
            </div>

            <div className="flex flex-col items-center px-5 py-6">
              {/* 精灵素材占位 — 可替换为图鉴 PNG */}
              <div className="relative mb-4 flex h-40 w-40 items-center justify-center overflow-hidden rounded-2xl border border-gold-muted/35 bg-void-900/80 shadow-[0_0_32px_rgba(52,211,153,0.15)]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_80%,rgba(212,175,55,0.2),transparent_60%)]" />
                <img
                  src={imageUrl}
                  alt={activeName}
                  className="relative h-[85%] w-auto object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
                />
              </div>

              {entry?.description && (
                <p className="mb-5 text-center text-xs leading-relaxed text-mist-muted">
                  {entry.description}
                </p>
              )}

              <button
                type="button"
                onClick={onCollect}
                className="w-full rounded-xl bg-gradient-to-r from-gold-muted to-gold-bright py-3.5 text-sm font-semibold text-void-950 shadow-glow active:scale-[0.98]"
              >
                收录图鉴
              </button>
            </div>
        </motion.div>
      </div>
    </ModalOverlay>
  )
}

export default SpiritAwakenModal
