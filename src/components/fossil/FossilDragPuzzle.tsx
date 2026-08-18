import { AnimatePresence, motion } from 'framer-motion'
import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'

const SNAP_PX = 44
const FOSSIL_BASE = '/assets/fossil-keichousaurus.png'
const FOSSIL_ASPECT = 1024 / 770

export interface FossilSlot {
  id: string
  label: string
  /** 槽位中心（容器百分比 0–100） */
  x: number
  y: number
  w: number
  h: number
  rotation?: number
}

export interface FossilPiece {
  id: string
  label: string
  slotId: string
  /** 碎片展示用的背景偏移（模拟裁剪） */
  bgX?: number
  bgY?: number
}

const DEFAULT_SLOTS: FossilSlot[] = [
  { id: 'rib-left', label: '左肋', x: 34, y: 46, w: 17, h: 11, rotation: -12 },
  { id: 'rib-right', label: '右肋', x: 58, y: 44, w: 17, h: 11, rotation: 10 },
  { id: 'tail', label: '尾骨', x: 76, y: 58, w: 14, h: 10, rotation: 8 },
]

const DEFAULT_PIECES: FossilPiece[] = [
  { id: 'p-rib-left', label: '左肋骨', slotId: 'rib-left', bgX: 22, bgY: 38 },
  { id: 'p-rib-right', label: '右肋骨', slotId: 'rib-right', bgX: 58, bgY: 36 },
  { id: 'p-tail', label: '尾椎骨', slotId: 'tail', bgX: 78, bgY: 52 },
]

interface DragState {
  pieceId: string
  offsetX: number
  offsetY: number
  x: number
  y: number
}

export interface FossilDragPuzzleProps {
  baseImage?: string
  slots?: FossilSlot[]
  pieces?: FossilPiece[]
  onSuccess?: () => void
}

function playSnapSound() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(620, now)
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.08)
    gain.gain.setValueAtTime(0.22, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.24)
    window.setTimeout(() => void ctx.close(), 300)
  } catch {
    /* ignore */
  }
}

function slotCenterPx(slot: FossilSlot, rect: DOMRect) {
  return {
    x: rect.left + (slot.x / 100) * rect.width,
    y: rect.top + (slot.y / 100) * rect.height,
  }
}

