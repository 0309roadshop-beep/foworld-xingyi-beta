import { useCallback, useEffect, useRef, useState } from 'react'
import { compressImageFile } from '../upload/PhotoUpload'

const WATERMARK = 'FOWORLD · 幽邃地心 · 重见天日'
const MAX_WIDTH = 1080
const JPEG_QUALITY = 0.82

type Phase = 'idle' | 'preview' | 'verifying' | 'success'

const VERIFY_STEPS = [
  { at: 0, text: '地脉信号恢复中…' },
  { at: 40, text: '烙印探洞水印…' },
  { at: 80, text: '打卡核验通过！' },
]

async function compressWithWatermark(file: File): Promise<string> {
  const base64 = await compressImageFile(file)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onerror = () => reject(new Error('水印合成失败'))
    img.onload = () => {
      let { width, height } = img
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width)
        width = MAX_WIDTH
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas 不可用'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      const pad = Math.max(12, Math.round(width * 0.02))
      const fontSize = Math.max(14, Math.round(width * 0.028))
      ctx.font = `600 ${fontSize}px system-ui, sans-serif`
      ctx.textAlign = 'right'
      ctx.textBaseline = 'bottom'
      ctx.strokeStyle = 'rgba(0,0,0,0.65)'
      ctx.lineWidth = 3
      ctx.fillStyle = 'rgba(245,215,110,0.92)'
      ctx.strokeText(WATERMARK, width - pad, height - pad)
      ctx.fillText(WATERMARK, width - pad, height - pad)
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
    }
    img.src = base64
  })
}

export interface CaveExitPhotoProps {
  onComplete?: () => void
}

/** 重见天日 — 出洞打卡照片（带水印） */
export function CaveExitPhoto({ onComplete }: CaveExitPhotoProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const verifyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [phase, setPhase] = useState<Phase>('idle')
  const [previewUrl, setPreviewUrl] = useState('')
  const [verifyProgress, setVerifyProgress] = useState(0)
  const [verifyMessage, setVerifyMessage] = useState('')

  const clearVerifyTimer = useCallback(() => {
    if (verifyTimerRef.current) {
      clearInterval(verifyTimerRef.current)
      verifyTimerRef.current = null
    }
  }, [])

  useEffect(() => () => clearVerifyTimer(), [clearVerifyTimer])

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file?.type.startsWith('image/')) return
    try {
      const base64 = await compressWithWatermark(file)
      setPreviewUrl(base64)
      setPhase('preview')
    } catch (err) {
      console.error('[CaveExitPhoto]', err)
    }
  }

  const startVerify = () => {
    setPhase('verifying')
    setVerifyProgress(0)
    const start = Date.now()
    verifyTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - start
      const pct = Math.min(100, (elapsed / 1800) * 100)
      setVerifyProgress(pct)
      const step = [...VERIFY_STEPS].reverse().find((s) => pct >= s.at)
      if (step) setVerifyMessage(step.text)
      if (pct >= 100) {
        clearVerifyTimer()
        setPhase('success')
        window.setTimeout(() => onComplete?.(), 800)
      }
    }, 50)
  }

  return (
    <div className="w-full">
      <p className="mb-3 text-center text-xs text-mist-muted">
        重见天日！拍摄一张出洞留念，系统将烙印「幽邃地心」水印
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFileChange}
      />

      {phase === 'idle' && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mx-auto flex min-h-[3.5rem] w-full max-w-sm items-center justify-center rounded-xl border border-sky-bright/35 bg-sky-deep/15 text-sm text-sky-bright active:bg-sky-deep/25"
        >
          上传出洞打卡照
        </button>
      )}

      {phase === 'preview' && previewUrl && (
        <div className="mx-auto max-w-sm">
          <img
            src={previewUrl}
            alt="出洞打卡预览"
            className="mb-3 w-full rounded-xl border border-gold-muted/25 object-cover"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setPhase('idle')
                setPreviewUrl('')
              }}
              className="flex-1 rounded-xl border border-mist-faint/25 py-2.5 text-xs text-mist-muted"
            >
              重选
            </button>
            <button
              type="button"
              onClick={startVerify}
              className="flex-1 rounded-xl border border-gold-muted/40 bg-gold-muted/10 py-2.5 text-xs font-medium text-gold-bright"
            >
              确认上传
            </button>
          </div>
        </div>
      )}

      {phase === 'verifying' && (
        <div className="mx-auto max-w-sm text-center">
          <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-void-800">
            <div
              className="h-full rounded-full bg-sky-bright transition-[width] duration-100"
              style={{ width: `${verifyProgress}%` }}
            />
          </div>
          <p className="text-xs text-sky-bright/90">{verifyMessage}</p>
        </div>
      )}

      {phase === 'success' && (
        <p className="text-center text-sm text-spirit">出洞打卡已归档，地脉印记留存。</p>
      )}
    </div>
  )
}

export default CaveExitPhoto
