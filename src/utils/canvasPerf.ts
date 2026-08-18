/** Canvas 渲染性能工具：视口剔除、对象复用、离屏背景缓存 */

export const CULL_PAD = 50

export interface Vec2 {
  x: number
  y: number
}

export interface BgCache {
  w: number
  h: number
  key: number
  canvas: HTMLCanvasElement
}

/** 圆形实体是否在视口内（含边距） */
export function isInViewport(
  x: number,
  y: number,
  radius: number,
  w: number,
  h: number,
  pad = CULL_PAD,
): boolean {
  return (
    x + radius >= -pad &&
    x - radius <= w + pad &&
    y + radius >= -pad &&
    y - radius <= h + pad
  )
}

/** 原位压缩过期飘字，避免 filter 产生新数组 */
export function compactTimed<T extends { born: number; life: number }>(
  items: T[],
  now: number,
): void {
  let write = 0
  for (let read = 0; read < items.length; read++) {
    const item = items[read]!
    if (now - item.born < item.life) {
      items[write++] = item
    }
  }
  items.length = write
}

/** 离屏缓存静态背景，尺寸或 key 变化时重建 */
export function ensureBgCache(
  w: number,
  h: number,
  key: number,
  cache: BgCache | null | undefined,
  paint: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
): BgCache {
  if (cache && cache.w === w && cache.h === h && cache.key === key) {
    return cache
  }
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (ctx) paint(ctx, w, h)
  return { w, h, key, canvas }
}
