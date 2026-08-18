import { motion } from 'framer-motion'
import { useCallback, useRef } from 'react'
import { StoryPlayer, type DialogueLine } from '../story/StoryPlayer'

/** 消消乐通关后 — 过渡剧情，引导玩家前往露台观礼打铁花 */
const TRANSITION_DIALOGUES: DialogueLine[] = [
  {
    speaker: '罗盘灵',
    text: '地脉已连通。去水寨中心的露台吧，非遗打铁花表演即将开始，那里才是灵火最鼎盛的阵眼。',
  },
  {
    speaker: '罗盘灵',
    text: '铁水泼向夜空的那一刻，千年匠火与地脉灵息会短暂合一——静观、铭记，再汲取那缕非遗灵火。',
  },
]

export interface IronFlowerStoryProps {
  onComplete?: () => void
}

function Spark({ delay }: { delay: number }) {
  const left = 10 + Math.random() * 80
  return (
    <motion.span
      initial={{ opacity: 0, y: 0, scale: 0.4 }}
      animate={{
        opacity: [0, 1, 0],
        y: [-20, -80 - Math.random() * 60],
        scale: [0.4, 1.2, 0.2],
      }}
      transition={{ duration: 1.4 + Math.random(), delay, repeat: Infinity, repeatDelay: 0.3 }}
      className="pointer-events-none absolute bottom-[20%] h-1.5 w-1.5 rounded-full bg-gold-bright shadow-[0_0_8px_rgba(245,215,110,0.9)]"
      style={{ left: `${left}%` }}
    />
  )
}

/** 铁花星落 · 过渡剧情（亲和结算在观演确认 + FireAffinityReward 环节） */
export function IronFlowerStory({ onComplete }: IronFlowerStoryProps) {
  const firedRef = useRef(false)

  const handleFinish = useCallback(() => {
    if (firedRef.current) return
    firedRef.current = true
    onComplete?.()
  }, [onComplete])

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-amber-muted/20 bg-[#120808]/90">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_80%,rgba(245,120,40,0.18),transparent_60%)]" />
      {Array.from({ length: 10 }).map((_, i) => (
        <Spark key={i} delay={i * 0.15} />
      ))}

      <div className="relative z-10 p-2">
        <StoryPlayer dialogues={TRANSITION_DIALOGUES} onFinish={handleFinish} />
      </div>
    </div>
  )
}

export default IronFlowerStory
