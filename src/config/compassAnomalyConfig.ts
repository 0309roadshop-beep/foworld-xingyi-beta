/** 罗盘异动 · 灵韵找茬 — 热区与默认素材 */

/** @deprecated 矩形热区，保留类型兼容 */
export interface CompassAnomalyHitbox {
  id: string
  x: number
  y: number
  w: number
  h: number
}

export interface SpotDifference {
  id: number
  /** 原图横向中心百分比 0–100 */
  cx: number
  /** 原图纵向中心百分比 0–100 */
  cy: number
  /** 点击容错半径百分比（与原图百分比坐标同系） */
  r: number
  description: string
}

export const COMPASS_ANOMALY_DEFAULTS = {
  timeLimitSeconds: 60,
  penaltySeconds: 3,
  targetCount: 5,
  introMs: 1500,
} as const

/** 万峰林找茬图原始尺寸（标注比例参考；坐标以渲染后图片百分比为准） */
export const COMPASS_ANOMALY_IMAGE_SIZE: { width: number; height: number } = {
  width: 1024,
  height: 612,
}

/** Day 2 — 万峰林罗盘信号干扰（原图 A / 差异图 B） */
export const DAY2_COMPASS_ANOMALY_IMAGES = {
  imageA: '/assets/3ee9654e7b581f76339b800da897da28.jpg',
  imageB: '/assets/12b1467db1c6361a58af331b4dc2b305.jpg',
} as const

/** 五处圈注不同点 — 百分比圆心 + 容错半径 */
export const SPOT_DIFFERENCES: SpotDifference[] = [
  { id: 1, cx: 32.2, cy: 73.5, r: 4.5, description: '左下角公路拐弯处' },
  { id: 2, cx: 63.2, cy: 66.7, r: 4.5, description: '村落上边缘独立小屋' },
  { id: 3, cx: 86.4, cy: 14.1, r: 4.5, description: '右上角最高处远山尖' },
  { id: 4, cx: 90.5, cy: 90.2, r: 5.0, description: '右下角民居边缘电线' },
  { id: 5, cx: 91.7, cy: 21.8, r: 4.5, description: '中右侧蓝色远山山头' },
]

/** 兼容旧引用 */
export const DAY2_COMPASS_ANOMALY_HITBOXES: CompassAnomalyHitbox[] = SPOT_DIFFERENCES.map(
  (spot) => ({
    id: String(spot.id),
    x: (spot.cx - spot.r) / 100,
    y: (spot.cy - spot.r) / 100,
    w: (spot.r * 2) / 100,
    h: (spot.r * 2) / 100,
  }),
)

export const DAY2_COMPASS_ANOMALY_SUCCESS_TARGET = '跳花广场·千年古榕'

/** 图片内相对点击 (0–1) → 原图百分比坐标 (0–100)，图片完整显示无裁切时直接映射 */
export function containerToImagePercent(rx: number, ry: number): { x: number; y: number } {
  return { x: rx * 100, y: ry * 100 }
}

/** 原图百分比 (0–100) → 图片容器内 CSS 百分比定位 */
export function imagePercentToContainer(cx: number, cy: number): { left: number; top: number } {
  return { left: cx, top: cy }
}

/** 圆心距离判定：sqrt((x-cx)² + (y-cy)²) <= r */
export function isSpotHit(
  clickX: number,
  clickY: number,
  spot: SpotDifference,
): boolean {
  const dist = Math.hypot(clickX - spot.cx, clickY - spot.cy)
  return dist <= spot.r
}

/** 发光圈直径（图片渲染像素） */
export function spotRingDiameterPx(
  spot: SpotDifference,
  renderedW: number,
  renderedH: number,
): number {
  return Math.max(28, (spot.r * 2 * Math.min(renderedW, renderedH)) / 100)
}

/** 放大镜背景偏移：将触摸点居中到 120px 圆盘内，2.5 倍放大 */
export function loupeBackgroundPosition(
  localX: number,
  localY: number,
  loupeRadius = 60,
  zoom = 2.5,
): { x: number; y: number } {
  return {
    x: loupeRadius - localX * zoom,
    y: loupeRadius - localY * zoom,
  }
}
