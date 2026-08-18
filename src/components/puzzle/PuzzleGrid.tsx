import { AnimatePresence, motion } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { revokePieceUrls, sliceImageToPieces } from '../../utils/puzzleImageSlice'
import { preventGhostActivation } from '../../utils/touchInteraction'

const SOLVED = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const
const GRID = 3

/** Fisher-Yates 洗牌，保证与 SOLVED 不同 */
function createShuffledSlots(): number[] {
  let slots = [...SOLVED]
  do {
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[slots[i], slots[j]] = [slots[j], slots[i]]
    }
  } while (slots.every((id, idx) => id === idx))
  return slots
}

function isSolved(slots: number[]) {
  return slots.every((id, idx) => id === idx)
}

/** 格子索引 → 绝对定位百分比 */
function slotLayout(slotIndex: number) {
  const col = slotIndex % GRID
  const row = Math.floor(slotIndex / GRID)
  const cell = 100 / GRID
  return {
    left: `${col * cell}%`,
    top: `${row * cell}%`,
    width: `${cell}%`,
    height: `${cell}%`,
  }
}

interface PuzzleGridProps {
  imageUrl: string
  /** 原图宽高比 width/height，切片成功后会以真实比例覆盖 */
  imageAspect?: number
  onSuccess?: () => void
}

