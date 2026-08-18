import { motion } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { ClueUnlockModal } from '../clue/ClueUnlockModal'
import { CameraBackButton } from './CameraBackButton'
import { CameraPermissionGate } from './CameraPermissionGate'
import { DAY2_CLUE_XIANTIAN } from '../../config/day2Clues'
import { useGameStore } from '../../store/gameStore'
import {
  bindStreamToVideo,
  describeCameraError,
  getCameraSupport,
  openCameraStream,
  stopMediaStream,
} from '../../utils/cameraAccess'

const HOLD_MS = 3000

export interface ZhongXingARProps {
  onSuccess?: () => void
  onError?: (message: string) => void
  onCancel?: () => void
  onClose?: () => void
}

type Phase = 'prompt' | 'loading' | 'live' | 'success'

/** 众星捧月地貌：双层五峰线框 — 远景层 + 近景层全息纵深 */
function ZhongXingOverlay({
  className,
  resonating,
}: {
  className?: string
  resonating: boolean
}) {
  const stroke = resonating ? '#00F5FF' : 'rgba(0, 245, 255, 0.88)'
  const gridStroke = resonating ? 'rgba(0, 245, 255, 0.35)' : 'rgba(0, 245, 255, 0.18)'

  return (
    <svg
      viewBox="0 0 320 360"
      className={`zhongxing-wireframe ${resonating ? 'zhongxing-wireframe--active' : ''} ${className ?? ''}`}
      fill="none"
      aria-hidden
    >
      {/* 高维地理探测网格 */}
      <g opacity={resonating ? 0.55 : 0.38}>
        {[72, 108, 144, 180, 216, 248].map((y) => (
          <line
            key={`h-${y}`}
            x1="16"
            y1={y}
            x2="304"
            y2={y}
            stroke={gridStroke}
            strokeWidth="0.8"
            strokeDasharray="4 8"
          />
        ))}
        {[48, 96, 160, 224, 272].map((x) => (
          <line
            key={`v-${x}`}
            x1={x}
            y1="248"
            x2={x}
            y2="308"
            stroke={gridStroke}
            strokeWidth="0.6"
            strokeDasharray="3 7"
          />
        ))}
        <line
          x1="16"
          y1="300"
          x2="304"
          y2="300"
          stroke={stroke}
          strokeWidth="1.2"
          opacity="0.9"
        />
      </g>

      {/* 水平扫描线 */}
      <g className="zhongxing-scanlines" opacity={resonating ? 0.7 : 0.45}>
        <line x1="0" y1="278" x2="320" y2="278" stroke="#00F5FF" strokeWidth="0.6" strokeDasharray="2 10" />
        <line x1="0" y1="288" x2="320" y2="288" stroke="#00F5FF" strokeWidth="0.5" strokeDasharray="2 12" />
        <line x1="0" y1="296" x2="320" y2="296" stroke="#00F5FF" strokeWidth="0.4" strokeDasharray="2 14" />
      </g>

      {/* 双层五峰 — 远景遮挡 + 近景主体 */}
      <g transform="translate(16, 185)">
        <svg
          width="288"
          height="115"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-full w-full overflow-visible"
          aria-hidden
        >
          <line x1="0" y1="90" x2="100" y2="90" stroke="#00F5FF" strokeWidth="0.5" opacity="0.4" />
          <path
            d="M 10 90 Q 20 30 35 90 M 65 90 Q 80 30 90 90"
            fill="none"
            stroke={stroke}
            strokeWidth="1"
            opacity="0.4"
            strokeDasharray="2 2"
            strokeLinecap="round"
          />
          <path
            d="
              M 2 90 Q 15 20 28 90
              M 24 90 Q 36 40 48 90
              M 42 90 Q 50 15 58 90
              M 52 90 Q 64 40 76 90
              M 72 90 Q 85 20 98 90
            "
            fill="none"
            stroke={stroke}
            strokeWidth={resonating ? 1.8 : 1.5}
            strokeDasharray={resonating ? 'none' : '4 2'}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-pulse"
            style={{ filter: 'drop-shadow(0 0 8px rgba(0, 245, 255, 0.9))' }}
          />
        </svg>
      </g>

      <text
        x="160"
        y="340"
        textAnchor="middle"
        fill={stroke}
        fontSize="11"
        letterSpacing="4"
        opacity="0.9"
      >
        众星捧月
      </text>
    </svg>
  )
}

