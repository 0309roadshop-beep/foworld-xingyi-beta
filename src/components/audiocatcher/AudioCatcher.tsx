import { motion, AnimatePresence } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'

/** 游戏时长（秒） */
const GAME_DURATION_SEC = 30
/** 通关所需接取数量 */
const TARGET_CATCHES = 15
/** 气泡破裂动画时长（ms） */
const POP_MS = 300
/** 生成间隔范围（ms） */
const SPAWN_MIN_MS = 550
const SPAWN_MAX_MS = 950

interface Bubble {
  id: string
  /** 相对游戏区宽度百分比 0–100 */
  xPct: number
  /** 距顶部的像素 Y */
  y: number
  /** 直径 px */
  size: number
  /** 下落速度 px/s */
  speed: number
  /** 是否正在破裂（禁止重复点击） */
  popping: boolean
}

interface AudioCatcherProps {
  onSuccess?: () => void
  /** 可选：外部水滴音效 URL；未提供时使用 Web Audio 合成短促水滴 */
  audioUrl?: string
}

let bubbleIdSeq = 0

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

/** 程序化合成极短水滴音（~80ms），避免依赖外部资源 */
function synthesizeDripBuffer(ctx: AudioContext): AudioBuffer {
  const duration = 0.08
  const sampleRate = ctx.sampleRate
  const length = Math.floor(sampleRate * duration)
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)
  const baseFreq = 720 + Math.random() * 280

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    const env = Math.exp(-t * 38)
    const pitch = baseFreq * (1 - t * 2.5)
    data[i] = Math.sin(2 * Math.PI * pitch * t) * env * 0.45
  }
  return buffer
}

/**
 * iOS 友好水滴音效池：每次点击新建 AudioBufferSourceNode，
 * 支持高频重叠播放，不会像单个 <audio> 那样丢音。
 */
function useDripSoundPool(audioUrl?: string) {
  const ctxRef = useRef<AudioContext | null>(null)
  const bufferRef = useRef<AudioBuffer | null>(null)
  const loadingRef = useRef<Promise<void> | null>(null)

  const ensureReady = useCallback(async () => {
    if (!ctxRef.current) {
      const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return
      ctxRef.current = new Ctx()
    }
    const ctx = ctxRef.current
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }
    if (bufferRef.current) return

    if (!loadingRef.current) {
      loadingRef.current = (async () => {
        if (audioUrl) {
          try {
            const res = await fetch(audioUrl)
            const arr = await res.arrayBuffer()
            bufferRef.current = await ctx.decodeAudioData(arr)
            return
          } catch {
            /* 回退到合成音 */
          }
        }
        bufferRef.current = synthesizeDripBuffer(ctx)
      })()
    }
    await loadingRef.current
  }, [audioUrl])

  const play = useCallback(() => {
    void (async () => {
      await ensureReady()
      const ctx = ctxRef.current
      const buffer = bufferRef.current
      if (!ctx || !buffer) return

      const source = ctx.createBufferSource()
      source.buffer = buffer
      const gain = ctx.createGain()
      gain.gain.value = 0.85
      source.connect(gain)
      gain.connect(ctx.destination)
      source.start(0)
    })()
  }, [ensureReady])

  useEffect(() => {
    return () => {
      void ctxRef.current?.close()
      ctxRef.current = null
      bufferRef.current = null
      loadingRef.current = null
    }
  }, [])

  return play
}

function createBubble(): Bubble {
  const size = randomBetween(36, 52)
  return {
    id: `bubble-${++bubbleIdSeq}`,
    xPct: randomBetween(8, 92),
    y: -size,
    size,
    speed: randomBetween(90, 180),
    popping: false,
  }
}

function applyBubbleTransform(el: HTMLElement, b: Bubble, areaWidth: number) {
  const cx = (b.xPct / 100) * areaWidth
  el.style.setProperty('--bubble-x', `${cx}px`)
  el.style.setProperty('--bubble-y', `${b.y}px`)
  el.style.transform = `translate3d(${cx}px, ${b.y}px, 0) translateX(-50%)`
}

