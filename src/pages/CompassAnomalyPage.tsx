import { useNavigate } from 'react-router-dom'
import { CompassAnomaly } from '../components/puzzle/CompassAnomaly'

/** 独立调试页 — 罗盘异动灵韵找茬 */
export default function CompassAnomalyPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-dvh flex-col bg-void-950 px-3 py-4">
      <h1 className="mb-3 text-center text-sm font-medium text-mist">罗盘异动 · 灵韵找茬</h1>
      <CompassAnomaly onSuccess={() => navigate(-1)} onClose={() => navigate(-1)} />
    </div>
  )
}
