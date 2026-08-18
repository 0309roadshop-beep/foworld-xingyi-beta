import { motion } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { preventGhostActivation } from '../../utils/touchInteraction'

/** 网格尺寸 */
const GRID_SIZE = 5
/** 方向：0=北 1=东 2=南 3=西（顺时针） */
const N = 0
const E = 1
const S = 2
const W = 3

type PipeType = 'straight' | 'corner' | 'start' | 'end' | 'filler'

interface Cell {
  type: PipeType
  /** 顺时针旋转角度 0 | 90 | 180 | 270 */
  rotation: number
}

interface PipeConnectProps {
  onSuccess?: () => void
}

const START: [number, number] = [0, 0]
const END: [number, number] = [GRID_SIZE - 1, GRID_SIZE - 1]

/** 各类型在 rotation=0 时的开口方向（基准） */
const BASE_OPENINGS: Record<PipeType, number[]> = {
  straight: [N, S],
  corner: [N, E],
  start: [S],
  end: [N],
  filler: [N, E, S], // T 形缺一口，仅作干扰
}

const DR = [-1, 0, 1, 0]
const DC = [0, 1, 0, -1]

function key(r: number, c: number) {
  return `${r},${c}`
}


function orientationSteps(rotation: number): number {
  return ((Math.floor(rotation / 90) % 4) + 4) % 4
}

/** 根据 type + rotation 计算当前开口 */
function getOpenings(cell: Cell): Set<number> {
  const steps = orientationSteps(cell.rotation)
  return new Set(BASE_OPENINGS[cell.type].map((d) => (d + steps) % 4))
}

function dirBetween(fromR: number, fromC: number, toR: number, toC: number): number {
  if (toR < fromR) return N
  if (toC > fromC) return E
  if (toR > fromR) return S
  return W
}

function openingsToType(openings: number[]): PipeType {
  if (openings.length <= 1) return 'straight'
  const sorted = [...openings].sort((a, b) => a - b)
  const [a, b] = sorted
  if ((a + 2) % 4 === b) return 'straight'
  return 'corner'
}

function findRotation(type: PipeType, required: Set<number>): number {
  for (let rot = 0; rot < 360; rot += 90) {
    const opens = getOpenings({ type, rotation: rot })
    if (required.size === opens.size && [...required].every((d) => opens.has(d))) {
      return rot
    }
  }
  return 0
}

function randomWrongRotation(_type: PipeType, correct: number): number {
  const opts = [0, 90, 180, 270].filter((r) => r !== correct)
  return opts[Math.floor(Math.random() * opts.length)] ?? 90
}

/** 随机游走生成一条从起点到终点的路径 */
function generatePath(size: number): [number, number][] {
  const path: [number, number][] = [[0, 0]]
  const visited = new Set([key(0, 0)])
  let [r, c] = [0, 0]

  while (r !== size - 1 || c !== size - 1) {
    const candidates: [number, number][] = []
    if (r + 1 < size && !visited.has(key(r + 1, c))) candidates.push([r + 1, c])
    if (c + 1 < size && !visited.has(key(r, c + 1))) candidates.push([r, c + 1])

    if (candidates.length === 0) {
      // 回溯
      path.pop()
      if (path.length === 0) return generatePath(size)
      ;[r, c] = path[path.length - 1]
      continue
    }

    // 偏向终点，保留随机性
    candidates.sort((a, b) => {
      const da = (size - 1 - a[0]) + (size - 1 - a[1])
      const db = (size - 1 - b[0]) + (size - 1 - b[1])
      return da - db + (Math.random() - 0.5) * 2
    })

    const pick = candidates[Math.random() < 0.65 ? 0 : Math.floor(Math.random() * candidates.length)]
    ;[r, c] = pick
    path.push([r, c])
    visited.add(key(r, c))
  }
  return path
}

