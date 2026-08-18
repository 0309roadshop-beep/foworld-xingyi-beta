import { motion, AnimatePresence } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { preventGhostActivation } from '../../utils/touchInteraction'

/** 五音按键定义：C 大调五声音阶 宫商角徵羽 */
const KEYS = [
  { id: 0, label: '宫', sub: 'Do', freq: 261.63, hue: 'jade' as const },
  { id: 1, label: '商', sub: 'Re', freq: 293.66, hue: 'sky' as const },
  { id: 2, label: '角', sub: 'Mi', freq: 329.63, hue: 'spirit' as const },
  { id: 3, label: '徵', sub: 'Sol', freq: 392.0, hue: 'gold' as const },
  { id: 4, label: '羽', sub: 'La', freq: 440.0, hue: 'mist' as const },
] as const

/** 演示序列：1-3-5-2-1 → 宫-角-羽-商-宫（0-based） */
const DEMO_SEQUENCE = [0, 2, 4, 1, 0]
const STEP_INTERVAL_MS = 800
const NOTE_DURATION_SEC = 0.45
const HIGHLIGHT_MS = 480

type Phase = 'idle' | 'demo' | 'input' | 'fail' | 'won'

const HUE_STYLES = {
  jade: {
    base: 'border-jade-muted/50 bg-jade-deep/35 text-jade-bright',
    lit: 'border-jade-bright bg-jade-muted/60 shadow-[0_0_24px_rgba(80,200,160,0.55)]',
    glow: 'shadow-[0_0_20px_rgba(80,200,160,0.7)] border-jade-bright bg-jade-muted/50',
  },
  sky: {
    base: 'border-sky-muted/50 bg-sky-deep/35 text-sky-bright',
    lit: 'border-sky-bright bg-sky-muted/60 shadow-[0_0_24px_rgba(100,180,255,0.55)]',
    glow: 'shadow-[0_0_20px_rgba(100,180,255,0.7)] border-sky-bright bg-sky-muted/50',
  },
  spirit: {
    base: 'border-spirit/40 bg-spirit/15 text-spirit',
    lit: 'border-spirit bg-spirit/35 shadow-[0_0_24px_rgba(140,220,200,0.55)]',
    glow: 'shadow-[0_0_20px_rgba(140,220,200,0.7)] border-spirit bg-spirit/30',
  },
  gold: {
    base: 'border-gold-muted/50 bg-gold-deep/25 text-gold-bright',
    lit: 'border-gold-bright bg-gold-muted/40 shadow-[0_0_24px_rgba(220,180,100,0.55)]',
    glow: 'shadow-[0_0_20px_rgba(220,180,100,0.7)] border-gold-bright bg-gold-muted/35',
  },
  mist: {
    base: 'border-mist-faint/40 bg-void-700/50 text-mist',
    lit: 'border-mist bg-void-600/70 shadow-[0_0_24px_rgba(200,210,230,0.45)]',
    glow: 'shadow-[0_0_20px_rgba(200,210,230,0.6)] border-mist bg-void-600/60',
  },
} as const

interface PentatonicSimonProps {
  onSuccess?: () => void
}

/** 半圆排列：5 键沿弧分布的角度（度） */
function arcPosition(index: number) {
  const start = -68
  const end = 68
  const angle = start + ((end - start) * index) / (KEYS.length - 1)
  const rad = (angle * Math.PI) / 180
  const radius = 108
  return {
    x: Math.sin(rad) * radius,
    y: -Math.cos(rad) * radius + radius * 0.15,
  }
}

/**
 * Web Audio 五音引擎 + iOS 解锁。
 * 首次人机交互时 resume AudioContext 并播放极短静音 buffer。
 */
