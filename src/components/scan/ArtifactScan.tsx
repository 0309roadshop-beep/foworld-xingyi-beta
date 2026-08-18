import { AnimatePresence, motion } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, Crosshair, Lock, ScanLine, X } from 'lucide-react'
import { ModalOverlay } from '../ui/ModalOverlay'
import { CameraBackButton } from '../camera/CameraBackButton'
import { CameraPermissionGate } from '../camera/CameraPermissionGate'
import {
  bindStreamToVideo as attachStreamToVideo,
  describeCameraError,
  getCameraSupport,
  openCameraStream,
  stopMediaStream,
} from '../../utils/cameraAccess'

export interface ArtifactScanItem {
  id: string
  catalogNo?: string
  clue?: string
  label: string
  /** 展牌 3 位数灵感校验码 */
  inspirationCode?: string
  sublabel?: string
  /** @deprecated 已改为现场实拍 Base64，配置中可省略 */
  imageUrl?: string
}

export interface ArtifactScanProps {
  artifacts: ArtifactScanItem[]
  targetCount?: number
  description?: string
  onSuccess: () => void
}

type ScanPhase = 'camera' | 'code'
type CapturedPhotoMap = Record<string, string>

const JPEG_QUALITY = 0.7

function getClueText(item: ArtifactScanItem) {
  return item.clue ?? item.sublabel ?? '循罗盘指引，在展柜中寻得此物。'
}

function getCatalogNo(item: ArtifactScanItem) {
  return item.catalogNo ?? item.sublabel ?? '—'
}

function getInspirationCode(item: ArtifactScanItem) {
  return (item.inspirationCode ?? '').trim()
}

