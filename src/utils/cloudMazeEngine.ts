/** 云端迷宫 — DFS 迷宫生成与连通性校验 */

export interface MazeCell {
  visited: boolean
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * 递归回溯 DFS 迷宫雕刻 — 任意两格之间保证存在通路。
 * 入口 (0,0) → 出口 (cols-1, rows-1) 在逻辑上 100% 连通。
 */
export function generateMazeDFS(cols: number, rows: number): MazeCell[][] {
  const cells: MazeCell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      visited: false,
      walls: { top: true, right: true, bottom: true, left: true },
    })),
  )

  const carve = (cx: number, cy: number) => {
    cells[cy][cx].visited = true
    const dirs = shuffle([
      { dx: 0, dy: -1, wall: 'top' as const, opp: 'bottom' as const },
      { dx: 1, dy: 0, wall: 'right' as const, opp: 'left' as const },
      { dx: 0, dy: 1, wall: 'bottom' as const, opp: 'top' as const },
      { dx: -1, dy: 0, wall: 'left' as const, opp: 'right' as const },
    ])

    for (const { dx, dy, wall, opp } of dirs) {
      const nx = cx + dx
      const ny = cy + dy
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || cells[ny][nx].visited) continue
      cells[cy][cx].walls[wall] = false
      cells[ny][nx].walls[opp] = false
      carve(nx, ny)
    }
  }

  carve(0, 0)
  return cells
}

/** BFS 校验两格之间是否存在开放墙通路 */
export function hasPathBetween(
  cells: MazeCell[][],
  startCol: number,
  startRow: number,
  endCol: number,
  endRow: number,
): boolean {
  const rows = cells.length
  const cols = cells[0]?.length ?? 0
  if (rows === 0 || cols === 0) return false

  const key = (c: number, r: number) => `${c},${r}`
  const visited = new Set<string>()
  const queue: [number, number][] = [[startCol, startRow]]
  visited.add(key(startCol, startRow))

  while (queue.length > 0) {
    const [c, r] = queue.shift()!
    if (c === endCol && r === endRow) return true

    const cell = cells[r]?.[c]
    if (!cell) continue

    const neighbors: [number, number, keyof MazeCell['walls']][] = [
      [c, r - 1, 'top'],
      [c + 1, r, 'right'],
      [c, r + 1, 'bottom'],
      [c - 1, r, 'left'],
    ]

    for (const [nc, nr, wall] of neighbors) {
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue
      if (cell.walls[wall]) continue
      const k = key(nc, nr)
      if (visited.has(k)) continue
      visited.add(k)
      queue.push([nc, nr])
    }
  }

  return false
}

/** 生成并校验左上→右下必解迷宫 */
export function generateSolvableMaze(cols: number, rows: number): MazeCell[][] {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const cells = generateMazeDFS(cols, rows)
    if (hasPathBetween(cells, 0, 0, cols - 1, rows - 1)) return cells
  }
  return generateMazeDFS(cols, rows)
}
