import { useNavigate } from 'react-router-dom'
import { DayFlowStage } from '../components/compass/DayFlowStage'

/** 独立 Day1 路由 — 复用中央事件舞台 */
export default function Day1Page() {
  const navigate = useNavigate()

  return (
    <div className="h-screen w-screen overflow-hidden bg-void-950">
      <div className="relative mx-auto h-full w-full max-w-[calc(100dvh*9/16)] overflow-hidden">
        <DayFlowStage onFlowComplete={() => navigate('/compass')} className="h-full" />
      </div>
    </div>
  )
}
