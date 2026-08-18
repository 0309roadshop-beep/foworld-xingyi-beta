import { AnimatePresence, motion } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { preventGhostActivation } from '../../utils/touchInteraction'

const GRID_SIZE = 5
const N = 0
const E = 1
const S = 2
const W = 3

type PipeType = 'straight' | 'corner' | 'start' | 'end' | 'filler'

interface Cell {
  type: PipeType
  /** 累加旋转角度（90 的倍数，可超过 360，禁止取余写回） */
  rotation: number
}

export interface PipeConnectGameProps {
  onComplete?: () => void
}

/** Day 5 别名 */
export type PipePuzzleProps = PipeConnectGameProps

const START: [number, number] = [0, 0]
const END: [number, number] = [GRID_SIZE - 1, GRID_SIZE - 1]
const WIN_DELAY_MS = 1600

const BASE_OPENINGS: Record<PipeType, number[]> = {
  straight: [N, S],
  corner: [N, E],
  start: [S],
  end: [N],
  filler: [N, E, S],
}

const DR = [-1, 0, 1, 0]
const DC = [0, 1, 0, -1]

function key(r: number, c: number) {
  return `${r},${c}`
}

function shuffleInPlace<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

/** 连通性校验：从累加角度换算朝向步数（仅内部逻辑取余） */
function orientationSteps(rotation: number): number {
  return ((Math.floor(rotation / 90) % 4) + 4) % 4
}

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

function findOrientationSteps(type: PipeType, required: Set<number>): number {
  for (let steps = 0; steps < 4; steps++) {
    const opens = new Set(BASE_OPENINGS[type].map((d) => (d + steps) % 4))
    if (required.size === opens.size && [...required].every((d) => opens.has(d))) {
      return steps
    }
  }
  return 0
}

/** 第一步：DFS 生成从源头到阵眼的黄金路径（保证存在） */
function generateGoldenPath(size: number): [number, number][] {
  const [endR, endC]: [number, number] = [size - 1, size - 1]

  function dfs(
    r: number,
    c: number,
    path: [number, number][],
    visited: Set<string>,
  ): [number, number][] | null {
    if (r === endR && c === endC) return path

    const neighbors: [number, number][] = []
    for (let d = 0; d < 4; d++) {
      const nr = r + DR[d]
      const nc = c + DC[d]
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue
      if (visited.has(key(nr, nc))) continue
      neighbors.push([nr, nc])
    }

    shuffleInPlace(neighbors)

    for (const [nr, nc] of neighbors) {
      visited.add(key(nr, nc))
      const result = dfs(nr, nc, [...path, [nr, nc]], visited)
      if (result) return result
      visited.delete(key(nr, nc))
    }
    return null
  }

  const path = dfs(0, 0, [[0, 0]], new Set([key(0, 0)]))
  return path ?? generateGoldenPath(size)
}

/** 第三步：在正确朝向上叠加 1~3 个 90° 错位，保证可旋回且有初始打乱 */
function scrambleRotationDegrees(correctSteps: number): number {
  const wrongOffset = 1 + Math.floor(Math.random() * 3)
  return (correctSteps + wrongOffset) * 90
}

/**
 * 逆向工程生成：先铺黄金解 → 填充干扰 → 打乱角度
 * 保证 100% 有解（旋回黄金路径即通关）
 */
function buildPuzzleGrid(size: number): Cell[][] {
  const goldenPath = generateGoldenPath(size)
  const pathSet = new Set(goldenPath.map(([r, c]) => key(r, c)))
  const grid: Cell[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ type: 'filler' as PipeType, rotation: 0 })),
  )

  for (let i = 0; i < goldenPath.length; i++) {
    const [r, c] = goldenPath[i]
    const openings: number[] = []

    if (i > 0) {
      const [pr, pc] = goldenPath[i - 1]
      openings.push(dirBetween(pr, pc, r, c))
    }
    if (i < goldenPath.length - 1) {
      const [nr, nc] = goldenPath[i + 1]
      openings.push(dirBetween(r, c, nr, nc))
    }

    let type: PipeType
    if (i === 0) type = 'start'
    else if (i === goldenPath.length - 1) type = 'end'
    else type = openingsToType(openings)

    const required = new Set(openings)
    const correctSteps = findOrientationSteps(type, required)
    grid[r][c] = { type, rotation: scrambleRotationDegrees(correctSteps) }
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (pathSet.has(key(r, c))) continue
      const type: PipeType = Math.random() > 0.5 ? 'straight' : 'corner'
      grid[r][c] = {
        type,
        rotation: Math.floor(Math.random() * 4) * 90,
      }
    }
  }

  return grid
}

function cellsConnect(grid: Cell[][], r1: number, c1: number, r2: number, c2: number): boolean {
  const exitDir = dirBetween(r1, c1, r2, c2)
  const enterDir = (exitDir + 2) % 4
  return getOpenings(grid[r1][c1]).has(exitDir) && getOpenings(grid[r2][c2]).has(enterDir)
}

function findConnectedPath(grid: Cell[][]): [number, number][] | null {
  const size = grid.length
  const [sr, sc] = START
  const [er, ec] = END
  const stack: [number, number][] = [[sr, sc]]
  const visited = new Set([key(sr, sc)])
  const parent = new Map<string, string>()

  while (stack.length > 0) {
    const [r, c] = stack.pop()!
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
      stack.push([nr, nc])
    }
  }
  return null
}

