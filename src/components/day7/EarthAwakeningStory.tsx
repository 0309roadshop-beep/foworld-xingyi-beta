import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useRef, useState } from 'react'
import { StoryPlayer, type DialogueLine } from '../story/StoryPlayer'

const DIALOGUES: DialogueLine[] = [
  {
    speaker: '地脉',
    text: '阵核与万灵同频……沉睡的地脉正在苏醒，喀斯特的山骨发出低沉的共鸣。',
  },
  {
    speaker: '罗盘灵',
    text: '你听见了么？那是大地在回应。七日寻灵的回响，正从地心涌向天际。',
  },
  {
    speaker: '罗盘灵',
    text: '大阵已醒，百灵绘卷即将凝结——山河的记忆，将在此刻化为永恒。',
  },
]

export interface EarthAwakeningStoryProps {
  onComplete?: () => void
}

/** 地脉苏醒 — 高潮剧情与地脉光效 */
export function EarthAwakeningStory({ onComplete }: EarthAwakeningStoryProps) {
  const firedRef = useRef(false)
  const [pulse, setPulse] = useState(false)

  const handleFinish = useCallback(() => {
    if (firedRef.current) return
    firedRef.current = true
    setPulse(true)
    window.setTimeout(() => onComplete?.(), 1600)
  }, [onComplete])

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-amber-700/25 bg-[#0a0806]">
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgba(180,120,40,0.35),transparent_65%)]"
        animate={pulse ? { opacity: [0.4, 1, 0.5] } : { opacity: [0.2, 0.45, 0.2] }}
        transition={{ duration: pulse ? 0.8 : 3, repeat: pulse ? 0 : Infinity }}
      />
      <AnimatePresence>
        {pulse && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 0.8, 0], scale: [0.8, 1.4, 1.6] }}
            transition={{ duration: 1.4 }}
            className="pointer-events-none absolute inset-0 bg-amber-400/30"
          />
        )}
      </AnimatePresence>
      <StoryPlayer dialogues={DIALOGUES} onFinish={handleFinish} />
    </div>
  )
}

export default EarthAwakeningStory
