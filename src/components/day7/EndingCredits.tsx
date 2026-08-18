import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../../store/gameStore'

const FAREWELL_TEXT =
  '现代的世界挺有趣的，这几天辛苦啦。这阵法终于修好，我也该回去睡个回笼觉了。唤灵师，咱们有缘江湖再见！'

const CREDIT_BLOCKS = [
  'FOWORLD 贵州兴义内测',
  '',
  '制作人',
  'FOWORLD Studio',
  '',
  '策划',
  '寻灵叙事组',
  '',
  '视觉设计',
  '罗盘与山河美术组',
  '',
  '技术实现',
  '罗盘 OS 工程组',
  '',
  '特别鸣谢',
  '每一位踏入喀斯特的唤灵师',
  '',
  '感谢您的游玩',
  '',
  '山河记得你来过的痕迹',
  '',
  '—— 终 ——',
]

type Phase = 'farewell' | 'credits' | 'done'

export interface EndingCreditsProps {
  onComplete?: () => void
}

/**
 * 结局与致谢 — 罗盘灵告别 + 滚动字幕 + 返回主菜单
 */
export function EndingCredits({ onComplete }: EndingCreditsProps) {
  const navigate = useNavigate()
  const { reset } = useGameStore()
  const [phase, setPhase] = useState<Phase>('farewell')
  const [typed, setTyped] = useState('')
  const [typingDone, setTypingDone] = useState(false)
  const finishedRef = useRef(false)

  useEffect(() => {
    if (phase !== 'farewell') return
    let i = 0
    setTyped('')
    setTypingDone(false)
    const id = window.setInterval(() => {
      i += 1
      setTyped(FAREWELL_TEXT.slice(0, i))
      if (i >= FAREWELL_TEXT.length) {
        window.clearInterval(id)
        setTypingDone(true)
      }
    }, 36)
    return () => window.clearInterval(id)
  }, [phase])

  const startCredits = useCallback(() => {
    setPhase('credits')
    window.setTimeout(() => setPhase('done'), 22000)
  }, [])

  const handleReturnHome = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    reset({ keepDebugMode: true })
    onComplete?.()
    navigate('/', { replace: true })
  }, [reset, onComplete, navigate])

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-mist-faint/10 bg-void-950">
      <AnimatePresence mode="wait">
        {phase === 'farewell' && (
          <motion.div
            key="farewell"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -12 }}
            className="relative px-4 py-8"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                background: 'radial-gradient(circle at 50% 30%, rgba(56,189,248,0.15), transparent 65%)',
              }}
            />
            <div className="relative z-10 mx-auto max-w-sm">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-sky-bright/30 bg-sky-deep/20 text-sm text-sky-bright">
                  罗
                </span>
                <span className="text-xs tracking-widest text-sky-bright/80">罗盘灵</span>
              </div>
              <div className="rounded-2xl border border-mist-faint/15 bg-void-900/80 px-4 py-4 shadow-[inset_0_0_24px_rgba(56,189,248,0.06)]">
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
                  onClick={startCredits}
                  className="mt-5 w-full rounded-xl border border-sky-bright/30 bg-sky-deep/15 py-3 text-sm font-medium text-sky-bright active:bg-sky-deep/25"
                >
                  目送罗盘灵离去…
                </motion.button>
              )}
            </div>
          </motion.div>
        )}

        {(phase === 'credits' || phase === 'done') && (
          <motion.div
            key="credits"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative min-h-[min(68dvh,520px)]"
          >
            <div className="absolute inset-0 bg-black/90" />
            <div className="relative z-10 flex h-full min-h-[min(68dvh,520px)] flex-col items-center justify-end overflow-hidden pb-8">
              <div className="ending-credits-scroll pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-4 px-6">
                {CREDIT_BLOCKS.map((line, i) =>
                  line ? (
                    <p
                      key={i}
                      className={`text-center ${
                        line === '感谢您的游玩' || line === '—— 终 ——'
                          ? 'text-sm font-medium tracking-[0.3em] text-gold-bright'
                          : line === 'FOWORLD 贵州兴义内测'
                            ? 'text-xs tracking-[0.4em] text-mist-muted'
                            : 'text-[11px] text-mist-muted/90'
                      }`}
                    >
                      {line}
                    </p>
                  ) : (
                    <div key={i} className="h-3" />
                  ),
                )}
              </div>

              <AnimatePresence>
                {phase === 'done' && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    type="button"
                    onClick={handleReturnHome}
                    className="relative z-20 w-full max-w-xs rounded-xl border border-gold-muted/40 bg-void-950/90 px-6 py-3.5 text-sm font-medium text-gold-bright shadow-[0_0_32px_rgba(0,0,0,0.5)] active:bg-gold-muted/15"
                  >
                    返回主菜单
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default EndingCredits