export function ZhongXingAR({ onSuccess, onError, onCancel, onClose }: ZhongXingARProps) {
  const { unlockClue } = useGameStore()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const holdStartRef = useRef(0)
  const holdRafRef = useRef(0)
  const successFiredRef = useRef(false)

  const [phase, setPhase] = useState<Phase>('prompt')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isResonating, setIsResonating] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0)
  const [showClueModal, setShowClueModal] = useState(false)

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

  useEffect(() => {
    return () => {
      cancelAnimationFrame(holdRafRef.current)
      stopStream()
    }
  }, [stopStream])

  const completeResonance = useCallback(() => {
    if (successFiredRef.current) return
    successFiredRef.current = true
    cancelAnimationFrame(holdRafRef.current)
    setIsResonating(false)
    setHoldProgress(1)
    setPhase('success')
    unlockClue(DAY2_CLUE_XIANTIAN.id)
    setShowClueModal(true)
  }, [unlockClue])

  const tickHold = useCallback(
    (now: number) => {
      const elapsed = now - holdStartRef.current
      const progress = Math.min(1, elapsed / HOLD_MS)
      setHoldProgress(progress)
      if (progress >= 1) {
        completeResonance()
        return
      }
      holdRafRef.current = requestAnimationFrame(tickHold)
    },
    [completeResonance],
  )

  const startHold = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.preventDefault()
      if (phase !== 'live' || cameraError || successFiredRef.current) return
      cancelAnimationFrame(holdRafRef.current)
      setIsResonating(true)
      setHoldProgress(0)
      holdStartRef.current = performance.now()
      holdRafRef.current = requestAnimationFrame(tickHold)
    },
    [phase, cameraError, tickHold],
  )

  const endHold = useCallback(() => {
    cancelAnimationFrame(holdRafRef.current)
    if (successFiredRef.current) return
    setIsResonating(false)
    setHoldProgress(0)
  }, [])

  const handleModalConfirm = useCallback(() => {
    setShowClueModal(false)
    onSuccess?.()
  }, [onSuccess])

  const handleClose = useCallback(() => {
    cancelAnimationFrame(holdRafRef.current)
    stopStream()
    const dismiss = onCancel ?? onClose
    dismiss?.()
  }, [onCancel, onClose, stopStream])

  return (
    <div
      className="game-container flex items-center justify-center bg-black"
      style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      <div
        className="ar-viewfinder relative mx-auto h-full w-full max-w-[calc(100dvh*9/16)] overflow-hidden bg-black"
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
                isResonating
                  ? { scale: [1, 1.03, 1], opacity: 1 }
                  : { scale: 1, opacity: 1 }
              }
              transition={{ duration: 1.4, repeat: isResonating ? Infinity : 0 }}
              className={`relative h-[88%] w-[88%] transition-[filter] duration-500 ${
                isResonating
                  ? 'drop-shadow-[0_0_28px_rgba(0,245,255,0.75)]'
                  : 'drop-shadow-[0_0_8px_rgba(0,245,255,0.8)]'
              }`}
            >
              <ZhongXingOverlay className="h-full w-full" resonating={isResonating} />
              {isResonating && (
                <div className="scan-sweep-track">
                  <div className="scan-sweep-line" style={{ animationDuration: '1.8s' }}>
                    <div className="scan-sweep-line__bar bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent shadow-[0_0_12px_rgba(56,189,248,0.65)]" />
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
            onCancel={handleClose}
          />
        )}

        <CameraBackButton onClick={handleClose} />

        {phase === 'live' && !cameraError && (
          <div className="game-action-bar px-4">
            <div className="rounded-2xl bg-gradient-to-t from-black/85 via-black/50 to-transparent px-1 pb-1 pt-10">
            <p className="mb-3 text-center text-[11px] tracking-wide text-white/70">
              将取景框对准众星捧月地貌，长按下方按钮完成灵韵共鸣
            </p>
            <button
              type="button"
              onPointerDown={startHold}
              onPointerUp={endHold}
              onPointerLeave={endHold}
              onPointerCancel={endHold}
              className="interactive-area relative w-full overflow-hidden rounded-2xl border border-white/25 bg-white/10 py-4 backdrop-blur-sm"
              style={{ touchAction: 'none' }}
            >
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500/35 to-jade-bright/45 transition-[width] duration-75"
                style={{ width: `${holdProgress * 100}%` }}
              />
              <span className="relative z-[1] text-sm font-medium tracking-wide text-white">
                {isResonating
                  ? `灵韵共鸣中… ${Math.round(holdProgress * 100)}%`
                  : '进行灵韵共鸣（长按 3 秒）'}
              </span>
            </button>
            </div>
          </div>
        )}

        <ClueUnlockModal
          open={showClueModal}
          clue={{
            artifactName: DAY2_CLUE_XIANTIAN.artifactName,
            hint: DAY2_CLUE_XIANTIAN.hint,
            successTitle: '共鸣成功！',
            accent: 'jade',
          }}
          onConfirm={handleModalConfirm}
        />
      </div>
    </div>
  )
}

export default ZhongXingAR
