import { AnimatePresence, motion } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { BookOpen, Sparkles, X } from 'lucide-react'
import {
  BAGUA_CLUE_LIBRARY,
  BAGUA_FIELD_BG,
  BAGUA_FLAG_TARGET_ORDER,
  BAGUA_INITIAL_ANGLES,
  BAGUA_STEP_DEG,
  BAGUA_TRIGRAMS,
  type BaguaTrigram,
} from '../../config/baGuaTianConfig'
import { useGameStore } from '../../store/gameStore'
import { createCooldownGate, preventGhostActivation } from '../../utils/touchInteraction'
import { ModalOverlay } from '../ui/ModalOverlay'

const RING_ROTATE_COOLDOWN_MS = 250

type BaguaClueItem = (typeof BAGUA_CLUE_LIBRARY)[number]
type RingId = 'outer' | 'middle' | 'inner'
type PuzzleStage = 'flags' | 'linkage' | 'victory'

interface Angles {
  outer: number
  middle: number
  inner: number
}

const RING_SIZE: Record<RingId, number> = { outer: 98, middle: 72, inner: 46 }
const RING_LABEL: Record<RingId, string> = {
  outer: '天轨',
  middle: '人枢',
  inner: '地络',
}

const TRIGRAM_STYLE: Record<BaguaTrigram, { bg: string; ring: string; text: string }> = {
  乾: { bg: '#3d2817', ring: '#fde68a', text: '#fef3c7' },
  坤: { bg: '#2a2418', ring: '#d6c4a0', text: '#e8dcc8' },
  震: { bg: '#1e2f1a', ring: '#86efac', text: '#bbf7d0' },
  巽: { bg: '#1a2a28', ring: '#5eead4', text: '#ccfbf1' },
  坎: { bg: '#152238', ring: '#7dd3fc', text: '#e0f2fe' },
  离: { bg: '#3b1f18', ring: '#fca5a5', text: '#fecaca' },
  艮: { bg: '#2a2820', ring: '#d4a84b', text: '#fde68a' },
  兑: { bg: '#2a2038', ring: '#c4b5fd', text: '#ede9fe' },
}

export interface BaGuaTianPuzzleProps {
  spiritName?: string
  /** 调试页可展示全部线索；主线仅显示已收录线索 */
  showAllClues?: boolean
  onSuccess?: () => void
}

function normalizeDeg(deg: number) {
  return ((deg % 360) + 360) % 360
}

function shuffleFlags(): BaguaTrigram[] {
  const arr = [...BAGUA_TRIGRAMS] as BaguaTrigram[]
  do {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
  } while (arr.every((f, i) => f === BAGUA_FLAG_TARGET_ORDER[i]))
  return arr
}

function isFlagsSolved(slots: BaguaTrigram[]) {
  return slots.every((f, i) => f === BAGUA_FLAG_TARGET_ORDER[i])
}

function applyLinkage(ringId: RingId, prev: Angles): Angles {
  const step = BAGUA_STEP_DEG
  switch (ringId) {
    case 'outer':
      return { outer: prev.outer + step, middle: prev.middle, inner: prev.inner - step }
    case 'middle':
      return { outer: prev.outer + step, middle: prev.middle + step, inner: prev.inner }
    case 'inner':
      return { outer: prev.outer, middle: prev.middle - step, inner: prev.inner + step }
  }
}

function isLinkageSolved(angles: Angles) {
  return (
    normalizeDeg(angles.outer) === 0 &&
    normalizeDeg(angles.middle) === 0 &&
    normalizeDeg(angles.inner) === 0
  )
}

function playClick() {
  try {
    if (navigator.vibrate) navigator.vibrate(24)
  } catch {
    /* ignore */
  }
}

function playStageWin() {
  try {
    if (navigator.vibrate) navigator.vibrate([50, 40, 80])
  } catch {
    /* ignore */
  }
}

