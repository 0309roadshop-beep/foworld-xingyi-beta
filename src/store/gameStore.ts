import { useSyncExternalStore } from 'react'
import { REGISTERED_DAYS, getDayConfig } from '../config/dayConfigs'
import { RETIRED_SPIRIT_NAMES } from '../config/spiritCatalog'
import { clearScrollProgressAssets } from '../config/scrollDataHelper'
import { isMainCompleteForDay } from '../utils/questProgress'
import { isDailyTimeLockBlockingAdvance } from './DailyTransitionManager'

/** localStorage 键名 */
const STORAGE_KEY = 'foworld-game-store'

export interface GameState {
  playerId: string
  currentDay: number
  currentStep: number
  lingyuan: number
  collectedSpirits: string[]
  /** 已完成的支线 questId 列表 */
  completedSideQuests: string[]
  /** 已获得的元素属性（如御水亲和） */
  collectedAffinities: string[]
  /** 各日获得的元素印记（day → 亲和名列表，用于日结「本日新增」统计） */
  affinityByDay: Record<number, string[]>
  /** 已收录的跨步骤线索 id（如星轨拓片） */
  collectedClues: string[]
  /** 上帝调试模式：true 显示全量任务列表，false 进入沉浸式单线舞台 */
  isDebugMode: boolean
  /** 新一天已解锁但玩家尚未点击「开始今日行程」 */
  awaitingDayBegin: boolean
}

const DEFAULT_STATE: GameState = {
  playerId: '001',
  currentDay: 1,
  currentStep: 0,
  lingyuan: 0,
  collectedSpirits: [],
  completedSideQuests: [],
  collectedAffinities: [],
  affinityByDay: {},
  collectedClues: [],
  isDebugMode: false,
  awaitingDayBegin: false,
}

type Listener = () => void

/** 主线已通关但 currentDay 未推进时，自动解锁下一天（修复卡档） */
function advanceCompletedDays(state: GameState): GameState {
  const maxDay = REGISTERED_DAYS[REGISTERED_DAYS.length - 1] ?? 7
  let { currentDay, currentStep } = state

  while (currentDay < maxDay) {
    const config = getDayConfig(currentDay)
    if (!config || config.mainQuests.length === 0) break
    if (
      !isMainCompleteForDay(currentDay, currentDay, currentStep, config.mainQuests.length)
    ) {
      break
    }
    currentDay += 1
    currentStep = 0
  }

  if (currentDay === state.currentDay && currentStep === state.currentStep) {
    return state
  }
  return { ...state, currentDay, currentStep }
}

function loadPersistedState(): GameState {
  if (typeof window === 'undefined') return { ...DEFAULT_STATE }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_STATE }
    const parsed = JSON.parse(raw) as Partial<GameState>
    const merged: GameState = {
      playerId: typeof parsed.playerId === 'string' ? parsed.playerId : DEFAULT_STATE.playerId,
      currentDay: typeof parsed.currentDay === 'number' ? parsed.currentDay : DEFAULT_STATE.currentDay,
      currentStep: typeof parsed.currentStep === 'number' ? parsed.currentStep : DEFAULT_STATE.currentStep,
      lingyuan: typeof parsed.lingyuan === 'number' ? parsed.lingyuan : DEFAULT_STATE.lingyuan,
      collectedSpirits: Array.isArray(parsed.collectedSpirits)
        ? parsed.collectedSpirits.filter(
            (s): s is string =>
              typeof s === 'string' &&
              !RETIRED_SPIRIT_NAMES.includes(s as (typeof RETIRED_SPIRIT_NAMES)[number]),
          )
        : [...DEFAULT_STATE.collectedSpirits],
      completedSideQuests: Array.isArray(parsed.completedSideQuests)
        ? parsed.completedSideQuests.filter((s): s is string => typeof s === 'string')
        : [...DEFAULT_STATE.completedSideQuests],
      collectedAffinities: Array.isArray(parsed.collectedAffinities)
        ? parsed.collectedAffinities.filter((s): s is string => typeof s === 'string')
        : [...DEFAULT_STATE.collectedAffinities],
      affinityByDay:
        parsed.affinityByDay && typeof parsed.affinityByDay === 'object'
          ? Object.fromEntries(
              Object.entries(parsed.affinityByDay).map(([day, list]) => [
                Number(day),
                Array.isArray(list) ? list.filter((s): s is string => typeof s === 'string') : [],
              ]),
            )
          : { ...DEFAULT_STATE.affinityByDay },
      collectedClues: Array.isArray(parsed.collectedClues)
        ? parsed.collectedClues.filter((s): s is string => typeof s === 'string')
        : [...DEFAULT_STATE.collectedClues],
      isDebugMode:
        typeof parsed.isDebugMode === 'boolean' ? parsed.isDebugMode : DEFAULT_STATE.isDebugMode,
      awaitingDayBegin:
        typeof parsed.awaitingDayBegin === 'boolean'
          ? parsed.awaitingDayBegin
          : DEFAULT_STATE.awaitingDayBegin,
    }
    if (isDailyTimeLockBlockingAdvance()) {
      return merged
    }
    return advanceCompletedDays(merged)
  } catch {
    return { ...DEFAULT_STATE }
  }
}

function persistState(state: GameState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* 存储满或隐私模式时静默失败 */
  }
}

