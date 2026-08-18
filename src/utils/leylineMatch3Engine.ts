/** 地脉消消乐 — 盘面纯逻辑 */

export type LeylineElementType = 'wood' | 'stone' | 'deadwood' | 'muddy' | 'fire'

export interface LeylinePiece {
  id: string
  type: LeylineElementType
  isLocked: boolean
}

export type GridCell = LeylinePiece | null

export const LEYLINE_ELEMENT_TYPES: LeylineElementType[] = [
  'wood',
  'stone',
  'deadwood',
  'muddy',
  'fire',
]

let pieceIdSeq = 0

export function createPiece(type?: LeylineElementType, isLocked = false): LeylinePiece {
  pieceIdSeq += 1
  return {
    id: `leyline-${pieceIdSeq}-${Math.random().toString(36).slice(2, 7)}`,
    type: type ?? randomElementType(),
    isLocked,
  }
}

export function cellKey(x: number, y: number): string {
  return `${x},${y}`
}

export function parseCellKey(key: string): [number, number] {
  const [x, y] = key.split(',').map(Number)
  return [x, y]
}

export function cloneGrid(grid: GridCell[][]): GridCell[][] {
  return grid.map((row) => row.map((cell) => (cell ? { ...cell } : null)))
}

export function randomElementType(): LeylineElementType {
  return LEYLINE_ELEMENT_TYPES[Math.floor(Math.random() * LEYLINE_ELEMENT_TYPES.length)]
}

function cellTypeAt(grid: GridCell[][], x: number, y: number): LeylineElementType | null {
  return grid[y]?.[x]?.type ?? null
}

/** 均匀分布的藤蔓锁候选位（角落 + 边缘 + 中部） */
function buildLockCandidatePositions(size: number): [number, number][] {
  const s = size - 1
  const mid = Math.floor(size / 2)
  const raw: [number, number][] = [
    [0, 0],
    [s, 0],
    [0, s],
    [s, s],
    [mid, 0],
    [mid, s],
    [0, mid],
    [s, mid],
    [mid, mid],
    [mid - 1, mid],
    [mid + 1, mid],
    [mid, mid - 1],
    [mid, mid + 1],
    [1, 1],
    [s - 1, s - 1],
    [1, s - 1],
    [s - 1, 1],
    [mid, 1],
    [mid, s - 1],
    [1, mid],
    [s - 1, mid],
  ]
  const seen = new Set<string>()
  const result: [number, number][] = []
  for (const [x, y] of raw) {
    if (x < 0 || y < 0 || x >= size || y >= size) continue
    const k = cellKey(x, y)
    if (seen.has(k)) continue
    seen.add(k)
    result.push([x, y])
  }
  return result
}

function shufflePositions<T>(arr: T[]): T[] {
  const next = [...arr]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

function applyVineLocks(grid: GridCell[][], lockCount: number): GridCell[][] {
  const next = cloneGrid(grid)
  const positions = shufflePositions(buildLockCandidatePositions(next.length)).slice(
    0,
    lockCount,
  )
  for (const [x, y] of positions) {
    const cell = next[y][x]
    if (cell) next[y][x] = { ...cell, isLocked: true }
  }
  return next
}

/** 所有可形成消除的相邻交换（不含藤蔓锁） */
export function findValidMoves(
  grid: GridCell[][],
): Array<{ x1: number; y1: number; x2: number; y2: number }> {
  const moves: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
  const rows = grid.length
  if (rows === 0) return moves
  const cols = grid[0].length

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (x + 1 < cols && wouldMatchAfterSwap(grid, x, y, x + 1, y)) {
        moves.push({ x1: x, y1: y, x2: x + 1, y2: y })
      }
      if (y + 1 < rows && wouldMatchAfterSwap(grid, x, y, x, y + 1)) {
        moves.push({ x1: x, y1: y, x2: x, y2: y + 1 })
      }
    }
  }

  return moves
}

export function hasValidMove(grid: GridCell[][]): boolean {
  return findValidMoves(grid).length > 0
}

function isUnlockedCell(grid: GridCell[][], x: number, y: number): boolean {
  const cell = grid[y]?.[x]
  return cell != null && !cell.isLocked
}

