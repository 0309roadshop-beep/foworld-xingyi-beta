import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'

const HOLD_MS = 3000
const SUCCESS_MS = 1400
const RING_R = 36
const RING_C = 2 * Math.PI * RING_R
const SINK_Y = 72
const SINK_SCALE = 0.78

type CaveMode = 'pre-entry' | 'diving'
type DivePhase = 'silent' | 'flash' | 'success'

export interface OfflineCaveProps {
  onComplete?: () => void
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

function glowIntensity(progress: number) {
  return progress <= 0 ? 0.12 : 0.12 + Math.pow(progress, 2.2) * 0.88
}

function EntryCompass({ sinkProgress, holding }: { sinkProgress: number; holding: boolean }) {
  const p = sinkProgress
  const glow = 1 - p * 0.92
  const sinkY = p * SINK_Y
  const scale = 1 - p * (1 - SINK_SCALE)

  return (
    <div
      className="relative flex h-44 w-44 items-center justify-center sm:h-52 sm:w-52"
      style={{
        transform: `translateY(${sinkY}px) scale(${scale})`,
        transition: holding ? 'none' : 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), filter 0.55s ease-out',
        filter: `brightness(${0.35 + glow * 0.65})`,
      }}
    >
      <span
        className="absolute inset-0 rounded-full border-2 shadow-[0_0_32px_rgba(56,189,248,0.2)]"
        style={{
          borderColor: `rgba(125, 211, 252, ${0.35 * glow})`,
          boxShadow: `0 0 ${32 * glow}px rgba(56, 189, 248, ${0.2 * glow})`,
        }}
      />
      <span
        className="absolute inset-[12%] rounded-full border border-dashed"
        style={{ borderColor: `rgba(103, 232, 249, ${0.4 * glow})` }}
      />
      <span
        className="absolute inset-[24%] rounded-full bg-gradient-to-br from-sky-deep/40 to-void-900"
        style={{
          boxShadow: `inset 0 0 ${24 * glow}px rgba(56, 189, 248, ${0.25 * glow})`,
          opacity: 0.4 + glow * 0.6,
        }}
      />
      <span
        className="absolute left-[12%] right-[12%] top-1/2 h-0.5 -translate-y-1/2"
        style={{ background: `rgba(125, 211, 252, ${0.5 * glow})` }}
      />
      <span
        className="absolute bottom-[12%] top-[12%] left-1/2 w-0.5 -translate-x-1/2"
        style={{ background: `rgba(125, 211, 252, ${0.5 * glow})` }}
      />
      <span
        className="absolute h-3 w-3 rounded-full bg-sky-bright"
        style={{
          opacity: 0.35 + glow * 0.65,
          boxShadow: `0 0 ${14 * glow}px rgba(125, 211, 252, ${0.9 * glow})`,
        }}
      />
      {glow > 0.15 && (
        <motion.span
          className="absolute inset-0 rounded-full border border-cyan-400/20"
          animate={{ scale: [1, 1.05, 1], opacity: [0.5 * glow, 0.85 * glow, 0.5 * glow] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </div>
  )
}

function DivingCompass({
  compassRotation,
  holding,
  visualProgress,
  intensity,
}: {
  compassRotation: number
  holding: boolean
  visualProgress: number
  intensity: number
}) {
  return (
    <div
      className="relative flex h-40 w-40 items-center justify-center sm:h-48 sm:w-48"
      style={{
        transform: `rotate(${compassRotation}deg)`,
        transition: holding ? 'none' : 'transform 0.45s ease-out',
      }}
    >
      <span
        className="absolute inset-0 rounded-full border"
        style={{
          borderColor: `rgba(125, 211, 252, ${0.08 + intensity * 0.55})`,
          boxShadow: `0 0 ${8 + intensity * 48}px rgba(34, 211, 238, ${intensity * 0.65})`,
          animation: visualProgress < 0.05 ? 'cave-compass-idle 4.8s ease-in-out infinite' : 'none',
        }}
      />
      <span
        className="absolute inset-[14%] rounded-full border border-dashed"
        style={{ borderColor: `rgba(94, 234, 212, ${0.06 + intensity * 0.5})` }}
      />
      <span
        className="absolute inset-[28%] rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(34,211,238,${intensity * 0.35}) 0%, transparent 70%)`,
          boxShadow: `0 0 ${12 + intensity * 56}px rgba(56, 189, 248, ${intensity * 0.85})`,
        }}
      />
      <span
        className="absolute left-[10%] right-[10%] top-1/2 h-px -translate-y-1/2"
        style={{ background: `rgba(165, 243, 252, ${0.15 + intensity * 0.75})` }}
      />
      <span
        className="absolute bottom-[10%] top-[10%] left-1/2 w-px -translate-x-1/2"
        style={{ background: `rgba(165, 243, 252, ${0.15 + intensity * 0.75})` }}
      />
      <span
        className="absolute h-2.5 w-2.5 rounded-full"
        style={{
          background: `rgba(224, 242, 254, ${0.35 + intensity * 0.65})`,
          boxShadow: `0 0 ${6 + intensity * 24}px rgba(125, 211, 252, ${0.5 + intensity * 0.5})`,
        }}
      />
    </div>
  )
}

function HoldRingButton({
  progress,
  holding,
  disabled,
  ringColor,
  label,
  subLabel,
  onPointerDown,
  onPointerUp,
}: {
  progress: number
  holding: boolean
  disabled?: boolean
  ringColor: string
  label: string
  subLabel: string
  onPointerDown: (e: PointerEvent<HTMLButtonElement>) => void
  onPointerUp: (e: PointerEvent<HTMLButtonElement>) => void
}) {
  const ringOffset = RING_C * (1 - progress)

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-[5.25rem] w-[5.25rem]">
        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 88 88" aria-hidden>
          <circle cx="44" cy="44" r={RING_R} fill="none" stroke="rgba(148, 163, 184, 0.2)" strokeWidth="3" />
          <circle
            cx="44"
            cy="44"
            r={RING_R}
            fill="none"
            stroke={ringColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={RING_C}
            strokeDashoffset={ringOffset}
            style={{
              filter: `drop-shadow(0 0 ${4 + progress * 10}px ${ringColor})`,
              transition: holding ? 'none' : 'stroke-dashoffset 0.35s ease-out',
            }}
          />
        </svg>
        <button
          type="button"
          disabled={disabled}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onPointerCancel={onPointerUp}
          className="absolute inset-[10px] flex items-center justify-center rounded-full border border-mist-faint/15 bg-void-950/90 text-[10px] leading-tight text-mist-muted/75 touch-manipulation disabled:opacity-40"
          style={{ touchAction: 'none' }}
        >
          {label}
        </button>
      </div>
      <p className="text-center text-xs text-mist-muted/60">{subLabel}</p>
    </div>
  )
}

/**
 * 地心潜航 — 长按深潜 ⇄ 长按上浮
 */
export function OfflineCave({ onComplete }: OfflineCaveProps) {
  const [mode, setMode] = useState<CaveMode>('pre-entry')
  const [divePhase, setDivePhase] = useState<DivePhase>('silent')

  // 入洞长按
  const [entryHolding, setEntryHolding] = useState(false)
  const [entryProgress, setEntryProgress] = useState(0)

  // 出洞长按
  const [holding, setHolding] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0)
  const [visualProgress, setVisualProgress] = useState(0)
  const [compassRotation, setCompassRotation] = useState(0)

  const entryHoldStartRef = useRef(0)
  const entryHoldRafRef = useRef(0)

  const holdStartRef = useRef(0)
  const holdRafRef = useRef(0)
  const decayRafRef = useRef(0)
  const rotationRef = useRef(0)
  const visualProgressRef = useRef(0)
  const lastVibrateRef = useRef(0)
  const doneRef = useRef(false)

  const clearEntryHoldLoop = useCallback(() => {
    if (entryHoldRafRef.current) {
      cancelAnimationFrame(entryHoldRafRef.current)
      entryHoldRafRef.current = 0
    }
  }, [])

  const clearHoldLoop = useCallback(() => {
    if (holdRafRef.current) {
      cancelAnimationFrame(holdRafRef.current)
      holdRafRef.current = 0
    }
  }, [])

  const clearDecayLoop = useCallback(() => {
    if (decayRafRef.current) {
      cancelAnimationFrame(decayRafRef.current)
      decayRafRef.current = 0
    }
  }, [])

  const triggerEntryComplete = useCallback(() => {
    clearEntryHoldLoop()
    setEntryHolding(false)
    setEntryProgress(1)
    window.setTimeout(() => {
      setMode('diving')
      setDivePhase('silent')
      setEntryProgress(0)
    }, 280)
  }, [clearEntryHoldLoop])

  const tickEntryHold = useCallback(() => {
    const elapsed = performance.now() - entryHoldStartRef.current
    const p = clamp01(elapsed / HOLD_MS)
    setEntryProgress(p)

    if (p >= 1) {
      triggerEntryComplete()
      return
    }
    entryHoldRafRef.current = requestAnimationFrame(tickEntryHold)
  }, [triggerEntryComplete])

  const handleEntryPointerDown = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      if (mode !== 'pre-entry') return
      e.preventDefault()
      clearEntryHoldLoop()
      setEntryHolding(true)
      entryHoldStartRef.current = performance.now()
      entryHoldRafRef.current = requestAnimationFrame(tickEntryHold)
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [mode, clearEntryHoldLoop, tickEntryHold],
  )

