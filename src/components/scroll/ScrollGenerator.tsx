import { useEffect, useRef, useState } from 'react'
import { saveScrollResult } from '../../config/scrollDataHelper'

/** 高清竖版海报宽度 */
const CANVAS_WIDTH = 1080
/** 内边距 */
const PADDING = 56
/** 网格间距 */
const GAP = 28
/** 标题区高度 */
const HEADER_HEIGHT = 200
/** 底部落款区 */
const FOOTER_HEIGHT = 120

export interface ScrollGeneratorProps {
  /** 玩家拍摄的 7 张照片 URL */
  photos: string[]
  /** 7 只已收集幻兽 PNG 素材 URL */
  spirits: string[]
  /** 玩家确认绘卷后回调 */
  onSuccess?: () => void
}

type ComposePhase = 'idle' | 'loading' | 'ready' | 'error'

/**
 * 加载单张图片 — 必须设置 crossOrigin 防止 Canvas 污染
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`图片加载失败: ${src}`))
    img.src = src
  })
}

/** 7 格错落网格布局（相对画布坐标，绘制前加上 PADDING / HEADER_HEIGHT） */
function getPhotoSlots(
  contentWidth: number,
  cellHeight: number,
): { x: number; y: number; w: number; h: number; spiritScale: number }[] {
  const colW = (contentWidth - GAP) / 2
  const rowStep = cellHeight + GAP

  return [
    { x: 0, y: 0, w: colW, h: cellHeight, spiritScale: 0.38 },
    { x: colW + GAP, y: rowStep * 0.15, w: colW, h: cellHeight, spiritScale: 0.38 },
    { x: colW * 0.12, y: rowStep * 1.05, w: colW, h: cellHeight, spiritScale: 0.42 },
    { x: colW + GAP - colW * 0.08, y: rowStep * 1.85, w: colW, h: cellHeight, spiritScale: 0.38 },
    { x: 0, y: rowStep * 2.75, w: colW, h: cellHeight, spiritScale: 0.38 },
    { x: colW + GAP, y: rowStep * 2.95, w: colW, h: cellHeight, spiritScale: 0.38 },
    {
      x: (contentWidth - colW * 1.15) / 2,
      y: rowStep * 3.85,
      w: colW * 1.15,
      h: cellHeight * 1.05,
      spiritScale: 0.45,
    },
  ]
}

/** 绘制羊皮纸质感底纹 */
function drawParchmentBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, w, h)
  grad.addColorStop(0, '#2a2218')
  grad.addColorStop(0.35, '#3d3226')
  grad.addColorStop(0.65, '#352b20')
  grad.addColorStop(1, '#1f1812')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  /* 纸纹噪点 */
  ctx.globalAlpha = 0.06
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * w
    const y = Math.random() * h
    const shade = Math.random() > 0.5 ? '#d4c4a8' : '#0a0806'
    ctx.fillStyle = shade
    ctx.fillRect(x, y, 1.2, 1.2)
  }
  ctx.globalAlpha = 1

  /* 内框金边 */
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)'
  ctx.lineWidth = 3
  ctx.strokeRect(PADDING - 12, PADDING - 12, w - (PADDING - 12) * 2, h - (PADDING - 12) * 2)

  ctx.strokeStyle = 'rgba(212, 175, 55, 0.12)'
  ctx.lineWidth = 1
  ctx.strokeRect(PADDING, PADDING, w - PADDING * 2, h - PADDING * 2)
}

