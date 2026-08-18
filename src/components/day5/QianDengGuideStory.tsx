import { motion } from 'framer-motion'
import { useCallback, useRef } from 'react'
import { StoryPlayer, type DialogueLine } from '../story/StoryPlayer'

const GUIDE_DIALOGUES: DialogueLine[] = [
  {
    speaker: '罗盘灵',
    text: '太美了……这满天的铁花，就是最纯粹的浴火能量！借着这股能量，水寨的千盏祈福灯已经共鸣，是时候结下最后的阵印了！',
  },
]

export interface QianDengGuideStoryProps {
  onComplete?: () => void
}

/** Step B · 浴火亲和后 — 罗盘灵指引千灯结印 */
export function QianDengGuideStory({ onComplete }: QianDengGuideStoryProps) {
  const firedRef = useRef(false)

  const handleFinish = useCallback(() => {
    if (firedRef.current) return
    firedRef.current = true
    onComplete?.()
  }, [onComplete])

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-amber-muted/25 bg-[#0f1418]/90">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(245,180,60,0.12),transparent_65%)]" />
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-amber-500/10 to-transparent"
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <div className="relative z-10 p-2">
        <StoryPlayer dialogues={GUIDE_DIALOGUES} onFinish={handleFinish} />
      </div>
    </div>
  )
}

export default QianDengGuideStory
