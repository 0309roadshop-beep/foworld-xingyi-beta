import { AnimatePresence, motion } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Crosshair, Package, RefreshCw, ScanLine, Sparkles, X } from 'lucide-react'
import { CameraBackButton } from '../camera/CameraBackButton'
import { CameraPermissionGate } from '../camera/CameraPermissionGate'
import { ModalOverlay } from '../ui/ModalOverlay'
import {
  bindStreamToVideo,
  describeCameraError,
  getCameraSupport,
  openCameraStream,
  stopMediaStream,
} from '../../utils/cameraAccess'

// ─── 玩法常量 ───────────────────────────────────────────────
const TARGET_POWER = 500
const MAX_SCANS = 15
/** 解码等待最短时长（配合 AI 接口 RTT） */
const DECODE_MS = 2600

// ─── 品质与鉴宝结果类型 ─────────────────────────────────────
export type ScanLevel = 'legendary' | 'rare' | 'common' | 'junk'

export type ScanLevelLabel = '极品' | '稀有' | '普通' | '废品'

/** 单次 AI 鉴宝返回（含灵力结算字段） */
export interface ScanResult {
  level: ScanLevel
  levelLabel: ScanLevelLabel
  purity: number
  powerGain: number
  message: string
  accent: string
  glow: string
}

/** 灵韵收容匣 · 战利品记录 */
export interface ScannedItem {
  id: string
  imageBase64: string
  purity: number
  level: ScanLevel
  levelLabel: ScanLevelLabel
  timestamp: number
}

type GamePhase = 'idle' | 'decoding' | 'reveal'
type EndState = null | 'success' | 'exhausted'

const LEVEL_STYLES: Record<
  ScanLevel,
  { label: ScanLevelLabel; accent: string; glow: string; powerGain: number; message: string }
> = {
  legendary: {
    label: '极品',
    accent: '#FFD700',
    glow: 'rgba(255, 215, 0, 0.45)',
    powerGain: 100,
    message: '识别到百年地脉锚点，烟火气纯度极高！',
  },
  rare: {
    label: '稀有',
    accent: '#FF8C42',
    glow: 'rgba(255, 140, 66, 0.4)',
    powerGain: 50,
    message: '提取到高热量碳水与人间温度，降核共鸣上升。',
  },
  common: {
    label: '普通',
    accent: '#00F5FF',
    glow: 'rgba(0, 245, 255, 0.35)',
    powerGain: 20,
    message: '基础现世物质，含微量生活气息。',
  },
  junk: {
    label: '废品',
    accent: '#6B7280',
    glow: 'rgba(107, 114, 128, 0.25)',
    powerGain: 5,
    message: '冰冷的现代工业产物，纯度极低。',
  },
}

// ─── 截帧与确定性指纹 ───────────────────────────────────────

/** 对 Base64 采样哈希 — 同一画面截帧 → 同一指纹 */
function hashBase64Fingerprint(base64: string): number {
  const head = base64.slice(0, 128)
  const mid = base64.slice(Math.floor(base64.length / 2), Math.floor(base64.length / 2) + 128)
  const tail = base64.slice(-128)
  const sample = `${base64.length}:${head}:${mid}:${tail}`
  let hash = 2166136261
  for (let i = 0; i < sample.length; i++) {
    hash ^= sample.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** 从 video 当前帧截取 JPEG Base64（quality 0.7） */
function captureVideoFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): string | null {
  const w = video.videoWidth
  const h = video.videoHeight
  if (!w || !h) return null

  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.drawImage(video, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', 0.7)
}

/** 摄像头未就绪时的占位截帧（仍走确定性鉴宝） */
function capturePlaceholderFrame(canvas: HTMLCanvasElement): string {
  canvas.width = 720
  canvas.height = 960
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  ctx.fillStyle = '#0B131A'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.strokeStyle = 'rgba(0, 245, 255, 0.08)'
  ctx.lineWidth = 1
  for (let y = 0; y < canvas.height; y += 28) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(canvas.width, y)
    ctx.stroke()
  }
  for (let x = 0; x < canvas.width; x += 28) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, canvas.height)
    ctx.stroke()
  }

  ctx.font = '14px monospace'
  ctx.fillStyle = 'rgba(0, 245, 255, 0.35)'
  ctx.fillText('[ NO-SIGNAL PLACEHOLDER ]', 24, 48)

  return canvas.toDataURL('image/jpeg', 0.7)
}

