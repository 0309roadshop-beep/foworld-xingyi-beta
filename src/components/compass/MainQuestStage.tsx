import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlignCamera } from '../camera/AlignCamera'
import { CastleFramingAR } from '../camera/CastleFramingAR'
import { ZhongXingAR } from '../camera/ZhongXingAR'
import { RiYueTracing } from '../camera/RiYueTracing'
import { Astrolabe } from '../astrolabe/Astrolabe'
import { BaGuaTianPuzzle } from '../puzzle/BaGuaTianPuzzle'
import { CompassAnomaly } from '../puzzle/CompassAnomaly'
import { WindRiding } from '../transition/WindRiding'
import { LeylineMatch3 } from '../puzzle/LeylineMatch3'
import { CloudMazeBall } from '../game/CloudMazeBall'
import { WindBalanceGame } from '../game/WindBalanceGame'
import { CloudLeapGame } from '../game/CloudLeapGame'
import { AudioCatcher } from '../audiocatcher/AudioCatcher'
import { GearPuzzle } from '../gear/GearPuzzle'
import { FossilScratch } from '../fossil/FossilScratch'
import { FossilDragPuzzle } from '../fossil/FossilDragPuzzle'
import { FossilARRebirth } from '../fossil/FossilARRebirth'
import { GeoController } from '../geo/GeoController'
import { ConstellationConnect } from '../constellation/ConstellationConnect'
import {
  DEFAULT_CONSTELLATION_BG,
  DEFAULT_SPIRIT_PLACEHOLDER,
  STAR_PENTAGRAM_NODES,
  WEAVE_PATTERN_NODES,
} from '../../config/constellationPresets'
import { MatrixPuzzle } from '../puzzle/MatrixPuzzle'
import { PuzzleGrid } from '../puzzle/PuzzleGrid'
import { ScrollGenerator } from '../scroll/ScrollGenerator'
import { ArtifactScan } from '../scan/ArtifactScan'
import { RiverRunGame } from '../river/RiverRunGame'
import { WaterTuning } from '../day4/WaterTuning'
import { GorgeBridgeLink } from '../day4/GorgeBridgeLink'
import { GorgeSeaLionTrace } from '../day4/GorgeSeaLionTrace'
import { AbyssRhythmGame } from '../day4/AbyssRhythmGame'
import { CostumeCheckIn } from '../day5/CostumeCheckIn'
import { PipeConnectGame } from '../day5/PipeConnectGame'
import { HeritageGallery } from '../day5/HeritageGallery'
import { LanternMatchGame } from '../day5/LanternMatchGame'
import { IronFlowerStory } from '../day5/IronFlowerStory'
import { IronFlowerConfirm } from '../day5/IronFlowerConfirm'
import { QianDengGuideStory } from '../day5/QianDengGuideStory'
import { FireAffinityReward } from '../day5/FireAffinityReward'
import { ThousandLanternsGame } from '../day5/ThousandLanternsGame'
import { OfflineCave } from '../day6/OfflineCave'
import { CaveExitPhoto } from '../day6/CaveExitPhoto'
import { CrystalMinerGame } from '../day6/CrystalMinerGame'
import { CaveRestStory } from '../day6/CaveRestStory'
import { TreasureRedeem } from '../day6/TreasureRedeem'
import { FragmentScanner } from '../day6/FragmentScanner'
import { CoreFusion } from '../day6/CoreFusion'
import { JieXinLBSArrival } from '../day6/JieXinLBSArrival'
import { RedDustScanner } from '../day6/RedDustScanner'
import { FullscreenTaskHost } from '../layout/FullscreenTaskHost'
import { WaterAffinityReward } from '../day1/WaterAffinityReward'
import { Day1EndingStory } from '../day1/Day1EndingStory'
import { GrandArrayActivation } from '../day7/GrandArrayActivation'
import { EarthAwakeningStory } from '../day7/EarthAwakeningStory'
import { ScrollSynthesis } from '../day7/ScrollSynthesis'
import { EndingCredits } from '../day7/EndingCredits'
import { SilhouetteSlider } from '../silhouette/SilhouetteSlider'
import { PentatonicSimon } from '../simon/PentatonicSimon'
import { StoryPlayer } from '../story/StoryPlayer'
import { TimeSlider } from '../timeslider/TimeSlider'
import type {
  DayAstrolabeContent,
  DayBaGuaPuzzleContent,
  DayAudioCatchContent,
  DayCameraContent,
  DayConfig,
  DayConnectContent,
  DayGearContent,
  DayLbsContent,
  DayMainQuest,
  DayMatrixContent,
  DayPuzzleContent,
  DayScratchContent,
  DayScrollContent,
  DayScanContent,
  DayFossilDragContent,
  DayARRebirthContent,
  DayRiverRunContent,
  DayWaterAffinityContent,
  DayFireAffinityContent,
  DayIronFlowerConfirmContent,
  DayZhongXingARContent,
  DayRiYueTracingContent,
  DayCompassAnomalyContent,
  DayWindRidingContent,
  DayLeylineMatch3Content,
  DayWindBalanceContent,
  DayCloudMazeContent,
  DayCloudLeapContent,
  DayWaterTuningContent,
  DayGorgeBridgeContent,
  DayGorgeSeaLionContent,
  DayAbyssRhythmContent,
  DayPipeConnectContent,
  DayHeritageGalleryContent,
  DayLanternMatchContent,
  DayOneStrokeContent,
  DayOfflineCaveContent,
  DayCrystalMinerContent,
  DayRedeemTicketContent,
  DayFragmentScannerContent,
  DayCoreFusionContent,
  DayJiexinCheckInContent,
  DayRedDustScannerContent,
  DayCorePlacementContent,
  DaySpiritArrayContent,
  DayScrollSynthesisContent,
  DayCreditsContent,
  DaySimonContent,
  DaySliderContent,
  DayStoryContent,
  DayTimeSliderContent,
} from '../../config/day1Types'
import { collectScrollPhotos, collectScrollSpirits } from '../../config/scrollDataHelper'
import { useGameStore } from '../../store/gameStore'

function isLbsQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'lbs'; content: DayLbsContent } {
  return quest.type === 'lbs'
}

function isStoryQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'story'; content: DayStoryContent } {
  return quest.type === 'story'
}

function isPuzzleQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-puzzle'; content: DayPuzzleContent } {
  return quest.type === 'game-puzzle'
}

function isCameraQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-camera'; content: DayCameraContent } {
  return quest.type === 'game-camera'
}

function isConnectQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-connect'; content: DayConnectContent } {
  return quest.type === 'game-connect'
}

function isAstrolabeQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-astrolabe'; content: DayAstrolabeContent } {
  return quest.type === 'game-astrolabe'
}

function isBaGuaPuzzleQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-bagua-puzzle'; content: DayBaGuaPuzzleContent } {
  return quest.type === 'game-bagua-puzzle'
}

function isSliderQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-slider'; content: DaySliderContent | DayTimeSliderContent } {
  return quest.type === 'game-slider'
}

function isTimeSliderStep(
  quest: DayMainQuest & { type: 'game-slider' },
): quest is DayMainQuest & { type: 'game-slider'; content: DayTimeSliderContent } {
  return 'targetYear' in quest.content && Boolean(quest.content.targetYear)
}

function isScratchQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-scratch'; content: DayScratchContent } {
  return quest.type === 'game-scratch'
}

function isMatrixQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-matrix'; content: DayMatrixContent } {
  return quest.type === 'game-matrix'
}

function isAudioCatchQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-audio-catch'; content: DayAudioCatchContent } {
  return quest.type === 'game-audio-catch'
}

function isSimonQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-simon'; content: DaySimonContent } {
  return quest.type === 'game-simon'
}

function isGearQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-gear'; content: DayGearContent } {
  return quest.type === 'game-gear'
}

function isScrollQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-scroll'; content: DayScrollContent } {
  return quest.type === 'game-scroll'
}

function isScanQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-scan'; content: DayScanContent } {
  return quest.type === 'game-scan'
}

function isFossilDragQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-fossil-drag'; content: DayFossilDragContent } {
  return quest.type === 'game-fossil-drag'
}

function isARRebirthQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-ar-rebirth'; content: DayARRebirthContent } {
  return quest.type === 'game-ar-rebirth'
}

function isRiverRunQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-river-run'; content: DayRiverRunContent } {
  return quest.type === 'game-river-run'
}

function isWaterAffinityQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-water-affinity'; content: DayWaterAffinityContent } {
  return quest.type === 'game-water-affinity'
}

function isFireAffinityQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-fire-affinity'; content: DayFireAffinityContent } {
  return quest.type === 'game-fire-affinity'
}

function isIronFlowerConfirmQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-iron-flower-confirm'; content: DayIronFlowerConfirmContent } {
  return quest.type === 'game-iron-flower-confirm'
}

function isZhongXingARQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-zhongxing-ar'; content: DayZhongXingARContent } {
  return quest.type === 'game-zhongxing-ar'
}

function isRiYueTracingQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-riyue-tracing'; content: DayRiYueTracingContent } {
  return quest.type === 'game-riyue-tracing'
}

function isCompassAnomalyQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-compass-anomaly'; content: DayCompassAnomalyContent } {
  return quest.type === 'game-compass-anomaly'
}

function isWindRidingQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-wind-riding'; content: DayWindRidingContent } {
  return quest.type === 'game-wind-riding'
}

function isLeylineMatch3Quest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-leyline-match3'; content: DayLeylineMatch3Content } {
  return quest.type === 'game-leyline-match3'
}

function isWindBalanceQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-wind-balance'; content: DayWindBalanceContent } {
  return quest.type === 'game-wind-balance'
}

function isCloudMazeQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-cloud-maze'; content: DayCloudMazeContent } {
  return quest.type === 'game-cloud-maze'
}

function isCloudLeapQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-cloud-leap'; content: DayCloudLeapContent } {
  return quest.type === 'game-cloud-leap'
}

function isWaterTuningQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-water-tuning'; content: DayWaterTuningContent } {
  return quest.type === 'game-water-tuning'
}

function isGorgeBridgeQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-gorge-bridge'; content: DayGorgeBridgeContent } {
  return quest.type === 'game-gorge-bridge'
}

function isGorgeSeaLionQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-gorge-sealion'; content: DayGorgeSeaLionContent } {
  return quest.type === 'game-gorge-sealion'
}

function isAbyssRhythmQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-abyss-rhythm'; content: DayAbyssRhythmContent } {
  return quest.type === 'game-abyss-rhythm'
}

function isPipeConnectQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-pipe-connect'; content: DayPipeConnectContent } {
  return quest.type === 'game-pipe-connect'
}

function isHeritageGalleryQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-heritage-gallery'; content: DayHeritageGalleryContent } {
  return quest.type === 'game-heritage-gallery'
}

function isLanternMatchQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-lantern-match'; content: DayLanternMatchContent } {
  return quest.type === 'game-lantern-match'
}

function isOneStrokeQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-one-stroke'; content: DayOneStrokeContent } {
  return quest.type === 'game-one-stroke'
}

function isOfflineCaveQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'offline-cave'; content: DayOfflineCaveContent } {
  return quest.type === 'offline-cave'
}

function isCrystalMinerQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-crystal-miner'; content: DayCrystalMinerContent } {
  return quest.type === 'game-crystal-miner'
}

function isRedeemTicketQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'redeem-ticket'; content: DayRedeemTicketContent } {
  return quest.type === 'redeem-ticket'
}

function isFragmentScannerQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-fragment-scanner'; content: DayFragmentScannerContent } {
  return quest.type === 'game-fragment-scanner'
}

function isCoreFusionQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-core-fusion'; content: DayCoreFusionContent } {
  return quest.type === 'game-core-fusion'
}

function isJiexinCheckInQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-jiexin-checkin'; content: DayJiexinCheckInContent } {
  return quest.type === 'game-jiexin-checkin'
}

function isRedDustScannerQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-red-dust-scanner'; content: DayRedDustScannerContent } {
  return quest.type === 'game-red-dust-scanner'
}

function isCorePlacementQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-core-placement'; content: DayCorePlacementContent } {
  return quest.type === 'game-core-placement'
}

function isSpiritArrayQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-spirit-array'; content: DaySpiritArrayContent } {
  return quest.type === 'game-spirit-array'
}

function isScrollSynthesisQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'game-scroll-synthesis'; content: DayScrollSynthesisContent } {
  return quest.type === 'game-scroll-synthesis'
}

function isCreditsQuest(
  quest: DayMainQuest,
): quest is DayMainQuest & { type: 'credits'; content: DayCreditsContent } {
  return quest.type === 'credits'
}

interface MainQuestStageProps {
  dayConfig: DayConfig
  className?: string
  onDayMainComplete?: () => void
  /** 精灵觉醒时拦截 nextStep，由 CompassOS Modal 关闭后再继续 */
  onSpiritAwaken?: (spiritName: string, continueStep: () => void) => void
  /** Day 1 等手动收束：点击「结束今日行程」后触发日结封装 */
  onRequestDaySeal?: () => void
}

/** 取景 / AR 任务取消后回到任务详情，可再次进入 */
function ImmersiveCameraPrompt({
  quest,
  className = '',
  startLabel,
  onStart,
}: {
  quest: DayMainQuest
  className?: string
  startLabel: string
  onStart: () => void
}) {
  const detail = quest.content as { questName?: string; description?: string }
  return (
    <div
      className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
    >
      <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
      {detail.questName && (
        <p className="mb-1 text-center text-xs text-gold-muted">{detail.questName}</p>
      )}
      {detail.description && (
        <p className="mb-4 text-center text-[11px] leading-relaxed text-mist-faint">
          {detail.description}
        </p>
      )}
      <p className="mb-3 text-center text-[10px] text-mist-muted">
        已退出取景，可随时重新开始，不会视为任务失败
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mx-auto rounded-xl border border-jade-muted/40 bg-jade-deep/30 px-6 py-3 text-sm font-medium text-jade-bright active:scale-[0.98]"
      >
        {startLabel}
      </button>
    </div>
  )
}

/**
 * 主线舞台 — 根据 dayConfig.mainQuests[currentStep] 渲染对应 React 组件
 */
