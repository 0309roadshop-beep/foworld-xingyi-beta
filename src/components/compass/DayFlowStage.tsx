import { MainQuestStage } from './MainQuestStage'
import { GlowButton } from '../ui/GlowButton'
import { getActiveDayConfig } from '../../config/dayConfigs'
import { useGameStore } from '../../store/gameStore'

interface DayFlowStageProps {
  /** 流程全部完成后的回调（可选） */
  onFlowComplete?: () => void
  /** 内嵌于 CompassOS 中央卡片时使用，避免全屏占满 */
  embedded?: boolean
  className?: string
}

/**
 * 中央事件舞台 — 与玩家模式共用 MainQuestStage，支持全部主线任务类型
 */
export function DayFlowStage({
  onFlowComplete,
  embedded = false,
  className = '',
}: DayFlowStageProps) {
  const embeddedCls = embedded ? 'max-h-full overflow-hidden' : ''
  const { currentStep, currentDay, lingyuan } = useGameStore()
  const dayConfig = getActiveDayConfig(currentDay)
  const { mainQuests } = dayConfig
  const isComplete = mainQuests.length > 0 && currentStep >= mainQuests.length

  if (isComplete) {
    return (
      <div
        className={`flex h-full flex-col items-center justify-center px-6 text-center ${embeddedCls} ${className}`}
      >
        <p className="mb-2 text-xs tracking-[0.35em] text-mist-muted">DAY {currentDay} COMPLETE</p>
        <h1 className="mb-3 text-2xl font-medium text-gold-bright">{dayConfig.dayTitle}</h1>
        <p className="mb-2 text-sm text-mist-muted">
          累计灵源 <span className="text-spirit">{lingyuan}</span> 滴
        </p>
        <p className="mb-6 text-xs text-mist-faint">今日主线已全部完成</p>
        {onFlowComplete && <GlowButton onClick={onFlowComplete}>继续探索</GlowButton>}
      </div>
    )
  }

  return (
    <MainQuestStage
      dayConfig={dayConfig}
      className={`${embeddedCls} ${className}`}
      onDayMainComplete={onFlowComplete}
    />
  )
}

export default DayFlowStage
