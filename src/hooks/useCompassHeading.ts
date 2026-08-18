import { useCallback, useEffect, useRef, useState } from 'react'

export function useCompassHeading() {
  const [heading, setHeading] = useState(0)
  const [supported, setSupported] = useState(false)
  const [permissionNeeded, setPermissionNeeded] = useState(false)
  const cleanupRef = useRef<(() => void) | null>(null)

  const attachListener = useCallback(() => {
    const handler = (e: DeviceOrientationEvent) => {
      if (e.alpha == null) return
      setSupported(true)
      const webkit = (e as DeviceOrientationEvent & { webkitCompassHeading?: number })
        .webkitCompassHeading
      setHeading(webkit ?? (360 - e.alpha))
    }

    window.addEventListener('deviceorientation', handler, true)
    cleanupRef.current = () =>
      window.removeEventListener('deviceorientation', handler, true)
  }, [])

  const startListening = useCallback(async () => {
    const DOE = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<'granted' | 'denied' | 'default'>
    }

    if (typeof DOE.requestPermission === 'function') {
      try {
        const state = await DOE.requestPermission()
        if (state !== 'granted') return false
      } catch {
        return false
      }
    }

    attachListener()
    setPermissionNeeded(false)
    return true
  }, [attachListener])

  useEffect(() => {
    if (!('DeviceOrientationEvent' in window)) return

    const DOE = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<'granted' | 'denied' | 'default'>
    }

    if (typeof DOE.requestPermission === 'function') {
      setPermissionNeeded(true)
      return
    }

    attachListener()
    return () => cleanupRef.current?.()
  }, [attachListener])

  return { heading, supported, permissionNeeded, startListening }
}
