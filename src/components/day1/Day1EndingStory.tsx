import { motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'

const DIALOGUE =
  '呼……今天干得漂亮！这枚徽章可是个好东西，以后遇到大瀑布你就知道它的厉害了。第一天的试炼圆满结束，肉体凡胎也该累了，赶紧回酒店休息吧，明天我们去爬山！'

export interface Day1EndingStoryProps {
  onComplete?: () => void
}

/**
 * Day 1 首日落幕 — 罗盘灵告别，手动开启 Day 2
 */
export function Day1EndingStory({ onComplete }: Day1EndingStoryProps) {
  const finishedRef = useRef(false)
  const [typed, setTyped] = useState('')
  const [typingDone, setTypingDone] = useState(false)

  useEffect(() => {
    let i = 0
    const id = window.setInterval(() => {
      i += 1
      setTyped(DIALOGUE.slice(0, i))
      if (i >= DIALOGUE.length) {
        window.clearInterval(id)
        setTypingDone(true)
      }
    }, 32)
    return () => window.clearInterval(id)
  }, [])

  const handleEndDay = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    onComplete?.()
  }, [onComplete])

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-sky-muted/20 bg-void-900/60 px-4 py-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-sky-bright/30 bg-sky-deep/20 text-sm text-sky-bright">
          罗
        </span>
        <span className="text-xs tracking-widest text-sky-bright/80">罗盘灵</span>
      </div>
      <div className="rounded-2xl border border-mist-faint/15 bg-void-950/80 px-4 py-4">
        <p className="text-sm leading-relaxed text-mist">
          {typed}
          {!typingDone && <span className="animate-pulse text-sky-bright">|</span>}
        </p>
      </div>
      {typingDone && (
        <motion.button
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          type="button"
          onClick={handleEndDay}
          className="mt-5 w-full rounded-xl border border-gold-muted/35 bg-gold-muted/10 py-3 text-sm font-medium text-gold-bright active:bg-gold-muted/20"
        >
          结束今日行程
        </motion.button>
      )}
    </div>
  )
}

export default Day1EndingStory