function slotPosition(index: number, radiusPct: number) {
  const rad = ((index * 45) * Math.PI) / 180
  return {
    left: `${50 + radiusPct * Math.sin(rad)}%`,
    top: `${50 - radiusPct * Math.cos(rad)}%`,
  }
}

function ClueLibraryPanel({
  clues,
  onClose,
}: {
  clues: readonly BaguaClueItem[]
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-start justify-end bg-black/55 p-3 backdrop-blur-[2px]"
      onPointerDown={onClose}
    >
      <motion.div
        initial={{ x: 24, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 16, opacity: 0 }}
        className="max-h-[82%] w-[min(100%,17rem)] overflow-y-auto rounded-xl border border-gold-muted/30 bg-void-900/96 p-4 shadow-xl"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-gold-bright">线索库</p>
          <button type="button" onPointerDown={(e) => { e.preventDefault(); onClose() }} className="rounded-full p-1 text-mist-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          {clues.length === 0 ? (
            <p className="text-[11px] leading-relaxed text-mist-faint">
              尚未收录线索。请先完成众星捧月共鸣与日月田描摹。
            </p>
          ) : (
            clues.map((item) => (
              <div key={item.id} className="rounded-lg border border-gold-muted/30 bg-gold-deep/12 px-3 py-2.5">
                <p className="text-xs font-medium text-gold-bright">【{item.artifactName}】</p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-mist-muted">{item.hint}</p>
                <p className="mt-2 text-[11px] leading-relaxed text-jade-bright/85">破阵：{item.puzzleHint}</p>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function FlagSlot({
  trigram,
  selected,
  onSelect,
}: {
  trigram: BaguaTrigram
  selected: boolean
  onSelect: () => void
}) {
  const style = TRIGRAM_STYLE[trigram]
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        preventGhostActivation(e)
        e.stopPropagation()
        onSelect()
      }}
      className={`flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all sm:h-12 sm:w-12 ${
        selected
          ? 'scale-110 border-jade-bright shadow-[0_0_18px_rgba(45,212,168,0.55)]'
          : 'border-white/20 hover:border-gold-muted/50'
      }`}
      style={{
        background: style.bg,
        color: style.text,
        boxShadow: selected ? undefined : `0 0 8px ${style.ring}33`,
        borderColor: selected ? undefined : style.ring + '88',
        touchAction: 'none',
      }}
    >
      {trigram}
    </button>
  )
}

function RingDial({ ringId, glow }: { ringId: RingId; glow: boolean }) {
  const palette = {
    outer: { stroke: '#d4a84b', fill: '#6b4e1f', accent: '#7dd3fc' },
    middle: { stroke: '#c9a227', fill: '#4a3518', accent: '#fbbf24' },
    inner: { stroke: '#b8922a', fill: '#2f2210', accent: '#5eecc4' },
  }[ringId]

  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
      <defs>
        <radialGradient id={`br-${ringId}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={palette.fill} />
          <stop offset="100%" stopColor="#1a1208" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="94" fill={`url(#br-${ringId})`} stroke={palette.stroke} strokeWidth="2.5" />
      {Array.from({ length: 8 }).map((_, i) => {
        const rad = ((i * 45 - 90) * Math.PI) / 180
        const major = i === 0
        return (
          <g key={i}>
            <line
              x1={100 + 62 * Math.cos(rad)}
              y1={100 + 62 * Math.sin(rad)}
              x2={100 + 88 * Math.cos(rad)}
              y2={100 + 88 * Math.sin(rad)}
              stroke={major ? palette.accent : palette.stroke}
              strokeWidth={major ? 2.5 : 1}
              opacity={major ? 1 : 0.5}
            />
            {major && (
              <polygon
                points={`${100 + 68 * Math.cos(rad)},${100 + 68 * Math.sin(rad)} ${100 + 82 * Math.cos(rad + 0.12)},${100 + 82 * Math.sin(rad + 0.12)} ${100 + 82 * Math.cos(rad - 0.12)},${100 + 82 * Math.sin(rad - 0.12)}`}
                fill={palette.accent}
                style={{ filter: glow ? `drop-shadow(0 0 8px ${palette.accent})` : undefined }}
              />
            )}
          </g>
        )
      })}
      <text x="100" y="118" textAnchor="middle" fill={palette.stroke} fontSize="9" opacity="0.65" letterSpacing="3">
        {RING_LABEL[ringId]}
      </text>
    </svg>
  )
}

function VictoryModal({ spiritName, onConfirm }: { spiritName: string; onConfirm: () => void }) {
  return (
    <ModalOverlay open>
      <motion.div
        initial={{ scale: 0.9, y: 12, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        className="w-full max-w-sm rounded-2xl border border-jade-muted/40 bg-void-900/95 p-6 text-center shadow-[0_0_48px_rgba(45,212,168,0.28)]"
      >
        <Sparkles className="mx-auto mb-3 h-8 w-8 text-jade-bright" />
        <p className="text-base font-medium leading-relaxed text-jade-bright">阵法彻底激活！</p>
        <p className="mt-2 text-sm text-gold-muted">成功唤醒【{spiritName}】</p>
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault()
            onConfirm()
          }}
          className="mt-5 w-full rounded-xl bg-jade-deep/45 py-3 text-sm font-medium text-jade-bright ring-1 ring-jade-muted/40"
          style={{ touchAction: 'none' }}
        >
          收录图鉴，继续寻灵
        </button>
      </motion.div>
    </ModalOverlay>
  )
}

export function BaGuaTianPuzzle({
  spiritName = '万峰山神',
  showAllClues = false,
  onSuccess,
}: BaGuaTianPuzzleProps) {
  const { collectedClues } = useGameStore()
  const visibleClues = useMemo(
    () =>
      showAllClues
        ? BAGUA_CLUE_LIBRARY
        : BAGUA_CLUE_LIBRARY.filter((item) => collectedClues.includes(item.id)),
    [showAllClues, collectedClues],
  )

  const [puzzleStage, setPuzzleStage] = useState<PuzzleStage>('flags')
  const [flagSlots, setFlagSlots] = useState<BaguaTrigram[]>(() => shuffleFlags())
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [flagWinFlash, setFlagWinFlash] = useState(false)

  const [angles, setAngles] = useState<Angles>({ ...BAGUA_INITIAL_ANGLES })
  const [linkageGlow, setLinkageGlow] = useState(false)
  const [lastRing, setLastRing] = useState<RingId | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showCluePanel, setShowCluePanel] = useState(false)

  const diskRef = useRef<HTMLDivElement>(null)
  const ringCooldownRef = useRef(createCooldownGate(RING_ROTATE_COOLDOWN_MS))
  const successFiredRef = useRef(false)

  const handleFlagClick = useCallback(
    (index: number) => {
      if (puzzleStage !== 'flags' || flagWinFlash) return
      playClick()
      if (selectedSlot === null) {
        setSelectedSlot(index)
        return
      }
      if (selectedSlot === index) {
        setSelectedSlot(null)
        return
      }
      setFlagSlots((prev) => {
        const next = [...prev]
        ;[next[selectedSlot], next[index]] = [next[index], next[selectedSlot]]
        return next
      })
      setSelectedSlot(null)
    },
    [puzzleStage, flagWinFlash, selectedSlot],
  )

  useEffect(() => {
    if (puzzleStage !== 'flags' || flagWinFlash) return
    if (!isFlagsSolved(flagSlots)) return
    setFlagWinFlash(true)
    playStageWin()
    window.setTimeout(() => {
      setPuzzleStage('linkage')
      setFlagWinFlash(false)
      setSelectedSlot(null)
    }, 1400)
  }, [flagSlots, puzzleStage, flagWinFlash])

  const resolveRingFromPointer = useCallback((clientX: number, clientY: number): RingId | null => {
    const disk = diskRef.current
    if (!disk) return null
    const rect = disk.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dist = Math.hypot(clientX - cx, clientY - cy)
    const outerR = rect.width / 2
    const middleR = outerR * (RING_SIZE.middle / RING_SIZE.outer)
    const innerR = outerR * (RING_SIZE.inner / RING_SIZE.outer)
    if (dist > outerR * 0.98 || dist < outerR * 0.1) return null
    if (dist <= innerR) return 'inner'
    if (dist <= middleR) return 'middle'
    return 'outer'
  }, [])

  const rotateRing = useCallback(
    (ringId: RingId) => {
      if (puzzleStage !== 'linkage') return
      if (!ringCooldownRef.current.tryPass()) return
      playClick()
      setLastRing(ringId)
      setAngles((prev) => applyLinkage(ringId, prev))
    },
    [puzzleStage],
  )

  const handleDiskPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (puzzleStage !== 'linkage') return
      preventGhostActivation(e)
      e.stopPropagation()
      const ringId = resolveRingFromPointer(e.clientX, e.clientY)
      if (ringId) rotateRing(ringId)
    },
    [puzzleStage, resolveRingFromPointer, rotateRing],
  )

  useEffect(() => {
    if (puzzleStage !== 'linkage') return
    if (!isLinkageSolved(angles)) return
    setPuzzleStage('victory')
    setLinkageGlow(true)
    playStageWin()
    window.setTimeout(() => setShowModal(true), 1100)
  }, [angles, puzzleStage])

  const handleVictoryConfirm = useCallback(() => {
    if (successFiredRef.current) return
    successFiredRef.current = true
    setShowModal(false)
    onSuccess?.()
  }, [onSuccess])

  const ringOrder: RingId[] = ['outer', 'middle', 'inner']

  return (
    <div
      className="interactive-area relative mx-auto aspect-[9/16] w-full max-w-[min(100%,22rem)] overflow-hidden rounded-xl border border-amber-800/40 shadow-lg"
    >
      <img src={BAGUA_FIELD_BG} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.2)_42%,rgba(0,0,0,0.82)_100%)]" />

      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setShowCluePanel(true)
        }}
        className="absolute right-3 top-3 z-40 flex items-center gap-1.5 rounded-full border border-gold-muted/35 bg-black/55 px-3 py-1.5 text-[11px] text-gold-bright backdrop-blur-sm"
        style={{ touchAction: 'none' }}
      >
        <BookOpen className="h-3.5 w-3.5" />
        线索库
      </button>

      <div className="pointer-events-none absolute left-1/2 top-[10%] z-20 -translate-x-1/2 text-center">
        <span className="text-[9px] tracking-[0.4em] text-gold-bright/85">
          {puzzleStage === 'flags' ? '八门归位' : '天门 · 零位'}
        </span>
        <div className="mx-auto mt-1 h-8 w-px bg-gradient-to-b from-jade-bright/80 to-transparent" />
      </div>

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative aspect-square w-full max-w-[min(92vw,20rem)]">
          {/* 阶段一：八门阵旗 */}
          <AnimatePresence>
            {(puzzleStage === 'flags' || flagWinFlash) && (
              <motion.div
                key="flags"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0"
              >
                <div className="absolute inset-[8%] rounded-full border border-dashed border-gold-muted/25" />
                {flagSlots.map((trigram, i) => (
                  <div key={i} className="absolute z-10" style={slotPosition(i, 44)}>
                    <FlagSlot
                      trigram={trigram}
                      selected={selectedSlot === i}
                      onSelect={() => handleFlagClick(i)}
                    />
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 阶段二：三才连环 */}
          <AnimatePresence>
            {(puzzleStage === 'linkage' || puzzleStage === 'victory') && (
              <motion.div
                key="linkage"
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.65, ease: 'easeOut' }}
                ref={diskRef}
                className={`absolute inset-0 ${puzzleStage === 'victory' ? 'pointer-events-none' : 'cursor-pointer'}`}
                style={{ touchAction: 'none' }}
                onPointerDown={handleDiskPointerDown}
                role="button"
                tabIndex={-1}
                aria-label="三才连环阵盘"
              >
                {ringOrder.map((ringId) => (
                  <motion.div
                    key={ringId}
                    className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                      ringId === 'outer' ? 'z-10' : ringId === 'middle' ? 'z-20' : 'z-[25]'
                    }`}
                    style={{ width: `${RING_SIZE[ringId]}%`, height: `${RING_SIZE[ringId]}%` }}
                    animate={{
                      rotate: angles[ringId],
                      boxShadow: linkageGlow
                        ? '0 0 32px rgba(56,189,248,0.65), 0 0 48px rgba(253,230,138,0.35)'
                        : lastRing === ringId
                          ? '0 0 16px rgba(212,168,75,0.45)'
                          : '0 0 0px transparent',
                    }}
                    transition={{
                      rotate: { duration: 0.34, ease: [0.25, 0.1, 0.25, 1] },
                      boxShadow: { duration: 0.4 },
                    }}
                  >
                    <div className={`h-full w-full rounded-full ${linkageGlow ? 'ring-2 ring-jade-bright/80' : ''}`}>
                      <RingDial ringId={ringId} glow={linkageGlow} />
                    </div>
                  </motion.div>
                ))}
                <div className="pointer-events-none absolute left-1/2 top-1/2 z-40 h-[13%] w-[13%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-600/70 bg-gradient-to-br from-amber-950/95 to-void-950 shadow-inner" />
                <AnimatePresence>
                  {linkageGlow && (
                    <motion.div
                      initial={{ opacity: 0, scaleY: 0.2 }}
                      animate={{ opacity: [0, 1, 0.9], scaleY: [0.2, 1.15, 1] }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="pointer-events-none absolute left-1/2 top-1/2 z-50 h-[58%] w-10 -translate-x-1/2 origin-bottom bg-gradient-to-t from-cyan-500/15 via-cyan-300/60 to-white/80"
                      style={{
                        clipPath: 'polygon(38% 100%, 62% 100%, 100% 0%, 0% 0%)',
                        filter: 'drop-shadow(0 0 32px rgba(56,189,248,0.9))',
                      }}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {flagWinFlash && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.85, 0] }}
                transition={{ duration: 1.2 }}
                className="pointer-events-none absolute inset-0 z-30 bg-[radial-gradient(circle,rgba(253,230,138,0.55),transparent_68%)]"
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-4 pt-12">
        <p className="text-center text-xs leading-relaxed text-white/88">
          {puzzleStage === 'flags' &&
            (selectedSlot != null
              ? '再点一面阵旗与之交换位置'
              : '阶段一：点击两面阵旗交换，归位先天八卦')}
          {puzzleStage === 'linkage' && '阶段二：点击外/中/内环，每击顺时针 45° · 三才聚于天门'}
          {puzzleStage === 'victory' && '阵法彻底贯通，万灵阵眼洞开'}
        </p>
        {puzzleStage === 'linkage' && (
          <p className="mt-1.5 text-center font-mono text-[10px] text-white/50">
            外 {normalizeDeg(angles.outer)}° · 中 {normalizeDeg(angles.middle)}° · 内{' '}
            {normalizeDeg(angles.inner)}°
          </p>
        )}
      </div>

      <AnimatePresence>
        {showCluePanel && (
          <ClueLibraryPanel clues={visibleClues} onClose={() => setShowCluePanel(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && <VictoryModal spiritName={spiritName} onConfirm={handleVictoryConfirm} />}
      </AnimatePresence>
    </div>
  )
}

export default BaGuaTianPuzzle
