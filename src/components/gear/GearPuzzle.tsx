import { AnimatePresence, motion } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'

type GearSize = 'sm' | 'md' | 'lg'

const GRID_COLS = 5
const GRID_ROWS = 5
const CELL_PX = 64
const BOARD_PAD = 12
const TRAY_H = 88
const SNAP_PX = 30
const MESH_TOLERANCE = 8

const SIZE_CONFIG: Record<
  GearSize,
  { diameter: number; radius: number; label: string; teeth: number }
> = {
  sm: { diameter: 48, radius: 24, label: '小', teeth: 8 },
  md: { diameter: 64, radius: 32, label: '中', teeth: 10 },
  lg: { diameter: 80, radius: 40, label: '大', teeth: 12 },
}

type NodeKind = 'source' | 'target' | 'bearing' | 'dead'

interface GridNode {
  id: string
  col: number
  row: number
  kind: NodeKind
  fixedSize?: GearSize
}

/**
 * 5×5 地脉工坊 — 动力源左上 (0,0) → 目标右下 (4,4)
 * 解法（7 齿）：中→小→大→小→中→中→中，绕过 dead1~3
 * 齿距 64：中+中=64；中+小=56（容差内）；大+小=64
 */
const GRID_NODES: GridNode[] = [
  { id: 'source', col: 0, row: 0, kind: 'source', fixedSize: 'md' },
  { id: 'target', col: 4, row: 4, kind: 'target', fixedSize: 'md' },
  { id: 'b1', col: 1, row: 0, kind: 'bearing' },
  { id: 'b2', col: 2, row: 0, kind: 'bearing' },
  { id: 'b3', col: 3, row: 0, kind: 'bearing' },
  { id: 'b4', col: 4, row: 0, kind: 'bearing' },
  { id: 'b5', col: 4, row: 1, kind: 'bearing' },
  { id: 'b6', col: 4, row: 2, kind: 'bearing' },
  { id: 'b7', col: 4, row: 3, kind: 'bearing' },
  { id: 'b8', col: 2, row: 3, kind: 'bearing' },
  { id: 'dead1', col: 1, row: 1, kind: 'dead' },
  { id: 'dead2', col: 2, row: 1, kind: 'dead' },
  { id: 'dead3', col: 3, row: 2, kind: 'dead' },
]

/** 过量齿轮库：3 大 + 4 中 + 3 小 */
const GEAR_POOL: { id: string; size: GearSize }[] = [
  { id: 'g-lg1', size: 'lg' },
  { id: 'g-lg2', size: 'lg' },
  { id: 'g-lg3', size: 'lg' },
  { id: 'g-md1', size: 'md' },
  { id: 'g-md2', size: 'md' },
  { id: 'g-md3', size: 'md' },
  { id: 'g-md4', size: 'md' },
  { id: 'g-sm1', size: 'sm' },
  { id: 'g-sm2', size: 'sm' },
  { id: 'g-sm3', size: 'sm' },
]

interface SparkBurst {
  id: number
  x: number
  y: number
}

function getOrthogonalNeighbors(node: GridNode): GridNode[] {
  return GRID_NODES.filter(
    (n) =>
      n.id !== node.id &&
      n.kind !== 'dead' &&
      Math.abs(n.col - node.col) + Math.abs(n.row - node.row) === 1,
  )
}

function gridCenterPx(col: number, row: number) {
  return {
    x: BOARD_PAD + (col + 0.5) * CELL_PX,
    y: BOARD_PAD + (row + 0.5) * CELL_PX,
  }
}

function getNodeRadius(nodeId: string, placed: Record<string, string>): number {
  const node = GRID_NODES.find((n) => n.id === nodeId)!
  if (node.kind === 'source' || node.kind === 'target') {
    return SIZE_CONFIG[node.fixedSize!].radius
  }
  const gearId = placed[nodeId]
  if (!gearId) return 0
  const gear = GEAR_POOL.find((g) => g.id === gearId)
  return gear ? SIZE_CONFIG[gear.size].radius : 0
}

function centerDistancePx(a: GridNode, b: GridNode): number {
  const dc = Math.abs(a.col - b.col)
  const dr = Math.abs(a.row - b.row)
  if (dc + dr !== 1) return Infinity
  return CELL_PX
}

