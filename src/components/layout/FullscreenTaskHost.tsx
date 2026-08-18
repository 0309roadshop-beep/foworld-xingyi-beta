import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface FullscreenTaskHostProps {
  children: ReactNode
}

/**
 * 将相机 / AR 等沉浸式任务挂载到 body 全屏层，脱离剧情窗口滚动容器
 */
export function FullscreenTaskHost({ children }: FullscreenTaskHostProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return createPortal(
    <div className="immersive-task-shell ar-screen game-container">{children}</div>,
    document.body,
  )
}

export default FullscreenTaskHost