export function PuzzleGrid({ imageUrl, imageAspect = 1, onSuccess }: PuzzleGridProps) {
  const [slots, setSlots] = useState<number[]>(() => createShuffledSlots())
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [won, setWon] = useState(false)
  const [pieceUrls, setPieceUrls] = useState<string[] | null>(null)
  const [activeAspect, setActiveAspect] = useState(imageAspect)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const lastSwapRef = useRef(0)
  const blobUrlsRef = useRef<string[]>([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setPieceUrls(null)

    sliceImageToPieces(imageUrl, GRID)
      .then(({ pieceUrls: urls, aspect }) => {
        if (cancelled) {
          revokePieceUrls(urls)
          return
        }
        revokePieceUrls(blobUrlsRef.current)
        blobUrlsRef.current = urls
        setPieceUrls(urls)
        setActiveAspect(aspect)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoading(false)
        setLoadError(err instanceof Error ? err.message : '残卷图片读取失败')
      })

    return () => {
      cancelled = true
    }
  }, [imageUrl])

  useEffect(() => {
    return () => revokePieceUrls(blobUrlsRef.current)
  }, [])

  /** pieceId → 当前所在格子 */
  const piecePositions = useMemo(() => {
    const map = new Array<number>(GRID * GRID)
    slots.forEach((pieceId, slotIdx) => {
      map[pieceId] = slotIdx
    })
    return map
  }, [slots])

  const handleSlotPointerDown = useCallback(
    (e: ReactPointerEvent, slotIndex: number) => {
      preventGhostActivation(e)
      e.stopPropagation()

      if (won || !pieceUrls) return

      const now = Date.now()
      if (now - lastSwapRef.current < 120) return

      if (selectedSlot === null) {
        setSelectedSlot(slotIndex)
        return
      }

      if (selectedSlot === slotIndex) {
        setSelectedSlot(null)
        return
      }

      lastSwapRef.current = now
      const next = [...slots]
      ;[next[selectedSlot], next[slotIndex]] = [next[slotIndex], next[selectedSlot]]
      setSlots(next)
      setSelectedSlot(null)

      if (isSolved(next)) {
        setWon(true)
        onSuccess?.()
      }
    },
    [selectedSlot, slots, won, pieceUrls, onSuccess],
  )

  const handleReset = useCallback(() => {
    setSlots(createShuffledSlots())
    setSelectedSlot(null)
    setWon(false)
  }, [])

  const retryLoad = useCallback(() => {
    revokePieceUrls(blobUrlsRef.current)
    blobUrlsRef.current = []
    setPieceUrls(null)
    setLoadError(null)
    setLoading(true)
    sliceImageToPieces(imageUrl, GRID)
      .then(({ pieceUrls: urls, aspect }) => {
        blobUrlsRef.current = urls
        setPieceUrls(urls)
        setActiveAspect(aspect)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setLoading(false)
        setLoadError(err instanceof Error ? err.message : '残卷图片读取失败')
      })
  }, [imageUrl])

  useEffect(() => {
    if (!won) return
    const t = setTimeout(() => setWon(false), 4000)
    return () => clearTimeout(t)
  }, [won])

  return (
    <div className="interactive-area w-full">
      <p className="mb-3 text-center text-xs text-mist-muted">
        完整图片已拆成 9 块，点选两格交换位置，拼回原图
      </p>

      <div
        className="relative w-full touch-none select-none overflow-hidden rounded-xl border border-jade/25 bg-white shadow-glow"
        style={{ touchAction: 'none', aspectRatio: activeAspect }}
      >
        {loading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-void-950/40 backdrop-blur-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-jade-bright/30 border-t-jade-bright" />
            <p className="mt-3 text-xs text-mist-muted">正在读取残卷图块…</p>
          </div>
        )}

        {loadError && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-void-950/80 px-6 text-center">
            <p className="text-sm text-red-300/90">残卷读取失败</p>
            <p className="text-[11px] leading-relaxed text-mist-faint">{loadError}</p>
            <button
              type="button"
              className="rounded-lg border border-jade/30 px-3 py-1.5 text-xs text-jade-bright"
              onClick={retryLoad}
            >
              重新读取
            </button>
          </div>
        )}

        {pieceUrls &&
          SOLVED.map((pieceId) => {
            const slotIndex = piecePositions[pieceId]
            const layout = slotLayout(slotIndex)
            const isSelected =
              selectedSlot !== null && slots[selectedSlot] === pieceId
            const src = pieceUrls[pieceId]

            return (
              <motion.div
                key={pieceId}
                layout
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                className={`absolute box-border overflow-hidden border border-void-950/30 bg-white ${
                  isSelected
                    ? 'z-20 scale-[0.96] ring-2 ring-gold-bright shadow-glow-gold'
                    : 'z-10'
                }`}
                style={layout}
              >
                {src ? (
                  <img
                    src={src}
                    alt=""
                    draggable={false}
                    className="pointer-events-none h-full w-full select-none object-cover"
                  />
                ) : null}
              </motion.div>
            )
          })}

        {pieceUrls && (
          <div className="absolute inset-0 z-30 grid grid-cols-3 grid-rows-3">
            {SOLVED.map((_, slotIndex) => (
              <div
                key={`hit-${slotIndex}`}
                role="button"
                tabIndex={-1}
                aria-label={`拼图格 ${slotIndex + 1}`}
                className={`transition-colors duration-200 ${
                  selectedSlot === slotIndex
                    ? 'bg-gold-bright/10 ring-2 ring-inset ring-gold-bright/60'
                    : 'active:bg-sky/10'
                }`}
                onPointerDown={(e) => handleSlotPointerDown(e, slotIndex)}
              />
            ))}
          </div>
        )}

        <AnimatePresence>
          {won && pieceUrls && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center bg-void-950/70 backdrop-blur-sm"
            >
              <motion.img
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={imageUrl}
                alt="铜车马残卷"
                className="absolute inset-0 h-full w-full object-cover opacity-40"
              />
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                className="relative rounded-2xl border border-gold-bright/40 bg-jade-deep/40 px-6 py-4 text-center shadow-glow-gold"
              >
                <p className="text-lg font-medium text-gold-bright">拼图完成！</p>
                <p className="mt-1 text-xs text-jade-bright">原图已完整复原</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-mist-faint">
        <span>
          {loading
            ? '读取残卷中…'
            : selectedSlot !== null
              ? '再点一格完成交换'
              : '先选中一格，再点另一格'}
        </span>
        <button
          type="button"
          className="rounded-lg border border-sky/25 px-2.5 py-1 text-sky-bright active:bg-sky/10"
          disabled={loading || !!loadError}
          onPointerDown={(e) => {
            e.preventDefault()
            handleReset()
          }}
        >
          重新打乱
        </button>
      </div>
    </div>
  )
}

export default PuzzleGrid
