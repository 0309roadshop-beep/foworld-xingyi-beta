import { useSyncExternalStore } from 'react'
import { REGISTERED_DAYS } from '../config/dayConfigs'

const STORAGE_KEY = 'foworld-daily-transition'
const GAME_STORAGE_KEY = 'foworld-game-store'

/** 过渡阶段（cooldown 已废弃，休眠态由 idle + 时间锁表达） */
export type TransitionPhase = 'idle' | 'sealing' | 'boot'

export interface DailyTransitionState {
  /** 最近完成并触发休眠的 Day */
  completedDay: number | null
  /** 完成当日主线的时间戳（ms） */
  lastCompletionTimestamp: number | null
  /** 当前 UI 阶段 */
  phase: TransitionPhase
  /** 开发者后门：模拟已跨越自然日 */
  timeLockBypassed: boolean
}

const DEFAULT_STATE: DailyTransitionState = {
  completedDay: null,
  lastCompletionTimestamp: null,
  phase: 'idle',
  timeLockBypassed: false,
}

type Listener = () => void

/**
 * Daily Reset：寻找 lastTimestamp 之后紧接着的下一个 05:00
 * - 05:00（含）之后完成 → 次日 05:00
 * - 00:00–04:59 完成 → 当日 05:00
 */
export function getUnlockTime(lastTimestamp: number): number {
  const date = new Date(lastTimestamp)

  if (date.getHours() >= 5) {
    date.setDate(date.getDate() + 1)
  }

  date.setHours(5, 0, 0, 0)

  return date.getTime()
}

/** 是否仍处于跨日休眠锁定期 */
export function isTimeLockActive(state: DailyTransitionState, now = Date.now()): boolean {
  if (state.timeLockBypassed) return false
  if (state.lastCompletionTimestamp == null) return false
  return now < getUnlockTime(state.lastCompletionTimestamp)
}

/** 主线追踪是否处于休眠（软锁：仅锁主线，不阻塞 OS） */
export function isMainQuestDormant(state: DailyTransitionState, now = Date.now()): boolean {
  if (state.completedDay == null) return false
  if (state.phase === 'sealing' || state.phase === 'boot') return false
  return isTimeLockActive(state, now)
}

/** 剩余锁定毫秒数 */
export function getRemainingLockMs(state: DailyTransitionState, now = Date.now()): number {
  if (!isTimeLockActive(state, now) || state.lastCompletionTimestamp == null) return 0
  return Math.max(0, getUnlockTime(state.lastCompletionTimestamp) - now)
}

export function formatCountdownHms(ms: number): string {
  const totalSec = Math.ceil(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

function loadPersistedState(): DailyTransitionState {
  if (typeof window === 'undefined') return { ...DEFAULT_STATE }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_STATE }
    const parsed = JSON.parse(raw) as Partial<DailyTransitionState>
    const merged: DailyTransitionState = {
      completedDay:
        typeof parsed.completedDay === 'number' ? parsed.completedDay : DEFAULT_STATE.completedDay,
      lastCompletionTimestamp:
        typeof parsed.lastCompletionTimestamp === 'number'
          ? parsed.lastCompletionTimestamp
          : DEFAULT_STATE.lastCompletionTimestamp,
      phase:
        parsed.phase === 'sealing' || parsed.phase === 'boot' || parsed.phase === 'idle'
          ? parsed.phase
          : parsed.phase === 'cooldown'
            ? 'idle'
            : DEFAULT_STATE.phase,
      timeLockBypassed:
        typeof parsed.timeLockBypassed === 'boolean'
          ? parsed.timeLockBypassed
          : DEFAULT_STATE.timeLockBypassed,
    }
    return reconcilePhase(merged)
  } catch {
    return { ...DEFAULT_STATE }
  }
}

function readPersistedCurrentDay(): number {
  if (typeof window === 'undefined') return 1
  try {
    const raw = localStorage.getItem(GAME_STORAGE_KEY)
    if (!raw) return 1
    const parsed = JSON.parse(raw) as { currentDay?: number }
    return typeof parsed.currentDay === 'number' ? parsed.currentDay : 1
  } catch {
    return 1
  }
}

/** 冷启动时根据真实时间校准阶段 */
function reconcilePhase(state: DailyTransitionState): DailyTransitionState {
  if (state.completedDay == null || state.lastCompletionTimestamp == null) {
    return { ...DEFAULT_STATE }
  }

  if (isTimeLockActive(state)) {
    if (state.phase === 'sealing' || state.phase === 'boot') return state
    return { ...state, phase: 'idle' }
  }

  if (state.phase === 'idle') {
    const currentDay = readPersistedCurrentDay()
    if (currentDay <= state.completedDay) {
      return { ...state, phase: 'boot' }
    }
  }

  if (state.phase === 'sealing') {
    return { ...state, phase: 'boot' }
  }

  return state
}

