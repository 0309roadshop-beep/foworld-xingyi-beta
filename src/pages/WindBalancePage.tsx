import { useNavigate } from 'react-router-dom'
import { CloudMazeBall } from '../components/game/CloudMazeBall'
import { MobileTestQrPanel } from '../components/dev/MobileTestQrPanel'
import { MobileShell } from '../components/layout/MobileShell'

interface WindBalancePageProps {
  /** 免登录真机试玩模式（/test/wind-balance） */
  testMode?: boolean
}

/** 云端迷宫 — 主线或独立试玩 */
export default function WindBalancePage({ testMode = false }: WindBalancePageProps) {
  const navigate = useNavigate()
  return (
    <MobileShell className="flex flex-col">
      <div className="relative z-10 min-h-0 flex-1 overflow-hidden px-3 py-4">
        <h1 className="mb-3 text-center text-sm font-medium text-mist">云端迷宫 · 灵力滚球</h1>

        {testMode && (
          <div className="mb-2 rounded-lg border border-jade-muted/25 bg-jade-deep/15 px-3 py-2 text-center text-[10px] text-jade-bright/90">
            真机试玩模式 · 无需注册登录 · 仅用于陀螺仪测试
          </div>
        )}

        <MobileTestQrPanel path="/test/wind-balance" title="手机真机试玩 · 云端迷宫" />

        <CloudMazeBall
          onComplete={() => {
            if (testMode) return
            navigate(-1)
          }}
        />
      </div>
    </MobileShell>
  )
}
