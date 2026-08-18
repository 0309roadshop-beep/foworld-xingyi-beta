import type { DialogueLine } from '../components/story/StoryPlayer'
import type { OverlayType } from '../components/camera/StickerCamera'
import type { QuestType } from '../components/camera/AlignCamera'
import type { GeoMatchData } from '../components/geo/GeoMatch'

/** 全天数通用任务类型 — 映射 React 组件 */
export type DayQuestType =
  | 'lbs'
  | 'story'
  | 'game-puzzle'
  | 'game-sticker'
  | 'game-geo-match'
  | 'game-camera'
  | 'game-connect'
  | 'game-astrolabe'
  | 'game-photo'
  | 'game-slider'
  | 'game-matrix'
  | 'game-pipe'
  | 'game-audio-catch'
  | 'game-simon'
  | 'game-match'
  | 'game-gear'
  | 'game-scratch'
  | 'game-scroll'
  | 'game-form'
  | 'game-scan'
  | 'game-fossil-drag'
  | 'game-ar-rebirth'
  | 'game-river-run'
  | 'game-zhongxing-ar'
  | 'game-riyue-tracing'
  | 'game-bagua-puzzle'
  | 'game-compass-anomaly'
  | 'game-wind-riding'
  | 'game-leyline-match3'
  | 'game-wind-balance'
  | 'game-cloud-maze'
  | 'game-cloud-leap'
  | 'game-water-tuning'
  | 'game-gorge-bridge'
  | 'game-gorge-sealion'
  | 'game-abyss-rhythm'
  | 'game-pipe-connect'
  | 'game-heritage-gallery'
  | 'game-lantern-match'
  | 'game-one-stroke'
  | 'offline-cave'
  | 'game-crystal-miner'
  | 'redeem-ticket'
  | 'game-fragment-scanner'
  | 'game-core-fusion'
  | 'game-jiexin-checkin'
  | 'game-red-dust-scanner'
  | 'game-water-affinity'
  | 'game-fire-affinity'
  | 'game-iron-flower-confirm'
  | 'game-core-placement'
  | 'game-spirit-array'
  | 'game-scroll-synthesis'
  | 'credits'

/** @deprecated 请改用 DayQuestType */
export type Day1QuestType = DayQuestType

export interface DayLbsContent {
  targetName: string
  coords: { lat: number; lng: number }
  description?: string
}

export interface DayStoryContent {
  dialogues: DialogueLine[]
  unlockSpirit?: string
  rewardLingyuan?: number
  affinityReward?: string
  /** iron-flower = 消消乐后过渡剧情；day5-lantern-guide = 浴火亲和后千灯指引 */
  storyVariant?: 'default' | 'iron-flower' | 'day5-lantern-guide' | 'cave-rest' | 'earth-awakening' | 'day1-ending'
  /** 为 true 时须玩家手动结束当日，不自动进入下一天 */
  endOfDay?: boolean
}

export interface DayPuzzleContent {
  imageUrl: string
  imageAspect?: number
  gridSize?: number
  title?: string
  questName?: string
  description?: string
}

/** AlignCamera（questType）或骨架扫描（artifacts） */
export interface DayCameraContent {
  questType?: QuestType
  /** align = AR 对齐；costume = 换装打卡；cave-exit = 出洞水印拍照 */
  cameraMode?: 'align' | 'costume' | 'cave-exit'
  questName?: string
  description?: string
  unlockSpirit?: string
  rewardLingyuan?: number
  targetCount?: number
  artifacts?: {
    id: string
    label: string
    sublabel?: string
    imageUrl?: string
  }[]
}

/** OneStrokeConnect / ConstellationConnect — 星芒 / 织锦 / 灯火连线 */
export interface ConnectNode {
  x: number
  y: number
  label?: string
}

