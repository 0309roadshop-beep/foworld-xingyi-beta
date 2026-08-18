import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { MATRIX_PUZZLE_IMAGE_URL } from '../../mock/data'
import { preventGhostActivation } from '../../utils/touchInteraction'

const GRID = 4
const TOTAL = GRID * GRID

type BoardState = (number | null)[]

type Selection =
  | { from: 'tray'; pieceId: number }
  | { from: 'board'; pieceId: number; slot: number }

function shuffleTray(): number[] {
  const arr = Array.from({ length: TOTAL }, (_, i) => i)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function emptyBoard(): BoardState {
  return Array(TOTAL).fill(null)
}

function isBoardSolved(board: BoardState) {
  return board.every((id, idx) => id === idx)
}

/** Canvas 将原图按 4×4 切成 16 块，返回 Blob URL */
async function sliceImageToPieces(imageUrl: string): Promise<{
  pieceUrls: string[]
  aspect: number
}> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = reject
    el.src = imageUrl
  })

  const sw = Math.floor(img.naturalWidth / GRID)
  const sh = Math.floor(img.naturalHeight / GRID)
  const pieceUrls: string[] = []

  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const pieceId = row * GRID + col
      const canvas = document.createElement('canvas')
      canvas.width = sw
      canvas.height = sh
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas 2D 不可用')

      ctx.drawImage(img, col * sw, row * sh, sw, sh, 0, 0, sw, sh)

      const blob = await new Promise<Blob>((res, rej) => {
        canvas.toBlob(
          (b) => (b ? res(b) : rej(new Error('切片失败'))),
          'image/jpeg',
          0.9,
        )
      })
      pieceUrls[pieceId] = URL.createObjectURL(blob)
    }
  }

  return { pieceUrls, aspect: img.naturalWidth / img.naturalHeight }
}

function PieceTile({
  url,
  pieceId,
  selected,
  compact,
}: {
  url: string
  pieceId: number
  selected: boolean
  compact?: boolean
}) {
  return (
    <motion.div
      layout
      layoutId={`matrix-piece-${pieceId}`}
      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      className={`relative overflow-hidden rounded-md border bg-void-900 ${
        compact ? 'aspect-square w-full' : 'h-full w-full'
      } ${
        selected
          ? 'z-20 scale-[0.96] border-gold-bright ring-2 ring-gold-bright shadow-glow-gold'
          : 'border-void-950/40'
      }`}
    >
      <img
        src={url}
        alt=""
        draggable={false}
        className="pointer-events-none h-full w-full select-none object-cover"
      />
    </motion.div>
  )
}

interface MatrixPuzzleProps {
  /** 测试图或用户拍摄/上传的图片 URL（支持 blob:） */
  imageUrl?: string
  /** 是否显示本地上传入口（预留用户拍照上传） */
  allowUpload?: boolean
  onSuccess?: () => void
}

