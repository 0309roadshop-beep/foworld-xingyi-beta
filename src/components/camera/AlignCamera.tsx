import { AnimatePresence, motion } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { Camera, RefreshCw, Sparkles } from 'lucide-react'
import { ModalOverlay } from '../ui/ModalOverlay'
import { CameraBackButton } from './CameraBackButton'
import { CameraPermissionGate } from './CameraPermissionGate'
import {
  bindStreamToVideo,
  describeCameraError,
  getCameraSupport,
  openCameraStream,
  stopMediaStream,
} from '../../utils/cameraAccess'

export type QuestType = 'tree' | 'bagua' | 'castle' | 'bridge'

export interface AlignCameraProps {
  questType: QuestType
  /** 嵌入罗盘任务窗时使用，避免 fixed 全屏遮挡主界面 */
  embedded?: boolean
  /** 二段式：任务简报 → 全屏取景（吉隆堡等主线） */
  twoPhase?: boolean
  questName?: string
  description?: string
  briefingText?: string
  startButtonLabel?: string
  hudStatusText?: string
  onSuccess?: () => void
  onError?: (message: string) => void
  /** 取消取景：释放摄像头后回调 */
  onCancel?: () => void
  onClose?: () => void
}

type Phase = 'prompt' | 'loading' | 'live' | 'frozen' | 'awakening' | 'success'

const JADE_STROKE = 'rgba(94, 236, 196, 0.78)'
const JADE_FILL = 'rgba(45, 212, 168, 0.28)'
const GOLD_STROKE = 'rgba(253, 230, 138, 0.95)'
const GOLD_FILL = 'rgba(232, 197, 71, 0.22)'

/** 线框配色：对齐中为玉色，唤醒成功后为金色 */
function overlayColors(awakened: boolean) {
  return {
    stroke: awakened ? GOLD_STROKE : JADE_STROKE,
    fill: awakened ? GOLD_FILL : JADE_FILL,
    accent: awakened ? 'rgba(253,230,138,0.65)' : 'rgba(232,197,71,0.45)',
    dash: awakened ? 'rgba(253,230,138,0.35)' : 'rgba(94,236,196,0.35)',
  }
}

function TreeOverlay({ className, awakened }: { className?: string; awakened?: boolean }) {
  const c = overlayColors(!!awakened)
  const stroke = awakened ? '#FDE68A' : '#00F5FF'
  const glow = awakened ? 'rgba(253, 230, 138, 0.8)' : 'rgba(0, 245, 255, 0.8)'

  return (
    <div
      className={`pointer-events-none flex h-full w-full flex-col items-center justify-center ${className ?? ''}`}
    >
      <div className="relative mx-auto aspect-square w-full max-w-sm">
        <svg viewBox="0 0 100 100" className="h-full w-full" fill="none" aria-hidden>
          <ellipse
            cx="50"
            cy="95"
            rx="30"
            ry="5"
            fill="none"
            stroke={stroke}
            strokeWidth="0.5"
            strokeDasharray="2 2"
            opacity="0.6"
          />

          <g filter={`drop-shadow(0 0 6px ${glow})`}>
            <path
              d="M38 95 Q45 70 48 50 M62 95 Q55 70 52 50 M45 95 Q50 80 50 50 M55 95 Q50 80 50 50 M32 95 Q42 85 46 60 M68 95 Q58 85 54 60"
              stroke={stroke}
              fill="none"
              strokeWidth="1.5"
              opacity="0.9"
            />
            <path
              d="M48 50 Q30 40 10 50 M49 50 Q25 20 18 15 M50 50 Q50 20 50 5 M51 50 Q75 20 82 15 M52 50 Q70 40 90 50"
              stroke={stroke}
              fill="none"
              strokeWidth="1.2"
              opacity="0.8"
            />
            <path
              d="M 5 55 C 0 20 25 2 50 2 C 75 2 100 20 95 55"
              stroke={stroke}
              fill="none"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.7"
              className="animate-pulse"
            />
            <path
              d="M 15 45 C 15 15 35 12 50 12 C 65 12 85 15 85 45"
              stroke={stroke}
              fill="none"
              strokeWidth="0.8"
              strokeDasharray="2 3"
              opacity="0.5"
            />
            <circle cx="50" cy="2" r="1.5" fill={stroke} />
            <circle cx="18" cy="15" r="1.5" fill={stroke} />
            <circle cx="82" cy="15" r="1.5" fill={stroke} />
            <circle cx="10" cy="50" r="1.5" fill={stroke} />
            <circle cx="90" cy="50" r="1.5" fill={stroke} />
            <circle cx="50" cy="50" r="2.5" fill={stroke} className="animate-ping" opacity="0.8" />
            <circle cx="50" cy="50" r="1.5" fill="#ffffff" />
          </g>

          <text
            x="50"
            y="99"
            textAnchor="middle"
            fill={c.accent}
            fontSize="3.2"
            letterSpacing="1.1"
          >
            对齐树王灵纹
          </text>
        </svg>
      </div>
    </div>
  )
}

