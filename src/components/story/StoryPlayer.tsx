import { AnimatePresence, motion } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'

/** 单条对白 */
export interface DialogueLine {
  speaker: string
  /** 头像 URL；缺省时用说话人首字 */
  avatar?: string
  text: string
}

interface StoryPlayerProps {
  dialogues: DialogueLine[]
  /** 全部剧情播放完毕并确认后触发 */
  onFinish?: () => void
  /** 可选背景图 */
  backgroundUrl?: string
}

const TYPE_MS = 50

export function StoryPlayer({ dialogues, onFinish, backgroundUrl }: StoryPlayerProps) {
  const intervalRef = useRef<number | null>(null)
  const finishFiredRef = useRef(false)

  const [lineIndex, setLineIndex] = useState(0)
  const [displayText, setDisplayText] = useState('')
  const [typingDone, setTypingDone] = useState(false)
  const [fading, setFading] = useState(false)
  const [hidden, setHidden] = useState(false)

  const current = dialogues[lineIndex]
  const isLastLine = lineIndex >= dialogues.length - 1

  /** 严格清除打字机定时器，防止连点导致文字交错 */
  const clearTypewriter = useCallback(() => {
    if (intervalRef.current != null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const startTypewriter = useCallback(
    (text: string) => {
      clearTypewriter()
      setDisplayText('')
      setTypingDone(false)

      if (!text) {
        setTypingDone(true)
        return
      }

      let charIndex = 0
      intervalRef.current = window.setInterval(() => {
        charIndex += 1
        setDisplayText(text.slice(0, charIndex))
        if (charIndex >= text.length) {
          clearTypewriter()
          setTypingDone(true)
        }
      }, TYPE_MS)
    },
    [clearTypewriter],
  )

  /** 切换对白时启动打字机；卸载或 index 变化前清理定时器 */
  useEffect(() => {
    if (fading || hidden) return
    const line = dialogues[lineIndex]
    if (!line) return
    startTypewriter(line.text)
    return clearTypewriter
  }, [lineIndex, dialogues, fading, hidden, startTypewriter, clearTypewriter])

  useEffect(() => () => clearTypewriter(), [clearTypewriter])

  const triggerFinish = useCallback(() => {
    if (finishFiredRef.current) return
    finishFiredRef.current = true
    setFading(true)
    window.setTimeout(() => {
      setHidden(true)
      onFinish?.()
    }, 480)
  }, [onFinish])

  const handleDialoguePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      if (fading || hidden || !current) return

      if (!typingDone) {
        clearTypewriter()
        setDisplayText(current.text)
        setTypingDone(true)
        return
      }

      if (!isLastLine) {
        setLineIndex((i) => i + 1)
        return
      }

      triggerFinish()
    },
    [fading, hidden, current, typingDone, isLastLine, clearTypewriter, triggerFinish],
  )

  if (!dialogues.length) return null

  return (
    <div
      className="relative mx-auto h-full w-full max-w-[calc(100dvh*9/16)] overflow-hidden bg-void-950"
      style={{
        aspectRatio: '9 / 16',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* 背景 */}
      {backgroundUrl ? (
        <img
          src={backgroundUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-void-800/80 via-void-900 to-void-950" />
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-void-950/90 via-transparent to-void-900/30" />

      {/* 对白框 */}
      <AnimatePresence>
        {!hidden && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: fading ? 0 : 1, y: fading ? 16 : 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.45 }}
            className="absolute inset-x-0 bottom-0 z-10 px-4 pb-8 pt-4"
          >
            {/* 说话者头像 + 名字 */}
            <div className="mb-2 flex items-end gap-3 pl-1">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-jade-muted/40 bg-void-800/80 shadow-glow backdrop-blur-sm">
                {current.avatar ? (
                  <img
                    src={current.avatar}
                    alt={current.speaker}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <span className="text-lg font-medium text-jade-bright">
                    {current.speaker.slice(0, 1)}
                  </span>
                )}
              </div>
              <p className="mb-1 text-sm font-medium tracking-wide text-gold-bright">
                {current.speaker}
              </p>
            </div>

            {/* 磨砂玻璃对话框 */}
            <div
              role="button"
              tabIndex={0}
              onPointerDown={handleDialoguePointerDown}
              className="cursor-pointer rounded-2xl border border-mist-faint/15 bg-void-900/55 px-4 py-4 shadow-glow backdrop-blur-md active:bg-void-800/60"
              style={{ touchAction: 'none', WebkitTapHighlightColor: 'transparent' }}
            >
              <p className="min-h-[4.5rem] whitespace-pre-wrap text-sm leading-relaxed text-mist">
                {displayText}
                {!typingDone && (
                  <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-jade-bright align-middle" />
                )}
              </p>
              <p className="mt-2 text-right text-[10px] tracking-wider text-mist-faint">
                {typingDone
                  ? isLastLine
                    ? '点击结束'
                    : '点击继续'
                  : '点击跳过'}
              </p>
            </div>

            {/* 进度点 */}
            <div className="mt-3 flex justify-center gap-1.5">
              {dialogues.map((_, i) => (
                <span
                  key={i}
                  className={`h-1 rounded-full transition-all ${
                    i === lineIndex
                      ? 'w-4 bg-jade-bright'
                      : i < lineIndex
                        ? 'w-1.5 bg-jade-muted/50'
                        : 'w-1.5 bg-mist-faint/25'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default StoryPlayer
