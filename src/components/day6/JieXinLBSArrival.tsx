import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Crosshair, MapPin } from 'lucide-react'
import { GeoController } from '../geo/GeoController'
import { MOCK_COORDS } from '../../mock/data'
import { formatDistance, getDistanceMeters } from '../../utils/geo'

const ARRIVAL_RADIUS_M = 80
const DEFAULT_TARGET = { lat: 25.09, lng: 104.9 }

export interface JieXinLBSArrivalProps {
  targetCoords?: { lat: number; lng: number }
  /** 玩家授权开启红尘灵视 — 由父级挂载 RedDustScanner */
  onStartScanning: () => void
}

function NavRadar({ near }: { near: boolean }) {
  return (
    <div className="relative flex h-48 w-48 items-center justify-center">
      <div
        className={`absolute inset-0 rounded-full border ${
          near ? 'border-cyan-500/40' : 'border-cyan-500/15'
        }`}
      />
      <div className="absolute inset-[14%] rounded-full border border-dashed border-cyan-500/20" />
      <div
        className="absolute inset-[26%] rounded-full border border-cyan-500/10"
        style={{ boxShadow: near ? 'inset 0 0 28px rgba(0,245,255,0.12)' : undefined }}
      />
      <span className="absolute left-[14%] right-[14%] top-1/2 h-px -translate-y-1/2 bg-cyan-500/20" />
      <span className="absolute bottom-[14%] top-[14%] left-1/2 w-px -translate-x-1/2 bg-cyan-500/20" />
      <span className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full border border-cyan-500/30 bg-[#0B131A]/90">
        <MapPin className={`h-5 w-5 ${near ? 'text-[#00F5FF]' : 'text-cyan-500/50'}`} />
      </span>
    </div>
  )
}

/**
 * 街心花园 · LBS 抵达衔接
 * 抵达后触发阵核排异警告，唯一出口为授权红尘灵视
 */
export function JieXinLBSArrival({
  targetCoords = DEFAULT_TARGET,
  onStartScanning,
}: JieXinLBSArrivalProps) {
  const [playerCoords, setPlayerCoords] = useState<{
    latitude: number
    longitude: number
  } | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [isArrived, setIsArrived] = useState(false)

  const target = useMemo(
    () => ({ latitude: targetCoords.lat, longitude: targetCoords.lng }),
    [targetCoords.lat, targetCoords.lng],
  )

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('浏览器不支持定位，已使用模拟坐标')
      setPlayerCoords(MOCK_COORDS)
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPlayerCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        })
        setGeoError(null)
      },
      (err) => {
        setGeoError(err.message || '定位失败')
        setPlayerCoords(MOCK_COORDS)
      },
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 15000 },
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  const distanceM = playerCoords ? getDistanceMeters(playerCoords, target) : null
  const isNear = distanceM != null && distanceM <= ARRIVAL_RADIUS_M

  const markArrived = useCallback(() => {
    setPlayerCoords({ latitude: target.latitude, longitude: target.longitude })
    setLocalError(null)
    setIsArrived(true)
    if (navigator.vibrate) navigator.vibrate([30, 20, 50])
  }, [target.latitude, target.longitude])

  const handleConfirmArrival = useCallback(() => {
    setLocalError(null)
    if (!playerCoords) {
      setLocalError('定位中，请稍候…')
      return
    }
    const dist = getDistanceMeters(playerCoords, target)
    if (dist > ARRIVAL_RADIUS_M) {
      setLocalError(`尚未抵达街心花园，距目标还有 ${formatDistance(dist)}`)
      return
    }
    markArrived()
  }, [playerCoords, target, markArrived])

  const handleStartScanning = useCallback(() => {
    onStartScanning()
  }, [onStartScanning])

  return (
    <>
      <style>{`
        @keyframes jx-cta-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(0,245,255,0.15), inset 0 0 12px rgba(0,245,255,0.05); }
          50% { box-shadow: 0 0 36px rgba(0,245,255,0.35), inset 0 0 20px rgba(0,245,255,0.12); }
        }
        .jx-cta-glow {
          animation: jx-cta-glow 2.4s ease-in-out infinite;
        }
      `}</style>

      <div
        className="relative w-full overflow-hidden rounded-xl"
        style={{
          touchAction: 'none',
          backgroundColor: '#0B131A',
        }}
      >
        <GeoController
          targetCoords={{ lat: targetCoords.lat, lng: targetCoords.lng }}
          enabled={false}
          onArrived={markArrived}
        />

        {/* 抵达后：红/青交织边缘呼吸 */}
        <div
          className={`absolute inset-0 rounded-xl border-2 transition-colors duration-500 ${
            isArrived
              ? 'animate-pulse border-red-900/50'
              : 'border-cyan-500/20'
          }`}
          style={
            isArrived
              ? { boxShadow: 'inset 0 0 48px rgba(127,29,29,0.12), 0 0 24px rgba(0,245,255,0.06)' }
              : undefined
          }
        />
        {isArrived && (
          <div className="pointer-events-none absolute inset-[3px] animate-pulse rounded-[10px] border border-cyan-500/25" />
        )}

        <div className="relative z-10 flex min-h-[min(68dvh,480px)] flex-col px-5 py-6">
          {/* 顶部 OS 标识 */}
          <p className="text-center font-mono text-[10px] tracking-[0.4em] text-cyan-500/60">
            FOWORLD · LBS NAV
          </p>
          <h3 className="mt-2 text-center font-mono text-sm tracking-widest text-white/70">
            {isArrived ? '街心花园 · 坐标锚定' : '街心花园 · 抵达导航'}
          </h3>

          <div className="flex flex-1 flex-col items-center justify-center px-2">
            {isArrived ? (
              <div className="max-w-sm space-y-5 text-center">
                <p className="font-mono text-[10px] tracking-[0.25em] text-red-400/80">
                  [ SYSTEM ALERT ]
                </p>
                <p className="font-mono text-sm leading-relaxed tracking-wide text-[#00F5FF]/90">
                  [系统警告] 降核温度过低，面临崩解风险。请立即提取周边红尘烟火气进行中和。
                </p>
                <div className="mx-auto h-px w-24 bg-gradient-to-r from-transparent via-red-900/50 to-transparent" />
                <p className="font-mono text-[10px] leading-relaxed text-white/30">
                  阵核排异指数临界 · 灵视模块待授权
                </p>
              </div>
            ) : (
              <>
                <NavRadar near={isNear} />
                <p className="mt-6 max-w-xs text-center font-mono text-[11px] leading-relaxed text-white/40">
                  携带破损降核抵达街心花园坐标，完成 LBS 锚定后方可开启灵视中和程序
                </p>
              </>
            )}
          </div>

          {!isArrived && distanceM != null && (
            <p className="mb-3 text-center font-mono text-[10px] text-white/45">
              距目标 {formatDistance(distanceM)}
              {isNear ? ' · 已进入锚定范围' : ''}
            </p>
          )}

          {(geoError || localError) && !isArrived && (
            <p className="mb-3 text-center font-mono text-[10px] text-amber-200/70">
              {localError ?? geoError}
            </p>
          )}

          {/* 行动点：抵达前确认 / 抵达后唯一 CTA */}
          {!isArrived ? (
            <button
              type="button"
              onPointerDown={(e: ReactPointerEvent<HTMLButtonElement>) => {
                e.preventDefault()
                handleConfirmArrival()
              }}
              className={`w-full rounded-xl border py-3.5 font-mono text-sm tracking-widest transition-opacity active:opacity-80 ${
                isNear
                  ? 'border-cyan-500/45 bg-cyan-500/10 text-[#00F5FF]'
                  : 'border-white/10 bg-white/5 text-white/40'
              }`}
            >
              确认坐标锚定
            </button>
          ) : (
            <button
              type="button"
              onPointerDown={(e: ReactPointerEvent<HTMLButtonElement>) => {
                e.preventDefault()
                handleStartScanning()
              }}
              className="jx-cta-glow flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/50 bg-cyan-500/10 py-4 font-mono text-sm tracking-[0.2em] text-[#00F5FF] transition-transform active:scale-[0.98]"
            >
              <Crosshair className="h-4 w-4" />
              授权开启：红尘灵视
            </button>
          )}
        </div>

        {!isArrived && (
          <button
            type="button"
            onPointerDown={(e: ReactPointerEvent<HTMLButtonElement>) => {
              e.preventDefault()
              markArrived()
            }}
            className="absolute bottom-2 right-2 z-30 rounded px-1.5 py-0.5 font-mono text-[9px] text-white/20 hover:text-white/45"
            style={{ touchAction: 'none' }}
          >
            [Debug: 模拟抵达]
          </button>
        )}
      </div>
    </>
  )
}

export default JieXinLBSArrival
