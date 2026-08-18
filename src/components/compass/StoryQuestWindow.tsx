import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ChevronRight, RotateCcw, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { REGISTERED_DAYS, getDayConfig } from '../../config/dayConfigs'
import type { Day1MainQuest, Day1SideQuest, Day1StoryContent } from '../../config/day1Types'
import { useGameStore } from '../../store/gameStore'
import { useDailyTransition, dailyTransitionStore } from '../../store/DailyTransitionManager'
import { DayTransitionScreen } from '../transition/DayTransitionScreen'
import { MainQuestStage } from './MainQuestStage'
import { MainQuestDormantPanel } from './MainQuestDormantPanel'
import { DayEndingCTA } from './DayEndingCTA'
import { SideQuestOverlay } from './SideQuestOverlay'
import {
  areSideQuestsComplete,
  isMainCompleteForDay,
} from '../../utils/questProgress'

function isStoryContent(content: Day1MainQuest['content']): content is Day1StoryContent {
  return 'dialogues' in content && Array.isArray(content.dialogues)
}

function getCompletedMainQuests(day: number, currentDay: number, currentStep: number): Day1MainQuest[] {
  const config = getDayConfig(day)
  if (!config) return []
  if (day < currentDay) return [...config.mainQuests]
  if (day > currentDay) return []
  return config.mainQuests.slice(0, currentStep)
}

interface DayAccordionPanelProps {
  day: number
  isActive: boolean
  isExpanded: boolean
  onToggle: () => void
  currentDay: number
  currentStep: number
  completedSideQuests: string[]
  activeSideQuestId: string | null
  onOpenSideQuest: (quest: Day1SideQuest) => void
  onSpiritAwaken?: (spiritName: string, continueStep: () => void) => void
  awaitingDayBegin: boolean
  onBeginDay: () => void
  isMainQuestDormant: boolean
  canEndToday: boolean
  onEndDay: () => void
  onBypassTimeLock?: () => void
}