function usePentatonicAudio() {
  const ctxRef = useRef<AudioContext | null>(null)
  const unlockedRef = useRef(false)

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return null
      ctxRef.current = new Ctx()
    }
    return ctxRef.current
  }, [])

  /** 利用第一次点击解锁 Safari 音频 */
  const unlock = useCallback(async () => {
    const ctx = getCtx()
    if (!ctx) return false
    if (ctx.state === 'suspended') await ctx.resume()

    if (!unlockedRef.current) {
      const silent = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
      const src = ctx.createBufferSource()
      src.buffer = silent
      src.connect(ctx.destination)
      src.start(0)
      unlockedRef.current = true
    }
    return true
  }, [getCtx])

  const playTone = useCallback(
    (freq: number, durationSec = NOTE_DURATION_SEC) => {
      const ctx = getCtx()
      if (!ctx || ctx.state !== 'running') return

      const now = ctx.currentTime
      const gain = ctx.createGain()
      gain.connect(ctx.destination)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.35, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec)

      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now)
      osc.connect(gain)
      osc.start(now)
      osc.stop(now + durationSec + 0.05)

      const harm = ctx.createOscillator()
      harm.type = 'triangle'
      harm.frequency.setValueAtTime(freq * 2, now)
      const harmGain = ctx.createGain()
      harmGain.gain.setValueAtTime(0.08, now)
      harmGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec * 0.8)
      harm.connect(harmGain)
      harmGain.connect(gain)
      harm.start(now)
      harm.stop(now + durationSec + 0.05)
    },
    [getCtx],
  )

  /** 通关：空灵上行五音 */
  const playSuccess = useCallback(() => {
    const ctx = getCtx()
    if (!ctx || ctx.state !== 'running') return

    const notes = [261.63, 329.63, 392.0, 440.0, 523.25]
    notes.forEach((freq, i) => {
      window.setTimeout(() => playTone(freq, 0.55), i * 180)
    })
  }, [getCtx, playTone])

  useEffect(() => {
    return () => {
      void ctxRef.current?.close()
      ctxRef.current = null
      unlockedRef.current = false
    }
  }, [])

  return { unlock, playTone, playSuccess }
}

