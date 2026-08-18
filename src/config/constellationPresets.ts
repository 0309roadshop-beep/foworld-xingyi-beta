/** 星座连线节点（容器内百分比坐标 0–100） */
export interface ConstellationNode {
  x: number
  y: number
  label?: string
}

/** 千灯灵简笔轮廓 — 水寨灯火唤灵 */
export const QIAN_DENG_SPIRIT_NODES: ConstellationNode[] = [
  { x: 50, y: 13, label: '天灯' },
  { x: 32, y: 28 },
  { x: 68, y: 28 },
  { x: 20, y: 46 },
  { x: 50, y: 40 },
  { x: 80, y: 46 },
  { x: 36, y: 64 },
  { x: 64, y: 64 },
  { x: 50, y: 84, label: '灯心' },
]

/** 古榕星芒 — 五芒闭合 */
export const STAR_PENTAGRAM_NODES: ConstellationNode[] = [
  { x: 50, y: 12 },
  { x: 84, y: 38 },
  { x: 72, y: 78 },
  { x: 28, y: 78 },
  { x: 16, y: 38 },
]

/** 布依织锦几何纹 */
export const WEAVE_PATTERN_NODES: ConstellationNode[] = [
  { x: 50, y: 10 },
  { x: 78, y: 30 },
  { x: 88, y: 58 },
  { x: 50, y: 72 },
  { x: 12, y: 58 },
  { x: 22, y: 30 },
]

export const DEFAULT_CONSTELLATION_BG = '/assets/silhouette-castle-lake.png'
export const DEFAULT_SPIRIT_PLACEHOLDER = '/assets/puzzle-copper-chariot.png'
