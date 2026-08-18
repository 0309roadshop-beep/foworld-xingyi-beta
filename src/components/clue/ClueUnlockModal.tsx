import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { ModalOverlay } from '../ui/ModalOverlay'

export interface ClueUnlockPayload {
  artifactName: string
  hint: string
  successTitle?: string
  accent?: 'gold' | 'jade'
}

interface ClueUnlockModalProps {
  open: boolean
  clue: ClueUnlockPayload | null
  onConfirm: () => void
}

const ACCENT_STYLES = {
  gold: {
    border: 'border-gold-muted/35',
    shadow: 'shadow-[0_0_40px_rgba(232,197,71,0.18)]',
    iconBorder: 'border-gold-muted/40 bg-gold-deep/20',
    icon: 'text-gold-bright',
    title: 'text-gold-bright',
    button: 'bg-gold-deep/35 text-gold-bright ring-gold-muted/40',
  },
  jade: {
    border: 'border-jade-muted/35',
    shadow: 'shadow-[0_0_40px_rgba(45,212,168,0.15)]',
    iconBorder: 'border-jade-muted/40 bg-jade-deep/25',
    icon: 'text-jade-bright',
    title: 'text-jade-bright',
    button: 'bg-jade-deep/50 text-jade-bright ring-jade-muted/40',
  },
} as const

/**
 * 跨步骤线索收录弹窗 — 日月田 / 八卦田 AR 等完成后展示
 */
export function ClueUnlockModal({ open, clue, onConfirm }: ClueUnlockModalProps) {
  if (!clue) return null

  const accent = clue.accent ?? 'gold'
  const styles = ACCENT_STYLES[accent]

  return (
    <ModalOverlay open={open}>
      <motion.div
        initial={{ y: 12, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 8, opacity: 0 }}
        className={`w-full max-w-sm rounded-2xl border bg-void-900/95 p-5 ${styles.border} ${styles.shadow}`}
      >
            <div className="mb-4 flex items-start gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${styles.iconBorder}`}
              >
                <Sparkles className={`h-5 w-5 ${styles.icon}`} />
              </div>
              <div>
                <p className={`text-sm font-medium ${styles.title}`}>
                  {clue.successTitle ?? '感应成功！'}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-mist-muted">
                  获得【{clue.artifactName}】
                </p>
                <p className="mt-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs leading-relaxed text-gold-muted">
                  {clue.hint}
                </p>
              </div>
            </div>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault()
                onConfirm()
              }}
              className={`w-full rounded-xl py-3 text-sm font-medium ring-1 ${styles.button}`}
              style={{ touchAction: 'none' }}
            >
              收录线索，继续寻灵
            </button>
      </motion.div>
    </ModalOverlay>
  )
}

export default ClueUnlockModal