export interface DayConnectContent {
  questName?: string
  unlockSpirit?: string
  rewardLingyuan?: number
  /** 星座连线底图 */
  bgImage?: string
  /** 连通后浮现的幻兽插画 */
  spiritImage?: string
  /** 灯火节点坐标（0–100 百分比） */
  nodes?: ConnectNode[]
  /** coverage 全覆盖 | ordered 按序 */
  routeMode?: 'coverage' | 'ordered'
  closeLoop?: boolean
  duskOverlay?: boolean
}

/** Astrolabe — 同心星盘（旧版，TaskDetail 调试保留） */
export interface DayAstrolabeContent {
  questName?: string
  unlockSpirit?: string
  rewardLingyuan?: number
}

/** BaGuaTianPuzzle — 八卦田三环同心解密 */
export interface DayBaGuaPuzzleContent {
  questName?: string
  description?: string
  unlockSpirit?: string
  rewardLingyuan?: number
}

/** SilhouetteSlider — 视差剪影（无 targetYear） */
export interface DaySliderContent {
  questName?: string
  unlockSpirit?: string
  rewardLingyuan?: number
  /** 视差层数，默认 3（远/中/近） */
  layerCount?: number
  /** 各层目标滑块值 0–100 */
  targets?: number[]
  /** 对齐容差 ±N% */
  tolerance?: number
  imageUrl?: string
  imageAspect?: number
}

/** TimeSlider — 地质时间滑块（含 targetYear 时与 game-slider 联用） */
export interface DayTimeSliderContent {
  questName?: string
  targetYear?: string
  rewardLingyuan?: number
}

/** FossilScratch — 化石刮刮乐 */
export interface DayScratchContent {
  questName?: string
  fossilType?: string
  unlockSpirit?: string
  rewardLingyuan?: number
}

/** MatrixPuzzle — 实景矩阵 */
export interface DayMatrixContent {
  questName?: string
  description?: string
  imageUrl?: string
  unlockSpirit?: string
  rewardLingyuan?: number
}

/** AudioCatcher — 飞瀑集音 */
export interface DayAudioCatchContent {
  questName?: string
  description?: string
  audioUrl?: string
}

/** PentatonicSimon — 五音重奏 */
export interface DaySimonContent {
  questName?: string
  unlockSpirit?: string
  rewardLingyuan?: number
}

/** GearPuzzle — 机械齿轮组装 */
export interface DayGearContent {
  questName?: string
  unlockSpirit?: string
  rewardLingyuan?: number
}

/** ScrollGenerator — 终章百灵绘卷 */
export interface DayScrollContent {
  questName?: string
  rewardLingyuan?: number
}

/** FossilDragPuzzle — 骨骼碎片拖拽归位 */
export interface DayFossilDragContent {
  questName?: string
  description?: string
  baseImage?: string
  rewardLingyuan?: number
}

/** FossilARRebirth — 扫描骨肉重塑 */
export interface DayARRebirthContent {
  questName?: string
  description?: string
  skeletonImage?: string
  spiritImage?: string
  spiritName?: string
  unlockSpirit?: string
  rewardLingyuan?: number
}

/** ArtifactScan — 文物图谱扫描验证 */
export interface DayScanArtifact {
  id: string
  /** 馆藏编号，验证前即展示 */
  catalogNo: string
  /** 唤灵师寻踪线索，验证前展示 */
  clue: string
  /** 文物名称，验证后解锁展示 */
  label: string
  /** 展牌 3 位数灵感校验码 */
  inspirationCode: string
  imageUrl?: string
  /** @deprecated 请改用 catalogNo + clue */
  sublabel?: string
}

export interface DayScanContent {
  questName?: string
  description?: string
  targetCount?: number
  artifacts: DayScanArtifact[]
  unlockSpirit?: string
  rewardLingyuan?: number
}

/** ZhongXingAR — 众星捧月观景台灵韵共鸣 */
export interface DayZhongXingARContent {
  questName?: string
  description?: string
  rewardLingyuan?: number
}

/** RiYueTracing — 日月田观景台描摹 */
export interface DayRiYueTracingContent {
  questName?: string
  description?: string
  rewardLingyuan?: number
}