function BaguaOverlay({ className, awakened }: { className?: string; awakened?: boolean }) {
  const c = overlayColors(!!awakened)
  return (
    <svg viewBox="0 0 320 320" className={className} fill="none" aria-hidden>
      <circle cx="160" cy="160" r="148" stroke={c.stroke} strokeWidth="2" />
      <circle cx="160" cy="160" r="118" stroke={c.accent} strokeWidth="1.5" />
      <circle cx="160" cy="160" r="88" stroke={c.stroke} strokeWidth="1" strokeDasharray="4 6" />
      <circle cx="160" cy="160" r="38" stroke={c.stroke} strokeWidth="2" fill={c.fill} />
      <path
        d="M160 12 L160 308 M12 160 L308 160 M52 52 L268 268 M268 52 L52 268"
        stroke={c.dash}
        strokeWidth="1"
      />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const angle = (i * Math.PI) / 4 - Math.PI / 2
        const cx = 160 + Math.cos(angle) * 118
        const cy = 160 + Math.sin(angle) * 118
        return (
          <line
            key={i}
            x1={cx - 10}
            y1={cy}
            x2={cx + 10}
            y2={cy}
            stroke={c.stroke}
            strokeWidth="2.5"
            transform={`rotate(${(i * 45) % 360}, ${cx}, ${cy})`}
          />
        )
      })}
      <text x="160" y="300" textAnchor="middle" fill={c.accent} fontSize="11" letterSpacing="4">
        对齐八卦阵眼
      </text>
    </svg>
  )
}

function BridgeOverlay({ className, awakened }: { className?: string; awakened?: boolean }) {
  const c = overlayColors(!!awakened)
  return (
    <svg viewBox="0 0 320 360" className={className} fill="none" aria-hidden>
      <path
        d="M24 250 L296 250"
        stroke={c.accent}
        strokeWidth="1.5"
        strokeDasharray="6 8"
      />
      <path
        d="M48 250 L48 170 L272 170 L272 250"
        stroke={c.stroke}
        strokeWidth="2"
        fill={c.fill}
        opacity="0.35"
      />
      <path
        d="M64 250 L64 190 M96 250 L96 185 M128 250 L128 180 M192 250 L192 180 M224 250 L224 185 M256 250 L256 190"
        stroke={c.stroke}
        strokeWidth="1.5"
      />
      <path
        d="M48 170 Q160 120 272 170"
        stroke={c.stroke}
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M20 120 Q80 80 160 95 T300 115"
        stroke={c.dash}
        strokeWidth="1"
        fill="none"
      />
      <text x="160" y="340" textAnchor="middle" fill={c.accent} fontSize="11" letterSpacing="3">
        对齐观景大桥
      </text>
    </svg>
  )
}