export function PentatonicSimon({ onSuccess }: PentatonicSimonProps) {
  const { unlock, playTone, playSuccess } = usePentatonicAudio()
  const successFiredRef = useRef(false)
  const demoTimersRef = useRef<number[]>([])

  const [phase, setPhase] = useState<Phase>('idle')
  const [litKey, setLitKey] = useState<number | null>(null)
  const [inputIndex, setInputIndex] = useState(0)
  const [shake, setShake] = useState(false)

  /** 系统演示 / 未进入输入阶段时锁死按键 */
  const isPlaying = phase === 'demo'
  const keysLocked = isPlaying || phase === 'idle' || phase === 'fail' || phase === 'won'

  const clearDemoTimers = useCallback(() => {
    demoTimersRef.current.forEach((id) => window.clearTimeout(id))
    demoTimersRef.current = []
  }, [])

  const highlightKey = useCallback((keyId: number) => {
    setLitKey(keyId)
    window.setTimeout(() => setLitKey((k) => (k === keyId ? null : k)), HIGHLIGHT_MS)
  }, [])

  const playSequenceStep = useCallback(
    (keyId: number) => {
      const key = KEYS[keyId]
      playTone(key.freq)
      highlightKey(keyId)
    },
    [playTone, highlightKey],
  )

  /** 演示完整序列 */
  const runDemo = useCallback(async () => {
    clearDemoTimers()
    setInputIndex(0)
    setPhase('demo')

    DEMO_SEQUENCE.forEach((keyId, i) => {
      const timerId = window.setTimeout(() => {
        playSequenceStep(keyId)
        if (i === DEMO_SEQUENCE.length - 1) {
          const unlockTimer = window.setTimeout(() => {
            setPhase('input')
          }, STEP_INTERVAL_MS)
          demoTimersRef.current.push(unlockTimer)
        }
      }, i * STEP_INTERVAL_MS)
      demoTimersRef.current.push(timerId)
    })
  }, [clearDemoTimers, playSequenceStep])

  const handleListen = useCallback(
    async (e: ReactPointerEvent<HTMLButtonElement>) => {
      preventGhostActivation(e)
      if (phase === 'demo' || phase === 'won') return
      const ok = await unlock()
      if (!ok) return
      setShake(false)
      void runDemo()
    },
    [phase, unlock, runDemo],
  )

  const handleKeyPress = useCallback(
    (keyId: number) => {
      if (keysLocked) return

      const key = KEYS[keyId]
      playTone(key.freq)
      highlightKey(keyId)

      const expected = DEMO_SEQUENCE[inputIndex]
      if (keyId !== expected) {
        setPhase('fail')
        setShake(true)
        setInputIndex(0)
        clearDemoTimers()
        window.setTimeout(() => {
          setShake(false)
          setPhase('idle')
        }, 900)
        return
      }

      const next = inputIndex + 1
      setInputIndex(next)

      if (next >= DEMO_SEQUENCE.length) {
        if (successFiredRef.current) return
        successFiredRef.current = true
        setPhase('won')
        playSuccess()
        onSuccess?.()
      }
    },
    [keysLocked, playTone, highlightKey, inputIndex, clearDemoTimers, playSuccess, onSuccess],
  )

  useEffect(() => () => clearDemoTimers(), [clearDemoTimers])

  const progressPct = phase === 'won' ? 100 : (inputIndex / DEMO_SEQUENCE.length) * 100

  return (
    <div
      className="interactive-area w-full select-none"
      style={{ touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      <p className="mb-3 text-center text-xs text-mist-muted">
        聆听水灵五音序列，再按相同顺序复奏（宫→角→羽→商→宫）
      </p>

      {/* 进度 */}
      <div className="mb-4">
        <div className="mb-1 flex justify-between text-[10px] text-mist-muted">
          <span>{phase === 'input' ? '轮到你了' : phase === 'demo' ? '聆听中…' : '待聆听'}</span>
          <span className="tabular-nums text-spirit">
            {phase === 'won' ? DEMO_SEQUENCE.length : inputIndex}/{DEMO_SEQUENCE.length}
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-void-700/80">
          <div
            className="h-full rounded-full bg-gradient-to-r from-jade-deep to-spirit transition-[width] duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* 五音键区 — 半圆排列 */}
      <motion.div
        animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.45 }}
        className={`relative mx-auto mb-5 h-[200px] w-full max-w-[320px] rounded-xl border transition-colors duration-300 ${
          shake ? 'border-red-400/60 bg-red-950/30' : 'border-jade-muted/20 bg-void-800/40'
        }`}
      >
        <AnimatePresence>
          {shake && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-x-0 top-3 z-20 text-center text-xs text-red-300"
            >
              音律错乱，请重新聆听
            </motion.p>
          )}
        </AnimatePresence>

        <div className="absolute bottom-6 left-1/2 h-px w-[70%] -translate-x-1/2 bg-gradient-to-r from-transparent via-jade-muted/30 to-transparent" />

        {KEYS.map((key, i) => {
          const pos = arcPosition(i)
          const styles = HUE_STYLES[key.hue]
          const isLit = litKey === key.id
          const isWonGlow = phase === 'won'

          return (
            <button
              key={key.id}
              type="button"
              disabled={keysLocked}
              onPointerDown={(e) => {
                preventGhostActivation(e)
                handleKeyPress(key.id)
              }}
              className={`absolute flex h-[52px] w-[52px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 transition-all duration-200 ${
                isWonGlow
                  ? styles.glow
                  : isLit
                    ? styles.lit
                    : styles.base
              } ${keysLocked ? 'cursor-not-allowed opacity-55' : 'active:scale-95'}`}
              style={{
                left: `calc(50% + ${pos.x}px)`,
                top: `calc(100% - 24px + ${pos.y}px)`,
                touchAction: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span className="text-sm font-medium leading-none">{key.label}</span>
              <span className="mt-0.5 text-[9px] opacity-60">{key.sub}</span>
            </button>
          )
        })}
      </motion.div>

      {/* 聆听按钮 — 首次点击解锁 iOS 音频 */}
      {phase !== 'won' && (
        <button
          type="button"
          onPointerDown={handleListen}
          disabled={phase === 'demo'}
          className={`mx-auto flex w-full max-w-[280px] items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm transition-colors ${
            phase === 'demo'
              ? 'cursor-not-allowed border-mist-faint/20 bg-void-800/50 text-mist-faint'
              : 'border-sky-muted/40 bg-sky-deep/30 text-sky-bright active:bg-sky-deep/50'
          }`}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        >
          <span className="text-base">🎵</span>
          {phase === 'demo' ? '水灵之声回响中…' : '聆听水灵之声'}
        </button>
      )}

      {phase === 'won' && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-sm font-medium text-spirit"
        >
          五音归位，灵泉共鸣！
        </motion.p>
      )}
    </div>
  )
}
