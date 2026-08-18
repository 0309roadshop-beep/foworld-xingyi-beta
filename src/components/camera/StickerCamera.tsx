import { AnimatePresence, motion } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Camera, Check, PenLine, RefreshCw } from 'lucide-react'
import { CameraBackButton } from './CameraBackButton'
import { CameraPermissionGate } from './CameraPermissionGate'
import {
  bindStreamToVideo,
  describeCameraError,
  getCameraSupport,
  openCameraStream,
  stopMediaStream,
} from '../../utils/cameraAccess'

export type OverlayType = 'meme' | 'film'

interface StickerCameraProps {
  overlayType: OverlayType
  /** 合成完成，返回 JPEG Base64（含选中台词标签） */
  onSuccess?: (base64Data: string) => void
  onError?: (message: string) => void
  onCancel?: () => void
  onClose?: () => void
}

type Phase = 'prompt' | 'loading' | 'live' | 'result'
type TagSource = 'preset' | 'custom'

export interface OverlayPosition {
  /** 气泡中心点，容器百分比 0–100 */
  x: number
  y: number
}

/** 官方搞笑台词标签 */
export const MEME_TAG_OPTIONS = [
  { id: 'kaibai', text: '开摆' },
  { id: 'banfeng', text: '上班哪有不疯的' },
  { id: 'moyu', text: '让我看看谁在摸鱼' },
  { id: 'tangping', text: '文物也躺平' },
  { id: 'zhuangsi', text: '我是在装死别吵' },
  { id: 'jiuzhe', text: '就这？' },
] as const

export type MemeTagId = (typeof MEME_TAG_OPTIONS)[number]['id']

const DEFAULT_OVERLAY_POS: OverlayPosition = { x: 50, y: 64 }

/** 固定竖屏导出尺寸（与取景 9:16 一致） */
const EXPORT_WIDTH = 1080
const EXPORT_HEIGHT = 1920
const PORTRAIT_ASPECT = EXPORT_WIDTH / EXPORT_HEIGHT

/** 电影遮幅宽高比 */
const FILM_ASPECT = 2.39

const MEME_SUBTITLE = '万峰林显眼包打卡 · FOWORLD'

/** object-cover 居中裁切区域（与取景预览一致） */
function objectCoverCropRect(
  sourceW: number,
  sourceH: number,
  targetAspect: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const sourceAspect = sourceW / sourceH
  if (sourceAspect > targetAspect) {
    const sh = sourceH
    const sw = sourceH * targetAspect
    return { sx: (sourceW - sw) / 2, sy: 0, sw, sh }
  }
  const sw = sourceW
  const sh = sourceW / targetAspect
  return { sx: 0, sy: (sourceH - sh) / 2, sw, sh }
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
    gain.gain.setValueAtTime(0.48, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
    src.connect(gain)
    gain.connect(ctx.destination)
    src.start(now)
    window.setTimeout(() => void ctx.close(), 200)
  } catch {
    /* ignore */
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = src
  })
}

function clampPos(x: number, y: number): OverlayPosition {
  return {
    x: Math.min(92, Math.max(8, x)),
    y: Math.min(92, Math.max(8, y)),
  }
}

/** Canvas：黑底白字台词气泡（按百分比定位中心） */
function drawTagBubble(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  text: string,
  position: OverlayPosition = DEFAULT_OVERLAY_POS,
) {
  const hPad = w * 0.055
  const fontSize = Math.max(14, Math.round(w * 0.044))
  ctx.font = `600 ${fontSize}px PingFang SC, Hiragino Sans GB, sans-serif`
  const textW = ctx.measureText(text).width
  const bubbleW = Math.min(w * 0.88, textW + hPad * 2)
  const bubbleH = fontSize * 2.1
  const cx = (position.x / 100) * w
  const cy = (position.y / 100) * h
  const x = cx - bubbleW / 2
  const y = cy - bubbleH / 2
  const radius = bubbleH * 0.38

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.45)'
  ctx.shadowBlur = w * 0.012
  ctx.shadowOffsetY = w * 0.004

  ctx.fillStyle = 'rgba(0, 0, 0, 0.88)'
  ctx.beginPath()
  ctx.roundRect(x, y, bubbleW, bubbleH, radius)
  ctx.fill()

  ctx.shadowColor = 'transparent'
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, cx, cy)
  ctx.restore()
}

