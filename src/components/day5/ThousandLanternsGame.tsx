import { AnimatePresence, motion } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  LANTERN_ADJACENCY,
  LANTERN_COMPLETE_DELAY_MS,
  LANTERN_FAIL_FLASH_COUNT,
  LANTERN_FAIL_FLASH_INTERVAL_MS,
  LANTERN_NEXT_NODE_HIT_BOOST,
  LANTERN_TOTAL_EDGES,
  PLACEHOLDER_NIGHT_VIEW,
  PLACEHOLDER_SPIRIT_CARD,
  THOUSAND_LANTERN_EDGES,
  THOUSAND_LANTERN_NODES,
  lanternEdgeKey,
  lanternHitRadiusPx,
} from '../../config/thousandLanternsConfig'

const NODES = THOUSAND_LANTERN_NODES
const FAIL_STROKE = '#FF3B30'
const BURST_MS = 700

type GamePhase = 'idle' | 'drawing' | 'fail' | 'burst' | 'reveal' | 'done'

interface Vec2 {
  x: number
  y: number
}

interface NodeLayout {
  w: number
  h: number
  /** 下标 = 节点 id */
  local: Vec2[]
}

function posAt(nodePos: Vec2[], id: number): Vec2 | undefined {
  return nodePos[id]
}

function buildLayout(rect: DOMRect): NodeLayout {
  const w = rect.width
  const h = rect.height
  return {
    w,
    h,
    local: NODES.map((node) => ({
      x: (node.x / 100) * w,
      y: (node.y / 100) * h,
    })),
  }
}

function clientToLocal(clientX: number, clientY: number, rect: DOMRect): Vec2 {
  return { x: clientX - rect.left, y: clientY - rect.top }
}

function distLocal(a: Vec2, b: Vec2) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function distClientToLocal(clientX: number, clientY: number, local: Vec2, rect: DOMRect) {
  const finger = clientToLocal(clientX, clientY, rect)
  return distLocal(finger, local)
}

