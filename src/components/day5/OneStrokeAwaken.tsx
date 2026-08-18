import { AnimatePresence, motion } from 'framer-motion'
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { DEFAULT_SPIRIT_PLACEHOLDER } from '../../config/constellationPresets'

const HIT_RADIUS = 9
const SUCCESS_DELAY_MS = 2000
const FAIL_RESET_MS = 520

interface AwakenNode {
  id: number
  x: number
  y: number
  label?: string
}

/** 9 节点无向图 — 全部偶度，存在欧拉回路（一笔画遍所有边） */
const NODES: AwakenNode[] = [
  { id: 0, x: 50, y: 10, label: '天灯' },
  { id: 1, x: 26, y: 26 },
  { id: 2, x: 74, y: 26 },
  { id: 3, x: 14, y: 46 },
  { id: 4, x: 50, y: 40 },
  { id: 5, x: 86, y: 46 },
  { id: 6, x: 30, y: 66 },
  { id: 7, x: 70, y: 66 },
  { id: 8, x: 50, y: 86, label: '灯心' },
]

const EDGES: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 2],
  [1, 3],
  [1, 4],
  [2, 4],
  [2, 5],
  [3, 6],
  [4, 6],
  [4, 7],
  [5, 7],
  [6, 8],
  [7, 8],
  [6, 7],
]

