import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useState } from 'react'
import { CostumeCheckIn } from './CostumeCheckIn'
import { PipeConnectGame } from './PipeConnectGame'
import { HeritageGallery } from './HeritageGallery'
import { LanternMatchGame } from './LanternMatchGame'
import { IronFlowerStory } from './IronFlowerStory'
import { IronFlowerConfirm } from './IronFlowerConfirm'
import { QianDengGuideStory } from './QianDengGuideStory'
import { FireAffinityReward } from './FireAffinityReward'
import { QianDengJieYin } from './ThousandLanternsGame'

const STEP_LABELS = [
  '霓裳入局',
  '引流溯源',
  '寻遗织梦',
  '千灯结缘',
  '地脉连通',
  '观演确认',
  '浴火亲和',
  '千灯指引',
  '千灯结印',
] as const

export interface Day5FlowProps {
  onComplete?: () => void
}

/**
 * Day 5 峰林布依 — 线性状态机
 * A 观演+浴火亲和 → B 指引剧情 → C 千灯结印 → D 唤醒千灯灵并收束
 */
export function Day5Flow({ onComplete }: Day5FlowProps) {
  const [step, setStep] = useState(0)
  const [finishing, setFinishing] = useState(false)

  const advance = useCallback(() => {
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1))
  }, [])

  const handleAwakenDone = useCallback(() => {
    if (finishing) return
    setFinishing(true)
    onComplete?.()
  }, [finishing, onComplete])

  return (
    <div className="flex w-full flex-col">
      <div className="mb-4 flex items-center justify-center gap-1 px-1">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`h-1 w-full rounded-full transition-colors ${
                i <= step ? 'bg-gold-bright/70' : 'bg-mist-faint/15'
              }`}
            />
            <span
              className={`text-[8px] leading-tight tracking-wide ${
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
          {step === 0 && <CostumeCheckIn onComplete={advance} />}
          {step === 1 && <PipeConnectGame onComplete={advance} />}
          {step === 2 && <HeritageGallery onComplete={advance} />}
          {step === 3 && <LanternMatchGame onComplete={advance} />}
          {step === 4 && <IronFlowerStory onComplete={advance} />}
          {step === 5 && <IronFlowerConfirm watchCooldownSeconds={8} onComplete={advance} />}
          {step === 6 && <FireAffinityReward onComplete={advance} />}
          {step === 7 && <QianDengGuideStory onComplete={advance} />}
          {step === 8 && <QianDengJieYin onComplete={handleAwakenDone} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default Day5Flow