/** WindRiding — 追风骑行过渡与乘风亲和 */
export interface DayWindRidingContent {
  questName?: string
  description?: string
  toLocation?: string
  affinityReward?: string
  backgroundImage?: string
  rewardLingyuan?: number
}

/** CloudMazeBall — 云端迷宫倾斜滚球 */
export interface DayCloudMazeContent {
  questName?: string
  description?: string
  cols?: number
  rows?: number
  backgroundImage?: string
  /** 终点：云梯入口（穿雾）或云灵图腾（旧版） */
  goalTarget?: 'spirit' | 'ladder'
  rewardLingyuan?: number
}

/** WindBalanceGame — 御风引气重力平衡盘 */
export interface DayWindBalanceContent {
  questName?: string
  description?: string
  boardSize?: number
  ballCount?: number
  trapCount?: number
  backgroundImage?: string
  unlockSpirit?: string
  rewardLingyuan?: number
}

/** CloudLeapGame — 登云踏雾垂直跳跃 */
export interface DayCloudLeapContent {
  questName?: string
  description?: string
  /** 里程碑高度（米），达成解锁精灵，游戏继续无尽模式 */
  milestoneM?: number
  /** @deprecated 请改用 milestoneM */
  targetHeightM?: number
  pixelsPerMeter?: number
  spiritImage?: string
  unlockSpirit?: string
  rewardLingyuan?: number
}

/** LeylineMatch3 — 地脉消消乐 */
export interface DayLeylineMatch3Content {
  questName?: string
  description?: string
  gridSize?: number
  maxMoves?: number
  targetWood?: number
  targetStone?: number
  backgroundImage?: string
  unlockSpirit?: string
  rewardLingyuan?: number
}

/** CompassAnomaly — 罗盘异动灵韵找茬 */
export interface DayCompassAnomalyContent {
  questName?: string
  description?: string
  imageA?: string
  imageB?: string
  spots?: import('./compassAnomalyConfig').SpotDifference[]
  timeLimitSeconds?: number
  penaltySeconds?: number
  targetCount?: number
  successTargetName?: string
  rewardLingyuan?: number
}

/** WaterTuning — 激流调音 */
export interface DayWaterTuningContent {
  questName?: string
  description?: string
  rewardLingyuan?: number
}

/** GorgeBridgeLink — 谷底断桥地脉连线 */
export interface DayGorgeBridgeContent {
  questName?: string
  description?: string
  rewardLingyuan?: number
}

/** GorgeSeaLionTrace — 海狮飞瀑波段解密 */
export interface DayGorgeSeaLionContent {
  questName?: string
  description?: string
  rewardLingyuan?: number
}

/** PipeConnectGame — 引流溯源接水管 */
export interface DayPipeConnectContent {
  questName?: string
  description?: string
  rewardLingyuan?: number
}

/** HeritageGallery — 非遗图鉴收集 */
export interface DayHeritageGalleryContent {
  questName?: string
  description?: string
  rewardLingyuan?: number
}

/** LanternMatchGame — 千灯结缘连连看（12 对 / 24 图块） */
export interface DayLanternMatchContent {
  questName?: string
  description?: string
  rewardLingyuan?: number
  /** 解锁前置：Photo_D5 任务 type */
  unlockAfterType?: 'game-heritage-gallery'
}

/** ThousandLanternsGame / QianDengJieYin — 千灯结印实景连线唤灵 */
export interface DayOneStrokeContent {
  questName?: string
  description?: string
  unlockSpirit?: string
  rewardLingyuan?: number
  /** 结印完成后自动触发当日收束（endDay） */
  endOfDay?: boolean
}

/** OfflineCave — 地心静默潜航 */
export interface DayOfflineCaveContent {
  questName?: string
  description?: string
}

/** CrystalMinerGame — 地脉精髓汲取（黄金矿工） */
export interface DayCrystalMinerContent {
  questName?: string
  description?: string
  affinityReward?: string
  rewardLingyuan?: number
}

