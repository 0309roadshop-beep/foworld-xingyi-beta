/** 千灯结缘连连看 — 寻路、死局检测与洗牌 */

import {
  MATCH_D5_GRID_COLS,
  MATCH_D5_GRID_ROWS,
} from '../config/lanternMatchConfig'

export const LANTERN_MATCH_COLS = MATCH_D5_GRID_COLS
export const LANTERN_MATCH_ROWS = MATCH_D5_GRID_ROWS

export type GridPoint = { r: number; c: number }

/** 寻路成功时返回的折线路径（含棋盘外虚拟边界点） */
export type LinkPath = GridPoint[]

/** SVG 裁剪区：贴合棋盘可见边框，内缩以容纳描边与圆角端点 */
export type BoardClipRect = {
  x: number
  y: number
  width: number
  height: number
  rx: number
}

const LINK_STROKE_INSET = 3

/** 由 DOM 实测得到的棋盘布局（中心距已含 gap，适配 aspect-ratio 格子） */
export type TileLayoutSnapshot = {
  overlayWidth: number
  overlayHeight: number
  stepX: number
  stepY: number
  originX: number
  originY: number
  clip: BoardClipRect
}

/** 从已渲染图块按钮实测布局，避免 CSS 推算与 aspect-ratio 偏差 */
export function measureTileLayoutFromDom(
  gridEl: HTMLElement,
  overlayEl: HTMLElement,
): TileLayoutSnapshot | null {
  const buttons = Array.from(gridEl.querySelectorAll<HTMLButtonElement>(':scope > button'))
  if (buttons.length < LANTERN_MATCH_COLS + 1) return null

  const overlayRect = overlayEl.getBoundingClientRect()
  const tile00 = buttons[0]!.getBoundingClientRect()
  const tile01 = buttons[1]!.getBoundingClientRect()
  const tile10 = buttons[LANTERN_MATCH_COLS]!.getBoundingClientRect()

  const originX = tile00.left + tile00.width / 2 - overlayRect.left
  const originY = tile00.top + tile00.height / 2 - overlayRect.top
  const stepX = tile01.left + tile01.width / 2 - (tile00.left + tile00.width / 2)
  const stepY = tile10.top + tile10.height / 2 - (tile00.top + tile00.height / 2)

  if (stepX <= 0 || stepY <= 0) return null

  const gridRect = gridEl.getBoundingClientRect()
  const style = getComputedStyle(gridEl)
  const rx = parseFloat(style.borderRadius) || 16
  const inset = LINK_STROKE_INSET

  return {
    overlayWidth: overlayRect.width,
    overlayHeight: overlayRect.height,
    stepX,
    stepY,
    originX,
    originY,
    clip: {
      x: gridRect.left - overlayRect.left + inset,
      y: gridRect.top - overlayRect.top + inset,
      width: Math.max(0, gridRect.width - inset * 2),
      height: Math.max(0, gridRect.height - inset * 2),
      rx: Math.max(0, rx - inset),
    },
  }
}

/** 将路径像素点裁入棋盘可见区域（虚拟边界点压到边框内侧） */
export function clampPixelsToBoard(
  pixels: { x: number; y: number }[],
  clip: BoardClipRect,
): { x: number; y: number }[] {
  const right = clip.x + clip.width
  const bottom = clip.y + clip.height
  return pixels.map((p) => ({
    x: Math.min(right, Math.max(clip.x, p.x)),
    y: Math.min(bottom, Math.max(clip.y, p.y)),
  }))
}

export function pixelsToPolyline(pixels: { x: number; y: number }[]): string {
  return pixels.map(({ x, y }) => `${x},${y}`).join(' ')
}

/** 将行列索引（含 r/c = -1 或边界值）映射为 overlay 内像素中心点 */
export function gridPointToPixel(p: GridPoint, s: TileLayoutSnapshot): { x: number; y: number } {
  return {
    x: s.originX + p.c * s.stepX,
    y: s.originY + p.r * s.stepY,
  }
}

export function linkPathToPixels(path: LinkPath, s: TileLayoutSnapshot): { x: number; y: number }[] {
  return path.map((p) => gridPointToPixel(p, s))
}

