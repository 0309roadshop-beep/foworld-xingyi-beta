import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ArtifactScan } from '../components/scan/ArtifactScan'
import { MobileShell } from '../components/layout/MobileShell'
import { DAY1_MUSEUM_ARTIFACTS } from '../config/day1ArtifactScanData'

/** 开发者 / 独立路由 — Day 1 文物图谱扫描 */
export default function ArtifactScanPage() {
  const navigate = useNavigate()

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
          <h1 className="text-base font-medium text-mist">古国器韵寻踪</h1>
          <p className="text-[11px] text-mist-faint">文物图谱扫描验证</p>
        </div>
      </header>
      <div className="relative z-10 flex-1 overflow-y-auto overscroll-none px-3 pb-6 scrollbar-none">
        <ArtifactScan
          artifacts={DAY1_MUSEUM_ARTIFACTS}
          targetCount={6}
          description="根据馆藏编号与线索找到文物，取景锁定后输入展牌 3 位数灵感校验码解除封印。"
          onSuccess={() => navigate('/compass')}
        />
      </div>
    </MobileShell>
  )
}
