import { useCallback, useEffect, useRef, useState } from 'react'
import {
  dailyTransitionStore,
  formatCountdownHms,
} from '../../store/DailyTransitionManager'

const BYPASS_TAP_TARGET = 5
const BYPASS_TAP_WINDOW_MS = 2800

export interface MainQuestDormantPanelProps {
  day: number
  onBypassTimeLock?: () => void
  className?: string
}

/**
 * 主线休眠态 — 当天行程已收束，仅锁定主线追踪，支线与系统功能仍可用
 */
export function MainQuestDormantPanel({
  day,
  onBypassTimeLock,
  className = '',
}: MainQuestDormantPanelProps) {
  const [remainingMs, setRemainingMs] = useState(() => dailyTransitionStore.getRemainingMs())
  const tapTimesRef = useRef<number[]>([])

  useEffect(() => {
    const tick = window.setInterval(() => {
      setRemainingMs(dailyTransitionStore.getRemainingMs())
    }, 1000)
    return () => window.clearInterval(tick)
  }, [])

  const handleTitleTap = useCallback(() => {
    if (!onBypassTimeLock) return
    const now = Date.now()
    tapTimesRef.current = [...tapTimesRef.current.filter((t) => now - t < BYPASS_TAP_WINDOW_MS), now]
    if (tapTimesRef.current.length >= BYPASS_TAP_TARGET) {
      tapTimesRef.current = []
      onBypassTimeLock()
    }
  }, [onBypassTimeLock])

  return (
    <div
      className={`flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-cyan-500/50 bg-[#0B131A] px-4 py-8 text-center animate-pulse ${className}`}
      style={{ boxShadow: '0 0 24px rgba(0,245,255,0.08), inset 0 0 20px rgba(0,245,255,0.03)' }}
    >
      <button
        type="button"
        onClick={handleTitleTap}
        className="mb-2 font-mono text-[10px] tracking-[0.35em] text-cyan-400/70 active:opacity-70"
      >
        DAY {day} · 坐标封存
      </button>
      <p className="max-w-xs font-mono text-xs leading-relaxed text-white/75">
        [当前坐标已扫描完毕] 地磁参数冷却中...
        <br />
        次日 05:00 开启新坐标
      </p>
      <p className="mt-4 font-mono text-lg tabular-nums tracking-wider text-cyan-400">
        {formatCountdownHms(remainingMs)}
      </p>
      <p className="mt-3 text-[10px] text-white/35">
        支线任务、图鉴与集市仍可自由探索
      </p>
    </div>
  )
}

export default MainQuestDormantPanel