/** 打乱未锁格子的元素类型（保留藤蔓锁与 id） */
function reshuffleUnlockedTypes(grid: GridCell[][]): GridCell[][] {
  const next = cloneGrid(grid)
  const types: LeylineElementType[] = []
  const positions: Array<[number, number]> = []

  for (let y = 0; y < next.length; y++) {
    for (let x = 0; x < next[0].length; x++) {
      const cell = next[y][x]
      if (!cell || cell.isLocked) continue
      types.push(cell.type)
      positions.push([x, y])
    }
  }

  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[types[i], types[j]] = [types[j], types[i]]
  }

  positions.forEach(([x, y], i) => {
    const cell = next[y][x]
    if (cell) next[y][x] = { ...cell, type: types[i] }
  })

  return next
}

/**
 * 在盘面上嵌入一组保证可消的四连图案（交换后形成 3+ 连线，交换前无自动消除）。
 * 横排: X Y X X，交换前两格 -> Y X X X
 */
function embedGuaranteedSwap(grid: GridCell[][]): GridCell[][] {
  const next = cloneGrid(grid)
  const rows = next.length
  const cols = next[0]?.length ?? 0
  if (rows === 0 || cols === 0) return next

  type SwapSlot = { x: number; y: number; axis: 'h' | 'v' }
  const slots: SwapSlot[] = []

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x <= cols - 4; x++) {
      if (
        isUnlockedCell(next, x, y) &&
        isUnlockedCell(next, x + 1, y) &&
        isUnlockedCell(next, x + 2, y) &&
        isUnlockedCell(next, x + 3, y)
      ) {
        slots.push({ x, y, axis: 'h' })
      }
    }
  }

  for (let x = 0; x < cols; x++) {
    for (let y = 0; y <= rows - 4; y++) {
      if (
        isUnlockedCell(next, x, y) &&
        isUnlockedCell(next, x, y + 1) &&
        isUnlockedCell(next, x, y + 2) &&
        isUnlockedCell(next, x, y + 3)
      ) {
        slots.push({ x, y, axis: 'v' })
      }
    }
  }

  const typePairs: Array<[LeylineElementType, LeylineElementType]> = []
  for (const a of LEYLINE_ELEMENT_TYPES) {
    for (const b of LEYLINE_ELEMENT_TYPES) {
      if (a !== b) typePairs.push([a, b])
    }
  }

  for (const { x: sx, y: sy, axis } of shufflePositions(slots)) {
    for (const [xType, yType] of shufflePositions(typePairs)) {
      const trial = cloneGrid(next)

      if (axis === 'h') {
        const a = trial[sy][sx]!
        const b = trial[sy][sx + 1]!
        const c = trial[sy][sx + 2]!
        const d = trial[sy][sx + 3]!
        trial[sy][sx] = { ...a, type: xType }
        trial[sy][sx + 1] = { ...b, type: yType }
        trial[sy][sx + 2] = { ...c, type: xType }
        trial[sy][sx + 3] = { ...d, type: xType }

        if (
          !hasMatches(trial) &&
          wouldMatchAfterSwap(trial, sx, sy, sx + 1, sy)
        ) {
          return trial
        }
      } else {
        const a = trial[sy][sx]!
        const b = trial[sy + 1][sx]!
        const c = trial[sy + 2][sx]!
        const d = trial[sy + 3][sx]!
        trial[sy][sx] = { ...a, type: xType }
        trial[sy + 1][sx] = { ...b, type: yType }
        trial[sy + 2][sx] = { ...c, type: xType }
        trial[sy + 3][sx] = { ...d, type: xType }

        if (
          !hasMatches(trial) &&
          wouldMatchAfterSwap(trial, sx, sy, sx, sy + 1)
        ) {
          return trial
        }
      }
    }
  }

  return next
}

/**
 * 保证盘面可继续：有自动消除（连环）或至少一步可用手动交换形成的消除。
 */
export function ensurePlayable(grid: GridCell[][]): GridCell[][] {
  if (hasMatches(grid) || hasValidMove(grid)) {
    return grid
  }

  for (let i = 0; i < 240; i++) {
    const shuffled = reshuffleUnlockedTypes(grid)
    if (hasMatches(shuffled) || hasValidMove(shuffled)) {
      return shuffled
    }
  }

  const embedded = embedGuaranteedSwap(grid)
  if (hasMatches(embedded) || hasValidMove(embedded)) {
    return embedded
  }

  return reshuffleUnlockedTypes(embedded)
}

/** 生成无初始连线、至少一步可解 + 5~8 个藤蔓锁的盘面 */
export function createInitialGrid(size: number): GridCell[][] {
  const lockCount = 5 + Math.floor(Math.random() * 4)
  let grid: GridCell[][]
  let attempts = 0

  do {
    grid = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => createPiece()),
    )
    grid = applyVineLocks(grid, lockCount)
    grid = ensurePlayable(grid)
    attempts += 1
  } while (hasMatches(grid) && attempts < 100)

  return grid
}

