import { AnimatePresence, motion } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
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

export type QuestType = 'tree' | 'bagua' | 'castle'

interface ArCameraOverlayProps {
  /** 决定上层 AR 线框样式 */
  questType: QuestType
  /** 合成成功并确认后返回 JPEG Base64 */
  onSuccess?: (base64Data: string) => void
  /** 摄像头启动失败 */
  onError?: (message: string) => void
  /** 可选快门音效 URL */
  shutterAudioUrl?: string
  /** 取消取景：释放摄像头后回调 */
  onCancel?: () => void
  /** 关闭 / 返回 */
  onClose?: () => void
}

type Phase = 'prompt' | 'loading' | 'live' | 'frozen' | 'compositing' | 'success'

const OVERLAY_STROKE = 'rgba(94, 236, 196, 0.72)'
const OVERLAY_GLOW = 'rgba(45, 212, 168, 0.35)'

/** 全息古榕树灵纹线框 */
function TreeOverlay({ className }: { className?: string }) {
  const stroke = '#00F5FF'

  return (
    <div
      className={`pointer-events-none flex h-full w-full flex-col items-center justify-center ${className ?? ''}`}
    >
      <div className="relative mx-auto aspect-square w-full max-w-sm">
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
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

          <g filter="drop-shadow(0 0 6px rgba(0, 245, 255, 0.8))">
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
            fill="rgba(232,197,71,0.55)"
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

/** 乾坤八卦同心圆线框 */
function BaguaOverlay({ className }: { className?: string }) {
  const trigrams = [
    { cx: 160, cy: 48, lines: [1, 1, 1] },
    { cx: 252, cy: 88, lines: [1, 0, 1] },
    { cx: 292, cy: 160, lines: [0, 1, 0] },
    { cx: 252, cy: 232, lines: [1, 1, 0] },
    { cx: 160, cy: 272, lines: [0, 0, 0] },
    { cx: 68, cy: 232, lines: [0, 1, 1] },
    { cx: 28, cy: 160, lines: [1, 0, 0] },
    { cx: 68, cy: 88, lines: [0, 0, 1] },
  ]

  return (
    <svg
      viewBox="0 0 320 320"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="160" cy="160" r="148" stroke={OVERLAY_STROKE} strokeWidth="2" />
      <circle cx="160" cy="160" r="118" stroke="rgba(232,197,71,0.45)" strokeWidth="1.5" />
      <circle cx="160" cy="160" r="88" stroke={OVERLAY_STROKE} strokeWidth="1" strokeDasharray="4 6" />
      <circle cx="160" cy="160" r="38" stroke="rgba(94,236,196,0.5)" strokeWidth="2" fill={OVERLAY_GLOW} />
      <path
        d="M160 12 L160 308 M12 160 L308 160 M52 52 L268 268 M268 52 L52 268"
        stroke="rgba(232,197,71,0.3)"
        strokeWidth="1"
      />
      {trigrams.map((t, i) => (
        <g key={i} transform={`translate(${t.cx - 160}, ${t.cy - 160})`}>
          {t.lines.map((solid, li) => (
            <line
              key={li}
              x1={160 - 14}
              y1={160 - 8 + li * 8}
              x2={160 + 14}
              y2={160 - 8 + li * 8}
              stroke={solid ? OVERLAY_STROKE : 'transparent'}
              strokeWidth="2.5"
            />
          ))}
          {!t.lines[1] && (
            <>
              <line x1={152} y1={160} x2={160} y2={160} stroke={OVERLAY_STROKE} strokeWidth="2.5" />
              <line x1={168} y1={160} x2={176} y2={160} stroke={OVERLAY_STROKE} strokeWidth="2.5" />
            </>
          )}
        </g>
      ))}
      <text x="160" y="300" textAnchor="middle" fill="rgba(232,197,71,0.55)" fontSize="11" letterSpacing="4">
        对齐八卦阵眼
      </text>
    </svg>
  )
}

/** 城堡几何线条组合 */
function CastleOverlay({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 360"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M40 280 L40 180 L70 180 L70 140 L90 140 L90 180 L120 180 L120 120 L140 120 L140 180
           L180 180 L180 100 L200 100 L200 180 L240 180 L240 130 L260 130 L260 180 L280 180 L280 280 Z"
        stroke={OVERLAY_STROKE}
        strokeWidth="2"
        fill={OVERLAY_GLOW}
      />
      <path
        d="M70 140 L70 110 L90 110 L90 140 M120 120 L120 85 L140 85 L140 120
           M180 100 L180 65 L200 65 L200 100 M240 130 L240 95 L260 95 L260 130"
        stroke={OVERLAY_STROKE}
        strokeWidth="1.5"
      />
      <rect x="150" y="210" width="36" height="70" stroke="rgba(232,197,71,0.5)" strokeWidth="1.5" />
      <path d="M60 280 L260 280" stroke="rgba(232,197,71,0.35)" strokeWidth="1" />
      <path
        d="M20 280 L300 280 M160 280 L160 320"
        stroke="rgba(94,236,196,0.4)"
        strokeWidth="1"
        strokeDasharray="5 7"
      />
      <text x="160" y="340" textAnchor="middle" fill="rgba(232,197,71,0.55)" fontSize="11" letterSpacing="4">
        对齐城堡轮廓
      </text>
    </svg>
  )
}

function QuestOverlay({ questType, className }: { questType: QuestType; className?: string }) {
  switch (questType) {
    case 'tree':
      return <TreeOverlay className={className} />
    case 'bagua':
      return <BaguaOverlay className={className} />
    case 'castle':
      return <CastleOverlay className={className} />
  }
}

/** 短促快门咔嗒音（Web Audio） */
function playShutterClick(ctx: AudioContext) {
  const now = ctx.currentTime
  const bufferSize = ctx.sampleRate * 0.06
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.012))
  }
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.55, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
  src.connect(gain)
  gain.connect(ctx.destination)
  src.start(now)
}