/** 中心对称圆鼓灯体 — 单圈横筋 + 中轴 */
function drawLanternBodyGlow(ctx: CanvasRenderingContext2D, nodePos: Vec2[], w: number, h: number) {
  const cx = nodePos[1]?.x ?? w * 0.5

  ctx.save()

  const bodyCy = ((nodePos[4]?.y ?? h * 0.42) + (nodePos[5]?.y ?? h * 0.42)) / 2
  ctx.beginPath()
  ctx.ellipse(cx, bodyCy, w * 0.34, h * 0.22, 0, 0, Math.PI * 2)
  const bodyG = ctx.createRadialGradient(cx, bodyCy - h * 0.04, w * 0.04, cx, bodyCy, w * 0.34)
  bodyG.addColorStop(0, 'rgba(255, 130, 50, 0.22)')
  bodyG.addColorStop(0.65, 'rgba(200, 50, 25, 0.1)')
  bodyG.addColorStop(1, 'rgba(40, 10, 5, 0.02)')
  ctx.fillStyle = bodyG
  ctx.fill()

  // 鼓框横筋
  const beltY = nodePos[4]?.y ?? h * 0.42
  ctx.beginPath()
  ctx.ellipse(cx, beltY, w * 0.3, h * 0.016, 0, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255, 190, 100, 0.16)'
  ctx.lineWidth = 1.2
  ctx.stroke()

  // 中轴（1—6—7）
  const top = nodePos[1]
  const tip = nodePos[7]
  if (top && tip) {
    ctx.beginPath()
    ctx.moveTo(top.x, top.y)
    ctx.lineTo(tip.x, tip.y)
    ctx.strokeStyle = 'rgba(255, 210, 130, 0.1)'
    ctx.lineWidth = w * 0.035
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  ctx.restore()
}

/** 始终绘制全部可走路径 */
function drawAllEdges(
  ctx: CanvasRenderingContext2D,
  nodePos: Vec2[],
  edgesUsed: Set<string>,
  currentId: number | null,
  failFlash: number,
  burst: boolean,
  burstAlpha: number,
) {
  const available = new Set<string>()
  if (currentId !== null) {
    for (const nb of LANTERN_ADJACENCY.get(currentId) ?? []) {
      const ek = lanternEdgeKey(currentId, nb)
      if (!edgesUsed.has(ek)) available.add(ek)
    }
  }

  for (const [a, b] of THOUSAND_LANTERN_EDGES) {
    const pa = posAt(nodePos, a)
    const pb = posAt(nodePos, b)
    if (!pa || !pb) continue

    const ek = lanternEdgeKey(a, b)
    const lit = edgesUsed.has(ek)
    const canGo = available.has(ek)

    ctx.beginPath()
    ctx.moveTo(pa.x, pa.y)
    ctx.lineTo(pb.x, pb.y)

    if (lit) {
      ctx.strokeStyle = failFlash > 0.2 ? FAIL_STROKE : '#FFB347'
      ctx.lineWidth = 5
      ctx.shadowColor = failFlash > 0.2 ? '#FF6B5E' : '#FFA500'
      ctx.shadowBlur = burst ? 20 + burstAlpha * 16 : 14
    } else if (canGo) {
      ctx.strokeStyle = 'rgba(255, 235, 170, 0.92)'
      ctx.lineWidth = 3.5
      ctx.shadowColor = '#FFD080'
      ctx.shadowBlur = 10
    } else {
      ctx.strokeStyle = 'rgba(255, 205, 120, 0.72)'
      ctx.lineWidth = 2.8
      ctx.shadowBlur = 0
    }

    // 中轴灯骨略强调
    if ((a === 1 && b === 6) || (a === 6 && b === 1)) {
      if (!lit && !canGo) ctx.strokeStyle = 'rgba(255, 215, 140, 0.55)'
    }

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }
  ctx.shadowBlur = 0
}

/** 始终绘制全部节点 */
function drawAllNodes(
  ctx: CanvasRenderingContext2D,
  nodePos: Vec2[],
  path: number[],
  currentId: number | null,
  phaseNow: GamePhase,
  t: number,
  nodeScales: number[],
  burst: boolean,
  burstAlpha: number,
) {
  const visited = new Set(path)

  for (let i = 0; i < NODES.length; i++) {
    const node = NODES[i]!
    const pos = posAt(nodePos, node.id)
    if (!pos) continue
    const isCurrent = currentId === node.id && phaseNow === 'drawing'
    const isStart = node.id === 0
    const isEnd = node.id === 7
    const wasVisited = visited.has(node.id)
    const scale = nodeScales[i] ?? 1
    const baseR = 7.5 * scale
    const pulse = 0.88 + Math.sin(t * 2.4 + i * 0.55) * 0.12

    ctx.save()

    // 外晕
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, baseR + (isCurrent ? 11 : 8), 0, Math.PI * 2)
    ctx.fillStyle = wasVisited
      ? `rgba(255, 160, 50, ${0.38 + (burst ? burstAlpha * 0.2 : 0)})`
      : isCurrent
        ? `rgba(255, 200, 80, ${0.42 + Math.sin(t * 5) * 0.12})`
        : `rgba(255, 180, 70, ${0.28 * pulse})`
    ctx.fill()

    // 灯珠
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, baseR, 0, Math.PI * 2)
    const core = ctx.createRadialGradient(pos.x - 2, pos.y - 2, 0, pos.x, pos.y, baseR)
    if (wasVisited) {
      core.addColorStop(0, '#FFF8E7')
      core.addColorStop(0.55, '#FFD080')
      core.addColorStop(1, '#E89530')
    } else {
      core.addColorStop(0, '#FFF3D6')
      core.addColorStop(0.6, '#FFBE5C')
      core.addColorStop(1, '#D08028')
    }
    ctx.fillStyle = core
    ctx.shadowColor = '#FFB040'
    ctx.shadowBlur = wasVisited ? 16 : 10
    ctx.fill()

    // 始 / 终 标记圈
    if (isStart || isEnd) {
      ctx.shadowBlur = 0
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, baseR + 5, 0, Math.PI * 2)
      ctx.strokeStyle = isStart
        ? `rgba(255, 240, 180, ${0.75 + Math.sin(t * 4) * 0.2})`
        : 'rgba(255, 220, 140, 0.65)'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    if (isCurrent) {
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, baseR + 8, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(255, 250, 210, ${0.7 + Math.sin(t * 6) * 0.25})`
      ctx.lineWidth = 2.5
      ctx.stroke()
    }

    if (node.label) {
      ctx.shadowBlur = 0
      ctx.font = 'bold 12px sans-serif'
      ctx.fillStyle = '#FFF8E7'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(node.label, pos.x, pos.y - baseR - 13)
    }

    ctx.restore()
  }
}

function nearestNodeAt(
  clientX: number,
  clientY: number,
  layout: NodeLayout,
  rect: DOMRect,
  boost = 1,
): number | null {
  const hitR = lanternHitRadiusPx(layout.w, layout.h, boost)
  let best: number | null = null
  let min = Infinity
  for (const node of NODES) {
    const pos = posAt(layout.local, node.id)
    if (!pos) continue
    const d = distClientToLocal(clientX, clientY, pos, rect)
    if (d <= hitR && d < min) {
      min = d
      best = node.id
    }
  }
  return best
}

function tryExtendPath(
  path: number[],
  usedEdges: Set<string>,
  nextId: number,
): { path: number[]; usedEdges: Set<string> } | null {
  if (path.length === 0) return null
  const last = path[path.length - 1]!
  if (last === nextId) return null

  const neighbors = LANTERN_ADJACENCY.get(last) ?? []
  if (!neighbors.includes(nextId)) return null

  const ek = lanternEdgeKey(last, nextId)
  if (usedEdges.has(ek)) return null

  const nextUsed = new Set(usedEdges)
  nextUsed.add(ek)
  return { path: [...path, nextId], usedEdges: nextUsed }
}

export interface ThousandLanternsGameProps {
  onComplete?: () => void
}

/**
 * 千灯结印 — 灯笼欧拉一笔画（每条边仅可走一次，必有解）
 * 失败条件：中途抬手且尚未走完全部边
 */
export function ThousandLanternsGame({ onComplete }: ThousandLanternsGameProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const completeFiredRef = useRef(false)
  const failFlashIndexRef = useRef(0)
  const devTapCountRef = useRef(0)

  const phaseRef = useRef<GamePhase>('idle')
  const pathRef = useRef<number[]>([])
  const usedEdgesRef = useRef<Set<string>>(new Set())
  const fingerRef = useRef<Vec2 | null>(null)
  const nodeScalesRef = useRef<number[]>(NODES.map(() => 1))
  const failAlphaRef = useRef(0)
  const burstAlphaRef = useRef(0)
  const layoutRef = useRef<NodeLayout>({ w: 0, h: 0, local: [] })

  const [phase, setPhase] = useState<GamePhase>('idle')
  const [lockedPath, setLockedPath] = useState<number[]>([])
  const [usedEdges, setUsedEdges] = useState<Set<string>>(new Set())
  const [showOverlay, setShowOverlay] = useState(false)
  const [bgLoaded, setBgLoaded] = useState(false)
  const [devMode, setDevMode] = useState(false)

  pathRef.current = lockedPath
  usedEdgesRef.current = usedEdges
  phaseRef.current = phase

  const setPhaseSafe = useCallback((p: GamePhase) => {
    phaseRef.current = p
    setPhase(p)
  }, [])

  const resetGame = useCallback(() => {
    completeFiredRef.current = false
    pathRef.current = []
    usedEdgesRef.current = new Set()
    fingerRef.current = null
    nodeScalesRef.current = NODES.map(() => 1)
    failAlphaRef.current = 0
    failFlashIndexRef.current = 0
    burstAlphaRef.current = 0
    setLockedPath([])
    setUsedEdges(new Set())
    setShowOverlay(false)
    setPhaseSafe('idle')
  }, [setPhaseSafe])

  const triggerFail = useCallback(() => {
    if (phaseRef.current === 'burst' || phaseRef.current === 'reveal' || phaseRef.current === 'done') {
      return
    }
    setPhaseSafe('fail')
    fingerRef.current = null
    failFlashIndexRef.current = 0
    failAlphaRef.current = 1

    let flashes = 0
    const maxFlashes = LANTERN_FAIL_FLASH_COUNT * 2
    const timer = window.setInterval(() => {
      flashes += 1
      failAlphaRef.current = flashes % 2 === 1 ? 1 : 0.15
      failFlashIndexRef.current = flashes
      if (flashes >= maxFlashes) {
        window.clearInterval(timer)
        failAlphaRef.current = 0
        resetGame()
      }
    }, LANTERN_FAIL_FLASH_INTERVAL_MS)
  }, [resetGame, setPhaseSafe])

  const triggerSuccess = useCallback(() => {
    if (completeFiredRef.current) return
    completeFiredRef.current = true
    setPhaseSafe('burst')
    burstAlphaRef.current = 1
    fingerRef.current = null

    window.setTimeout(() => {
      setShowOverlay(true)
      setPhaseSafe('reveal')
    }, BURST_MS)

    window.setTimeout(() => {
      setPhaseSafe('done')
      onComplete?.()
    }, LANTERN_COMPLETE_DELAY_MS)
  }, [onComplete, setPhaseSafe])

  const pulseNode = useCallback((nodeIndex: number) => {
    nodeScalesRef.current[nodeIndex] = 1.35
    window.setTimeout(() => {
      nodeScalesRef.current[nodeIndex] = 1.18
    }, 180)
  }, [])

  const applyProgress = useCallback(
    (nextPath: number[], nextUsed: Set<string>) => {
      const prevLen = pathRef.current.length
      if (nextPath.length > prevLen) {
        pulseNode(nextPath[nextPath.length - 1]!)
      }
      pathRef.current = nextPath
      usedEdgesRef.current = nextUsed
      setLockedPath(nextPath)
      setUsedEdges(nextUsed)
      if (nextUsed.size >= LANTERN_TOTAL_EDGES) {
        triggerSuccess()
      }
    },
    [pulseNode, triggerSuccess],
  )

  const logDevCoords = useCallback(
    (clientX: number, clientY: number) => {
      if (!devMode) return
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      console.log({
        x: Number((((clientX - rect.left) / rect.width) * 100).toFixed(1)),
        y: Number((((clientY - rect.top) / rect.height) * 100).toFixed(1)),
      })
    },
    [devMode],
  )

  const tryUnlockDevMode = useCallback(
    (clientX: number, clientY: number) => {
      if (!import.meta.env.DEV || devMode) return
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const rx = (clientX - rect.left) / rect.width
      const ry = (clientY - rect.top) / rect.height
      if (rx > 0.15 || ry > 0.15) {
        devTapCountRef.current = 0
        return
      }
      devTapCountRef.current += 1
      if (devTapCountRef.current >= 5) {
        setDevMode(true)
        console.info('[千灯结印] devMode 已开启 — 触摸屏幕将打印百分比坐标')
      }
    },
    [devMode],
  )

  const drawFrame = useCallback((now: number) => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const w = rect.width
    const h = rect.height

    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    layoutRef.current = buildLayout(rect)
    const nodePos = layoutRef.current.local
    const path = pathRef.current
    const finger = fingerRef.current
    const phaseNow = phaseRef.current
    const t = now / 1000

    const failFlash = phaseNow === 'fail' ? failAlphaRef.current : 0
    const burst = phaseNow === 'burst' || phaseNow === 'reveal' || phaseNow === 'done'
    if (burst) {
      burstAlphaRef.current = 0.55 + Math.sin(t * 14) * 0.35
    }
    const edgesUsed = usedEdgesRef.current
    const currentId = path.length > 0 ? path[path.length - 1]! : null

    ctx.save()
    if (burst) {
      ctx.globalAlpha = 0.85 + burstAlphaRef.current * 0.15
    }

    drawLanternBodyGlow(ctx, nodePos, w, h)
    drawAllEdges(ctx, nodePos, edgesUsed, phaseNow === 'drawing' ? currentId : null, failFlash, burst, burstAlphaRef.current)

    if (finger && path.length > 0 && edgesUsed.size < LANTERN_TOTAL_EDGES && phaseNow === 'drawing') {
      const last = posAt(nodePos, path[path.length - 1]!)
      if (last) {
        ctx.beginPath()
        ctx.moveTo(last.x, last.y)
        ctx.lineTo(finger.x, finger.y)
        ctx.strokeStyle = failFlash > 0.2 ? FAIL_STROKE : 'rgba(255, 210, 120, 0.75)'
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        ctx.setLineDash([5, 6])
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    ctx.shadowBlur = 0
    drawAllNodes(ctx, nodePos, path, currentId, phaseNow, t, nodeScalesRef.current, burst, burstAlphaRef.current)

    ctx.restore()

    if (failFlash > 0) {
      ctx.save()
      ctx.globalAlpha = failFlash * 0.5
      ctx.fillStyle = FAIL_STROKE
      ctx.fillRect(0, 0, w, h)
      ctx.restore()
    }
  }, [])

  useEffect(() => {
    const loop = (now: number) => {
      drawFrame(now)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [drawFrame])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => drawFrame(performance.now()))
    ro.observe(container)
    return () => ro.disconnect()
  }, [drawFrame])

  const inputLocked =
    phase === 'burst' || phase === 'reveal' || phase === 'done' || phase === 'fail'

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      tryUnlockDevMode(e.clientX, e.clientY)
      logDevCoords(e.clientX, e.clientY)
      if (devMode) return
      if (inputLocked || phaseRef.current !== 'idle') return

      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      const layout = buildLayout(rect)
      const start = nearestNodeAt(e.clientX, e.clientY, layout, rect, LANTERN_NEXT_NODE_HIT_BOOST)
      if (start !== 0) return

      e.preventDefault()
      phaseRef.current = 'drawing'
      setPhase('drawing')
      const initialPath = [0]
      const initialEdges = new Set<string>()
      pathRef.current = initialPath
      usedEdgesRef.current = initialEdges
      setLockedPath(initialPath)
      setUsedEdges(initialEdges)
      fingerRef.current = clientToLocal(e.clientX, e.clientY, rect)
      pulseNode(0)
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [devMode, inputLocked, logDevCoords, pulseNode, tryUnlockDevMode],
  )

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      logDevCoords(e.clientX, e.clientY)
      if (devMode) return
      if (phaseRef.current !== 'drawing' || completeFiredRef.current) return

      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      e.preventDefault()
      fingerRef.current = clientToLocal(e.clientX, e.clientY, rect)

      const layout = buildLayout(rect)
      const hit = nearestNodeAt(e.clientX, e.clientY, layout, rect, LANTERN_NEXT_NODE_HIT_BOOST)
      if (hit === null) return

      const extended = tryExtendPath(pathRef.current, usedEdgesRef.current, hit)
      if (extended) {
        applyProgress(extended.path, extended.usedEdges)
      }
    },
    [applyProgress, devMode, logDevCoords],
  )

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
      if (devMode) return
      if (phaseRef.current !== 'drawing') return

      e.preventDefault()
      fingerRef.current = null

      if (completeFiredRef.current) return

      if (usedEdgesRef.current.size < LANTERN_TOTAL_EDGES) {
        triggerFail()
      }
    },
    [devMode, triggerFail],
  )

  const handlePointerCancel = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }, [])

  return (
    <div className="w-full">
      <p className="mb-2 text-center text-[11px] leading-relaxed text-mist-muted">
        千灯结印 — 对称灯笼入门描摹，唤醒【布依千灯灵】
      </p>
      <p className="mb-3 text-center text-xs text-mist-faint">
        从钩顶「始」起笔，绕鼓框后沿中轴落至穗尖「终」；共 {LANTERN_TOTAL_EDGES} 条灯骨，每条仅走一次
      </p>

      <div
        ref={containerRef}
        className="interactive-area relative mx-auto w-full touch-none select-none overflow-hidden rounded-xl border border-amber-500/25 shadow-[0_0_28px_rgba(245,120,40,0.15)]"
        style={{
          touchAction: 'none',
          minHeight: 'min(68dvh, 480px)',
          maxHeight: 'min(72dvh, 520px)',
        }}
        onPointerDown={inputLocked && !devMode ? undefined : handlePointerDown}
        onPointerMove={inputLocked && !devMode ? undefined : handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <div className="pointer-events-none absolute inset-0">
          <img
            src={PLACEHOLDER_NIGHT_VIEW}
            alt=""
            className={`h-full w-full object-cover transition-opacity duration-700 ${
              bgLoaded ? 'opacity-30' : 'opacity-0'
            }`}
            draggable={false}
            onLoad={() => setBgLoaded(true)}
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-indigo-950/85 via-amber-950/55 to-void-950/92"
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_50%_42%,rgba(255,120,40,0.12),transparent_70%)]"
            aria-hidden
          />
        </div>

        <motion.div
          className="pointer-events-none absolute inset-0 z-10 bg-black"
          initial={false}
          animate={{ opacity: showOverlay ? 0.7 : 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        />

        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 z-20 h-full w-full"
          aria-hidden
        />

        <AnimatePresence>
          {(phase === 'reveal' || phase === 'done') && (
            <motion.div
              className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center px-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                initial={{ opacity: 0, y: 36, scale: 0.88 }}
                animate={{ opacity: 1, y: [0, -10, 0], scale: 1 }}
                transition={{
                  opacity: { duration: 0.9, ease: 'easeOut' },
                  scale: { duration: 0.9, ease: 'easeOut' },
                  y: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
                }}
                className="relative w-full max-w-[min(88%,240px)]"
              >
                <div className="absolute -inset-4 rounded-3xl bg-amber-400/25 blur-2xl" />
                <img
                  src={PLACEHOLDER_SPIRIT_CARD}
                  alt="布依千灯灵"
                  className="relative w-full rounded-2xl border border-amber-300/40 shadow-[0_0_48px_rgba(251,191,36,0.55)]"
                  draggable={false}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {devMode && import.meta.env.DEV && (
          <div className="pointer-events-none absolute left-2 top-2 z-40 max-w-[55%] rounded bg-red-950/80 px-2 py-1 text-[9px] leading-relaxed text-red-200">
            devMode · 触摸打印坐标
            <br />
            下一节点：{NODES.find((n) => n.id === lockedPath[lockedPath.length - 1])?.part ?? '—'}
          </div>
        )}

        {phase === 'idle' && !devMode && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center">
            <span className="rounded-full border border-amber-400/40 bg-void-950/75 px-3 py-1.5 text-[10px] tracking-widest text-amber-100/95 backdrop-blur-sm">
              钩顶起笔 → 绕框 → 中轴 → 穗尖收笔
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-mist-faint">
        <span>
          灯骨 {usedEdges.size}/{LANTERN_TOTAL_EDGES}
          {phase === 'drawing' && lockedPath.length > 0
            ? ` · 当前：${NODES.find((n) => n.id === lockedPath[lockedPath.length - 1])?.part ?? '连线中'}`
            : ''}
          {phase === 'fail' ? ' · 结印断裂，请重试' : ''}
        </span>
        {phase !== 'reveal' && phase !== 'done' && phase !== 'burst' && (
          <button
            type="button"
            className="rounded-lg border border-amber-500/25 px-2.5 py-1 text-amber-200/90 active:bg-amber-500/10"
            onClick={resetGame}
          >
            重绘结印
          </button>
        )}
      </div>
    </div>
  )
}

export default ThousandLanternsGame

/** Day 5 千灯结印 — 与配置 QianDengJieYin 同名导出 */
export { ThousandLanternsGame as QianDengJieYin }
