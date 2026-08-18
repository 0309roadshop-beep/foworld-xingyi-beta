import { getDistanceMeters } from '../utils/geo'

/** 追风骑行 — Day 2 过渡至跳花广场 */
export const WIND_RIDING_DEFAULTS = {
  toLocation: '跳花广场',
  affinityReward: '乘风亲和',
  backgroundImage: '/assets/silhouette-castle-lake.png',
} as const

/** 跳花广场古榕树目的地坐标（占位，后续替换为实测值） */
export const DEST_COORDS = {
  latitude: 24.99,
  longitude: 104.93,
} as const

/** 自动抵达判定半径（米） */
export const WIND_RIDING_ARRIVAL_RADIUS_M = 50

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 3000,
  timeout: 15000,
}

export const WIND_RIDING_GEO_OPTIONS = GEO_OPTIONS

/** Haversine 公式计算两经纬度间直线距离（米） */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  return getDistanceMeters(
    { latitude: lat1, longitude: lon1 },
    { latitude: lat2, longitude: lon2 },
  )
}