/** cover 模式绘制图片到矩形 */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const ir = img.width / img.height
  const dr = w / h
  let sx = 0
  let sy = 0
  let sw = img.width
  let sh = img.height

  if (ir > dr) {
    sw = img.height * dr
    sx = (img.width - sw) / 2
  } else {
    sh = img.width / dr
    sy = (img.height - sh) / 2
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

/**
 * ScrollGenerator — 终章长卷合成导出
 * 7 张照片 + 7 只幻兽 PNG → Canvas 离屏绘制 → JPEG Base64 预览
 */
export function ScrollGenerator({ photos, spirits, onSuccess }: ScrollGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<ComposePhase>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (photos.length === 0 || spirits.length === 0) {
      setPhase('idle')
      setPreviewUrl(null)
      return
    }

    const count = Math.min(photos.length, spirits.length, 7)
    const photoUrls = photos.slice(0, count)
    const spiritUrls = spirits.slice(0, count)

    let cancelled = false

    async function composeScroll() {
      setPhase('loading')
      setPreviewUrl(null)
      setErrorMessage(null)

      try {
        /* Promise.all — 14 张图全部 onload 后才开始绘制 */
        const [loadedPhotos, loadedSpirits] = await Promise.all([
          Promise.all(photoUrls.map(loadImage)),
          Promise.all(spiritUrls.map(loadImage)),
        ])

        if (cancelled) return

        const contentWidth = CANVAS_WIDTH - PADDING * 2
        const cellHeight = Math.round(contentWidth * 0.42)
        const slots = getPhotoSlots(contentWidth, cellHeight)
        const contentHeight =
          slots[count - 1].y + slots[count - 1].h + GAP
        const canvasHeight = HEADER_HEIGHT + contentHeight + FOOTER_HEIGHT + PADDING * 2

        const canvas = canvasRef.current
        if (!canvas) throw new Error('Canvas 未就绪')

        canvas.width = CANVAS_WIDTH
        canvas.height = canvasHeight

        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas 2D 上下文不可用')

        drawParchmentBackground(ctx, CANVAS_WIDTH, canvasHeight)

        /* ── 标题区 ── */
        ctx.textAlign = 'center'
        ctx.fillStyle = 'rgba(212, 175, 55, 0.9)'
        ctx.font = '600 42px "PingFang SC", "Noto Serif SC", serif'
        ctx.fillText('百 灵 绘 卷', CANVAS_WIDTH / 2, PADDING + 72)

        ctx.fillStyle = 'rgba(200, 190, 170, 0.55)'
        ctx.font = '400 22px "PingFang SC", sans-serif'
        ctx.fillText('七日寻灵 · 终章长卷', CANVAS_WIDTH / 2, PADDING + 118)

        ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(PADDING + 80, PADDING + 140)
        ctx.lineTo(CANVAS_WIDTH - PADDING - 80, PADDING + 140)
        ctx.stroke()

        const originY = PADDING + HEADER_HEIGHT

        /* ── 7 张照片 + 幻兽叠印 ── */
        for (let i = 0; i < count; i++) {
          const slot = slots[i]
          const x = PADDING + slot.x
          const y = originY + slot.y
          const { w, h } = slot

          /* 照片阴影底 */
          ctx.save()
          ctx.shadowColor = 'rgba(0,0,0,0.45)'
          ctx.shadowBlur = 18
          ctx.shadowOffsetY = 8
          ctx.fillStyle = '#1a1510'
          ctx.beginPath()
          ctx.roundRect(x, y, w, h, 12)
          ctx.fill()
          ctx.restore()

          /* 裁剪圆角后绘制照片 */
          ctx.save()
          ctx.beginPath()
          ctx.roundRect(x, y, w, h, 12)
          ctx.clip()
          drawImageCover(ctx, loadedPhotos[i], x, y, w, h)

          /* 暗角 */
          const vignette = ctx.createLinearGradient(x, y + h * 0.5, x, y + h)
          vignette.addColorStop(0, 'rgba(0,0,0,0)')
          vignette.addColorStop(1, 'rgba(0,0,0,0.35)')
          ctx.fillStyle = vignette
          ctx.fillRect(x, y, w, h)
          ctx.restore()

          /* 幻兽 PNG 叠印 — 右下角 */
          const spirit = loadedSpirits[i]
          const sw = w * slot.spiritScale
          const sh = (spirit.height / spirit.width) * sw
          const sx = x + w - sw + 8
          const sy = y + h - sh + 4

          ctx.save()
          ctx.shadowColor = 'rgba(52, 211, 153, 0.4)'
          ctx.shadowBlur = 16
          ctx.drawImage(spirit, sx, sy, sw, sh)
          ctx.restore()

          /* 序号标记 */
          ctx.fillStyle = 'rgba(212, 175, 55, 0.85)'
          ctx.font = '600 20px monospace'
          ctx.textAlign = 'left'
          ctx.fillText(String(i + 1).padStart(2, '0'), x + 14, y + 32)
        }

        /* ── 底部落款 ── */
        const footerY = originY + contentHeight + GAP + 40
        ctx.textAlign = 'center'
        ctx.fillStyle = 'rgba(160, 150, 130, 0.5)'
        ctx.font = '400 18px "PingFang SC", sans-serif'
        ctx.fillText('万峰林 · FOWORLD 寻灵记', CANVAS_WIDTH / 2, footerY)
        ctx.fillText('山河会老，文物不朽', CANVAS_WIDTH / 2, footerY + 32)

        const base64 = canvas.toDataURL('image/jpeg', 0.9)
        if (cancelled) return

        saveScrollResult(base64)
        setPreviewUrl(base64)
        setPhase('ready')
      } catch (err) {
        if (cancelled) return
        console.error('[ScrollGenerator]', err)
        setErrorMessage(err instanceof Error ? err.message : '长卷合成失败')
        setPhase('error')
      }
    }

    composeScroll()

    return () => {
      cancelled = true
    }
  }, [photos, spirits])

  return (
    <div className="scroll-generator w-full px-2 py-3">
      {/* 隐藏离屏 Canvas */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {/* 合成中 — 仪式感 Loading */}
      {phase === 'loading' && (
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-gold-muted/20 bg-void-900/80 px-6 py-12 text-center">
          <div className="mb-6 h-16 w-16 animate-spin rounded-full border-2 border-gold-muted/20 border-t-gold-bright" />
          <p className="text-sm tracking-[0.35em] text-gold-bright">正在凝结七日灵韵...</p>
          <p className="mt-3 text-xs text-mist-faint">十四道灵纹载入中，请稍候</p>
          <div className="mt-6 h-1 w-48 overflow-hidden rounded-full bg-void-700/80">
            <div className="scroll-loading-bar h-full rounded-full bg-gradient-to-r from-jade-deep to-gold-muted" />
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div className="rounded-2xl border border-red-400/30 bg-red-950/20 px-4 py-8 text-center">
          <p className="text-sm text-red-200">长卷合成失败</p>
          <p className="mt-2 text-xs text-mist-faint">{errorMessage}</p>
        </div>
      )}

      {phase === 'ready' && previewUrl && (
        <div className="overflow-hidden rounded-2xl border border-gold-muted/30 bg-void-900/60 p-3">
          <img
            src={previewUrl}
            alt="百灵绘卷终章长卷"
            className="mx-auto w-full max-w-full rounded-xl shadow-[0_0_40px_rgba(212,175,55,0.12)]"
          />
          <p className="mt-4 text-center text-sm text-gold-muted">
            长按保存你的百灵绘卷
          </p>
          <p className="mt-1 text-center text-[10px] text-mist-faint">
            可分享至朋友圈，记录七日寻灵之旅
          </p>
          {onSuccess && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault()
                onSuccess()
              }}
              className="mt-4 w-full rounded-xl border border-gold-muted/40 bg-gradient-to-r from-jade-deep/80 to-gold-muted/20 py-3 text-sm font-medium text-gold-bright active:scale-95"
            >
              绘卷已成 · 继续旅程
            </button>
          )}
        </div>
      )}

      {phase === 'idle' && (
        <div className="rounded-2xl border border-dashed border-void-600/60 px-4 py-10 text-center">
          <p className="text-xs text-mist-faint">等待照片与幻兽素材...</p>
        </div>
      )}

    </div>
  )
}

export default ScrollGenerator