/** Canvas：文物显眼包底部信息条 */
function drawMemeFooter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const barH = h * 0.14
  const y0 = h - barH

  const grad = ctx.createLinearGradient(0, y0, 0, h)
  grad.addColorStop(0, 'rgba(7, 18, 24, 0)')
  grad.addColorStop(0.35, 'rgba(7, 18, 24, 0.72)')
  grad.addColorStop(1, 'rgba(7, 18, 24, 0.92)')
  ctx.fillStyle = grad
  ctx.fillRect(0, y0, w, barH)

  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(232, 244, 248, 0.75)'
  ctx.font = `400 ${Math.round(w * 0.028)}px PingFang SC, sans-serif`
  ctx.fillText(MEME_SUBTITLE, w / 2, y0 + barH * 0.62)
}

/** Canvas：电影遮幅 + FOWORLD 水印 */
function drawFilmSticker(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const contentH = w / FILM_ASPECT
  const barH = Math.max(0, (h - contentH) / 2)

  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, w, barH)
  ctx.fillRect(0, h - barH, w, barH)

  const wmX = w - w * 0.045
  const wmY = h - barH - h * 0.025

  ctx.textAlign = 'right'
  ctx.fillStyle = 'rgba(253, 230, 138, 0.9)'
  ctx.font = `600 ${Math.round(w * 0.034)}px PingFang SC, serif`
  ctx.fillText('FOWORLD', wmX, wmY)

  ctx.fillStyle = 'rgba(148, 184, 200, 0.88)'
  ctx.font = `400 ${Math.round(w * 0.02)}px PingFang SC, sans-serif`
  ctx.fillText('寻灵记 · 咖啡大片', wmX, wmY + h * 0.028)
}

async function compositeBasePhoto(
  video: HTMLVideoElement,
  overlayType: OverlayType,
): Promise<string> {
  const w = video.videoWidth
  const h = video.videoHeight
  if (!w || !h) throw new Error('视频帧尚未就绪')

  const crop = objectCoverCropRect(w, h, PORTRAIT_ASPECT)
  const canvas = document.createElement('canvas')
  canvas.width = EXPORT_WIDTH
  canvas.height = EXPORT_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 不可用')

  if (overlayType === 'film') {
    ctx.filter =
      'sepia(0.32) contrast(1.14) saturate(0.88) brightness(0.93) hue-rotate(-6deg)'
  }

  ctx.drawImage(
    video,
    crop.sx,
    crop.sy,
    crop.sw,
    crop.sh,
    0,
    0,
    EXPORT_WIDTH,
    EXPORT_HEIGHT,
  )
  ctx.filter = 'none'

  if (overlayType === 'meme') drawMemeFooter(ctx, EXPORT_WIDTH, EXPORT_HEIGHT)
  else drawFilmSticker(ctx, EXPORT_WIDTH, EXPORT_HEIGHT)

  return canvas.toDataURL('image/jpeg', 0.9)
}

async function exportWithTag(
  base64: string,
  tagText: string,
  position: OverlayPosition,
): Promise<string> {
  const img = await loadImage(base64)
  const canvas = document.createElement('canvas')
  canvas.width = EXPORT_WIDTH
  canvas.height = EXPORT_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 不可用')

  ctx.drawImage(img, 0, 0, EXPORT_WIDTH, EXPORT_HEIGHT)
  drawTagBubble(ctx, EXPORT_WIDTH, EXPORT_HEIGHT, tagText, position)
  return canvas.toDataURL('image/jpeg', 0.9)
}

/** 可拖动台词气泡 — 取景 / 成片预览共用 */
function DraggableMemeTag({
  text,
  position,
  onPositionChange,
  containerRef,
  placeholder = false,
}: {
  text: string
  position: OverlayPosition
  onPositionChange: (pos: OverlayPosition) => void
  containerRef: React.RefObject<HTMLElement | null>
  placeholder?: boolean
}) {
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null)

  const updateFromClient = useCallback(
    (clientX: number, clientY: number, offsetX: number, offsetY: number) => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const x = ((clientX - offsetX - rect.left) / rect.width) * 100
      const y = ((clientY - offsetY - rect.top) / rect.height) * 100
      onPositionChange(clampPos(x, y))
    },
    [containerRef, onPositionChange],
  )

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    dragRef.current = {
      pointerId: e.pointerId,
      offsetX: e.clientX - rect.left - rect.width / 2,
      offsetY: e.clientY - rect.top - rect.height / 2,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return
    e.preventDefault()
    updateFromClient(
      e.clientX,
      e.clientY,
      dragRef.current.offsetX,
      dragRef.current.offsetY,
    )
  }

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return
    dragRef.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  return (
    <div
      className="absolute z-20 max-w-[88%] -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none active:cursor-grabbing"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className={`rounded-2xl px-4 py-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.45)] ${
          placeholder
            ? 'border border-dashed border-white/40 bg-black/55'
            : 'bg-black/88 ring-1 ring-white/10'
        }`}
      >
        <p
          className={`text-center text-sm font-semibold leading-snug ${
            placeholder ? 'text-white/55' : 'text-white'
          }`}
        >
          {text}
        </p>
      </div>
      <p className="pointer-events-none mt-1 text-center text-[9px] text-white/45">拖动调整位置</p>
    </div>
  )
}

