import { AnimatePresence, motion } from 'framer-motion'
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  DEFAULT_CONSTELLATION_BG,
  DEFAULT_SPIRIT_PLACEHOLDER,
  STAR_PENTAGRAM_NODES,
  type ConstellationNode,
} from '../../config/constellationPresets'

const HIT_RADIUS = 8.5
const SUCCESS_DELAY_MS = 1400

export type ConstellationRouteMode = 'coverage' | 'ordered'

export interface ConstellationConnectProps {
  /** 全屏铺满的实景底图 */
  bgImage?: string
  /** 灯火节点坐标（百分比 0–100） */
  nodes?: ConstellationNode[]
  /** 连通后浮现的幻兽插画 */
  spiritImage?: string
  /** coverage：一笔覆盖全部节点；ordered：按序访问（可闭合） */
  routeMode?: ConstellationRouteMode
  /** ordered 模式下是否必须回到起点闭合 */
  closeLoop?: boolean
  /** 傍晚氛围（暗角 + 暖色灯火） */
  duskOverlay?: boolean
  onSuccess?: () => void
}

function clientToPercent(clientX: number, clientY: number, rect: DOMRect) {
  return {
    x: ((clientX - rect.left) / rect.width) * 100,
    y: ((clientY - rect.top) / rect.height) * 100,
  }
}

function dist(a: ConstellationNode, b: ConstellationNode) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function nearestNodeIndex(
  point: ConstellationNode,
  nodes: ConstellationNode[],
  exclude: Set<number>,
): number | null {
  let best: number | null = null
  let min = Infinity
  nodes.forEach((n, i) => {
    if (exclude.has(i)) return
    const d = dist(point, n)
    if (d <= HIT_RADIUS && d < min) {
      min = d
      best = i
    }
  })
  return best
}

function pointsToPolyline(points: ConstellationNode[]) {
  return points.map((p) => `${p.x},${p.y}`).join(' ')
}

