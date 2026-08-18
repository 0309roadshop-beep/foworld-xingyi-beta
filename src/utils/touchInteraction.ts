import type { MouseEvent, PointerEvent, TouchEvent } from 'react'

type ActivatableEvent = PointerEvent | TouchEvent | MouseEvent

/** 阻止触控后浏览器补发 click / 默认滚动（移动端幽灵点击） */
export function preventGhostActivation(e: ActivatableEvent) {
  if (e.cancelable) e.preventDefault()
}

/** 交互冷却锁 — 在 intervalMs 内仅放行一次 */
export function createCooldownGate(intervalMs: number) {
  let lockedUntil = 0

  return {
    tryPass(now = performance.now()): boolean {
      if (now < lockedUntil) return false
      lockedUntil = now + intervalMs
      return true
    },
    reset() {
      lockedUntil = 0
    },
  }
}