function persistState(state: DailyTransitionState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* 静默失败 */
  }
}

function createDailyTransitionStore() {
  let state: DailyTransitionState = loadPersistedState()
  const listeners = new Set<Listener>()

  const notify = () => {
    listeners.forEach((fn) => fn())
  }

  const commit = (updater: (prev: DailyTransitionState) => DailyTransitionState) => {
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

    /** 某日主线全部完成 — 进入日结封装，不直接跳天 */
    beginDaySeal(completedDay: number) {
      commit((prev) => {
        if (prev.completedDay === completedDay && prev.phase !== 'idle') return prev
        return {
          completedDay,
          lastCompletionTimestamp: Date.now(),
          phase: 'sealing',
          timeLockBypassed: false,
        }
      })
    },

    /** 日结动画结束 → 退回 OS 自由探索，主线进入休眠（软锁） */
    finishSealing() {
      commit((prev) => {
        if (prev.phase !== 'sealing') return prev
        const maxDay = REGISTERED_DAYS[REGISTERED_DAYS.length - 1] ?? 7
        if (prev.completedDay != null && prev.completedDay >= maxDay) {
          return { ...DEFAULT_STATE }
        }
        if (prev.timeLockBypassed) return { ...prev, phase: 'boot' }
        return { ...prev, phase: 'idle' }
      })
    },

    /** 锁定倒计时归零或跨日检测 → 开机动画 */
    triggerBoot() {
      commit((prev) => {
        if (prev.completedDay == null) return prev
        if (isTimeLockActive(prev)) return prev
        if (prev.phase === 'boot') return prev
        return { ...prev, phase: 'boot' }
      })
    },

    /** 开机动画结束 — 解锁下一天并清锁 */
    finishBoot() {
      if (state.completedDay == null) return

      void import('./gameStore').then(({ gameStore }) => {
        gameStore.nextDay({ awaitingBegin: true })
        commit(() => ({ ...DEFAULT_STATE }))
      })
    },

    /**
     * 开发者后门：连续点击标题 5 次后调用
     * 模拟系统时间已跨越至次日，解除休眠锁
     */
    bypassTimeLock() {
      commit((prev) => {
        if (prev.completedDay == null || prev.lastCompletionTimestamp == null) return prev
        return {
          ...prev,
          timeLockBypassed: true,
          phase: 'boot',
        }
      })
    },

    /** 调试 / 清档时重置 */
    reset() {
      state = { ...DEFAULT_STATE }
      persistState(state)
      notify()
    },

    hydrate() {
      state = loadPersistedState()
      persistState(state)
      notify()
    },

    isTimeLockActive(now = Date.now()) {
      return isTimeLockActive(state, now)
    },

    getRemainingMs(now = Date.now()) {
      return getRemainingLockMs(state, now)
    },
  }
}

export const dailyTransitionStore = createDailyTransitionStore()

/** 供 gameStore 加载时判断，避免越过休眠锁自动跳天 */
export function isDailyTimeLockBlockingAdvance(): boolean {
  const s = dailyTransitionStore.getState()
  if (s.completedDay == null || s.lastCompletionTimestamp == null) return false
  const currentDay = readPersistedCurrentDay()
  if (currentDay > s.completedDay) return false
  if (s.phase === 'sealing' || s.phase === 'boot') return true
  return isTimeLockActive(s)
}

/**
 * 跨日休眠锁 Hook
 */
export function useDailyTransition() {
  const snapshot = useSyncExternalStore(
    dailyTransitionStore.subscribe,
    dailyTransitionStore.getState,
    dailyTransitionStore.getState,
  )

  return {
    ...snapshot,
    remainingMs: dailyTransitionStore.getRemainingMs(),
    isLocked: dailyTransitionStore.isTimeLockActive(),
    isMainQuestDormant: isMainQuestDormant(snapshot),
    pendingNextDay:
      snapshot.completedDay != null ? snapshot.completedDay + 1 : null,
    beginDaySeal: dailyTransitionStore.beginDaySeal,
    finishSealing: dailyTransitionStore.finishSealing,
    triggerBoot: dailyTransitionStore.triggerBoot,
    finishBoot: dailyTransitionStore.finishBoot,
    bypassTimeLock: dailyTransitionStore.bypassTimeLock,
    reset: dailyTransitionStore.reset,
    hydrate: dailyTransitionStore.hydrate,
    formatCountdown: formatCountdownHms,
  }
}

export default useDailyTransition
