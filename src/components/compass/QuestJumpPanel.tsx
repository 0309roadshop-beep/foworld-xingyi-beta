import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, FastForward, Gamepad2, Map } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { DEV_SHORTCUTS } from '../../config/devShortcuts'
import { getQuestNavigatorGroups } from '../../config/questNavigator'
import type { DaySideQuest } from '../../config/day1Types'
import { useGameStore } from '../../store/gameStore'

const GROUP_LABELS: Record<string, string> = {
  flow: '独立流程页',
  day1: 'Day 1 组件',
  camera: '相机 / AR',
  legacy: '遗留面板',
}

const TYPE_BADGE: Record<string, string> = {
  lbs: 'LBS',
  story: '剧情',
  'game-puzzle': '拼图',
  'game-scan': '扫描',
  'game-river-run': '试炼',
  'game-water-affinity': '亲和',
  'game-fire-affinity': '亲和',
  'game-camera': 'AR',
  'game-zhongxing-ar': 'AR',
  'game-riyue-tracing': '描摹',
  'game-bagua-puzzle': '解密',
  'game-compass-anomaly': '找茬',
  'game-wind-riding': '骑行',
  'game-leyline-match3': '三消',
  'game-wind-balance': '平衡',
  'game-cloud-maze': '迷宫',
  'game-cloud-leap': '跳跃',
  'game-connect': '连线',
  'game-astrolabe': '星盘',
  'game-slider': '滑块',
  'game-matrix': '矩阵',
  'game-scratch': '刮刮乐',
  'game-audio-catch': '集音',
  'game-simon': '音律',
  'game-gear': '齿轮',
  'game-scroll': '长卷',
  'game-fossil-drag': '化石',
  'game-ar-rebirth': 'AR',
  'game-sticker': '贴纸',
  'game-photo': '拍照',
  'game-form': '表单',
  'game-pipe-connect': '水管',
  'game-heritage-gallery': '图鉴',
  'game-lantern-match': '连连看',
  'game-iron-flower-confirm': '观演',
  'game-one-stroke': '一笔画',
  'offline-cave': '潜航',
  'game-crystal-miner': '汲取',
  'redeem-ticket': '核销',
  'game-fragment-scanner': '扫描',
  'game-core-fusion': '重铸',
  'game-jiexin-checkin': '打卡',
  'game-red-dust-scanner': '灵视',
  'game-core-placement': '阵核',
  'game-spirit-array': '归宗',
  'game-scroll-synthesis': '绘卷',
  credits: '落幕',
  'game-water-tuning': '调音',
  'game-gorge-bridge': '断桥',
  'game-gorge-sealion': '海狮',
  'game-abyss-rhythm': '太鼓',
}

interface QuestJumpPanelProps {
  variant?: 'debug' | 'player'
  onRestartProgress?: () => void
  onEnterPlayerMode?: () => void
  onToggleDebugView?: () => void
  onOpenSideQuest?: (quest: DaySideQuest) => void
}

/**
 * 环节试玩导航 — 玩家模式 / 调试模式均可跳转任意 Day·Step
 */