/** 将 SVG 元素 rasterize 为 Image，供 Canvas 绘制 */
async function svgElementToImage(svg: SVGSVGElement, width: number, height: number): Promise<HTMLImageElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  const serialized = new XMLSerializer().serializeToString(clone)
  const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('SVG rasterize failed'))
    }
    img.src = url
  })
}

/**
 * object-cover 裁剪：计算视频源裁剪区域，使绘制结果与屏幕所见一致
 */
function computeCoverCrop(
  videoW: number,
  videoH: number,
  viewW: number,
  viewH: number,
) {
  const viewAspect = viewW / viewH
  const videoAspect = videoW / videoH
  if (videoAspect > viewAspect) {
    const sh = videoH
    const sw = videoH * viewAspect
    return { sx: (videoW - sw) / 2, sy: 0, sw, sh }
  }
  const sw = videoW
  const sh = videoW / viewAspect
  return { sx: 0, sy: (videoH - sh) / 2, sw, sh }
}

export function ArCameraOverlay({
  questType,
  onSuccess,
  onError,
  shutterAudioUrl,
  onCancel,
  onClose,
}: ArCameraOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const overlayWrapRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const [phase, setPhase] = useState<Phase>('prompt')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [flash, setFlash] = useState(false)
  const [particles, setParticles] = useState(false)

  const stopStream = useCallback(() => {
    stopMediaStream(streamRef.current)
    streamRef.current = null
  }, [])

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

  const handleClose = useCallback(() => {
    stopStream()
    const dismiss = onCancel ?? onClose
    dismiss?.()
  }, [onCancel, onClose, stopStream])

  const playShutter = useCallback(async () => {
    if (shutterAudioUrl) {
      const audio = new Audio(shutterAudioUrl)
      audio.volume = 0.7
      void audio.play().catch(() => {})
      return
    }
    if (!audioCtxRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (Ctx) audioCtxRef.current = new Ctx()
    }
    const ctx = audioCtxRef.current
    if (!ctx) return
    if (ctx.state === 'suspended') await ctx.resume()
    playShutterClick(ctx)
  }, [shutterAudioUrl])

  /** 定格唤灵：闪白 + 快门 + 暂停 */
  const handleCapture = useCallback(
    async (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.preventDefault()
      if (phase !== 'live' || cameraError) return

      const video = videoRef.current
      if (!video) return

      setFlash(true)
      void playShutter()
      video.pause()
      setPhase('frozen')
      setShowConfirm(true)

      window.setTimeout(() => setFlash(false), 180)
    },
    [phase, cameraError, playShutter],
  )

  /** Canvas 合成：视频帧 + 复古滤镜 + SVG 线框 + FOWORLD 水印 */
  const compositePhoto = useCallback(async (): Promise<string | null> => {
    const video = videoRef.current
    const viewport = viewportRef.current
    const svgHost = overlayWrapRef.current?.querySelector('svg')
    if (!video || !viewport || !svgHost) return null

    const vw = video.videoWidth
    const vh = video.videoHeight
    if (!vw || !vh) return null

    const canvas = document.createElement('canvas')
    canvas.width = vw
    canvas.height = vh
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const viewRect = viewport.getBoundingClientRect()
    const crop = computeCoverCrop(vw, vh, viewRect.width, viewRect.height)

    ctx.filter = 'sepia(0.22) contrast(1.08) saturate(1.05) brightness(0.96)'
    ctx.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, vw, vh)
    ctx.filter = 'none'

    const overlaySize = Math.min(vw, vh) * 0.88
    const ox = (vw - overlaySize) / 2
    const oy = (vh - overlaySize) / 2
    try {
      const overlayImg = await svgElementToImage(svgHost, overlaySize, overlaySize)
      ctx.drawImage(overlayImg, ox, oy, overlaySize, overlaySize)
    } catch {
      /* 线框绘制失败时仍导出底图 */
    }

    const pad = Math.round(vw * 0.04)
    ctx.save()
    ctx.font = `600 ${Math.round(vw * 0.035)}px PingFang SC, sans-serif`
    ctx.fillStyle = 'rgba(232, 197, 71, 0.88)'
    ctx.strokeStyle = 'rgba(7, 18, 24, 0.65)'
    ctx.lineWidth = 3
    const watermark = 'FOWORLD · 寻灵记'
    ctx.strokeText(watermark, pad, vh - pad)
    ctx.fillText(watermark, pad, vh - pad)

    ctx.font = `400 ${Math.round(vw * 0.022)}px PingFang SC, sans-serif`
    ctx.fillStyle = 'rgba(148, 184, 200, 0.85)'
    const sub = `框景 · ${questType.toUpperCase()} · ${new Date().toLocaleDateString('zh-CN')}`
    ctx.fillText(sub, pad, vh - pad - Math.round(vw * 0.045))
    ctx.restore()

    return canvas.toDataURL('image/jpeg', 0.9)
  }, [questType])

  const handleConfirm = useCallback(async () => {
    setShowConfirm(false)
    setPhase('compositing')
    setParticles(true)

    const base64 = await compositePhoto()

    window.setTimeout(() => {
      setPhase('success')
      if (base64) onSuccess?.(base64)
    }, 1200)
  }, [compositePhoto, onSuccess])

  const handleRetake = useCallback(() => {
    setShowConfirm(false)
    const video = videoRef.current
    if (video) {
      void video.play()
    }
    setPhase('live')
  }, [])

  const questLabel =
    questType === 'tree' ? '树王' : questType === 'bagua' ? '八卦' : '城堡'

  return (
    <div
      className="game-container flex items-center justify-center bg-black"
      style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* 9:16 安全取景区 */}
      <div
        ref={viewportRef}
        className="ar-viewfinder relative h-full w-full max-w-[calc(100dvh*9/16)] overflow-hidden bg-black"
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

        {/* AR SVG 线框叠加 */}
        {!cameraError && phase !== 'loading' && (
          <div
            ref={overlayWrapRef}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="relative h-[88%] w-[88%]"
            >
              <QuestOverlay questType={questType} className="h-full w-full drop-shadow-[0_0_14px_rgba(45,212,168,0.35)]" />
              <div className="scan-sweep-track">
                <div className="scan-sweep-line" style={{ animationDuration: '3.5s' }}>
                  <div className="scan-sweep-line__bar bg-gradient-to-r from-transparent via-jade-bright/50 to-transparent" />
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* 加载 */}
        {phase === 'loading' && !cameraError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-void-900/90">
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
            onCancel={handleClose}
          />
        )}

        {/* 快门闪白 */}
        <AnimatePresence>
          {flash && (
            <motion.div
              initial={{ opacity: 0.95 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="pointer-events-none absolute inset-0 z-40 bg-white"
            />
          )}
        </AnimatePresence>

        <ModalOverlay open={showConfirm}>
          <motion.div
            initial={{ y: 12, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 8, opacity: 0 }}
            className="w-full max-w-sm rounded-2xl border border-gold-muted/25 bg-void-900/92 p-5 shadow-glow-lg backdrop-blur-md"
          >
            <p className="mb-1 text-center text-sm font-medium text-mist">框景对齐是否满意？</p>
            <p className="mb-5 text-center text-xs text-mist-muted">
              {questLabel}灵纹线框 · 确认后将合成唤灵影像
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault()
                  handleRetake()
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-mist-faint/25 py-2.5 text-sm text-mist-muted active:bg-void-800"
              >
                <RefreshCw className="h-4 w-4" />
                重拍
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault()
                  void handleConfirm()
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-gold-muted/40 bg-gold-muted/20 py-2.5 text-sm text-gold-bright active:bg-gold-muted/35"
              >
                <Sparkles className="h-4 w-4" />
                确认唤灵
              </button>
            </div>
          </motion.div>
        </ModalOverlay>

        {/* 成功粒子 / 金光扫过 */}
        <AnimatePresence>
          {(particles || phase === 'success') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pointer-events-none absolute inset-0 z-[60] overflow-hidden"
            >
              <motion.div
                initial={{ x: '-120%' }}
                animate={{ x: '120%' }}
                transition={{ duration: 1.1, ease: 'easeInOut' }}
                className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-gold-bright/35 to-transparent skew-x-12"
              />
              {Array.from({ length: 18 }).map((_, i) => (
                <motion.span
                  key={i}
                  initial={{
                    opacity: 1,
                    scale: 0,
                    x: '50%',
                    y: '50%',
                  }}
                  animate={{
                    opacity: 0,
                    scale: 1.8,
                    x: `${50 + Math.cos((i / 18) * Math.PI * 2) * 45}%`,
                    y: `${50 + Math.sin((i / 18) * Math.PI * 2) * 45}%`,
                  }}
                  transition={{ duration: 1, delay: i * 0.03 }}
                  className="absolute h-2 w-2 rounded-full bg-gold-bright shadow-[0_0_8px_rgba(245,224,106,0.8)]"
                />
              ))}
              {phase === 'success' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 flex flex-col items-center justify-center"
                >
                  <Sparkles className="mb-3 h-14 w-14 text-gold-bright drop-shadow-[0_0_20px_rgba(245,224,106,0.65)]" />
                  <p className="text-lg font-medium text-glow-gold text-gold-bright">夜郎能量充能成功</p>
                  <p className="mt-1 text-sm text-spirit">框景影像已封存</p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <CameraBackButton onClick={handleClose} />

        {/* 底部定格按钮 */}
        {phase === 'live' && !cameraError && (
          <div className="game-action-bar flex flex-col items-center px-6">
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onPointerDown={handleCapture}
              className="mx-auto flex h-[68px] w-[68px] items-center justify-center rounded-full border-2 border-gold-bright bg-gold-muted/15 shadow-glow-lg backdrop-blur-sm"
              style={{ touchAction: 'none', WebkitTapHighlightColor: 'transparent' }}
            >
              <Camera className="h-8 w-8 text-gold-bright" />
            </motion.button>
            <p className="mt-3 text-center text-xs tracking-[0.35em] text-mist-muted">定格唤灵</p>
          </div>
        )}
      </div>
    </div>
  )
}