function canMeshRadii(r1: number, r2: number, distance: number): boolean {
  if (r1 <= 0 || r2 <= 0) return false
  return Math.abs(distance - (r1 + r2)) <= MESH_TOLERANCE
}

function isDeadNode(id: string) {
  return GRID_NODES.find((n) => n.id === id)?.kind === 'dead'
}

function GearSvg({
  size,
  spinning,
  reverse,
  glow,
  jammed,
  opacity = 1,
  gradId = 'gearGrad',
}: {
  size: GearSize
  spinning?: boolean
  reverse?: boolean
  glow?: boolean
  jammed?: boolean
  opacity?: number
  gradId?: string
}) {
  const { teeth, diameter } = SIZE_CONFIG[size]
  const r = diameter / 2
  const inner = r * 0.72
  const hole = r * 0.22

  let d = ''
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2
    const a1 = ((i + 0.35) / teeth) * Math.PI * 2
    const a2 = ((i + 0.65) / teeth) * Math.PI * 2
    const a3 = ((i + 1) / teeth) * Math.PI * 2
    const p = (a: number, rad: number) => ({
      x: r + Math.cos(a) * rad,
      y: r + Math.sin(a) * rad,
    })
    const o0 = p(a0, inner)
    const o1 = p(a1, r)
    const o2 = p(a2, r)
    const o3 = p(a3, inner)
    d += `${i === 0 ? 'M' : 'L'}${o0.x},${o0.y} L${o1.x},${o1.y} L${o2.x},${o2.y} L${o3.x},${o3.y} `
  }
  d += 'Z'

  const duration = size === 'lg' ? 5 : size === 'md' ? 4 : 3

  return (
    <motion.div
      className="flex h-full w-full items-center justify-center"
      animate={
        jammed
          ? { rotate: 0, scale: [1, 1.03, 1] }
          : spinning
            ? { rotate: reverse ? -360 : 360 }
            : { rotate: 0 }
      }
      transition={
        jammed
          ? { repeat: Infinity, duration: 0.45 }
          : spinning
            ? { repeat: Infinity, duration, ease: 'linear' }
            : { duration: 0.25 }
      }
      style={{
        opacity,
        filter: jammed
          ? 'drop-shadow(0 0 10px rgba(248,113,113,0.9))'
          : glow
            ? 'drop-shadow(0 0 12px rgba(253,230,138,0.85))'
            : undefined,
      }}
    >
      <svg width={diameter} height={diameter} viewBox={`0 0 ${diameter} ${diameter}`} aria-hidden>
        <path
          d={d}
          fill={`url(#${gradId})`}
          stroke={jammed ? '#f87171' : glow ? '#fde68a' : '#94a3b8'}
          strokeWidth={jammed ? 2.2 : glow ? 2 : 1.2}
          opacity={0.95}
        />
        <circle
          cx={r}
          cy={r}
          r={hole}
          fill="#071218"
          stroke={jammed ? '#f87171' : glow ? '#fde68a' : '#2dd4a8'}
          strokeWidth={1}
        />
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={jammed ? '#7f1d1d' : glow ? '#78716c' : '#64748b'} />
            <stop
              offset="50%"
              stopColor={jammed ? '#ef4444' : glow ? '#fde68a' : '#94a3b8'}
            />
            <stop offset="100%" stopColor={jammed ? '#991b1b' : glow ? '#a8a29e' : '#475569'} />
          </linearGradient>
        </defs>
      </svg>
    </motion.div>
  )
}

/** 咬合成功时的火花粒子（CSS 动画） */
function MeshSparks({ x, y }: { x: number; y: number }) {
  const particles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    angle: (i / 8) * Math.PI * 2,
  }))

  return (
    <div
      className="pointer-events-none absolute z-50"
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className="gear-mesh-spark absolute block h-1.5 w-1.5 rounded-full bg-amber-300"
          style={
            {
              '--spark-angle': `${p.angle}rad`,
            } as CSSProperties
          }
        />
      ))}
      <span className="gear-mesh-flash absolute -inset-3 rounded-full bg-amber-200/40" />
    </div>
  )
}

interface DragState {
  gearId: string
  offsetX: number
  offsetY: number
  x: number
  y: number
}

interface GearPuzzleProps {
  onSuccess?: () => void
}