export function QuestJumpPanel({
  variant = 'player',
  onRestartProgress,
  onEnterPlayerMode,
  onToggleDebugView,
  onOpenSideQuest,
}: QuestJumpPanelProps) {
  const navigate = useNavigate()
  const { currentDay, currentStep, setProgress } = useGameStore()
  const [open, setOpen] = useState(variant === 'debug')
  const [expandedDay, setExpandedDay] = useState<number | null>(currentDay)

  const groups = useMemo(() => getQuestNavigatorGroups(), [])

  useEffect(() => {
    setExpandedDay(currentDay)
  }, [currentDay])

  const shortcutGroups = useMemo(
    () =>
      DEV_SHORTCUTS.reduce<Record<string, typeof DEV_SHORTCUTS>>((acc, item) => {
        const key = item.group ?? 'legacy'
        if (!acc[key]) acc[key] = []
        acc[key].push(item)
        return acc
      }, {}),
    [],
  )

  const jumpTo = (day: number, stepId: number) => {
    setProgress(day, stepId)
    setExpandedDay(day)
    if (variant === 'player') {
      window.requestAnimationFrame(() => {
        document.getElementById('main-quest-stage')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }

  const isDebug = variant === 'debug'
  const shellCls = isDebug
    ? 'realm-jump-console border-b border-void-600/50 bg-amber-950/15 p-3'
    : 'realm-jump-console border-b border-void-600/40 bg-void-900/50'

  return (
    <div className={shellCls}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="flex min-w-0 items-center gap-2">
          <Gamepad2 className={`h-3.5 w-3.5 shrink-0 ${isDebug ? 'text-amber-400' : 'text-jade-bright'}`} />
          <div className="min-w-0">
            <p className={`text-xs tracking-widest ${isDebug ? 'text-amber-400/90' : 'text-jade-bright/90'}`}>
              {isDebug ? '开发者调试台' : '环节试玩'}
            </p>
            <p className="truncate text-[10px] text-mist-faint">
              当前 Day {currentDay} · Step {currentStep}
              {!isDebug && ' · 点击展开跳转任意环节'}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-mist-faint transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {isDebug && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {onRestartProgress && (
                <button
                  type="button"
                  onClick={onRestartProgress}
                  className="rounded-full border border-void-600/70 px-2.5 py-1.5 text-[10px] text-mist-muted active:bg-void-700/50"
                >
                  清档重玩
                </button>
              )}
              {onEnterPlayerMode && (
                <button
                  type="button"
                  onClick={onEnterPlayerMode}
                  className="rounded-full border border-jade-muted/40 bg-jade-deep/30 px-3 py-1.5 text-[11px] font-medium text-jade-bright active:opacity-80"
                >
                  进入玩家模式
                </button>
              )}
            </div>
          )}

          <section className="rounded-lg border border-jade-muted/20 bg-jade-deep/10 px-3 py-2.5">
            <div className="mb-2 flex items-center gap-1.5 text-[10px] tracking-widest text-jade-bright/90">
              <FastForward className="h-3 w-3" />
              主线环节快跳
            </div>
            <p className="mb-2 text-[10px] leading-relaxed text-mist-faint">
              直接载入对应 Day 的主线舞台，无需从 Day 1 重走流程。
            </p>

            <div className="space-y-1.5">
              {groups.map((group) => {
                const dayExpanded = expandedDay === group.day
                return (
                  <div
                    key={group.day}
                    className="overflow-hidden rounded-lg border border-void-600/60 bg-void-900/40"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedDay((d) => (d === group.day ? null : group.day))}
                      className="flex w-full items-center justify-between px-2.5 py-2 text-left active:bg-void-800/50"
                    >
                      <div className="flex min-w-0 items-center gap-1.5">
                        {dayExpanded ? (
                          <ChevronDown className="h-3 w-3 shrink-0 text-mist-faint" />
                        ) : (
                          <ChevronRight className="h-3 w-3 shrink-0 text-mist-faint" />
                        )}
                        <span className="text-[11px] font-medium text-mist">
                          Day {group.day}
                          {currentDay === group.day && (
                            <span className="ml-1.5 text-[10px] text-jade-bright">· 当前</span>
                          )}
                        </span>
                      </div>
                      <span className="max-w-[42%] truncate text-[9px] text-mist-faint">
                        {group.dayTitle}
                      </span>
                    </button>

                    {dayExpanded && (
                      <div className="space-y-1 border-t border-void-600/50 p-1.5">
                        {group.mainQuests.map((quest) => {
                          const active =
                            currentDay === quest.day && currentStep === quest.stepId
                          const badge = TYPE_BADGE[quest.type] ?? quest.type
                          return (
                            <button
                              key={`${quest.day}-${quest.stepId}`}
                              type="button"
                              onClick={() => jumpTo(quest.day, quest.stepId)}
                              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left active:scale-[0.99] ${
                                active
                                  ? 'border border-jade-bright/40 bg-jade-deep/35'
                                  : 'border border-transparent bg-void-800/40 active:bg-void-700/50'
                              }`}
                            >
                              <span className="shrink-0 font-mono text-[9px] text-mist-faint">
                                {quest.stepId}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-[11px] text-mist">
                                {quest.title}
                              </span>
                              <span className="shrink-0 rounded px-1 py-0.5 text-[8px] text-mist-faint ring-1 ring-void-600/80">
                                {badge}
                              </span>
                            </button>
                          )
                        })}

                        {group.sideQuests.length > 0 && onOpenSideQuest && (
                          <div className="mt-1 border-t border-void-600/40 pt-1">
                            <p className="px-1 py-0.5 text-[9px] tracking-wider text-gold-muted/80">
                              支线
                            </p>
                            {group.sideQuests.map((sq) => (
                              <button
                                key={sq.questId}
                                type="button"
                                onClick={() => onOpenSideQuest(sq)}
                                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left active:bg-void-700/50"
                              >
                                <Map className="h-3 w-3 shrink-0 text-gold-muted/70" />
                                <span className="min-w-0 flex-1 truncate text-[10px] text-mist-muted">
                                  {sq.title}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          <section>
            <p className="mb-2 text-[10px] tracking-widest text-mist-faint">独立组件入口</p>
            {Object.entries(shortcutGroups).map(([group, items]) => (
              <div key={group} className="mb-3">
                <p className="mb-1.5 text-[9px] tracking-wider text-mist-faint/80">
                  {GROUP_LABELS[group] ?? group}
                </p>
                <div className="space-y-1">
                  {items.map((item) => (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => navigate(item.path)}
                      className="flex w-full items-center justify-between rounded-lg border border-void-600/70 bg-void-800/40 px-2.5 py-2 text-left text-[11px] text-mist-muted active:bg-void-700/50"
                    >
                      {item.label}
                      <ChevronRight className="h-3 w-3 text-mist-faint" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {!isDebug && onToggleDebugView && (
            <button
              type="button"
              onClick={onToggleDebugView}
              className="w-full rounded-lg border border-void-600/60 py-2 text-center text-[10px] text-mist-faint active:bg-void-800/50"
            >
              开启完整调试视图
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default QuestJumpPanel