/** TreasureRedeem — O2O 实体核销兑换 */
export interface DayRedeemTicketContent {
  questName?: string
  description?: string
  rewardLingyuan?: number
}

/** FragmentScanner — 阵核碎片照片扫描 */
export interface DayFragmentScannerContent {
  questName?: string
  description?: string
  rewardLingyuan?: number
}

/** CoreFusion — 阵核重铸融合 */
export interface DayCoreFusionContent {
  questName?: string
  description?: string
  rewardLingyuan?: number
}

/** JiexinCheckIn — 街心花园 LBS 打卡引导 */
export interface DayJiexinCheckInContent {
  questName?: string
  description?: string
  coords: { lat: number; lng: number }
  rewardLingyuan?: number
}

/** RedDustScanner — 街心花园红尘摸金 AR 灵视扫描 */
export interface DayRedDustScannerContent {
  questName?: string
  description?: string
  rewardLingyuan?: number
}

/** GrandArrayActivation — 阵核归位 */
export interface DayCorePlacementContent {
  questName?: string
  description?: string
  rewardLingyuan?: number
}

/** GrandArrayActivation — 万灵归宗 */
export interface DaySpiritArrayContent {
  questName?: string
  description?: string
  rewardLingyuan?: number
}

/** ScrollGenerator — 百灵绘卷终章合成 */
export interface DayScrollSynthesisContent {
  questName?: string
  description?: string
  rewardLingyuan?: number
}

/** FinaleCredits — 终局落幕 */
export interface DayCreditsContent {
  questName?: string
  description?: string
  rewardLingyuan?: number
}

/** AbyssRhythmGame — 深渊太鼓四轨音游 */
export interface DayAbyssRhythmContent {
  questName?: string
  description?: string
  unlockSpirit?: string
  rewardLingyuan?: number
  surviveSeconds?: number
  targetScore?: number
}

/** WaterAffinityReward — 御水亲和徽章获取 */
export interface DayWaterAffinityContent {
  questName?: string
  description?: string
  affinityReward?: string
  rewardLingyuan?: number
}

/** IronFlowerConfirm — 打铁花观演完毕确认 */
export interface DayIronFlowerConfirmContent {
  questName?: string
  description?: string
  /** 观演冷却秒数，0 表示可立即汲取灵火 */
  watchCooldownSeconds?: number
  rewardLingyuan?: number
}

/** FireAffinityReward — 浴火亲和获取（非全天结算） */
export interface DayFireAffinityContent {
  questName?: string
  description?: string
  affinityReward?: string
  rewardLingyuan?: number
}

/** RiverRunGame — 御水之契江河御波试炼 */
export interface DayRiverRunContent {
  questName?: string
  description?: string
  /** 胜利获得的元素属性名（仅展示，不解释用途） */
  affinityReward?: string
  /** 坚持秒数即胜利 */
  surviveSeconds?: number
  /** 达到积分即胜利 */
  targetScore?: number
  /** 最大撞击次数，超出则失败 */
  maxHits?: number
  rewardLingyuan?: number
}

export type DayMainQuestContent =
  | DayLbsContent
  | DayStoryContent
  | DayPuzzleContent
  | DayCameraContent
  | DayConnectContent
  | DayAstrolabeContent
  | DayBaGuaPuzzleContent
  | DaySliderContent
  | DayMatrixContent
  | DayAudioCatchContent
  | DaySimonContent
  | DayGearContent
  | DayTimeSliderContent
  | DayScratchContent
  | DayScrollContent
  | DayScanContent
  | DayFossilDragContent
  | DayARRebirthContent
  | DayWaterAffinityContent
  | DayFireAffinityContent
  | DayIronFlowerConfirmContent
  | DayRiverRunContent
  | DayZhongXingARContent
  | DayRiYueTracingContent
  | DayCompassAnomalyContent
  | DayWindRidingContent
  | DayLeylineMatch3Content
  | DayWindBalanceContent
  | DayCloudMazeContent
  | DayCloudLeapContent
  | DayWaterTuningContent
  | DayGorgeBridgeContent
  | DayGorgeSeaLionContent
  | DayAbyssRhythmContent
  | DayPipeConnectContent
  | DayHeritageGalleryContent
  | DayLanternMatchContent
  | DayOneStrokeContent
  | DayOfflineCaveContent
  | DayCrystalMinerContent
  | DayRedeemTicketContent
  | DayFragmentScannerContent
  | DayCoreFusionContent
  | DayJiexinCheckInContent
  | DayRedDustScannerContent
  | DayCorePlacementContent
  | DaySpiritArrayContent
  | DayScrollSynthesisContent
  | DayCreditsContent

