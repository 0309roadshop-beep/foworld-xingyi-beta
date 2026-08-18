import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ModalOverlay } from '../ui/ModalOverlay'
import { Bike, Loader2, MapPin, ShieldAlert, Sparkles, Wind } from 'lucide-react'
import {
  calculateDistance,
  DEST_COORDS,
  WIND_RIDING_ARRIVAL_RADIUS_M,
  WIND_RIDING_DEFAULTS,
  WIND_RIDING_GEO_OPTIONS,
} from '../../config/windRidingConfig'

type RidePhase = 'ready' | 'riding' | 'storm' | 'modal'

const GPS_FALLBACK_TOAST = '灵能磁场干扰，无法定位轨迹，请手动确认抵达'

export interface WindRidingProps {
  toLocation?: string
  affinityReward?: string
  backgroundImage?: string
  onComplete?: () => void
}

const WIND_LINES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${(i * 17 + 8) % 92}%`,
  delay: `${(i * 0.31) % 2.4}s`,
  duration: `${1.8 + (i % 5) * 0.35}s`,
  height: `${48 + (i % 4) * 22}px`,
  opacity: 0.22 + (i % 3) * 0.12,
}))

export function WindRiding({
  toLocation = WIND_RIDING_DEFAULTS.toLocation,
  affinityReward = WIND_RIDING_DEFAULTS.affinityReward,
  backgroundImage = WIND_RIDING_DEFAULTS.backgroundImage,
  onComplete,
}: WindRidingProps) {
  const [phase, setPhase] = useState<RidePhase>('ready')
  const [gpsFallback, setGpsFallback] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [totalDistance, setTotalDistance] = useState<number | null>(null)
  const [currentDistance, setCurrentDistance] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const doneRef = useRef(false)
  const arrivedRef = useRef(false)
  const watchIdRef = useRef<number | null>(null)
  const toastTimerRef = useRef<number | null>(null)

  const clearWatch = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current != null) {
      window.clearTimeout(toastTimerRef.current)
    }
    setToast(message)
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null)
      toastTimerRef.current = null
    }, 4200)
  }, [])

  const progress = useMemo(() => {
    if (gpsFallback || totalDistance == null || currentDistance == null) return 0
    if (totalDistance <= 0) return 100
    return Math.max(0, Math.min(100, 100 - (currentDistance / totalDistance) * 100))
  }, [gpsFallback, totalDistance, currentDistance])

  const triggerArrive = useCallback(() => {
    if (arrivedRef.current) return
    arrivedRef.current = true
    clearWatch()
    setPhase('storm')
    window.setTimeout(() => setPhase('modal'), 1100)
  }, [clearWatch])

  const enterFallback = useCallback(() => {
    clearWatch()
    setGpsFallback(true)
    setPhase('riding')
    showToast(GPS_FALLBACK_TOAST)
  }, [clearWatch, showToast])

  const handlePositionUpdate = useCallback(
    (lat: number, lng: number) => {
      const dist = calculateDistance(lat, lng, DEST_COORDS.latitude, DEST_COORDS.longitude)
      setCurrentDistance(dist)
      if (dist <= WIND_RIDING_ARRIVAL_RADIUS_M) {
        triggerArrive()
      }
    },
    [triggerArrive],
  )

  const startGpsWatch = useCallback(() => {
    if (!navigator.geolocation) {
      enterFallback()
      return
    }

    clearWatch()
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        handlePositionUpdate(position.coords.latitude, position.coords.longitude)
      },
      () => {
        enterFallback()
      },
      WIND_RIDING_GEO_OPTIONS,
    )
  }, [clearWatch, enterFallback, handlePositionUpdate])

  const startRide = useCallback(() => {
    if (isLocating || phase !== 'ready') return
    setIsLocating(true)

    if (!navigator.geolocation) {
      setIsLocating(false)
      enterFallback()
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const total = calculateDistance(
          latitude,
          longitude,
          DEST_COORDS.latitude,
          DEST_COORDS.longitude,
        )
        setTotalDistance(total)
        setCurrentDistance(total)
        setIsLocating(false)
        setPhase('riding')
        startGpsWatch()
      },
      () => {
        setIsLocating(false)
        enterFallback()
      },
      WIND_RIDING_GEO_OPTIONS,
    )
  }, [enterFallback, isLocating, phase, startGpsWatch])

  const finish = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    clearWatch()
    onComplete?.()
  }, [clearWatch, onComplete])

  useEffect(() => {
    return () => {
      clearWatch()
      if (toastTimerRef.current != null) {
        window.clearTimeout(toastTimerRef.current)
      }
    }
  }, [clearWatch])

  const isRiding = phase === 'riding'
  const showMotionBg = isRiding || phase === 'storm' || phase === 'modal'

  return (
    <div
      className="wind-riding relative mx-auto flex w-full max-w-[min(100%,22rem)] flex-col overflow-hidden rounded-xl border border-sky-400/25 bg-void-950"
      style={{ aspectRatio: '9 / 16', minHeight: 'min(68dvh, 600px)' }}
    >
      {/* 动态模糊风景底图 */}
      <div
        className={`wind-riding-bg absolute inset-0 bg-cover bg-center transition-all duration-700 ${
          showMotionBg ? 'wind-riding-bg--motion' : ''
        }`}
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-void-950/55 via-void-950/25 to-void-950/75" />

      {/* 风场粒子 */}
      <div className="wind-riding-particles pointer-events-none absolute inset-0 overflow-hidden">
        {WIND_LINES.map((line) => (
          <span
            key={line.id}
            className="wind-riding-streak absolute bottom-[-20%] w-px rounded-full bg-white"
            style={{
              left: line.left,
              height: line.height,
              opacity: line.opacity,
              animationDelay: line.delay,
              animationDuration: line.duration,
            }}
          />
        ))}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute left-3 right-3 top-3 z-50 rounded-xl border border-amber-400/35 bg-amber-950/88 px-3 py-2.5 text-center text-[11px] leading-relaxed text-amber-50 shadow-lg backdrop-blur-sm"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 信息区 */}
      <div className="relative z-20 px-4 pt-4">
        <div className="rounded-xl border border-white/15 bg-black/45 px-3 py-2.5 backdrop-blur-sm">
          <p className="mb-1 flex items-center gap-1.5 text-[10px] tracking-widest text-sky-200/80">
            <Wind className="h-3 w-3" />
            追风骑行
          </p>
          <p className="flex items-center gap-1.5 text-xs text-mist">
            <MapPin className="h-3 w-3 text-gold-bright/80" />
            <span className="text-gold-bright">目标：{toLocation}</span>
          </p>
        </div>
      </div>

      {/* 阶段交互 */}
      <div className="relative z-20 flex flex-1 flex-col items-center justify-end px-4 pb-10 pt-6">
        {phase === 'ready' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full max-w-xs flex-col items-center gap-4"
          >
            <div className="w-full rounded-xl border border-amber-400/25 bg-amber-950/40 px-4 py-3 backdrop-blur-sm">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] tracking-widest text-amber-200/85">
                <ShieldAlert className="h-3 w-3 shrink-0" />
                安全提示
              </p>
              <ul className="space-y-1.5 text-[11px] leading-relaxed text-amber-50/90">
                <li>骑得太快，万峰林的风元素会变得狂躁难驯。</li>
                <li>请缓行慢行，留意前方路况与来往车辆。</li>
                <li>感受山风的同时，也要注意安全哟～</li>
              </ul>
            </div>
            <button
              type="button"
              disabled={isLocating}
              onPointerDown={(e) => {
                e.preventDefault()
                startRide()
              }}
              className="flex w-full flex-col items-center gap-2 rounded-2xl border border-sky-300/35 bg-sky-950/55 px-5 py-5 backdrop-blur-md disabled:opacity-70"
              style={{ touchAction: 'none' }}
            >
              {isLocating ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-sky-200" />
                  <span className="text-sm font-medium text-white">正在锁定起点...</span>
                </>
              ) : (
                <>
                  <Bike className="h-8 w-8 text-sky-200" />
                  <span className="text-sm font-medium text-white">我已乘上电瓶车</span>
                  <span className="text-xs text-sky-200/80">开启迎风骑行</span>
                </>
              )}
            </button>
          </motion.div>
        )}

        {isRiding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex w-full max-w-xs flex-1 flex-col gap-5"
          >
            <div className="flex flex-1 flex-col items-center justify-center gap-5">
              {!gpsFallback && (
                <div className="wind-riding-progress w-full">
                  <p className="mb-3 text-center text-sm leading-relaxed text-sky-50">
                    距离跳花广场古榕树还有：
                    <span className="mx-1 text-lg font-semibold text-cyan-200">
                      {currentDistance != null ? Math.round(currentDistance) : '--'}
                    </span>
                    米
                  </p>
                  <div className="relative h-4 overflow-hidden rounded-full border border-sky-300/35 bg-sky-950/70 shadow-[inset_0_0_12px_rgba(15,23,42,0.8)]">
                    <div
                      className="wind-riding-progress-fill absolute inset-y-0 left-0 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                    <div className="wind-riding-progress-wind pointer-events-none absolute inset-0" />
                  </div>
                  <p className="mt-2 text-center text-[10px] tracking-widest text-sky-200/65">
                    追风进度 {Math.round(progress)}%
                  </p>
                </div>
              )}

              <div className="wind-riding-status relative w-full overflow-hidden rounded-2xl border border-sky-300/45 bg-sky-950/55 px-5 py-7 backdrop-blur-md">
                <span className="wind-riding-sweep pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <span className="wind-riding-sweep wind-riding-sweep--delay pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-cyan-200/15 to-transparent" />
                <div className="relative flex flex-col items-center gap-3">
                  <div className="wind-riding-icon-wrap flex h-16 w-16 items-center justify-center rounded-full border border-cyan-300/35 bg-cyan-950/45">
                    <Wind className="wind-riding-icon h-9 w-9 text-cyan-200" />
                  </div>
                  <p className="wind-riding-status-text text-center text-base font-medium tracking-[0.18em] text-sky-50">
                    正在感受万峰林的风
                    <span className="wind-riding-dots inline-flex w-[1.4em] justify-start">
                      <span>.</span>
                      <span>.</span>
                      <span>.</span>
                    </span>
                  </p>
                  <p className="text-center text-xs leading-relaxed text-sky-200/75">
                    {gpsFallback ? '请抵达后手动确认' : '缓行慢行，让山风与你同频'}
                  </p>
                </div>
              </div>
            </div>

            {gpsFallback && (
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault()
                  triggerArrive()
                }}
                className="w-full shrink-0 rounded-2xl border border-jade-bright/40 bg-jade-deep/45 px-5 py-4 text-sm font-medium text-jade-bright backdrop-blur-sm"
                style={{ touchAction: 'none' }}
              >
                我已手动抵达
              </button>
            )}
          </motion.div>
        )}
      </div>

      {/* 开发者测试后门 */}
      {phase !== 'storm' && phase !== 'modal' && (
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault()
            triggerArrive()
          }}
          className="absolute bottom-1.5 right-2 z-30 rounded px-1.5 py-0.5 text-[9px] text-white/25 transition-colors hover:text-white/45"
          style={{ touchAction: 'none' }}
        >
          [Debug: 强制抵达]
        </button>
      )}

      {/* 青色风暴收拢 */}
      <AnimatePresence>
        {phase === 'storm' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="wind-riding-storm pointer-events-none absolute inset-0 z-40"
          />
        )}
      </AnimatePresence>

      <ModalOverlay open={phase === 'modal'}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="w-full rounded-2xl border border-cyan-400/40 bg-void-900/96 p-5 shadow-[0_0_56px_rgba(34,211,238,0.28)]"
        >
          <div className="mb-4 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-cyan-300/45 bg-cyan-950/50">
              <Wind className="h-7 w-7 text-cyan-300" />
            </div>
            <p className="text-base font-medium text-cyan-100">追风之旅完成！</p>
            <p className="mt-3 text-sm leading-relaxed text-mist-muted">恭喜获得被动增益：</p>
            <p className="mt-2 text-base font-semibold text-jade-bright">【{affinityReward}】</p>
            <p className="mt-3 text-xs leading-relaxed text-mist-faint">
              此能力将在未来的高空试炼中发挥奇效
            </p>
          </div>
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault()
              finish()
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600/80 to-teal-600/80 py-3.5 text-sm font-medium text-white ring-1 ring-cyan-300/35"
            style={{ touchAction: 'none' }}
          >
            <Sparkles className="h-4 w-4" />
            继续寻灵
          </button>
        </motion.div>
      </ModalOverlay>
    </div>
  )
}

export default WindRiding
