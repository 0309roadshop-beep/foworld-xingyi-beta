import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { getDistanceMeters } from '../../utils/geo'

/** 默认到达判定半径（米） */
const ARRIVAL_RADIUS_M = 50
/** 连续命中次数，防止 GPS 边缘漂移反复触发 */
const CONSECUTIVE_HITS = 3
/** 两次命中最大间隔（ms），超时则计数清零 */
const HIT_WINDOW_MS = 8000
/** 后门连击：两次点击最大间隔（ms） */
const DEBUG_TAP_WINDOW_MS = 1000
/** 后门连击所需次数 */
const DEBUG_TAP_REQUIRED = 5

export interface TargetCoords {
  lat: number
  lng: number
}

interface GeoControllerProps {
  /** 任务目的地经纬度 */
  targetCoords: TargetCoords
  /** 进入围栏范围 */
  onArrived?: () => void
  /** 定位失败 / 权限拒绝 */
  onError?: (message: string) => void
  /** 判定半径，默认 50m */
  radiusMeters?: number
  /** 是否启用监听，默认 true */
  enabled?: boolean
}

/**
 * LBS 地理围栏控制器 — 静默后台运行。
 * 使用 watchPosition 持续监听，Haversine 计算距离，到达后触发 onArrived。
 * 调试后门通过 Portal 挂载到 body，避免被舞台组件遮挡。
 */
export function GeoController({
  targetCoords,
  onArrived,
  onError,
  radiusMeters = ARRIVAL_RADIUS_M,
  enabled = true,
}: GeoControllerProps) {
  const arrivedFiredRef = useRef(false)
  const insideHitsRef = useRef(0)
  const lastHitAtRef = useRef(0)
  const watchIdRef = useRef<number | null>(null)
  const debugTapCountRef = useRef(0)
  const lastDebugTapAtRef = useRef(0)

  const [showDebug, setShowDebug] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fireArrived = useCallback(() => {
    if (arrivedFiredRef.current) return
    arrivedFiredRef.current = true
    insideHitsRef.current = 0
    onArrived?.()
  }, [onArrived])

  const checkDistance = useCallback(
    (lat: number, lng: number) => {
      if (arrivedFiredRef.current || !enabled) return

      const meters = getDistanceMeters(
        { latitude: lat, longitude: lng },
        { latitude: targetCoords.lat, longitude: targetCoords.lng },
      )

      const now = Date.now()

      if (meters <= radiusMeters) {
        if (now - lastHitAtRef.current > HIT_WINDOW_MS) {
          insideHitsRef.current = 0
        }
        lastHitAtRef.current = now
        insideHitsRef.current += 1

        if (insideHitsRef.current >= CONSECUTIVE_HITS) {
          fireArrived()
        }
      } else {
        insideHitsRef.current = 0
      }
    },
    [enabled, targetCoords.lat, targetCoords.lng, radiusMeters, fireArrived],
  )

  /** 挂载 watchPosition，卸载时 clearWatch */
  useEffect(() => {
    arrivedFiredRef.current = false
    insideHitsRef.current = 0
    lastHitAtRef.current = 0

    if (!enabled) return

    if (!navigator.geolocation) {
      onError?.('浏览器不支持定位')
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        checkDistance(position.coords.latitude, position.coords.longitude)
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          onError?.('未授权定位')
        } else {
          onError?.(err.message || '定位失败')
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 4000,
        timeout: 15000,
      },
    )

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [enabled, targetCoords.lat, targetCoords.lng, checkDistance, onError])

  /**
   * 开发者后门：pointerdown 连击 5 次（间隔 ≤1s）。
   * 使用 ref 计数，避免闭包 stale；间隔超限则清零。
   */
  const handleDebugHotspot = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()

    const now = Date.now()
    if (lastDebugTapAtRef.current > 0 && now - lastDebugTapAtRef.current > DEBUG_TAP_WINDOW_MS) {
      debugTapCountRef.current = 0
    }

    debugTapCountRef.current += 1
    lastDebugTapAtRef.current = now

    const count = debugTapCountRef.current
    console.log('后门被点击', count)

    if (count >= DEBUG_TAP_REQUIRED) {
      debugTapCountRef.current = 0
      lastDebugTapAtRef.current = 0
      console.log('后门已触发 · 打开 Debug 面板')
      setShowDebug(true)
    }
  }, [])

  const handleSimulateArrive = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setShowDebug(false)
      console.log('后门 · 一键模拟到达')
      fireArrived()
    },
    [fireArrived],
  )

  const handleCloseDebug = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setShowDebug(false)
  }, [])

  /** Portal 到 body，确保 z-index 最高且不受父级 overflow 裁剪 */
  const debugOverlay =
    mounted &&
    createPortal(
      <>
        {/* 调试期显形后门热区 */}
        {!showDebug && (
          <button
            type="button"
            aria-label="Geo Debug 后门"
            onPointerDown={handleDebugHotspot}
            className="fixed bottom-8 right-8 z-[9999] flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-300/80 bg-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.55)] backdrop-blur-sm"
            style={{
              touchAction: 'none',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
            }}
          >
            <span className="text-[10px] font-bold leading-tight text-white">DEBUG</span>
          </button>
        )}

        {/* Debug 面板 */}
        {showDebug && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 px-6 backdrop-blur-md"
            style={{ touchAction: 'none' }}
          >
            <div className="w-full max-w-sm rounded-2xl border-2 border-red-400/60 bg-void-900 p-6 shadow-[0_0_40px_rgba(239,68,68,0.35)]">
              <p className="mb-1 text-center text-base font-bold text-red-300">Geo Debug 面板</p>
              <p className="mb-4 text-center text-xs text-mist-muted">
                目标 {targetCoords.lat.toFixed(4)}, {targetCoords.lng.toFixed(4)}
                <br />
                围栏半径 {radiusMeters}m
              </p>
              <button
                type="button"
                onPointerDown={handleSimulateArrive}
                className="mb-3 w-full rounded-xl border-2 border-jade-bright/50 bg-jade-deep/40 py-3.5 text-sm font-bold text-jade-bright active:bg-jade-deep/60"
                style={{ touchAction: 'none' }}
              >
                一键模拟到达
              </button>
              <button
                type="button"
                onPointerDown={handleCloseDebug}
                className="w-full rounded-xl border border-mist-faint/30 py-2.5 text-xs text-mist-muted active:bg-void-800"
                style={{ touchAction: 'none' }}
              >
                关闭
              </button>
            </div>
          </div>
        )}
      </>,
      document.body,
    )

  return <>{debugOverlay}</>
}

export default GeoController
