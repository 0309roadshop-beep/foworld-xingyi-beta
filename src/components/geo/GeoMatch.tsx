import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

/* ── 类型定义 ── */

/** 单列卡片数据 */
export interface GeoMatchItem {
  /** 配对唯一 id — 左右列相同 id 即为正确匹配 */
  id: string
  label: string
  sublabel?: string
  /** 左列可选配图 */
  imageUrl?: string
}

/** 两列打乱后的匹配数据 */
export interface GeoMatchData {
  left: GeoMatchItem[]
  right: GeoMatchItem[]
}

/** 已成功绘制的连线（相对 board 容器坐标） */
export interface MatchedLine {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface GeoMatchProps {
  matchData: GeoMatchData
  /** 全部配对成功后触发（组件内部已延时 1s） */
  onSuccess: () => void
}

/* ── 坐标工具：getBoundingClientRect 相对容器 offset ── */

function getCenterRelative(
  el: HTMLElement,
  container: HTMLElement,
): { x: number; y: number } {
  const elRect = el.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  return {
    x: elRect.left + elRect.width / 2 - containerRect.left,
    y: elRect.top + elRect.height / 2 - containerRect.top,
  }
}

/**
 * GeoMatch — 两列信息匹配连线小游戏
 * 先点左列 → 再点右列；正确锁定画线，错误抖动 500ms
 */
export function GeoMatch({ matchData, onSuccess }: GeoMatchProps) {
  const boardRef = useRef<HTMLDivElement>(null)
  const leftCardRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const rightCardRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null)
  const [selectedRightId, setSelectedRightId] = useState<string | null>(null)
  const [matchedIds, setMatchedIds] = useState<Set<string>>(() => new Set())
  const [matchedLines, setMatchedLines] = useState<MatchedLine[]>([])
  const [shakeLeftId, setShakeLeftId] = useState<string | null>(null)
  const [shakeRightId, setShakeRightId] = useState<string | null>(null)
  const [isVictory, setIsVictory] = useState(false)
  const victoryEmittedRef = useRef(false)

  const totalPairs = matchData.left.length

  /** 根据 matchedIds 重算 SVG 连线坐标 */
  const recalcLines = useCallback(() => {
    const board = boardRef.current
    if (!board) return

    const lines: MatchedLine[] = []
    matchedIds.forEach((id) => {
      const leftEl = leftCardRefs.current[id]
      const rightEl = rightCardRefs.current[id]
      if (!leftEl || !rightEl) return

      const p1 = getCenterRelative(leftEl, board)
      const p2 = getCenterRelative(rightEl, board)
      lines.push({ id, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y })
    })
    setMatchedLines(lines)
  }, [matchedIds])

  useEffect(() => {
    recalcLines()
  }, [matchedIds, recalcLines])

  /* 窗口 / 容器尺寸变化时重算连线 */
  useEffect(() => {
    const board = boardRef.current
    if (!board) return

    const ro = new ResizeObserver(() => {
      if (matchedIds.size > 0) recalcLines()
    })
    ro.observe(board)
    return () => ro.disconnect()
  }, [matchedIds.size, recalcLines])

  /* matchData 变更时重置 */
  useEffect(() => {
    setSelectedLeftId(null)
    setSelectedRightId(null)
    setMatchedIds(new Set())
    setMatchedLines([])
    setShakeLeftId(null)
    setShakeRightId(null)
    setIsVictory(false)
    victoryEmittedRef.current = false
  }, [matchData])

