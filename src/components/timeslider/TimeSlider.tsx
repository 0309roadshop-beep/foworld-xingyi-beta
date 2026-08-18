import { AnimatePresence, motion } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'

/** 三个参数的目标阈值（0–100） */
const TARGETS = [80, 30, 65] as const
/** 容差 ±5% */
const TOLERANCE_RATIO = 0.05

const SLIDERS = [
  { id: 'crust', label: '地壳运动', unit: '指数', icon: '🌋', color: 'text-gold-bright' },
  { id: 'temp', label: '海水温度', unit: '℃ 当量', icon: '🌊', color: 'text-sky-bright' },
  { id: 'pressure', label: '大气压强', unit: 'kPa 当量', icon: '💨', color: 'text-jade-bright' },
] as const

interface TimeSliderProps {
  onSuccess?: () => void
}

function isWithinTolerance(value: number, target: number) {
  return Math.abs(value - target) <= target * TOLERANCE_RATIO
}

function randomStart(target: number) {
  let v: number
  do {
    v = Math.round(Math.random() * 100)
  } while (isWithinTolerance(v, target))
  return v
}

/** 单参数对齐度 0–1 */
function alignmentScore(value: number, target: number) {
  if (isWithinTolerance(value, target)) return 1
  return Math.max(0, 1 - Math.abs(value - target) / 45)
}

/** 根据综合对齐度映射地质年代文案 */
function formatEra(progress: number, solved: boolean): string {
  if (solved) return '2.5亿年前 · 古海洋'
  if (progress < 0.06) return '现代 · 公元 2026'
  if (progress < 0.22) return `${Math.round(6600 - progress * 8000)} 万年前 · 新生代`
  if (progress < 0.45) return `${Math.round(250 - progress * 400)} 百万年前 · 中生代`
  if (progress < 0.72) return `${(1.2 + progress * 1.5).toFixed(1)} 亿年前 · 古生代`
  if (progress < 0.92) return `${(2.0 + progress * 0.45).toFixed(1)} 亿年前 · 浅海纪元`
  return '2.5亿年前 · 古海洋'
}

