import { useNavigate } from 'react-router-dom'
import { LeylineMatch3 } from '../components/puzzle/LeylineMatch3'
import { useGameStore } from '../store/gameStore'
import { LEYLINE_MATCH3_DEFAULTS } from '../config/leylineMatch3Config'

/** 独立调试页 — 地脉消消乐 */
export default function LeylineMatch3Page() {
  const navigate = useNavigate()
  const { unlockSpirit } = useGameStore()

  return (
    <div className="flex min-h-dvh flex-col bg-void-950 px-3 py-4">
      <h1 className="mb-3 text-center text-sm font-medium text-mist">地脉消消乐 · 汇聚木灵</h1>
      <LeylineMatch3
        onComplete={() => {
          unlockSpirit(LEYLINE_MATCH3_DEFAULTS.unlockSpirit)
          navigate(-1)
        }}
      />
    </div>
  )
}
