import { AnimatePresence, motion } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { ModalOverlay } from '../ui/ModalOverlay'

const FRAGMENT_COUNT = 3
const DROP_RADIUS = 56
const FUSION_MS = 1600
const FLASH_MS = 900

const HOME_POSITIONS = [
  { x: 0.18, y: 0.82 },
  { x: 0.5, y: 0.88 },
  { x: 0.82, y: 0.82 },
] as const

const SNAP_OFFSETS = [
  { x: -14, y: -8 },
  { x: 14, y: -8 },
  { x: 0, y: 12 },
] as const

type Phase = 'drag' | 'fusing' | 'core' | 'done'

interface FragmentPos {
  id: number
  x: number
  y: number
  placed: boolean
}

function CrystalFragmentIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 56" className={className} fill="currentColor" aria-hidden>
      <path
        d="M24 4 L38 22 L32 48 L16 52 L8 30 L14 12 Z"
        opacity="0.92"
        style={{ filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.75))' }}
      />
      <path d="M20 18 L28 26 L22 38" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
    </svg>
  )
}

export interface CoreFusionProps {
  onComplete?: () => void
}

/**
 * 阵核重铸 — 拖拽三块阵核碎片入中央法阵，土元素压制融合
 */
export function CoreFusion({ onComplete }: CoreFusionProps) {
  const arenaRef = useRef<HTMLDivElement>(null)
  const centerRef = useRef({ x: 0, y: 0 })
  const dragRef = useRef<{ id: number; offsetX: number; offsetY: number } | null>(null)

  const [phase, setPhase] = useState<Phase>('drag')
  const [showModal, setShowModal] = useState(false)
  const [flash, setFlash] = useState(false)
  const [positions, setPositions] = useState<FragmentPos[]>(() =>
    HOME_POSITIONS.map((p, i) => ({ x: p.x, y: p.y, placed: false, id: i })),
  )

  const placedCount = positions.filter((p) => p.placed).length
  const allPlaced = placedCount === FRAGMENT_COUNT

  const measureCenter = useCallback(() => {
    const arena = arenaRef.current
    if (!arena) return
    const rect = arena.getBoundingClientRect()
    centerRef.current = { x: rect.width * 0.5, y: rect.height * 0.38 }
  }, [])

  useEffect(() => {
    measureCenter()
    const arena = arenaRef.current
    if (!arena) return
    const ro = new ResizeObserver(() => measureCenter())
    ro.observe(arena)
    return () => ro.disconnect()
  }, [measureCenter])

  const pxFromRatio = useCallback((rx: number, ry: number) => {
    const arena = arenaRef.current
    if (!arena) return { x: 0, y: 0 }
    const rect = arena.getBoundingClientRect()
    return { x: rx * rect.width, y: ry * rect.height }
  }, [])

  const startFusion = useCallback(() => {
    setPhase('fusing')
    setFlash(true)
    window.setTimeout(() => setFlash(false), FLASH_MS)
    window.setTimeout(() => {
      setPhase('core')
      setShowModal(true)
    }, FUSION_MS)
  }, [])

  useEffect(() => {
    if (phase === 'drag' && allPlaced) {
      const t = window.setTimeout(() => startFusion(), 400)
      return () => window.clearTimeout(t)
    }
  }, [phase, allPlaced, startFusion])

  const handlePointerDown = useCallback(
    (id: number, e: ReactPointerEvent<HTMLDivElement>) => {
      if (phase !== 'drag') return
      const frag = positions.find((p) => p.id === id)
      if (!frag || frag.placed) return

      const arena = arenaRef.current
      if (!arena) return
      const rect = arena.getBoundingClientRect()
      const px = frag.x * rect.width
      const py = frag.y * rect.height

      dragRef.current = {
        id,
        offsetX: e.clientX - rect.left - px,
        offsetY: e.clientY - rect.top - py,
      }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [phase, positions],
  )

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current
      if (!drag || phase !== 'drag') return

      const arena = arenaRef.current
      if (!arena) return
      const rect = arena.getBoundingClientRect()
      const x = (e.clientX - rect.left - drag.offsetX) / rect.width
      const y = (e.clientY - rect.top - drag.offsetY) / rect.height

      setPositions((prev) =>
        prev.map((p) =>
          p.id === drag.id
            ? {
                ...p,
                x: Math.max(0.08, Math.min(0.92, x)),
                y: Math.max(0.12, Math.min(0.94, y)),
              }
            : p,
        ),
      )
    },
    [phase],
  )

  const handlePointerUp = useCallback(
    (id: number, e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current
      if (!drag || drag.id !== id) return
      dragRef.current = null
      e.currentTarget.releasePointerCapture(e.pointerId)

      const arena = arenaRef.current
      if (!arena || phase !== 'drag') return

      const rect = arena.getBoundingClientRect()
      const frag = positions.find((p) => p.id === id)
      if (!frag) return

      const fx = frag.x * rect.width
      const fy = frag.y * rect.height
      const cx = centerRef.current.x
      const cy = centerRef.current.y
      const dist = Math.hypot(fx - cx, fy - cy)

      if (dist <= DROP_RADIUS) {
        const snap = SNAP_OFFSETS[id]
        setPositions((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  placed: true,
                  x: (cx + snap.x) / rect.width,
                  y: (cy + snap.y) / rect.height,
                }
              : p,
          ),
        )
        if (navigator.vibrate) navigator.vibrate(40)
      } else {
        const home = HOME_POSITIONS[id]
        setPositions((prev) =>
          prev.map((p) => (p.id === id ? { ...p, x: home.x, y: home.y, placed: false } : p)),
        )
      }
    },
    [phase, positions],
  )

  const handleConfirm = useCallback(() => {
    setShowModal(false)
    setPhase('done')
    window.setTimeout(() => onComplete?.(), 500)
  }, [onComplete])

  return (
    <div className="w-full">
      <p className="mb-2 text-center text-xs text-amber-100/70">
        土元素亲和已觉醒 — 将三块排斥的阵核碎片拖入中央法阵
      </p>
      <p className="mb-3 text-center text-[11px] text-amber-200/50">
        已归位 {placedCount}/{FRAGMENT_COUNT}
      </p>

      <div
        ref={arenaRef}
        className="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-amber-700/30 shadow-[inset_0_0_60px_rgba(120,53,15,0.35)]"
        style={{
          height: 'min(58dvh, 440px)',
          background:
            'radial-gradient(circle at 50% 38%, rgba(180,120,40,0.28) 0%, rgba(69,45,12,0.55) 45%, rgba(28,18,8,0.95) 100%)',
        }}
        onPointerMove={handlePointerMove}
      >
        {/* 土黄色能量脉动 */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          animate={{ opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            background:
              'radial-gradient(circle at 50% 40%, rgba(251,191,36,0.12) 0%, transparent 55%)',
          }}
        />

        {/* 中央阵核模具 */}
        <div
          className="pointer-events-none absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2"
          style={{ width: 140, height: 140 }}
        >
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-amber-400/25 bg-amber-900/15"
            animate={
              phase === 'fusing' || phase === 'core'
                ? { scale: [1, 1.08, 1], opacity: [0.5, 1, 0.7] }
                : { scale: 1, opacity: 0.55 }
            }
            transition={{ duration: 0.8, repeat: phase === 'fusing' ? 2 : 0 }}
          />
          <div
            className="absolute inset-[18%] rounded-full border border-dashed border-amber-300/20"
            style={{
              boxShadow: 'inset 0 0 24px rgba(251,191,36,0.08)',
            }}
          />
          <div className="absolute inset-[32%] rounded-full border border-amber-500/15" />
          {[0, 45, 90, 135].map((deg) => (
            <span
              key={deg}
              className="absolute left-1/2 top-1/2 h-[48%] w-px origin-bottom bg-amber-400/15"
              style={{ transform: `translate(-50%, -100%) rotate(${deg}deg)` }}
            />
          ))}
        </div>

        {/* 融合后的大阵核心 */}
        <AnimatePresence>
          {(phase === 'core' || phase === 'done') && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="pointer-events-none absolute left-1/2 top-[38%] z-20 -translate-x-1/2 -translate-y-1/2"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                className="relative h-20 w-20"
              >
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      'radial-gradient(circle at 35% 30%, #fef3c7 0%, #fbbf24 35%, #b45309 70%, #78350f 100%)',
                    boxShadow:
                      '0 0 40px rgba(251,191,36,0.85), 0 0 80px rgba(245,158,11,0.45), inset 0 0 20px rgba(255,255,255,0.35)',
                  }}
                />
                <div
                  className="absolute inset-[22%] rounded-full border border-amber-100/40"
                  style={{ boxShadow: 'inset 0 0 12px rgba(255,255,255,0.5)' }}
                />
              </motion.div>
              <p className="mt-3 text-center text-[10px] tracking-[0.25em] text-amber-100/80">
                地脉阵核
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 金色融合闪光 */}
        <AnimatePresence>
          {flash && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.95, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: FLASH_MS / 1000 }}
              className="pointer-events-none absolute inset-0 z-30 bg-amber-200"
            />
          )}
        </AnimatePresence>

        {/* 可拖拽碎片 */}
        {positions.map((frag) => {
          const home = pxFromRatio(frag.x, frag.y)
          const isFusing = phase === 'fusing' && frag.placed
          const hidden = phase === 'core' || phase === 'done'

          return (
            <motion.div
              key={frag.id}
              className={`absolute z-10 touch-none ${phase === 'drag' && !frag.placed ? 'cursor-grab active:cursor-grabbing' : ''}`}
              style={{
                left: home.x,
                top: home.y,
                x: '-50%',
                y: '-50%',
              }}
              animate={
                isFusing
                  ? {
                      left: centerRef.current.x,
                      top: centerRef.current.y,
                      scale: [1, 1.15, 0],
                      opacity: [1, 1, 0],
                    }
                  : hidden
                    ? { opacity: 0, scale: 0 }
                    : { opacity: 1, scale: 1 }
              }
              transition={{ duration: isFusing ? 0.9 : 0.35, ease: 'easeInOut' }}
              onPointerDown={(e) => handlePointerDown(frag.id, e)}
              onPointerUp={(e) => handlePointerUp(frag.id, e)}
            >
              <CrystalFragmentIcon
                className={`h-12 w-12 text-amber-200 drop-shadow-[0_0_14px_rgba(251,191,36,0.7)] ${
                  frag.placed ? 'text-amber-100' : ''
                }`}
              />
            </motion.div>
          )
        })}

        {phase === 'fusing' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute bottom-4 left-0 right-0 text-center text-xs tracking-widest text-amber-100/90"
          >
            土元素重压融合中…
          </motion.p>
        )}
      </div>

      <ModalOverlay open={showModal}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full rounded-2xl border border-amber-400/35 bg-void-950 p-5 text-center shadow-[0_0_40px_rgba(251,191,36,0.2)]"
        >
          <p className="mb-1 text-base font-medium text-amber-100">重铸成功！</p>
          <p className="mb-4 text-sm leading-relaxed text-mist">
            获得【地脉阵核】。大阵开启的钥匙已在你手中！这几天一路奔波，想必唤灵师的肉身也疲惫了。带着你这几天辛勤积攒的【灵源】，去街心花园好好犒劳一下自己吧！
          </p>
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full rounded-xl border border-gold-muted/40 bg-gold-muted/10 py-3 text-sm font-medium text-gold-bright active:bg-gold-muted/20"
          >
            前往街心花园
          </button>
        </motion.div>
      </ModalOverlay>
    </div>
  )
}

export default CoreFusion