export function TimeSlider({ onSuccess }: TimeSliderProps) {
  const successFiredRef = useRef(false)
  const [values, setValues] = useState<number[]>(() => TARGETS.map((t) => randomStart(t)))
  const [solved, setSolved] = useState(false)
  const [jitterKey, setJitterKey] = useState(0)
  const [rewinding, setRewinding] = useState(false)

  const progress = useMemo(
    () => values.reduce((sum, v, i) => sum + alignmentScore(v, TARGETS[i]), 0) / TARGETS.length,
    [values],
  )

  const eraLabel = formatEra(progress, solved)

  const trySuccess = useCallback(
    (next: number[]) => {
      if (successFiredRef.current) return
      const ok = next.every((v, i) => isWithinTolerance(v, TARGETS[i]))
      if (!ok) return
      successFiredRef.current = true
      setRewinding(true)
      window.setTimeout(() => {
        setSolved(true)
        setRewinding(false)
        onSuccess?.()
      }, 1400)
    },
    [onSuccess],
  )

  const handleChange = useCallback(
    (index: number, e: ChangeEvent<HTMLInputElement>) => {
      if (solved || rewinding) return
      const v = Number(e.target.value)
      setJitterKey((k) => k + 1)
      setValues((prev) => {
        const next = prev.map((x, i) => (i === index ? v : x))
        trySuccess(next)
        return next
      })
    },
    [solved, rewinding, trySuccess],
  )

  const handleReset = useCallback(() => {
    successFiredRef.current = false
    setSolved(false)
    setRewinding(false)
    setValues(TARGETS.map((t) => randomStart(t)))
  }, [])

  useEffect(() => {
    return () => {
      successFiredRef.current = false
    }
  }, [])

  return (
    <div
      className="w-full select-none"
      style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      <p className="mb-3 text-center text-xs text-mist-muted">
        调节三项地质参数，使时光指针回溯至 2.5 亿年前古海洋（各参数 ±5% 容差）
      </p>

      {/* 动态年份显示器 */}
      <div
        className={`relative mb-6 overflow-hidden rounded-2xl border px-4 py-6 text-center transition-colors duration-500 ${
          solved
            ? 'border-sky-bright/50 bg-sky-deep/25 shadow-[0_0_28px_rgba(56,189,248,0.35)]'
            : rewinding
              ? 'border-gold-bright/40 bg-void-800/80'
              : 'border-gold-muted/25 bg-void-900/60'
        }`}
      >
        {/* 地质刻度背景 */}
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute inset-x-4 top-1/2 h-px bg-gradient-to-r from-transparent via-gold-muted/50 to-transparent" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-gold-muted/40"
              style={{ left: `${15 + i * 17.5}%` }}
            />
          ))}
        </div>

        <p className="mb-1 text-[10px] tracking-[0.35em] text-mist-muted">地质纪年读数</p>

        <motion.p
          key={`${eraLabel}-${jitterKey}`}
          initial={{ opacity: 0.7, x: 0 }}
          animate={
            rewinding
              ? { opacity: [1, 0.4, 1], scale: [1, 1.08, 1], filter: ['blur(0px)', 'blur(3px)', 'blur(0px)'] }
              : solved
                ? { opacity: 1, x: 0, scale: 1 }
                : { opacity: 1, x: [0, -3, 3, -2, 2, 0] }
          }
          transition={
            rewinding
              ? { duration: 1.2, ease: 'easeInOut' }
              : { duration: 0.35 }
          }
          className={`relative text-lg font-medium tracking-wide ${
            solved ? 'text-glow text-sky-bright' : 'text-gold-bright'
          }`}
        >
          {eraLabel}
        </motion.p>

        <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-void-700/80">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-gold-muted via-jade-muted to-sky-bright"
            animate={{ width: `${Math.min(100, progress * 100)}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          />
        </div>
        <p className="mt-2 text-[10px] text-mist-faint">
          回溯进度 {Math.round(progress * 100)}%
        </p>

        {/* 时光倒流特效层 */}
        <AnimatePresence>
          {rewinding && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center bg-void-950/50 backdrop-blur-[1px]"
            >
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
                className="h-20 w-20 rounded-full border border-dashed border-gold-bright/50"
              />
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute text-xs tracking-[0.3em] text-gold-bright"
              >
                时光倒流中…
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {solved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              className="pointer-events-none absolute inset-0 flex items-end justify-center pb-3"
            >
              <span className="rounded-full border border-sky-bright/40 bg-sky-deep/30 px-3 py-1 text-[10px] text-sky-bright">
                神话短片已解锁
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 三个地质参数滑块 */}
      <div className="space-y-5" style={{ touchAction: 'none' }}>
        {SLIDERS.map((slider, i) => {
          const aligned = isWithinTolerance(values[i], TARGETS[i])
          const target = TARGETS[i]
          const tol = target * TOLERANCE_RATIO

          return (
            <div key={slider.id}>
              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                <span className={`flex items-center gap-1.5 tracking-wider ${slider.color}`}>
                  <span>{slider.icon}</span>
                  {slider.label}
                </span>
                <span className={aligned ? 'text-jade-bright' : 'text-mist-faint'}>
                  {values[i]}
                  <span className="text-mist-faint/60"> / 目标 {target}</span>
                  {aligned && ' ✓'}
                </span>
              </div>

              {/* 目标区间可视化 */}
              <div className="relative mb-1 h-1 rounded-full bg-void-700/60">
                <div
                  className="absolute top-0 h-full rounded-full bg-jade-muted/25"
                  style={{
                    left: `${Math.max(0, target - tol)}%`,
                    width: `${tol * 2}%`,
                  }}
                />
              </div>

              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={values[i]}
                disabled={solved || rewinding}
                className="range-geologic w-full"
                aria-label={`${slider.label}滑块`}
                style={{ touchAction: 'none' }}
                onChange={(e) => handleChange(i, e)}
              />
              <p className="mt-0.5 text-[9px] text-mist-faint">
                容差区间 {Math.round(target - tol)} – {Math.round(target + tol)} {slider.unit}
              </p>
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          className="rounded-lg border border-gold-muted/25 px-2.5 py-1 text-[11px] text-gold-bright active:bg-gold-muted/10"
          onPointerDown={(e) => {
            e.preventDefault()
            handleReset()
          }}
          style={{ touchAction: 'none' }}
        >
          重置参数
        </button>
      </div>
    </div>
  )
}

export default TimeSlider