export function linkPathToPixelPolyline(path: LinkPath, s: TileLayoutSnapshot): string {
  return linkPathToPixels(path, s)
    .map(({ x, y }) => `${x},${y}`)
    .join(' ')
}

export type LinkPathVisualKind = 'adjacent' | 'straight' | 'bent'

/** 读取指定图块按钮在 overlay 内的像素中心 */
export function measureTileCenterByIdx(
  gridEl: HTMLElement,
  overlayEl: HTMLElement,
  idx: number,
): { x: number; y: number } | null {
  const btn = gridEl.querySelectorAll<HTMLButtonElement>(':scope > button')[idx]
  if (!btn) return null

  const btnRect = btn.getBoundingClientRect()
  const overlayRect = overlayEl.getBoundingClientRect()
  return {
    x: btnRect.left + btnRect.width / 2 - overlayRect.left,
    y: btnRect.top + btnRect.height / 2 - overlayRect.top,
  }
}

/** 相邻格：曼哈顿距离为 1；直线：0 拐且非相邻；拐弯：1~2 拐 */
export function classifyLinkPath(path: LinkPath): LinkPathVisualKind {
  if (path.length <= 2) {
    const a = path[0]!
    const b = path[path.length - 1]!
    if (Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1) return 'adjacent'
    return 'straight'
  }
  return 'bent'
}

/** 相邻格不画线；水平/垂直直线与拐弯路径画金色连线 */
export function shouldDrawLinkLine(path: LinkPath): boolean {
  return classifyLinkPath(path) !== 'adjacent'
}

export type LanternMatchTile<K extends string = string> = {
  id: number
  kind: K
  removed: boolean
}

function inBounds(r: number, c: number) {
  return r >= 0 && r < LANTERN_MATCH_ROWS && c >= 0 && c < LANTERN_MATCH_COLS
}

export function idxToRC(idx: number): GridPoint {
  return { r: Math.floor(idx / LANTERN_MATCH_COLS), c: idx % LANTERN_MATCH_COLS }
}

export function rcToIdx(r: number, c: number) {
  return r * LANTERN_MATCH_COLS + c
}

/**
 * 路径可通行：棋盘外虚拟边界视为空；格内仅允许端点 A/B 或已消除格。
 */
export function isPassable<K extends string>(
  grid: LanternMatchTile<K>[],
  r: number,
  c: number,
  idxA: number,
  idxB: number,
): boolean {
  if (!inBounds(r, c)) return true
  const idx = rcToIdx(r, c)
  if (idx === idxA || idx === idxB) return true
  const tile = grid[idx]
  return tile?.removed ?? true
}

/**
 * 直线连通：路径上每一格（含折点）均须可通行。
 */
export function lineClear<K extends string>(
  grid: LanternMatchTile<K>[],
  r1: number,
  c1: number,
  r2: number,
  c2: number,
  idxA: number,
  idxB: number,
): boolean {
  if (r1 !== r2 && c1 !== c2) return false

  if (r1 === r2) {
    const min = Math.min(c1, c2)
    const max = Math.max(c1, c2)
    for (let c = min; c <= max; c++) {
      if (!isPassable(grid, r1, c, idxA, idxB)) return false
    }
    return true
  }

  const min = Math.min(r1, r2)
  const max = Math.max(r1, r2)
  for (let r = min; r <= max; r++) {
    if (!isPassable(grid, r, c1, idxA, idxB)) return false
  }
  return true
}

