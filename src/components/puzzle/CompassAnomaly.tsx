import { motion } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { Crosshair, Radio, Sparkles } from 'lucide-react'
import { ModalOverlay } from '../ui/ModalOverlay'
import {
  COMPASS_ANOMALY_DEFAULTS,
  DAY2_COMPASS_ANOMALY_IMAGES,
  DAY2_COMPASS_ANOMALY_SUCCESS_TARGET,
  SPOT_DIFFERENCES,
  containerToImagePercent,
  isSpotHit,
  loupeBackgroundPosition,
  spotRingDiameterPx,
  type SpotDifference,
} from '../../config/compassAnomalyConfig'
import { preventGhostActivation } from '../../utils/touchInteraction'

export interface CompassAnomalyProps {
  imageA?: string
  imageB?: string
  spots?: SpotDifference[]
  timeLimitSeconds?: number
  penaltySeconds?: number
  targetCount?: number
  successTargetName?: string
  introTitle?: string
  questName?: string
  description?: string
  onSuccess?: () => void
  onCancel?: () => void
  onClose?: () => void
}

type Phase = 'play' | 'fusion' | 'modal' | 'timeout'

const LOUPE_DELAY_MS = 80
const LOUPE_DRAG_PX = 6
const LOUPE_SIZE = 120
const LOUPE_ZOOM = 2.5
const LOUPE_OFFSET_Y = 80
const DEFAULT_INTRO_TITLE = '【罗盘异动：捕捉到微弱生机信号】'

type PointerSession = {
  startX: number
  startY: number
  imgUrl: string
  imgEl: HTMLImageElement
  checkHit: boolean
}

type SyncMagnifierState = {
  show: boolean
  rx: number
  ry: number
}

type ImageLayout = {
  w: number
  h: number
}

const MAGNIFIER_IDLE: SyncMagnifierState = {
  show: false,
  rx: 0,
  ry: 0,
}

type LoupeLayer = {
  key: 'a' | 'b'
  label: string
  imgUrl: string
  imgEl: HTMLImageElement
}

function buildLoupeStyle(layer: LoupeLayer, rx: number, ry: number) {
  const rect = layer.imgEl.getBoundingClientRect()
  const localX = rx * rect.width
  const localY = ry * rect.height
  const bg = loupeBackgroundPosition(localX, localY, LOUPE_SIZE / 2, LOUPE_ZOOM)
  return {
    left: rect.left + localX,
    top: rect.top + localY - LOUPE_OFFSET_Y,
    width: LOUPE_SIZE,
    height: LOUPE_SIZE,
    backgroundImage: `url("${layer.imgUrl}")`,
    backgroundSize: `${rect.width * LOUPE_ZOOM}px ${rect.height * LOUPE_ZOOM}px`,
    backgroundPosition: `${bg.x}px ${bg.y}px`,
  }
}

function playPurifyChime() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, now)
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08)
    gain.gain.setValueAtTime(0.22, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.36)
    window.setTimeout(() => void ctx.close(), 400)
  } catch {
    /* 静默 */
  }
}

function playErrorBuzz() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(120, now)
    gain.gain.setValueAtTime(0.08, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.14)
    window.setTimeout(() => void ctx.close(), 200)
  } catch {
    /* 静默 */
  }
}

function pointerOnImage(clientX: number, clientY: number, imgEl: HTMLImageElement) {
  const rect = imgEl.getBoundingClientRect()
  const localX = clientX - rect.left
  const localY = clientY - rect.top
  return {
    rx: localX / rect.width,
    ry: localY / rect.height,
    localX,
    localY,
    renderedW: rect.width,
    renderedH: rect.height,
    inBounds:
      localX >= 0 && localX <= rect.width && localY >= 0 && localY <= rect.height,
  }
}

function observeImageLayout(img: HTMLImageElement, onChange: (layout: ImageLayout) => void) {
  const emit = () => {
    const rect = img.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      onChange({ w: rect.width, h: rect.height })
    }
  }
  emit()
  const ro = new ResizeObserver(() => emit())
  ro.observe(img)
  return () => ro.disconnect()
}

