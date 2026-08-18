import type { DaySideQuest } from '../config/day1Types'

/** 当日支线是否全部完成（以 store.completedSideQuests 为准） */
export function areSideQuestsComplete(
  sideQuests: DaySideQuest[],
  completedSideQuests: string[],
): boolean {
  if (sideQuests.length === 0) return true
  return sideQuests.every((q) => completedSideQuests.includes(q.questId))
}

/** 指定天数主线是否已完成 */
export function isMainCompleteForDay(
  day: number,
  currentDay: number,
  currentStep: number,
  mainQuestCount: number,
): boolean {
  if (mainQuestCount === 0) return false
  if (day < currentDay) return true
  if (day > currentDay) return false
  return currentStep >= mainQuestCount
}
