import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SILHOUETTE_IMAGE_ASPECT, SILHOUETTE_IMAGE_URL } from '../../mock/data'

/** 三层预设正确滑块值 */
const DEFAULT_TARGETS = [68, 42, 55] as const
const DEFAULT_TOLERANCE = 3

/** 垂直裁剪带：天空远山 / 湖面丘陵 / 古堡桥梁 */
const LAYER_BANDS = [
  {
    id: 'far',
    label: '远景',
    color: 'text-sky-bright',
    clipPath: 'inset(0 0 64% 0)',
  },
  {
    id: 'mid',
    label: '中景',
    color: 'text-jade-bright',
    clipPath: 'inset(28% 0 36% 0)',
  },
  {
    id: 'near',
    label: '近景',
    color: 'text-gold-bright',
    clipPath: 'inset(56% 0 0 0)',
  },
] as const

export interface SilhouetteSliderProps {
  onSuccess?: () => void
  /** 层数，默认 3 */
  layerCount?: number
  /** 各层目标值 */
  targets?: number[]
  /** 容差 ±% */
  tolerance?: number
  imageUrl?: string
  imageAspect?: number
}

/** 滑块值 → translateX 百分比（50 为中心，±45% 最大偏移） */
function sliderToOffset(value: number) {
  return (value - 50) * 0.9
}

function isWithinTolerance(value: number, target: number, tolerance: number) {
  return Math.abs(value - target) <= tolerance
}

function randomStart(target: number, tolerance: number) {
  let v: number
  do {
    v = Math.round(Math.random() * 100)
  } while (isWithinTolerance(v, target, tolerance))
  return v
}

export function SilhouetteSlider({
  onSuccess,
  layerCount = 3,
  targets: targetsProp,
  tolerance = DEFAULT_TOLERANCE,
  imageUrl = SILHOUETTE_IMAGE_URL,
  imageAspect = SILHOUETTE_IMAGE_ASPECT,
}: SilhouetteSliderProps) {
  const count = Math.min(Math.max(layerCount, 1), LAYER_BANDS.length)
  const targets = useMemo(() => {
    const base = targetsProp ?? [...DEFAULT_TARGETS]
    return base.slice(0, count)
  }, [targetsProp, count])

  const bands = LAYER_BANDS.slice(0, count)

  const [values, setValues] = useState<number[]>(() =>
    targets.map((t) => randomStart(t, tolerance)),
  )
  const [solved, setSolved] = useState(false)
  const successFiredRef = useRef(false)

  const trySuccess = useCallback(
    (next: number[]) => {
      if (successFiredRef.current) return
      const ok = next.every((v, i) => isWithinTolerance(v, targets[i], tolerance))
      if (!ok) return
      successFiredRef.current = true
      setSolved(true)
      onSuccess?.()
    },
    [onSuccess, targets, tolerance],
  )

  const handleChange = useCallback(
    (index: number, raw: string) => {
      if (solved) return
      const v = Number(raw)
      setValues((prev) => {
        const next = prev.map((x, i) => (i === index ? v : x))
        trySuccess(next)
        return next
      })
    },
    [solved, trySuccess],
  )

  const handleReset = useCallback(() => {
    successFiredRef.current = false
    setSolved(false)
    setValues(targets.map((t) => randomStart(t, tolerance)))
  }, [targets, tolerance])

  useEffect(() => {
    successFiredRef.current = false
    setSolved(false)
    setValues(targets.map((t) => randomStart(t, tolerance)))
  }, [targets, tolerance])

  return (
    <div className="w-full">
      <p className="mb-3 text-center text-xs text-mist-muted">
        拖动 {count} 层滑块对齐远 / 中 / 近景，误差 ±{tolerance}% 内即解密成功
      </p>

      <div
        className="relative mb-5 w-full overflow-hidden rounded-xl border border-jade/25 bg-void-950 shadow-glow"
        style={{ aspectRatio: imageAspect }}
      >
        {bands.map((band, i) => {
          const offset = sliderToOffset(values[i] ?? 50)
          const aligned = isWithinTolerance(values[i] ?? 50, targets[i], tolerance)

          return (
            <div
              key={band.id}
              className="absolute inset-0 overflow-hidden will-change-transform"
              style={{
                zIndex: i + 1,
                clipPath: band.clipPath,
                transform: `translate3d(${offset}%, 0, 0)`,
              }}
            >
              <img
                src={imageUrl}
                alt=""
                draggable={false}
                className={`pointer-events-none absolute top-0 h-full w-[150%] max-w-none select-none object-cover ${
                  aligned || solved ? 'opacity-100' : 'opacity-90'
                }`}
                style={{ left: '50%', transform: 'translateX(-50%)' }}
              />
            </div>
          )
        })}

        <AnimatePresence>
          {solved && (
            <motion.img
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              src={imageUrl}
              alt="视差剪影"
              className="absolute inset-0 z-20 h-full w-full object-cover"
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {solved && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.75, 0] }}
              transition={{ duration: 0.9, times: [0, 0.35, 1] }}
              className="pointer-events-none absolute inset-0 z-30 bg-gradient-to-b from-gold-bright/25 via-white/15 to-jade-bright/15"
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {solved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
            >
              <div className="rounded-2xl border border-gold-bright/50 bg-void-950/60 px-5 py-3 text-center shadow-glow-gold backdrop-blur-sm">
                <p className="text-base font-medium text-gold-bright">视差解密成功！</p>
                <p className="mt-0.5 text-[11px] text-jade-bright">云峰剪影已完整复原</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-4">
        {bands.map((band, i) => {
          const aligned = isWithinTolerance(values[i] ?? 50, targets[i], tolerance)
          return (
            <div key={band.id}>
              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                <span className={`tracking-wider ${band.color}`}>{band.label}位移</span>
                <span className={aligned ? 'text-jade-bright' : 'text-mist-faint'}>
                  {values[i]}%
                  {aligned && ' ✓'}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={values[i]}
                disabled={solved}
                className="range-mythic w-full"
                aria-label={`${band.label}滑块`}
                onChange={(e) => handleChange(i, e.target.value)}
              />
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          className="rounded-lg border border-sky/25 px-2.5 py-1 text-[11px] text-sky-bright active:bg-sky/10"
          onPointerDown={(e) => {
            e.preventDefault()
            handleReset()
          }}
        >
          重新打乱
        </button>
      </div>
    </div>
  )
}

export default SilhouetteSlider