/** 标准 Onet：0~2 折点，含棋盘外一圈虚拟边界 */
export function findLinkPath<K extends string>(
  grid: LanternMatchTile<K>[],
  idxA: number,
  idxB: number,
): LinkPath | null {
  if (idxA === idxB) return null
  const tileA = grid[idxA]
  const tileB = grid[idxB]
  if (!tileA || !tileB || tileA.removed || tileB.removed || tileA.kind !== tileB.kind) {
    return null
  }

  const { r: rA, c: cA } = idxToRC(idxA)
  const { r: rB, c: cB } = idxToRC(idxB)

  // 0 拐
  if (lineClear(grid, rA, cA, rB, cB, idxA, idxB)) {
    return [
      { r: rA, c: cA },
      { r: rB, c: cB },
    ]
  }

  // 1 拐 — L 型
  if (
    lineClear(grid, rA, cA, rA, cB, idxA, idxB) &&
    lineClear(grid, rA, cB, rB, cB, idxA, idxB)
  ) {
    return [
      { r: rA, c: cA },
      { r: rA, c: cB },
      { r: rB, c: cB },
    ]
  }
  if (
    lineClear(grid, rA, cA, rB, cA, idxA, idxB) &&
    lineClear(grid, rB, cA, rB, cB, idxA, idxB)
  ) {
    return [
      { r: rA, c: cA },
      { r: rB, c: cA },
      { r: rB, c: cB },
    ]
  }

  // 2 拐 — 经虚拟列绕行
  for (let c = -1; c <= LANTERN_MATCH_COLS; c++) {
    if (
      lineClear(grid, rA, cA, rA, c, idxA, idxB) &&
      lineClear(grid, rA, c, rB, c, idxA, idxB) &&
      lineClear(grid, rB, c, rB, cB, idxA, idxB)
    ) {
      return [
        { r: rA, c: cA },
        { r: rA, c },
        { r: rB, c },
        { r: rB, c: cB },
      ]
    }
  }

  // 2 拐 — 经虚拟行绕行
  for (let r = -1; r <= LANTERN_MATCH_ROWS; r++) {
    if (
      lineClear(grid, rA, cA, r, cA, idxA, idxB) &&
      lineClear(grid, r, cA, r, cB, idxA, idxB) &&
      lineClear(grid, r, cB, rB, cB, idxA, idxB)
    ) {
      return [
        { r: rA, c: cA },
        { r, c: cA },
        { r, c: cB },
        { r: rB, c: cB },
      ]
    }
  }

  return null
}

/** 是否存在至少一对可消除图块 */
export function checkAvailableMoves<K extends string>(grid: LanternMatchTile<K>[]): boolean {
  const active: number[] = []
  for (let i = 0; i < grid.length; i++) {
    if (!grid[i]?.removed) active.push(i)
  }

  for (let a = 0; a < active.length; a++) {
    for (let b = a + 1; b < active.length; b++) {
      const iA = active[a]!
      const iB = active[b]!
      if (grid[iA]!.kind !== grid[iB]!.kind) continue
      if (findLinkPath(grid, iA, iB)) return true
    }
  }
  return false
}

function shuffleInPlace<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
}

/** 将剩余图块种类打乱后填回原坐标 */
export function shuffleBoard<K extends string>(grid: LanternMatchTile<K>[]): LanternMatchTile<K>[] {
  const slots: number[] = []
  const kinds: K[] = []

  for (let i = 0; i < grid.length; i++) {
    const tile = grid[i]
    if (!tile || tile.removed) continue
    slots.push(i)
    kinds.push(tile.kind)
  }

  shuffleInPlace(kinds)

  const next = grid.map((t) => ({ ...t }))
  for (let i = 0; i < slots.length; i++) {
    const idx = slots[i]!
    next[idx] = { ...next[idx]!, kind: kinds[i]! }
  }
  return next
}

/** 洗牌直至盘面有解（上限防死循环） */
export function shuffleUntilSolvable<K extends string>(
  grid: LanternMatchTile<K>[],
  maxAttempts = 48,
): LanternMatchTile<K>[] {
  let next = shuffleBoard(grid)
  let attempts = 0
  while (!checkAvailableMoves(next) && attempts < maxAttempts) {
    next = shuffleBoard(next)
    attempts++
  }
  return next
}

export function buildShuffledGrid<K extends string>(
  kinds: K[],
  makeTile: (kind: K, id: number) => LanternMatchTile<K>,
): LanternMatchTile<K>[] {
  const pairs = [...kinds, ...kinds]
  shuffleInPlace(pairs)
  return pairs.map((kind, id) => makeTile(kind, id))
}

/** 初始盘面保证至少一对可连 */
export function buildSolvableGrid<K extends string>(
  kinds: K[],
  makeTile: (kind: K, id: number) => LanternMatchTile<K>,
): LanternMatchTile<K>[] {
  for (let attempt = 0; attempt < 60; attempt++) {
    const grid = buildShuffledGrid(kinds, makeTile)
    if (checkAvailableMoves(grid)) return grid
  }
  let grid = buildShuffledGrid(kinds, makeTile)
  return shuffleUntilSolvable(grid)
}
