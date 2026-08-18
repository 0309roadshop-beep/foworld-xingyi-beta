import { AnimatePresence, motion } from 'framer-motion'
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { MATCH_D5_TILES, MATCH_D5_TILE_COUNT, MATCH_D5_PAIR_COUNT, MATCH_D5_GRID_COLS, type MatchTileConfig } from '../../config/lanternMatchConfig'
import {
  LANTERN_MATCH_COLS,
  LANTERN_MATCH_ROWS,
  buildSolvableGrid,
  checkAvailableMoves,
  classifyLinkPath,
  clampPixelsToBoard,
  findLinkPath,
  linkPathToPixels,
  measureTileCenterByIdx,
  pixelsToPolyline,
  measureTileLayoutFromDom,
  shouldDrawLinkLine,
  shuffleUntilSolvable,
  type LinkPath,
  type TileLayoutSnapshot,
} from '../../utils/lanternMatchEngine'
import { preventGhostActivation } from '../../utils/touchInteraction'

const COLS = LANTERN_MATCH_COLS

type TileKind = MatchTileConfig['type']

type Tile = {
  id: number
  kind: TileKind
  removed: boolean
}

const TILE_BY_KIND = Object.fromEntries(MATCH_D5_TILES.map((t) => [t.type, t])) as Record<
  TileKind,
  MatchTileConfig
>

const MATCH_FLASH_MS = 360
const MATCH_FADE_MS = 140

type FlashLine = {
  points: LinkPath
  pair: [number, number]
  snapshot: TileLayoutSnapshot
  key: number
}

type FlashVisual = {
  kind: ReturnType<typeof classifyLinkPath>
  pixels: { x: number; y: number }[]
  polyline: string
}

export interface LanternMatchGameProps {
  onComplete?: () => void
  /** Photo_D5 是否已完成 — 仅控制入口，不影响矩阵图腾生成 */
  photoD5Completed?: boolean
}

/** 基于 12 组字典各取一对，共 24 图块（4×6） */
function buildGrid(): Tile[] {
  const kinds = MATCH_D5_TILES.map((t) => t.type)
  if (kinds.length !== MATCH_D5_PAIR_COUNT) {
    console.warn(
      `[Match_D5] 图腾字典应为 ${MATCH_D5_PAIR_COUNT} 组，当前 ${kinds.length} 组`,
    )
  }
  const grid = buildSolvableGrid(kinds, (kind, id) => ({ id, kind, removed: false }))
  if (grid.length !== MATCH_D5_TILE_COUNT) {
    console.warn(
      `[Match_D5] 盘面应为 ${MATCH_D5_TILE_COUNT} 块，当前 ${grid.length} 块`,
    )
  }
  return grid
}

function isImageIcon(icon: string) {
  return icon.startsWith('/') || icon.startsWith('http')
}

function MatchTileIcon({ config }: { config: MatchTileConfig }) {
  if (isImageIcon(config.icon)) {
    return (
      <img
        src={config.icon}
        alt={config.label}
        className="h-7 w-7 object-contain sm:h-8 sm:w-8"
        draggable={false}
      />
    )
  }
  return <span className="text-lg leading-none sm:text-xl">{config.icon}</span>
}