export function MatrixPuzzle({
  imageUrl: imageUrlProp,
  allowUpload = true,
  onSuccess,
}: MatrixPuzzleProps) {
  const [activeImageUrl, setActiveImageUrl] = useState(
    () => imageUrlProp ?? MATRIX_PUZZLE_IMAGE_URL,
  )
  const [pieceUrls, setPieceUrls] = useState<string[] | null>(null)
  const [aspect, setAspect] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [board, setBoard] = useState<BoardState>(() => emptyBoard())
  const [tray, setTray] = useState<number[]>(() => shuffleTray())
  const [selection, setSelection] = useState<Selection | null>(null)
  const [won, setWon] = useState(false)

  const lastTapRef = useRef(0)
  const blobUrlsRef = useRef<string[]>([])
  const uploadBlobRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const revokeBlobs = useCallback(() => {
    blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u))
    blobUrlsRef.current = []
  }, [])

  const resetGame = useCallback(() => {
    setBoard(emptyBoard())
    setTray(shuffleTray())
    setSelection(null)
    setWon(false)
  }, [])

  useEffect(() => {
    if (imageUrlProp) setActiveImageUrl(imageUrlProp)
  }, [imageUrlProp])

  /** 图片变更 → 重新切片 */
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(false)
    revokeBlobs()
    resetGame()

    sliceImageToPieces(activeImageUrl)
      .then(({ pieceUrls: urls, aspect: ar }) => {
        if (cancelled) {
          urls.forEach((u) => URL.revokeObjectURL(u))
          return
        }
        blobUrlsRef.current = urls
        setPieceUrls(urls)
        setAspect(ar)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [activeImageUrl, revokeBlobs, resetGame])

  useEffect(() => {
    return () => {
      revokeBlobs()
      if (uploadBlobRef.current) URL.revokeObjectURL(uploadBlobRef.current)
    }
  }, [revokeBlobs])

  const tryWin = useCallback(
    (nextBoard: BoardState) => {
      if (isBoardSolved(nextBoard)) {
        setWon(true)
        onSuccess?.()
      }
    },
    [onSuccess],
  )

  const handleBoardSlot = useCallback(
    (e: ReactPointerEvent, slot: number) => {
      preventGhostActivation(e)
      e.stopPropagation()
      if (won || loading || !pieceUrls) return

      const now = Date.now()
      if (now - lastTapRef.current < 100) return
      lastTapRef.current = now

      const occupied = board[slot]

      // 点击已有块 → 选中以便移动或放回
      if (occupied !== null) {
        if (selection?.from === 'board' && selection.slot === slot) {
          setSelection(null)
          return
        }
        setSelection({ from: 'board', pieceId: occupied, slot })
        return
      }

      // 点击空白格 → 放置已选块
      if (!selection) return

      if (selection.from === 'tray') {
        const pid = selection.pieceId
        const nextBoard = [...board]
        nextBoard[slot] = pid
        setBoard(nextBoard)
        setTray((t) => t.filter((id) => id !== pid))
        setSelection(null)
        tryWin(nextBoard)
        return
      }

      if (selection.from === 'board') {
        const nextBoard = [...board]
        nextBoard[selection.slot] = null
        nextBoard[slot] = selection.pieceId
        setBoard(nextBoard)
        setSelection(null)
        tryWin(nextBoard)
      }
    },
    [board, selection, won, loading, pieceUrls, tryWin],
  )

  const handleTrayPiece = useCallback(
    (e: ReactPointerEvent, pieceId: number) => {
      preventGhostActivation(e)
      e.stopPropagation()
      if (won || loading || !pieceUrls) return

      const now = Date.now()
      if (now - lastTapRef.current < 100) return
      lastTapRef.current = now

      if (selection?.from === 'tray' && selection.pieceId === pieceId) {
        setSelection(null)
        return
      }
      setSelection({ from: 'tray', pieceId })
    },
    [selection, won, loading, pieceUrls],
  )

  /** 选中画布上的块后，点击碎片池区域放回 */
  const handleReturnToTray = useCallback(
    (e: ReactPointerEvent) => {
      preventGhostActivation(e)
      if (!selection || selection.from !== 'board' || won) return

      const pid = selection.pieceId
      const nextBoard = [...board]
      nextBoard[selection.slot] = null
      setBoard(nextBoard)
      setTray((t) => [...t, pid])
      setSelection(null)
    },
    [selection, board, won],
  )

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (uploadBlobRef.current) URL.revokeObjectURL(uploadBlobRef.current)
    const blobUrl = URL.createObjectURL(file)
    uploadBlobRef.current = blobUrl
    setActiveImageUrl(blobUrl)
    e.target.value = ''
  }, [])

  const placedCount = board.filter((id) => id !== null).length

  return (
    <div className="interactive-area w-full" style={{ touchAction: 'none' }}>
      <p className="mb-3 text-center text-xs text-mist-muted">
        从下方碎片池点选一块，再点空白格放置；共 16 块，拼满即完成
      </p>

      {allowUpload && (
        <div className="mb-3 flex justify-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            type="button"
            className="rounded-lg border border-jade/30 px-3 py-1.5 text-[11px] text-jade-bright active:bg-jade/10"
            onPointerDown={(e) => {
            preventGhostActivation(e)
              fileInputRef.current?.click()
            }}
          >
            上传 / 拍摄照片
          </button>
        </div>
      )}

      <LayoutGroup>
        {/* 空白画布：4×4 放置区 */}
        <div
          className="relative w-full touch-none select-none overflow-hidden rounded-xl border border-jade/25 bg-void-950 shadow-glow"
          style={{ aspectRatio: aspect, touchAction: 'none' }}
        >
          {loading && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-void-900/95">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-jade/30 border-t-jade-bright" />
              <span className="text-xs text-mist-muted">正在切割 4×4 拼图…</span>
            </div>
          )}

          {loadError && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-void-900/95 text-xs text-mist-muted">
              图片加载失败
            </div>
          )}

          <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 gap-px bg-void-950 p-px">
            {board.map((pieceId, slot) => (
              <div
                key={`slot-${slot}`}
                role="button"
                tabIndex={-1}
                aria-label={`画布格 ${slot + 1}`}
                className={`relative min-h-0 min-w-0 touch-none ${
                  pieceId === null
                    ? 'bg-void-900/80'
                    : 'bg-void-950'
                } ${
                  selection?.from === 'board' && selection.slot === slot
                    ? 'ring-2 ring-inset ring-gold-bright/70'
                    : pieceId === null && selection
                      ? 'ring-1 ring-inset ring-sky/40'
                      : ''
                }`}
                style={{ touchAction: 'none' }}
                onPointerDown={(e) => handleBoardSlot(e, slot)}
              >
                {pieceId === null && (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] text-mist-faint/25">
                    {slot + 1}
                  </span>
                )}
                {pieceId !== null && pieceUrls && (
                  <PieceTile
                    url={pieceUrls[pieceId]}
                    pieceId={pieceId}
                    selected={
                      selection?.from === 'board' && selection.pieceId === pieceId
                    }
                  />
                )}
              </div>
            ))}
          </div>

          <AnimatePresence>
            {won && (
              <>
                <motion.div
                  initial={{ x: '-120%' }}
                  animate={{ x: '120%' }}
                  transition={{ duration: 1.1, ease: 'easeInOut' }}
                  className="pointer-events-none absolute inset-y-0 z-40 w-2/5 skew-x-[-18deg] bg-gradient-to-r from-transparent via-gold-bright/90 to-transparent"
                />
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-void-950/55 backdrop-blur-[2px]"
                >
                  <div className="rounded-2xl border border-gold-bright/50 bg-jade-deep/45 px-6 py-4 text-center shadow-glow-gold">
                    <p className="text-lg font-medium text-gold-bright">夜郎能量满溢！</p>
                    <p className="mt-1 text-xs text-jade-bright">实景矩阵已复原</p>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* 碎片池：打乱的 16 块 */}
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-[11px]">
            <span className="text-mist-muted">
              碎片池（剩余 {tray.length} 块）
            </span>
            <span className="text-mist-faint">
              已放置 {placedCount}/{TOTAL}
            </span>
          </div>

          <div
            role="button"
            tabIndex={-1}
            className={`grid grid-cols-4 gap-1.5 rounded-xl border p-2 transition-colors ${
              selection?.from === 'board'
                ? 'border-gold-bright/40 bg-gold-bright/5'
                : 'border-jade/20 bg-void-900/60'
            }`}
            onPointerDown={handleReturnToTray}
          >
            {tray.length === 0 ? (
              <p className="col-span-4 py-6 text-center text-[11px] text-mist-faint">
                {selection?.from === 'board'
                  ? '点击此处将选中块放回碎片池'
                  : '全部碎片已放置到画布'}
              </p>
            ) : (
              tray.map((pieceId) =>
                pieceUrls ? (
                  <div
                    key={`tray-${pieceId}`}
                    role="button"
                    tabIndex={-1}
                    className="touch-none"
                    style={{ touchAction: 'none' }}
                    onPointerDown={(e) => handleTrayPiece(e, pieceId)}
                  >
                    <PieceTile
                      url={pieceUrls[pieceId]}
                      pieceId={pieceId}
                      compact
                      selected={
                        selection?.from === 'tray' && selection.pieceId === pieceId
                      }
                    />
                  </div>
                ) : null,
              )
            )}
          </div>

          {selection?.from === 'board' && (
            <p className="mt-2 text-center text-[10px] text-gold-muted">
              已选中画布上的块 · 点空白格移动，或点碎片池放回
            </p>
          )}
          {selection?.from === 'tray' && (
            <p className="mt-2 text-center text-[10px] text-sky-bright/80">
              已选中碎片 · 点上方空白格放置
            </p>
          )}
        </div>
      </LayoutGroup>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          className="rounded-lg border border-sky/25 px-2.5 py-1 text-[11px] text-sky-bright active:bg-sky/10"
          onPointerDown={(e) => {
            preventGhostActivation(e)
            resetGame()
          }}
        >
          重新打乱
        </button>
      </div>
    </div>
  )
}

export default MatrixPuzzle
