import { AlignCamera, type AlignCameraProps } from './AlignCamera'

const DEFAULT_BRIEFING =
  '已抵达吉隆堡最佳观测点。由于湖面磁场干扰，实景与灵纹相框发生错位，请进行人工对齐定格。'

export type CastleFramingARProps = Omit<AlignCameraProps, 'questType' | 'twoPhase' | 'embedded'> & {
  briefingText?: string
}

/** Day 3 吉隆堡 · 梦幻相框城堡定格 */
export function CastleFramingAR({
  questName = '梦幻相框对齐',
  description = '将取景框对准湖心古堡实景，与全息城堡灵纹精准叠合后快门定格。',
  briefingText = DEFAULT_BRIEFING,
  hudStatusText = '吉隆堡取景中',
  startButtonLabel = '【 启动高维取景仪 】',
  ...props
}: CastleFramingARProps) {
  return (
    <AlignCamera
      questType="castle"
      twoPhase
      questName={questName}
      description={description}
      briefingText={briefingText}
      hudStatusText={hudStatusText}
      startButtonLabel={startButtonLabel}
      {...props}
    />
  )
}

export default CastleFramingAR
