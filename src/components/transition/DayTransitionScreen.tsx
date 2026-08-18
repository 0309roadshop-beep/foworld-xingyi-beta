import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import type { TransitionPhase } from '../../store/DailyTransitionManager'

const SEALING_LINES = [
  '> 正在锚定今日灵力频率...',
  '> 高维数据已写入寻灵阵图...',
  '> 日结封装完成，系统退回自由探索模式。',
] as const

const BYPASS_TAP_TARGET = 5
const BYPASS_TAP_WINDOW_MS = 2800

export interface DaySealingStats {
  day: number
  lingyuan: number
  spiritsCount: number
  affinitiesTodayCount: number
  affinitiesTotalCount: number
}

export interface DayTransitionScreenProps {
  phase: TransitionPhase
  completedDay: number | null
  pendingNextDay: number | null
  sealingStats: DaySealingStats | null
  onSealingComplete: () => void
  onBootComplete: () => void
  onBypassTimeLock: () => void
}

function TypewriterSeal({
  stats,
  onComplete,
}: {
  stats: DaySealingStats | null
  onComplete: () => void
}) {
  const [lineIndex, setLineIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const doneRef = useRef(false)

  useEffect(() => {
    if (lineIndex >= SEALING_LINES.length) {
      if (!doneRef.current) {
        doneRef.current = true
        const t = window.setTimeout(onComplete, 720)
        return () => window.clearTimeout(t)
      }
      return
    }

    const line = SEALING_LINES[lineIndex]
    if (charIndex < line.length) {
      const t = window.setTimeout(() => setCharIndex((c) => c + 1), 34)
      return () => window.clearTimeout(t)
    }

    const t = window.setTimeout(() => {
      setLineIndex((i) => i + 1)
      setCharIndex(0)
    }, 520)
    return () => window.clearTimeout(t)
  }, [lineIndex, charIndex, onComplete])

  return (
    <div className="mx-auto w-full max-w-md px-6">
      {stats && (
        <div
          className="mb-6 rounded-xl border border-cyan-500/30 bg-[#0B131A]/90 px-5 py-4 backdrop-blur-md"
          style={{ boxShadow: '0 0 28px rgba(0,245,255,0.1)' }}
        >
          <p className="mb-3 text-center font-mono text-[10px] tracking-[0.35em] text-cyan-400/70">
            DAY {stats.day} · 日结数据封装
          </p>
          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="rounded-lg border border-white/8 bg-black/30 px-3 py-2.5 text-center">
              <p className="text-[10px] text-white/40">灵源滴</p>
              <p className="mt-1 text-base text-[#00F5FF]">{stats.lingyuan}</p>
            </div>
            <div className="rounded-lg border border-white/8 bg-black/30 px-3 py-2.5 text-center">
              <p className="text-[10px] text-white/40">已召唤幻兽</p>
              <p className="mt-1 text-base text-[#00F5FF]">{stats.spiritsCount}</p>
            </div>
            <div className="col-span-2 rounded-lg border border-white/8 bg-black/30 px-3 py-2.5 text-center">
              <p className="text-[10px] text-white/40">元素印记</p>
              <p className="mt-1 text-sm text-white/80">
                本日新增 {stats.affinitiesTodayCount} · 累计 {stats.affinitiesTotalCount}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 font-mono text-sm leading-relaxed text-[#00F5FF]/90">
        {SEALING_LINES.map((line, i) => (
          <p key={line} className={i > lineIndex ? 'opacity-0' : 'opacity-100'}>
            {i < lineIndex ? line : line.slice(0, charIndex)}
            {i === lineIndex && (
              <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-[#00F5FF]/70 align-middle" />
            )}
          </p>
        ))}
      </div>
    </div>
  )
}

function BootPanel({ nextDay, onProgressEnd }: { nextDay: number; onProgressEnd: () => void }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const start = Date.now()
    const duration = 2400
    const tick = window.setInterval(() => {
      const p = Math.min(100, ((Date.now() - start) / duration) * 100)
      setProgress(p)
      if (p >= 100) {
        window.clearInterval(tick)
        window.setTimeout(onProgressEnd, 360)
      }
    }, 40)
    return () => window.clearInterval(tick)
  }, [onProgressEnd])

  return (
    <div className="flex flex-col items-center px-8">
      <div className="relative mb-8 h-36 w-36">
        <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden>
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="rgba(0,245,255,0.15)"
            strokeWidth="1"
          />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="#00F5FF"
            strokeWidth="1.5"
            strokeDasharray={`${(progress / 100) * 327} 327`}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dasharray 0.08s linear' }}
          />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <line
              key={deg}
              x1="60"
              y1="14"
              x2="60"
              y2="22"
              stroke="rgba(0,245,255,0.35)"
              strokeWidth="1"
              transform={`rotate(${deg} 60 60)`}
            />
          ))}
        </svg>
        <div
          className="absolute inset-0 animate-spin"
          style={{ animationDuration: '6s' }}
        >
          <div className="mx-auto mt-4 h-28 w-28 rounded-full border border-dashed border-cyan-500/25" />
        </div>
      </div>

      <p className="mb-2 font-mono text-[10px] tracking-[0.3em] text-[#00F5FF]/70">
        SYSTEM REBOOT
      </p>
      <p className="text-center font-mono text-sm text-white/85">
        [地磁参数刷新完毕，Day {nextDay} 权限已解锁]
      </p>
      <div className="mt-6 h-1 w-48 overflow-hidden rounded-full bg-cyan-500/10">
        <div
          className="h-full rounded-full bg-[#00F5FF] transition-[width] duration-75"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

/**
 * 跨日过渡全屏层 — 仅日结封装与次日开机动画（冷却期退回 OS 主线休眠卡片）
 */
export function DayTransitionScreen({
  phase,
  completedDay,
  pendingNextDay,
  sealingStats,
  onSealingComplete,
  onBootComplete,
  onBypassTimeLock,
}: DayTransitionScreenProps) {
  const tapTimesRef = useRef<number[]>([])

  const handleTitleTap = useCallback(() => {
    const now = Date.now()
    tapTimesRef.current = [...tapTimesRef.current.filter((t) => now - t < BYPASS_TAP_WINDOW_MS), now]
    if (tapTimesRef.current.length >= BYPASS_TAP_TARGET) {
      tapTimesRef.current = []
      onBypassTimeLock()
    }
  }, [onBypassTimeLock])

  if (phase === 'idle' || typeof document === 'undefined') return null

  const title =
    phase === 'sealing'
      ? `DAY ${completedDay ?? '—'} · 日结封装`
      : `DAY ${pendingNextDay ?? '—'} · 系统重启`

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex flex-col bg-slate-900"
      style={{
        touchAction: 'manipulation',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        backgroundColor: '#0B131A',
      }}
    >
      <button
        type="button"
        onPointerDown={(e: ReactPointerEvent<HTMLButtonElement>) => {
          e.preventDefault()
          handleTitleTap()
        }}
        className="shrink-0 px-6 pb-4 pt-8 text-center font-mono text-[10px] tracking-[0.45em] text-[#00F5FF]/55 transition-opacity active:opacity-70"
      >
        {title}
      </button>

      <div className="flex flex-1 flex-col items-center justify-center">
        {phase === 'sealing' && (
          <TypewriterSeal stats={sealingStats} onComplete={onSealingComplete} />
        )}
        {phase === 'boot' && pendingNextDay != null && (
          <BootPanel nextDay={pendingNextDay} onProgressEnd={onBootComplete} />
        )}
      </div>

      {phase === 'boot' && (
        <p className="shrink-0 pb-8 text-center font-mono text-[9px] text-white/20">
          开发者：连续点击顶部标题 {BYPASS_TAP_TARGET} 次可绕过时间锁
        </p>
      )}
    </div>,
    document.body,
  )
}

export default DayTransitionScreen