export function isAdjacent(x1: number, y1: number, x2: number, y2: number): boolean {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2) === 1
}

export function isSwapBlocked(grid: GridCell[][], x1: number, y1: number, x2: number, y2: number): boolean {
  const a = grid[y1]?.[x1]
  const b = grid[y2]?.[x2]
  if (!a || !b) return true
  return a.isLocked || b.isLocked
}

export function swapCells(
  grid: GridCell[][],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): GridCell[][] {
  const next = cloneGrid(grid)
  const temp = next[y1][x1]
  next[y1][x1] = next[y2][x2]
  next[y2][x2] = temp
  return next
}

/** 找出所有连续 3+ 同 type（横/纵） */
export function findMatches(grid: GridCell[][]): Set<string> {
  const matches = new Set<string>()
  const rows = grid.length
  if (rows === 0) return matches
  const cols = grid[0].length

  for (let y = 0; y < rows; y++) {
    let x = 0
    while (x < cols) {
      const type = cellTypeAt(grid, x, y)
      if (!type) {
        x += 1
        continue
      }
      let len = 1
      while (x + len < cols && cellTypeAt(grid, x + len, y) === type) len += 1
      if (len >= 3) {
        for (let i = 0; i < len; i++) matches.add(cellKey(x + i, y))
      }
      x += len
    }
  }

  for (let x = 0; x < cols; x++) {
    let y = 0
    while (y < rows) {
      const type = cellTypeAt(grid, x, y)
      if (!type) {
        y += 1
        continue
      }
      let len = 1
      while (y + len < rows && cellTypeAt(grid, x, y + len) === type) len += 1
      if (len >= 3) {
        for (let i = 0; i < len; i++) matches.add(cellKey(x, y + i))
      }
      y += len
    }
  }

  return matches
}

export function hasMatches(grid: GridCell[][]): boolean {
  return findMatches(grid).size > 0
}

export function wouldMatchAfterSwap(
  grid: GridCell[][],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): boolean {
  if (isSwapBlocked(grid, x1, y1, x2, y2)) return false
  return hasMatches(swapCells(grid, x1, y1, x2, y2))
}

export interface MatchRoundResult {
  grid: GridCell[][]
  woodCleared: number
  stoneCleared: number
  eliminateKeys: Set<string>
  unlockKeys: Set<string>
}

/**
 * 处理一轮匹配：未锁消除，藤蔓锁仅破锁不消失、不触发该格坍塌
 */
export function processMatchRound(grid: GridCell[][], matches: Set<string>): MatchRoundResult {
  const next = cloneGrid(grid)
  const eliminateKeys = new Set<string>()
  const unlockKeys = new Set<string>()
  let woodCleared = 0
  let stoneCleared = 0

  for (const key of matches) {
    const [x, y] = parseCellKey(key)
    const cell = next[y][x]
    if (!cell) continue

    if (cell.isLocked) {
      next[y][x] = { ...cell, isLocked: false }
      unlockKeys.add(key)
    } else {
      if (cell.type === 'wood') woodCleared += 1
      if (cell.type === 'stone') stoneCleared += 1
      eliminateKeys.add(key)
      next[y][x] = null
    }
  }

  return { grid: next, woodCleared, stoneCleared, eliminateKeys, unlockKeys }
}

/** 仅对 null 格坍塌，已破锁保留的元素维持原位 */
export function applyGravity(grid: GridCell[][]): GridCell[][] {
  const next = cloneGrid(grid)
  const rows = next.length
  const cols = next[0].length

  for (let x = 0; x < cols; x++) {
    let writeY = rows - 1
    for (let y = rows - 1; y >= 0; y--) {
      if (next[y][x] !== null) {
        next[writeY][x] = next[y][x]
        if (writeY !== y) next[y][x] = null
        writeY -= 1
      }
    }
    for (let y = writeY; y >= 0; y--) {
      next[y][x] = null
    }
  }

  return next
}

export function refillGrid(grid: GridCell[][]): GridCell[][] {
  const next = cloneGrid(grid)
  for (let y = 0; y < next.length; y++) {
    for (let x = 0; x < next[0].length; x++) {
      if (next[y][x] === null) next[y][x] = createPiece()
    }
  }
  return ensurePlayable(next)
}