/** 根据路径铺设水管类型，并打乱旋转 */
function buildPuzzleGrid(size: number): Cell[][] {
  const path = generatePath(size)
  const pathSet = new Set(path.map(([r, c]) => key(r, c)))
  const grid: Cell[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ type: 'filler' as PipeType, rotation: 0 })),
  )

  for (let i = 0; i < path.length; i++) {
    const [r, c] = path[i]
    const openings: number[] = []

    if (i > 0) {
      const [pr, pc] = path[i - 1]
      openings.push(dirBetween(pr, pc, r, c))
    }
    if (i < path.length - 1) {
      const [nr, nc] = path[i + 1]
      openings.push(dirBetween(r, c, nr, nc))
    }

    let type: PipeType
    if (i === 0) type = 'start'
    else if (i === path.length - 1) type = 'end'
    else type = openingsToType(openings)

    const required = new Set(openings)
    const correctRot = findRotation(type, required)
    grid[r][c] = { type, rotation: randomWrongRotation(type, correctRot) }
  }

  // 非路径格：随机直线 / 直角干扰
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (pathSet.has(key(r, c))) continue
      const type: PipeType = Math.random() > 0.5 ? 'straight' : 'corner'
      grid[r][c] = { type, rotation: Math.floor(Math.random() * 4) * 90 }
    }
  }

  return grid
}

/** 两格之间接口是否吻合 */
function cellsConnect(grid: Cell[][], r1: number, c1: number, r2: number, c2: number): boolean {
  const exitDir = dirBetween(r1, c1, r2, c2)
  const enterDir = (exitDir + 2) % 4
  return getOpenings(grid[r1][c1]).has(exitDir) && getOpenings(grid[r2][c2]).has(enterDir)
}

/** BFS 检测起点到终点是否连通 */
function findConnectedPath(grid: Cell[][]): [number, number][] | null {
  const size = grid.length
  const [sr, sc] = START
  const [er, ec] = END
  const queue: [number, number][] = [[sr, sc]]
  const visited = new Set([key(sr, sc)])
  const parent = new Map<string, string>()

  while (queue.length > 0) {
    const [r, c] = queue.shift()!
    if (r === er && c === ec) {
      const path: [number, number][] = []
      let cur = key(er, ec)
      while (cur) {
        const [pr, pc] = cur.split(',').map(Number) as [number, number]
        path.unshift([pr, pc])
        cur = parent.get(cur) ?? ''
      }
      return path
    }

    for (let d = 0; d < 4; d++) {
      const nr = r + DR[d]
      const nc = c + DC[d]
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue
      const nk = key(nr, nc)
      if (visited.has(nk)) continue
      if (!cellsConnect(grid, r, c, nr, nc)) continue
      visited.add(nk)
      parent.set(nk, key(r, c))
      queue.push([nr, nc])
    }
  }
  return null
}

/** 水管 SVG 线框 */
function PipeGraphic({ cell, flowing }: { cell: Cell; flowing: boolean }) {
  const stroke = flowing ? '#7dd3fc' : 'rgba(148, 184, 200, 0.85)'
  const fill = flowing ? 'rgba(56, 189, 248, 0.35)' : 'rgba(45, 212, 168, 0.12)'
  const glow = flowing ? 'drop-shadow(0 0 6px rgba(56,189,248,0.9))' : 'none'

  if (cell.type === 'start') {
    return (
      <svg viewBox="0 0 40 40" className="h-full w-full" style={{ filter: glow }}>
        <circle cx="20" cy="20" r="10" fill={fill} stroke={stroke} strokeWidth="2" />
        <path d="M20 14 L20 28 M20 28 L16 24 M20 28 L24 24" stroke={stroke} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <text x="20" y="12" textAnchor="middle" fill="rgba(245,224,106,0.8)" fontSize="6">源</text>
      </svg>
    )
  }

  if (cell.type === 'end') {
    return (
      <svg viewBox="0 0 40 40" className="h-full w-full" style={{ filter: glow }}>
        <circle cx="20" cy="20" r="10" fill={fill} stroke={stroke} strokeWidth="2" />
        <path d="M20 12 L20 20 M14 26 L26 26" stroke={stroke} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <text x="20" y="36" textAnchor="middle" fill="rgba(245,224,106,0.8)" fontSize="6">汇</text>
      </svg>
    )
  }

  if (cell.type === 'straight') {
    return (
      <svg viewBox="0 0 40 40" className="h-full w-full" style={{ filter: glow }}>
        <rect x="16" y="4" width="8" height="32" rx="3" fill={fill} stroke={stroke} strokeWidth="2" />
      </svg>
    )
  }

  if (cell.type === 'corner') {
    return (
      <svg viewBox="0 0 40 40" className="h-full w-full" style={{ filter: glow }}>
        <path
          d="M20 4 L20 20 L36 20"
          fill="none"
          stroke={stroke}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M20 4 L20 20 L36 20" fill="none" stroke={fill} strokeWidth="4" strokeLinecap="round" />
      </svg>
    )
  }

  // filler T 形
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full opacity-70" style={{ filter: glow }}>
      <path d="M20 4 L20 36 M4 20 L36 20" stroke={stroke} strokeWidth="6" strokeLinecap="round" opacity="0.55" />
    </svg>
  )
}

