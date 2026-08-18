import { useNavigate } from 'react-router-dom'
import { ZhongXingAR } from '../components/camera/ZhongXingAR'

/** 独立调试页 — 众星捧月 AR 共鸣 */
export function ZhongXingARPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-dvh flex-col bg-void-950">
      <header className="shrink-0 border-b border-white/10 px-4 py-3">
        <h1 className="text-center text-sm font-medium text-mist">众星捧月 · 灵韵共鸣</h1>
      </header>
      <main className="relative min-h-0 flex-1">
        <ZhongXingAR onClose={() => navigate(-1)} onSuccess={() => navigate(-1)} />
      </main>
    </div>
  )
}

export default ZhongXingARPage
