import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ModalOverlay } from '../ui/ModalOverlay'
import { Leaf, RefreshCw, Sparkles, Zap } from 'lucide-react'
import {
  LEYLINE_ELEMENT_META,
  LEYLINE_MATCH3_DEFAULTS,
} from '../../config/leylineMatch3Config'
import { preventGhostActivation } from '../../utils/touchInteraction'
import {
  applyGravity,
  createInitialGrid,
  ensurePlayable,
  findMatches,
  isAdjacent,
  isSwapBlocked,
  processMatchRound,
  refillGrid,
  swapCells,
  type GridCell,
  wouldMatchAfterSwap,
} from '../../utils/leylineMatch3Engine'

type GamePhase = 'playing' | 'resolving' | 'win-burst' | 'win' | 'lose' | 'completed'
type SelectedCell = { x: number; y: number } | null

const SWAP_MS = 300
const RESOLVE_STEP_MS = 180
const LOCK_REJECT_MS = 220

const RULES_TEXT =
  '指尖滑动互换相邻木灵，凑齐3枚同色即可共鸣消除。单次消除4枚以上可引发【灵气爆破】。请在限定的 20 步内，提纯并收集 15 只古榕木灵完成结契。'

export interface LeylineMatch3Props {
  gridSize?: number
  maxMoves?: number
  targetWood?: number
  targetStone?: number
  backgroundImage?: string
  onComplete?: () => void
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function waitTransformTransition(el: HTMLElement, ms: number): Promise<void> {
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      el.removeEventListener('transitionend', onEnd)
      resolve()
    }
    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName === 'transform') finish()
    }
    el.addEventListener('transitionend', onEnd)
    window.setTimeout(finish, ms + 40)
  })
}