/** rAF 驱动：仅更新 transform，避免每帧 React 重排 */
function syncBubbleVisuals(
  bubbles: Bubble[],
  layer: HTMLDivElement | null,
  pool: Map<string, HTMLDivElement>,
  areaWidth: number,
) {
  if (!layer) return

  const alive = new Set<string>()
  for (const b of bubbles) {
    alive.add(b.id)
    let el = pool.get(b.id)
    if (!el) {
      el = document.createElement('div')
      el.className = 'audio-catcher-bubble'
      el.setAttribute('role', 'button')
      el.setAttribute('tabindex', '-1')
      el.setAttribute('aria-label', '接住气泡')
      el.style.width = `${b.size}px`
      el.style.height = `${b.size}px`
      const highlight = document.createElement('span')
      highlight.className =
        'pointer-events-none absolute left-[22%] top-[18%] h-[28%] w-[28%] rounded-full bg-white/55 blur-[0.5px]'
      el.appendChild(highlight)
      pool.set(b.id, el)
      layer.appendChild(el)
    }
    applyBubbleTransform(el, b, areaWidth)
    el.classList.toggle('audio-catcher-bubble--popping', b.popping)
  }

  for (const [id, el] of pool) {
    if (!alive.has(id)) {
      el.remove()
      pool.delete(id)
    }
  }
}

