import { useCallback, useEffect, useState } from 'react'
import { MOCK_COORDS } from '../mock/data'
import type { GeoCoords, GeoStatus } from '../types'

export function useGeolocation() {
  const [coords, setCoords] = useState<GeoCoords | null>(null)
  const [status, setStatus] = useState<GeoStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('error')
      setError('浏览器不支持定位')
      setCoords(MOCK_COORDS)
      return
    }

    setStatus('loading')
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
        setStatus('success')
      },
      (err) => {
        setStatus('error')
        setError(err.message)
        setCoords(MOCK_COORDS)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { coords, status, error, refresh }
}
