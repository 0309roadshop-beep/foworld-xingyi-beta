import { motion } from 'framer-motion'
import { Droplets } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { ModalOverlay } from '../ui/ModalOverlay'

export interface WaterTuningProps {
  /** 目标波幅（0–100 滑块刻度） */
  targetAmplitude?: number
  /** 目标频率（0–100 滑块刻度） */
  targetFrequency?: number
  /** 参数容差 ±% */
  tolerance?: number
  onComplete?: () => void
}

const DEFAULT_TARGET_AMP = 72
const DEFAULT_TARGET_FREQ = 38
const DEFAULT_TOLERANCE = 5
const COMPLETE_MODAL_MS = 1500

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

/** 滑块 0–100 → 绘制用波幅（像素） */
function ampFromSlider(v: number, h: number) {
  return h * (0.08 + (v / 100) * 0.22)
}

/** 滑块 0–100 → 角频率 */
function freqFromSlider(v: number) {
  return 2.2 + (v / 100) * 5.8
}

function paramsMatch(
  amp: number,
  freq: number,
  targetAmp: number,
  targetFreq: number,
  tolerance: number,
) {
  return (
    Math.abs(amp - targetAmp) <= tolerance && Math.abs(freq - targetFreq) <= tolerance
  )
}

function calcMatchRatio(
  amp: number,
  freq: number,
  targetAmp: number,
  targetFreq: number,
) {
  const ampErr = Math.abs(amp - targetAmp) / 100
  const freqErr = Math.abs(freq - targetFreq) / 100
  return clamp(1 - (ampErr + freqErr) / 0.2, 0, 1)
}

function drawSinePath(
  ctx: CanvasRenderingContext2D,
  w: number,
  midY: number,
  amplitude: number,
  frequency: number,
  phase: number,
  color: string,
  lineWidth: number,
  alpha: number,
) {
  ctx.beginPath()
  for (let x = 0; x <= w; x += 2) {
    const nx = (x / w) * Math.PI * 2
    const y = midY + Math.sin(nx * frequency + phase) * amplitude
    if (x === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.strokeStyle = color.replace('ALPHA', String(alpha))
  ctx.lineWidth = lineWidth
  ctx.stroke()
}

interface WaveBgCache {
  w: number
  h: number
  gradient: CanvasGradient | null
}

const waveBgCache: WaveBgCache = { w: 0, h: 0, gradient: null }

function getWaveBackgroundGradient(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): CanvasGradient {
  if (waveBgCache.w === w && waveBgCache.h === h && waveBgCache.gradient) {
    return waveBgCache.gradient
  }
  const bg = ctx.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, '#120818')
  bg.addColorStop(0.5, '#0a1428')
  bg.addColorStop(1, '#040c14')
  waveBgCache.w = w
  waveBgCache.h = h
  waveBgCache.gradient = bg
  return bg
}

function drawWaves(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  playerAmp: number,
  playerFreq: number,
  targetAmp: number,
  targetFreq: number,
  time: number,
  merged: boolean,
) {
  const midY = h * 0.42
  ctx.clearRect(0, 0, w, h)

  ctx.fillStyle = getWaveBackgroundGradient(ctx, w, h)
  ctx.fillRect(0, 0, w, h)

  if (merged) {
    const glow = ctx.createLinearGradient(0, midY - 2, w, midY + 2)
    glow.addColorStop(0, 'rgba(56, 189, 248, 0)')
    glow.addColorStop(0.5, 'rgba(125, 211, 252, 0.95)')
    glow.addColorStop(1, 'rgba(56, 189, 248, 0)')
    ctx.strokeStyle = glow
    ctx.lineWidth = 3
    ctx.shadowColor = 'rgba(125, 211, 252, 0.85)'
    ctx.shadowBlur = 18
    ctx.beginPath()
    ctx.moveTo(0, midY)
    ctx.lineTo(w, midY)
    ctx.stroke()
    ctx.shadowBlur = 0
    return
  }

  const tAmp = ampFromSlider(targetAmp, h)
  const tFreq = freqFromSlider(targetFreq)
  const pAmp = ampFromSlider(playerAmp, h)
  const pFreq = freqFromSlider(playerFreq)
  const match = calcMatchRatio(playerAmp, playerFreq, targetAmp, targetFreq)

  drawSinePath(
    ctx,
    w,
    midY,
    tAmp,
    tFreq,
    time * 1.4,
    'rgba(248, 113, 113, ALPHA)',
    2.5,
    0.75 + match * 0.15,
  )

  const blueAlpha = 0.45 + match * 0.45
  drawSinePath(
    ctx,
    w,
    midY,
    pAmp,
    pFreq,
    time * 1.1 + 0.6,
    `rgba(56, 189, 248, ALPHA)`,
    2 + match,
    blueAlpha,
  )

  if (match > 0.85) {
    const glow = ctx.createRadialGradient(w / 2, midY, 0, w / 2, midY, w * 0.4)
    glow.addColorStop(0, `rgba(94, 234, 212, ${(match - 0.85) * 0.4})`)
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, w, h)
  }
}

interface ParamSliderProps {
  label: string
  value: number
  disabled: boolean
  onChange: (v: number) => void
}