export function ConstellationConnect({
  bgImage = DEFAULT_CONSTELLATION_BG,
  nodes = STAR_PENTAGRAM_NODES,
  spiritImage = DEFAULT_SPIRIT_PLACEHOLDER,
  routeMode = 'coverage',
  closeLoop = routeMode === 'ordered',
  duskOverlay = true,
  onSuccess,
}: ConstellationConnectProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const successFiredRef = useRef(false)
  const lockedPathRef = useRef<number[]>([])

  const [lockedPath, setLockedPath] = useState<number[]>([])
  const [finger, setFinger] = useState<ConstellationNode | null>(null)
  const [drawing, setDrawing] = useState(false)
  const [won, setWon] = useState(false)
  const [shatter, setShatter] = useState(false)
  const [spiritReveal, setSpiritReveal] = useState(false)

  lockedPathRef.current = lockedPath

  const visitedSet = useMemo(() => new Set(lockedPath), [lockedPath])

  const resetProgress = useCallback(() => {
    setLockedPath([])
    setFinger(null)
    setDrawing(false)
    setSpiritReveal(false)
  }, [])

  const triggerFail = useCallback(() => {
    setShatter(true)
    window.setTimeout(() => {
      setShatter(false)
      resetProgress()
    }, 560)
  }, [resetProgress])

  const checkComplete = useCallback(
    (path: number[]) => {
      if (routeMode === 'coverage') {
        return path.length === nodes.length
      }
      if (closeLoop) {
        return path.length === nodes.length + 1 && path[path.length - 1] === 0
      }
      return path.length === nodes.length
    },
    [routeMode, closeLoop, nodes.length],
  )

  const triggerSuccess = useCallback(() => {
    if (successFiredRef.current) return
    successFiredRef.current = true
    setWon(true)
    setDrawing(false)
    setFinger(null)
    setSpiritReveal(true)
    window.setTimeout(() => onSuccess?.(), SUCCESS_DELAY_MS)
  }, [onSuccess])

  const trySnapNode = useCallback(
    (point: ConstellationNode, currentPath: number[]): number[] => {
      if (routeMode === 'ordered') {
        const step = currentPath.length
        if (step < nodes.length) {
          const targetIdx = step
          if (dist(point, nodes[targetIdx]) <= HIT_RADIUS) {
            return [...currentPath, targetIdx]
          }
          return currentPath
        }
        if (closeLoop && step === nodes.length && dist(point, nodes[0]) <= HIT_RADIUS) {
          return [...currentPath, 0]
        }
        return currentPath
      }

      const visited = new Set(currentPath)
      const hit = nearestNodeIndex(point, nodes, visited)
      if (hit === null) return currentPath
      return [...currentPath, hit]
    },
    [nodes, routeMode, closeLoop],
  )

  const canStartAt = useCallback(
    (point: ConstellationNode): number | null => {
      if (routeMode === 'ordered') {
        return dist(point, nodes[0]) <= HIT_RADIUS ? 0 : null
      }
      return nearestNodeIndex(point, nodes, new Set())
    },
    [nodes, routeMode],
  )

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (won || shatter || drawing) return
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      e.preventDefault()
      const pt = clientToPercent(e.clientX, e.clientY, rect)
      const startIdx = canStartAt(pt)
      if (startIdx === null) return

      setDrawing(true)
      setLockedPath([startIdx])
      setFinger(pt)
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [won, shatter, drawing, canStartAt],
  )

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!drawing || won || shatter) return
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      e.preventDefault()
      const pt = clientToPercent(e.clientX, e.clientY, rect)
      setFinger(pt)

      setLockedPath((prev) => {
        const next = trySnapNode(pt, prev)
        if (checkComplete(next)) {
          triggerSuccess()
        }
        return next
      })
    },
    [drawing, won, shatter, trySnapNode, checkComplete, triggerSuccess],
  )

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!drawing) return
      e.preventDefault()

      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }

      setDrawing(false)
      setFinger(null)

      if (successFiredRef.current || won) return

      const path = lockedPathRef.current
      if (!checkComplete(path)) {
        triggerFail()
      }
    },
    [drawing, won, checkComplete, triggerFail],
  )

  const polylinePoints = useMemo(() => {
    const pts = lockedPath.map((idx) => nodes[idx])
    if (finger && drawing) pts.push(finger)
    return pointsToPolyline(pts)
  }, [lockedPath, nodes, finger, drawing])

  const completedSegments = useMemo(() => {
    const segs: [ConstellationNode, ConstellationNode][] = []
    for (let i = 0; i < lockedPath.length - 1; i++) {
      segs.push([nodes[lockedPath[i]], nodes[lockedPath[i + 1]]])
    }
    return segs
  }, [lockedPath, nodes])

  const progressCount =
    routeMode === 'coverage'
      ? lockedPath.length
      : Math.max(0, lockedPath.length - (closeLoop && lockedPath.length > 0 ? 1 : 0))

  const handleReset = useCallback(() => {
    successFiredRef.current = false
    setWon(false)
    setShatter(false)
    resetProgress()
  }, [resetProgress])

  const hintText =
    routeMode === 'coverage'
      ? '按住任一灯火滑动，一笔连过全部光点，描摹幻兽轮廓'
      : closeLoop
        ? '从起点灯火按住滑动，依次连过所有光点并回到起点'
        : '从起点按住滑动，依次连过所有灯火'

  return (
    <div className="w-full">
      <p className="mb-3 text-center text-xs leading-relaxed text-mist-muted">{hintText}</p>

      <div
        ref={containerRef}
        className="relative mx-auto w-full touch-none select-none overflow-hidden rounded-xl border border-jade/20 shadow-glow"
        style={{
          touchAction: 'none',
          minHeight: 'min(72dvh, 520px)',
          maxHeight: 'min(78dvh, 560px)',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* 实景底图 */}
        <img
          src={bgImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />

        {/* 傍晚 / 氛围遮罩 */}
        <div
          className={`pointer-events-none absolute inset-0 ${
            duskOverlay
              ? 'bg-gradient-to-b from-indigo-950/75 via-amber-950/35 to-void-950/85'
              : 'bg-void-950/45'
          }`}
        />

        {/* 星尘微粒 */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 24 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute h-0.5 w-0.5 rounded-full bg-amber-200/70"
              style={{
                left: `${(i * 17 + 11) % 100}%`,
                top: `${(i * 23 + 7) % 100}%`,
              }}
              animate={{ opacity: [0.15, 0.85, 0.15], scale: [1, 1.6, 1] }}
              transition={{ duration: 2.4 + (i % 4) * 0.5, repeat: Infinity, delay: i * 0.12 }}
            />
          ))}
        </div>

        {/* 幻兽显现层 — 从星座中心 radial 扩散淡入 */}
        <AnimatePresence>
          {spiritReveal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
            >
              <motion.div
                className="relative flex h-full w-full items-center justify-center"
                initial={{ clipPath: 'circle(0% at 50% 48%)' }}
                animate={{ clipPath: 'circle(95% at 50% 48%)' }}
                transition={{ duration: 1.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              >
                <motion.img
                  src={spiritImage}
                  alt=""
                  className="h-[78%] w-[78%] max-w-none object-contain"
                  style={{ mixBlendMode: 'screen' }}
                  initial={{ opacity: 0, filter: 'blur(10px) brightness(1.5)' }}
                  animate={{
                    opacity: 0.95,
                    filter:
                      'blur(0px) brightness(1.2) drop-shadow(0 0 32px rgba(253,230,138,0.7))',
                  }}
                  transition={{ duration: 1.9, delay: 0.2, ease: 'easeOut' }}
                />
              </motion.div>
              <motion.div
                className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(253,230,138,0.4),transparent_58%)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.75] }}
                transition={{ duration: 2, delay: 0.25 }}
                style={{ mixBlendMode: 'screen' }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 星座连线 SVG */}
        <svg
          className="pointer-events-none absolute inset-0 z-20 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <filter id="constellation-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="0.55" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde68a" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#67e8f9" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.95" />
            </linearGradient>
          </defs>

          {completedSegments.map(([a, b], i) => (
            <motion.line
              key={`seg-${i}-${lockedPath[i]}-${lockedPath[i + 1]}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: shatter ? 0 : won ? 1 : 0.92 }}
              transition={{ duration: 0.25 }}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={won ? 'url(#line-grad)' : '#67e8f9'}
              strokeWidth={won ? 0.55 : 0.42}
              strokeLinecap="round"
              filter="url(#constellation-glow)"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {polylinePoints && drawing && finger && (
            <motion.polyline
              points={polylinePoints}
              fill="none"
              stroke={shatter ? '#f87171' : '#a5f3fc'}
              strokeWidth={shatter ? 0.38 : 0.35}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={shatter ? '1.2 0.8' : undefined}
              opacity={shatter ? 0.85 : 0.75}
              filter={shatter ? undefined : 'url(#constellation-glow)'}
              vectorEffect="non-scaling-stroke"
            />
          )}

          {won && polylinePoints && (
            <motion.polyline
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              points={pointsToPolyline(lockedPath.map((i) => nodes[i]))}
              fill="none"
              stroke="url(#line-grad)"
              strokeWidth={0.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#constellation-glow)"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {/* 灯火节点 */}
        {nodes.map((node, i) => {
          const visited = visitedSet.has(i)
          const isActive = drawing && !visited
          const pulse = isActive || (won && visited)

          return (
            <div
              key={`lamp-${i}`}
              className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              <motion.div
                animate={
                  won && visited
                    ? {
                        scale: [1, 1.35, 1.15],
                        boxShadow: [
                          '0 0 8px rgba(253,230,138,0.6)',
                          '0 0 22px rgba(253,230,138,1)',
                          '0 0 14px rgba(253,230,138,0.85)',
                        ],
                      }
                    : pulse
                      ? { scale: [1, 1.25, 1], opacity: [0.75, 1, 0.75] }
                      : visited
                        ? { scale: 1.12, opacity: 1 }
                        : { scale: [1, 1.08, 1], opacity: [0.55, 0.95, 0.55] }
                }
                transition={
                  pulse && !won
                    ? { repeat: Infinity, duration: 1.6 + (i % 3) * 0.2 }
                    : won
                      ? { duration: 1.2, repeat: Infinity, repeatType: 'reverse' }
                      : { duration: 2.2 + i * 0.15, repeat: Infinity }
                }
                className="relative flex items-center justify-center"
              >
                <span
                  className={`absolute rounded-full blur-md ${
                    visited
                      ? 'h-6 w-6 bg-amber-300/80'
                      : 'h-5 w-5 bg-amber-200/45'
                  }`}
                />
                <span
                  className={`relative block rounded-full border ${
                    visited
                      ? 'h-3 w-3 border-amber-100 bg-amber-200 shadow-[0_0_12px_rgba(253,230,138,0.95)]'
                      : 'h-2.5 w-2.5 border-amber-200/70 bg-amber-100/90 shadow-[0_0_8px_rgba(251,191,36,0.7)]'
                  }`}
                />
              </motion.div>
              {node.label && (
                <span className="mt-1 block text-center text-[9px] tracking-widest text-amber-100/80">
                  {node.label}
                </span>
              )}
            </div>
          )
        })}

        {/* 成功文案 */}
        <AnimatePresence>
          {won && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center px-4"
            >
              <div className="rounded-2xl border border-amber-200/40 bg-void-950/70 px-5 py-3 text-center shadow-glow-gold backdrop-blur-md">
                <p className="text-base font-medium text-amber-100">千灯连通，幻兽浮现</p>
                <p className="mt-0.5 text-[11px] text-cyan-200/90">星座轮廓已唤醒沉睡之灵</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-mist-faint">
        <span>
          灯火 {progressCount}/{nodes.length}
          {drawing ? ' · 描线中' : ''}
        </span>
        <button
          type="button"
          className="rounded-lg border border-sky/25 px-2.5 py-1 text-sky-bright active:bg-sky/10"
          onPointerDown={(e) => {
            e.preventDefault()
            handleReset()
          }}
        >
          重绘星座
        </button>
      </div>
    </div>
  )
}

export default ConstellationConnect
