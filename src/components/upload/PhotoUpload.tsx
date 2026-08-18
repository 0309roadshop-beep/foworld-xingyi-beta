import { useCallback, useEffect, useRef, useState } from 'react'

/** 状态机：idle → preview → verifying → success */
type Phase = 'idle' | 'preview' | 'verifying' | 'success'

const VERIFY_STEPS: { at: number; text: string }[] = [
  { at: 0, text: '正在连接罗盘...' },
  { at: 35, text: 'AI 视觉特征提取中...' },
  { at: 75, text: '灵纹特征比对中...' },
  { at: 100, text: '核验通过！' },
]

const MAX_WIDTH = 1080
const JPEG_QUALITY = 0.8
const VERIFY_DURATION_MS = 2000

export interface PhotoUploadProps {
  /** 任务标题，如「地道风味补给」 */
  questTitle: string
  /** 任务描述，如「请上传一张与蛋炒饭的合影…」 */
  questDesc: string
  /** 核验成功后回调，返回压缩 JPEG Base64 */
  onSuccess: (base64Data: string) => void
}

/**
 * Canvas 等比压缩 — 最大宽 1080px，JPEG 0.8
 * 避免 iOS 原图直接 Base64 导致内存溢出
 */
export function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('FileReader 读取失败'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('图片解码失败'))
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
          reject(new Error('Canvas 2D 不可用'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

/**
 * PhotoUpload — 通用照片上传与模拟核验（React 版，与 PhotoUpload.vue 逻辑对齐）
 * 内嵌于主控台任务窗口，非全屏遮罩
 */
export function PhotoUpload({ questTitle, questDesc, onSuccess }: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const verifyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const verifyStartRef = useRef(0)

  const [phase, setPhase] = useState<Phase>('idle')
  const [previewUrl, setPreviewUrl] = useState('')
  const [compressedBase64, setCompressedBase64] = useState('')
  const [verifyProgress, setVerifyProgress] = useState(0)
  const [verifyMessage, setVerifyMessage] = useState('')

  const clearVerifyTimer = useCallback(() => {
    if (verifyTimerRef.current) {
      clearInterval(verifyTimerRef.current)
      verifyTimerRef.current = null
    }
  }, [])

  useEffect(() => () => clearVerifyTimer(), [clearVerifyTimer])

  const onUploadPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    fileInputRef.current?.click()
  }

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file?.type.startsWith('image/')) return
    try {
      const base64 = await compressImageFile(file)
      setCompressedBase64(base64)
      setPreviewUrl(base64)
      setPhase('preview')
    } catch (err) {
      console.error('[PhotoUpload] 压缩失败', err)
    }
  }

  const onSubmitPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    if (phase !== 'preview' || !compressedBase64) return

    setPhase('verifying')
    setVerifyProgress(0)
    setVerifyMessage(VERIFY_STEPS[0].text)
    verifyStartRef.current = Date.now()
    clearVerifyTimer()

    verifyTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - verifyStartRef.current
      const pct = Math.min(100, Math.round((elapsed / VERIFY_DURATION_MS) * 100))
      setVerifyProgress(pct)
      const step = [...VERIFY_STEPS].reverse().find((s) => pct >= s.at)
      if (step) setVerifyMessage(step.text)

      if (elapsed >= VERIFY_DURATION_MS) {
        clearVerifyTimer()
        setPhase('success')
        setTimeout(() => onSuccess(compressedBase64), 600)
      }
    }, 50)
  }

  return (
    <div className="w-full px-1 py-2">
      <header className="mb-3 text-center">
        <h3 className="text-base font-medium text-mist">{questTitle}</h3>
        <p className="mt-1 text-xs leading-relaxed text-mist-muted">{questDesc}</p>
      </header>

      {phase === 'idle' && (
        <button
          type="button"
          className="group relative flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-jade-muted/40 bg-void-900/60 px-4 py-10 transition-transform active:scale-95"
          onPointerDown={onUploadPointerDown}
        >
          <span className="pointer-events-none absolute left-3 top-3 h-3 w-3 border-l border-t border-sky/40" />
          <span className="pointer-events-none absolute right-3 top-3 h-3 w-3 border-r border-t border-sky/40" />
          <span className="pointer-events-none absolute bottom-3 left-3 h-3 w-3 border-b border-l border-sky/40" />
          <span className="pointer-events-none absolute bottom-3 right-3 h-3 w-3 border-b border-r border-sky/40" />

          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gold-muted/30 bg-void-800/80 shadow-[0_0_20px_rgba(56,189,248,0.12)] transition group-active:scale-95">
            <svg className="h-7 w-7 text-gold-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
            </svg>
          </div>
          <p className="text-sm text-mist">点击唤起相机或相册</p>
          <p className="text-[10px] text-mist-faint">支持 JPG / PNG，自动压缩至 1080px</p>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFileChange}
      />

      {phase !== 'idle' && (
        <div className="relative w-full overflow-hidden rounded-2xl border border-void-600/70 bg-void-900/80">
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-void-950">
            <img src={previewUrl} alt="上传预览" className="h-full w-full object-cover" />

            {phase === 'verifying' && (
              <div className="pointer-events-none absolute inset-0 bg-void-950/45">
                <div className="photo-scan-track">
                  <div className="photo-upload-scan bg-gradient-to-r from-transparent via-jade-bright to-transparent shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-void-950/90 to-transparent px-3 pb-3 pt-8">
                  <p className="mb-1.5 text-center text-xs text-jade-bright">{verifyMessage}</p>
                  <div className="h-1.5 overflow-hidden rounded-full bg-void-700/80">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-jade-deep to-jade-bright transition-[width] duration-100"
                      style={{ width: `${verifyProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {phase === 'success' && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-jade-deep/20">
                <div className="photo-upload-success-pulse absolute inset-0 bg-jade-bright/10" />
                <div className="relative flex flex-col items-center gap-2">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-spirit bg-spirit-dim/40 shadow-[0_0_30px_rgba(52,211,153,0.5)]">
                    <svg className="h-8 w-8 text-spirit" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-spirit">灵源核验通过</p>
                </div>
              </div>
            )}
          </div>

          {phase === 'preview' && (
            <div className="p-3">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-jade-muted/40 bg-gradient-to-r from-jade-deep/80 to-jade-muted/30 py-3 text-sm font-medium text-mist transition-transform active:scale-95 disabled:opacity-50"
                onPointerDown={onSubmitPointerDown}
              >
                <svg className="h-4 w-4 text-jade-bright" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                提交灵源核验
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes photo-upload-success-glow {
          0% { opacity: 0; transform: scale(0.95); }
          50% { opacity: 1; }
          100% { opacity: 0.85; transform: scale(1); }
        }
        .photo-upload-success-pulse {
          animation: photo-upload-success-glow 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  )
}

export default PhotoUpload