function DayAccordionPanel({
  day,
  isActive,
  isExpanded,
  onToggle,
  currentDay,
  currentStep,
  completedSideQuests,
  activeSideQuestId,
  onOpenSideQuest,
  onSpiritAwaken,
  awaitingDayBegin,
  onBeginDay,
  isMainQuestDormant,
  canEndToday,
  onEndDay,
  onBypassTimeLock,
}: DayAccordionPanelProps) {
  const config = getDayConfig(day)
  const [sideOpen, setSideOpen] = useState(false)

  const mainQuestCount = config?.mainQuests.length ?? 0
  const sideQuestCount = config?.sideQuests.length ?? 0
  const isMainComplete = config
    ? isMainCompleteForDay(day, currentDay, currentStep, mainQuestCount)
    : false
  const isSideComplete = config
    ? areSideQuestsComplete(config.sideQuests, completedSideQuests)
    : true
  const isDayFullyComplete = isMainComplete && isSideComplete
  const canAccessSideQuests = day <= currentDay && sideQuestCount > 0

  useEffect(() => {
    if (isActive && isMainComplete && !isSideComplete && sideQuestCount > 0) {
      setSideOpen(true)
    }
  }, [isActive, isMainComplete, isSideComplete, sideQuestCount])

  if (!config) return null

  const completedQuests = getCompletedMainQuests(day, currentDay, currentStep)
  const isPastDay = day < currentDay
  const isFutureDay = day > currentDay
  const showHistoryHint = isPastDay && !isExpanded

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-void-800/30 ${
        isActive ? 'border-jade-muted/30' : 'border-void-600/70'
      } ${isFutureDay ? 'opacity-50' : ''}`}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={isFutureDay || isActive}
        className={`flex w-full flex-col items-stretch gap-0.5 px-3 py-2.5 text-left ${
          isFutureDay || isActive ? 'cursor-default' : 'active:bg-void-700/40'
        }`}
      >
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gold-muted" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-mist-faint" />
            )}
            <span className="text-xs font-medium text-mist">
              Day {day}
              {isActive && !isDayFullyComplete && (
                <span className="ml-1.5 text-[10px] text-jade-bright">· 进行中</span>
              )}
              {isActive && isMainComplete && !isSideComplete && (
                <span className="ml-1.5 text-[10px] text-gold-muted">· 主线完成</span>
              )}
              {!isActive && isMainComplete && !isSideComplete && (
                <span className="ml-1.5 text-[10px] text-amber-300/80">· 支线待完成</span>
              )}
              {isDayFullyComplete && (
                <span className="ml-1.5 text-[10px] text-spirit">· 已通关</span>
              )}
            </span>
          </div>
          {!showHistoryHint && (
            <span className="max-w-[120px] shrink-0 truncate text-[10px] text-mist-faint">
              {config.dayTitle}
            </span>
          )}
        </div>
        {showHistoryHint && (
          <p className="pl-6 text-[10px] text-mist-faint">点击展开重温或继续支线</p>
        )}
        {isFutureDay && (
          <p className="pl-6 text-[10px] text-mist-faint">尚未解锁</p>
        )}
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="border-t border-void-600/50 px-3 pb-3 pt-2">
              {/* 历史溯源：已完成主线标题 + 剧情对白 */}
              {completedQuests.length > 0 && (
                <section className="mb-3">
                  <p className="mb-2 text-[10px] tracking-widest text-gold-muted/80">历史回溯</p>
                  <div className="space-y-2">
                    {completedQuests.map((quest) => (
                      <div
                        key={quest.stepId}
                        className="rounded-lg border border-void-600/60 bg-void-900/50 px-2.5 py-2"
                      >
                        <p className="text-[11px] font-medium text-mist">{quest.title}</p>
                        {quest.type === 'story' && isStoryContent(quest.content) && (
                          <div className="mt-1.5 space-y-1">
                            {quest.content.dialogues.map((d, i) => (
                              <div key={i} className="text-[10px] leading-relaxed text-mist-muted">
                                <span className="text-gold-muted/80">{d.speaker}：</span>
                                {d.text}
                              </div>
                            ))}
                          </div>
                        )}
                        {quest.type !== 'story' && (
                          <p className="mt-0.5 text-[10px] text-mist-faint">主线任务已完成</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 当前活跃天：主线舞台 + 支线下拉（独立判定） */}
              {isActive && (
                <>
                  <section
                    id="main-quest-stage"
                    className="realm-stage-frame quest-stage-shell relative mb-3 overflow-hidden rounded-lg border border-jade-muted/20 bg-void-900/60"
                    data-scroll-lock
                  >
                    <div className="realm-stage-header border-b border-void-600/40 px-2.5 py-1.5">
                      <p className="text-[10px] tracking-widest text-jade-bright/80">主线舞台</p>
                      {!isMainComplete && (
                        <p className="text-[10px] text-mist-faint">
                          STEP {Math.min(currentStep + 1, mainQuestCount || 1)}/{mainQuestCount || '—'}
                        </p>
                      )}
                    </div>
                    <div className="quest-stage-body relative min-h-[200px]">
                      {isDayFullyComplete ? (
                        <div className="flex min-h-[200px] flex-col items-center justify-center px-4 py-8 text-center">
                          <p className="mb-2 text-xs tracking-[0.35em] text-spirit">DAY {day} · 圆满</p>
                          <p className="text-sm leading-relaxed text-mist">
                            今日所有任务已全部完成
                          </p>
                        </div>
                      ) : isMainQuestDormant ? (
                        <MainQuestDormantPanel day={day} onBypassTimeLock={onBypassTimeLock} />
                      ) : canEndToday ? (
                        <DayEndingCTA day={day} onEndDay={onEndDay} />
                      ) : awaitingDayBegin ? (
                        <div className="flex min-h-[200px] flex-col items-center justify-center px-4 py-8 text-center">
                          <p className="mb-2 text-xs tracking-[0.35em] text-sky-bright/90">
                            DAY {day} · 待启程
                          </p>
                          <p className="mb-5 text-sm leading-relaxed text-mist">
                            昨日试炼已圆满收束。休整完毕后，随时可开启今日主线。
                          </p>
                          <button
                            type="button"
                            onClick={onBeginDay}
                            className="rounded-xl border border-jade-muted/40 bg-jade-dim/20 px-6 py-3 text-sm font-medium text-jade-bright active:bg-jade-dim/35"
                          >
                            开始今日行程
                          </button>
                        </div>
                      ) : (
                        !activeSideQuestId && (
                          <MainQuestStage
                            dayConfig={config}
                            onSpiritAwaken={onSpiritAwaken}
                            onRequestDaySeal={onEndDay}
                          />
                        )
                      )}
                    </div>
                  </section>

                  {canAccessSideQuests && (
                    <section className="overflow-hidden rounded-lg border border-void-600/60 bg-void-900/40">
                      <button
                        type="button"
                        onClick={() => setSideOpen((v) => !v)}
                        className="flex w-full items-center justify-between px-2.5 py-2 text-left active:bg-void-800/60"
                      >
                        <span className="text-[10px] tracking-widest text-gold-muted">
                          当日支线任务
                        </span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 text-mist-faint transition-transform ${sideOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {sideOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-void-600/40"
                          >
                            <div className="space-y-1.5 p-2">
                              {config.sideQuests.map((quest) => {
                                const done = completedSideQuests.includes(quest.questId)
                                return (
                                  <button
                                    key={quest.questId}
                                    type="button"
                                    onClick={() => onOpenSideQuest(quest)}
                                    className="flex w-full items-start justify-between gap-2 rounded-lg border border-void-600/70 bg-void-800/50 px-2.5 py-2 text-left active:bg-void-700/50"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[11px] font-medium text-mist">{quest.title}</p>
                                      <p className="mt-0.5 text-[10px] leading-snug text-mist-faint">
                                        {quest.description}
                                      </p>
                                    </div>
                                    {done ? (
                                      <span className="shrink-0 rounded-full border border-spirit/30 bg-spirit-dim/20 px-1.5 py-0.5 text-[9px] text-spirit">
                                        已完成
                                      </span>
                                    ) : (
                                      <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mist-faint" />
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </section>
                  )}
                </>
              )}

              {/* 历史天：主线已完成，仍可补做遗留支线 */}
              {!isActive && day < currentDay && canAccessSideQuests && (
                <section className="overflow-hidden rounded-lg border border-void-600/60 bg-void-900/40">
                  <button
                    type="button"
                    onClick={() => setSideOpen((v) => !v)}
                    className="flex w-full items-center justify-between px-2.5 py-2 text-left active:bg-void-800/60"
                  >
                    <span className="text-[10px] tracking-widest text-gold-muted">
                      遗留支线任务
                      {!isSideComplete && (
                        <span className="ml-1.5 text-amber-300/90">· 待完成</span>
                      )}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-mist-faint transition-transform ${sideOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {sideOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-void-600/40"
                      >
                        <div className="space-y-1.5 p-2">
                          {config.sideQuests.map((quest) => {
                            const done = completedSideQuests.includes(quest.questId)
                            return (
                              <button
                                key={quest.questId}
                                type="button"
                                onClick={() => onOpenSideQuest(quest)}
                                className="flex w-full items-start justify-between gap-2 rounded-lg border border-void-600/70 bg-void-800/50 px-2.5 py-2 text-left active:bg-void-700/50"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-[11px] font-medium text-mist">{quest.title}</p>
                                  <p className="mt-0.5 text-[10px] leading-snug text-mist-faint">
                                    {quest.description}
                                  </p>
                                </div>
                                {done ? (
                                  <span className="shrink-0 rounded-full border border-spirit/30 bg-spirit-dim/20 px-1.5 py-0.5 text-[9px] text-spirit">
                                    已完成
                                  </span>
                                ) : (
                                  <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mist-faint" />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface StoryQuestWindowProps {
  activeSideQuest: Day1SideQuest | null
  onOpenSideQuest: (quest: Day1SideQuest) => void
  onCloseSideQuest: () => void
  onSpiritAwaken?: (spiritName: string, continueStep: () => void) => void
}

/**
 * 剧情任务窗口 — 按 Day 手风琴 + 活跃天主舞台 + 支线下拉
 */
export function StoryQuestWindow({
  activeSideQuest,
  onOpenSideQuest,
  onCloseSideQuest,
  onSpiritAwaken,
}: StoryQuestWindowProps) {
  const {
    currentDay,
    currentStep,
    completedSideQuests,
    awaitingDayBegin,
    beginCurrentDay,
    lingyuan,
    collectedSpirits,
    collectedAffinities,
    affinityByDay,
    reset,
  } = useGameStore()
  const {
    phase: transitionPhase,
    completedDay: sealedDay,
    pendingNextDay,
    isMainQuestDormant,
    beginDaySeal,
    finishSealing,
    triggerBoot,
    finishBoot,
    bypassTimeLock,
    reset: resetTransition,
  } = useDailyTransition()
  /** 当前展开的面板 — 默认且跨天后仅展开 activeDay */
  const [expandedDay, setExpandedDay] = useState(currentDay)

  const maxDay = REGISTERED_DAYS[REGISTERED_DAYS.length - 1] ?? 7
  const lastDayConfig = getDayConfig(maxDay)
  const activeDayConfig = getDayConfig(currentDay)
  const isActiveMainComplete =
    activeDayConfig != null &&
    isMainCompleteForDay(
      currentDay,
      currentDay,
      currentStep,
      activeDayConfig.mainQuests.length,
    )
  const canEndToday =
    isActiveMainComplete &&
    sealedDay !== currentDay &&
    transitionPhase === 'idle'
  const isJourneyComplete =
    currentDay > maxDay ||
    (currentDay === maxDay &&
      lastDayConfig != null &&
      isMainCompleteForDay(
        maxDay,
        currentDay,
        currentStep,
        lastDayConfig.mainQuests.length,
      ))

  const handleEndDay = useCallback(() => {
    if (transitionPhase !== 'idle') return
    beginDaySeal(currentDay)
  }, [beginDaySeal, currentDay, transitionPhase])

  /** 主线休眠倒计时归零 → 播放次日开机动画 */
  useEffect(() => {
    if (!isMainQuestDormant) return

    const tick = window.setInterval(() => {
      if (!dailyTransitionStore.isTimeLockActive()) {
        triggerBoot()
      }
    }, 1000)

    return () => window.clearInterval(tick)
  }, [isMainQuestDormant, triggerBoot])

  const sealingStats =
    transitionPhase === 'sealing' && sealedDay != null
      ? {
          day: sealedDay,
          lingyuan,
          spiritsCount: collectedSpirits.length,
          affinitiesTodayCount: (affinityByDay[sealedDay] ?? []).length,
          affinitiesTotalCount: collectedAffinities.length,
        }
      : null

  const handleRestart = useCallback(() => {
    const ok = window.confirm(
      '确定清空七日进度，从 Day 1 重新开始？\n（灵韵、幻兽、支线记录与本地照片将一并清除）',
    )
    if (!ok) return
    reset({ keepDebugMode: false })
    resetTransition()
    setExpandedDay(1)
  }, [reset, resetTransition])

  /** 跨天流转：折叠昨日，自动展开今日（唯一展开项） */
  useEffect(() => {
    setExpandedDay(currentDay)
  }, [currentDay])

  const toggleDay = useCallback(
    (day: number) => {
      if (day > currentDay) return
      if (day === currentDay) return
      setExpandedDay((prev) => (prev === day ? currentDay : day))
    },
    [currentDay],
  )

  return (
    <div className="relative p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-gold-muted" />
          <h2 className="text-xs tracking-widest text-gold-muted">剧情任务窗口</h2>
        </div>
        <button
          type="button"
          onClick={handleRestart}
          className="flex shrink-0 items-center gap-1 rounded-full border border-void-600/70 px-2 py-1 text-[10px] text-mist-muted active:bg-void-700/50"
        >
          <RotateCcw className="h-3 w-3" />
          重新开始
        </button>
      </div>

      {isJourneyComplete && (
        <div className="mb-3 rounded-xl border border-spirit/25 bg-spirit-dim/15 px-3 py-2.5 text-center">
          <p className="text-xs text-spirit">七日旅程已圆满</p>
          <p className="mt-1 text-[10px] text-mist-faint">点击右上角「重新开始」可再次体验</p>
        </div>
      )}

      <div className="space-y-2">
        {REGISTERED_DAYS.map((day) => (
          <DayAccordionPanel
            key={day}
            day={day}
            isActive={day === currentDay}
            isExpanded={expandedDay === day}
            onToggle={() => toggleDay(day)}
            currentDay={currentDay}
            currentStep={currentStep}
            completedSideQuests={completedSideQuests}
            activeSideQuestId={activeSideQuest?.questId ?? null}
            onOpenSideQuest={onOpenSideQuest}
            onSpiritAwaken={onSpiritAwaken}
            awaitingDayBegin={awaitingDayBegin}
            onBeginDay={beginCurrentDay}
            isMainQuestDormant={isMainQuestDormant}
            canEndToday={canEndToday}
            onEndDay={handleEndDay}
            onBypassTimeLock={bypassTimeLock}
          />
        ))}
      </div>

      {/* 支线浮层 — 条件挂载，关闭即销毁 */}
      {activeSideQuest && (
        <SideQuestOverlay
          key={activeSideQuest.questId}
          quest={activeSideQuest}
          onClose={onCloseSideQuest}
        />
      )}

      <DayTransitionScreen
        phase={transitionPhase}
        completedDay={sealedDay}
        pendingNextDay={pendingNextDay}
        sealingStats={sealingStats}
        onSealingComplete={finishSealing}
        onBootComplete={finishBoot}
        onBypassTimeLock={bypassTimeLock}
      />
    </div>
  )
}

export default StoryQuestWindow