/** 模块级单例 store（Pinia 等价物） */
function createGameStore() {
  let state: GameState = loadPersistedState()
  const listeners = new Set<Listener>()

  const notify = () => {
    listeners.forEach((fn) => fn())
  }

  const commit = (updater: (prev: GameState) => GameState) => {
    state = updater(state)
    persistState(state)
    notify()
  }

  return {
    getState: () => state,

    subscribe: (listener: Listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    /** 当天任务步骤 +1 */
    nextStep() {
      commit((prev) => ({
        ...prev,
        currentStep: prev.currentStep + 1,
      }))
    },

    /** 调试 / 快跳：设置当前天数与步骤 */
    setProgress(day: number, step: number) {
      const safeDay = Math.max(1, Math.floor(day))
      const safeStep = Math.max(0, Math.floor(step))
      commit((prev) => ({
        ...prev,
        currentDay: safeDay,
        currentStep: safeStep,
      }))
    },

    /** 增加灵源滴 */
    addLingyuan(amount: number) {
      if (!Number.isFinite(amount) || amount <= 0) return
      commit((prev) => ({
        ...prev,
        lingyuan: prev.lingyuan + amount,
      }))
    },

    /** 消耗灵源滴；余额不足时返回 false */
    spendLingyuan(amount: number): boolean {
      if (!Number.isFinite(amount) || amount <= 0) return false
      let ok = false
      commit((prev) => {
        if (prev.lingyuan < amount) return prev
        ok = true
        return {
          ...prev,
          lingyuan: prev.lingyuan - amount,
        }
      })
      return ok
    },

    /** 收录线索（去重，持久化至 localStorage） */
    unlockClue(clueId: string) {
      const id = clueId.trim()
      if (!id) return
      commit((prev) => {
        if (prev.collectedClues.includes(id)) return prev
        return {
          ...prev,
          collectedClues: [...prev.collectedClues, id],
        }
      })
    },

    /** 获得元素属性（去重），并记录获得当日 */
    unlockAffinity(affinityName: string) {
      const name = affinityName.trim()
      if (!name) return
      commit((prev) => {
        if (prev.collectedAffinities.includes(name)) return prev
        const day = prev.currentDay
        const dayList = prev.affinityByDay[day] ?? []
        return {
          ...prev,
          collectedAffinities: [...prev.collectedAffinities, name],
          affinityByDay: {
            ...prev.affinityByDay,
            [day]: [...dayList, name],
          },
        }
      })
    },

    /** 解锁精灵（去重） */
    unlockSpirit(spiritName: string) {
      const name = spiritName.trim()
      if (!name) return
      if (RETIRED_SPIRIT_NAMES.includes(name as (typeof RETIRED_SPIRIT_NAMES)[number])) return
      commit((prev) => {
        if (prev.collectedSpirits.includes(name)) return prev
        return {
          ...prev,
          collectedSpirits: [...prev.collectedSpirits, name],
        }
      })
    },

    /** 进入下一天并重置步骤（扩展用） */
    nextDay(options?: { awaitingBegin?: boolean }) {
      commit((prev) => ({
        ...prev,
        currentDay: prev.currentDay + 1,
        currentStep: 0,
        awaitingDayBegin: options?.awaitingBegin ?? false,
      }))
    },

    /** 玩家确认开始新一天主线 */
    beginCurrentDay() {
      commit((prev) => {
        if (!prev.awaitingDayBegin) return prev
        return { ...prev, awaitingDayBegin: false }
      })
    },

    /** 标记支线任务完成（去重） */
    completeSideQuest(questId: string) {
      const id = questId.trim()
      if (!id) return
      commit((prev) => {
        if (prev.completedSideQuests.includes(id)) return prev
        return {
          ...prev,
          completedSideQuests: [...prev.completedSideQuests, id],
        }
      })
    },

    /** 切换上帝调试 / 沉浸式单线模式 */
    toggleDebugMode() {
      commit((prev) => ({
        ...prev,
        isDebugMode: !prev.isDebugMode,
      }))
    },

    /** 重置进度（调试 / 清档）；默认保留当前 debug / 玩家模式 */
    reset(options?: { keepDebugMode?: boolean }) {
      const keepDebugMode = options?.keepDebugMode ?? state.isDebugMode
      clearScrollProgressAssets()
      state = { ...DEFAULT_STATE, isDebugMode: keepDebugMode }
      persistState(state)
      notify()
    },

    /** 从磁盘重新加载 */
    hydrate() {
      state = loadPersistedState()
      persistState(state)
      notify()
    },
  }
}

export const gameStore = createGameStore()

/**
 * 全局游戏进度 Hook — API 对齐 Pinia `useGameStore`。
 *
 * @example
 * const { lingyuan, addLingyuan, nextStep } = useGameStore()
 */
export function useGameStore() {
  const snapshot = useSyncExternalStore(
    gameStore.subscribe,
    gameStore.getState,
    gameStore.getState,
  )

  return {
    ...snapshot,
    nextStep: gameStore.nextStep,
    setProgress: gameStore.setProgress,
    addLingyuan: gameStore.addLingyuan,
    spendLingyuan: gameStore.spendLingyuan,
    unlockSpirit: gameStore.unlockSpirit,
    unlockAffinity: gameStore.unlockAffinity,
    unlockClue: gameStore.unlockClue,
    nextDay: gameStore.nextDay,
    beginCurrentDay: gameStore.beginCurrentDay,
    completeSideQuest: gameStore.completeSideQuest,
    toggleDebugMode: gameStore.toggleDebugMode,
    reset: gameStore.reset,
    hydrate: gameStore.hydrate,
  }
}

export default useGameStore
