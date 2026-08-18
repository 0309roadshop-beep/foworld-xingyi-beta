import { AnimatePresence, motion } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'

/** 目标对齐角度：0° = 正上方（12 点方向） */
const TARGET_ANGLE = 0
/** 对齐容差 ±5° */
const TOLERANCE = 5

const RING_SIZES = [100, 72, 44] as const
const RING_LABELS = ['外环', '中环', '内环'] as const

type RingId = 0 | 1 | 2

interface RingState {
  angle: number
  locked: boolean
}

interface DragState {
  ringId: RingId
  startPointerAngle: number
  startRingAngle: number
}

/** 将角度归一化到 [0, 360) */
function normalizeDeg(deg: number) {
  return ((deg % 360) + 360) % 360
}

/** 两角度之间的最短差值，处理 ±180° 边界突变 */
function shortestDelta(from: number, to: number) {
  let d = to - from
  while (d > 180) d -= 360
  while (d < -180) d += 360
  return d
}

/** 计算触摸点相对圆心的角度（deg，0=右，逆时针为正；减 90 使 0=正上方） */
function pointerAngleDeg(clientX: number, clientY: number, cx: number, cy: number) {
  const rad = Math.atan2(clientY - cy, clientX - cx)
  return normalizeDeg(rad * (180 / Math.PI) + 90)
}

/** 是否在目标角度容差内 */
function isAligned(angle: number, target: number, tolerance: number) {
  return Math.abs(shortestDelta(normalizeDeg(angle), normalizeDeg(target))) <= tolerance
}

/** 随机初始角度，保证不在对齐区 */
function randomStartAngle() {
  let a: number
  do {
    a = Math.random() * 360
  } while (isAligned(a, TARGET_ANGLE, TOLERANCE + 10))
  return a
}

function createInitialRings(): RingState[] {
  return RING_SIZES.map(() => ({
    angle: randomStartAngle(),
    locked: false,
  }))
}

/** 单环装饰：刻度 + 指针标记 */
function RingFace({
  ringId,
  locked,
  aligned,
}: {
  ringId: RingId
  locked: boolean
  aligned: boolean
}) {
  const colors = [
    { stroke: '#2dd4a8', glow: 'rgba(45,212,168,0.45)', fill: 'rgba(45,212,168,0.08)' },
    { stroke: '#38bdf8', glow: 'rgba(56,189,248,0.45)', fill: 'rgba(56,189,248,0.08)' },
    { stroke: '#fde68a', glow: 'rgba(253,230,138,0.5)', fill: 'rgba(253,230,138,0.08)' },
  ][ringId]

  return (
    <svg
      viewBox="0 0 200 200"
      className="h-full w-full"
      aria-hidden
    >
      <circle cx="100" cy="100" r="94" fill={colors.fill} stroke={colors.stroke} strokeWidth="2" opacity="0.9" />
      <circle cx="100" cy="100" r="78" fill="none" stroke={colors.stroke} strokeWidth="0.5" opacity="0.35" />

      {/* 刻度 */}
      {Array.from({ length: 36 }).map((_, i) => {
        const rad = ((i * 10 - 90) * Math.PI) / 180
        const major = i % 9 === 0
        const r1 = major ? 82 : 86
        const r2 = 94
        return (
          <line
            key={i}
            x1={100 + r1 * Math.cos(rad)}
            y1={100 + r1 * Math.sin(rad)}
            x2={100 + r2 * Math.cos(rad)}
            y2={100 + r2 * Math.sin(rad)}
            stroke={colors.stroke}
            strokeWidth={major ? 2 : 0.8}
            opacity={major ? 0.9 : 0.45}
          />
        )
      })}

      {/* 12 点方向对齐标记（旋转后指向正上方即为对齐） */}
      <polygon
        points="100,14 108,34 92,34"
        fill={aligned || locked ? colors.stroke : 'rgba(232,244,248,0.5)'}
        style={{ filter: aligned || locked ? `drop-shadow(0 0 6px ${colors.glow})` : undefined }}
      />

      {/* 环序号 */}
      <text
        x="100"
        y="118"
        textAnchor="middle"
        fill={colors.stroke}
        fontSize="11"
        opacity="0.7"
      >
        {RING_LABELS[ringId]}
      </text>
    </svg>
  )
}