function PipeGraphic({ cell, flowing }: { cell: Cell; flowing: boolean }) {
  const stroke = flowing ? '#f5d76e' : 'rgba(125, 211, 252, 0.82)'
  const fill = flowing ? 'rgba(245, 215, 110, 0.28)' : 'rgba(56, 189, 248, 0.14)'
  const glow = flowing
    ? 'drop-shadow(0 0 8px rgba(245,215,110,0.85))'
    : 'drop-shadow(0 0 4px rgba(56,189,248,0.35))'

  if (cell.type === 'start') {
    return (
      <svg viewBox="0 0 40 40" className="h-full w-full" style={{ filter: glow }}>
        <circle cx="20" cy="20" r="11" fill={fill} stroke={stroke} strokeWidth="2" />
        <path
          d="M20 14 L20 30 M20 30 L16 26 M20 30 L24 26"
          stroke={stroke}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        <text x="20" y="11" textAnchor="middle" fill="rgba(245,224,106,0.9)" fontSize="5.5">
          源头
        </text>
      </svg>
    )
  }

  if (cell.type === 'end') {
    return (
      <svg viewBox="0 0 40 40" className="h-full w-full" style={{ filter: glow }}>
        <circle cx="20" cy="20" r="11" fill={fill} stroke={stroke} strokeWidth="2" />
        <path
          d="M20 10 L20 22 M12 28 L28 28 M16 28 L16 34 M24 28 L24 34"
          stroke={stroke}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        <text x="20" y="38" textAnchor="middle" fill="rgba(245,224,106,0.9)" fontSize="4.5">
          水车阵眼
        </text>
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
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 40 40" className="h-full w-full opacity-60" style={{ filter: glow }}>
      <path
        d="M20 4 L20 36 M4 20 L36 20"
        stroke={stroke}
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  )
}

export function PipeConnectGame({ onComplete }: PipeConnectGameProps) {
  const successFiredRef = useRef(false)
  const [grid, setGrid] = useState<Cell[][]>(() => buildPuzzleGrid(GRID_SIZE))
  const [flowPath, setFlowPath] = useState<Set<string>>(new Set())
  const [won, setWon] = useState(false)
  const [showWinToast, setShowWinToast] = useState(false)

  const connectedPath = useMemo(() => findConnectedPath(grid), [grid])

  useEffect(() => {
    if (!connectedPath) {
      setFlowPath(new Set())
      return
    }

    setFlowPath(new Set(connectedPath.map(([r, c]) => key(r, c))))

    const last = connectedPath[connectedPath.length - 1]
    if (
      last &&
      last[0] === END[0] &&
      last[1] === END[1] &&
      !successFiredRef.current
    ) {
      successFiredRef.current = true
      setWon(true)
      setShowWinToast(true)
      window.setTimeout(() => {
        setShowWinToast(false)
        onComplete?.()
      }, WIN_DELAY_MS)
    }
  }, [connectedPath, onComplete])

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
    setShowWinToast(false)
    setFlowPath(new Set())
    setGrid(buildPuzzleGrid(GRID_SIZE))
  }, [])

  return (
    <div
      className="interactive-area w-full select-none"
      style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      <AnimatePresence>
        {showWinToast && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-3 text-center text-sm text-gold-bright"
          >
            水路贯通！隐藏的非遗地脉已激活。
          </motion.p>
        )}
      </AnimatePresence>

      <p className="mb-3 text-center text-xs text-mist-muted">
        点击管段顺时针旋转，接通「源头」至「水车阵眼」
      </p>

      <div
        className="mx-auto grid max-w-[min(92vw,340px)] gap-1.5 rounded-xl border border-teal-muted/30 bg-[#0a1f1f]/80 p-2.5 shadow-[inset_0_0_40px_rgba(20,80,80,0.25)]"
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
                    ? 'border-gold-bright/70 bg-gold-muted/10 shadow-[0_0_16px_rgba(245,215,110,0.45)]'
                    : 'border-teal-muted/25 bg-[#061414]/70 active:bg-[#0c2828]/80'
                } ${isStart ? 'ring-1 ring-gold-muted/50' : ''} ${isEnd ? 'ring-1 ring-sky-bright/40' : ''}`}
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
                    animate={{ opacity: [0.2, 0.7, 0.2] }}
                    transition={{ duration: 1.1, repeat: Infinity }}
                    className="pointer-events-none absolute inset-0 bg-gradient-to-b from-gold-bright/25 to-transparent"
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
            <span className="text-gold-bright">灵流已灌入水车阵眼…</span>
          ) : connectedPath && connectedPath.length > 1 ? (
            <span className="text-sky-bright">地脉已连通 {connectedPath.length} 格</span>
          ) : (
            '旋转管段对齐接口'
          )}
        </span>
        {!won && (
          <button
            type="button"
            onPointerDown={(e) => {
              preventGhostActivation(e)
              reset()
            }}
            className="rounded-full border border-mist-faint/25 px-3 py-1 text-mist-muted active:bg-void-700/50"
            style={{ touchAction: 'none' }}
          >
            重新布局
          </button>
        )}
      </div>
    </div>
  )
}

export const PipePuzzle = PipeConnectGame

export default PipeConnectGame
