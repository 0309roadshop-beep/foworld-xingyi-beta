import { useNavigate } from 'react-router-dom'
import { RiYueTracing } from '../components/camera/RiYueTracing'

/** 独立调试页 — 日月田灵纹描摹 */
export function RiYueTracingPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-dvh flex-col bg-void-950 px-3 py-4">
      <h1 className="mb-3 text-center text-sm font-medium text-mist">日月田 · 高维雷达锚定</h1>
      <RiYueTracing onSuccess={() => navigate(-1)} onClose={() => navigate(-1)} />
    </div>
  )
}

export default RiYueTracingPage
