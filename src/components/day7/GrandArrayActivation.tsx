import { AnimatePresence, motion } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { SPIRIT_CATALOG } from '../../config/spiritCatalog'

const SLOT_COUNT = 7
const CORE_DROP_RADIUS = 52
const CHORD_HZ = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33]

const SLOT_ANGLES = Array.from({ length: SLOT_COUNT }, (_, i) => ((i * 360) / SLOT_COUNT - 90) * (Math.PI / 180))

type Phase = 'core' | 'spirits' | 'activating' | 'done'
type Scope = 'core' | 'spirits' | 'full'

interface SpiritOrb {
  id: string
  name: string
  hue: string
}

const DEFAULT_ORBS: SpiritOrb[] = SPIRIT_CATALOG.slice(0, SLOT_COUNT).map((s, i) => ({
  id: s.id,
  name: s.name,
  hue: `hsl(${(i * 47 + 200) % 360}, 72%, 62%)`,
}))

function playChordNote(index: number) {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = CHORD_HZ[index % CHORD_HZ.length]
    gain.gain.setValueAtTime(0.14, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.6)
    window.setTimeout(() => ctx.close(), 700)
  } catch {
    /* ignore audio errors */
  }
}

function CoreOrb({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-full ${className ?? ''}`}
      style={{
        background:
          'radial-gradient(circle at 35% 30%, #fef3c7 0%, #fbbf24 38%, #b45309 72%, #78350f 100%)',
        boxShadow: '0 0 28px rgba(251,191,36,0.75), inset 0 0 16px rgba(255,255,255,0.35)',
      }}
    />
  )
}

export interface GrandArrayActivationProps {
  /** core = 仅阵核；spirits = 仅灵兽；full = 连贯两阶段 */
  scope?: Scope
  /** spirits 模式下阵核已归位 */
  corePreplaced?: boolean
  spiritOrbs?: SpiritOrb[]
  onComplete?: () => void
}

/**
 * 终局大阵 — 阵核归位 + 万灵归宗
 */
export function GrandArrayActivation({
  scope = 'full',
  corePreplaced = false,
  spiritOrbs = DEFAULT_ORBS,
  onComplete,
}: GrandArrayActivationProps) {
  const arenaRef = useRef<HTMLDivElement>(null)
  const centerRef = useRef({ x: 0, y: 0 })
  const coreDragRef = useRef<{ offsetX: number; offsetY: number } | null>(null)
  const doneRef = useRef(false)

  const initialPhase: Phase =
    scope === 'spirits' || corePreplaced ? 'spirits' : 'core'

  const [phase, setPhase] = useState<Phase>(initialPhase)
  const [corePlaced, setCorePlaced] = useState(scope !== 'core' && (corePreplaced || scope === 'spirits'))
  const [corePos, setCorePos] = useState({ x: 0.5, y: 0.88 })
  const [coreDragging, setCoreDragging] = useState(false)
  const [shake, setShake] = useState(false)
  const [flash, setFlash] = useState(false)
  const [placedSlots, setPlacedSlots] = useState<Record<number, string>>({})
  const [selectedOrbId, setSelectedOrbId] = useState<string | null>(null)

  const placedCount = Object.keys(placedSlots).length
  const arrayGlow = corePlaced ? 0.35 + (placedCount / SLOT_COUNT) * 0.55 : 0.12

  const availableOrbs = useMemo(
    () => spiritOrbs.filter((o) => !Object.values(placedSlots).includes(o.id)),
    [spiritOrbs, placedSlots],
  )

  const measureCenter = useCallback(() => {
    const arena = arenaRef.current
    if (!arena) return
    const rect = arena.getBoundingClientRect()
    centerRef.current = { x: rect.width * 0.5, y: rect.height * 0.42 }
  }, [])

  useEffect(() => {
    measureCenter()
    const arena = arenaRef.current
    if (!arena) return
    const ro = new ResizeObserver(() => measureCenter())
    ro.observe(arena)
    return () => ro.disconnect()
  }, [measureCenter])

  const triggerActivation = useCallback(() => {
    if (doneRef.current) return
    setPhase('activating')
    setFlash(true)
    window.setTimeout(() => {
      doneRef.current = true
      setPhase('done')
      window.setTimeout(() => onComplete?.(), 900)
    }, 1200)
  }, [onComplete])

  const placeCore = useCallback(() => {
    setCorePlaced(true)
    setShake(true)
    if (navigator.vibrate) navigator.vibrate([50, 40, 80])
    window.setTimeout(() => setShake(false), 600)

    if (scope === 'core') {
      window.setTimeout(() => onComplete?.(), 900)
      return
    }
    window.setTimeout(() => setPhase('spirits'), 700)
  }, [scope, onComplete])

  const handleCorePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (phase !== 'core' || corePlaced) return
    e.preventDefault()
    const arena = arenaRef.current
    if (!arena) return
    const rect = arena.getBoundingClientRect()
    const px = corePos.x * rect.width
    const py = corePos.y * rect.height
    coreDragRef.current = {
      offsetX: e.clientX - rect.left - px,
      offsetY: e.clientY - rect.top - py,
    }
    setCoreDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handleCorePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!coreDragging || phase !== 'core') return
    const arena = arenaRef.current
    if (!arena) return
    const rect = arena.getBoundingClientRect()
    const x = (e.clientX - rect.left - coreDragRef.current!.offsetX) / rect.width
    const y = (e.clientY - rect.top - coreDragRef.current!.offsetY) / rect.height
    setCorePos({
      x: Math.max(0.1, Math.min(0.9, x)),
      y: Math.max(0.15, Math.min(0.92, y)),
    })
  }

  const handleCorePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!coreDragging) return
    coreDragRef.current = null
    setCoreDragging(false)
    e.currentTarget.releasePointerCapture(e.pointerId)

    const arena = arenaRef.current
    if (!arena || phase !== 'core') return
    const rect = arena.getBoundingClientRect()
    const cx = centerRef.current.x
    const cy = centerRef.current.y
    const fx = corePos.x * rect.width
    const fy = corePos.y * rect.height
    if (Math.hypot(fx - cx, fy - cy) <= CORE_DROP_RADIUS) {
      setCorePos({ x: cx / rect.width, y: cy / rect.height })
      placeCore()
    } else {
      setCorePos({ x: 0.5, y: 0.88 })
    }
  }

  const placeSpiritOnSlot = useCallback(
    (slotIndex: number, orbId: string) => {
      if (phase !== 'spirits' || placedSlots[slotIndex]) return
      const orbIndex = spiritOrbs.findIndex((o) => o.id === orbId)
      playChordNote(orbIndex >= 0 ? orbIndex : placedCount)
      setPlacedSlots((prev) => ({ ...prev, [slotIndex]: orbId }))
      setSelectedOrbId(null)
      if (navigator.vibrate) navigator.vibrate(25)

      const nextCount = placedCount + 1
      if (nextCount >= SLOT_COUNT) {
        window.setTimeout(() => triggerActivation(), 400)
      }
    },
    [phase, placedSlots, spiritOrbs, placedCount, triggerActivation],
  )

  const handleSlotClick = (slotIndex: number) => {
    if (selectedOrbId) {
      placeSpiritOnSlot(slotIndex, selectedOrbId)
    }
  }

  const handleOrbClick = (orbId: string) => {
    if (phase !== 'spirits') return
    setSelectedOrbId((prev) => (prev === orbId ? null : orbId))
  }

  const slotPositions = useMemo(() => {
    const r = 0.34
    return SLOT_ANGLES.map((a) => ({
      x: 0.5 + Math.cos(a) * r,
      y: 0.42 + Math.sin(a) * r * 0.92,
    }))
  }, [])

  return (
    <div className="w-full">
      <p className="mb-2 text-center text-xs text-sky-bright/70">
        {phase === 'core'
          ? '将【地脉阵核】拖入阵眼凹槽'
          : phase === 'spirits'
            ? `万灵归宗 · 已就位 ${placedCount}/${SLOT_COUNT}`
            : '大阵激活中…'}
      </p>

      <div
        ref={arenaRef}
        className={`relative mx-auto w-full overflow-hidden rounded-2xl border border-indigo-900/40 ${
          shake ? 'animate-[cave-magnetic-shake_0.28s_linear_3]' : ''
        }`}
        style={{
          height: 'min(62dvh, 480px)',
          filter: phase === 'activating' ? 'brightness(2.2) scale(1.08)' : `brightness(${0.85 + arrayGlow * 0.35})`,
          transition: phase === 'activating' ? 'filter 1s ease-in' : 'filter 0.5s ease-out',
        }}
        onPointerMove={handleCorePointerMove}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 38%, #1e1b4b 0%, #0f0a1a 45%, #050508 100%)',
          }}
        />
        <motion.div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(2px 2px at 20% 30%, white, transparent), radial-gradient(1px 1px at 80% 20%, white, transparent), radial-gradient(1.5px 1.5px at 60% 70%, white, transparent)',
            backgroundSize: '100% 100%',
          }}
          animate={{ opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 5, repeat: Infinity }}
        />

        {/* 古老阵盘 */}
        <div className="pointer-events-none absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2">
          {[1, 0.72, 0.48].map((scale, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border"
              style={{
                width: `${scale * 280}px`,
                height: `${scale * 280}px`,
                borderColor: `rgba(251, 191, 36, ${0.08 + arrayGlow * (0.35 - i * 0.08)})`,
                boxShadow: corePlaced
                  ? `0 0 ${20 + arrayGlow * 40}px rgba(251,191,36,${0.15 + arrayGlow * 0.25})`
                  : 'none',
              }}
            />
          ))}
          {[0, 45, 90, 135].map((deg) => (
            <span
              key={deg}
              className="absolute left-1/2 top-1/2 h-[48%] w-px origin-bottom bg-amber-400/10"
              style={{ transform: `translate(-50%, -100%) rotate(${deg}deg)` }}
            />
          ))}
        </div>

        {/* 中心凹槽 */}
        <div
          className="pointer-events-none absolute left-1/2 top-[42%] z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed"
          style={{
            width: 64,
            height: 64,
            borderColor: corePlaced ? 'rgba(251,191,36,0.5)' : 'rgba(148,163,184,0.25)',
            boxShadow: corePlaced ? 'inset 0 0 20px rgba(251,191,36,0.35)' : 'inset 0 0 12px rgba(0,0,0,0.5)',
          }}
        />
        {corePlaced && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="pointer-events-none absolute left-1/2 top-[42%] z-20 -translate-x-1/2 -translate-y-1/2"
          >
            <CoreOrb className="h-14 w-14" />
          </motion.div>
        )}

        {/* 灵兽底座 */}
        {slotPositions.map((pos, i) => {
          const filled = placedSlots[i]
          const orb = filled ? spiritOrbs.find((o) => o.id === filled) : null
          return (
            <button
              key={i}
              type="button"
              disabled={phase !== 'spirits' || !!filled}
              onClick={() => handleSlotClick(i)}
              className={`absolute z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border transition-colors ${
                filled
                  ? 'border-amber-400/50 bg-void-950/80'
                  : selectedOrbId
                    ? 'border-cyan-400/50 bg-cyan-950/40 animate-pulse'
                    : 'border-slate-600/40 bg-void-950/60'
              }`}
              style={{
                left: `${pos.x * 100}%`,
                top: `${pos.y * 100}%`,
              }}
            >
              {orb ? (
                <span
                  className="h-6 w-6 rounded-full shadow-[0_0_12px_currentColor]"
                  style={{ background: orb.hue, color: orb.hue }}
                />
              ) : (
                <span className="h-2 w-2 rounded-full bg-mist-faint/30" />
              )}
            </button>
          )
        })}

        {/* 区域扇形点亮 */}
        {placedCount > 0 && (
          <motion.div
            className="pointer-events-none absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: 200,
              height: 200,
              background: `conic-gradient(from -90deg, rgba(251,191,36,0.25) 0deg, rgba(251,191,36,0.25) ${(placedCount / SLOT_COUNT) * 360}deg, transparent ${(placedCount / SLOT_COUNT) * 360}deg)`,
            }}
            animate={{ opacity: [0.5, 0.85, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}

        {/* 可拖拽阵核 */}
        {phase === 'core' && !corePlaced && (
          <motion.div
            className="absolute z-30 touch-none cursor-grab active:cursor-grabbing"
            style={{
              left: `${corePos.x * 100}%`,
              top: `${corePos.y * 100}%`,
              x: '-50%',
              y: '-50%',
              transition: coreDragging ? 'none' : 'left 0.4s ease-out, top 0.4s ease-out',
            }}
            onPointerDown={handleCorePointerDown}
            onPointerUp={handleCorePointerUp}
          >
            <CoreOrb className="h-16 w-16" />
            <p className="mt-1 text-center text-[9px] text-amber-200/80">地脉阵核</p>
          </motion.div>
        )}

        <AnimatePresence>
          {flash && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="pointer-events-none absolute inset-0 z-40 bg-white"
            />
          )}
        </AnimatePresence>
      </div>

      {/* 灵兽光球选择区 */}
      {phase === 'spirits' && (
        <div className="mt-4 flex flex-wrap justify-center gap-2 px-2">
          {availableOrbs.map((orb) => (
            <button
              key={orb.id}
              type="button"
              onClick={() => handleOrbClick(orb.id)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] transition-colors ${
                selectedOrbId === orb.id
                  ? 'border-cyan-400/60 bg-cyan-950/50 text-cyan-100'
                  : 'border-mist-faint/20 bg-void-950/80 text-mist-muted'
              }`}
            >
              <span
                className="h-4 w-4 rounded-full shadow-[0_0_8px_currentColor]"
                style={{ background: orb.hue, color: orb.hue }}
              />
              {orb.name}
            </button>
          ))}
        </div>
      )}
      {phase === 'spirits' && (
        <p className="mt-2 text-center text-[10px] text-mist-faint">
          点击灵兽，再点击阵盘边缘底座归位
        </p>
      )}
    </div>
  )
}

export default GrandArrayActivation