function ParamSlider({ label, value, disabled, onChange }: ParamSliderProps) {
  const onTrack = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled) return
      const rect = e.currentTarget.getBoundingClientRect()
      onChange(clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100))
    },
    [disabled, onChange],
  )

  return (
    <div className="flex-1">
      <div className="mb-1.5 flex items-center justify-between text-[10px]">
        <span className="text-sky-bright/90">{label}</span>
        <span className="tabular-nums text-mist-muted">{Math.round(value)}</span>
      </div>
      <div
        className="relative h-10 touch-none rounded-lg border border-sky-muted/25 bg-void-900/70 px-1"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          onTrack(e)
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) onTrack(e)
        }}
      >
        <div
          className="absolute inset-y-1.5 left-1 rounded-md bg-sky-deep/35 transition-[width]"
          style={{ width: `calc(${value}% - 0.25rem)` }}
        />
        <div
          className="absolute top-1/2 h-7 w-7 -translate-y-1/2 rounded-md border-2 border-sky-bright/70 bg-sky-muted/40 shadow-[0_0_10px_rgba(56,189,248,0.35)]"
          style={{ left: `calc(${value}% - 0.875rem)` }}
        />
      </div>
    </div>
  )
}

/**
 * 激流调音 — 双波形重合解密（红=狂暴目标波，蓝=御水操控波）
 */
export function WaterTuning({
  targetAmplitude = DEFAULT_TARGET_AMP,
  targetFrequency = DEFAULT_TARGET_FREQ,
  tolerance = DEFAULT_TOLERANCE,
  onComplete,
}: WaterTuningProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const paramsRef = useRef({ amp: 50, freq: 50, merged: false })
  const rafRef = useRef(0)
  const doneRef = useRef(false)

  const [amplitude, setAmplitude] = useState(50)
  const [frequency, setFrequency] = useState(50)
  const [locked, setLocked] = useState(false)
  const [showComplete, setShowComplete] = useState(false)

  paramsRef.current = { amp: amplitude, freq: frequency, merged: locked }

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.floor(rect.width * dpr)
    canvas.height = Math.floor(rect.height * dpr)
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }, [])

  useEffect(() => {
    resizeCanvas()
    const ro = new ResizeObserver(resizeCanvas)
    if (canvasRef.current) ro.observe(canvasRef.current)
    return () => ro.disconnect()
  }, [resizeCanvas])

  useEffect(() => {
    const loop = (now: number) => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (canvas && ctx) {
        const rect = canvas.getBoundingClientRect()
        const { amp, freq, merged } = paramsRef.current
        drawWaves(
          ctx,
          rect.width,
          rect.height,
          amp,
          freq,
          targetAmplitude,
          targetFrequency,
          now / 1000,
          merged,
        )
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [targetAmplitude, targetFrequency])

  const finish = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    setLocked(true)
    setShowComplete(true)
    window.setTimeout(() => onComplete?.(), COMPLETE_MODAL_MS)
  }, [onComplete])

  useEffect(() => {
    if (locked || doneRef.current) return
    if (paramsMatch(amplitude, frequency, targetAmplitude, targetFrequency, tolerance)) {
      finish()
    }
  }, [amplitude, frequency, targetAmplitude, targetFrequency, tolerance, locked, finish])

  const matchRatio = calcMatchRatio(amplitude, frequency, targetAmplitude, targetFrequency)

  return (
    <div className="relative flex min-h-[min(72dvh,32rem)] w-full flex-col overflow-hidden rounded-xl border border-red-400/15 bg-void-950">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />

      <div className="relative z-10 flex flex-1 flex-col px-4 pb-5 pt-4">
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-sky-muted/20 bg-void-900/75 px-3 py-2.5 backdrop-blur-sm">
          <Droplets className="mt-0.5 h-4 w-4 shrink-0 text-sky-bright" />
          <p className="text-xs leading-relaxed text-mist-muted">
            利用【御水亲和】调节波幅与频率，使蓝色波形与红色狂暴波重合中和，提取纯净灵韵。
          </p>
        </div>

        <div className="mb-2 flex items-center justify-center gap-3 text-[10px]">
          <span className="inline-flex items-center gap-1 text-red-300/90">
            <span className="h-0.5 w-4 bg-red-400" />
            狂暴目标波
          </span>
          <span className="inline-flex items-center gap-1 text-sky-bright">
            <span className="h-0.5 w-4 bg-sky-400" />
            御水操控波
          </span>
          <span className="text-mist-faint">
            重合度 <span className="tabular-nums text-spirit">{Math.round(matchRatio * 100)}%</span>
          </span>
        </div>

        <div className="mx-auto mt-auto flex w-full max-w-sm gap-4">
          <ParamSlider
            label="御水·波幅"
            value={amplitude}
            disabled={locked}
            onChange={setAmplitude}
          />
          <ParamSlider
            label="御水·频率"
            value={frequency}
            disabled={locked}
            onChange={setFrequency}
          />
        </div>

        <p className="mt-4 text-center text-[10px] leading-relaxed text-mist-faint">
          拖动滑块使蓝波与红波重合（波幅与频率误差均 &lt; {tolerance}%）
        </p>
      </div>

      <ModalOverlay open={showComplete}>
        <motion.div
          initial={{ scale: 0.92, y: 12 }}
          animate={{ scale: 1, y: 0 }}
          className="w-full rounded-2xl border border-spirit/45 bg-void-900/95 px-5 py-6 text-center shadow-[0_0_48px_rgba(94,234,212,0.25)]"
        >
          <p className="mb-2 text-[10px] tracking-[0.35em] text-spirit">波段中和</p>
          <p className="text-sm leading-relaxed text-mist">
            狂暴波段已中和！提取灵韵主旋律成功。
          </p>
        </motion.div>
      </ModalOverlay>
    </div>
  )
}

export default WaterTuning
