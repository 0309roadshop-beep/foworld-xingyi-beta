import { useNavigate } from 'react-router-dom'
import { CloudLeapGame } from '../components/game/CloudLeapGame'
import { MobileShell } from '../components/layout/MobileShell'
import { useGameStore } from '../store/gameStore'
import { CLOUD_LEAP_DEFAULTS } from '../config/cloudLeapConfig'

interface CloudLeapPageProps {
  /** 免登录试玩模式 */
  testMode?: boolean
}

/** 登云踏雾 — 主线或独立试玩 */
export default function CloudLeapPage({ testMode = false }: CloudLeapPageProps) {
  const navigate = useNavigate()
  const { unlockSpirit } = useGameStore()

  return (
    <MobileShell className="flex flex-col">
      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-y-auto px-3 py-4 scrollbar-none">
        <h1 className="mb-3 text-center text-sm font-medium text-mist">登云踏雾</h1>

        {testMode && (
          <div className="mb-2 rounded-lg border border-jade-muted/25 bg-jade-deep/15 px-3 py-2 text-center text-[10px] text-jade-bright/90">
            试玩模式 · 无需注册登录
          </div>
        )}

        <CloudLeapGame
          onMilestone={() => {
            if (!testMode) unlockSpirit(CLOUD_LEAP_DEFAULTS.unlockSpirit)
          }}
          onExit={() => {
            if (!testMode) navigate(-1)
          }}
        />
      </div>
    </MobileShell>
  )
}
