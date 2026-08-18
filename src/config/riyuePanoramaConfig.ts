/** 日月田 · 高维雷达定点锚定 */

export const RIYUE_PANORAMA_IMAGE = '/assets/wanfenglin-riyue.jpg'

export type RiYueHologramZone = {
  id: string
  label: string
  captureToast: string
  /** 全息投影中心点（相对底图容器百分比） */
  cx: number
  cy: number
  scale: number
  rotZ: number
}

/** 隐形点击热区基础边长（相对底图容器百分比） */
export const RIYUE_HITBOX_BASE_PCT = 18

/** 按图腾缩放动态放大点击区，避免大图腾难点中 */
export function resolveHitboxSizePct(scale: number): number {
  return Math.min(34, Math.max(RIYUE_HITBOX_BASE_PCT, 12 + scale * 8))
}

/** 三处「日月田」全息参数 — 真机校准仪终稿 */
export const RIYUE_HOLOGRAM_ZONES: RiYueHologramZone[] = [
  {
    id: 'left',
    label: '左侧大日月',
    captureToast: '已锚定左侧日月灵纹',
    cx: 39.8,
    cy: 64.1,
    scale: 2.5,
    rotZ: -29,
  },
  {
    id: 'top-right',
    label: '右上小日月',
    captureToast: '已锚定右上日月灵纹',
    cx: 72.5,
    cy: 55.8,
    scale: 1.15,
    rotZ: -22,
  },
  {
    id: 'bottom-right',
    label: '右下日月',
    captureToast: '已锚定右下日月灵纹',
    cx: 77.0,
    cy: 67.5,
    scale: 0.75,
    rotZ: -25,
  },
]
