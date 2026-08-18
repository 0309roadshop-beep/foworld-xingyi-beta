import { AnimatePresence, motion } from 'framer-motion'
import { Download, Scroll } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { SPIRIT_CATALOG } from '../../config/spiritCatalog'
import { useGameStore } from '../../store/gameStore'

const DISPLAY_SPIRITS = SPIRIT_CATALOG.slice(0, 7)

export interface ScrollSynthesisProps {
  onComplete?: () => void
}

/**
 * 百灵绘卷 — 古风卷轴展开与成就长图
 */
export function ScrollSynthesis({ onComplete }: ScrollSynthesisProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { collectedSpirits, currentDay } = useGameStore()
  const [phase, setPhase] = useState<'flash' | 'unfold' | 'ready'>('flash')
  const [saveHint, setSaveHint] = useState<string | null>(null)

  const activeSpirits = DISPLAY_SPIRITS.map((s) => ({
    ...s,
    awakened: collectedSpirits.includes(s.name),
  }))

  const handleFlashEnd = useCallback(() => {
    setPhase('unfold')
    window.setTimeout(() => setPhase('ready'), 2000)
  }, [])

  const handleSave = useCallback(() => {
    setSaveHint('正在准备绘卷导出…')
    try {
      if (scrollRef.current) {
        const prevTitle = document.title
        document.title = '寻灵记·百灵绘卷'
        window.print()
        document.title = prevTitle
        setSaveHint('已唤起打印/保存，请选择「保存为 PDF」或截图珍藏。')
      }
    } catch {
      setSaveHint('保存功能即将开放，请先截图珍藏绘卷。')
    }
    window.setTimeout(() => setSaveHint(null), 4000)
  }, [])

  const handleContinue = useCallback(() => {
    onComplete?.()
  }, [onComplete])

  return (
    <div className="w-full">
      <AnimatePresence>
        {phase === 'flash' && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            onAnimationComplete={handleFlashEnd}
            className="fixed inset-0 z-50 bg-white"
          />
        )}
      </AnimatePresence>

      <div className="relative flex min-h-[min(72dvh,560px)] flex-col items-center justify-center py-4">
        {/* 卷轴容器 */}
        <div className="relative flex w-full max-w-md items-stretch justify-center px-2">
          {/* 左轴头 */}
          <motion.div
            className="relative z-20 w-5 shrink-0 rounded-l-md bg-gradient-to-b from-amber-900 via-amber-800 to-amber-950 shadow-[inset_-2px_0_6px_rgba(0,0,0,0.4)]"
            initial={{ x: 40 }}
            animate={{ x: phase === 'unfold' || phase === 'ready' ? 0 : 40 }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          />
          {/* 画卷主体 */}
          <motion.div
            ref={scrollRef}
            className="relative z-10 min-h-[420px] overflow-hidden border-y border-amber-900/40 bg-[#f5f0e6] shadow-[0_8px_32px_rgba(0,0,0,0.25)]"
            initial={{ scaleX: 0.04, opacity: 0.6 }}
            animate={{
              scaleX: phase === 'flash' ? 0.04 : 1,
              opacity: phase === 'flash' ? 0.6 : 1,
            }}
            transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1], delay: phase === 'unfold' ? 0.1 : 0 }}
            style={{ transformOrigin: 'center center' }}
          >
            {/* 水墨纹理 */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
              }}
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#e8dcc8] to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#e8dcc8] to-transparent" />

            <div className="relative px-5 py-6 sm:px-7">
              {/* 标题 */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: phase === 'ready' ? 1 : 0, y: phase === 'ready' ? 0 : 8 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="mb-6 text-center"
              >
                <p className="text-[10px] tracking-[0.45em] text-amber-900/50">FOWORLD · 贵州兴义</p>
                <h2
                  className="mt-2 text-xl font-medium tracking-[0.2em] text-amber-950 sm:text-2xl"
                  style={{ fontFamily: 'serif' }}
                >
                  寻灵记·百灵绘卷
                </h2>
                <div className="mx-auto mt-3 h-px w-32 bg-gradient-to-r from-transparent via-amber-800/40 to-transparent" />
              </motion.div>

              {/* 灵兽环形阵列 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: phase === 'ready' ? 1 : 0, scale: phase === 'ready' ? 1 : 0.92 }}
                transition={{ delay: 0.5, duration: 0.7 }}
                className="relative mx-auto mb-6 h-52 w-52 sm:h-56 sm:w-56"
              >
                <div className="absolute inset-[18%] rounded-full border border-dashed border-amber-800/25" />
                <div className="absolute inset-[32%] rounded-full border border-amber-900/15 bg-amber-50/50" />
                {activeSpirits.map((spirit, i) => {
                  const angle = (i / 7) * Math.PI * 2 - Math.PI / 2
                  const r = 42
                  const x = 50 + Math.cos(angle) * r
                  const y = 50 + Math.sin(angle) * r
                  return (
                    <motion.div
                      key={spirit.id}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{
                        opacity: phase === 'ready' ? 1 : 0,
                        scale: phase === 'ready' ? 1 : 0,
                      }}
                      transition={{ delay: 0.6 + i * 0.08, type: 'spring', stiffness: 260 }}
                      className="absolute flex flex-col items-center"
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-full border-2 shadow-md ${
                          spirit.awakened
                            ? 'border-amber-600/50 bg-amber-100/90'
                            : 'border-stone-300/60 bg-stone-200/50 opacity-50'
                        }`}
                      >
                        <img
                          src={spirit.assetUrl}
                          alt=""
                          className="h-8 w-8 object-contain mix-blend-multiply"
                        />
                      </div>
                      <span className="mt-1 max-w-[4.5rem] truncate text-[8px] text-amber-900/70">
                        {spirit.name}
                      </span>
                    </motion.div>
                  )
                })}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                  <Scroll className="mx-auto h-5 w-5 text-amber-800/40" />
                  <p className="text-[9px] tracking-widest text-amber-900/45">百灵归巢</p>
                </div>
              </motion.div>

              {/* 专属数据 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: phase === 'ready' ? 1 : 0 }}
                transition={{ delay: 0.9, duration: 0.6 }}
                className="space-y-2 rounded-xl border border-amber-900/10 bg-amber-50/60 px-4 py-3 text-center"
              >
                <p className="text-xs text-amber-950/80">
                  共历时 <span className="font-medium text-amber-900">{currentDay}</span> 天
                </p>
                <p className="text-xs text-amber-950/80">徒步跨越 84,000 步</p>
                <p className="text-xs text-amber-950/80">唤醒黔西南地脉</p>
                <p className="text-[10px] text-amber-800/50">
                  已觉醒灵兽 {collectedSpirits.length} / 7
                </p>
              </motion.div>
            </div>
          </motion.div>
          {/* 右轴头 */}
          <motion.div
            className="relative z-20 w-5 shrink-0 rounded-r-md bg-gradient-to-b from-amber-900 via-amber-800 to-amber-950 shadow-[inset_2px_0_6px_rgba(0,0,0,0.4)]"
            initial={{ x: -40 }}
            animate={{ x: phase === 'unfold' || phase === 'ready' ? 0 : -40 }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>

        {/* 操作按钮 */}
        <AnimatePresence>
          {phase === 'ready' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 w-full max-w-md space-y-2 px-4"
            >
              {saveHint && (
                <p className="text-center text-[10px] text-mist-muted">{saveHint}</p>
              )}
              <button
                type="button"
                onClick={handleSave}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-700/40 bg-amber-900/20 py-3 text-sm font-medium text-amber-100 active:bg-amber-900/35"
              >
                <Download className="h-4 w-4" />
                保存绘卷
              </button>
              <button
                type="button"
                onClick={handleContinue}
                className="w-full rounded-xl border border-gold-muted/40 bg-gold-muted/10 py-3 text-sm font-medium text-gold-bright active:bg-gold-muted/20"
              >
                继续
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default ScrollSynthesis