/** 主线步骤（不含纯支线 type） */
export type DayMainQuestType = Exclude<
  DayQuestType,
  'game-sticker' | 'game-geo-match' | 'game-match' | 'game-photo' | 'game-pipe' | 'game-form'
>

export interface DayMainQuest {
  stepId: number
  type: DayMainQuestType
  title: string
  content: DayMainQuestContent
}

export interface DaySideQuestSticker {
  questId: string
  type: 'game-sticker'
  title: string
  description: string
  overlayType: OverlayType
  rewardLingyuan?: number
  isCompleted: boolean
}

export interface DaySideQuestGeoMatch {
  questId: string
  type: 'game-geo-match' | 'game-match'
  title: string
  description: string
  matchData: GeoMatchData
  rewardLingyuan?: number
  isCompleted: boolean
}

export interface DaySideQuestConnect {
  questId: string
  type: 'game-connect'
  title: string
  description: string
  /** 若提供 matchData，则渲染 GeoMatch 连线（如图腾解密）；否则为一笔画连线 */
  matchData?: GeoMatchData
  rewardLingyuan?: number
  isCompleted: boolean
}

export interface DaySideQuestPhoto {
  questId: string
  type: 'game-photo'
  title: string
  description: string
  rewardLingyuan?: number
  isCompleted: boolean
}

export interface DaySideQuestPipe {
  questId: string
  type: 'game-pipe'
  title: string
  description: string
  rewardLingyuan?: number
  isCompleted: boolean
}

export interface DaySideQuestForm {
  questId: string
  type: 'game-form'
  title: string
  description: string
  rewardLingyuan?: number
  isCompleted: boolean
}

export interface DaySideQuestSlider {
  questId: string
  type: 'game-slider'
  title: string
  description: string
  content?: DayTimeSliderContent | DaySliderContent
  rewardLingyuan?: number
  isCompleted: boolean
}

export interface DaySideQuestScratch {
  questId: string
  type: 'game-scratch'
  title: string
  description: string
  content?: DayScratchContent
  rewardLingyuan?: number
  isCompleted: boolean
}

export type DaySideQuest =
  | DaySideQuestSticker
  | DaySideQuestGeoMatch
  | DaySideQuestConnect
  | DaySideQuestPhoto
  | DaySideQuestPipe
  | DaySideQuestForm
  | DaySideQuestSlider
  | DaySideQuestScratch

/** 单天剧情驱动配置 */
export interface DayConfig {
  day: number
  dayTitle: string
  compassHint: string
  mainQuests: DayMainQuest[]
  sideQuests: DaySideQuest[]
}

/** @deprecated 请改用 DayConfig */
export type Day1Config = DayConfig

/** @deprecated 请改用 DayLbsContent */
export type Day1LbsContent = DayLbsContent
/** @deprecated 请改用 DayStoryContent */
export type Day1StoryContent = DayStoryContent
/** @deprecated 请改用 DayPuzzleContent */
export type Day1PuzzleContent = DayPuzzleContent
/** @deprecated 请改用 DayMainQuest */
export type Day1MainQuest = DayMainQuest
/** @deprecated 请改用 DaySideQuest */
export type Day1SideQuest = DaySideQuest

/** @deprecated 旧扁平结构别名 */
export interface Day1Step {
  id: string
  type: DayQuestType
  content: DayMainQuestContent
}
