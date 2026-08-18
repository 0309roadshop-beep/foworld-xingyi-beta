import { motion } from 'framer-motion'
import {
  Compass,
  Droplets,
  MapPin,
  RefreshCw,
  User,
  Wrench,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CompassDial } from '../components/compass/CompassDial'
import { StoryQuestWindow } from '../components/compass/StoryQuestWindow'
import { SpiritAwakenModal } from '../components/spirit/SpiritAwakenModal'
import { MobileShell } from '../components/layout/MobileShell'
import { TaskMap } from '../components/map/TaskMap'
import { QuestJumpPanel } from '../components/compass/QuestJumpPanel'
import { SpiritCollectionIcon } from '../components/brand/SpiritCollectionIcon'
import { getActiveDayConfig } from '../config/dayConfigs'
import type { Day1SideQuest } from '../config/day1Types'
import { usePlayer } from '../context/PlayerContext'
import { useCompassHeading } from '../hooks/useCompassHeading'
import { useGeolocation } from '../hooks/useGeolocation'
import { MOCK_TASK, MOCK_TASKS } from '../mock/data'
import type { Task } from '../types'
import { useGameStore } from '../store/gameStore'
import { getBearing, getDistanceMeters } from '../utils/geo'

/** 罗盘主控 OS — 常驻外壳 + 剧情任务窗口 */
export default function CompassOS() {
  const navigate = useNavigate()
  const { player } = usePlayer()
  const {
    playerId,
    currentDay,
    currentStep,
    lingyuan,
    isDebugMode,
    toggleDebugMode,
    reset,
  } = useGameStore()

  const { coords, status, error, refresh } = useGeolocation()
  const { heading, supported, permissionNeeded, startListening } = useCompassHeading()
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [activeSideQuest, setActiveSideQuest] = useState<Day1SideQuest | null>(null)
  const [awakenSpiritName, setAwakenSpiritName] = useState<string | null>(null)
  const pendingStepRef = useRef<(() => void) | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const questPanelRef = useRef<HTMLElement>(null)

  /** 步骤/天数切换后锚定主线舞台，避免滚回页面顶部或高度塌陷跳顶 */
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const anchorStage = () => {
      const stage = document.getElementById('main-quest-stage')
      if (stage) {
        stage.scrollIntoView({ behavior: 'auto', block: 'nearest' })
        return
      }
      questPanelRef.current?.scrollIntoView({ behavior: 'auto', block: 'nearest' })
    }

    const raf = requestAnimationFrame(anchorStage)
    return () => cancelAnimationFrame(raf)
  }, [currentDay, currentStep])

  const handleSpiritAwaken = useCallback((spiritName: string, continueStep: () => void) => {
    pendingStepRef.current = continueStep
    setAwakenSpiritName(spiritName)
  }, [])

  const handleCollectSpirit = useCallback(() => {
    setAwakenSpiritName(null)
    const cont = pendingStepRef.current
    pendingStepRef.current = null
    cont?.()
  }, [])

  const activeDayConfig = getActiveDayConfig(currentDay)
  const formatCoord = (value: number) => value.toFixed(6)

  const availableTasks = useMemo(
    () => MOCK_TASKS.filter((t) => t.status !== 'locked'),
    [],
  )

  const nearestTask = useMemo(() => {
    if (!coords) return MOCK_TASK
    return availableTasks.reduce((nearest, task) =>
      getDistanceMeters(coords, task.coords) <
      getDistanceMeters(coords, nearest.coords)
        ? task
        : nearest,
    )
  }, [coords, availableTasks])

  const displayTask = selectedTask ?? nearestTask

  /** 优先用当前主线 LBS 坐标作为指针方位，否则回退最近任务 */
  const mainBearingTarget = useMemo(() => {
    const quests = activeDayConfig.mainQuests
    const current = quests[currentStep]
    if (current?.type === 'lbs' && 'coords' in current.content) {
      return {
        lat: current.content.coords.lat,
        lng: current.content.coords.lng,
      }
    }
    const firstLbs = quests.find((q) => q.type === 'lbs')
    if (firstLbs && 'coords' in firstLbs.content) {
      return {
        lat: firstLbs.content.coords.lat,
        lng: firstLbs.content.coords.lng,
      }
    }
    return displayTask.coords
      ? { lat: displayTask.coords.latitude, lng: displayTask.coords.longitude }
      : null
  }, [activeDayConfig, currentStep, displayTask.coords])

  const targetBearing = useMemo(() => {
    if (!coords || !mainBearingTarget) return 0
    return getBearing(coords, {
      latitude: mainBearingTarget.lat,
      longitude: mainBearingTarget.lng,
    })
  }, [coords, mainBearingTarget])

  const handleRestartProgress = () => {
    const ok = window.confirm(
      '确定清空七日进度，从 Day 1 重新开始？\n（灵韵、幻兽、支线记录与本地照片将一并清除）',
    )
    if (!ok) return
    reset({ keepDebugMode: isDebugMode })
  }

  return (
    <MobileShell className="compass-os-shell relative flex flex-col">
      {/* ── 【保留】顶部状态栏 ── */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="realm-status-bar relative z-10 flex shrink-0 items-center justify-between px-4 py-4"
      >
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 transition-opacity active:opacity-70"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-muted/30 bg-void-800/80">
            <User className="h-4 w-4 text-gold-muted" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-mist">
              {player.nickname || player.title}
            </p>
            <p className="font-mono text-[10px] text-mist-faint">
              ID {playerId}
              {coords && (
                <>
                  {' · '}
                  {formatCoord(coords.latitude)},{formatCoord(coords.longitude)}
                </>
              )}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          {isDebugMode && (
            <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-950/40 px-2.5 py-1">
              <Wrench className="h-3 w-3 text-amber-400" />
              <span className="text-[10px] text-amber-300">DEBUG</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => navigate('/collection')}
            className="collection-emblem-button flex h-10 w-10 items-center justify-center rounded-full"
            aria-label="百灵收藏"
          >
            <SpiritCollectionIcon className="h-7 w-7" />
          </button>
          <div className="flex items-center gap-1.5 rounded-full border border-spirit/30 bg-spirit-dim/30 px-2.5 py-1">
            <Droplets className="h-3.5 w-3.5 text-spirit" />
            <span className="text-xs font-medium text-spirit">{lingyuan}</span>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-gold-muted/20 bg-void-800/60 px-2 py-1">
            <span className="text-[10px] text-gold-muted">{player.spiritDrops}</span>
          </div>
        </div>
      </motion.header>

      {/* ── 可滚动主体：罗盘 / GPS / 地图 常驻；中央剧情任务窗口 ── */}
      <div
        ref={scrollContainerRef}
        className="scroll-root quest-flow-host relative z-10 flex-1 overflow-y-auto overscroll-none px-4 pb-4 scrollbar-none"
      >
        {/* 【保留】寻灵罗盘表盘 — compassHint 绑定当前天数配置 */}
        <motion.section
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="realm-compass-section mb-4"
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs tracking-widest text-gold-muted">
              <Compass className="h-3.5 w-3.5" />
              <span>寻灵罗盘 · Day {currentDay}</span>
            </div>
            {permissionNeeded && !supported && (
              <button
                type="button"
                onClick={() => startListening()}
                className="rounded-full border border-gold-muted/30 px-2.5 py-1 text-[10px] text-gold-muted"
              >
                启用方向传感
              </button>
            )}
          </div>
          <CompassDial
            heading={heading}
            targetBearing={targetBearing}
            compassHint={activeDayConfig.compassHint}
            headingActive={supported}
          />
        </motion.section>

        {/* 【保留】GPS 坐标面板 */}
        <motion.div className="realm-info-panel glass-panel mb-4 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-gold-muted">
              <MapPin className="h-3.5 w-3.5" />
              <span>当前坐标</span>
            </div>
            <button type="button" onClick={refresh} className="text-[11px] text-mist-muted">
              <RefreshCw
                className={`inline h-3 w-3 ${status === 'loading' ? 'animate-spin' : ''}`}
              />{' '}
              刷新
            </button>
          </div>
          {coords && (
            <div className="font-mono text-xs text-mist-muted">
              <p>纬度 {formatCoord(coords.latitude)}</p>
              <p>经度 {formatCoord(coords.longitude)}</p>
            </div>
          )}
          {status === 'error' && (
            <p className="mt-1 text-[11px] text-bronze-300">Mock · {error}</p>
          )}
        </motion.div>

        {/* 【保留】任务地图 */}
        {coords && (
          <section className="realm-map-frame mb-4">
            <TaskMap
              playerCoords={coords}
              tasks={MOCK_TASKS}
              selectedTaskId={selectedTask?.id}
              onSelectTask={setSelectedTask}
            />
          </section>
        )}

        {/* ── 中央剧情任务窗口 ── */}
        <section
          ref={questPanelRef}
          className="realm-quest-window glass-panel relative mb-4 overflow-hidden"
        >
          <QuestJumpPanel
            variant={isDebugMode ? 'debug' : 'player'}
            onRestartProgress={handleRestartProgress}
            onEnterPlayerMode={isDebugMode ? toggleDebugMode : undefined}
            onToggleDebugView={!isDebugMode ? toggleDebugMode : undefined}
            onOpenSideQuest={setActiveSideQuest}
          />

          <div className="relative">
            {isDebugMode && (
              <div className="border-b border-jade-muted/15 bg-jade-deep/10 px-3 py-1.5">
                <p className="text-[10px] tracking-widest text-jade-bright/80">
                  剧情任务窗口 · 与玩家模式同步
                </p>
              </div>
            )}
            <StoryQuestWindow
              activeSideQuest={activeSideQuest}
              onOpenSideQuest={setActiveSideQuest}
              onCloseSideQuest={() => setActiveSideQuest(null)}
              onSpiritAwaken={handleSpiritAwaken}
            />
          </div>
        </section>
      </div>

      <SpiritAwakenModal spiritName={awakenSpiritName} onCollect={handleCollectSpirit} />
    </MobileShell>
  )
}