export function FossilDragPuzzle({
  baseImage = FOSSIL_BASE,
  slots = DEFAULT_SLOTS,
  pieces = DEFAULT_PIECES,
  onSuccess,
}: FossilDragPuzzleProps) {
  const boardRef = useRef<HTMLDivElement>(null)
  const successFiredRef = useRef(false)

  const [locked, setLocked] = useState<Record<string, string>>({})
  const [drag, setDrag] = useState<DragState | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [celebrating, setCelebrating] = useState(false)

  const lockedCount = Object.keys(locked).length
  const allDone = lockedCount >= pieces.length

  const getTrayPosition = useCallback(
    (_pieceId: string, index: number) => {
      const board = boardRef.current
      if (!board) return { left: 0, top: 0 }
      const rect = board.getBoundingClientRect()
      const trayY = rect.height - 52
      const spacing = rect.width / (pieces.length + 1)
      const size = 56
      return {
        left: spacing * (index + 1) - size / 2,
        top: trayY - size / 2,
      }
    },
    [pieces.length],
  )

  const handlePieceDown = useCallback(
    (e: ReactPointerEvent, pieceId: string) => {
      if (celebrating || allDone) return
      if (Object.values(locked).includes(pieceId)) return

      e.preventDefault()
      e.stopPropagation()
      const size = 56
      setDrag({
        pieceId,
        offsetX: size / 2,
        offsetY: size / 2,
        x: e.clientX - size / 2,
        y: e.clientY - size / 2,
      })
      boardRef.current?.setPointerCapture(e.pointerId)
    },
    [celebrating, allDone, locked],
  )

  const handleBoardMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!drag) return
      e.preventDefault()
      setDrag((d) =>
        d ? { ...d, x: e.clientX - d.offsetX, y: e.clientY - d.offsetY } : null,
      )
    },
    [drag],
  )

  const handleBoardUp = useCallback(
    (e: ReactPointerEvent) => {
      if (!drag) return
      e.preventDefault()

      const piece = pieces.find((p) => p.id === drag.pieceId)!
      const slot = slots.find((s) => s.id === piece.slotId)!
      const board = boardRef.current
      const rect = board?.getBoundingClientRect()

      let snapped = false
      if (rect && !locked[slot.id]) {
        const center = slotCenterPx(slot, rect)
        const pieceCenter = {
          x: drag.x + drag.offsetX,
          y: drag.y + drag.offsetY,
        }
        const dist = Math.hypot(pieceCenter.x - center.x, pieceCenter.y - center.y)
        if (dist <= SNAP_PX) {
          snapped = true
          playSnapSound()
          setLocked((prev) => {
            const next = { ...prev, [slot.id]: piece.id }
            if (Object.keys(next).length >= pieces.length && !successFiredRef.current) {
              successFiredRef.current = true
              setCelebrating(true)
              window.setTimeout(() => onSuccess?.(), 900)
            }
            return next
          })
        }
      }

      if (!snapped) {
        setRejectId(piece.id)
        window.setTimeout(() => setRejectId(null), 420)
      }

      setDrag(null)
      if (board?.hasPointerCapture(e.pointerId)) {
        board.releasePointerCapture(e.pointerId)
      }
    },
    [drag, pieces, slots, locked, onSuccess],
  )

  const handleReset = useCallback(() => {
    successFiredRef.current = false
    setLocked({})
    setDrag(null)
    setCelebrating(false)
    setRejectId(null)
  }, [])

  const renderLockedPiece = (slot: FossilSlot) => {
    const pieceId = locked[slot.id]
    if (!pieceId) return null
    const piece = pieces.find((p) => p.id === pieceId)!

    return (
      <motion.div
        key={`locked-${slot.id}`}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="pointer-events-none absolute"
        style={{
          left: `${slot.x}%`,
          top: `${slot.y}%`,
          width: `${slot.w}%`,
          height: `${slot.h * FOSSIL_ASPECT}%`,
          transform: `translate(-50%, -50%) rotate(${slot.rotation ?? 0}deg)`,
        }}
      >
        <div
          className="h-full w-full overflow-hidden rounded-md border border-jade-bright/60 shadow-[0_0_16px_rgba(45,212,168,0.55)]"
          style={{
            backgroundImage: `url(${baseImage})`,
            backgroundSize: 'cover',
            backgroundPosition: `${piece.bgX ?? 50}% ${piece.bgY ?? 50}%`,
          }}
        />
        <motion.span
          initial={{ opacity: 1, scale: 1.5 }}
          animate={{ opacity: 0, scale: 2.2 }}
          transition={{ duration: 0.55 }}
          className="absolute inset-0 rounded-md ring-2 ring-gold-bright/80"
        />
      </motion.div>
    )
  }

  return (
    <div className="w-full">
      <p className="mb-3 text-center text-xs leading-relaxed text-mist-muted">
        将底部骨骼碎片拖入化石骨架的虚线空缺，三块全部归位即完成重组。
      </p>

      <div
        ref={boardRef}
        className="relative mx-auto w-full touch-none select-none overflow-hidden rounded-xl border border-jade/25 bg-void-950 shadow-glow"
        style={{ touchAction: 'none', aspectRatio: FOSSIL_ASPECT, maxHeight: 'min(52dvh, 420px)' }}
        onPointerMove={handleBoardMove}
        onPointerUp={handleBoardUp}
        onPointerCancel={handleBoardUp}
      >
        <img
          src={baseImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-90"
          draggable={false}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-void-950/20 via-transparent to-void-950/75" />

        {/* 虚线槽位轮廓 */}
        {slots.map((slot) => {
          const filled = Boolean(locked[slot.id])
          return (
            <div
              key={slot.id}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${slot.x}%`,
                top: `${slot.y}%`,
                width: `${slot.w}%`,
                height: `${slot.h * FOSSIL_ASPECT}%`,
                transform: `translate(-50%, -50%) rotate(${slot.rotation ?? 0}deg)`,
              }}
            >
              <div
                className={`flex h-full w-full items-center justify-center rounded-md border-2 border-dashed ${
                  filled
                    ? 'border-jade-bright/20 bg-jade-deep/10'
                    : 'border-amber-200/55 bg-amber-950/15 shadow-[inset_0_0_12px_rgba(253,230,138,0.12)]'
                }`}
              >
                {!filled && (
                  <span className="text-[9px] tracking-widest text-amber-100/70">{slot.label}</span>
                )}
              </div>
            </div>
          )
        })}

        {slots.map(renderLockedPiece)}

        {/* 底部碎片托盘 */}
        {pieces.map((piece, index) => {
          if (Object.values(locked).includes(piece.id)) return null
          if (drag?.pieceId === piece.id) return null

          const pos = getTrayPosition(piece.id, index)
          return (
            <motion.div
              key={piece.id}
              animate={
                rejectId === piece.id
                  ? { x: [0, -8, 8, -4, 0], transition: { duration: 0.4 } }
                  : { x: 0 }
              }
              className={`absolute cursor-grab active:cursor-grabbing ${
                rejectId === piece.id ? 'ring-2 ring-red-400/70' : ''
              }`}
              style={{
                left: pos.left,
                top: pos.top,
                width: 56,
                height: 56,
                zIndex: 30,
                touchAction: 'none',
              } as CSSProperties}
              onPointerDown={(e) => handlePieceDown(e, piece.id)}
            >
              <div
                className="h-full w-full overflow-hidden rounded-lg border border-mist-faint/30 bg-void-900 shadow-glow"
                style={{
                  backgroundImage: `url(${baseImage})`,
                  backgroundSize: '220%',
                  backgroundPosition: `${piece.bgX ?? 50}% ${piece.bgY ?? 50}%`,
                }}
              />
              <span className="pointer-events-none absolute -bottom-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-mist-faint">
                {piece.label}
              </span>
            </motion.div>
          )
        })}

        {drag && (() => {
          const piece = pieces.find((p) => p.id === drag.pieceId)!
          const board = boardRef.current
          if (!board) return null
          const rect = board.getBoundingClientRect()
          return (
            <div
              className="absolute cursor-grabbing"
              style={{
                left: drag.x - rect.left,
                top: drag.y - rect.top,
                width: 56,
                height: 56,
                zIndex: 100,
                filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.55))',
              }}
            >
              <div
                className="h-full w-full overflow-hidden rounded-lg border-2 border-gold-bright/70"
                style={{
                  backgroundImage: `url(${baseImage})`,
                  backgroundSize: '220%',
                  backgroundPosition: `${piece.bgX ?? 50}% ${piece.bgY ?? 50}%`,
                }}
              />
            </div>
          )
        })()}

        <AnimatePresence>
          {celebrating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-jade-deep/25 backdrop-blur-[1px]"
            >
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="rounded-2xl border border-jade-bright/50 bg-void-950/80 px-5 py-3 text-center shadow-glow"
              >
                <p className="text-base font-medium text-jade-bright">骨架重组完成</p>
                <p className="mt-0.5 text-[11px] text-mist-muted">贵州龙化石已复原</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-mist-faint">
        <span>
          已镶嵌 {lockedCount}/{pieces.length}
        </span>
        <button
          type="button"
          className="rounded-lg border border-sky/25 px-2.5 py-1 text-sky-bright active:bg-sky/10"
          onPointerDown={(e) => {
            e.preventDefault()
            handleReset()
          }}
        >
          重新摆放
        </button>
      </div>
    </div>
  )
}

export default FossilDragPuzzle
