import { useCallback, useEffect, useRef, useState } from 'react'

interface UseCameraOptions {
  facingMode?: 'user' | 'environment'
}

export function useCamera({ facingMode = 'environment' }: UseCameraOptions = {}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setIsReady(false)
  }, [])

  const start = useCallback(async () => {
    stop()
    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })

      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play()
        setIsReady(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '无法访问摄像头')
      setIsReady(false)
    }
  }, [facingMode, stop])

  useEffect(() => {
    start()
    return stop
  }, [start, stop])

  return { videoRef, isReady, error, start, stop }
}