export function AudioCatcher({ onSuccess, audioUrl }: AudioCatcherProps) {
  const playAreaRef = useRef<HTMLDivElement>(null)
  const bubblesLayerRef = useRef<HTMLDivElement>(null)
  const bubblePoolRef = useRef(new Map<string, HTMLDivElement>())
  const playDrip = useDripSoundPool(audioUrl)
  const successFiredRef = useRef(false)
  const poppedIdsRef = useRef(new Set<string>())
  const bubblesRef = useRef<Bubble[]>([])
  const rafRef = useRef<number>(0)

  const [phase, setPhase] = useState<'playing' | 'won' | 'lost'>('playing')
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SEC)
  const [catchCount, setCatchCount] = useState(0)

  const [playHeight, setPlayHeight] = useState(320)

  /** 测量游戏区高度，用于落底销毁判定 */
  useEffect(() => {
    const el = playAreaRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setPlayHeight(entry.contentRect.height)
    })
    ro.observe(el)
    setPlayHeight(el.clientHeight)
    return () => ro.disconnect()
  }, [])

  /** 30 秒倒计时 */
  useEffect(() => {
    if (phase !== 'playing') return
    const timer = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          window.clearInterval(timer)
          setPhase((p) => (p === 'playing' ? 'lost' : p))
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [phase])

  /** 定时生成气泡 */
  useEffect(() => {
    if (phase !== 'playing') return

    let spawnTimer: ReturnType<typeof setTimeout>
    const scheduleSpawn = () => {
      const delay = randomBetween(SPAWN_MIN_MS, SPAWN_MAX_MS)
      spawnTimer = setTimeout(() => {
        bubblesRef.current = [...bubblesRef.current, createBubble()]
        scheduleSpawn()
      }, delay)
    }
    scheduleSpawn()
    return () => clearTimeout(spawnTimer)
  }, [phase])

  /** requestAnimationFrame 驱动 Y 轴下落，落出底部自动移除 */
  useEffect(() => {
    if (phase !== 'playing') return

    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const area = playAreaRef.current
      const height = area?.clientHeight ?? playHeight
      const width = area?.clientWidth ?? 320

      bubblesRef.current = bubblesRef.current
        .map((b) => (b.popping ? b : { ...b, y: b.y + b.speed * dt }))
        .filter((b) => b.popping || b.y < height + b.size)

      syncBubbleVisuals(
        bubblesRef.current,
        bubblesLayerRef.current,
        bubblePoolRef.current,
        width,
      )

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, playHeight])

  /** 接满 15 个 → 通关 */
  useEffect(() => {
    if (catchCount < TARGET_CATCHES || phase !== 'playing') return
    if (successFiredRef.current) return
    successFiredRef.current = true
    setPhase('won')
    onSuccess?.()
  }, [catchCount, phase, onSuccess])

  const popBubble = useCallback(
    (id: string) => {
      if (phase !== 'playing' || poppedIdsRef.current.has(id)) return false

      const target = bubblesRef.current.find((b) => b.id === id)
      if (!target || target.popping) return false

      poppedIdsRef.current.add(id)
      playDrip()
      setCatchCount((c) => c + 1)
      bubblesRef.current = bubblesRef.current.map((b) =>
        b.id === id ? { ...b, popping: true } : b,
      )

      const area = playAreaRef.current
      syncBubbleVisuals(
        bubblesRef.current,
        bubblesLayerRef.current,
        bubblePoolRef.current,
        area?.clientWidth ?? 320,
      )

      window.setTimeout(() => {
        poppedIdsRef.current.delete(id)
        bubblesRef.current = bubblesRef.current.filter((b) => b.id !== id)
        syncBubbleVisuals(
          bubblesRef.current,
          bubblesLayerRef.current,
          bubblePoolRef.current,
          playAreaRef.current?.clientWidth ?? 320,
        )
      }, POP_MS)

      return true
    },
    [phase, playDrip],
  )

  const handlePlayAreaPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (phase !== 'playing') return
      const area = playAreaRef.current
      if (!area) return

      const rect = area.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      for (let i = bubblesRef.current.length - 1; i >= 0; i--) {
        const b = bubblesRef.current[i]
        if (b.popping) continue
        const cx = (b.xPct / 100) * rect.width
        const cy = b.y + b.size / 2
        const r = b.size / 2 + 6
        const dx = x - cx
        const dy = y - cy
        if (dx * dx + dy * dy <= r * r) {
          e.preventDefault()
          e.stopPropagation()
          popBubble(b.id)
          break
        }
      }
    },
    [phase, popBubble],
  )

  const restart = useCallback(() => {
    successFiredRef.current = false
    poppedIdsRef.current.clear()
    bubblesRef.current = []
    bubblePoolRef.current.forEach((el) => el.remove())
    bubblePoolRef.current.clear()
    setPhase('playing')
    setTimeLeft(GAME_DURATION_SEC)
    setCatchCount(0)
  }, [])

  const progressPct = Math.min(100, (catchCount / TARGET_CATCHES) * 100)

  return (
    <div className="w-full select-none">
      <p className="mb-3 text-center text-xs text-mist-muted">
        30 秒内点破 {TARGET_CATCHES} 个飞瀑气泡即可集音通关
      </p>

      {/* HUD */}
      <div className="mb-3 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 rounded-full border border-sky-muted/30 bg-void-800/60 px-3 py-1 text-sky-bright">
          <span className="text-[10px] text-mist-muted">剩余</span>
          <span className="font-medium tabular-nums">{timeLeft}s</span>
        </div>
        <div className="flex-1">
          <div className="mb-1 flex justify-between text-[10px] text-mist-muted">
            <span>集音</span>
            <span className="tabular-nums text-spirit">
              {catchCount}/{TARGET_CATCHES}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-void-700/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-deep to-spirit transition-[width] duration-200"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 游戏区 */}
      <div
        ref={playAreaRef}
        onPointerDown={handlePlayAreaPointerDown}
        className="relative h-[min(52vw,320px)] w-full overflow-hidden rounded-xl border border-sky-muted/20 bg-gradient-to-b from-sky-deep/25 via-void-800/40 to-void-900/80 touch-none"
        style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
      >
        {/* 背景飞瀑装饰线 */}
        <div className="pointer-events-none absolute inset-x-[18%] top-0 h-full w-[8%] bg-gradient-to-b from-sky-bright/15 via-sky-muted/8 to-transparent blur-[1px]" />
        <div className="pointer-events-none absolute inset-x-[62%] top-0 h-full w-[6%] bg-gradient-to-b from-sky-bright/10 via-transparent to-transparent" />

        <div ref={bubblesLayerRef} className="pointer-events-none absolute inset-0 z-10" />

        {/* 结束遮罩 */}
        <AnimatePresence>
          {(phase === 'won' || phase === 'lost') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-void-900/75 backdrop-blur-sm"
            >
              {phase === 'won' ? (
                <>
                  <p className="text-sm font-medium text-spirit">飞瀑集音完成！</p>
                  <p className="text-xs text-mist-muted">灵泉共鸣已收录</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-gold-bright">时间耗尽</p>
                  <p className="text-xs text-mist-muted">
                    还差 {Math.max(0, TARGET_CATCHES - catchCount)} 个气泡
                  </p>
                  <button
                    type="button"
                    onClick={restart}
                    className="mt-1 rounded-full border border-sky-muted/40 bg-sky-deep/30 px-4 py-1.5 text-xs text-sky-bright active:bg-sky-deep/50"
                  >
                    再试一次
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
