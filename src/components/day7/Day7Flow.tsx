import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useState } from 'react'
import { GeoController } from '../geo/GeoController'
import { GrandArrayActivation } from './GrandArrayActivation'
import { EarthAwakeningStory } from './EarthAwakeningStory'
import { ScrollSynthesis } from './ScrollSynthesis'
import { EndingCredits } from './EndingCredits'

const STEP_LABELS = [
  '阵眼现世',
  '阵核归位',
  '万灵归宗',
  '地脉苏醒',
  '百灵绘卷',
  '终局落幕',
] as const

const ARRAY_EYE_COORDS = { lat: 25.09, lng: 104.89 }

export interface Day7FlowProps {
  onComplete?: () => void
}

/**
 * Day 7 终章 — 六步状态机
 */
export function Day7Flow({ onComplete }: Day7FlowProps) {
  const [step, setStep] = useState(0)
  const [lbsArrived, setLbsArrived] = useState(false)
  const [finishing, setFinishing] = useState(false)

  const advance = useCallback(() => {
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1))
  }, [])

  const handleLbsArrived = useCallback(() => {
    setLbsArrived(true)
    window.setTimeout(() => advance(), 800)
  }, [advance])

  const handleFinish = useCallback(() => {
    if (finishing) return
    setFinishing(true)
    onComplete?.()
  }, [finishing, onComplete])

  return (
    <div className="flex w-full flex-col">
      <div className="mb-4 flex items-center justify-center gap-0.5 px-1">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`h-1 w-full rounded-full transition-colors ${
                i <= step ? 'bg-gold-bright/55' : 'bg-mist-faint/15'
              }`}
            />
            <span
              className={`text-[7px] leading-tight tracking-wide ${
                i === step ? 'text-gold-bright' : 'text-mist-muted'
              }`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.25 }}
        >
          {step === 0 && (
            <div className="relative flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-gold-muted/20 bg-void-950/80 px-4 py-8 text-center">
              <GeoController targetCoords={ARRAY_EYE_COORDS} onArrived={handleLbsArrived} />
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gold-muted/40 bg-gold-muted/10">
                <span className="text-2xl">◎</span>
              </div>
              <p className="mb-1 text-[10px] tracking-[0.35em] text-mist-muted">阵眼现世</p>
              <h3 className="mb-2 text-base font-medium text-gold-bright">寻灵公会基地</h3>
              <p className="mb-2 max-w-xs text-xs leading-relaxed text-mist-muted">
                罗盘剧烈颤动，指向七日契约的起点。抵达阵眼，终局大阵即将现世。
              </p>
              {lbsArrived && <p className="text-xs text-spirit">阵眼已应，大阵苏醒…</p>}
            </div>
          )}

          {step === 1 && <GrandArrayActivation scope="core" onComplete={advance} />}
          {step === 2 && (
            <GrandArrayActivation scope="spirits" corePreplaced onComplete={advance} />
          )}
          {step === 3 && <EarthAwakeningStory onComplete={advance} />}
          {step === 4 && <ScrollSynthesis onComplete={advance} />}
          {step === 5 && <EndingCredits onComplete={handleFinish} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default Day7Flow
