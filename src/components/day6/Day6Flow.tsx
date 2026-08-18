import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useState } from 'react'
import { OfflineCave } from './OfflineCave'
import { FragmentScanner } from './FragmentScanner'
import { CrystalMinerGame } from './CrystalMinerGame'
import { CoreFusion } from './CoreFusion'
import { JieXinLBSArrival } from './JieXinLBSArrival'
import { RedDustScanner } from './RedDustScanner'

const STEP_LABELS = [
  '地心结界',
  '阵核剥离',
  '寻觅息壤',
  '阵核重铸',
  '抵达街心',
  '红尘摸金',
] as const

export interface Day6FlowProps {
  onComplete?: () => void
}

/**
 * Day 6 幽邃地心 — 线性状态机
 * Step 0 静默潜航 → 1 钟乳石扫描 → 2 寻觅息壤 → 3 阵核重铸 → 4 街心打卡 → 5 红尘摸金
 */
export function Day6Flow({ onComplete }: Day6FlowProps) {
  const [step, setStep] = useState(0)
  const [finishing, setFinishing] = useState(false)

  const advance = useCallback(() => {
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1))
  }, [])

  const handleFinish = useCallback(() => {
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
                i <= step ? 'bg-sky-bright/60' : 'bg-mist-faint/15'
              }`}
            />
            <span
              className={`text-[8px] leading-tight tracking-wide ${
                i === step ? 'text-sky-bright' : 'text-mist-muted'
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
          {step === 0 && <OfflineCave onComplete={advance} />}
          {step === 1 && <FragmentScanner onComplete={advance} />}
          {step === 2 && <CrystalMinerGame onComplete={advance} />}
          {step === 3 && <CoreFusion onComplete={advance} />}
          {step === 4 && (
            <JieXinLBSArrival
              targetCoords={{ lat: 25.09, lng: 104.9 }}
              onStartScanning={advance}
            />
          )}
          {step === 5 && <RedDustScanner onComplete={handleFinish} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default Day6Flow