  const handleEntryPointerUp = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      if (mode !== 'pre-entry') return
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
      clearEntryHoldLoop()
      setEntryHolding(false)
      setEntryProgress(0)
    },
    [mode, clearEntryHoldLoop],
  )

  const triggerReconnectComplete = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    setHolding(false)
    setHoldProgress(0)
    clearHoldLoop()
    clearDecayLoop()
    setDivePhase('flash')

    window.setTimeout(() => {
      setDivePhase('success')
      window.setTimeout(() => onComplete?.(), SUCCESS_MS)
    }, 520)
  }, [clearDecayLoop, clearHoldLoop, onComplete])

  const tickDecay = useCallback(() => {
    visualProgressRef.current = clamp01(visualProgressRef.current - 0.065)
    setVisualProgress(visualProgressRef.current)
    rotationRef.current *= 0.92
    setCompassRotation(rotationRef.current)

    if (visualProgressRef.current > 0.02) {
      decayRafRef.current = requestAnimationFrame(tickDecay)
    } else {
      visualProgressRef.current = 0
      setVisualProgress(0)
      rotationRef.current = 0
      setCompassRotation(0)
      decayRafRef.current = 0
    }
  }, [])

  const startDecay = useCallback(() => {
    clearDecayLoop()
    decayRafRef.current = requestAnimationFrame(tickDecay)
  }, [clearDecayLoop, tickDecay])

  const tickHold = useCallback(() => {
    const elapsed = performance.now() - holdStartRef.current
    const p = clamp01(elapsed / HOLD_MS)
    setHoldProgress(p)
    visualProgressRef.current = p
    setVisualProgress(p)

    const dt = 0.016
    rotationRef.current += (24 + Math.pow(p, 1.6) * 540) * dt
    setCompassRotation(rotationRef.current)

    if (navigator.vibrate && p > 0.15) {
      const now = performance.now()
      const interval = 120 + (1 - p) * 380
      if (now - lastVibrateRef.current > interval) {
        navigator.vibrate(Math.min(40, 12 + Math.floor(p * 28)))
        lastVibrateRef.current = now
      }
    }

    if (p >= 1) {
      clearHoldLoop()
      triggerReconnectComplete()
      return
    }
    holdRafRef.current = requestAnimationFrame(tickHold)
  }, [clearHoldLoop, triggerReconnectComplete])

  const handleReconnectPointerDown = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      if (mode !== 'diving' || divePhase !== 'silent' || doneRef.current) return
      e.preventDefault()
      clearDecayLoop()
      setHolding(true)
      holdStartRef.current = performance.now()
      holdRafRef.current = requestAnimationFrame(tickHold)
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [mode, divePhase, clearDecayLoop, tickHold],
  )

  const handleReconnectPointerUp = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      if (mode !== 'diving' || divePhase !== 'silent' || doneRef.current) return
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
      clearHoldLoop()
      setHolding(false)
      setHoldProgress(0)
      startDecay()
    },
    [mode, divePhase, clearHoldLoop, startDecay],
  )

  useEffect(() => {
    return () => {
      clearEntryHoldLoop()
      clearHoldLoop()
      clearDecayLoop()
    }
  }, [clearEntryHoldLoop, clearHoldLoop, clearDecayLoop])

  const intensity = glowIntensity(visualProgress)
  const shakePx = visualProgress > 0 ? 1 + visualProgress * 5.5 : 0

  const topHint =
    mode === 'pre-entry'
      ? '罗盘信号稳定，长按底部按钮潜入地心结界。'
      : divePhase === 'success'
        ? '磁场同步成功，重见天日。'
        : '已切断外界磁场，进入地脉静默潜航... 请专注脚下。'

  const isDiving = mode === 'diving'
  const entryDarkness = mode === 'pre-entry' ? entryProgress : isDiving ? 1 : 0

  return (
    <div
      className={`relative flex min-h-[min(78dvh,560px)] w-full flex-col overflow-hidden rounded-xl transition-colors duration-300 ${
        entryDarkness > 0.85 || isDiving ? 'bg-black' : 'bg-gradient-to-b from-void-900 via-[#0c1828] to-void-950'
      }`}
      style={
        isDiving
          ? ({
              '--cave-progress': visualProgress,
              '--cave-shake': `${shakePx}px`,
            } as CSSProperties)
          : undefined
      }
    >
      {/* 入洞前 — 长按深潜 */}
      {mode === 'pre-entry' && (
        <>
          <div
            className="pointer-events-none absolute inset-0 bg-black transition-opacity duration-300"
            style={{
              opacity: entryProgress * 0.96,
              transition: entryHolding ? 'none' : 'opacity 0.55s ease-out',
            }}
          />

          <p className="relative z-10 px-5 pt-6 text-center text-[11px] leading-relaxed tracking-wide text-mist-muted/75">
            {topHint}
          </p>

          <div className="relative z-10 flex flex-1 items-center justify-center px-4">
            <EntryCompass sinkProgress={entryProgress} holding={entryHolding} />
          </div>

          <div className="relative z-10 px-5 pb-8">
            <HoldRingButton
              progress={entryProgress}
              holding={entryHolding}
              ringColor="rgba(245, 158, 11, 0.85)"
              label={entryHolding ? '下潜中…' : '按住'}
              subLabel="长按 3 秒 · 潜入地心"
              onPointerDown={handleEntryPointerDown}
              onPointerUp={handleEntryPointerUp}
            />
            <p className="mt-1 text-center text-[10px] text-mist-faint/50">
              入洞后将进入无网静默潜航模式
            </p>
          </div>
        </>
      )}

      {/* 潜航中 — 长按上浮 */}
      {isDiving && (
        <>
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(34,211,238,0.55),transparent_62%)]"
            style={{
              opacity: intensity * 0.45,
              animation: visualProgress > 0.05 ? 'cave-bg-pulse 0.45s ease-in-out infinite' : 'none',
            }}
          />

          <p
            className={`relative z-10 px-5 pt-6 text-center text-[11px] leading-relaxed tracking-wide transition-colors duration-300 ${
              divePhase === 'success' ? 'text-cyan-200' : 'text-mist-muted/55'
            }`}
          >
            {topHint}
          </p>

          <div
            className={`relative z-10 flex flex-1 items-center justify-center px-4 ${
              visualProgress > 0.08 ? 'animate-[cave-magnetic-shake_0.28s_linear_infinite]' : ''
            }`}
          >
            <DivingCompass
              compassRotation={compassRotation}
              holding={holding}
              visualProgress={visualProgress}
              intensity={intensity}
            />
          </div>

          <div className="relative z-10 px-5 pb-8">
            <HoldRingButton
              progress={holdProgress}
              holding={holding}
              disabled={divePhase !== 'silent'}
              ringColor="rgba(34, 211, 238, 0.85)"
              label={holding ? '同步中…' : '按住'}
              subLabel={divePhase === 'silent' ? '长按 3 秒恢复连接' : '地脉已接通'}
              onPointerDown={handleReconnectPointerDown}
              onPointerUp={handleReconnectPointerUp}
            />
          </div>

          <AnimatePresence>
            {divePhase === 'flash' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.55, times: [0, 0.35, 1], ease: 'easeOut' }}
                className="pointer-events-none absolute inset-0 z-30 bg-white"
              />
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}

export default OfflineCave