function edgeKey(a: number, b: number) {
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

function buildAdjacency() {
  const adj = new Map<number, number[]>()
  for (const [a, b] of EDGES) {
    if (!adj.has(a)) adj.set(a, [])
    if (!adj.has(b)) adj.set(b, [])
    adj.get(a)!.push(b)
    adj.get(b)!.push(a)
  }
  return adj
}

const ADJACENCY = buildAdjacency()

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function clientToPercent(clientX: number, clientY: number, rect: DOMRect) {
  return {
    x: ((clientX - rect.left) / rect.width) * 100,
    y: ((clientY - rect.top) / rect.height) * 100,
  }
}

function nearestNode(
  point: { x: number; y: number },
  exclude?: Set<number>,
): number | null {
  let best: number | null = null
  let min = Infinity
  NODES.forEach((n) => {
    if (exclude?.has(n.id)) return
    const d = dist(point, n)
    if (d <= HIT_RADIUS && d < min) {
      min = d
      best = n.id
    }
  })
  return best
}

export interface OneStrokeAwakenProps {
  onComplete?: () => void
}

function FireSpark({ delay, left }: { delay: number; left: number }) {
  return (
    <motion.span
      className="pointer-events-none absolute h-1 w-1 rounded-full bg-orange-300 shadow-[0_0_6px_rgba(251,146,60,0.95)]"
      style={{ left: `${left}%`, top: '45%' }}
      initial={{ opacity: 0, scale: 0.3 }}
      animate={{
        opacity: [0, 1, 0],
        y: [-10, -50 - Math.random() * 40],
        x: [(Math.random() - 0.5) * 30],
        scale: [0.3, 1.4, 0.2],
      }}
      transition={{ duration: 1.2, delay, repeat: Infinity, repeatDelay: 0.2 }}
    />
  )
}

/** 唤醒千灯 — 星火一笔画遍千灯灵星图 */
export function OneStrokeAwaken({ onComplete }: OneStrokeAwakenProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const successFiredRef = useRef(false)
  const pathRef = useRef<number[]>([])
  const usedEdgesRef = useRef<Set<string>>(new Set())

  const [nodePath, setNodePath] = useState<number[]>([])
  const [usedEdges, setUsedEdges] = useState<Set<string>>(new Set())
  const [finger, setFinger] = useState<{ x: number; y: number } | null>(null)
  const [drawing, setDrawing] = useState(false)
  const [won, setWon] = useState(false)
  const [shatter, setShatter] = useState(false)
  const [spiritLit, setSpiritLit] = useState(false)

  pathRef.current = nodePath
  usedEdgesRef.current = usedEdges

  const totalEdges = EDGES.length

  const resetProgress = useCallback(() => {
    setNodePath([])
    setUsedEdges(new Set())
    setFinger(null)
    setDrawing(false)
  }, [])

  const triggerFail = useCallback(() => {
    setShatter(true)
    window.setTimeout(() => {
      setShatter(false)
      resetProgress()
    }, FAIL_RESET_MS)
  }, [resetProgress])

  const triggerSuccess = useCallback(() => {
    if (successFiredRef.current) return
    successFiredRef.current = true
    setWon(true)
    setDrawing(false)
    setFinger(null)
    setSpiritLit(true)
    window.setTimeout(() => onComplete?.(), SUCCESS_DELAY_MS)
  }, [onComplete])

  const tryExtendToNode = useCallback(
    (nextId: number, currentPath: number[], currentEdges: Set<string>): boolean => {
      if (currentPath.length === 0) return false
      const last = currentPath[currentPath.length - 1]
      if (last === nextId) return false

      const neighbors = ADJACENCY.get(last) ?? []
      if (!neighbors.includes(nextId)) return false

      const ek = edgeKey(last, nextId)
      if (currentEdges.has(ek)) return false

      const nextEdges = new Set(currentEdges)
      nextEdges.add(ek)
      const nextPath = [...currentPath, nextId]

      setUsedEdges(nextEdges)
      setNodePath(nextPath)

      if (nextEdges.size === totalEdges) {
        triggerSuccess()
      }
      return true
    },
    [totalEdges, triggerSuccess],
  )

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (won || shatter || drawing) return
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      e.preventDefault()
      const pt = clientToPercent(e.clientX, e.clientY, rect)
      const start = nearestNode(pt)
      if (start === null) return

      setDrawing(true)
      setNodePath([start])
      setUsedEdges(new Set())
      setFinger(pt)
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [won, shatter, drawing],
  )

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!drawing || won || shatter) return
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      e.preventDefault()
      const pt = clientToPercent(e.clientX, e.clientY, rect)
      setFinger(pt)

      const hit = nearestNode(pt)
      if (hit === null) return

      const path = pathRef.current
      const edges = usedEdgesRef.current
      if (path.length > 0 && path[path.length - 1] !== hit) {
        tryExtendToNode(hit, path, edges)
      }
    },
    [drawing, won, shatter, tryExtendToNode],
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

      if (usedEdgesRef.current.size < totalEdges) {
        triggerFail()
      }
    },
    [drawing, won, totalEdges, triggerFail],
  )

  const litEdgeSet = usedEdges

  const traversedSegments = useMemo(() => {
    const segs: [AwakenNode, AwakenNode][] = []
    for (let i = 0; i < nodePath.length - 1; i++) {
      segs.push([NODES[nodePath[i]], NODES[nodePath[i + 1]]])
    }
    return segs
  }, [nodePath])

  const fingerPolyline = useMemo(() => {
    const pts = nodePath.map((id) => NODES[id])
    if (finger && drawing) pts.push(finger as AwakenNode)
    return pts.map((p) => `${p.x},${p.y}`).join(' ')
  }, [nodePath, finger, drawing])

  const handleReset = useCallback(() => {
    successFiredRef.current = false
    setWon(false)
    setShatter(false)
    setSpiritLit(false)
    resetProgress()
  }, [resetProgress])

  return (
    <div className="w-full">
      <p className="mb-2 text-center text-[11px] leading-relaxed text-mist-muted">
        浴火亲和已觉醒——以星火之力一笔勾勒，唤醒【布依千灯灵】
      </p>
      <p className="mb-3 text-center text-xs text-mist-faint">
        按住节点滑动，每条星轨仅可经过一次，手指不可中途抬起
      </p>

      <div
        ref={containerRef}
        className="relative mx-auto w-full touch-none select-none overflow-hidden rounded-xl border border-amber-500/20 shadow-[0_0_24px_rgba(245,120,40,0.12)]"
        style={{
          touchAction: 'none',
          minHeight: 'min(68dvh, 480px)',
          maxHeight: 'min(72dvh, 520px)',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-indigo-950/80 via-amber-950/40 to-void-950/90" />

        {/* 千灯灵半透明剪影 */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <motion.img
            src={DEFAULT_SPIRIT_PLACEHOLDER}
            alt=""
            className="h-[72%] w-[72%] object-contain"
            animate={{
              opacity: spiritLit ? 0.95 : 0.22,
              filter: spiritLit
                ? 'brightness(1.35) drop-shadow(0 0 36px rgba(251,146,60,0.75))'
                : 'brightness(0.85) blur(0.5px)',
            }}
            transition={{ duration: spiritLit ? 1.4 : 0.3 }}
            style={{ mixBlendMode: spiritLit ? 'screen' : 'soft-light' }}
          />
        </div>

        {/* 铁花星火粒子 */}
        {(won || spiritLit) &&
          Array.from({ length: 18 }).map((_, i) => (
            <FireSpark key={i} delay={i * 0.08} left={12 + (i * 19) % 76} />
          ))}

        {/* 星图连线 */}
        <svg
          className="pointer-events-none absolute inset-0 z-20 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <filter id="awaken-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="0.6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="awaken-fire" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="45%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>

          {/* 未点亮的幽灵边 */}
          {EDGES.map(([a, b]) => {
            const na = NODES[a]
            const nb = NODES[b]
            const lit = litEdgeSet.has(edgeKey(a, b))
            return (
              <line
                key={edgeKey(a, b)}
                x1={na.x}
                y1={na.y}
                x2={nb.x}
                y2={nb.y}
                stroke={lit ? 'transparent' : 'rgba(251,191,36,0.12)'}
                strokeWidth={0.25}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            )
          })}

          {/* 已走过的边 */}
          {traversedSegments.map(([a, b], i) => (
            <motion.line
              key={`lit-${i}-${a.id}-${b.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: shatter ? 0 : won ? 1 : 0.92 }}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={won ? 'url(#awaken-fire)' : shatter ? '#f87171' : '#fbbf24'}
              strokeWidth={won ? 0.65 : 0.5}
              strokeLinecap="round"
              filter="url(#awaken-glow)"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {drawing && finger && fingerPolyline && (
            <polyline
              points={fingerPolyline}
              fill="none"
              stroke={shatter ? '#f87171' : '#fdba74'}
              strokeWidth={shatter ? 0.35 : 0.32}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.8}
              filter="url(#awaken-glow)"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {/* 星辰节点 */}
        {NODES.map((node) => {
          const visited = nodePath.includes(node.id)
          const isCurrent = drawing && nodePath[nodePath.length - 1] === node.id

          return (
            <div
              key={node.id}
              className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              <motion.div
                animate={
                  won && visited
                    ? {
                        scale: [1, 1.4, 1.2],
                        boxShadow: [
                          '0 0 10px rgba(251,146,60,0.6)',
                          '0 0 28px rgba(251,146,60,1)',
                          '0 0 16px rgba(253,230,138,0.9)',
                        ],
                      }
                    : isCurrent
                      ? { scale: [1, 1.3, 1], opacity: 1 }
                      : visited
                        ? { scale: 1.15, opacity: 1 }
                        : { scale: [1, 1.1, 1], opacity: [0.5, 0.9, 0.5] }
                }
                transition={
                  won
                    ? { duration: 1.1, repeat: Infinity, repeatType: 'reverse' }
                    : isCurrent
                      ? { repeat: Infinity, duration: 0.9 }
                      : { duration: 2 + node.id * 0.1, repeat: Infinity }
                }
                className="relative flex items-center justify-center"
              >
                <span
                  className={`absolute rounded-full blur-md ${
                    visited ? 'h-7 w-7 bg-orange-300/80' : 'h-5 w-5 bg-amber-200/40'
                  }`}
                />
                <span
                  className={`relative block rounded-full border ${
                    visited
                      ? 'h-3.5 w-3.5 border-amber-100 bg-orange-200 shadow-[0_0_14px_rgba(251,146,60,0.95)]'
                      : 'h-2.5 w-2.5 border-amber-200/60 bg-amber-100/80 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                  }`}
                />
              </motion.div>
              {node.label && (
                <span className="mt-1 block text-center text-[9px] tracking-widest text-amber-100/75">
                  {node.label}
                </span>
              )}
            </div>
          )
        })}

        <AnimatePresence>
          {won && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center px-4"
            >
              <div className="rounded-2xl border border-orange-300/40 bg-void-950/75 px-5 py-3 text-center shadow-[0_0_24px_rgba(251,146,60,0.35)] backdrop-blur-md">
                <p className="text-base font-medium text-amber-100">人间烟火不息，千灯灵已苏醒！</p>
                <p className="mt-0.5 text-[11px] text-orange-200/90">星火与灯火，自此为你掌灯</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-mist-faint">
        <span>
          星轨 {usedEdges.size}/{totalEdges}
          {drawing ? ' · 勾勒中' : shatter ? ' · 星轨断裂，请重试' : ''}
        </span>
        <button
          type="button"
          className="rounded-lg border border-amber-500/25 px-2.5 py-1 text-amber-200/90 active:bg-amber-500/10"
          onPointerDown={(e) => {
            e.preventDefault()
            handleReset()
          }}
        >
          重绘星图
        </button>
      </div>
    </div>
  )
}

export default OneStrokeAwaken