/** 从 video 当前帧截取 JPEG Base64 */
function captureVideoFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): string | null {
  const w = video.videoWidth
  const h = video.videoHeight
  if (!w || !h) return null

  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.drawImage(video, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
}

/** 高维档案滤镜 — 实拍图收录为系统扫描质感档案 */
function ArchivePhoto({
  src,
  alt,
  celebrating,
}: {
  src: string
  alt: string
  celebrating?: boolean
}) {
  return (
    <motion.div
      initial={celebrating ? { scale: 0.92, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      className="relative aspect-video w-full overflow-hidden rounded-lg bg-[#0B131A]"
    >
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover grayscale contrast-125 opacity-80 mix-blend-luminosity"
      />
      <div className="pointer-events-none absolute inset-0 bg-cyan-900/20" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-cyan-400/25" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-cyan-400/15" />
    </motion.div>
  )
}

/** 全屏取景 + Canvas 截帧 */
function MuseumScanViewport({
  catalogNo,
  onLock,
  onClose,
}: {
  catalogNo: string
  onLock: (dataUrl: string) => void
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [needsPermission, setNeedsPermission] = useState(true)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraLoading, setCameraLoading] = useState(false)
  const [capturing, setCapturing] = useState(false)

  const stopStream = useCallback(() => {
    stopMediaStream(streamRef.current)
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraReady(false)
  }, [])

  const handleClose = useCallback(() => {
    stopStream()
    onClose()
  }, [onClose, stopStream])

  const bindActiveStream = useCallback(async () => {
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return false
    try {
      await attachStreamToVideo(video, stream)
      setCameraReady(true)
      return true
    } catch {
      return false
    }
  }, [])

  const startCamera = useCallback(async () => {
    stopStream()
    setCameraError(null)
    setNeedsPermission(false)

    const support = getCameraSupport()
    if (!support.ok) {
      const msg = support.hint ? `${support.message}（${support.hint}）` : support.message
      setCameraError(msg)
      setNeedsPermission(true)
      return
    }

    setCameraLoading(true)

    try {
      const stream = await openCameraStream()
      streamRef.current = stream
      const bound = await bindActiveStream()
      if (!bound) {
        stopStream()
        setCameraError('摄像头画面绑定失败，请重试')
        setNeedsPermission(true)
      }
    } catch (err) {
      setCameraError(describeCameraError(err))
      setNeedsPermission(true)
    } finally {
      setCameraLoading(false)
    }
  }, [stopStream, bindActiveStream])

  const handleLockTarget = useCallback(() => {
    if (capturing || !cameraReady) return

    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    setCapturing(true)
    const dataUrl = captureVideoFrame(video, canvas)
    if (!dataUrl) {
      setCameraError('截帧失败，请对准文物后重试')
      setCapturing(false)
      return
    }

    stopStream()
    onLock(dataUrl)
    setCapturing(false)
  }, [capturing, cameraReady, stopStream, onLock])

  useEffect(() => () => stopStream(), [stopStream])

  useEffect(() => {
    if (needsPermission || cameraReady || !streamRef.current) return
    void bindActiveStream()
  }, [needsPermission, cameraReady, bindActiveStream])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="ar-screen game-container overflow-hidden bg-black"
      style={{
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <canvas ref={canvasRef} className="hidden" aria-hidden />

      <div className="relative h-full overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            cameraReady ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {cameraLoading && !cameraError && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-void-950/90">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-jade-muted/30 border-t-jade-bright" />
              <p className="text-xs text-mist-muted">启动博物馆取景…</p>
            </div>
          </div>
        )}

        {(needsPermission || cameraError) && (
          <CameraPermissionGate
            error={cameraError}
            loading={cameraLoading}
            title="开启灵纹扫描取景"
            onEnable={() => void startCamera()}
            onCancel={handleClose}
          />
        )}

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
          <div className="relative aspect-video w-[min(88vw,360px)] max-h-[52vh]">
            <span className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-jade-bright/80" />
            <span className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-jade-bright/80" />
            <span className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-jade-bright/80" />
            <span className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-jade-bright/80" />
            <div className="scan-sweep-track">
              <div className="scan-sweep-line scan-sweep-line--mid left-[8px] right-[8px]">
                <div className="scan-sweep-line__bar h-0.5 bg-gradient-to-r from-transparent via-jade-bright to-transparent shadow-[0_0_12px_rgba(80,220,200,0.8)]" />
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent px-4 pb-8 pt-3">
          <p className="text-center text-[10px] tracking-widest text-jade-bright/90">灵纹扫描取景</p>
          <p className="mt-1 text-center font-mono text-xs text-mist-muted">目标编号 {catalogNo}</p>
        </div>
      </div>

      <div className="game-action-bar px-4">
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          disabled={!cameraReady || capturing}
          onPointerDown={(e: ReactPointerEvent<HTMLButtonElement>) => {
            e.preventDefault()
            handleLockTarget()
          }}
          className="mx-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-xl border border-jade-bright/50 bg-jade-deep/50 py-3.5 text-sm font-medium text-jade-bright shadow-[0_0_20px_rgba(52,211,153,0.15)] backdrop-blur-md disabled:opacity-45"
        >
          <Crosshair className="h-4 w-4" />
          {capturing ? '截帧中…' : '取景锁定'}
        </motion.button>
        <p className="mt-2 text-center text-[9px] text-mist-faint">
          将文物置于取景框内，锁定后输入展牌校验码
        </p>
      </div>

      <CameraBackButton onClick={handleClose} label="取消" />
    </motion.div>
  )
}

/** 灵感校验码输入 */
function InspirationCodeModal({
  previewUrl,
  onSubmit,
  onClose,
  error,
  shaking,
}: {
  previewUrl: string | null
  onSubmit: (code: string) => void
  onClose: () => void
  error: string | null
  shaking: boolean
}) {
  const [value, setValue] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (trimmed.length !== 3) return
    onSubmit(trimmed)
  }

  return (
    <ModalOverlay open onBackdropClick={onClose}>
      <motion.form
        initial={{ y: 12, opacity: 0, scale: 0.96 }}
        animate={{ x: shaking ? [0, -8, 8, -6, 6, 0] : 0, y: 0, opacity: 1, scale: 1 }}
        transition={{ x: { duration: 0.45 }, y: { duration: 0.25 } }}
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-jade-muted/30 bg-void-900/95 p-5 shadow-[0_0_40px_rgba(0,0,0,0.5)]"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-gold-bright">灵韵封印解除</p>
            <p className="mt-2 text-xs leading-relaxed text-mist-muted">
              捕捉到文物灵韵，请输入标牌上的 3 位数【灵感校验码】解除封印
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1 text-mist-faint active:bg-void-700/60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {previewUrl && (
          <div className="mb-4">
            <ArchivePhoto src={previewUrl} alt="取景预览" />
            <p className="mt-1.5 text-center font-mono text-[9px] text-cyan-400/60">
              [ 高维档案预览 · 待校验收录 ]
            </p>
          </div>
        )}

        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={3}
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 3))}
          placeholder="· · ·"
          autoFocus
          className="mb-3 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] text-white placeholder:text-mist-faint/30 focus:border-jade-bright/50 focus:outline-none"
        />

        {error && (
          <p className="mb-3 text-center text-xs text-red-300/90">{error}</p>
        )}

        <button
          type="submit"
          disabled={value.length !== 3}
          className="w-full rounded-xl bg-white py-3 text-sm font-medium text-black disabled:opacity-40"
        >
          校验灵韵
        </button>
      </motion.form>
    </ModalOverlay>
  )
}

