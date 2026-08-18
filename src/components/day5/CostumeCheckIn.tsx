import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'

const SCAN_MS = 1300

const DEFAULT_TITLE = '霓裳入局'
const DEFAULT_DESC = '穿上布依族传统服饰，融入当地风土。'
const COMPASS_FEEDBACK =
  '检测到外部服饰波段已与本地民俗频率同频。光学伪装生效，水寨阵眼的排斥力场已解除，准许深入！'

type Phase = 'idle' | 'scanning' | 'feedback'

export interface CostumeCheckInProps {
  onComplete?: () => void
  questTitle?: string
  questDesc?: string
}

/** Day 5 别名 */
export type CostumeChangeProps = CostumeCheckInProps

/** 霓裳入局 — 身份伪装状态确认（无拍照/上传） */
export function CostumeCheckIn({
  onComplete,
  questTitle = DEFAULT_TITLE,
  questDesc = DEFAULT_DESC,
}: CostumeCheckInProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const scanTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (scanTimerRef.current !== null) {
        window.clearTimeout(scanTimerRef.current)
      }
    }
  }, [])

  const handleConfirm = useCallback(() => {
    if (phase !== 'idle') return
    setPhase('scanning')
    scanTimerRef.current = window.setTimeout(() => {
      scanTimerRef.current = null
      setPhase('feedback')
    }, SCAN_MS)
  }, [phase])

  const handleContinue = useCallback(() => {
    onComplete?.()
  }, [onComplete])

  return (
    <div className="costume-checkin interactive-area relative mx-auto w-full max-w-md rounded-xl border border-[#00F5FF]/25 bg-void-950/90 p-5 shadow-[0_0_24px_rgba(0,245,255,0.08)]">
      <p className="mb-1 text-center text-[10px] tracking-[0.35em] text-[#00F5FF]/70">
        FOWORLD OS · 身份波段校验
      </p>
      <h3 className="mb-3 text-center text-base font-medium text-mist">{questTitle}</h3>
      <p className="mb-6 text-center text-xs leading-relaxed text-mist-muted">{questDesc}</p>

      <AnimatePresence mode="wait">
        {phase === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center"
          >
            <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full border border-[#00F5FF]/30 bg-cyan-950/30 shadow-[0_0_32px_rgba(0,245,255,0.12)]">
              <div className="h-14 w-14 rounded-full border border-dashed border-[#00F5FF]/40 bg-[radial-gradient(circle,rgba(0,245,255,0.15),transparent_70%)]" />
            </div>
            <button
              type="button"
              className="w-full rounded-xl border border-[#00F5FF]/50 bg-gradient-to-r from-cyan-900/70 to-teal-900/55 px-6 py-4 text-sm font-medium tracking-wide text-cyan-100 shadow-[0_0_28px_rgba(0,245,255,0.28)] ring-1 ring-[#00F5FF]/35 active:scale-[0.98]"
              onClick={handleConfirm}
            >
              【 确认：身份伪装已完成 】
            </button>
          </motion.div>
        )}

        {phase === 'scanning' && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-6"
          >
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#00F5FF]/25 border-t-[#00F5FF]" />
            <p className="text-sm tracking-wider text-[#00F5FF]">波段扫描中...</p>
            <p className="mt-2 text-[10px] text-mist-faint">正在比对民俗频率指纹</p>
          </motion.div>
        )}

        {phase === 'feedback' && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="mb-5 rounded-lg border border-[#00F5FF]/25 bg-cyan-950/25 p-4">
              <p className="mb-2 text-[10px] font-medium tracking-wider text-[#00F5FF]/85">
                罗盘灵
              </p>
              <p className="text-sm leading-relaxed text-mist">{COMPASS_FEEDBACK}</p>
            </div>

            <button
              type="button"
              className="w-full rounded-xl border border-jade-muted/45 bg-gradient-to-r from-jade-deep/55 to-cyan-900/50 px-6 py-3.5 text-sm font-medium tracking-wide text-jade-bright shadow-[0_0_20px_rgba(45,212,168,0.2)] ring-1 ring-jade-muted/30 active:scale-[0.98]"
              onClick={handleContinue}
            >
              【 接入下一环节 】
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export const CostumeChange = CostumeCheckIn

export default CostumeCheckIn
