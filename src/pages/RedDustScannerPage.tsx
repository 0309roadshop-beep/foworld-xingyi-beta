import { MobileTestQrPanel } from '../components/dev/MobileTestQrPanel'
import { RedDustScanner } from '../components/day6/RedDustScanner'
import { MobileShell } from '../components/layout/MobileShell'

interface RedDustScannerPageProps {
  /** 免登录真机试玩模式（/test/red-dust-scanner） */
  testMode?: boolean
}

/** 街心花园 · 红尘摸金 — 主线或独立试玩 */
export default function RedDustScannerPage({ testMode = false }: RedDustScannerPageProps) {
  return (
    <MobileShell className="flex min-h-0 flex-col">
      {testMode && (
        <div className="relative z-[210] shrink-0 px-3 pt-3">
          <div className="mb-2 rounded-lg border border-[#00F5FF]/25 bg-[#0B131A]/90 px-3 py-2 text-center text-[10px] text-[#00F5FF]/90">
            真机试玩模式 · 无需注册 · 请用 https 局域网地址打开
          </div>
          <MobileTestQrPanel
            path="/test/red-dust-scanner"
            title="手机真机试玩 · 红尘摸金"
          />
        </div>
      )}
      <RedDustScanner />
    </MobileShell>
  )
}