interface AstrolabeProps {
  onSuccess?: () => void
}

export function Astrolabe({ onSuccess }: AstrolabeProps) {
  const [rings, setRings] = useState<RingState[]>(() => createInitialRings())
  const [allLocked, setAllLocked] = useState(false)
  const [activeRing, setActiveRing] = useState<RingId | null>(null)
  const ringRefs = useRef<(HTMLDivElement | null)[]>([])
  const dragRef = useRef<DragState | null>(null)
  const successFiredRef = useRef(false)

  /** 三环同时对齐 → 锁定并回调 */
  const tryLockAll = useCallback(
    (next: RingState[]) => {
      if (successFiredRef.current) return next
      const aligned = next.every((r) => isAligned(r.angle, TARGET_ANGLE, TOLERANCE))
      if (!aligned) return next

      successFiredRef.current = true
      setAllLocked(true)
      setActiveRing(null)
      dragRef.current = null
      onSuccess?.()
      return next.map((r) => ({ ...r, locked: true }))
    },
    [onSuccess],
  )

  const getRingCenter = useCallback((ringId: RingId) => {
    const el = ringRefs.current[ringId]
    if (!el) return null
    const rect = el.getBoundingClientRect()
    return {
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
    }
  }, [])

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, ringId: RingId) => {
      if (allLocked || rings[ringId].locked) return
      e.preventDefault()
      e.stopPropagation()

      const center = getRingCenter(ringId)
      if (!center) return

      dragRef.current = {
        ringId,
        startPointerAngle: pointerAngleDeg(e.clientX, e.clientY, center.cx, center.cy),
        startRingAngle: rings[ringId].angle,
      }
      setActiveRing(ringId)
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [allLocked, rings, getRingCenter],
  )

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, ringId: RingId) => {
      const drag = dragRef.current
      if (!drag || drag.ringId !== ringId || allLocked) return
      e.preventDefault()

      const center = getRingCenter(ringId)
      if (!center) return

      const currentPointer = pointerAngleDeg(e.clientX, e.clientY, center.cx, center.cy)
      const delta = shortestDelta(drag.startPointerAngle, currentPointer)
      const nextAngle = normalizeDeg(drag.startRingAngle + delta)

      setRings((prev) => {
        const next = prev.map((r, i) =>
          i === ringId ? { ...r, angle: nextAngle } : r,
        )
        return tryLockAll(next)
      })
    },
    [allLocked, getRingCenter, tryLockAll],
  )

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, ringId: RingId) => {
      if (dragRef.current?.ringId === ringId) {
        dragRef.current = null
        setActiveRing(null)
      }
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    },
    [],
  )

  const handleReset = useCallback(() => {
    successFiredRef.current = false
    setAllLocked(false)
    setActiveRing(null)
    dragRef.current = null
    setRings(createInitialRings())
  }, [])

  useEffect(() => {
    return () => {
      dragRef.current = null
    }
  }, [])

  return (
    <div className="w-full">
      <p className="mb-3 text-center text-xs text-mist-muted">
        旋转三环，使各环标记同时指向正上方（±{TOLERANCE}°）即可锁定星盘
      </p>

      <div
        className="relative mx-auto aspect-square w-full touch-none select-none"
        style={{ touchAction: 'none' }}
      >
        {/* 顶部目标指示线（固定不旋转） */}
        <div className="pointer-events-none absolute left-1/2 top-0 z-20 h-full w-px -translate-x-1/2">
          <div className="absolute left-1/2 top-2 h-3 w-3 -translate-x-1/2 rotate-45 border border-gold-bright/60 bg-gold-bright/20" />
          <div className="absolute left-1/2 top-5 h-[calc(50%-1.25rem)] w-px -translate-x-1/2 bg-gradient-to-b from-gold-bright/70 to-transparent" />
        </div>

        {/* 三环：由外到内，外层 z-index 更低 */}
        {RING_SIZES.map((sizePct, ringId) => {
          const r = rings[ringId]
          const aligned = isAligned(r.angle, TARGET_ANGLE, TOLERANCE)
          const isActive = activeRing === ringId

          return (
            <motion.div
              key={ringId}
              ref={(el) => {
                ringRefs.current[ringId] = el
              }}
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                r.locked || allLocked
                  ? 'pointer-events-none cursor-default'
                  : 'cursor-grab active:cursor-grabbing'
              } ${isActive && !r.locked ? 'z-30' : ringId === 0 ? 'z-10' : ringId === 1 ? 'z-20' : 'z-[25]'}`}
              style={{
                width: `${sizePct}%`,
                height: `${sizePct}%`,
                touchAction: 'none',
                rotate: r.angle,
              }}
              animate={
                r.locked
                  ? {
                      boxShadow: [
                        '0 0 0px rgba(45,212,168,0)',
                        '0 0 24px rgba(45,212,168,0.55)',
                        '0 0 16px rgba(253,230,138,0.45)',
                      ],
                    }
                  : isActive
                    ? { scale: 1.02 }
                    : { scale: 1 }
              }
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onPointerDown={(e) => handlePointerDown(e, ringId as RingId)}
              onPointerMove={(e) => handlePointerMove(e, ringId as RingId)}
              onPointerUp={(e) => handlePointerUp(e, ringId as RingId)}
              onPointerCancel={(e) => handlePointerUp(e, ringId as RingId)}
            >
              <div
                className={`h-full w-full rounded-full transition-shadow duration-300 ${
                  r.locked
                    ? 'ring-2 ring-gold-bright/70'
                    : aligned
                      ? 'ring-1 ring-jade-bright/60'
                      : isActive
                        ? 'ring-1 ring-sky/50'
                        : ''
                }`}
              >
                <RingFace
                  ringId={ringId as RingId}
                  locked={r.locked}
                  aligned={aligned}
                />
              </div>
            </motion.div>
          )
        })}

        {/* 中心 hub */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-40 h-[18%] w-[18%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-jade/30 bg-void-900/90 shadow-glow">
          <div className="absolute inset-2 rounded-full border border-gold-bright/20 bg-gradient-to-br from-jade-deep/40 to-sky-deep/30" />
        </div>

        {/* 锁定成功特效 */}
        <AnimatePresence>
          {allLocked && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center rounded-full bg-void-950/40 backdrop-blur-[2px]"
            >
              <motion.div
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl border border-gold-bright/50 bg-jade-deep/50 px-5 py-3 text-center shadow-glow-gold"
              >
                <p className="text-base font-medium text-gold-bright">星盘锁定！</p>
                <p className="mt-0.5 text-[11px] text-jade-bright">三环同心对齐</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 角度调试 / 状态提示 */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-mist-faint">
        <div className="flex gap-2">
          {rings.map((r, i) => (
            <span
              key={i}
              className={
                isAligned(r.angle, TARGET_ANGLE, TOLERANCE)
                  ? 'text-jade-bright'
                  : 'text-mist-faint'
              }
            >
              {RING_LABELS[i]}
              {Math.round(normalizeDeg(r.angle))}°
            </span>
          ))}
        </div>
        <button
          type="button"
          className="rounded-lg border border-sky/25 px-2.5 py-1 text-sky-bright active:bg-sky/10"
          onPointerDown={(e) => {
            e.preventDefault()
            handleReset()
          }}
        >
          重新校准
        </button>
      </div>
    </div>
  )
}

export default Astrolabe