export function PipeConnect({ onSuccess }: PipeConnectProps) {
  const successFiredRef = useRef(false)
  const [grid, setGrid] = useState<Cell[][]>(() => buildPuzzleGrid(GRID_SIZE))
  const [flowPath, setFlowPath] = useState<Set<string>>(new Set())
  const [won, setWon] = useState(false)

  const connectedPath = useMemo(() => findConnectedPath(grid), [grid])

  useEffect(() => {
    if (!connectedPath) {
      setFlowPath(new Set())
      return
    }

    setFlowPath(new Set(connectedPath.map(([r, c]) => key(r, c))))

    if (connectedPath.length > 0) {
      const last = connectedPath[connectedPath.length - 1]
      if (last[0] === END[0] && last[1] === END[1] && !successFiredRef.current) {
        successFiredRef.current = true
        setWon(true)
        onSuccess?.()
      }
    }
  }, [connectedPath, onSuccess])

  const handleRotate = useCallback(
    (r: number, c: number, e: ReactPointerEvent<HTMLButtonElement>) => {
      preventGhostActivation(e)
      if (won) return

      setGrid((prev) => {
        const next = prev.map((row) => row.map((cell) => ({ ...cell })))
        next[r][c] = {
          ...next[r][c],
          rotation: next[r][c].rotation + 90,
        }
        return next
      })
    },
    [won],
  )

  const reset = useCallback(() => {
    successFiredRef.current = false
    setWon(false)
    setFlowPath(new Set())
    setGrid(buildPuzzleGrid(GRID_SIZE))
  }, [])

  return (
    <div
      className="interactive-area w-full select-none"
      style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      <p className="mb-3 text-center text-xs text-mist-muted">
        点击水管顺时针旋转，接通左上角「源」至右下角「汇」的连续水路
      </p>

      <div
        className="mx-auto grid max-w-[min(92vw,320px)] gap-1.5 rounded-xl border border-sky-muted/25 bg-void-800/50 p-2"
        style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
          touchAction: 'none',
        }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const isFlow = flowPath.has(key(r, c))
            const isStart = r === START[0] && c === START[1]
            const isEnd = r === END[0] && c === END[1]

            return (
              <button
                key={key(r, c)}
                type="button"
                onPointerDown={(e) => handleRotate(r, c, e)}
                className={`relative aspect-square overflow-hidden rounded-lg border transition-[box-shadow,background-color,border-color] duration-300 ${
                  isFlow
                    ? 'border-sky-bright/70 bg-sky-deep/40 shadow-[0_0_14px_rgba(56,189,248,0.45)]'
                    : 'border-void-600/80 bg-void-900/60 active:bg-void-700/60'
                } ${isStart ? 'ring-1 ring-gold-muted/40' : ''} ${isEnd ? 'ring-1 ring-jade-muted/40' : ''}`}
                style={{ touchAction: 'none', WebkitTapHighlightColor: 'transparent' }}
              >
                <div
                  className="absolute inset-1 transition-transform duration-300 ease-out"
                  style={{ transform: `rotate(${cell.rotation}deg)` }}
                >
                  <PipeGraphic cell={cell} flowing={isFlow} />
                </div>
                {isFlow && won && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sky-bright/20 to-transparent"
                  />
                )}
              </button>
            )
          }),
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="text-mist-muted">
          {won ? (
            <span className="text-spirit">水路贯通！灵流已至汇点</span>
          ) : connectedPath && connectedPath.length > 1 ? (
            <span className="text-sky-bright">水路已连通 {connectedPath.length} 格…</span>
          ) : (
            '旋转水管对齐接口'
          )}
        </span>
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault()
            reset()
          }}
          className="rounded-full border border-mist-faint/25 px-3 py-1 text-mist-muted active:bg-void-700/50"
          style={{ touchAction: 'none' }}
        >
          重新生成
        </button>
      </div>
    </div>
  )
}