export function GearPuzzle({ onSuccess }: GearPuzzleProps) {
  const boardRef = useRef<HTMLDivElement>(null)
  const successFiredRef = useRef(false)
  const sparkIdRef = useRef(0)

  const [placed, setPlaced] = useState<Record<string, string>>({})
  const [drag, setDrag] = useState<DragState | null>(null)
  const [rejectFlash, setRejectFlash] = useState<string | null>(null)
  const [targetPowered, setTargetPowered] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const [sparks, setSparks] = useState<SparkBurst[]>([])

  const boardW = GRID_COLS * CELL_PX + BOARD_PAD * 2
  const boardH = GRID_ROWS * CELL_PX + BOARD_PAD * 2 + TRAY_H

  const jammed = useMemo(
    () => Object.keys(placed).some((nodeId) => isDeadNode(nodeId)),
    [placed],
  )

  const validatePlacement = useCallback(
    (bearingId: string, gearSize: GearSize): boolean => {
      const node = GRID_NODES.find((n) => n.id === bearingId)!
      if (node.kind === 'dead') return true

      const rNew = SIZE_CONFIG[gearSize].radius
      const neighbors = getOrthogonalNeighbors(node)

      const occupiedNeighbors = neighbors.filter((nb) => {
        if (nb.kind === 'source' || nb.kind === 'target') return true
        return Boolean(placed[nb.id])
      })

      if (occupiedNeighbors.length === 0) return false

      const trialPlaced = { ...placed, [bearingId]: '__trial__' }

      for (const nb of occupiedNeighbors) {
        const rNb =
          nb.id === bearingId
            ? rNew
            : getNodeRadius(nb.id, nb.id === bearingId ? trialPlaced : placed)
        const dist = centerDistancePx(node, nb)
        if (!canMeshRadii(rNew, rNb, dist)) return false
      }

      return true
    },
    [placed],
  )

  const { poweredIds, spinDirection } = useMemo(() => {
    if (jammed) {
      return { poweredIds: new Set<string>(), spinDirection: new Map<string, number>() }
    }

    const powered = new Set<string>(['source'])
    const dir = new Map<string, number>([['source', 1]])
    const queue = ['source']

    const isActive = (id: string) => {
      const n = GRID_NODES.find((x) => x.id === id)!
      if (n.kind === 'dead') return false
      if (n.kind === 'source' || n.kind === 'target') return true
      return Boolean(placed[id])
    }

    while (queue.length > 0) {
      const id = queue.shift()!
      const node = GRID_NODES.find((n) => n.id === id)!
      const r1 = getNodeRadius(id, placed)

      for (const nb of getOrthogonalNeighbors(node)) {
        if (!isActive(nb.id) || powered.has(nb.id)) continue
        const r2 = getNodeRadius(nb.id, placed)
        const dist = centerDistancePx(node, nb)
        if (canMeshRadii(r1, r2, dist)) {
          powered.add(nb.id)
          dir.set(nb.id, -(dir.get(id) ?? 1))
          queue.push(nb.id)
        }
      }
    }

    return { poweredIds: powered, spinDirection: dir }
  }, [placed, jammed])

  useEffect(() => {
    const targetOn = !jammed && poweredIds.has('target')
    setTargetPowered(targetOn)

    if (!targetOn || successFiredRef.current) return
    successFiredRef.current = true
    setCelebrating(true)
    const timer = window.setTimeout(() => onSuccess?.(), 1000)
    return () => window.clearTimeout(timer)
  }, [poweredIds, jammed, onSuccess])

  const triggerSpark = useCallback((nodeId: string) => {
    const node = GRID_NODES.find((n) => n.id === nodeId)!
    const local = gridCenterPx(node.col, node.row)
    const id = sparkIdRef.current++
    setSparks((prev) => [...prev, { id, x: local.x, y: local.y }])
    window.setTimeout(() => {
      setSparks((prev) => prev.filter((s) => s.id !== id))
    }, 650)
  }, [])

  const getNodeCenterPx = useCallback((node: GridNode) => {
    const board = boardRef.current
    if (!board) return { x: 0, y: 0 }
    const rect = board.getBoundingClientRect()
    const local = gridCenterPx(node.col, node.row)
    return { x: rect.left + local.x, y: rect.top + local.y }
  }, [])

  const getTrayPositionPx = useCallback(
    (gearId: string, gearSize: GearSize) => {
      const board = boardRef.current
      if (!board) return { x: 0, y: 0 }
      const rect = board.getBoundingClientRect()
      const { diameter } = SIZE_CONFIG[gearSize]
      const pool = GEAR_POOL.filter(
        (g) => !Object.values(placed).includes(g.id) && g.id !== drag?.gearId,
      )
      const slot = pool.findIndex((g) => g.id === gearId)
      const cols = 5
      const row = Math.floor(slot / cols)
      const col = slot % cols
      const cellW = rect.width / (cols + 0.5)
      return {
        x: rect.left + cellW * (col + 0.75) - diameter / 2,
        y: rect.bottom - TRAY_H + 12 + row * (diameter + 6),
      }
    },
    [placed, drag?.gearId],
  )

  const handleGearPointerDown = useCallback(
    (e: ReactPointerEvent, gearId: string, gearSize: GearSize) => {
      if (celebrating || Object.values(placed).includes(gearId)) return
      e.preventDefault()
      e.stopPropagation()
      const { diameter } = SIZE_CONFIG[gearSize]
      setDrag({
        gearId,
        offsetX: diameter / 2,
        offsetY: diameter / 2,
        x: e.clientX - diameter / 2,
        y: e.clientY - diameter / 2,
      })
      boardRef.current?.setPointerCapture(e.pointerId)
    },
    [celebrating, placed],
  )

  const handleBoardPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!drag) return
      e.preventDefault()
      setDrag((d) =>
        d ? { ...d, x: e.clientX - d.offsetX, y: e.clientY - d.offsetY } : null,
      )
    },
    [drag],
  )

  const handleBoardPointerUp = useCallback(
    (e: ReactPointerEvent) => {
      if (!drag) return
      e.preventDefault()

      const gear = GEAR_POOL.find((g) => g.id === drag.gearId)!
      const { diameter } = SIZE_CONFIG[gear.size]
      const gearCenter = { x: drag.x + diameter / 2, y: drag.y + diameter / 2 }

      let snapped: GridNode | null = null
      let minDist = Infinity

      for (const node of GRID_NODES) {
        if ((node.kind !== 'bearing' && node.kind !== 'dead') || placed[node.id]) continue
        const nc = getNodeCenterPx(node)
        const dist = Math.hypot(gearCenter.x - nc.x, gearCenter.y - nc.y)
        if (dist < SNAP_PX && dist < minDist) {
          minDist = dist
          snapped = node
        }
      }

      if (snapped) {
        const onDead = snapped.kind === 'dead'
        const valid = onDead || validatePlacement(snapped.id, gear.size)

        if (valid) {
          setPlaced((p) => ({ ...p, [snapped!.id]: gear.id }))
          if (!onDead) triggerSpark(snapped.id)
        } else {
          setRejectFlash(gear.id)
          window.setTimeout(() => setRejectFlash(null), 450)
        }
      }

      setDrag(null)
      if (boardRef.current?.hasPointerCapture(e.pointerId)) {
        boardRef.current.releasePointerCapture(e.pointerId)
      }
    },
    [drag, placed, getNodeCenterPx, validatePlacement, triggerSpark],
  )

  const handleReset = useCallback(() => {
    successFiredRef.current = false
    setPlaced({})
    setDrag(null)
    setRejectFlash(null)
    setTargetPowered(false)
    setCelebrating(false)
    setSparks([])
  }, [])

  const placedCount = Object.keys(placed).length
  const bearingCount = GRID_NODES.filter((n) => n.kind === 'bearing').length

  const renderNodeGear = (node: GridNode) => {
    let size: GearSize | null = null
    if (node.kind === 'source' || node.kind === 'target') {
      size = node.fixedSize!
    } else {
      const gearId = placed[node.id]
      if (!gearId) return null
      size = GEAR_POOL.find((g) => g.id === gearId)?.size ?? null
    }
    if (!size) return null

    const isPowered = !jammed && poweredIds.has(node.id)
    const isJammedGear = jammed && Boolean(placed[node.id])
    const reverse = (spinDirection.get(node.id) ?? 1) < 0
    const isTarget = node.id === 'target'
    const { diameter } = SIZE_CONFIG[size]
    const local = gridCenterPx(node.col, node.row)

    return (
      <div
        key={`gear-${node.id}`}
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
        style={{
          left: local.x,
          top: local.y,
          width: diameter,
          height: diameter,
          zIndex: 20,
        }}
      >
        <GearSvg
          size={size}
          spinning={isPowered}
          reverse={reverse}
          glow={isTarget && targetPowered}
          jammed={isJammedGear || (node.kind === 'dead' && Boolean(placed[node.id]))}
          gradId={`grad-${node.id}`}
        />
      </div>
    )
  }

  return (
    <div className="w-full">
      <p className="mb-3 text-center text-xs leading-relaxed text-mist-muted">
        5×5 地脉工坊：将过量齿轮精准装入轴承，绕过<span className="text-red-300">生锈死轴</span>
        ，让动力从<span className="text-sky-bright">左上</span>传至
        <span className="text-gold-bright">右下</span>目标齿。
        <br />
        齿距 = 两半径之和（如中+中、大+小）；误装死轴将整组卡死。
      </p>

      <div
        ref={boardRef}
        className={`relative mx-auto touch-none select-none overflow-hidden rounded-xl border bg-void-950 shadow-glow ${
          jammed ? 'border-red-500/50' : 'border-jade/25'
        }`}
        style={{
          touchAction: 'none',
          width: boardW,
          height: boardH,
          maxWidth: '100%',
        }}
        onPointerMove={handleBoardPointerMove}
        onPointerUp={handleBoardPointerUp}
        onPointerCancel={handleBoardPointerUp}
      >
        <div
          className={`pointer-events-none absolute inset-0 ${
            jammed
              ? 'bg-[radial-gradient(ellipse_at_50%_40%,rgba(248,113,113,0.12),transparent_65%)]'
              : 'bg-[radial-gradient(ellipse_at_50%_38%,rgba(56,189,248,0.07),transparent_65%)]'
          }`}
        />

        <div
          className="pointer-events-none absolute grid gap-0"
          style={{
            left: BOARD_PAD,
            top: BOARD_PAD,
            width: GRID_COLS * CELL_PX,
            height: GRID_ROWS * CELL_PX,
            gridTemplateColumns: `repeat(${GRID_COLS}, ${CELL_PX}px)`,
            gridTemplateRows: `repeat(${GRID_ROWS}, ${CELL_PX}px)`,
          }}
        >
          {Array.from({ length: GRID_COLS * GRID_ROWS }).map((_, i) => (
            <div key={i} className="border border-void-700/50 bg-void-900/20" />
          ))}
        </div>

        {GRID_NODES.map((node) => {
          const local = gridCenterPx(node.col, node.row)
          const filled = node.kind === 'bearing' || node.kind === 'dead' ? Boolean(placed[node.id]) : true
          const isDead = node.kind === 'dead'
          const ring =
            node.kind === 'source' || node.kind === 'target' ? 32 : isDead ? 26 : 24

          return (
            <div
              key={node.id}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: local.x, top: local.y }}
            >
              <div
                className={`flex items-center justify-center rounded-full border-2 ${
                  node.kind === 'source'
                    ? 'border-sky-bright/50 bg-sky-deep/25'
                    : node.kind === 'target'
                      ? targetPowered
                        ? 'border-gold-bright/70 bg-gold-muted/20 shadow-[0_0_20px_rgba(253,230,138,0.4)]'
                        : 'border-gold-muted/40 bg-void-800/50'
                      : isDead
                        ? filled
                          ? 'border-red-500/80 bg-red-950/40'
                          : 'border-red-900/60 bg-red-950/25'
                        : filled
                          ? 'border-jade-bright/30 bg-jade-deep/15'
                          : 'border-dashed border-mist-faint/30 bg-void-800/30'
                }`}
                style={{ width: ring * 2, height: ring * 2 }}
              >
                {isDead && !filled && (
                  <span className="text-[8px] font-medium text-red-400/90">死轴</span>
                )}
                {!filled && node.kind === 'bearing' && (
                  <span className="text-[8px] text-mist-faint/70">轴承</span>
                )}
                {node.kind === 'source' && (
                  <span className="text-[8px] font-medium text-sky-bright">动力</span>
                )}
                {node.kind === 'target' && !targetPowered && (
                  <span className="text-[8px] font-medium text-gold-muted">目标</span>
                )}
              </div>
            </div>
          )
        })}

        {GRID_NODES.map(renderNodeGear)}

        {sparks.map((s) => (
          <MeshSparks key={s.id} x={s.x} y={s.y} />
        ))}

        {GEAR_POOL.map((gear) => {
          if (Object.values(placed).includes(gear.id)) return null
          if (drag?.gearId === gear.id) return null

          const board = boardRef.current
          if (!board) return null
          const pos = getTrayPositionPx(gear.id, gear.size)
          const rect = board.getBoundingClientRect()
          const { diameter } = SIZE_CONFIG[gear.size]

          return (
            <motion.div
              key={gear.id}
              layout
              className={`absolute cursor-grab active:cursor-grabbing ${
                rejectFlash === gear.id ? 'animate-pulse ring-2 ring-red-400/80' : ''
              }`}
              style={{
                left: pos.x - rect.left,
                top: pos.y - rect.top,
                width: diameter,
                height: diameter,
                zIndex: 30,
                touchAction: 'none',
              } as CSSProperties}
              onPointerDown={(e) => handleGearPointerDown(e, gear.id, gear.size)}
            >
              <GearSvg size={gear.size} gradId={`pool-${gear.id}`} />
            </motion.div>
          )
        })}

        {drag && (() => {
          const gear = GEAR_POOL.find((g) => g.id === drag.gearId)!
          const { diameter } = SIZE_CONFIG[gear.size]
          const board = boardRef.current
          if (!board) return null
          const rect = board.getBoundingClientRect()
          return (
            <div
              className="absolute cursor-grabbing"
              style={{
                left: drag.x - rect.left,
                top: drag.y - rect.top,
                width: diameter,
                height: diameter,
                zIndex: 100,
                filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))',
              }}
            >
              <GearSvg size={gear.size} opacity={0.92} />
            </div>
          )
        })()}

        {jammed && (
          <div className="pointer-events-none absolute inset-x-0 top-2 z-40 flex justify-center px-2">
            <div className="rounded-lg border border-red-400/60 bg-red-950/80 px-3 py-1.5 text-center backdrop-blur-sm">
              <p className="text-[11px] font-medium text-red-300">齿轮组卡死！请移除死轴或重新拆解</p>
            </div>
          </div>
        )}

        <AnimatePresence>
          {celebrating && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="pointer-events-none absolute inset-x-0 bottom-[5.5rem] z-50 flex justify-center px-3"
            >
              <div className="rounded-2xl border border-gold-bright/50 bg-void-950/80 px-5 py-3 text-center shadow-glow-gold backdrop-blur-sm">
                <p className="text-base font-medium text-gold-bright">地脉联动成功！</p>
                <p className="mt-0.5 text-[11px] text-jade-bright">动力已传导至右下目标齿轮</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <style>{`
          @keyframes gear-mesh-spark-fly {
            0% { transform: translate3d(-3px, -3px, 0) rotate(var(--spark-angle)) translateX(0); opacity: 1; }
            100% { transform: translate3d(-3px, -3px, 0) rotate(var(--spark-angle)) translateX(22px); opacity: 0; }
          }
          @keyframes gear-mesh-flash-pop {
            0% { transform: scale(0.3); opacity: 0.9; }
            100% { transform: scale(1.6); opacity: 0; }
          }
          .gear-mesh-spark {
            left: 50%;
            top: 50%;
            transform: translate3d(-3px, -3px, 0);
            will-change: transform, opacity;
            backface-visibility: hidden;
            animation: gear-mesh-spark-fly 0.55s ease-out forwards;
            box-shadow: 0 0 6px rgba(253, 230, 138, 0.9);
          }
          .gear-mesh-flash {
            animation: gear-mesh-flash-pop 0.45s ease-out forwards;
          }
        `}</style>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-mist-faint">
        <span>
          轴承 {placedCount}/{bearingCount}
          {jammed ? ' · 卡死' : poweredIds.size > 1 ? ` · 传动 ${poweredIds.size - 1} 齿` : ''}
        </span>
        <button
          type="button"
          className="rounded-lg border border-sky/25 px-2.5 py-1 text-sky-bright active:bg-sky/10"
          onPointerDown={(e) => {
            e.preventDefault()
            handleReset()
          }}
        >
          重新拆解
        </button>
      </div>
    </div>
  )
}

export default GearPuzzle
