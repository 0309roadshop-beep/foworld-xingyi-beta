/** 御风平衡盘 — 跨平台重力/倾斜传感 */

export interface TiltSample {
  /** 水平方向加速度分量（左右倾斜） */
  ax: number
  /** 纵向加速度分量（前后倾斜） */
  ay: number
  /** 最近一次有效采样时间戳 */
  lastAt: number
  /** 是否收到过有效数据 */
  active: boolean
}

export type OrientationPlatform = 'ios' | 'android' | 'other'

export function detectOrientationPlatform(): OrientationPlatform {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'other'
}

export function isSecureContext(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext === true
}

export function hasOrientationApi(): boolean {
  return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window
}

export function hasMotionApi(): boolean {
  return typeof window !== 'undefined' && 'DeviceMotionEvent' in window
}

export type OrientationPermissionState = 'granted' | 'denied' | 'default'

type DeviceOrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<OrientationPermissionState>
}

/** iOS 13+ Safari 是否存在需弹窗授权的方向 API */
export function needsIosOrientationPermission(): boolean {
  if (typeof DeviceOrientationEvent === 'undefined') return false
  const DOE = DeviceOrientationEvent as DeviceOrientationEventWithPermission
  return typeof DOE.requestPermission === 'function'
}

/**
 * 在用户点击事件的同步调用栈内发起 iOS 方向权限请求。
 * 仅调用 DeviceOrientationEvent（勿并行请求 DeviceMotionEvent，否则易返回 denied）。
 */
export function invokeIosOrientationPermissionInGesture():
  | { required: false }
  | { required: true; promise: Promise<OrientationPermissionState> } {
  if (typeof DeviceOrientationEvent === 'undefined') {
    return { required: false }
  }
  const DOE = DeviceOrientationEvent as DeviceOrientationEventWithPermission
  if (typeof DOE.requestPermission !== 'function') {
    return { required: false }
  }

  return { required: true, promise: DOE.requestPermission() }
}

/** iOS：Safari 是否已缓存拒绝（瞬间返回 denied，不会再弹窗） */
export function isLikelyCachedIosDenial(
  state: OrientationPermissionState,
  elapsedMs: number,
): boolean {
  return state === 'denied' && elapsedMs < 120
}

type Cleanup = () => void

/** 原地重置采样对象（勿替换引用，否则已挂载的监听器会写入旧对象） */
export function resetTiltSample(sample: TiltSample): void {
  sample.ax = 0
  sample.ay = 0
  sample.lastAt = 0
  sample.active = false
}

/**
 * 挂载方向 + 运动监听。
 * iOS：仅用 deviceorientation；Android：优先 devicemotion。
 */
export function attachTiltListeners(sample: TiltSample): Cleanup {
  const platform = detectOrientationPlatform()
  let betaNeutral = 48
  let gammaNeutral = 0
  let calibrated = false
  let calibrateUntil = Date.now() + 900
  const tiltGain = platform === 'ios' ? 22 : 30

  const markActive = () => {
    sample.active = true
    sample.lastAt = Date.now()
  }

  const applyOrientation = (beta: number, gamma: number) => {
    if (!calibrated && Date.now() < calibrateUntil) {
      betaNeutral = beta
      gammaNeutral = gamma
      if (Date.now() >= calibrateUntil - 100) calibrated = true
    }

    // 竖屏：gamma 左右，beta 前后
    sample.ax = clamp((gamma - gammaNeutral) / tiltGain, -1.2, 1.2)
    sample.ay = clamp((beta - betaNeutral) / tiltGain, -1.2, 1.2)
    markActive()
  }

  const onMotion = (e: DeviceMotionEvent) => {
    const acc = e.accelerationIncludingGravity
    if (!acc || acc.x == null || acc.y == null) return

    const nx = acc.x / 9.81
    const ny = platform === 'android' ? -acc.y / 9.81 : acc.y / 9.81

    sample.ax = clamp(nx, -1.2, 1.2)
    sample.ay = clamp(ny, -1.2, 1.2)
    markActive()
  }

  const onOrientation = (e: DeviceOrientationEvent) => {
    if (e.beta == null && e.gamma == null) return
    applyOrientation(e.beta ?? betaNeutral, e.gamma ?? gammaNeutral)
  }

  const onOrientationAbsolute = (e: DeviceOrientationEvent) => {
    if (e.beta == null && e.gamma == null) return
    applyOrientation(e.beta ?? betaNeutral, e.gamma ?? gammaNeutral)
  }

  const cleanups: Array<() => void> = []

  if (platform !== 'ios') {
    window.addEventListener('devicemotion', onMotion, true)
    cleanups.push(() => window.removeEventListener('devicemotion', onMotion, true))
  }

  window.addEventListener('deviceorientation', onOrientation, true)
  window.addEventListener('deviceorientationabsolute', onOrientationAbsolute, true)
  cleanups.push(() => {
    window.removeEventListener('deviceorientation', onOrientation, true)
    window.removeEventListener('deviceorientationabsolute', onOrientationAbsolute, true)
  })

  return () => {
    for (const fn of cleanups) fn()
  }
}

export function waitForSensorSignal(
  sample: TiltSample,
  timeoutMs = 2200,
): Promise<boolean> {
  const start = Date.now()
  return new Promise((resolve) => {
    const check = () => {
      if (sample.active && Date.now() - sample.lastAt < 500) {
        resolve(true)
        return
      }
      if (Date.now() - start >= timeoutMs) {
        resolve(false)
        return
      }
      requestAnimationFrame(check)
    }
    check()
  })
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}
