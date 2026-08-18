import { REGISTERED_DAYS, getDayConfig } from './dayConfigs'
import type { DaySideQuest } from './day1Types'

export interface MainQuestJump {
  day: number
  stepId: number
  title: string
  type: string
}

export interface DayQuestGroup {
  day: number
  dayTitle: string
  mainQuests: MainQuestJump[]
  sideQuests: DaySideQuest[]
}

/** 从七日配置生成可跳转的主线 / 支线目录 */
export function getQuestNavigatorGroups(): DayQuestGroup[] {
  return REGISTERED_DAYS.map((day) => {
    const config = getDayConfig(day)
    if (!config) {
      return { day, dayTitle: `Day ${day}`, mainQuests: [], sideQuests: [] }
    }
    return {
      day,
      dayTitle: config.dayTitle,
      mainQuests: config.mainQuests.map((quest) => ({
        day,
        stepId: quest.stepId,
        title: quest.title,
        type: quest.type,
      })),
      sideQuests: config.sideQuests,
    }
  })
}