function CastleOverlay({ className, awakened }: { className?: string; awakened?: boolean }) {
  const c = overlayColors(!!awakened)
  return (
    <svg viewBox="0 0 320 360" className={className} fill="none" aria-hidden>
      <path
        d="M40 280 L40 180 L70 180 L70 140 L90 140 L90 180 L120 180 L120 120 L140 120 L140 180
           L180 180 L180 100 L200 100 L200 180 L240 180 L240 130 L260 130 L260 180 L280 180 L280 280 Z"
        stroke={c.stroke}
        strokeWidth="2"
        fill={c.fill}
      />
      <path
        d="M70 140 L70 110 L90 110 L90 140 M120 120 L120 85 L140 85 L140 120
           M180 100 L180 65 L200 65 L200 100 M240 130 L240 95 L260 95 L260 130"
        stroke={c.stroke}
        strokeWidth="1.5"
      />
      <rect x="150" y="210" width="36" height="70" stroke={c.accent} strokeWidth="1.5" />
      <text x="160" y="340" textAnchor="middle" fill={c.accent} fontSize="11" letterSpacing="4">
        对齐城堡轮廓
      </text>
    </svg>
  )
}

function QuestOverlay({
  questType,
  className,
  awakened,
}: {
  questType: QuestType
  className?: string
  awakened?: boolean
}) {
  switch (questType) {
    case 'tree':
      return <TreeOverlay className={className} awakened={awakened} />
    case 'bagua':
      return <BaguaOverlay className={className} awakened={awakened} />
    case 'castle':
      return <CastleOverlay className={className} awakened={awakened} />
    case 'bridge':
      return <BridgeOverlay className={className} awakened={awakened} />
  }
}

function playShutterTick() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime
    const len = ctx.sampleRate * 0.05
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.01))
    }
    const src = ctx.createBufferSource()
    src.buffer = buf
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.5, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
    src.connect(gain)
    gain.connect(ctx.destination)
    src.start(now)
    window.setTimeout(() => void ctx.close(), 200)
  } catch {
    /* 静默失败 */
  }
}

const QUEST_HINT: Record<QuestType, string> = {
  tree: '树王',
  bagua: '八卦阵眼',
  castle: '城堡轮廓',
  bridge: '观景大桥',
}

/** 古榕树 AR 仅锚定灵脉，不直接唤醒木灵 */
const TREE_ANCHOR_SUCCESS_MESSAGE =
  '已成功锚定古榕树能量场。警告：检测到地脉能量严重淤堵，木灵处于深度休眠/封印状态。'

