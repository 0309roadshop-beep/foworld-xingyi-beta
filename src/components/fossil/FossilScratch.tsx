import { AnimatePresence, motion } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { FOSSIL_IMAGE_ASPECT, FOSSIL_IMAGE_URL } from '../../mock/data'

/** 擦除面积达到 80% 即判定成功 */
const CLEAR_THRESHOLD = 0.8
/** 画笔半径（CSS 像素） */
const BRUSH_RADIUS = 28

interface FossilScratchProps {
  onSuccess?: () => void
}

/** 在 Canvas 上绘制泥土层（渐变 + 噪点纹理） */
function fillDirtLayer(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, w, h)
  grad.addColorStop(0, '#7a6a58')
  grad.addColorStop(0.45, '#9a8570')
  grad.addColorStop(1, '#5e5044')
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  // 模拟泥土颗粒
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * w
    const y = Math.random() * h
    const r = Math.random() * 2.2 + 0.4
    ctx.fillStyle = `rgba(${40 + Math.random() * 30},${35 + Math.random() * 25},${25 + Math.random() * 20},${0.15 + Math.random() * 0.25})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // 表层压暗边缘
  const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.72)
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(1, 'rgba(0,0,0,0.18)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, w, h)
}

/** 带柔边的橡皮擦圆形 */
function scratchAt(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  ctx.globalCompositeOperation = 'destination-out'
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius)
  g.addColorStop(0, 'rgba(0,0,0,1)')
  g.addColorStop(0.55, 'rgba(0,0,0,0.75)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
}

/** 统计 Alpha=0 的像素占比（仅在 pointerup 时调用） */
function calcClearRatio(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const { data } = ctx.getImageData(0, 0, w, h)
  let cleared = 0
  // 每隔 4 字节取 Alpha，步进 16 以兼顾性能（约 1/4 采样，比例仍准确）
  for (let i = 3; i < data.length; i += 16) {
    if (data[i] === 0) cleared++
  }
  const sampled = Math.ceil(data.length / 16)
  return cleared / sampled
}

export function FossilScratch({ onSuccess }: FossilScratchProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const dprRef = useRef(1)
  const cssSizeRef = useRef({ w: 0, h: 0 })
  const drawingRef = useRef(false)
  const solvedRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  const [progress, setProgress] = useState(0)
  const [solved, setSolved] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  /** 初始化 / 重置 Canvas 尺寸与泥土层 */
  const setupCanvas = useCallback(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const w = rect.width
    const h = rect.height

    dprRef.current = dpr
    cssSizeRef.current = { w, h }

    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctxRef.current = ctx
    fillDirtLayer(ctx, w, h)
  }, [])

  useEffect(() => {
    setupCanvas()
    const ro = new ResizeObserver(() => {
      if (!solvedRef.current) setupCanvas()
    })
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [setupCanvas])

  const getPoint = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  const drawLine = useCallback((from: { x: number; y: number }, to: { x: number; y: number }) => {
    const ctx = ctxRef.current
    if (!ctx) return
    const dist = Math.hypot(to.x - from.x, to.y - from.y)
    const steps = Math.max(1, Math.ceil(dist / (BRUSH_RADIUS * 0.35)))
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      scratchAt(ctx, from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, BRUSH_RADIUS)
    }
  }, [])

  /** 仅在 pointerup 时计算擦除面积，避免 move 卡顿 */
  const measureProgress = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx || solvedRef.current) return

    const ratio = calcClearRatio(ctx, canvas.width, canvas.height)
    setProgress(ratio)

    if (ratio >= CLEAR_THRESHOLD) {
      solvedRef.current = true
      setFadeOut(true)
      setTimeout(() => {
        setSolved(true)
        onSuccess?.()
      }, 700)
    }
  }, [onSuccess])

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      if (solvedRef.current) return
      e.preventDefault()
      drawingRef.current = true
      const pt = getPoint(e)
      lastPointRef.current = pt
      scratchAt(ctxRef.current!, pt.x, pt.y, BRUSH_RADIUS)
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [getPoint],
  )

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current || solvedRef.current) return
      e.preventDefault()
      const pt = getPoint(e)
      const last = lastPointRef.current
      if (last) drawLine(last, pt)
      else scratchAt(ctxRef.current!, pt.x, pt.y, BRUSH_RADIUS)
      lastPointRef.current = pt
    },
    [drawLine, getPoint],
  )

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return
      drawingRef.current = false
      lastPointRef.current = null
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
      measureProgress()
    },
    [measureProgress],
  )

  const handleReset = useCallback(() => {
    solvedRef.current = false
    setSolved(false)
    setFadeOut(false)
    setProgress(0)
    setupCanvas()
  }, [setupCanvas])

  const progressPct = Math.min(100, Math.round(progress * 100))

  return (
    <div className="w-full">
      <p className="mb-3 text-center text-xs text-mist-muted">
        手指滑动刮开泥土，露出化石全貌；擦除超过 80% 即修复完成
      </p>

      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-xl border border-jade/25 bg-void-950 shadow-glow"
        style={{ aspectRatio: FOSSIL_IMAGE_ASPECT, touchAction: 'none' }}
      >
        {/* 底层：化石全貌 */}
        <img
          src={FOSSIL_IMAGE_URL}
          alt="贵州龙化石"
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
        />

        {/* 上层：可刮除泥土 Canvas */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 z-10 touch-none transition-opacity duration-700 ${
            fadeOut ? 'opacity-0' : 'opacity-100'
          } ${solved ? 'pointer-events-none' : 'cursor-crosshair'}`}
          style={{ touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />

        {/* 进度指示 */}
        {!solved && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-void-950/80 to-transparent px-3 pb-3 pt-6">
            <div className="mb-1 flex justify-between text-[10px] text-mist-faint">
              <span>修复进度</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-void-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-jade-muted to-gold-muted transition-[width] duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* 成功特效 */}
        <AnimatePresence>
          {solved && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.9, 0] }}
              transition={{ duration: 0.8, times: [0, 0.4, 1] }}
              className="pointer-events-none absolute inset-0 z-30 bg-gradient-to-b from-gold-bright/20 via-white/10 to-jade-bright/15"
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {solved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
            >
              <div className="rounded-2xl border border-gold-bright/50 bg-void-950/65 px-5 py-3 text-center shadow-glow-gold backdrop-blur-sm">
                <p className="text-base font-medium text-gold-bright">化石修复完成！</p>
                <p className="mt-0.5 text-[11px] text-jade-bright">贵州龙化石已完整显露</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
          重新覆盖泥土
        </button>
      </div>
    </div>
  )
}

export default FossilScratch