export function MainQuestStage({
  dayConfig,
  className: classNameProp = '',
  onDayMainComplete,
  onSpiritAwaken,
  onRequestDaySeal,
}: MainQuestStageProps) {
  const className = `quest-stage-content ${classNameProp}`
  const {
    currentStep,
    currentDay,
    nextStep,
    addLingyuan,
    unlockSpirit,
    unlockAffinity,
    collectedSpirits,
  } =
    useGameStore()
  const { mainQuests } = dayConfig

  const quest = mainQuests[currentStep] as DayMainQuest | undefined
  const questRef = useRef(quest)
  questRef.current = quest
  const isMainComplete = mainQuests.length > 0 && currentStep >= mainQuests.length
  const photoD5Completed = useMemo(() => {
    const heritageIdx = mainQuests.findIndex((q) => q.type === 'game-heritage-gallery')
    if (heritageIdx < 0) return true
    return currentStep > heritageIdx || isMainComplete
  }, [mainQuests, currentStep, isMainComplete])
  const [lbsArrived, setLbsArrived] = useState(false)
  const [lbsError, setLbsError] = useState<string | null>(null)
  const [immersiveDismissed, setImmersiveDismissed] = useState(false)
  const completeNotifiedRef = useRef(false)

  useEffect(() => {
    setImmersiveDismissed(false)
  }, [quest?.stepId, dayConfig.day])

  const handleImmersiveCancel = useCallback(() => {
    setImmersiveDismissed(true)
  }, [])

  const resumeImmersive = useCallback(() => {
    setImmersiveDismissed(false)
  }, [])

  const advanceAfterQuest = useCallback(
    (content?: { unlockSpirit?: string; rewardLingyuan?: number }) => {
      if (content?.rewardLingyuan) addLingyuan(content.rewardLingyuan)
      if (content?.unlockSpirit) {
        unlockSpirit(content.unlockSpirit)
        if (onSpiritAwaken) {
          onSpiritAwaken(content.unlockSpirit, nextStep)
          return
        }
      }
      nextStep()
    },
    [addLingyuan, unlockSpirit, nextStep, onSpiritAwaken],
  )

  useEffect(() => {
    if (isMainComplete && !completeNotifiedRef.current) {
      completeNotifiedRef.current = true
      onDayMainComplete?.()
    }
    if (!isMainComplete) {
      completeNotifiedRef.current = false
    }
  }, [isMainComplete, onDayMainComplete])

  const handleLbsArrived = useCallback(() => {
    setLbsArrived(true)
    nextStep()
  }, [nextStep])

  const handleStoryFinish = useCallback(() => {
    if (!quest || !isStoryQuest(quest)) return
    const c = quest.content
    if (c.affinityReward) unlockAffinity(c.affinityReward)
    advanceAfterQuest(c)
  }, [quest, advanceAfterQuest, unlockAffinity])

  const handleDay1EndingComplete = useCallback(() => {
    const q = questRef.current
    if (!q || !isStoryQuest(q)) return
    const c = q.content
    if (c.affinityReward) unlockAffinity(c.affinityReward)
    if (c.rewardLingyuan) addLingyuan(c.rewardLingyuan)
    nextStep()
    onRequestDaySeal?.()
  }, [unlockAffinity, addLingyuan, nextStep, onRequestDaySeal])

  const handlePuzzleSuccess = useCallback(() => {
    addLingyuan(50)
    nextStep()
  }, [addLingyuan, nextStep])

  const handleConnectSuccess = useCallback(() => {
    if (!quest || !isConnectQuest(quest)) return
    advanceAfterQuest(quest.content)
  }, [quest, advanceAfterQuest])

  const handleAstrolabeSuccess = useCallback(() => {
    if (!quest || !isAstrolabeQuest(quest)) return
    advanceAfterQuest(quest.content)
  }, [quest, advanceAfterQuest])

  const handleBaGuaPuzzleSuccess = useCallback(() => {
    if (!quest || !isBaGuaPuzzleQuest(quest)) return
    advanceAfterQuest(quest.content)
  }, [quest, advanceAfterQuest])

  const handleSliderSuccess = useCallback(() => {
    if (!quest || !isSliderQuest(quest)) return
    advanceAfterQuest(quest.content)
  }, [quest, advanceAfterQuest])

  const handleScratchSuccess = useCallback(() => {
    if (!quest || !isScratchQuest(quest)) return
    advanceAfterQuest(quest.content)
  }, [quest, advanceAfterQuest])

  const handleMatrixSuccess = useCallback(() => {
    if (!quest || !isMatrixQuest(quest)) return
    advanceAfterQuest(quest.content)
  }, [quest, advanceAfterQuest])

  const handleAudioCatchSuccess = useCallback(() => {
    nextStep()
  }, [nextStep])

  const handleSimonSuccess = useCallback(() => {
    if (!quest || !isSimonQuest(quest)) return
    advanceAfterQuest(quest.content)
  }, [quest, advanceAfterQuest])

  const handleGearSuccess = useCallback(() => {
    if (!quest || !isGearQuest(quest)) return
    advanceAfterQuest(quest.content)
  }, [quest, advanceAfterQuest])

  const handleScrollSuccess = useCallback(() => {
    if (!quest || !isScrollQuest(quest)) return
    advanceAfterQuest(quest.content)
  }, [quest, advanceAfterQuest])

  const handleScanSuccess = useCallback(() => {
    if (!quest || !isScanQuest(quest)) return
    advanceAfterQuest(quest.content)
  }, [quest, advanceAfterQuest])

  const handleFossilDragSuccess = useCallback(() => {
    if (!quest || !isFossilDragQuest(quest)) return
    advanceAfterQuest(quest.content)
  }, [quest, advanceAfterQuest])

  const handleARRebirthSuccess = useCallback(() => {
    if (!quest || !isARRebirthQuest(quest)) return
    advanceAfterQuest(quest.content)
  }, [quest, advanceAfterQuest])

  const handleRiverRunSuccess = useCallback(() => {
    if (!quest || !isRiverRunQuest(quest)) return
    advanceAfterQuest(quest.content)
  }, [quest, advanceAfterQuest])

  const handleWaterAffinityComplete = useCallback(() => {
    const q = questRef.current
    if (!q || !isWaterAffinityQuest(q)) return
    advanceAfterQuest(q.content)
  }, [advanceAfterQuest])

  const handleFireAffinityComplete = useCallback(() => {
    const q = questRef.current
    if (!q || !isFireAffinityQuest(q)) return
    advanceAfterQuest(q.content)
  }, [advanceAfterQuest])

  const handleZhongXingARSuccess = useCallback(() => {
    if (!quest || !isZhongXingARQuest(quest)) return
    advanceAfterQuest(quest.content)
  }, [quest, advanceAfterQuest])

  const handleRiYueTracingSuccess = useCallback(() => {
    if (!quest || !isRiYueTracingQuest(quest)) return
    advanceAfterQuest(quest.content)
  }, [quest, advanceAfterQuest])

  const handleCompassAnomalySuccess = useCallback(() => {
    const q = questRef.current
    if (!q || !isCompassAnomalyQuest(q)) return
    advanceAfterQuest(q.content)
  }, [advanceAfterQuest])

  const handleWindRidingComplete = useCallback(() => {
    const q = questRef.current
    if (!q || !isWindRidingQuest(q)) return
    const c = q.content
    if (c.affinityReward) unlockAffinity(c.affinityReward)
    advanceAfterQuest(c)
  }, [advanceAfterQuest, unlockAffinity])

  const handleLeylineMatch3Complete = useCallback(() => {
    const q = questRef.current
    if (!q || !isLeylineMatch3Quest(q)) return
    const c = q.content
    if (c.unlockSpirit) {
      unlockSpirit(c.unlockSpirit)
      if (onSpiritAwaken) {
        onSpiritAwaken(c.unlockSpirit, () => {
          if (c.rewardLingyuan) addLingyuan(c.rewardLingyuan)
          nextStep()
        })
        return
      }
    }
    if (c.rewardLingyuan) addLingyuan(c.rewardLingyuan)
    nextStep()
  }, [addLingyuan, unlockSpirit, nextStep, onSpiritAwaken])

  const handleWindBalanceComplete = useCallback(() => {
    const q = questRef.current
    if (!q || !isWindBalanceQuest(q)) return
    const c = q.content
    if (c.rewardLingyuan) addLingyuan(c.rewardLingyuan)
    if (c.unlockSpirit) unlockSpirit(c.unlockSpirit)
    nextStep()
  }, [addLingyuan, unlockSpirit, nextStep])

  const handleCloudMazeComplete = useCallback(() => {
    const q = questRef.current
    if (!q || !isCloudMazeQuest(q)) return
    const c = q.content
    if (c.rewardLingyuan) addLingyuan(c.rewardLingyuan)
    nextStep()
  }, [addLingyuan, nextStep])

  const handleCloudLeapMilestone = useCallback(() => {
    const q = questRef.current
    if (!q || !isCloudLeapQuest(q)) return
    const c = q.content
    if (c.rewardLingyuan) addLingyuan(c.rewardLingyuan)
    if (c.unlockSpirit) unlockSpirit(c.unlockSpirit)
  }, [addLingyuan, unlockSpirit])

  const handleCloudLeapExit = useCallback(() => {
    nextStep()
  }, [nextStep])

  const handleWaterTuningComplete = useCallback(() => {
    const q = questRef.current
    if (!q || !isWaterTuningQuest(q)) return
    advanceAfterQuest(q.content)
  }, [advanceAfterQuest])

  const handleGorgeBridgeComplete = useCallback(() => {
    const q = questRef.current
    if (!q || !isGorgeBridgeQuest(q)) return
    advanceAfterQuest(q.content)
  }, [advanceAfterQuest])

  const handleGorgeSeaLionComplete = useCallback(() => {
    const q = questRef.current
    if (!q || !isGorgeSeaLionQuest(q)) return
    advanceAfterQuest(q.content)
  }, [advanceAfterQuest])

  const handleAbyssRhythmComplete = useCallback(() => {
    const q = questRef.current
    if (!q || !isAbyssRhythmQuest(q)) return
    const c = q.content
    // 胜利 Modal 已展示唤醒文案，直接推进并解锁精灵
    if (c.rewardLingyuan) addLingyuan(c.rewardLingyuan)
    if (c.unlockSpirit) unlockSpirit(c.unlockSpirit)
    nextStep()
  }, [addLingyuan, unlockSpirit, nextStep])

  const handlePipeConnectComplete = useCallback(() => {
    const q = questRef.current
    if (!q || !isPipeConnectQuest(q)) return
    advanceAfterQuest(q.content)
  }, [advanceAfterQuest])

  const handleHeritageGalleryComplete = useCallback(() => {
    const q = questRef.current
    if (!q || !isHeritageGalleryQuest(q)) return
    advanceAfterQuest(q.content)
  }, [advanceAfterQuest])

  const handleLanternMatchComplete = useCallback(() => {
    const q = questRef.current
    if (!q || !isLanternMatchQuest(q)) return
    advanceAfterQuest(q.content)
  }, [advanceAfterQuest])

  const handleOneStrokeComplete = useCallback(() => {
    const q = questRef.current
    if (!q || !isOneStrokeQuest(q)) return
    const c = q.content
    if (c.unlockSpirit) {
      unlockSpirit(c.unlockSpirit)
      if (onSpiritAwaken) {
        onSpiritAwaken(c.unlockSpirit, () => {
          if (c.rewardLingyuan) addLingyuan(c.rewardLingyuan)
          nextStep()
          if (c.endOfDay) onRequestDaySeal?.()
        })
        return
      }
    }
    if (c.rewardLingyuan) addLingyuan(c.rewardLingyuan)
    nextStep()
    if (c.endOfDay) onRequestDaySeal?.()
  }, [addLingyuan, unlockSpirit, nextStep, onSpiritAwaken, onRequestDaySeal])

  const handleIronFlowerStoryComplete = useCallback(() => {
    const q = questRef.current
    if (!q || !isStoryQuest(q)) return
    advanceAfterQuest(q.content)
  }, [advanceAfterQuest])

  const handleIronFlowerConfirmComplete = useCallback(() => {
    const q = questRef.current
    if (!q || !isIronFlowerConfirmQuest(q)) return
    advanceAfterQuest(q.content)
  }, [advanceAfterQuest])

  const handleOfflineCaveComplete = useCallback(() => {
    const q = questRef.current
    if (!q || !isOfflineCaveQuest(q)) return
    nextStep()
  }, [nextStep])

  const handleCrystalMinerComplete = useCallback(() => {
    const q = questRef.current
    if (!q || !isCrystalMinerQuest(q)) return
    const c = q.content
    if (c.affinityReward) unlockAffinity(c.affinityReward)
    advanceAfterQuest(c)
  }, [advanceAfterQuest, unlockAffinity])

  const handleRedeemTicketComplete = useCallback(() => {
    const q = questRef.current
    if (!q || !isRedeemTicketQuest(q)) return
    advanceAfterQuest(q.content)
  }, [advanceAfterQuest])

  const handleFragmentScannerComplete = useCallback(() => {
    const q = questRef.current
    if (!q || !isFragmentScannerQuest(q)) return
    advanceAfterQuest(q.content)
  }, [advanceAfterQuest])

  const handleCoreFusionComplete = useCallback(() => {
    const q = questRef.current
    if (!q || !isCoreFusionQuest(q)) return
    advanceAfterQuest(q.content)
  }, [advanceAfterQuest])

  const handleJiexinCheckInComplete = useCallback(() => {
    const q = questRef.current
    if (!q || !isJiexinCheckInQuest(q)) return
    advanceAfterQuest(q.content)
  }, [advanceAfterQuest])

  const handleRedDustScannerComplete = useCallback(() => {
    const q = questRef.current
    if (!q || !isRedDustScannerQuest(q)) return
    advanceAfterQuest(q.content)
  }, [advanceAfterQuest])

  const handleCorePlacementComplete = useCallback(() => {
    const q = questRef.current
    if (!q || !isCorePlacementQuest(q)) return
    advanceAfterQuest(q.content)
  }, [advanceAfterQuest])

  const handleSpiritArrayComplete = useCallback(() => {
    const q = questRef.current
    if (!q || !isSpiritArrayQuest(q)) return
    advanceAfterQuest(q.content)
  }, [advanceAfterQuest])

  const handleScrollSynthesisSuccess = useCallback(() => {
    const q = questRef.current
    if (!q || !isScrollSynthesisQuest(q)) return
    advanceAfterQuest(q.content)
  }, [advanceAfterQuest])

  const handleCreditsComplete = useCallback(() => {
    const q = questRef.current
    if (!q || !isCreditsQuest(q)) return
    advanceAfterQuest(q.content)
  }, [advanceAfterQuest])

  if (mainQuests.length === 0) {
    return (
      <div className={`flex min-h-[200px] flex-col items-center justify-center px-4 py-8 text-center ${className}`}>
        <p className="text-xs tracking-[0.35em] text-mist-muted">DAY {currentDay}</p>
        <p className="mt-2 text-sm text-mist-faint">新章待启，罗盘已指向下一灵域…</p>
      </div>
    )
  }

  if (isMainComplete) {
    return (
      <div className={`flex min-h-[200px] flex-col items-center justify-center px-4 py-8 text-center ${className}`}>
        <p className="mb-2 text-xs tracking-[0.35em] text-mist-muted">DAY {dayConfig.day} · 主线圆满</p>
        <p className="text-sm leading-relaxed text-mist">
          今日主线已圆满！请继续探索完成下方的支线任务。
        </p>
      </div>
    )
  }

  if (!quest) return null

  if (isLbsQuest(quest)) {
    return (
      <div className={`relative flex min-h-[200px] flex-col items-center justify-center px-4 py-6 text-center ${className}`}>
        <GeoController
          targetCoords={quest.content.coords}
          onArrived={handleLbsArrived}
          onError={(msg) => setLbsError(msg)}
        />
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-jade-muted/40 bg-jade-deep/20">
          <span className="text-xl">📍</span>
        </div>
        <p className="mb-1 text-[10px] tracking-[0.3em] text-mist-muted">LBS 灵域定位</p>
        <h3 className="mb-1 text-base font-medium text-gold-bright">{quest.title}</h3>
        <p className="mb-2 text-sm text-mist">{quest.content.targetName}</p>
        {quest.content.description && (
          <p className="mb-3 max-w-xs text-xs leading-relaxed text-mist-muted">
            {quest.content.description}
          </p>
        )}
        {lbsArrived && <p className="mt-2 text-xs text-spirit">已抵达，正在开启剧情…</p>}
        {lbsError && <p className="mt-2 text-xs text-red-300/80">{lbsError}</p>}
      </div>
    )
  }

  if (isStoryQuest(quest)) {
    const c = quest.content
    if (c.storyVariant === 'iron-flower') {
      return (
        <div className={`min-h-[200px] px-2 py-3 ${className}`}>
          <h3 className="mb-2 text-center text-base font-medium text-mist">{quest.title}</h3>
          <IronFlowerStory
            key={`${dayConfig.day}-${quest.stepId}`}
            onComplete={handleIronFlowerStoryComplete}
          />
        </div>
      )
    }
    if (c.storyVariant === 'day5-lantern-guide') {
      return (
        <div className={`min-h-[200px] px-2 py-3 ${className}`}>
          <h3 className="mb-2 text-center text-base font-medium text-mist">{quest.title}</h3>
          <QianDengGuideStory
            key={`${dayConfig.day}-${quest.stepId}`}
            onComplete={handleIronFlowerStoryComplete}
          />
        </div>
      )
    }
    if (c.storyVariant === 'cave-rest') {
      return (
        <div className={`min-h-[200px] px-2 py-3 ${className}`}>
          <h3 className="mb-2 text-center text-base font-medium text-mist">{quest.title}</h3>
          <CaveRestStory
            key={`${dayConfig.day}-${quest.stepId}`}
            onComplete={handleStoryFinish}
          />
        </div>
      )
    }
    if (c.storyVariant === 'earth-awakening') {
      return (
        <div className={`min-h-[200px] px-2 py-3 ${className}`}>
          <h3 className="mb-2 text-center text-base font-medium text-mist">{quest.title}</h3>
          <EarthAwakeningStory
            key={`${dayConfig.day}-${quest.stepId}`}
            onComplete={handleStoryFinish}
          />
        </div>
      )
    }
    if (c.storyVariant === 'day1-ending') {
      return (
        <div className={`min-h-[200px] px-2 py-3 ${className}`}>
          <h3 className="mb-2 text-center text-base font-medium text-mist">{quest.title}</h3>
          <Day1EndingStory
            key={`${dayConfig.day}-${quest.stepId}`}
            onComplete={handleDay1EndingComplete}
          />
        </div>
      )
    }
    return (
      <div className={`min-h-[200px] ${className}`}>
        <StoryPlayer dialogues={c.dialogues} onFinish={handleStoryFinish} />
      </div>
    )
  }

  if (isPuzzleQuest(quest)) {
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-3 py-4 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {(quest.content.questName || quest.content.description) && (
          <p className="mb-3 text-center text-xs text-mist-muted">
            {quest.content.questName ?? quest.content.description}
          </p>
        )}
        {quest.content.questName && quest.content.description && (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-mist-faint">
            {quest.content.description}
          </p>
        )}
        <PuzzleGrid
          imageUrl={quest.content.imageUrl}
          imageAspect={quest.content.imageAspect}
          onSuccess={handlePuzzleSuccess}
        />
      </div>
    )
  }

  if (isZhongXingARQuest(quest)) {
    if (immersiveDismissed) {
      return (
        <ImmersiveCameraPrompt
          quest={quest}
          className={className}
          startLabel="打开 AR 取景"
          onStart={resumeImmersive}
        />
      )
    }
    return (
      <>
        <p className={`py-2 text-center text-[10px] text-mist-faint ${className}`}>
          全屏 AR 任务进行中…
        </p>
        <FullscreenTaskHost>
          <ZhongXingAR
            key={`${dayConfig.day}-${quest.stepId}`}
            onSuccess={handleZhongXingARSuccess}
            onCancel={handleImmersiveCancel}
            onClose={handleImmersiveCancel}
          />
        </FullscreenTaskHost>
      </>
    )
  }

  if (isRiYueTracingQuest(quest)) {
    const c = quest.content
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        <RiYueTracing
          key={`${dayConfig.day}-${quest.stepId}`}
          questName={c.questName}
          description={c.description}
          onSuccess={handleRiYueTracingSuccess}
          onCancel={handleImmersiveCancel}
          onClose={handleImmersiveCancel}
        />
      </div>
    )
  }

  if (isCameraQuest(quest)) {
    const c = quest.content
    if (c.cameraMode === 'costume') {
      return (
        <div
          className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
        >
          <CostumeCheckIn
            key={`${dayConfig.day}-${quest.stepId}`}
            onComplete={() => advanceAfterQuest(c)}
          />
        </div>
      )
    }
    if (c.cameraMode === 'cave-exit') {
      return (
        <div
          className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
        >
          <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
          {c.questName && (
            <p className="mb-1 text-center text-xs text-sky-bright/80">{c.questName}</p>
          )}
          {c.description && (
            <p className="mb-3 text-center text-[11px] leading-relaxed text-mist-faint">
              {c.description}
            </p>
          )}
          <CaveExitPhoto
            key={`${dayConfig.day}-${quest.stepId}`}
            onComplete={() => advanceAfterQuest(c)}
          />
        </div>
      )
    }
    if (c.artifacts && c.artifacts.length > 0) {
      return (
        <div
          className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
        >
          <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
          {c.questName && (
            <p className="mb-1 text-center text-xs text-gold-muted">{c.questName}</p>
          )}
          <ArtifactScan
            key={`${dayConfig.day}-${quest.stepId}`}
            artifacts={c.artifacts}
            targetCount={c.targetCount}
            description={c.description}
            onSuccess={() => advanceAfterQuest(c)}
          />
        </div>
      )
    }

    if (c.questType === 'castle') {
      return (
        <div
          className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
        >
          <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
          <CastleFramingAR
            key={`${dayConfig.day}-${quest.stepId}`}
            questName={c.questName}
            description={c.description}
            onSuccess={() => advanceAfterQuest(c)}
            onCancel={handleImmersiveCancel}
            onClose={handleImmersiveCancel}
          />
        </div>
      )
    }

    if (immersiveDismissed) {
      return (
        <ImmersiveCameraPrompt
          quest={quest}
          className={className}
          startLabel="打开取景"
          onStart={resumeImmersive}
        />
      )
    }
    return (
      <>
        <p className={`py-2 text-center text-[10px] text-mist-faint ${className}`}>
          全屏取景任务进行中…
        </p>
        <FullscreenTaskHost>
          <AlignCamera
            key={`${dayConfig.day}-${quest.stepId}-${c.questType ?? 'tree'}`}
            embedded
            questType={c.questType ?? 'tree'}
            onSuccess={() => advanceAfterQuest(c)}
            onCancel={handleImmersiveCancel}
            onClose={handleImmersiveCancel}
          />
        </FullscreenTaskHost>
      </>
    )
  }

  if (isConnectQuest(quest)) {
    const c = quest.content
    const nodes =
      c.nodes ??
      (quest.title.includes('织锦') ? WEAVE_PATTERN_NODES : STAR_PENTAGRAM_NODES)

    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {c.questName && (
          <p className="mb-3 text-center text-xs text-mist-muted">{c.questName}</p>
        )}
        <ConstellationConnect
          bgImage={c.bgImage ?? DEFAULT_CONSTELLATION_BG}
          spiritImage={c.spiritImage ?? DEFAULT_SPIRIT_PLACEHOLDER}
          nodes={nodes}
          routeMode={c.routeMode ?? (c.nodes ? 'coverage' : 'ordered')}
          closeLoop={c.closeLoop ?? c.routeMode !== 'coverage'}
          duskOverlay={c.duskOverlay ?? Boolean(c.nodes?.length)}
          onSuccess={handleConnectSuccess}
        />
      </div>
    )
  }

  if (isAstrolabeQuest(quest)) {
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {quest.content.questName && (
          <p className="mb-3 text-center text-xs text-mist-muted">{quest.content.questName}</p>
        )}
        <Astrolabe onSuccess={handleAstrolabeSuccess} />
      </div>
    )
  }

  if (isBaGuaPuzzleQuest(quest)) {
    const c = quest.content
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {c.questName && (
          <p className="mb-1 text-center text-xs text-gold-muted">{c.questName}</p>
        )}
        {c.description && (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-mist-faint">
            {c.description}
          </p>
        )}
        <BaGuaTianPuzzle
          key={`${dayConfig.day}-${quest.stepId}`}
          spiritName={c.unlockSpirit ?? '万峰山神'}
          onSuccess={handleBaGuaPuzzleSuccess}
        />
      </div>
    )
  }

  if (isCompassAnomalyQuest(quest)) {
    const c = quest.content
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        <CompassAnomaly
          key={`${dayConfig.day}-${quest.stepId}`}
          imageA={c.imageA}
          imageB={c.imageB}
          spots={c.spots}
          timeLimitSeconds={c.timeLimitSeconds}
          penaltySeconds={c.penaltySeconds}
          targetCount={c.targetCount}
          successTargetName={c.successTargetName}
          questName={c.questName}
          description={c.description}
          onSuccess={handleCompassAnomalySuccess}
          onCancel={handleImmersiveCancel}
          onClose={handleImmersiveCancel}
        />
      </div>
    )
  }

  if (isWindRidingQuest(quest)) {
    const c = quest.content
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {c.questName && (
          <p className="mb-1 text-center text-xs text-gold-muted">{c.questName}</p>
        )}
        {c.description && (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-mist-faint">
            {c.description}
          </p>
        )}
        <WindRiding
          key={`${dayConfig.day}-${quest.stepId}`}
          toLocation={c.toLocation}
          affinityReward={c.affinityReward}
          backgroundImage={c.backgroundImage}
          onComplete={handleWindRidingComplete}
        />
      </div>
    )
  }

  if (isLeylineMatch3Quest(quest)) {
    const c = quest.content
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {c.questName && (
          <p className="mb-1 text-center text-xs text-gold-muted">{c.questName}</p>
        )}
        {c.description && (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-mist-faint">
            {c.description}
          </p>
        )}
        <LeylineMatch3
          key={`${dayConfig.day}-${quest.stepId}`}
          gridSize={c.gridSize}
          maxMoves={c.maxMoves}
          targetWood={c.targetWood}
          targetStone={c.targetStone}
          backgroundImage={c.backgroundImage}
          onComplete={handleLeylineMatch3Complete}
        />
      </div>
    )
  }

  if (isCloudMazeQuest(quest)) {
    const c = quest.content
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-hidden px-2 py-3 ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {c.questName && (
          <p className="mb-1 text-center text-xs text-gold-muted">{c.questName}</p>
        )}
        {c.description && (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-mist-faint">
            {c.description}
          </p>
        )}
        <CloudMazeBall
          key={`${dayConfig.day}-${quest.stepId}`}
          cols={c.cols}
          rows={c.rows}
          backgroundImage={c.backgroundImage}
          goalTarget={c.goalTarget ?? 'ladder'}
          onComplete={handleCloudMazeComplete}
        />
      </div>
    )
  }

  if (isWindBalanceQuest(quest)) {
    const c = quest.content
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {c.questName && (
          <p className="mb-1 text-center text-xs text-gold-muted">{c.questName}</p>
        )}
        {c.description && (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-mist-faint">
            {c.description}
          </p>
        )}
        <WindBalanceGame
          key={`${dayConfig.day}-${quest.stepId}`}
          boardSize={c.boardSize}
          ballCount={c.ballCount}
          trapCount={c.trapCount}
          backgroundImage={c.backgroundImage}
          onComplete={handleWindBalanceComplete}
        />
      </div>
    )
  }

  if (isCloudLeapQuest(quest)) {
    const c = quest.content
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {c.questName && (
          <p className="mb-1 text-center text-xs text-gold-muted">{c.questName}</p>
        )}
        {c.description && (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-mist-faint">
            {c.description}
          </p>
        )}
        <CloudLeapGame
          key={`${dayConfig.day}-${quest.stepId}`}
          milestoneM={c.milestoneM ?? c.targetHeightM}
          pixelsPerMeter={c.pixelsPerMeter}
          spiritImage={c.spiritImage}
          onMilestone={handleCloudLeapMilestone}
          onExit={handleCloudLeapExit}
        />
      </div>
    )
  }

  if (isSliderQuest(quest)) {
    const isTime = isTimeSliderStep(quest)
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {quest.content.questName && (
          <p className="mb-1 text-center text-xs text-mist-muted">{quest.content.questName}</p>
        )}
        {'targetYear' in quest.content && quest.content.targetYear && (
          <p className="mb-3 text-center text-[10px] text-gold-muted">
            目标纪年 · {quest.content.targetYear}
          </p>
        )}
        {isTime ? (
          <TimeSlider onSuccess={handleSliderSuccess} />
        ) : (
          <SilhouetteSlider
            layerCount={
              'layerCount' in quest.content ? quest.content.layerCount : undefined
            }
            targets={'targets' in quest.content ? quest.content.targets : undefined}
            tolerance={'tolerance' in quest.content ? quest.content.tolerance : undefined}
            imageUrl={'imageUrl' in quest.content ? quest.content.imageUrl : undefined}
            imageAspect={
              'imageAspect' in quest.content ? quest.content.imageAspect : undefined
            }
            onSuccess={handleSliderSuccess}
          />
        )}
      </div>
    )
  }

  if (isScratchQuest(quest)) {
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {quest.content.questName && (
          <p className="mb-3 text-center text-xs text-mist-muted">{quest.content.questName}</p>
        )}
        <FossilScratch onSuccess={handleScratchSuccess} />
      </div>
    )
  }

  if (isGearQuest(quest)) {
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {quest.content.questName && (
          <p className="mb-3 text-center text-xs text-mist-muted">{quest.content.questName}</p>
        )}
        <GearPuzzle onSuccess={handleGearSuccess} />
      </div>
    )
  }

  if (isMatrixQuest(quest)) {
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {quest.content.questName && (
          <p className="mb-3 text-center text-xs text-mist-muted">{quest.content.questName}</p>
        )}
        <MatrixPuzzle
          imageUrl={quest.content.imageUrl}
          allowUpload={false}
          onSuccess={handleMatrixSuccess}
        />
      </div>
    )
  }

  if (isAudioCatchQuest(quest)) {
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {quest.content.questName && (
          <p className="mb-1 text-center text-xs text-gold-muted">{quest.content.questName}</p>
        )}
        {quest.content.description && (
          <p className="mb-3 text-center text-xs text-mist-muted">{quest.content.description}</p>
        )}
        <AudioCatcher
          key={`${dayConfig.day}-${quest.stepId}`}
          audioUrl={quest.content.audioUrl}
          onSuccess={handleAudioCatchSuccess}
        />
      </div>
    )
  }

  if (isSimonQuest(quest)) {
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {quest.content.questName && (
          <p className="mb-3 text-center text-xs text-mist-muted">{quest.content.questName}</p>
        )}
        <PentatonicSimon onSuccess={handleSimonSuccess} />
      </div>
    )
  }

  if (isScrollQuest(quest)) {
    const photos = collectScrollPhotos()
    const spirits = collectScrollSpirits(collectedSpirits)

    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {quest.content.questName && (
          <p className="mb-3 text-center text-xs text-mist-muted">{quest.content.questName}</p>
        )}
        <ScrollGenerator
          key={`${dayConfig.day}-${quest.stepId}`}
          photos={photos}
          spirits={spirits}
          onSuccess={handleScrollSuccess}
        />
      </div>
    )
  }

  if (isFossilDragQuest(quest)) {
    const c = quest.content
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {c.questName && (
          <p className="mb-1 text-center text-xs text-gold-muted">{c.questName}</p>
        )}
        {c.description && (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-mist-faint">
            {c.description}
          </p>
        )}
        <FossilDragPuzzle
          key={`${dayConfig.day}-${quest.stepId}`}
          baseImage={c.baseImage}
          onSuccess={handleFossilDragSuccess}
        />
      </div>
    )
  }

  if (isARRebirthQuest(quest)) {
    const c = quest.content
    if (immersiveDismissed) {
      return (
        <ImmersiveCameraPrompt
          quest={quest}
          className={className}
          startLabel="开始 AR 扫描"
          onStart={resumeImmersive}
        />
      )
    }
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {c.questName && (
          <p className="mb-1 text-center text-xs text-gold-muted">{c.questName}</p>
        )}
        <FossilARRebirth
          key={`${dayConfig.day}-${quest.stepId}`}
          skeletonImage={c.skeletonImage}
          spiritImage={c.spiritImage}
          spiritName={c.spiritName ?? c.unlockSpirit}
          description={c.description}
          onSuccess={handleARRebirthSuccess}
          onCancel={handleImmersiveCancel}
          onClose={handleImmersiveCancel}
        />
      </div>
    )
  }

  if (isScanQuest(quest)) {
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {quest.content.questName && (
          <p className="mb-1 text-center text-xs text-gold-muted">{quest.content.questName}</p>
        )}
        <ArtifactScan
          key={`${dayConfig.day}-${quest.stepId}`}
          artifacts={quest.content.artifacts}
          targetCount={quest.content.targetCount}
          description={quest.content.description}
          onSuccess={handleScanSuccess}
        />
      </div>
    )
  }

  if (isWaterTuningQuest(quest)) {
    const c = quest.content
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {c.questName && (
          <p className="mb-1 text-center text-xs text-gold-muted">{c.questName}</p>
        )}
        {c.description && (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-mist-faint">
            {c.description}
          </p>
        )}
        <WaterTuning
          key={`${dayConfig.day}-${quest.stepId}`}
          onComplete={handleWaterTuningComplete}
        />
      </div>
    )
  }

  if (isGorgeBridgeQuest(quest)) {
    const c = quest.content
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {c.questName && (
          <p className="mb-1 text-center text-xs text-gold-muted">{c.questName}</p>
        )}
        {c.description && (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-mist-faint">
            {c.description}
          </p>
        )}
        <GorgeBridgeLink
          key={`${dayConfig.day}-${quest.stepId}`}
          onComplete={handleGorgeBridgeComplete}
        />
      </div>
    )
  }

  if (isGorgeSeaLionQuest(quest)) {
    const c = quest.content
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {c.questName && (
          <p className="mb-1 text-center text-xs text-gold-muted">{c.questName}</p>
        )}
        {c.description && (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-mist-faint">
            {c.description}
          </p>
        )}
        <GorgeSeaLionTrace
          key={`${dayConfig.day}-${quest.stepId}`}
          onComplete={handleGorgeSeaLionComplete}
        />
      </div>
    )
  }

  if (isAbyssRhythmQuest(quest)) {
    const c = quest.content
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {c.questName && (
          <p className="mb-1 text-center text-xs text-gold-muted">{c.questName}</p>
        )}
        {c.description && (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-mist-faint">
            {c.description}
          </p>
        )}
        <AbyssRhythmGame
          key={`${dayConfig.day}-${quest.stepId}`}
          spiritName={c.unlockSpirit}
          surviveSeconds={c.surviveSeconds}
          targetScore={c.targetScore}
          onComplete={handleAbyssRhythmComplete}
        />
      </div>
    )
  }

  if (isPipeConnectQuest(quest)) {
    const c = quest.content
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {c.questName && <p className="mb-1 text-center text-xs text-gold-muted">{c.questName}</p>}
        {c.description && (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-mist-faint">{c.description}</p>
        )}
        <PipeConnectGame key={`${dayConfig.day}-${quest.stepId}`} onComplete={handlePipeConnectComplete} />
      </div>
    )
  }

  if (isHeritageGalleryQuest(quest)) {
    const c = quest.content
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-visible overscroll-none px-2 py-3 scrollbar-none ${className}`}
        data-scroll-lock
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {c.questName && <p className="mb-1 text-center text-xs text-gold-muted">{c.questName}</p>}
        {c.description && (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-mist-faint">{c.description}</p>
        )}
        <HeritageGallery key={`${dayConfig.day}-${quest.stepId}`} onComplete={handleHeritageGalleryComplete} />
      </div>
    )
  }

  if (isLanternMatchQuest(quest)) {
    const c = quest.content
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {c.questName && <p className="mb-1 text-center text-xs text-gold-muted">{c.questName}</p>}
        {c.description && (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-mist-faint">{c.description}</p>
        )}
        <LanternMatchGame
          key={`${dayConfig.day}-${quest.stepId}`}
          photoD5Completed={photoD5Completed}
          onComplete={handleLanternMatchComplete}
        />
      </div>
    )
  }

  if (isIronFlowerConfirmQuest(quest)) {
    const c = quest.content
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {c.questName && <p className="mb-1 text-center text-xs text-gold-muted">{c.questName}</p>}
        {c.description && (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-mist-faint">{c.description}</p>
        )}
        <IronFlowerConfirm
          key={`${dayConfig.day}-${quest.stepId}`}
          watchCooldownSeconds={c.watchCooldownSeconds}
          onComplete={handleIronFlowerConfirmComplete}
        />
      </div>
    )
  }

  if (isOneStrokeQuest(quest)) {
    const c = quest.content
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {c.questName && <p className="mb-1 text-center text-xs text-gold-muted">{c.questName}</p>}
        {c.description && (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-mist-faint">{c.description}</p>
        )}
        <ThousandLanternsGame key={`${dayConfig.day}-${quest.stepId}`} onComplete={handleOneStrokeComplete} />
      </div>
    )
  }

  if (isFragmentScannerQuest(quest)) {
    const c = quest.content
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {c.questName && <p className="mb-1 text-center text-xs text-sky-bright/80">{c.questName}</p>}
        {c.description && (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-mist-faint">{c.description}</p>
        )}
        <FragmentScanner
          key={`${dayConfig.day}-${quest.stepId}`}
          onComplete={handleFragmentScannerComplete}
        />
      </div>
    )
  }

  if (isOfflineCaveQuest(quest)) {
    const c = quest.content
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {c.questName && <p className="mb-1 text-center text-xs text-sky-bright/80">{c.questName}</p>}
        {c.description && (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-mist-faint">{c.description}</p>
        )}
        <OfflineCave key={`${dayConfig.day}-${quest.stepId}`} onComplete={handleOfflineCaveComplete} />
      </div>
    )
  }

  if (isCrystalMinerQuest(quest)) {
    const c = quest.content
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {c.questName && <p className="mb-1 text-center text-xs text-gold-muted">{c.questName}</p>}
        {c.description && (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-mist-faint">{c.description}</p>
        )}
        <CrystalMinerGame
          key={`${dayConfig.day}-${quest.stepId}`}
          introText={c.description}
          onComplete={handleCrystalMinerComplete}
        />
      </div>
    )
  }

  if (isCoreFusionQuest(quest)) {
    const c = quest.content
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {c.questName && <p className="mb-1 text-center text-xs text-amber-200/80">{c.questName}</p>}
        {c.description && (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-mist-faint">{c.description}</p>
        )}
        <CoreFusion key={`${dayConfig.day}-${quest.stepId}`} onComplete={handleCoreFusionComplete} />
      </div>
    )
  }

  if (isCorePlacementQuest(quest)) {
    const c = quest.content
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {c.questName && <p className="mb-1 text-center text-xs text-amber-200/80">{c.questName}</p>}
        {c.description && (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-mist-faint">{c.description}</p>
        )}
        <GrandArrayActivation
          key={`${dayConfig.day}-${quest.stepId}`}
          scope="core"
          onComplete={handleCorePlacementComplete}
        />
      </div>
    )
  }

  if (isSpiritArrayQuest(quest)) {
    const c = quest.content
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {c.questName && <p className="mb-1 text-center text-xs text-cyan-200/80">{c.questName}</p>}
        {c.description && (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-mist-faint">{c.description}</p>
        )}
        <GrandArrayActivation
          key={`${dayConfig.day}-${quest.stepId}`}
          scope="spirits"
          corePreplaced
          onComplete={handleSpiritArrayComplete}
        />
      </div>
    )
  }

  if (isScrollSynthesisQuest(quest)) {
    const c = quest.content
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {c.questName && <p className="mb-3 text-center text-xs text-mist-muted">{c.questName}</p>}
        {c.description && (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-mist-faint">{c.description}</p>
        )}
        <ScrollSynthesis
          key={`${dayConfig.day}-${quest.stepId}`}
          onComplete={handleScrollSynthesisSuccess}
        />
      </div>
    )
  }

  if (isCreditsQuest(quest)) {
    const c = quest.content
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {c.questName && <p className="mb-1 text-center text-xs text-gold-muted">{c.questName}</p>}
        {c.description && (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-mist-faint">{c.description}</p>
        )}
        <EndingCredits key={`${dayConfig.day}-${quest.stepId}`} onComplete={handleCreditsComplete} />
      </div>
    )
  }

  if (isJiexinCheckInQuest(quest)) {
    const c = quest.content
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {c.questName && (
          <p className="mb-1 text-center font-mono text-xs text-cyan-500/70">{c.questName}</p>
        )}
        {c.description && (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-mist-faint">{c.description}</p>
        )}
        <JieXinLBSArrival
          key={`${dayConfig.day}-${quest.stepId}`}
          targetCoords={c.coords}
          onStartScanning={handleJiexinCheckInComplete}
        />
      </div>
    )
  }

  if (isRedDustScannerQuest(quest)) {
    if (immersiveDismissed) {
      return (
        <ImmersiveCameraPrompt
          quest={quest}
          className={className}
          startLabel="开启【灵视】扫描"
          onStart={resumeImmersive}
        />
      )
    }
    return (
      <>
        <p className={`py-2 text-center text-[10px] text-mist-faint ${className}`}>
          全屏灵视任务进行中…
        </p>
        <FullscreenTaskHost>
          <RedDustScanner
            key={`${dayConfig.day}-${quest.stepId}`}
            onComplete={handleRedDustScannerComplete}
            onCancel={handleImmersiveCancel}
          />
        </FullscreenTaskHost>
      </>
    )
  }

  if (isRedeemTicketQuest(quest)) {
    const c = quest.content
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {c.questName && <p className="mb-1 text-center text-xs text-gold-muted">{c.questName}</p>}
        {c.description && (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-mist-faint">{c.description}</p>
        )}
        <TreasureRedeem key={`${dayConfig.day}-${quest.stepId}`} onComplete={handleRedeemTicketComplete} />
      </div>
    )
  }

  if (isWaterAffinityQuest(quest)) {
    const c = quest.content
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {c.questName && <p className="mb-1 text-center text-xs text-sky-bright/80">{c.questName}</p>}
        {c.description && (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-mist-faint">{c.description}</p>
        )}
        <WaterAffinityReward
          key={`${dayConfig.day}-${quest.stepId}`}
          onComplete={handleWaterAffinityComplete}
        />
      </div>
    )
  }

  if (isFireAffinityQuest(quest)) {
    const c = quest.content
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {c.questName && (
          <p className="mb-1 text-center text-xs text-orange-300/85">{c.questName}</p>
        )}
        {c.description && (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-mist-faint">{c.description}</p>
        )}
        <FireAffinityReward
          key={`${dayConfig.day}-${quest.stepId}`}
          onComplete={handleFireAffinityComplete}
        />
      </div>
    )
  }

  if (isRiverRunQuest(quest)) {
    const c = quest.content
    return (
      <div
        className={`flex min-h-[200px] flex-col overflow-y-auto overscroll-none px-2 py-3 scrollbar-none ${className}`}
      >
        <h3 className="mb-1 text-center text-base font-medium text-mist">{quest.title}</h3>
        {c.questName && (
          <p className="mb-1 text-center text-xs text-gold-muted">{c.questName}</p>
        )}
        {c.description && (
          <p className="mb-3 text-center text-[11px] leading-relaxed text-mist-faint">
            {c.description}
          </p>
        )}
        <RiverRunGame
          key={`${dayConfig.day}-${quest.stepId}`}
          surviveSeconds={c.surviveSeconds}
          targetScore={c.targetScore}
          maxHits={c.maxHits}
          affinityReward={c.affinityReward}
          onSuccess={handleRiverRunSuccess}
        />
      </div>
    )
  }

  return null
}

export default MainQuestStage