export function AlignCamera({
  questType,
  embedded = false,
  twoPhase = false,
  questName,
  description,
  briefingText,
  startButtonLabel,
  hudStatusText,
  onSuccess,
  onError,
  onCancel,
  onClose,
}: AlignCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const successFiredRef = useRef(false)
  const sessionStartedRef = useRef(false)

  const [isGaming, setIsGaming] = useState(false)
  const [portalReady, setPortalReady] = useState(false)
  const [phase, setPhase] = useState<Phase>('prompt')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [flash, setFlash] = useState(false)
  const [embeddedDismissed, setEmbeddedDismissed] = useState(false)
  const awakened = phase === 'awakening' || phase === 'success'
  const isTreeAnchor = questType === 'tree'

  const releaseStream = useCallback(() => {
    stopMediaStream(streamRef.current)
    streamRef.current = null
    const video = videoRef.current
    if (video) {
      video.pause()
      video.srcObject = null
    }
  }, [])

  const stopStream = useCallback(() => {
    releaseStream()
  }, [releaseStream])

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    if (!twoPhase) return
    if (!isGaming) {
      releaseStream()
      setPhase('prompt')
      setCameraError(null)
      setShowConfirm(false)
      successFiredRef.current = false
    }
  }, [twoPhase, isGaming, releaseStream])

  const startCamera = useCallback(async () => {
    stopStream()
    setCameraError(null)

    const support = getCameraSupport()
    if (!support.ok) {
      const msg = support.hint ? `${support.message}（${support.hint}）` : support.message
      setCameraError(msg)
      setPhase('prompt')
      onError?.(msg)
      return
    }

    setPhase('loading')

    try {
      const stream = await openCameraStream()
      streamRef.current = stream
      const video = videoRef.current
      if (!video) {
        stopMediaStream(stream)
        streamRef.current = null
        return
      }
      await bindStreamToVideo(video, stream)
      setPhase('live')
    } catch (err) {
      const msg = describeCameraError(err)
      setCameraError(msg)
      setPhase('prompt')
      onError?.(msg)
    }
  }, [stopStream, onError])

  useEffect(() => () => stopStream(), [stopStream])

  const handleCapture = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.preventDefault()
      if (phase !== 'live' || cameraError) return
      const video = videoRef.current
      if (!video) return

      setFlash(true)
      playShutterTick()
      video.pause()
      setPhase('frozen')
      setShowConfirm(true)
      window.setTimeout(() => setFlash(false), 160)
    },
    [phase, cameraError],
  )

  const handleRetake = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setShowConfirm(false)
    const video = videoRef.current
    if (video) void video.play()
    setPhase('live')
  }, [])

  const handleAwaken = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.preventDefault()
      if (successFiredRef.current) return
      setShowConfirm(false)
      setPhase('awakening')

      window.setTimeout(() => {
        successFiredRef.current = true
        setPhase('success')
        onSuccess?.()
      }, 1400)
    },
    [onSuccess],
  )

  const handleExitBattle = useCallback(() => {
    releaseStream()
    setShowConfirm(false)
    setPhase('prompt')
    setCameraError(null)
    successFiredRef.current = false
    setIsGaming(false)
  }, [releaseStream])

  const handleEnterBattle = useCallback(() => {
    sessionStartedRef.current = true
    setIsGaming(true)
  }, [])

  const handleClose = useCallback(() => {
    releaseStream()
    setShowConfirm(false)
    if (twoPhase) {
      setIsGaming(false)
      setPhase('prompt')
      setCameraError(null)
      return
    }
    const dismiss = onCancel ?? onClose
    if (dismiss) {
      dismiss()
      return
    }
    if (embedded) {
      setEmbeddedDismissed(true)
      setPhase('loading')
    }
  }, [embedded, onCancel, onClose, releaseStream, twoPhase])

  const resumeEmbeddedCamera = useCallback(() => {
    setEmbeddedDismissed(false)
    setPhase('prompt')
    setCameraError(null)
  }, [])

  const shellClass =
    'game-container flex items-center justify-center bg-black'

  if (embedded && embeddedDismissed) {
    return (
      <div className="relative z-0 flex min-h-[12rem] flex-col items-center justify-center rounded-xl border border-sky-muted/20 bg-void-900/80 px-6 py-8 text-center">
        <p className="mb-1 text-[10px] tracking-[0.3em] text-mist-muted">取景已收起</p>
        <p className="mb-4 text-xs leading-relaxed text-mist-muted">
          可向上滑动查看罗盘与地图，或继续当前主线取景任务。
        </p>
        <button
          type="button"
          onClick={resumeEmbeddedCamera}
          className="rounded-full border border-jade-muted/35 bg-jade-deep/25 px-5 py-2 text-sm text-jade-bright"
        >
          继续取景
        </button>
      </div>
    )
  }

  const shellStyle: CSSProperties = {
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  }

  const viewfinderClassName = twoPhase
    ? 'ar-viewfinder relative mx-auto h-full w-full max-h-full max-w-full overflow-hidden bg-black'
    : `ar-viewfinder relative mx-auto h-full w-full overflow-hidden bg-black ${
        embedded ? 'max-w-full' : 'max-w-[calc(100dvh*9/16)]'
      }`

  const permissionCancel = twoPhase ? handleExitBattle : handleClose
  const showBackButton = !twoPhase

  const viewfinder = (
    <div
      className={viewfinderClassName}
      style={{ aspectRatio: '9 / 16', touchAction: 'none' }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
        style={{ WebkitPlaysinline: 'true' } as React.CSSProperties}
      />

      {!cameraError && phase !== 'loading' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={
              awakened ? { scale: [1, 1.06, 1], opacity: 1 } : { scale: 1, opacity: 1 }
            }
            transition={{ duration: 1.2 }}
            className={`relative h-[88%] w-[88%] transition-[filter] duration-700 ${
              awakened
                ? 'drop-shadow-[0_0_28px_rgba(253,230,138,0.75)]'
                : 'drop-shadow-[0_0_16px_rgba(45,212,168,0.45)]'
            }`}
          >
            <QuestOverlay questType={questType} className="h-full w-full" awakened={awakened} />
            {!awakened && (
              <div className="scan-sweep-track">
                <div className="scan-sweep-line">
                  <div className="scan-sweep-line__bar bg-gradient-to-r from-transparent via-jade-bright/55 to-transparent" />
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {phase === 'loading' && !cameraError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-void-900/92">
          <div className="flex flex-col items-center gap-3">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-gold-muted/30 border-t-gold-bright" />
            <p className="text-sm text-mist-muted">正在唤起后置摄像头…</p>
          </div>
        </div>
      )}

      {(phase === 'prompt' || cameraError) && (
        <CameraPermissionGate
          error={cameraError}
          loading={phase === 'loading'}
          onEnable={() => void startCamera()}
          onCancel={permissionCancel}
        />
      )}

      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0.95 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="pointer-events-none absolute inset-0 z-40 bg-white"
          />
        )}
      </AnimatePresence>

      <ModalOverlay open={showConfirm}>
        <motion.div
          initial={{ y: 12, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 8, opacity: 0 }}
          className="w-full max-w-sm rounded-2xl border border-gold-muted/25 bg-void-900/92 p-5 backdrop-blur-md"
        >
          <p className="mb-1 text-center text-sm font-medium text-mist">
            {isTreeAnchor ? '灵脉锚定是否满意？' : '框景对齐是否满意？'}
          </p>
          <p className="mb-5 text-center text-xs text-mist-muted">
            {isTreeAnchor
              ? `${QUEST_HINT[questType]} · 确认后将锁定能量场坐标`
              : `${QUEST_HINT[questType]} · 确认后将唤醒灵纹`}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onPointerDown={handleRetake}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-mist-faint/25 py-2.5 text-sm text-mist-muted"
              style={{ touchAction: 'none' }}
            >
              <RefreshCw className="h-4 w-4" />
              重拍
            </button>
            <button
              type="button"
              onPointerDown={handleAwaken}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-gold-muted/45 bg-gold-muted/20 py-2.5 text-sm text-gold-bright"
              style={{ touchAction: 'none' }}
            >
              <Sparkles className="h-4 w-4" />
              {isTreeAnchor ? '确认锁定' : '确认唤醒'}
            </button>
          </div>
        </motion.div>
      </ModalOverlay>

      <AnimatePresence>
        {(phase === 'awakening' || phase === 'success') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pointer-events-none absolute inset-0 z-[60] overflow-hidden"
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0.8 }}
              animate={{ scale: 2.2, opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gold-bright/60 bg-gold-bright/10"
            />
            {Array.from({ length: 16 }).map((_, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 1, scale: 0, left: '50%', top: '50%' }}
                animate={{
                  opacity: 0,
                  scale: 1.6,
                  left: `${50 + Math.cos((i / 16) * Math.PI * 2) * 42}%`,
                  top: `${50 + Math.sin((i / 16) * Math.PI * 2) * 42}%`,
                }}
                transition={{ duration: 1, delay: i * 0.025 }}
                className="absolute h-2 w-2 rounded-full bg-gold-bright shadow-[0_0_10px_rgba(253,230,138,0.9)]"
              />
            ))}
            {phase === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute inset-x-4 bottom-28 text-center"
              >
                {isTreeAnchor ? (
                  <>
                    <p className="text-sm font-medium text-[#00F5FF]">灵脉锚定成功</p>
                    <p className="mx-auto mt-2 max-w-[18rem] text-[11px] leading-relaxed text-amber-200/90">
                      {TREE_ANCHOR_SUCCESS_MESSAGE}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-base font-medium text-glow-gold text-gold-bright">
                      灵纹对齐成功
                    </p>
                    <p className="mt-1 text-xs text-spirit">{QUEST_HINT[questType]}已唤醒</p>
                  </>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {showBackButton && <CameraBackButton onClick={handleClose} />}

      {phase === 'live' && !cameraError && (
        <div className="game-action-bar flex flex-col items-center px-6">
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onPointerDown={handleCapture}
            className="flex h-[68px] w-[68px] items-center justify-center rounded-full border-2 border-gold-bright bg-gold-muted/15 shadow-glow-lg"
            style={{ touchAction: 'none', WebkitTapHighlightColor: 'transparent' }}
          >
            <Camera className="h-8 w-8 text-gold-bright" />
          </motion.button>
          <p className="mt-3 text-center text-xs tracking-[0.35em] text-mist-muted">
            {isTreeAnchor ? '【 锁定灵脉 】' : '定格唤灵'}
          </p>
        </div>
      )}
    </div>
  )

  const lobbyStartLabel =
    startButtonLabel ??
    (questType === 'castle' ? '【 启动高维取景仪 】' : '【 启动取景 】')

  if (twoPhase && !isGaming) {
    return (
      <div className="castle-framing-lobby interactive-area relative mx-auto w-full max-w-md rounded-xl border border-violet-400/25 bg-void-950/90 p-5 shadow-[0_0_24px_rgba(167,139,250,0.1)]">
        {questName && (
          <p className="mb-3 text-center text-[10px] tracking-[0.25em] text-gold-muted">{questName}</p>
        )}

        <div className="mb-4 rounded-lg border border-violet-400/20 bg-violet-950/20 p-4">
          <p className="mb-1 text-[10px] font-medium tracking-wider text-violet-300/80">罗盘灵</p>
          {briefingText && (
            <p className="text-sm leading-relaxed text-mist">{briefingText}</p>
          )}
          {description && (
            <p className="mt-2 text-[11px] leading-relaxed text-mist-faint">{description}</p>
          )}
        </div>

        <ul className="mb-6 space-y-1.5 text-[11px] leading-relaxed text-mist-faint">
          <li>· 将取景框对准吉隆堡实景，与梦幻相框灵纹人工对齐</li>
          <li>· 湖面磁场干扰下，需精准框定城堡轮廓完成定格</li>
          <li>· 对齐满意后快门定格，即可收录虚实叠影</li>
        </ul>

        {sessionStartedRef.current && (
          <p className="mb-3 text-center text-[11px] text-violet-300/90">取景进行中，可继续上次会话</p>
        )}

        <button
          type="button"
          className="w-full rounded-xl border border-violet-400/50 bg-gradient-to-r from-violet-900/60 to-indigo-900/50 px-6 py-3.5 text-sm font-medium tracking-wide text-violet-100 shadow-[0_0_24px_rgba(167,139,250,0.25)] ring-1 ring-violet-400/30 active:scale-[0.98]"
          onClick={handleEnterBattle}
        >
          {lobbyStartLabel}
        </button>
      </div>
    )
  }

  const battleLayer = (
    <div
      className="fixed inset-0 z-50 flex h-[100dvh] w-full touch-none select-none flex-col overflow-hidden bg-slate-900"
      style={shellStyle}
    >
      <header
        className="z-20 flex h-16 shrink-0 items-center justify-between bg-slate-900/50 px-4 pb-2 backdrop-blur-sm"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 0px)' }}
      >
        <button
          type="button"
          className="rounded-lg border border-white/20 bg-black/40 px-3 py-1.5 text-xs text-white/85 active:scale-95"
          onClick={handleExitBattle}
        >
          ⏴ 退出
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[10px] tracking-wide text-violet-200/85">
            {hudStatusText ?? '取景中'}
          </span>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-300" />
          </span>
        </div>
      </header>

      <main className="relative flex w-full flex-1 items-center justify-center overflow-hidden">
        {viewfinder}
      </main>
    </div>
  )

  if (twoPhase && isGaming) {
    if (!portalReady) return null
    return createPortal(battleLayer, document.body)
  }

  return (
    <div className={shellClass} style={shellStyle}>
      {viewfinder}
    </div>
  )
}

export default AlignCamera