function AnomalyImagePanel({
  label,
  labelClass,
  imgRef,
  src,
  alt,
  imgClassName,
  interactive,
  overlay,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onLoad,
}: {
  label: string
  labelClass: string
  imgRef: RefObject<HTMLImageElement | null>
  src: string
  alt: string
  imgClassName?: string
  interactive?: boolean
  overlay?: ReactNode
  onPointerDown?: (e: ReactPointerEvent<HTMLDivElement>) => void
  onPointerMove?: (e: ReactPointerEvent<HTMLDivElement>) => void
  onPointerUp?: (e: ReactPointerEvent<HTMLDivElement>) => void
  onPointerCancel?: (e: ReactPointerEvent<HTMLDivElement>) => void
  onLoad?: () => void
}) {
  return (
    <div
      className={`compass-anomaly-image-container min-h-0 flex-1 ${interactive ? 'cursor-crosshair' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div className="flex h-full w-full items-center justify-center">
        <div className="compass-anomaly-image-frame relative max-h-full max-w-full">
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            className={`compass-anomaly-img block max-h-full max-w-full object-contain ${imgClassName ?? ''}`}
            draggable={false}
            onLoad={onLoad}
          />
          <div className="compass-anomaly-image-overlay">
            <span
              className={`pointer-events-none absolute left-2 top-2 z-10 rounded bg-black/50 px-1.5 py-0.5 text-[9px] tracking-wider ${labelClass}`}
            >
              {label}
            </span>
            {overlay}
          </div>
        </div>
      </div>
    </div>
  )
}

export function CompassAnomaly({
  imageA = DAY2_COMPASS_ANOMALY_IMAGES.imageA,
  imageB = DAY2_COMPASS_ANOMALY_IMAGES.imageB,
  spots = SPOT_DIFFERENCES,
  timeLimitSeconds = COMPASS_ANOMALY_DEFAULTS.timeLimitSeconds,
  penaltySeconds = COMPASS_ANOMALY_DEFAULTS.penaltySeconds,
  targetCount = COMPASS_ANOMALY_DEFAULTS.targetCount,
  successTargetName = DAY2_COMPASS_ANOMALY_SUCCESS_TARGET,
  introTitle = DEFAULT_INTRO_TITLE,
  questName = '磁场干扰净化',
  description = '罗盘捕捉到微弱生机信号。对比上下影像，在干扰图中找出并净化 5 处灵韵异常。',
  onSuccess,
}: CompassAnomalyProps) {
  const [isGaming, setIsGaming] = useState(false)
  const [phase, setPhase] = useState<Phase>('play')
  const [foundIds, setFoundIds] = useState<number[]>([])
  const [timeLeft, setTimeLeft] = useState(timeLimitSeconds)
  const [errorFlash, setErrorFlash] = useState(false)
  const [imageBLayout, setImageBLayout] = useState<ImageLayout>({ w: 1, h: 1 })
  const [magnifier, setMagnifier] = useState<SyncMagnifierState>(MAGNIFIER_IDLE)
  const [portalReady, setPortalReady] = useState(false)

  const imageARef = useRef<HTMLImageElement>(null)
  const imageBRef = useRef<HTMLImageElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const successFiredRef = useRef(false)
  const loupeTimerRef = useRef<number | null>(null)
  const loupeActiveRef = useRef(false)
  const pointerSessionRef = useRef<PointerSession | null>(null)
  const latestPointerRef = useRef({ x: 0, y: 0 })
  const sessionStartedRef = useRef(false)

  const total = Math.min(targetCount, spots.length)
  const timerPct = Math.max(0, (timeLeft / timeLimitSeconds) * 100)
  const timerPaused = !isGaming || phase !== 'play'

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    if (!isGaming) return
    const img = imageBRef.current
    if (!img) return
    return observeImageLayout(img, setImageBLayout)
  }, [imageB, isGaming])

  useEffect(() => {
    if (timerPaused) {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = null
      return
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setPhase('timeout')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [timerPaused])

  useEffect(() => {
    if (!isGaming || foundIds.length < total) return
    setPhase('fusion')
    const t = window.setTimeout(() => setPhase('modal'), 1600)
    return () => clearTimeout(t)
  }, [foundIds.length, total, isGaming])

  const clearLoupeTimer = useCallback(() => {
    if (loupeTimerRef.current) {
      window.clearTimeout(loupeTimerRef.current)
      loupeTimerRef.current = null
    }
  }, [])

  const resetPointerSession = useCallback(() => {
    clearLoupeTimer()
    loupeActiveRef.current = false
    setMagnifier(MAGNIFIER_IDLE)
    pointerSessionRef.current = null
  }, [clearLoupeTimer])

  const handleHit = useCallback(
    (spot: SpotDifference) => {
      if (!isGaming || phase !== 'play' || foundIds.includes(spot.id)) return
      playPurifyChime()
      setFoundIds((prev) => [...prev, spot.id])
    },
    [isGaming, phase, foundIds],
  )

  const handleMiss = useCallback(() => {
    if (!isGaming || phase !== 'play') return
    playErrorBuzz()
    setErrorFlash(true)
    setTimeLeft((prev) => Math.max(0, prev - penaltySeconds))
    window.setTimeout(() => setErrorFlash(false), 420)
  }, [isGaming, phase, penaltySeconds])

  const checkDifference = useCallback(
    (clientX: number, clientY: number, imgEl: HTMLImageElement) => {
      if (!isGaming || phase !== 'play') return
      const hit = pointerOnImage(clientX, clientY, imgEl)
      if (!hit.inBounds) return

      const click = containerToImagePercent(hit.rx, hit.ry)
      const spot = spots.find(
        (s) => !foundIds.includes(s.id) && isSpotHit(click.x, click.y, s),
      )
      if (spot) handleHit(spot)
      else handleMiss()
    },
    [isGaming, phase, spots, foundIds, handleHit, handleMiss],
  )

  const updateMagnifier = useCallback((clientX: number, clientY: number, imgEl: HTMLImageElement) => {
    const hit = pointerOnImage(clientX, clientY, imgEl)
    setMagnifier({
      show: true,
      rx: hit.rx,
      ry: hit.ry,
    })
  }, [])

  const activateLoupe = useCallback(
    (clientX: number, clientY: number) => {
      const session = pointerSessionRef.current
      if (!session) return
      loupeActiveRef.current = true
      updateMagnifier(clientX, clientY, session.imgEl)
    },
    [updateMagnifier],
  )

  const maybeActivateLoupe = useCallback(
    (clientX: number, clientY: number) => {
      if (loupeActiveRef.current) return
      const session = pointerSessionRef.current
      if (!session) return

      const moved = Math.hypot(clientX - session.startX, clientY - session.startY)
      if (moved >= LOUPE_DRAG_PX) {
        clearLoupeTimer()
        activateLoupe(clientX, clientY)
      }
    },
    [activateLoupe, clearLoupeTimer],
  )

  const handleImagePointerDown = useCallback(
    (
      e: ReactPointerEvent<HTMLDivElement>,
      imgUrl: string,
      imgEl: HTMLImageElement | null,
      checkHit = false,
    ) => {
      if (!isGaming || !imgEl || phase !== 'play') return
      e.preventDefault()
      if (e.pointerType === 'touch') preventGhostActivation(e)

      latestPointerRef.current = { x: e.clientX, y: e.clientY }
      pointerSessionRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        imgUrl,
        imgEl,
        checkHit,
      }
      loupeActiveRef.current = false
      clearLoupeTimer()

      e.currentTarget.setPointerCapture(e.pointerId)

      loupeTimerRef.current = window.setTimeout(() => {
        if (!pointerSessionRef.current) return
        const { x, y } = latestPointerRef.current
        activateLoupe(x, y)
      }, LOUPE_DELAY_MS)
    },
    [isGaming, phase, clearLoupeTimer, activateLoupe],
  )

  const handleImagePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!isGaming || phase !== 'play' || !pointerSessionRef.current) return
      if (e.pointerType === 'mouse' && e.buttons === 0) return
      e.preventDefault()

      latestPointerRef.current = { x: e.clientX, y: e.clientY }
      maybeActivateLoupe(e.clientX, e.clientY)

      if (loupeActiveRef.current) {
        const session = pointerSessionRef.current
        updateMagnifier(e.clientX, e.clientY, session.imgEl)
      }
    },
    [isGaming, phase, maybeActivateLoupe, updateMagnifier],
  )

  const endImagePointer = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      const session = pointerSessionRef.current
      clearLoupeTimer()
      loupeActiveRef.current = false
      setMagnifier(MAGNIFIER_IDLE)
      pointerSessionRef.current = null

      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }

      if (session?.checkHit && session.imgEl) {
        checkDifference(e.clientX, e.clientY, session.imgEl)
      }
    },
    [clearLoupeTimer, checkDifference],
  )

  const handleProceed = useCallback(() => {
    if (successFiredRef.current) return
    successFiredRef.current = true
    setIsGaming(false)
    onSuccess?.()
  }, [onSuccess])

  const handleRetry = useCallback(() => {
    successFiredRef.current = false
    setFoundIds([])
    setTimeLeft(timeLimitSeconds)
    setPhase('play')
    sessionStartedRef.current = true
    resetPointerSession()
  }, [timeLimitSeconds, resetPointerSession])

  const handleEnterBattle = useCallback(() => {
    if (!sessionStartedRef.current) {
      setFoundIds([])
      setTimeLeft(timeLimitSeconds)
      setPhase('play')
      sessionStartedRef.current = true
    }
    setIsGaming(true)
  }, [timeLimitSeconds])

  const handleExitBattle = useCallback(() => {
    resetPointerSession()
    setIsGaming(false)
  }, [resetPointerSession])

  const syncLoupeLayers: LoupeLayer[] = []
  if (isGaming && magnifier.show) {
    const imgA = imageARef.current
    const imgB = imageBRef.current
    if (imgA) syncLoupeLayers.push({ key: 'a', label: 'A', imgUrl: imageA, imgEl: imgA })
    if (imgB) syncLoupeLayers.push({ key: 'b', label: 'B', imgUrl: imageB, imgEl: imgB })
  }

  const imageBOverlay = (
    <>
      {phase === 'play' && (
        <div className="compass-anomaly-noise-scanlines pointer-events-none absolute inset-0 z-[5]" />
      )}
      {spots.map((spot) => {
        if (!foundIds.includes(spot.id)) return null
        const ringPx = spotRingDiameterPx(spot, imageBLayout.w, imageBLayout.h)
        return (
          <span
            key={spot.id}
            className="compass-spot-found-ring found-circle pointer-events-none absolute z-[25] rounded-full"
            style={{
              left: `${spot.cx}%`,
              top: `${spot.cy}%`,
              width: ringPx,
              height: ringPx,
              transform: 'translate(-50%, -50%)',
            }}
          />
        )
      })}
      {(phase === 'fusion' || phase === 'modal') && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="pointer-events-none absolute inset-0 z-[22] bg-[radial-gradient(circle_at_50%_40%,rgba(45,212,168,0.35),transparent_65%)]"
        />
      )}
    </>
  )

  const battleLayer = (
    <div
      className={`compass-anomaly compass-anomaly-scene fixed inset-0 z-50 flex h-[100dvh] w-full touch-none select-none flex-col overflow-hidden bg-slate-900 ${
        errorFlash ? 'compass-anomaly--error' : ''
      }`}
    >
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-cyan-500/20 bg-void-900/95 px-4 backdrop-blur-sm">
        <button
          type="button"
          className="rounded-lg border border-white/20 bg-black/40 px-3 py-1.5 text-xs text-white/85 active:scale-95"
          onClick={handleExitBattle}
        >
          ⏴ 退出
        </button>

        <p className="truncate px-2 text-center text-[11px] font-medium text-cyan-200/90">
          {introTitle}
        </p>

        <div className="flex min-w-[5rem] flex-col items-end text-[10px]">
          <span className="font-mono text-jade-bright/90">
            {foundIds.length} / {total}
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-cyan-300/90">
            <Radio className="h-3 w-3" />
            {timerPaused && phase !== 'timeout' ? '—' : `${timeLeft}s`}
          </span>
          <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-void-700/80">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-jade-bright"
              animate={{ width: `${timerPct}%` }}
              transition={{ duration: 0.35 }}
            />
          </div>
        </div>
      </header>

      <main className="relative flex min-h-0 w-full flex-1 items-center justify-center p-2">
        <div className="flex h-full w-full min-h-0 flex-col gap-1">
          <AnomalyImagePanel
            label="基准信号 A"
            labelClass="text-mist-muted"
            imgRef={imageARef}
            src={imageA}
            alt="罗盘基准影像"
            interactive={phase === 'play'}
            onPointerDown={(e) => handleImagePointerDown(e, imageA, imageARef.current)}
            onPointerMove={handleImagePointerMove}
            onPointerUp={endImagePointer}
            onPointerCancel={endImagePointer}
            overlay={
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-void-950/20" />
            }
          />

          <AnomalyImagePanel
            label="干扰信号 B"
            labelClass="text-amber-300/90"
            imgRef={imageBRef}
            src={imageB}
            alt="磁场干扰影像"
            interactive={phase === 'play'}
            imgClassName={`transition-all duration-[1.4s] ${
              phase === 'fusion' || phase === 'modal'
                ? 'compass-anomaly-img-clear'
                : 'compass-anomaly-img-noise'
            }`}
            onPointerDown={(e) => handleImagePointerDown(e, imageB, imageBRef.current, true)}
            onPointerMove={handleImagePointerMove}
            onPointerUp={endImagePointer}
            onPointerCancel={endImagePointer}
            onLoad={() => {
              const img = imageBRef.current
              if (!img) return
              const rect = img.getBoundingClientRect()
              if (rect.width > 0 && rect.height > 0) {
                setImageBLayout({ w: rect.width, h: rect.height })
              }
            }}
            overlay={imageBOverlay}
          />
        </div>
      </main>

      {syncLoupeLayers.length > 0 &&
        createPortal(
          <>
            {syncLoupeLayers.map((layer) => (
              <div
                key={layer.key}
                className="compass-anomaly-loupe pointer-events-none"
                style={buildLoupeStyle(layer, magnifier.rx, magnifier.ry)}
                aria-hidden
              >
                <span className="compass-anomaly-loupe-label">{layer.label}</span>
              </div>
            ))}
          </>,
          document.body,
        )}

      <ModalOverlay open={phase === 'timeout'}>
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full rounded-2xl border border-red-400/30 bg-void-900/95 px-6 py-8 text-center"
        >
          <p className="mb-2 text-sm text-red-300/90">磁场干扰加剧，信号追踪中断</p>
          <p className="mb-5 text-xs text-mist-faint">倒计时已耗尽，请重新校准罗盘</p>
          <button
            type="button"
            onClick={handleRetry}
            className="w-full rounded-xl border border-cyan-500/40 bg-cyan-950/40 px-6 py-2.5 text-sm text-cyan-200"
          >
            重新扫描
          </button>
        </motion.div>
      </ModalOverlay>

      <ModalOverlay open={phase === 'modal'}>
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="w-full rounded-2xl border border-cyan-400/35 bg-void-900/95 p-5 shadow-[0_0_48px_rgba(34,211,238,0.2)]"
        >
          <div className="mb-4 flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-950/50">
              <Crosshair className="h-6 w-6 text-cyan-300" />
            </div>
            <p className="mb-1 text-[10px] tracking-[0.35em] text-cyan-400/80">SIGNAL LOCKED</p>
            <p className="text-xs leading-relaxed text-mist-muted">
              磁场干扰已清除，信号源解析完成。
            </p>
            <p className="mt-3 text-sm font-medium text-jade-bright">
              目标锁定：【{successTargetName}】
            </p>
          </div>
          <button
            type="button"
            onPointerDown={(e) => {
              preventGhostActivation(e)
              handleProceed()
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-700/80 to-jade-deep/80 py-3 text-sm font-medium text-white ring-1 ring-cyan-400/30"
            style={{ touchAction: 'none' }}
          >
            <Sparkles className="h-4 w-4" />
            立即前往
          </button>
        </motion.div>
      </ModalOverlay>
    </div>
  )

  /* ── 状态 1：任务简报（文档流） ── */
  if (!isGaming) {
    return (
      <>
        <div className="compass-anomaly-lobby interactive-area relative mx-auto w-full max-w-md rounded-xl border border-cyan-500/25 bg-void-950/90 p-5 shadow-[0_0_24px_rgba(34,211,238,0.08)]">
          {questName && (
            <p className="mb-3 text-center text-[10px] tracking-[0.25em] text-gold-muted">
              {questName}
            </p>
          )}

          <div className="mb-4 rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-4">
            <p className="mb-1 text-[10px] font-medium tracking-wider text-cyan-400/80">罗盘灵</p>
            <p className="text-sm leading-relaxed text-mist">{description}</p>
          </div>

          <p className="mb-2 text-center text-xs text-cyan-200/80">{introTitle}</p>
          <ul className="mb-6 space-y-1.5 text-[11px] leading-relaxed text-mist-faint">
            <li>· 地脉灵纹存在异常波动，请进行高维对比排查</li>
            <li>· 按住并拖动图片，A/B 双镜同步对照同一区域</li>
            <li>· 在干扰图 B 中点击净化 {total} 处灵韵异常</li>
            <li>· 误点将扣除 {penaltySeconds} 秒扫描时间</li>
          </ul>

          {sessionStartedRef.current && foundIds.length > 0 && foundIds.length < total && (
            <p className="mb-3 text-center text-[11px] text-jade-bright/90">
              进行中：已净化 {foundIds.length}/{total} · 剩余 {timeLeft}s
            </p>
          )}

          <button
            type="button"
            className="w-full rounded-xl border border-cyan-400/50 bg-gradient-to-r from-cyan-900/60 to-jade-deep/50 px-6 py-3.5 text-sm font-medium tracking-wide text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.25)] ring-1 ring-cyan-400/30 active:scale-[0.98]"
            onClick={handleEnterBattle}
          >
            【 启动高维对比 】
          </button>
        </div>
      </>
    )
  }

  /* ── 状态 2：全屏战场 ── */
  if (!portalReady) return null
  return createPortal(battleLayer, document.body)
}

export default CompassAnomaly
