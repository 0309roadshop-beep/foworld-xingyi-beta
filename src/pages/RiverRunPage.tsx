import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { RiverRunGame } from '../components/river/RiverRunGame'
import { MobileShell } from '../components/layout/MobileShell'
import { useGameStore } from '../store/gameStore'

/** 开发者 / 独立路由 — 御水之契江河试炼 */
export default function RiverRunPage() {
  const navigate = useNavigate()
  const { unlockAffinity } = useGameStore()

  return (
    <MobileShell className="flex flex-col">
      <header className="relative z-10 flex shrink-0 items-center gap-3 px-4 py-4">
        <button
          type="button"
          onClick={() => navigate('/compass')}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-muted/20 bg-void-800/80 active:bg-void-700"
        >
          <ArrowLeft className="h-4 w-4 text-mist" />
        </button>
        <div>
          <h1 className="text-base font-medium text-mist">御水之契</h1>
          <p className="text-[11px] text-mist-faint">江河御波试炼</p>
        </div>
      </header>
      <div className="relative z-10 flex-1 overflow-y-auto overscroll-none px-4 pb-6 scrollbar-none">
        <RiverRunGame
          affinityReward="御水亲和"
          surviveSeconds={45}
          targetScore={200}
          maxHits={3}
          onSuccess={() => unlockAffinity('御水亲和')}
        />
      </div>
    </MobileShell>
  )
}