  /* 全部匹配 → 通关动效 → 1s 后 onSuccess */
  useEffect(() => {
    if (matchedIds.size < totalPairs || totalPairs === 0) return
    if (victoryEmittedRef.current) return

    victoryEmittedRef.current = true
    setIsVictory(true)

    const timer = window.setTimeout(() => {
      onSuccess()
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [matchedIds.size, totalPairs, onSuccess])

  const onLeftPointerDown = (e: React.PointerEvent, item: GeoMatchItem) => {
    e.preventDefault()
    if (isVictory || matchedIds.has(item.id)) return
    setSelectedLeftId(item.id)
    setSelectedRightId(null)
  }

  const onRightPointerDown = (e: React.PointerEvent, item: GeoMatchItem) => {
    e.preventDefault()
    if (isVictory || matchedIds.has(item.id)) return
    if (!selectedLeftId) return

    setSelectedRightId(item.id)

    if (selectedLeftId === item.id) {
      /* 匹配正确 — 锁定并画线 */
      setMatchedIds((prev) => new Set([...prev, item.id]))
      setSelectedLeftId(null)
      setSelectedRightId(null)
    } else {
      /* 匹配错误 — 500ms 抖动后重置 */
      setShakeLeftId(selectedLeftId)
      setShakeRightId(item.id)
      setSelectedLeftId(null)
      setSelectedRightId(null)

      window.setTimeout(() => {
        setShakeLeftId(null)
        setShakeRightId(null)
      }, 500)
    }
  }

  const leftCardClass = useMemo(
    () => (id: string) => {
      if (matchedIds.has(id)) {
        return 'border-spirit/60 bg-spirit-dim/25 text-spirit shadow-[0_0_12px_rgba(52,211,153,0.25)]'
      }
      if (shakeLeftId === id) {
        return 'border-red-400/70 bg-red-950/30 text-red-200 geo-match-shake'
      }
      if (selectedLeftId === id) {
        return 'border-gold-bright/70 bg-gold-muted/10 text-gold-bright shadow-[0_0_16px_rgba(212,175,55,0.2)]'
      }
      return 'border-void-600/80 bg-void-800/60 text-mist active:scale-95'
    },
    [matchedIds, shakeLeftId, selectedLeftId],
  )

  const rightCardClass = useMemo(
    () => (id: string) => {
      if (matchedIds.has(id)) {
        return 'border-spirit/60 bg-spirit-dim/25 text-spirit shadow-[0_0_12px_rgba(52,211,153,0.25)]'
      }
      if (shakeRightId === id) {
        return 'border-red-400/70 bg-red-950/30 text-red-200 geo-match-shake'
      }
      if (selectedRightId === id) {
        return 'border-gold-bright/50 bg-gold-muted/10 text-gold-bright'
      }
      return 'border-void-600/80 bg-void-800/60 text-mist active:scale-95'
    },
    [matchedIds, shakeRightId, selectedRightId],
  )

  return (
    <div className="geo-match w-full px-1 py-2">
      <p className="mb-3 text-center text-xs text-mist-muted">
        先点左列化石，再点右列解说，完成三叠纪博物馆配对
      </p>

      <div
        ref={boardRef}
        className={`relative w-full overflow-hidden rounded-2xl border border-void-600/60 bg-void-900/50 p-2 ${
          isVictory ? 'geo-match-victory-glow' : ''
        }`}
      >
        {/* SVG 连线层 — 底层绝对定位，不拦截点击 */}
        <svg
          className="pointer-events-none absolute inset-0 z-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="geo-match-line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(52,211,153,0.9)" />
              <stop offset="50%" stopColor="rgba(212,175,55,0.85)" />
              <stop offset="100%" stopColor="rgba(52,211,153,0.9)" />
            </linearGradient>
          </defs>
          {matchedLines.map((line) => (
            <line
              key={line.id}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="url(#geo-match-line-grad)"
              strokeWidth={2.5}
              strokeLinecap="round"
              className="geo-match-line-draw"
            />
          ))}
        </svg>

        {/* 两列卡片 — 左右统一 h-28，避免尺寸错位 */}
        <div className="relative z-10 grid grid-cols-2 gap-2 sm:gap-3">
          <div className="flex flex-col gap-2">
            <p className="text-center text-[10px] tracking-widest text-gold-muted">远古化石</p>
            {matchData.left.map((item) => (
              <button
                key={`left-${item.id}`}
                ref={(el) => {
                  leftCardRefs.current[item.id] = el
                }}
                type="button"
                disabled={matchedIds.has(item.id) || isVictory}
                className={`flex h-28 w-full min-w-0 overflow-hidden rounded-xl border transition-transform ${leftCardClass(item.id)}`}
                onPointerDown={(e) => onLeftPointerDown(e, item)}
              >
                <div className="flex h-full w-full min-w-0">
                  {item.imageUrl ? (
                    <div className="flex h-full w-[38%] shrink-0 items-center justify-center border-r border-void-600/40 bg-void-950/40 p-1.5">
                      <img
                        src={item.imageUrl}
                        alt={item.label}
                        className="h-full w-full rounded-md object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-full w-[38%] shrink-0 items-center justify-center border-r border-void-600/40 bg-void-950/40">
                      <span className="text-[10px] text-mist-faint">化石图</span>
                    </div>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-center">
                    <span className="w-full break-words text-xs font-medium leading-tight">
                      {item.label}
                    </span>
                    {item.sublabel && (
                      <span className="w-full break-words text-[10px] leading-snug opacity-70">
                        {item.sublabel}
                      </span>
                    )}
                    {matchedIds.has(item.id) && (
                      <span className="mt-0.5 text-[9px] tracking-wider text-spirit">✓ 已锁定</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-center text-[10px] tracking-widest text-gold-muted">博物馆解说</p>
            {matchData.right.map((item) => (
              <button
                key={`right-${item.id}`}
                ref={(el) => {
                  rightCardRefs.current[item.id] = el
                }}
                type="button"
                disabled={matchedIds.has(item.id) || isVictory}
                className={`flex h-28 w-full min-w-0 items-center justify-center overflow-hidden rounded-xl border px-2.5 py-2 text-center transition-transform ${rightCardClass(item.id)}`}
                onPointerDown={(e) => onRightPointerDown(e, item)}
              >
                <div className="flex min-w-0 flex-col items-center justify-center gap-1">
                  <span className="w-full break-words text-xs font-medium leading-snug">
                    {item.label}
                  </span>
                  {item.sublabel && (
                    <span className="w-full break-words text-[10px] leading-snug opacity-75">
                      {item.sublabel}
                    </span>
                  )}
                  {matchedIds.has(item.id) && (
                    <span className="mt-0.5 text-[9px] tracking-wider text-spirit">✓ 已锁定</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 通关 overlay */}
        {isVictory && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-void-950/50 backdrop-blur-[2px]">
            <div className="flex flex-col items-center gap-2 animate-in fade-in duration-300">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-gold-bright bg-gold-muted/20 shadow-[0_0_24px_rgba(212,175,55,0.4)]">
                <svg
                  className="h-7 w-7 text-gold-bright"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gold-bright">全部配对成功！</p>
            </div>
          </div>
        )}
      </div>

      <p className="mt-2 text-center text-[10px] text-mist-faint">
        已完成 {matchedIds.size} / {totalPairs}
      </p>

      <style>{`
        @keyframes geo-match-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .geo-match-shake {
          animation: geo-match-shake 0.5s ease-in-out;
        }
        @keyframes geo-match-line-draw {
          to { stroke-dashoffset: 0; }
        }
        .geo-match-line-draw {
          stroke-dasharray: 400;
          stroke-dashoffset: 400;
          animation: geo-match-line-draw 0.35s ease-out forwards;
        }
        @keyframes geo-match-victory-glow {
          0% { box-shadow: 0 0 0 rgba(212,175,55,0); }
          50% { box-shadow: 0 0 40px rgba(52,211,153,0.35); }
          100% { box-shadow: 0 0 24px rgba(212,175,55,0.2); }
        }
        .geo-match-victory-glow {
          animation: geo-match-victory-glow 1s ease-out forwards;
        }
      `}</style>
    </div>
  )
}

export default GeoMatch
