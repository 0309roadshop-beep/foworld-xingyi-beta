import day1Config from './day1Config.js'
import day2Config from './day2Config.js'
import day3Config from './day3Config.js'
import day4Config from './day4Config.js'
import day5Config from './day5Config.js'
import day6Config from './day6Config'
import day7Config from './day7Config.js'
import type { DayConfig } from './day1Types'

/** 已注册的天数配置表 */
export const dayConfigs: Record<number, DayConfig> = {
  1: day1Config,
  2: day2Config,
  3: day3Config,
  4: day4Config,
  5: day5Config,
  6: day6Config,
  7: day7Config,
}

export const REGISTERED_DAYS = Object.keys(dayConfigs)
  .map(Number)
  .sort((a, b) => a - b)

export function getDayConfig(day: number): DayConfig | undefined {
  return dayConfigs[day]
}

export function getActiveDayConfig(currentDay: number): DayConfig {
  return getDayConfig(currentDay) ?? day1Config
}