/**
 * 文物图谱 — 现场实拍取景 + 灵感校验码验证后解锁图鉴
 */
export function ArtifactScan({
  artifacts,
  targetCount,
  description,
  onSuccess,
}: ArtifactScanProps) {
  const total = targetCount ?? artifacts.length
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set())
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhotoMap>({})
  const [tempCapturedImage, setTempCapturedImage] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [phase, setPhase] = useState<ScanPhase | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [shaking, setShaking] = useState(false)
  const [celebrateId, setCelebrateId] = useState<string | null>(null)
  const [portalMounted, setPortalMounted] = useState(false)

  useEffect(() => {
    setPortalMounted(true)
  }, [])

  const activeItem = activeId ? artifacts.find((a) => a.id === activeId) : null
  const done = unlocked.size >= total

  const openScan = useCallback(
    (id: string) => {
      if (unlocked.has(id) || activeId) return
      setActiveId(id)
      setPhase('camera')
      setCodeError(null)
      setTempCapturedImage(null)
    },
    [unlocked, activeId],
  )

  const closeFlow = useCallback(() => {
    setActiveId(null)
    setPhase(null)
    setCodeError(null)
    setShaking(false)
    setTempCapturedImage(null)
  }, [])

  const handleLockTarget = useCallback((dataUrl: string) => {
    setTempCapturedImage(dataUrl)
    setPhase('code')
    setCodeError(null)
  }, [])

  const handleCodeSubmit = useCallback(
    (code: string) => {
      if (!activeItem) return

      if (!tempCapturedImage) {
        setCodeError('未检测到取景画面，请重新扫描')
        return
      }

      const expected = getInspirationCode(activeItem)
      if (!expected) {
        setCodeError('该文物未配置校验码')
        return
      }

      if (code !== expected) {
        setCodeError('校验失败，灵韵不匹配')
        setShaking(true)
        window.setTimeout(() => setShaking(false), 500)
        return
      }

      setCapturedPhotos((prev) => ({
        ...prev,
        [activeItem.id]: tempCapturedImage,
      }))
      setUnlocked((prev) => {
        const next = new Set(prev)
        next.add(activeItem.id)
        return next
      })
      setCelebrateId(activeItem.id)
      setTempCapturedImage(null)
      closeFlow()
      window.setTimeout(() => setCelebrateId(null), 1200)
    },
    [activeItem, closeFlow, tempCapturedImage],
  )

  return (
    <div className="px-1 py-2">
      {description && (
        <p className="mb-3 text-center text-xs leading-relaxed text-mist-muted">{description}</p>
      )}

      <div className="mb-3 flex items-center justify-between rounded-lg border border-void-600/60 bg-void-900/50 px-3 py-2">
        <span className="text-[10px] text-mist-faint">文物图谱验证进度</span>
        <span className="text-xs font-medium text-spirit">
          {unlocked.size}/{total}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {artifacts.slice(0, total).map((item) => {
          const isDone = unlocked.has(item.id)
          const isCelebrating = celebrateId === item.id
          const photoSrc = capturedPhotos[item.id]
          const clue = getClueText(item)
          const catalogNo = getCatalogNo(item)

          return (
            <div
              key={item.id}
              className={`relative overflow-hidden rounded-xl border p-2.5 text-left transition-all ${
                isDone
                  ? 'border-spirit/50 bg-spirit-dim/20 shadow-[0_0_14px_rgba(52,211,153,0.18)]'
                  : 'border-void-600/70 bg-void-800/50'
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span
                  className={`rounded-md px-2 py-0.5 font-mono text-[10px] tracking-wide ${
                    isDone
                      ? 'border border-spirit/40 bg-spirit-dim/30 text-spirit'
                      : 'border border-gold-muted/30 bg-gold-muted/10 text-gold-muted'
                  }`}
                >
                  编号 {catalogNo}
                </span>
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-spirit" />
                ) : (
                  <span className="flex items-center gap-1 text-[9px] text-mist-faint">
                    <Lock className="h-3 w-3" />
                    待验证
                  </span>
                )}
              </div>

              <div className="mb-2">
                {isDone && photoSrc ? (
                  <ArchivePhoto
                    src={photoSrc}
                    alt={item.label}
                    celebrating={isCelebrating}
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-lg bg-[#0B131A]">
                    <div className="flex flex-col items-center gap-1.5 px-3 text-center">
                      <ScanLine className="h-7 w-7 text-gold-muted/45" />
                      <span className="text-[9px] leading-snug text-mist-faint">
                        现场取景后输入校验码
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {isDone ? (
                <>
                  <p className="text-[11px] font-semibold leading-snug text-gold-bright">
                    {item.label}
                  </p>
                  <p className="mt-1 line-clamp-3 text-[9px] leading-relaxed text-mist-faint">
                    {clue}
                  </p>
                </>
              ) : (
                <>
                  <p className="mb-1 text-[9px] font-medium tracking-widest text-jade-bright/80">
                    唤灵师寻踪线索
                  </p>
                  <p className="line-clamp-4 text-[10px] leading-relaxed text-mist-muted">
                    {clue}
                  </p>
                  <button
                    type="button"
                    disabled={Boolean(activeId)}
                    onClick={() => openScan(item.id)}
                    className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-jade-muted/35 bg-jade-deep/25 py-2 text-[11px] font-medium text-jade-bright active:scale-[0.98] disabled:opacity-45"
                  >
                    <ScanLine className="h-3.5 w-3.5" />
                    灵纹扫描
                  </button>
                </>
              )}

              <AnimatePresence>
                {isCelebrating && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-spirit-dim/35 backdrop-blur-[2px]"
                  >
                    <CheckCircle2 className="h-10 w-10 text-spirit drop-shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
                    <p className="mt-2 text-xs font-medium text-spirit">灵韵校验通过</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {done && (
        <button
          type="button"
          onClick={onSuccess}
          className="mt-4 w-full rounded-xl border border-gold-muted/40 bg-gradient-to-r from-jade-deep/80 to-gold-muted/20 py-3 text-sm font-medium text-gold-bright active:scale-[0.98]"
        >
          图谱验证完成 · 唤醒夜郎铜兽
        </button>
      )}

      {portalMounted &&
        createPortal(
          <AnimatePresence>
            {activeItem && phase === 'camera' && (
              <MuseumScanViewport
                key={`cam-${activeItem.id}`}
                catalogNo={getCatalogNo(activeItem)}
                onLock={handleLockTarget}
                onClose={closeFlow}
              />
            )}
            {activeItem && phase === 'code' && (
              <InspirationCodeModal
                key={`code-${activeItem.id}`}
                previewUrl={tempCapturedImage}
                onSubmit={handleCodeSubmit}
                onClose={closeFlow}
                error={codeError}
                shaking={shaking}
              />
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  )
}

export default ArtifactScan
