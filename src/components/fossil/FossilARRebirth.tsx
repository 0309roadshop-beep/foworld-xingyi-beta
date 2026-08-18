import { AnimatePresence, motion } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { ScanLine, Sparkles } from 'lucide-react'
import { CameraBackButton } from '../camera/CameraBackButton'
import { CameraPermissionGate } from '../camera/CameraPermissionGate'
import {
  bindStreamToVideo,
  describeCameraError,
  getCameraSupport,
  openCameraStream,
  stopMediaStream,
} from '../../utils/cameraAccess'

type Phase = 'prompt' | 'loading' | 'live' | 'frozen' | 'skeleton' | 'rebirth' | 'success'

const SUCCESS_DELAY_MS = 2200

function playScanSound() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(180, now)
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.35)
    gain.gain.setValueAtTime(0.18, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.48)
    window.setTimeout(() => void ctx.close(), 520)
  } catch {
    /* ignore */
  }
}

export interface FossilARRebirthProps {
  skeletonImage?: string
  spiritImage?: string
  spiritName?: string
  description?: string
  onSuccess?: () => void
  onCancel?: () => void
  onClose?: () => void
}

export function FossilARRebirth({
  skeletonImage = '/assets/fossil-keichousaurus.png',
  spiritImage = '/assets/fossil-keichousaurus.png',
  spiritName = '山河幻兽',
  description = '对准展柜骨架，点击扫描识别，见证灵纹重塑。',
  onSuccess,
  onCancel,
  onClose,
}: FossilARRebirthProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const successFiredRef = useRef(false)
  const timersRef = useRef<number[]>([])

  const [phase, setPhase] = useState<Phase>('prompt')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [flash, setFlash] = useState(false)
  const [frozenDataUrl, setFrozenDataUrl] = useState<string | null>(null)

  const stopStream = useCallback(() => {
    stopMediaStream(streamRef.current)
    streamRef.current = null
  }, [])

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id))
    timersRef.current = []
  }, [])

  const startCamera = useCallback(async () => {
    stopStream()
    setCameraError(null)
    setFrozenDataUrl(null)
    successFiredRef.current = false
    clearTimers()

    const support = getCameraSupport()
    if (!support.ok) {
      const msg = support.hint ? `${support.message}（${support.hint}）` : support.message
      setCameraError(msg)
      setPhase('prompt')
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
      setCameraError(describeCameraError(err))
      setPhase('prompt')
    }
  }, [stopStream, clearTimers])

  useEffect(() => {
    return () => {
      clearTimers()
      stopStream()
    }
  }, [stopStream, clearTimers])

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms)
    timersRef.current.push(id)
  }, [])

  const runRebirthSequence = useCallback(() => {
    schedule(() => setPhase('skeleton'), 350)
    schedule(() => setPhase('rebirth'), 1900)
    schedule(() => setPhase('success'), 3600)
    schedule(() => {
      if (successFiredRef.current) return
      successFiredRef.current = true
      onSuccess?.()
    }, SUCCESS_DELAY_MS)
  }, [schedule, onSuccess])

  const handleClose = useCallback(() => {
    clearTimers()
    stopStream()
    const dismiss = onCancel ?? onClose
    dismiss?.()
  }, [clearTimers, onCancel, onClose, stopStream])

  const handleScan = useCallback(() => {
    if (phase !== 'live') return

    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    playScanSound()
    setFlash(true)
    window.setTimeout(() => setFlash(false), 180)

    const w = video.videoWidth || 640
    const h = video.videoHeight || 480
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, w, h)
    setFrozenDataUrl(canvas.toDataURL('image/jpeg', 0.88))
    stopStream()
    setPhase('frozen')
    runRebirthSequence()
  }, [phase, stopStream, runRebirthSequence])

  const handleScanPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      e.preventDefault()
      handleScan()
    },
    [handleScan],
  )

  const showCamera = phase === 'loading' || phase === 'live'
  const showFrozen = frozenDataUrl && phase !== 'loading' && phase !== 'live'

  return (
    <div className="w-full">
      <p className="mb-3 text-center text-xs leading-relaxed text-mist-muted">{description}</p>

      <div className="ar-viewfinder interactive-area relative mx-auto w-full overflow-hidden rounded-xl border border-jade/25 bg-void-950 shadow-glow"
        style={{ minHeight: 'min(58dvh, 440px)', maxHeight: 'min(68dvh, 520px)' }}
      >
        {(phase === 'prompt' || cameraError) ? (
          <div className="relative h-full min-h-[min(58dvh,440px)]">
            <CameraPermissionGate
              error={cameraError}
              loading={phase === 'loading'}
              title="开启化石扫描"
              onEnable={() => void startCamera()}
              onCancel={handleClose}
            />
          </div>
        ) : (
          <>
            {showCamera && (
              <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full object-cover"
                playsInline
                muted
                autoPlay
              />
            )}

            {showFrozen && (
              <img
                src={frozenDataUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}

            <canvas ref={canvasRef} className="hidden" aria-hidden />

            {/* 扫描框 */}
            {(phase === 'live' || phase === 'frozen' || phase === 'skeleton') && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={
                    phase === 'live'
                      ? { scale: [1, 1.02, 1], opacity: [0.85, 1, 0.85] }
                      : { scale: 1, opacity: 1 }
                  }
                  transition={phase === 'live' ? { repeat: Infinity, duration: 2.2 } : { duration: 0.3 }}
                  className="relative h-[58%] w-[78%] max-w-sm"
                >
                  <div className="absolute inset-0 rounded-2xl border-2 border-jade-bright/70 shadow-[0_0_24px_rgba(45,212,168,0.35)]" />
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] tracking-[0.25em] text-jade-bright">
                    化石识别扫描框
                  </span>
                  <span className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-gold-bright" />
                  <span className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-gold-bright" />
                  <span className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-gold-bright" />
                  <span className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-gold-bright" />
                  {phase !== 'live' && (
                    <div className="scan-sweep-track">
                      <div
                        className="scan-sweep-line scan-sweep-line--tight left-4 right-4"
                        style={{ animationDuration: '2.4s' }}
                      >
                        <div className="scan-sweep-line__bar h-0.5 bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>
            )}

            {/* 骨架浮现 */}
            {(phase === 'skeleton' || phase === 'rebirth') && (
              <motion.div
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: phase === 'skeleton' ? 1 : 0 }}
                transition={{ duration: phase === 'rebirth' ? 1.1 : 0.85, ease: 'easeInOut' }}
              >
                <motion.img
                  src={skeletonImage}
                  alt=""
                  className="h-[62%] w-auto max-w-[85%] object-contain"
                  style={{
                    filter:
                      'brightness(0.55) contrast(1.15) sepia(0.35) drop-shadow(0 0 28px rgba(45,212,168,0.75))',
                    mixBlendMode: 'screen',
                  }}
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: phase === 'rebirth' ? 1.04 : 1 }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                />
              </motion.div>
            )}

            {/* 幻兽 cross-fade */}
            {(phase === 'rebirth' || phase === 'success') && (
              <motion.div
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.4, ease: 'easeInOut' }}
              >
                <motion.img
                  src={spiritImage}
                  alt=""
                  className="h-[68%] w-auto max-w-[88%] object-contain"
                  style={{
                    filter:
                      'brightness(1.15) saturate(1.2) drop-shadow(0 0 36px rgba(253,230,138,0.85))',
                    mixBlendMode: 'screen',
                  }}
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                />
              </motion.div>
            )}

            {/* 光效炸开 */}
            <AnimatePresence>
              {(phase === 'success' || phase === 'rebirth') && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: phase === 'success' ? 0.85 : 0.45, scale: 1.8 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2 }}
                  className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(253,230,138,0.55),transparent_65%)]"
                />
              )}
            </AnimatePresence>

            {flash && (
              <div className="pointer-events-none absolute inset-0 z-50 bg-white/90" />
            )}

            {phase === 'loading' && (
              <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 bg-void-950/80">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-jade/30 border-t-jade-bright" />
                <span className="text-xs text-mist-muted">正在启动后置摄像头…</span>
              </div>
            )}

            {phase === 'live' && (
              <div className="absolute inset-x-0 bottom-0 z-30 flex justify-center bg-gradient-to-t from-void-950/90 via-void-950/50 to-transparent px-4 pb-4 pt-10">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-2xl border border-jade-bright/50 bg-jade-deep/40 px-6 py-3 text-sm font-medium text-jade-bright shadow-glow active:scale-[0.98]"
                  onPointerDown={handleScanPointerDown}
                >
                  <ScanLine className="h-4 w-4" />
                  扫描识别
                </button>
              </div>
            )}

            <AnimatePresence>
              {phase === 'success' && (
                <motion.div
                  initial={{ opacity: 0, y: 16, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="pointer-events-none absolute inset-x-0 bottom-6 z-50 flex justify-center px-4"
                >
                  <div className="rounded-2xl border border-gold-bright/60 bg-void-950/85 px-6 py-4 text-center shadow-glow-gold backdrop-blur-md">
                    <div className="mb-1 flex items-center justify-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-gold-bright" />
                      <p className="text-base font-semibold text-gold-bright">
                        【{spiritName}】已重塑！
                      </p>
                      <Sparkles className="h-4 w-4 text-gold-bright" />
                    </div>
                    <p className="text-[11px] text-cyan-200/90">灵纹重塑完成，山河幻兽降临现世</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {phase !== 'success' && (
              <CameraBackButton onClick={handleClose} label="取消" />
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default FossilARRebirth