export function LeylineMatch3({
  gridSize = LEYLINE_MATCH3_DEFAULTS.gridSize,
  maxMoves = LEYLINE_MATCH3_DEFAULTS.maxMoves,
  targetWood = LEYLINE_MATCH3_DEFAULTS.targetWood,
  targetStone = LEYLINE_MATCH3_DEFAULTS.targetStone,
  backgroundImage = LEYLINE_MATCH3_DEFAULTS.backgroundImage,
  onComplete,
}: LeylineMatch3Props) {
  const [grid, setGrid] = useState<GridCell[][]>(() => createInitialGrid(gridSize))
  const [movesLeft, setMovesLeft] = useState(maxMoves)
  const [woodCollected, setWoodCollected] = useState(0)
  const [stoneCollected, setStoneCollected] = useState(0)
  const [phase, setPhase] = useState<GamePhase>('playing')
  const [selected, setSelected] = useState<SelectedCell>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [clearingKeys, setClearingKeys] = useState<Set<string>>(new Set())
  const [unlockingKeys, setUnlockingKeys] = useState<Set<string>>(new Set())
  const [comboLabel, setComboLabel] = useState<string | null>(null)
  const [invalidSwap, setInvalidSwap] = useState(false)
  const [lockedReject, setLockedReject] = useState(false)

  const doneRef = useRef(false)
  const busyRef = useRef(false)
  const cellRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const setBusy = useCallback((busy: boolean) => {
    busyRef.current = busy
    setIsAnimating(busy)
  }, [])

  const resetGame = useCallback(() => {
    setGrid(createInitialGrid(gridSize))
    setMovesLeft(maxMoves)
    setWoodCollected(0)
    setStoneCollected(0)
    setPhase('playing')
    setSelected(null)
    setClearingKeys(new Set())
    setUnlockingKeys(new Set())
    setComboLabel(null)
    setInvalidSwap(false)
    setLockedReject(false)
    setBusy(false)
    doneRef.current = false
  }, [gridSize, maxMoves, setBusy])

  const finishQuest = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    setBusy(false)
    setPhase('completed')
    onComplete?.()
  }, [onComplete, setBusy])

  const isGoalMet = useCallback(
    (wood: number) => wood >= targetWood,
    [targetWood],
  )

  const triggerWin = useCallback(() => {
    setPhase('win-burst')
    window.setTimeout(() => setPhase('win'), 900)
  }, [])

  const checkEndState = useCallback(
    (nextWood: number, nextMoves: number) => {
      if (isGoalMet(nextWood)) {
        triggerWin()
        return true
      }
      if (nextMoves <= 0) {
        setPhase('lose')
        return true
      }
      return false
    },
    [isGoalMet, triggerWin],
  )

  const animateCellSwap = useCallback(
    async (ax: number, ay: number, bx: number, by: number) => {
      const elA = cellRefs.current.get(`${ax},${ay}`)
      const elB = cellRefs.current.get(`${bx},${by}`)
      if (!elA || !elB) return

      const rectA = elA.getBoundingClientRect()
      const rectB = elB.getBoundingClientRect()
      const dx = rectB.left - rectA.left
      const dy = rectB.top - rectA.top

      elA.classList.add('leyline-cell--swapping')
      elB.classList.add('leyline-cell--swapping')
      elA.style.transition = `transform ${SWAP_MS}ms ease`
      elB.style.transition = `transform ${SWAP_MS}ms ease`
      elA.style.transform = `translate3d(${dx}px, ${dy}px, 0)`
      elB.style.transform = `translate3d(${-dx}px, ${-dy}px, 0)`

      await Promise.all([waitTransformTransition(elA, SWAP_MS), waitTransformTransition(elB, SWAP_MS)])

      elA.style.transition = ''
      elB.style.transition = ''
      elA.style.transform = ''
      elB.style.transform = ''
      elA.classList.remove('leyline-cell--swapping')
      elB.classList.remove('leyline-cell--swapping')
    },
    [],
  )

  const resolveCascadesAnimated = useCallback(async (startGrid: GridCell[][]) => {
    let current = startGrid
    let totalWood = 0
    let totalStone = 0
    let round = 0

    while (true) {
      const matches = findMatches(current)
      if (matches.size === 0) break

      round += 1
      if (matches.size >= 4) {
        setComboLabel('【灵气爆破】')
        window.setTimeout(() => setComboLabel(null), 900)
      } else if (round > 1) {
        setComboLabel(`连环 x${round}`)
        window.setTimeout(() => setComboLabel(null), 700)
      }

      const { grid: afterRound, woodCleared, stoneCleared, eliminateKeys, unlockKeys } =
        processMatchRound(current, matches)

      totalWood += woodCleared
      totalStone += stoneCleared
      setClearingKeys(eliminateKeys)
      setUnlockingKeys(unlockKeys)
      await delay(RESOLVE_STEP_MS)

      current = afterRound
      setGrid(current)
      setClearingKeys(new Set())
      setUnlockingKeys(new Set())
      await delay(RESOLVE_STEP_MS * 0.5)

      if (eliminateKeys.size > 0) {
        current = applyGravity(current)
        setGrid(current)
        await delay(RESOLVE_STEP_MS * 0.7)

        current = refillGrid(current)
        setGrid(current)
        await delay(RESOLVE_STEP_MS * 0.5)
      }
    }

    return {
      grid: ensurePlayable(current),
      woodCleared: totalWood,
      stoneCleared: totalStone,
    }
  }, [])

  const handleSwap = useCallback(
    async (ax: number, ay: number, bx: number, by: number) => {
      if (busyRef.current || phase !== 'playing') return

      if (isSwapBlocked(grid, ax, ay, bx, by)) {
        setLockedReject(true)
        await delay(LOCK_REJECT_MS)
        setLockedReject(false)
        setSelected(null)
        return
      }

      setBusy(true)
      setSelected(null)

      const valid = wouldMatchAfterSwap(grid, ax, ay, bx, by)
      await animateCellSwap(ax, ay, bx, by)

      if (!valid) {
        setInvalidSwap(true)
        await animateCellSwap(ax, ay, bx, by)
        setInvalidSwap(false)
        setBusy(false)
        return
      }

      const swapped = swapCells(grid, ax, ay, bx, by)
      setGrid(swapped)
      setPhase('resolving')

      const nextMoves = movesLeft - 1
      setMovesLeft(nextMoves)

      const { grid: resolved, woodCleared, stoneCleared } =
        await resolveCascadesAnimated(swapped)
      setGrid(resolved)

      const nextWood = woodCollected + woodCleared
      const nextStone = stoneCollected + stoneCleared
      setWoodCollected(nextWood)
      setStoneCollected(nextStone)
      setPhase('playing')

      if (!checkEndState(nextWood, nextMoves)) {
        setBusy(false)
        return
      }

      setBusy(false)
    },
    [
      animateCellSwap,
      checkEndState,
      grid,
      movesLeft,
      phase,
      resolveCascadesAnimated,
      setBusy,
      stoneCollected,
      woodCollected,
    ],
  )

  const handleCellClick = useCallback(
    (x: number, y: number) => {
      if (busyRef.current || isAnimating || phase !== 'playing') return
      const cell = grid[y]?.[x]
      if (!cell) return

      if (!selected) {
        setSelected({ x, y })
        return
      }

      if (selected.x === x && selected.y === y) {
        setSelected(null)
        return
      }

      if (!isAdjacent(selected.x, selected.y, x, y)) {
        setSelected({ x, y })
        return
      }

      void handleSwap(selected.x, selected.y, x, y)
    },
    [grid, handleSwap, isAnimating, phase, selected],
  )

  useEffect(() => {
    if (phase === 'win-burst' && isGoalMet(woodCollected)) {
      setBusy(true)
    }
  }, [phase, woodCollected, isGoalMet, setBusy])

  const movesPct = Math.max(0, (movesLeft / maxMoves) * 100)
  const woodPct = Math.min(100, (woodCollected / targetWood) * 100)
  const stonePct = Math.min(100, (stoneCollected / targetStone) * 100)

  return (
    <div
      className="interactive-area leyline-match3 relative mx-auto flex w-full max-w-[min(100%,22rem)] flex-col overflow-hidden rounded-xl border border-emerald-500/25 bg-void-950"
      style={{ minHeight: 'min(72dvh, 640px)' }}
    >
      <div
        className="leyline-match3-bg absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-void-950/75 via-emerald-950/35 to-void-950/88" />

      <div className="relative z-20 space-y-2 px-3 pt-3">
        <div className="leyline-rules-banner rounded-xl px-3 py-2.5 backdrop-blur-sm">
          <p className="text-center text-[10px] leading-relaxed tracking-wide text-emerald-100/92">
            {RULES_TEXT}
          </p>
        </div>

        <div className="rounded-xl border border-white/12 bg-black/50 px-3 py-2 backdrop-blur-sm">
          <div className="mb-1.5 flex items-center justify-between text-[10px] tracking-widest text-mist-muted">
            <span className="flex items-center gap-1 text-amber-200/90">
              <Zap className="h-3 w-3" />
              剩余灵力
            </span>
            <span className="font-medium text-amber-100">{movesLeft} 步</span>
          </div>
          <div className="leyline-bar-track h-2 overflow-hidden rounded-full">
            <div
              className="leyline-bar-moves h-full rounded-full transition-all duration-300"
              style={{ width: `${movesPct}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/12 bg-black/50 px-2.5 py-2 backdrop-blur-sm">
            <div className="mb-1 flex items-center justify-between text-[9px] tracking-wide text-mist-muted">
              <span className="text-emerald-200/90">🌿 木灵</span>
              <span className="font-medium text-emerald-100">
                {woodCollected}/{targetWood}
              </span>
            </div>
            <div className="leyline-bar-track h-1.5 overflow-hidden rounded-full">
              <div
                className="leyline-bar-wood h-full rounded-full transition-all duration-300"
                style={{ width: `${woodPct}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-white/12 bg-black/50 px-2.5 py-2 backdrop-blur-sm">
            <div className="mb-1 flex items-center justify-between text-[9px] tracking-wide text-mist-muted">
              <span className="text-stone-200/90">🪨 顽石</span>
              <span className="font-medium text-stone-100">
                {stoneCollected}/{targetStone}
              </span>
            </div>
            <div className="leyline-bar-track h-1.5 overflow-hidden rounded-full">
              <div
                className="leyline-bar-stone h-full rounded-full transition-all duration-300"
                style={{ width: `${stonePct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {comboLabel && (
          <motion.p
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            className="pointer-events-none absolute left-0 right-0 top-[30%] z-30 text-center text-sm font-semibold tracking-widest text-cyan-200"
          >
            {comboLabel}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="relative z-20 flex flex-1 flex-col items-center justify-center px-3 py-3">
        <div
          className={`leyline-grid w-full max-w-[min(100%,20rem)] rounded-xl border border-emerald-400/20 bg-black/40 p-1.5 backdrop-blur-sm ${
            invalidSwap ? 'leyline-grid--invalid' : ''
          } ${lockedReject ? 'leyline-grid--locked' : ''} ${
            phase === 'win-burst' ? 'leyline-grid--frozen' : ''
          } ${isAnimating ? 'leyline-grid--animating' : ''}`}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            gap: '4px',
          }}
        >
          {grid.map((row, y) =>
            row.map((cell, x) => {
              const posKey = `${x},${y}`
              const isSelected = selected?.x === x && selected?.y === y
              const isClearing = clearingKeys.has(posKey)
              const isUnlocking = unlockingKeys.has(posKey)
              const meta = cell ? LEYLINE_ELEMENT_META[cell.type] : null

              return (
                <button
                  key={cell?.id ?? `empty-${posKey}`}
                  ref={(el) => {
                    if (el) cellRefs.current.set(posKey, el)
                    else cellRefs.current.delete(posKey)
                  }}
                  type="button"
                  disabled={phase !== 'playing' || !cell || isAnimating}
                  onPointerDown={(e) => {
                    preventGhostActivation(e)
                    handleCellClick(x, y)
                  }}
                  className={`leyline-cell relative flex aspect-square items-center justify-center rounded-lg text-base ${
                    meta?.cellClass ?? 'bg-void-900/30'
                  } ${isSelected ? 'leyline-cell--selected z-10 scale-105' : ''} ${
                    isClearing ? 'leyline-cell--clearing' : ''
                  } ${isUnlocking ? 'leyline-cell--unlocking' : ''} ${
                    cell?.isLocked ? 'leyline-cell--locked' : ''
                  }`}
                  style={{ touchAction: 'none' }}
                  aria-label={cell?.isLocked ? `${meta?.label ?? ''}（藤蔓锁）` : meta?.label ?? '空'}
                >
                  {meta?.emoji}
                  {cell?.isLocked && (
                    <span className="leyline-vine-overlay pointer-events-none absolute inset-0 rounded-lg" />
                  )}
                </button>
              )
            }),
          )}
        </div>
      </div>

      <AnimatePresence>
        {phase === 'win-burst' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="leyline-victory-burst pointer-events-none absolute inset-0 z-40"
          />
        )}
      </AnimatePresence>

      <ModalOverlay open={phase === 'win'}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="w-full overflow-hidden rounded-2xl border border-gold-bright/40 bg-gradient-to-b from-void-800/95 to-void-950/98 p-5 shadow-[0_0_56px_rgba(212,175,55,0.28)]"
        >
          <div className="mb-4 text-center">
            <div className="mb-2 flex items-center justify-center gap-1.5 text-[10px] tracking-[0.35em] text-gold-muted">
              <Sparkles className="h-3.5 w-3.5 text-gold-bright" />
              SSR · 灵韵觉醒
            </div>
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-gold-bright/45 bg-emerald-950/50 shadow-[0_0_24px_rgba(52,211,153,0.25)]">
              <Leaf className="h-7 w-7 text-emerald-300" />
            </div>
            <p className="text-lg font-medium leading-relaxed text-gold-bright">
              恭喜唤醒【古榕木灵】
            </p>
            <p className="mt-2 text-xs text-mist-faint">
              地脉疏通！已提纯并收集 {targetWood} 只古榕木灵，结契完成
            </p>
          </div>
          <button
            type="button"
            onPointerDown={(e) => {
              preventGhostActivation(e)
              finishQuest()
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-muted to-gold-bright py-3.5 text-sm font-semibold text-void-950 shadow-glow active:scale-[0.98]"
            style={{ touchAction: 'none' }}
          >
            <Sparkles className="h-4 w-4" />
            继续寻灵
          </button>
        </motion.div>
      </ModalOverlay>

      <ModalOverlay open={phase === 'lose'}>
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full rounded-2xl border border-stone-500/35 bg-void-900/96 p-5"
        >
          <p className="mb-2 text-center text-sm leading-relaxed text-mist-muted">
            灵力耗尽，地脉再次淤塞。是否重新汇聚？
          </p>
          <p className="mb-4 flex items-center justify-center gap-3 text-[11px] text-mist-faint">
            <span>🌿 {woodCollected}/{targetWood}</span>
            <span>🪨 {stoneCollected}/{targetStone}</span>
          </p>
          <button
            type="button"
            onPointerDown={(e) => {
              preventGhostActivation(e)
              resetGame()
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/35 bg-amber-950/45 py-3.5 text-sm font-medium text-amber-100"
            style={{ touchAction: 'none' }}
          >
            <RefreshCw className="h-4 w-4" />
            重新汇聚
          </button>
        </motion.div>
      </ModalOverlay>
    </div>
  )
}

export default LeylineMatch3
