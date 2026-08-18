import type { DayConfig } from './day1Types'

/**
 * Day 6 流程配置 — 幽邃地心 · 人间烟火
 *
 * type 映射：
 *   offline-cave        → OfflineCave
 *   story               → StoryPlayer
 *   game-fragment-scanner → FragmentScanner
 *   game-crystal-miner  → CrystalMinerGame
 *   game-core-fusion    → CoreFusion
 *   game-jiexin-checkin → JieXinLBSArrival
 *   game-red-dust-scanner → RedDustScanner
 */

export const day6Config: DayConfig = {
  day: 6,
  dayTitle: '幽邃地心, 人间烟火',
  compassHint: '罗盘指针沉入地脉深处，信号即将中断...',

  mainQuests: [
    {
      stepId: 0,
      type: 'offline-cave',
      title: '地心结界',
      content: {
        questName: '地脉静默潜航',
        description: '切断外界磁场，锁屏收起手机，专注脚下探洞之路。',
      },
    },
    {
      stepId: 1,
      type: 'story',
      title: '重连地脉',
      content: {
        dialogues: [
          {
            speaker: '罗盘灵',
            text: '滴——信号重连成功！我的天，刚才洞穴深处的磁场完全屏蔽了我。你居然真的在这片无光之域里摸到了远古的阵核残片！',
          },
          {
            speaker: '罗盘灵',
            text: '快，把你在洞里拍到的钟乳石画面传给系统，我来剥离上面附着的降核碎片。',
          },
        ],
        rewardLingyuan: 10,
      },
    },
    {
      stepId: 2,
      type: 'game-fragment-scanner',
      title: '阵核剥离',
      content: {
        questName: '钟乳石影像扫描',
        description: '上传洞内 3 张钟乳石照片，以罗盘扫描剥离被封印的阵核碎片。',
        rewardLingyuan: 35,
      },
    },
    {
      stepId: 3,
      type: 'game-crystal-miner',
      title: '寻觅息壤',
      content: {
        questName: '深层地脉钩取',
        description:
          '提取出的阵核碎片极度排斥彼此！必须深入地层，汲取高密度的【地脉精髓】作为融合的媒介。',
        affinityReward: '土元素亲和',
        rewardLingyuan: 50,
      },
    },
    {
      stepId: 4,
      type: 'game-core-fusion',
      title: '阵核重铸',
      content: {
        questName: '土元素压制融合',
        description: '以土元素亲和之力，将三块排斥的阵核碎片重铸为 Day 7 唤灵大阵所需的完整阵核。',
        rewardLingyuan: 30,
      },
    },
    {
      stepId: 5,
      type: 'story',
      title: '冰冷的阵核',
      content: {
        dialogues: [
          {
            speaker: '罗盘灵',
            text: '阵核终于拼齐了。但是……它的温度太低了，这块地下沉睡了亿万年的石头，根本无法承载明天那些活跃的现代精灵。',
          },
          {
            speaker: '罗盘灵',
            text: '我们需要人间最纯粹的温度来唤醒它。走吧，去兴义老城烟火气最重的街心花园，借红尘之力，为它升温！',
          },
        ],
        rewardLingyuan: 10,
      },
    },
    {
      stepId: 6,
      type: 'game-jiexin-checkin',
      title: '抵达街心',
      content: {
        questName: '街心花园抵达签到',
        description: '携带破损降核抵达街心花园，完成 LBS 坐标锚定后授权红尘灵视。',
        coords: { lat: 25.09, lng: 104.9 },
        rewardLingyuan: 20,
      },
    },
    {
      stepId: 7,
      type: 'game-red-dust-scanner',
      title: '红尘摸金',
      content: {
        questName: '街心花园·灵视扫描',
        description:
          '使用 FOWORLD 视觉保护翻译器的【灵视】功能，扫描市井烟火之物，提取灵韵为破损远古降核充能。',
        rewardLingyuan: 45,
      },
    },
  ],

  sideQuests: [
    {
      questId: 'day6-side-time',
      type: 'game-slider',
      title: '支线：时间滑块',
      description: '拖动地壳、温度等滑块至「2.5亿年前古海洋」刻度。',
      content: {
        questName: '同步地质年代',
        targetYear: '2.5亿年前',
      },
      rewardLingyuan: 40,
      isCompleted: false,
    },
    {
      questId: 'day6-side-scratch',
      type: 'game-scratch',
      title: '支线：化石修复模拟',
      description: '擦拭屏幕，模拟清除化石表面泥土。',
      content: {
        questName: '清除表层泥土',
        fossilType: 'keichousaurus',
      },
      rewardLingyuan: 40,
      isCompleted: false,
    },
  ],
}

export default day6Config