/** 内测期：由指纹确定性映射品质与纯度（非 Math.random） */
function deterministicResultFromFingerprint(fingerprint: number): ScanResult {
  const roll = fingerprint % 100
  let level: ScanLevel
  let purityMin: number
  let purityMax: number

  if (roll < 10) {
    level = 'legendary'
    purityMin = 90
    purityMax = 100
  } else if (roll < 30) {
    level = 'rare'
    purityMin = 70
    purityMax = 89
  } else if (roll < 70) {
    level = 'common'
    purityMin = 30
    purityMax = 69
  } else {
    level = 'junk'
    purityMin = 1
    purityMax = 29
  }

  const span = purityMax - purityMin + 1
  const purity = purityMin + ((fingerprint >>> 8) % span)
  const meta = LEVEL_STYLES[level]

  return {
    level,
    levelLabel: meta.label,
    purity,
    powerGain: meta.powerGain,
    message: meta.message,
    accent: meta.accent,
    glow: meta.glow,
  }
}

/**
 * 鉴宝核心 — 传入截帧 Base64，返回品质与纯度
 * 后期在此接入真实视觉大模型
 */
export async function analyzeImageWithAI(base64Image: string): Promise<ScanResult> {
  // TODO: 替换为真实的通义千问VL或GPT-4o-mini接口请求
  //
  // const response = await fetch('/api/vision/analyze-relic', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     Authorization: `Bearer ${import.meta.env.VITE_VISION_API_KEY}`,
  //   },
  //   body: JSON.stringify({ image: base64Image }),
  // })
  // if (!response.ok) throw new Error('视觉鉴宝接口异常')
  // const data = await response.json()
  // return mapVisionApiToScanResult(data)

  await new Promise((resolve) => window.setTimeout(resolve, 320))

  const fingerprint = hashBase64Fingerprint(base64Image)
  return deterministicResultFromFingerprint(fingerprint)
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ─── 子组件：灵韵收容匣入口 ───────────────────────────────────

function InventoryFab({
  count,
  max,
  onClick,
}: {
  count: number
  max: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onPointerDown={(e: ReactPointerEvent<HTMLButtonElement>) => {
        e.preventDefault()
        onClick()
      }}
      className="absolute bottom-36 right-4 z-[55] flex h-14 w-14 items-center justify-center transition-transform duration-200 active:scale-95"
      style={{ touchAction: 'manipulation' }}
      aria-label="打开灵韵收容匣"
    >
      <svg viewBox="0 0 56 56" className="absolute inset-0 h-full w-full" aria-hidden>
        <polygon
          points="28,4 50,16 50,40 28,52 6,40 6,16"
          fill="rgba(11,19,26,0.82)"
          stroke="rgba(0,245,255,0.45)"
          strokeWidth="1.5"
        />
      </svg>
      <Package className="relative h-5 w-5 text-[#00F5FF]" />
      <span
        className="absolute -right-1 -top-1 min-w-[1.35rem] rounded-full border px-1 py-0.5 text-center font-mono text-[9px] leading-none"
        style={{
          borderColor: 'rgba(0,245,255,0.5)',
          background: 'rgba(11,19,26,0.95)',
          color: '#00F5FF',
        }}
      >
        {count}/{max}
      </span>
    </button>
  )
}

// ─── 子组件：半屏抽屉 ───────────────────────────────────────

function InventoryDrawer({
  open,
  items,
  onClose,
}: {
  open: boolean
  items: ScannedItem[]
  onClose: () => void
}) {
  return (
    <>
      {/* 遮罩 — Tailwind opacity 过渡，不卸载 video */}
      <div
        className={`fixed inset-0 z-[180] bg-black/45 transition-opacity duration-300 ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onPointerDown={onClose}
        aria-hidden={!open}
      />

      <div
        className={`fixed inset-x-0 bottom-0 z-[190] flex max-h-[70vh] min-h-[60vh] flex-col rounded-t-2xl border border-cyan-500/30 backdrop-blur-xl transition-transform duration-300 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ background: 'rgba(11, 19, 26, 0.82)' }}
        role="dialog"
        aria-modal={open}
        aria-hidden={!open}
        aria-label="灵韵收容匣"
      >
        {/* 下拉把手 */}
        <button
          type="button"
          onPointerDown={(e: ReactPointerEvent<HTMLButtonElement>) => {
            e.preventDefault()
            onClose()
          }}
          className="flex w-full shrink-0 flex-col items-center pb-2 pt-3"
          aria-label="关闭收容匣"
        >
          <span className="mb-2 h-1 w-10 rounded-full bg-white/25" />
          <div className="flex w-full items-center justify-between px-5">
            <p className="font-mono text-xs tracking-[0.3em] text-[#00F5FF]/90">灵韵收容匣</p>
            <span className="font-mono text-[10px] text-white/40">{items.length} 件战利品</span>
          </div>
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-none px-4 pb-8 pt-2 scrollbar-none">
          {items.length === 0 ? (
            <p className="py-16 text-center font-mono text-[11px] text-white/30">
              [ 匣中空无一物 · 对准现世之物提取灵韵 ]
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {items.map((item) => {
                const meta = LEVEL_STYLES[item.level]
                return (
                  <article
                    key={item.id}
                    className="relative aspect-[3/4] overflow-hidden rounded-lg border border-cyan-500/20"
                  >
                    <img
                      src={item.imageBase64}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                      draggable={false}
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(to top, ${meta.accent}33 0%, rgba(11,19,26,0.15) 45%, rgba(0,245,255,0.08) 100%)`,
                      }}
                    />
                    <p
                      className="absolute inset-x-0 bottom-0 px-2 py-2 text-center font-mono text-[10px] tracking-wide backdrop-blur-md"
                      style={{ color: meta.accent }}
                    >
                      {item.purity}% {item.levelLabel}
                    </p>
                  </article>
                )
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onPointerDown={(e: ReactPointerEvent<HTMLButtonElement>) => {
            e.preventDefault()
            onClose()
          }}
          className="absolute right-4 top-3 rounded-full border border-white/10 p-1.5 text-white/50 backdrop-blur-md"
          aria-label="关闭"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </>
  )
}

// ─── 主组件 ─────────────────────────────────────────────────

export interface RedDustScannerProps {
  onComplete?: () => void
  onCancel?: () => void
}

/**
 * 街心花园 · 红尘摸金 — AR 灵视扫描 + 灵韵收容匣
 */
export function RedDustScanner({ onComplete, onCancel }: RedDustScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const revealTimerRef = useRef<number | null>(null)

  const [cameraReady, setCameraReady] = useState(false)
  const [cameraLoading, setCameraLoading] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [needsPermission, setNeedsPermission] = useState(true)
  const [usePlaceholder, setUsePlaceholder] = useState(false)

  const [scansLeft, setScansLeft] = useState(MAX_SCANS)
  const [currentPower, setCurrentPower] = useState(0)
  const [phase, setPhase] = useState<GamePhase>('idle')
  const [lastResult, setLastResult] = useState<ScanResult | null>(null)
  const [endState, setEndState] = useState<EndState>(null)
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)

  const powerPercent = Math.min(100, Math.round((currentPower / TARGET_POWER) * 100))
  const isLocked = phase !== 'idle' || endState !== null

  const stopStream = useCallback(() => {
    stopMediaStream(streamRef.current)
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraReady(false)
  }, [])

  const bindActiveStream = useCallback(async () => {
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return false
    try {
      await bindStreamToVideo(video, stream)
      setCameraReady(true)
      setUsePlaceholder(false)
      return true
    } catch {
      return false
    }
  }, [])

  const startCamera = useCallback(async () => {
    stopStream()
    setCameraError(null)
    setNeedsPermission(false)
    setUsePlaceholder(false)

    const support = getCameraSupport()
    if (!support.ok) {
      const msg = support.hint ? `${support.message}（${support.hint}）` : support.message
      setCameraError(msg)
      setNeedsPermission(true)
      setUsePlaceholder(true)
      return
    }

    setCameraLoading(true)
    try {
      const stream = await openCameraStream(true)
      streamRef.current = stream
      const bound = await bindActiveStream()
      if (!bound) {
        stopStream()
        setCameraError('摄像头画面绑定失败')
        setUsePlaceholder(true)
      }
    } catch (err) {
      setCameraError(describeCameraError(err))
      setNeedsPermission(true)
      setUsePlaceholder(true)
    } finally {
      setCameraLoading(false)
    }
  }, [stopStream, bindActiveStream])

  const clearRevealTimer = useCallback(() => {
    if (revealTimerRef.current != null) {
      window.clearTimeout(revealTimerRef.current)
      revealTimerRef.current = null
    }
  }, [])

  const resetGame = useCallback(() => {
    clearRevealTimer()
    setScansLeft(MAX_SCANS)
    setCurrentPower(0)
    setPhase('idle')
    setLastResult(null)
    setEndState(null)
    setScannedItems([])
    setDrawerOpen(false)
    void startCamera()
  }, [clearRevealTimer, startCamera])

  const handleCancel = useCallback(() => {
    clearRevealTimer()
    stopStream()
    onCancel?.()
  }, [clearRevealTimer, stopStream, onCancel])

  const finishScan = useCallback(
    (result: ScanResult, item: ScannedItem, nextPower: number, nextScans: number) => {
      setScannedItems((prev) => [...prev, item])
      setLastResult(result)
      setCurrentPower(nextPower)
      setScansLeft(nextScans)
      setPhase('reveal')

      revealTimerRef.current = window.setTimeout(() => {
        setPhase('idle')
        setLastResult(null)
        if (nextPower >= TARGET_POWER) {
          setEndState('success')
          return
        }
        if (nextScans <= 0) {
          setEndState('exhausted')
        }
      }, 2200)
    },
    [],
  )

  /** 提取灵韵：截帧 → AI 鉴宝 → 入库 */
  const handleExtract = useCallback(async () => {
    if (isLocked || scansLeft <= 0 || drawerOpen) return

    const canvas = canvasRef.current
    if (!canvas) return

    setPhase('decoding')
    setLastResult(null)

    const video = videoRef.current
    let base64 =
      video && cameraReady ? captureVideoFrame(video, canvas) : null
    if (!base64) {
      base64 = capturePlaceholderFrame(canvas)
    }
    if (!base64) {
      setPhase('idle')
      return
    }

    const decodeStart = Date.now()
    try {
      const result = await analyzeImageWithAI(base64)
      const elapsed = Date.now() - decodeStart
      const waitMore = Math.max(0, DECODE_MS - elapsed)
      if (waitMore > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, waitMore))
      }

      const item: ScannedItem = {
        id: uid('relic'),
        imageBase64: base64,
        purity: result.purity,
        level: result.level,
        levelLabel: result.levelLabel,
        timestamp: Date.now(),
      }

      finishScan(result, item, currentPower + result.powerGain, scansLeft - 1)
    } catch (err) {
      console.error('[RedDustScanner] analyze failed', err)
      setPhase('idle')
    }
  }, [isLocked, scansLeft, drawerOpen, cameraReady, currentPower, finishScan])

  useEffect(() => {
    void startCamera()
    return () => {
      clearRevealTimer()
      stopStream()
    }
  }, [startCamera, clearRevealTimer, stopStream])

  useEffect(() => {
    if (needsPermission || cameraReady || !streamRef.current) return
    void bindActiveStream()
  }, [needsPermission, cameraReady, bindActiveStream])

  return (
    <>
      <style>{`
        @keyframes rd-scan-sweep {
          0% { transform: translate3d(0, -6%, 0); }
          100% { transform: translate3d(0, 106%, 0); }
        }
        @keyframes rd-corner-breathe {
          0%, 100% { transform: scale(1); opacity: 0.72; }
          50% { transform: scale(1.14); opacity: 1; }
        }
        @keyframes rd-decode-blink {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 1; }
        }
        @keyframes rd-decode-cursor {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @keyframes rd-placeholder-grid {
          0% { background-position: 0 0; }
          100% { background-position: 0 40px; }
        }
        .rd-scan-line {
          animation: rd-scan-sweep 3.6s linear infinite;
          will-change: transform;
          transform: translate3d(0, 0, 0);
          backface-visibility: hidden;
        }
        .rd-corner {
          animation: rd-corner-breathe 2.8s ease-in-out infinite;
          will-change: transform, opacity;
          transform-origin: center;
          backface-visibility: hidden;
        }
        .rd-corner--tl { animation-delay: 0s; }
        .rd-corner--tr { animation-delay: 0.4s; }
        .rd-corner--bl { animation-delay: 0.8s; }
        .rd-corner--br { animation-delay: 1.2s; }
        .rd-decode-text { animation: rd-decode-blink 1.6s ease-in-out infinite; }
        .rd-decode-cursor::after {
          content: '_';
          animation: rd-decode-cursor 0.9s step-end infinite;
          color: #00F5FF;
        }
        .rd-placeholder-bg {
          background-color: #0B131A;
          background-image:
            linear-gradient(rgba(0, 245, 255, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 245, 255, 0.04) 1px, transparent 1px);
          background-size: 28px 28px;
          animation: rd-placeholder-grid 4s linear infinite;
        }
      `}</style>

      {/* 隐藏截帧画布 — 不参与布局 */}
      <canvas ref={canvasRef} className="hidden" aria-hidden />

      <div
        className="ar-screen game-container overflow-hidden bg-slate-900"
        style={{
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          backgroundColor: '#0B131A',
        }}
      >
        <div className="ar-viewfinder relative h-full w-full overflow-hidden">
          {/* video 常驻，抽屉打开时不卸载 */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              opacity: cameraReady && !usePlaceholder ? 1 : 0,
              transition: 'opacity 0.35s ease',
            }}
          />

          {(usePlaceholder || !cameraReady) && (
            <div className="rd-placeholder-bg absolute inset-0">
              <div className="scan-sweep-track">
                <div className="rd-scan-line absolute inset-x-[10%] top-0 bottom-0">
                  <div
                    className="absolute left-0 right-0 top-0 h-px"
                    style={{
                      background:
                        'linear-gradient(90deg, transparent, rgba(0,245,255,0.85), transparent)',
                      boxShadow: '0 0 18px rgba(0,245,255,0.55)',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {cameraLoading && (
            <div
              className="absolute inset-0 z-20 flex items-center justify-center backdrop-blur-md"
              style={{ background: 'rgba(11, 19, 26, 0.92)' }}
            >
              <div className="flex flex-col items-center gap-3">
                <div
                  className="h-9 w-9 animate-spin rounded-full border-2 border-t-transparent"
                  style={{ borderColor: 'rgba(0,245,255,0.25)', borderTopColor: '#00F5FF' }}
                />
                <p className="font-mono text-[11px] tracking-widest text-[#00F5FF]/80">
                  [ 灵视模块初始化... ]
                </p>
              </div>
            </div>
          )}

          {(needsPermission || cameraError) && !cameraLoading && (
            <div className="absolute inset-0 z-30 flex items-center justify-center p-6">
              <CameraPermissionGate
                error={cameraError}
                loading={cameraLoading}
                title="开启【灵视】取景"
                onEnable={() => void startCamera()}
                onCancel={() => setUsePlaceholder(true)}
              />
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="scan-sweep-track">
              <div className="rd-scan-line absolute inset-x-0 top-0 bottom-0">
                <div
                  className="absolute left-[6%] right-[6%] top-0 h-px"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent, rgba(0,245,255,0.55), transparent)',
                    boxShadow: '0 0 14px rgba(0,245,255,0.35)',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-10">
            <div className="relative h-[min(58vw,280px)] w-[min(78vw,340px)]">
              <span className="rd-corner rd-corner--tl absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-cyan-500/80" />
              <span className="rd-corner rd-corner--tr absolute right-0 top-0 h-8 w-8 border-r-2 border-t-2 border-cyan-500/80" />
              <span className="rd-corner rd-corner--bl absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-cyan-500/80" />
              <span className="rd-corner rd-corner--br absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-cyan-500/80" />
              <div
                className="absolute inset-0 rounded-sm"
                style={{ boxShadow: 'inset 0 0 40px rgba(0,245,255,0.06)' }}
              />
            </div>
          </div>

          {/* HUD */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 px-4 pb-10 pt-4"
            style={{
              background: 'linear-gradient(to bottom, rgba(11,19,26,0.88) 0%, transparent 100%)',
            }}
          >
            <p className="text-center font-mono text-[10px] tracking-[0.35em] text-[#00F5FF]/90">
              FOWORLD · 视觉保护翻译器
            </p>
            <p className="mt-1 text-center text-[11px] tracking-widest text-white/55">
              【灵视】街心花园 · 红尘摸金
            </p>

            <div className="mx-auto mt-4 max-w-sm space-y-2.5">
              <div className="flex items-center justify-between font-mono text-[10px] text-white/50">
                <span>降核充能</span>
                <span className="text-[#00F5FF]">
                  {currentPower}
                  <span className="text-white/30"> / </span>
                  {TARGET_POWER}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-cyan-500/10">
                <div
                  className="h-full rounded-full transition-[width] duration-500 ease-out"
                  style={{
                    width: `${powerPercent}%`,
                    background:
                      currentPower >= TARGET_POWER
                        ? 'linear-gradient(90deg, #FFD700, #FFF4A8)'
                        : 'linear-gradient(90deg, rgba(0,245,255,0.5), #00F5FF)',
                    boxShadow:
                      currentPower >= TARGET_POWER
                        ? '0 0 12px rgba(255,215,0,0.6)'
                        : '0 0 10px rgba(0,245,255,0.35)',
                  }}
                />
              </div>
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span className="text-white/40">快门余量</span>
                <span className="text-white/70">
                  {scansLeft}
                  <span className="text-white/25"> / </span>
                  {MAX_SCANS}
                </span>
              </div>
            </div>
          </div>

          {/* 解码层 */}
          <div
            className={`absolute inset-0 z-40 flex flex-col items-center justify-center px-8 transition-opacity duration-300 ${
              phase === 'decoding' ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
            }`}
            style={{ background: 'rgba(11, 19, 26, 0.78)' }}
          >
            <div
              className="mb-6 h-16 w-16 rounded-full border border-cyan-500/30 backdrop-blur-md"
              style={{ boxShadow: 'inset 0 0 24px rgba(0,245,255,0.12)' }}
            >
              <div className="scan-sweep-track h-full w-full rounded-full">
                <div className="scan-sweep-line scan-sweep-line--tight">
                  <div className="scan-sweep-line__bar bg-[#00F5FF]/70 shadow-[0_0_10px_rgba(0,245,255,0.6)]" />
                </div>
              </div>
            </div>
            <p className="rd-decode-text rd-decode-cursor font-mono text-sm tracking-widest text-[#00F5FF]">
              [ 正在解析高维物质... ]
            </p>
            <p className="mt-3 font-mono text-[10px] text-white/35">
              截帧已上传 · 视觉模型鉴宝中
            </p>
          </div>

          {/* 单次结果浮层 */}
          <AnimatePresence>
            {phase === 'reveal' && lastResult && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute inset-x-4 bottom-36 z-40 mx-auto max-w-sm rounded-xl border px-4 py-4 backdrop-blur-md"
                style={{
                  borderColor: `${lastResult.accent}55`,
                  background: 'rgba(11, 19, 26, 0.88)',
                  boxShadow: `0 0 32px ${lastResult.glow}`,
                }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className="font-mono text-xs tracking-[0.25em]"
                    style={{ color: lastResult.accent }}
                  >
                    {lastResult.levelLabel}
                  </span>
                  <span className="font-mono text-[10px] text-white/40">
                    纯度 {lastResult.purity}%
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-white/85">{lastResult.message}</p>
                <p className="mt-2 font-mono text-base" style={{ color: lastResult.accent }}>
                  +{lastResult.powerGain} 灵力
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 收容匣入口 */}
        <InventoryFab
          count={scannedItems.length}
          max={MAX_SCANS}
          onClick={() => setDrawerOpen((v) => !v)}
        />

        {/* 底部操作栏 */}
        <div
          className="game-action-bar absolute inset-x-0 bottom-0 z-50 px-4 pb-6 pt-3"
          style={{
            background:
              'linear-gradient(to top, rgba(11,19,26,0.95) 0%, rgba(11,19,26,0.55) 70%, transparent 100%)',
          }}
        >
          <button
            type="button"
            disabled={isLocked || scansLeft <= 0 || drawerOpen}
            onPointerDown={(e: ReactPointerEvent<HTMLButtonElement>) => {
              e.preventDefault()
              void handleExtract()
            }}
            className="mx-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-xl border border-cyan-500/45 bg-cyan-500/10 py-4 text-sm font-medium text-[#00F5FF] backdrop-blur-md transition-opacity duration-200 disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
          >
            {phase === 'decoding' ? (
              <>
                <ScanLine className="h-4 w-4 animate-pulse" />
                解码中...
              </>
            ) : (
              <>
                <Crosshair className="h-4 w-4" />
                提取灵韵
              </>
            )}
          </button>
          <p className="mt-2 text-center font-mono text-[9px] text-white/30">
            对准市井烟火之物 · 剩余 {scansLeft} 次快门
          </p>
        </div>

        {onCancel && phase === 'idle' && endState === null && !drawerOpen && (
          <CameraBackButton onClick={handleCancel} label="退出灵视" />
        )}

        {/* 半屏抽屉 — video 保持运行 */}
        <InventoryDrawer
          open={drawerOpen}
          items={scannedItems}
          onClose={() => setDrawerOpen(false)}
        />
      </div>

      <ModalOverlay open={endState === 'success'} lockScroll>
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm rounded-2xl border border-[#FFD700]/45 bg-[#0B131A]/95 px-6 py-8 text-center backdrop-blur-md"
          style={{ boxShadow: '0 0 48px rgba(255,215,0,0.2)' }}
        >
          <Sparkles className="mx-auto mb-4 h-10 w-10 text-[#FFD700]" />
          <p className="font-mono text-lg tracking-[0.2em] text-[#FFD700]">【降核淬炼完成】</p>
          <p className="mt-2 text-sm text-white/75">现世锚定成功</p>
          <p className="mt-4 font-mono text-xs text-white/40">
            累计灵力 {currentPower} / {TARGET_POWER} · 收容 {scannedItems.length} 件
          </p>
          <button
            type="button"
            onClick={() => onComplete?.()}
            className="mt-6 w-full rounded-xl border border-[#FFD700]/50 bg-[#FFD700]/10 py-3.5 font-mono text-sm tracking-widest text-[#FFD700] transition-opacity active:opacity-80"
          >
            确认锚定
          </button>
        </motion.div>
      </ModalOverlay>

      <ModalOverlay open={endState === 'exhausted'} lockScroll>
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm rounded-2xl border border-white/20 bg-[#0B131A]/95 px-6 py-8 text-center backdrop-blur-md"
        >
          <p className="font-mono text-base tracking-[0.15em] text-white/70">【精神力耗尽】</p>
          <p className="mt-2 text-sm text-white/50">降核温度不足，请休息后重试</p>
          <p className="mt-4 font-mono text-xs text-white/35">
            本次充能 {currentPower} / {TARGET_POWER} · 收容 {scannedItems.length} 件
          </p>
          <button
            type="button"
            onClick={resetGame}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/35 bg-cyan-500/10 py-3.5 font-mono text-sm tracking-widest text-[#00F5FF] transition-opacity active:opacity-80"
          >
            <RefreshCw className="h-4 w-4" />
            重置灵视
          </button>
        </motion.div>
      </ModalOverlay>
    </>
  )
}

export default RedDustScanner