/** 预览层：电影遮幅 */
function FilmPreview() {
  const barPct = `${((1 - 1 / FILM_ASPECT) / 2) * 100}%`
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="absolute inset-x-0 top-0 bg-black" style={{ height: barPct }} />
      <div className="absolute inset-x-0 bottom-0 bg-black" style={{ height: barPct }} />
      <div
        className="absolute right-4 text-right"
        style={{ bottom: `calc(${barPct} + 12px)` }}
      >
        <p className="text-sm font-semibold tracking-[0.25em] text-gold-bright/90">FOWORLD</p>
        <p className="text-[10px] text-mist-muted">寻灵记 · 咖啡大片</p>
      </div>
    </div>
  )
}

/** 横向台词标签选择栏 — 支持触摸滑动 + 自定义文字 */
function TagSelector({
  selectedId,
  tagSource,
  customText,
  onSelectPreset,
  onSelectCustom,
  onCustomTextChange,
}: {
  selectedId: MemeTagId
  tagSource: TagSource
  customText: string
  onSelectPreset: (id: MemeTagId) => void
  onSelectCustom: () => void
  onCustomTextChange: (text: string) => void
}) {
  const scrollId = useId()

  return (
    <div className="w-full min-w-0">
      <p className="mb-2 px-1 text-[10px] tracking-widest text-mist-muted">
        选择台词标签 · 左右滑动查看更多
      </p>

      <div className="relative min-w-0">
        <div
          id={scrollId}
          className="flex gap-2 overflow-x-auto overflow-y-hidden scroll-smooth pb-1 pl-0.5 pr-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}
        >
          {MEME_TAG_OPTIONS.map((tag) => {
            const active = tagSource === 'preset' && tag.id === selectedId
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => onSelectPreset(tag.id)}
                className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
                  active
                    ? 'border-white bg-white text-black shadow-[0_0_16px_rgba(255,255,255,0.25)]'
                    : 'border-white/20 bg-white/8 text-mist/90'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                {tag.text}
              </button>
            )
          })}
          <button
            type="button"
            onClick={onSelectCustom}
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-95 ${
              tagSource === 'custom'
                ? 'border-jade-bright/70 bg-jade-deep/40 text-jade-bright'
                : 'border-white/20 bg-white/8 text-mist/90'
            }`}
            style={{ touchAction: 'manipulation' }}
          >
            <PenLine className="h-3.5 w-3.5" />
            自定义文字
          </button>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black/80 to-transparent" />
      </div>

      {tagSource === 'custom' && (
        <div className="mt-2.5">
          <input
            type="text"
            value={customText}
            onChange={(e) => onCustomTextChange(e.target.value)}
            maxLength={28}
            placeholder="输入你的显眼包台词…"
            className="w-full rounded-xl border border-white/15 bg-white/8 px-3.5 py-2.5 text-sm text-white placeholder:text-mist-faint/50 focus:border-jade-bright/50 focus:outline-none"
            style={{ touchAction: 'manipulation' }}
          />
          <p className="mt-1 px-1 text-[9px] text-mist-faint">
            最多 28 字 · 拖动画面中的气泡到任意位置
          </p>
        </div>
      )}
    </div>
  )
}

export function StickerCamera({
  overlayType,
  onSuccess,
  onError,
  onCancel,
  onClose,
}: StickerCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const previewAreaRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const successFiredRef = useRef(false)

  const [phase, setPhase] = useState<Phase>('prompt')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [flash, setFlash] = useState(false)
  const [basePhoto, setBasePhoto] = useState<string | null>(null)
  const [finalPhoto, setFinalPhoto] = useState<string | null>(null)
  const [selectedTagId, setSelectedTagId] = useState<MemeTagId>(MEME_TAG_OPTIONS[0].id)
  const [tagSource, setTagSource] = useState<TagSource>('preset')
  const [customText, setCustomText] = useState('')
  const [overlayPos, setOverlayPos] = useState<OverlayPosition>(DEFAULT_OVERLAY_POS)
  const [compositing, setCompositing] = useState(false)
  const [exporting, setExporting] = useState(false)

  const selectedTag = MEME_TAG_OPTIONS.find((t) => t.id === selectedTagId) ?? MEME_TAG_OPTIONS[0]
  const isMeme = overlayType === 'meme'
  const displayPhoto = isMeme ? basePhoto : finalPhoto

  const activeTagText =
    tagSource === 'custom' ? customText.trim() : selectedTag.text
  const tagPlaceholder = tagSource === 'custom' && !customText.trim()
  const previewTagText = tagPlaceholder ? '输入你的显眼包台词' : activeTagText

  const showMemeOverlay =
    isMeme && (phase === 'live' || (phase === 'result' && !finalPhoto))

  const resetMemeEditor = useCallback(() => {
    setSelectedTagId(MEME_TAG_OPTIONS[0].id)
    setTagSource('preset')
    setCustomText('')
    setOverlayPos(DEFAULT_OVERLAY_POS)
  }, [])

  const stopStream = useCallback(() => {
    stopMediaStream(streamRef.current)
    streamRef.current = null
  }, [])

  const startCamera = useCallback(async () => {
    stopStream()
    setCameraError(null)
    setBasePhoto(null)
    setFinalPhoto(null)
    resetMemeEditor()
    successFiredRef.current = false

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
  }, [stopStream, onError, resetMemeEditor])

  useEffect(() => () => stopStream(), [stopStream])

  const handleClose = useCallback(() => {
    stopStream()
    const dismiss = onCancel ?? onClose
    dismiss?.()
  }, [onCancel, onClose, stopStream])

  const handleCapture = useCallback(
    async (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.preventDefault()
      if (phase !== 'live' || compositing || cameraError) return

      const video = videoRef.current
      if (!video) return

      setCompositing(true)
      setFlash(true)
      playShutterTick()
      video.pause()

      try {
        const base64 = await compositeBasePhoto(video, overlayType)

        if (isMeme) {
          setBasePhoto(base64)
          setFinalPhoto(null)
          setPhase('result')
        } else {
          setFinalPhoto(base64)
          setPhase('result')
          if (!successFiredRef.current) {
            successFiredRef.current = true
            onSuccess?.(base64)
          }
        }
      } catch {
        void video.play()
        setCameraError('合成失败，请重试')
      } finally {
        setCompositing(false)
        window.setTimeout(() => setFlash(false), 160)
      }
    },
    [phase, compositing, cameraError, overlayType, onSuccess, isMeme],
  )

  const handleConfirmMeme = useCallback(
    async (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.preventDefault()
      if (!basePhoto || exporting || !activeTagText) return

      setExporting(true)
      try {
        const exported = await exportWithTag(basePhoto, activeTagText, overlayPos)
        setFinalPhoto(exported)
        if (!successFiredRef.current) {
          successFiredRef.current = true
          onSuccess?.(exported)
        }
      } catch {
        setCameraError('导出失败，请重试')
      } finally {
        setExporting(false)
      }
    },
    [basePhoto, exporting, activeTagText, overlayPos, onSuccess],
  )

  const handleRetake = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    successFiredRef.current = false
    setBasePhoto(null)
    setFinalPhoto(null)
    resetMemeEditor()
    setPhase('live')
    const video = videoRef.current
    if (video) void video.play()
  }, [resetMemeEditor])

  const modeLabel = overlayType === 'meme' ? '文物显眼包' : '咖啡大片'

  return (
    <div
      className="relative flex h-full w-full items-center justify-center bg-black"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      <div
        className="ar-viewfinder relative flex h-full w-full max-w-[calc(100dvh*9/16)] flex-col overflow-hidden bg-black"
        style={{ aspectRatio: '9 / 16' }}
      >
        {/* 取景器 */}
        {phase !== 'result' && (
          <div ref={previewAreaRef} className="relative min-h-0 flex-1">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
              style={{ WebkitPlaysinline: 'true' } as React.CSSProperties}
            />

            {phase === 'live' && overlayType === 'film' && <FilmPreview />}
            {showMemeOverlay && (
              <DraggableMemeTag
                text={previewTagText}
                position={overlayPos}
                onPositionChange={setOverlayPos}
                containerRef={previewAreaRef}
                placeholder={tagPlaceholder}
              />
            )}
          </div>
        )}

        {/* 合成结果 + 标签选择 */}
        {phase === 'result' && displayPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex min-h-0 flex-1 flex-col bg-void-950"
          >
            <div ref={previewAreaRef} className="relative min-h-0 flex-1">
              <img
                src={finalPhoto ?? basePhoto ?? ''}
                alt="打卡合成图"
                className="h-full w-full object-cover"
                draggable={false}
              />
              {showMemeOverlay && (
                <DraggableMemeTag
                  text={previewTagText}
                  position={overlayPos}
                  onPositionChange={setOverlayPos}
                  containerRef={previewAreaRef}
                  placeholder={tagPlaceholder}
                />
              )}
            </div>

            <div
              className="shrink-0 border-t border-white/10 bg-void-950/95 px-4 pb-5 pt-3 backdrop-blur-md"
              style={{ touchAction: 'manipulation' }}
            >
              {isMeme && !finalPhoto && (
                <>
                  <TagSelector
                    selectedId={selectedTagId}
                    tagSource={tagSource}
                    customText={customText}
                    onSelectPreset={(id) => {
                      setTagSource('preset')
                      setSelectedTagId(id)
                    }}
                    onSelectCustom={() => setTagSource('custom')}
                    onCustomTextChange={setCustomText}
                  />
                  <button
                    type="button"
                    disabled={exporting || !activeTagText}
                    onPointerDown={handleConfirmMeme}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-medium text-black active:scale-[0.98] disabled:opacity-45"
                    style={{ touchAction: 'manipulation' }}
                  >
                    {exporting ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                        合成中…
                      </span>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        确认生成表情包
                      </>
                    )}
                  </button>
                </>
              )}

              {(finalPhoto || !isMeme) && (
                <div className="text-center">
                  <p className="text-sm font-medium text-gold-bright">打卡合成完成</p>
                  <p className="mt-1 text-xs text-mist-muted">长按保存你的专属打卡记录</p>
                </div>
              )}

              <button
                type="button"
                onPointerDown={handleRetake}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full border border-white/15 py-2.5 text-xs text-mist-muted active:bg-white/5"
                style={{ touchAction: 'manipulation' }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                再拍一张
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'loading' && !cameraError && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-void-900/92">
            <div className="flex flex-col items-center gap-3">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-gold-muted/30 border-t-gold-bright" />
              <p className="text-sm text-mist-muted">正在启动 {modeLabel} 相机…</p>
            </div>
          </div>
        )}

        {(phase === 'prompt' || cameraError) && phase !== 'result' && (
          <CameraPermissionGate
            error={cameraError}
            loading={phase === 'loading'}
            onEnable={() => void startCamera()}
            onCancel={handleClose}
          />
        )}

        <AnimatePresence>
          {flash && (
            <motion.div
              initial={{ opacity: 0.92 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="pointer-events-none absolute inset-0 z-40 bg-white"
            />
          )}
        </AnimatePresence>

        <CameraBackButton onClick={handleClose} />

        {phase === 'live' && !cameraError && (
          <div
            className="relative shrink-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-8 pt-4"
            style={{ touchAction: 'manipulation' }}
          >
            {isMeme && (
              <div className="mb-4 min-w-0">
                <TagSelector
                  selectedId={selectedTagId}
                  tagSource={tagSource}
                  customText={customText}
                  onSelectPreset={(id) => {
                    setTagSource('preset')
                    setSelectedTagId(id)
                  }}
                  onSelectCustom={() => setTagSource('custom')}
                  onCustomTextChange={setCustomText}
                />
              </div>
            )}
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              disabled={compositing}
              onPointerDown={handleCapture}
              className="mx-auto flex h-[68px] w-[68px] items-center justify-center rounded-full border-2 border-gold-bright bg-gold-muted/15 shadow-glow-lg disabled:opacity-50"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              <Camera className="h-8 w-8 text-gold-bright" />
            </motion.button>
            <p className="mt-3 text-center text-xs tracking-[0.3em] text-mist-muted">
              {overlayType === 'meme' ? '定格显眼包' : '定格大片'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default StickerCamera