/** Match_D5 · 千灯结缘 — 12 对图腾自闭环 Onet（与 Photo_D5 入口解耦） */
export function LanternMatchGame({ onComplete, photoD5Completed = true }: LanternMatchGameProps) {
  const [grid, setGrid] = useState<Tile[]>(() => buildGrid())
  const [selected, setSelected] = useState<number | null>(null)
  const [errorIndices, setErrorIndices] = useState<number[]>([])
  const [flashLine, setFlashLine] = useState<FlashLine | null>(null)
  const [flashFading, setFlashFading] = useState(false)
  const [flashVisual, setFlashVisual] = useState<FlashVisual | null>(null)
  const [layoutSnapshot, setLayoutSnapshot] = useState<TileLayoutSnapshot | null>(null)
  const [cleared, setCleared] = useState(false)
  const [shuffleNotice, setShuffleNotice] = useState(false)
  const [shuffleAnim, setShuffleAnim] = useState(false)
  const doneRef = useRef(false)
  const flashKeyRef = useRef(0)
  const flashTimerRef = useRef<number | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const errorTimerRef = useRef<number | null>(null)
  const shuffleTimerRef = useRef<number | null>(null)

  const remaining = useMemo(() => grid.filter((t) => !t.removed).length, [grid])

  const refreshLayout = useCallback(() => {
    const gridEl = gridRef.current
    const overlayEl = overlayRef.current
    if (!gridEl || !overlayEl) return null
    const snap = measureTileLayoutFromDom(gridEl, overlayEl)
    if (snap) setLayoutSnapshot(snap)
    return snap
  }, [])

  useLayoutEffect(() => {
    const overlayEl = overlayRef.current
    if (!overlayEl) return

    refreshLayout()
    const ro = new ResizeObserver(() => refreshLayout())
    ro.observe(overlayEl)
    return () => ro.disconnect()
  }, [refreshLayout])

  useLayoutEffect(() => {
    if (!flashLine) {
      setFlashVisual(null)
      return
    }

    refreshLayout()

    const { points, snapshot, pair } = flashLine
    if (!shouldDrawLinkLine(points)) {
      setFlashVisual(null)
      return
    }

    const kind = classifyLinkPath(points)
    const gridEl = gridRef.current
    const overlayEl = overlayRef.current

    const clip = snapshot.clip

    if (kind === 'straight' && gridEl && overlayEl) {
      const start = measureTileCenterByIdx(gridEl, overlayEl, pair[0])
      const end = measureTileCenterByIdx(gridEl, overlayEl, pair[1])
      if (start && end) {
        const pixels = clampPixelsToBoard([start, end], clip)
        setFlashVisual({ kind, pixels, polyline: pixelsToPolyline(pixels) })
        return
      }
    }

    const pixels = clampPixelsToBoard(linkPathToPixels(points, snapshot), clip)
    setFlashVisual({
      kind,
      pixels,
      polyline: pixelsToPolyline(pixels),
    })
  }, [flashLine, refreshLayout])

  const clearErrorTimer = useCallback(() => {
    if (errorTimerRef.current) {
      window.clearTimeout(errorTimerRef.current)
      errorTimerRef.current = null
    }
  }, [])

  const showError = useCallback(
    (indices: number[]) => {
      clearErrorTimer()
      setErrorIndices(indices)
      setSelected(null)
      errorTimerRef.current = window.setTimeout(() => {
        setErrorIndices([])
        errorTimerRef.current = null
      }, 420)
    },
    [clearErrorTimer],
  )

  const triggerShuffle = useCallback((prev: Tile[]): Tile[] => {
    setShuffleAnim(true)
    setShuffleNotice(true)
    if (shuffleTimerRef.current) window.clearTimeout(shuffleTimerRef.current)
    shuffleTimerRef.current = window.setTimeout(() => {
      setShuffleAnim(false)
      setShuffleNotice(false)
      shuffleTimerRef.current = null
    }, 900)
    return shuffleUntilSolvable(prev)
  }, [])

  const tryComplete = useCallback(
    (next: Tile[]) => {
      if (doneRef.current) return
      if (next.every((t) => t.removed)) {
        doneRef.current = true
        setCleared(true)
        window.setTimeout(() => onComplete?.(), 1800)
      }
    },
    [onComplete],
  )

  const afterRemoval = useCallback(
    (next: Tile[]) => {
      if (next.every((t) => t.removed)) {
        tryComplete(next)
        return next
      }
      if (!checkAvailableMoves(next)) {
        return triggerShuffle(next)
      }
      return next
    },
    [tryComplete, triggerShuffle],
  )

  const removePair = useCallback(
    (a: number, b: number) => {
      setGrid((prev) => {
        const clearedGrid = prev.map((t, i) =>
          i === a || i === b ? { ...t, removed: true } : t,
        )
        return afterRemoval(clearedGrid)
      })
    },
    [afterRemoval],
  )

  const handlePick = useCallback(
    (idx: number) => {
      const tile = grid[idx]
      if (!tile || tile.removed || doneRef.current || flashLine || shuffleAnim) return

      if (selected == null) {
        clearErrorTimer()
        setErrorIndices([])
        setSelected(idx)
        return
      }

      if (selected === idx) {
        setSelected(null)
        return
      }

      const first = grid[selected]
      if (!first || first.removed) {
        setSelected(idx)
        return
      }

      if (first.kind !== tile.kind) {
        showError([selected, idx])
        return
      }

      const path = findLinkPath(grid, selected, idx)
      if (path) {
        const snap = refreshLayout()
        if (!snap) return

        if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current)

        flashKeyRef.current += 1
        const key = flashKeyRef.current
        const pair: [number, number] = [selected, idx]
        setFlashFading(false)
        setFlashLine({ points: path, pair, snapshot: snap, key })
        setSelected(null)
        clearErrorTimer()
        setErrorIndices([])

        flashTimerRef.current = window.setTimeout(() => {
          setFlashFading(true)
          flashTimerRef.current = window.setTimeout(() => {
            setFlashLine(null)
            setFlashFading(false)
            removePair(pair[0], pair[1])
            flashTimerRef.current = null
          }, MATCH_FADE_MS)
        }, MATCH_FLASH_MS)
        return
      }

      showError([selected, idx])
    },
    [
      grid,
      selected,
      flashLine,
      shuffleAnim,
      removePair,
      showError,
      clearErrorTimer,
      refreshLayout,
    ],
  )

  const clearingIndices: number[] = flashLine ? flashLine.pair : []

  if (!photoD5Completed) {
    return (
      <div className="interactive-area w-full rounded-xl border border-amber-500/20 bg-[#0a1218]/80 px-4 py-8 text-center">
        <p className="mb-2 text-sm font-medium text-amber-100">千灯结缘阵图未解锁</p>
        <p className="text-[11px] leading-relaxed text-mist-muted">
          请先完成「寻遗织梦」六项非遗照片上传并收录图鉴。连连看将基于 12 组非遗图腾独立生成
          {MATCH_D5_GRID_COLS}×{LANTERN_MATCH_ROWS} 矩阵，无需与打卡点位一一对应。
        </p>
      </div>
    )
  }

  return (
    <div className="interactive-area w-full">
      <p className="mb-2 text-center text-[11px] leading-relaxed text-mist-muted">
        餐厅小憩，12 组非遗图腾各成双，共 {MATCH_D5_TILE_COUNT} 图块（{MATCH_D5_GRID_COLS}×
        {LANTERN_MATCH_ROWS}）
      </p>
      <p className="mb-3 text-center text-xs text-mist-faint">
        点击两枚相同图块，以不超过两弯的路径相连消除（剩余 {remaining}）
      </p>

      <AnimatePresence>
        {shuffleNotice && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-2 text-center text-[11px] text-amber-200/90"
          >
            灵纹感应受阻，阵图已自动重组
          </motion.p>
        )}
      </AnimatePresence>

      <div
        ref={overlayRef}
        className="relative mx-auto max-w-[min(92vw,300px)] overflow-hidden rounded-2xl"
      >
        <div
          ref={gridRef}
          className={`grid gap-1 rounded-2xl border border-white/10 bg-[#0a1520]/60 p-1.5 shadow-[inset_0_0_30px_rgba(20,60,80,0.2)] backdrop-blur-sm transition-transform duration-300 ${
            shuffleAnim ? 'animate-[gorge-shake_0.55s_ease-in-out]' : ''
          }`}
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        >
          {grid.map((tile, idx) => {
            const isSel = selected === idx
            const isError = errorIndices.includes(idx)
            const isClearing = clearingIndices.includes(idx)
            const config = TILE_BY_KIND[tile.kind]

            return (
              <button
                key={tile.id}
                type="button"
                disabled={tile.removed}
                onPointerDown={(e: ReactPointerEvent<HTMLButtonElement>) => {
                  preventGhostActivation(e)
                  handlePick(idx)
                }}
                className={`relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border transition-all duration-200 ${
                  tile.removed
                    ? 'pointer-events-none border-transparent bg-transparent opacity-0'
                    : isClearing
                      ? flashFading
                        ? 'pointer-events-none border-gold-bright/40 bg-white/8 opacity-0 scale-95 transition-[opacity,transform] duration-[140ms]'
                        : 'border-gold-bright/70 bg-white/14 shadow-[0_0_22px_rgba(255,215,0,0.45)] backdrop-blur-md'
                      : isError
                        ? 'border-red-400/70 bg-red-950/35 text-red-200 animate-[gorge-shake_0.42s_ease-in-out]'
                        : isSel
                          ? 'border-gold-bright/60 bg-white/12 shadow-[0_0_18px_rgba(245,215,110,0.4)] backdrop-blur-md'
                          : 'border-white/12 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md active:bg-white/10'
                }`}
                style={{ touchAction: 'none' }}
              >
                {!tile.removed && config && (
                  <>
                    <MatchTileIcon config={config} />
                    <span
                      className={`text-[8px] tracking-wide ${
                        isError ? 'text-red-200/90' : 'text-mist-muted/90'
                      }`}
                    >
                      {config.label}
                    </span>
                  </>
                )}
              </button>
            )
          })}
        </div>

        {layoutSnapshot && (
          <svg
            className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
            width={layoutSnapshot.overlayWidth}
            height={layoutSnapshot.overlayHeight}
            viewBox={`0 0 ${layoutSnapshot.overlayWidth} ${layoutSnapshot.overlayHeight}`}
            aria-hidden
          >
            <defs>
              <clipPath id="lantern-board-clip">
                <rect
                  x={layoutSnapshot.clip.x}
                  y={layoutSnapshot.clip.y}
                  width={layoutSnapshot.clip.width}
                  height={layoutSnapshot.clip.height}
                  rx={layoutSnapshot.clip.rx}
                  ry={layoutSnapshot.clip.rx}
                />
              </clipPath>
            </defs>
            <g clipPath="url(#lantern-board-clip)">
              {flashLine && flashVisual && flashVisual.polyline && (
                <polyline
                  key={flashLine.key}
                  className={`lantern-link-line ${flashFading ? 'lantern-link-line--fade' : 'lantern-link-line--show'}`}
                  points={flashVisual.polyline}
                />
              )}
            </g>
          </svg>
        )}
      </div>

      <AnimatePresence>
        {cleared && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-center text-sm text-gold-bright"
          >
            阵图已成，地脉灵纹已连通——前往水寨露台观礼打铁花。
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

export default LanternMatchGame
