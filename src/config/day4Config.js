/**
 * Day 4 流程配置
 * 深渊裂谷 · 马岭河峡谷
 *
 * type 映射：
 *   lbs                  → GeoController
 *   story                → StoryPlayer
 *   game-camera          → AlignCamera (questType: bridge)
 *   game-gorge-bridge    → GorgeBridgeLink（谷底断桥）
 *   game-gorge-sealion   → GorgeSeaLionTrace（海狮飞瀑）
 *   game-abyss-rhythm    → AbyssRhythmGame
 *   game-water-tuning    → WaterTuning（独立试玩 / 可支线化）
 *   game-match           → GeoMatch（支线）
 *   game-photo           → PhotoUpload（支线）
 */

/** @type {import('./day1Types').DayConfig} */
export const day4Config = {
  day: 4,
  dayTitle: '深渊裂谷, 水之回响',
  compassHint: '罗盘指针正隐隐指向：马岭河峡谷...',

  /** 主线任务：线性流转（观景大桥 → 谷底栈道 → 太鼓终章） */
  mainQuests: [
    {
      stepId: 0,
      type: 'lbs',
      title: '抵达峡谷',
      content: {
        targetName: '马岭河峡谷观景大桥',
        coords: { lat: 25.1, lng: 104.95 },
        description: '检票口外先登观景大桥俯瞰裂谷，再乘电梯下至谷底栈道。',
      },
    },
    {
      stepId: 1,
      type: 'story',
      title: '狂暴磁场',
      content: {
        dialogues: [
          {
            speaker: '罗盘灵',
            text: '马岭河峡谷是“地球最美的伤疤”。瀑布轰鸣中，磁场剧烈震荡，寻常灵器已无法集音。',
          },
          {
            speaker: '罗盘灵',
            text: '磁场过载！已为你自动激活【御水亲和】——先在桥上俯瞰封存峡谷残片，再下至谷底寻声。',
          },
        ],
      },
    },
    {
      stepId: 2,
      type: 'game-camera',
      title: '观景大桥俯瞰拍摄',
      content: {
        questType: 'bridge',
        questName: '峡谷之眼留影',
        description: '在观景大桥上对准峡谷对峙与飞瀑，封存视觉残片。',
        rewardLingyuan: 20,
      },
    },
    {
      stepId: 3,
      type: 'game-gorge-bridge',
      title: '谷底断桥解密',
      content: {
        questName: '断桥地脉连线',
        description: '乘电梯下至谷底栈道，在湿滑断桥处连通地脉副歌。',
        rewardLingyuan: 15,
      },
    },
    {
      stepId: 4,
      type: 'game-gorge-sealion',
      title: '海狮飞瀑波段解密',
      content: {
        questName: '海狮化石共鸣',
        description: '在飞瀑轰鸣中辨识频段，点选共鸣的海狮灵纹剪影。',
        rewardLingyuan: 15,
      },
    },
    {
      stepId: 5,
      type: 'story',
      title: '出谷与回响',
      content: {
        dialogues: [
          {
            speaker: '罗盘灵',
            text: '断桥副歌与海狮和弦已齐备。走出峡谷时，四股水脉将在谷底汇成太鼓回响。',
          },
          {
            speaker: '罗盘灵',
            text: '以四轨共鸣重奏此曲，狂暴之水或将重归宁静。唤灵师，请开始最终演奏。',
          },
        ],
      },
    },
    {
      stepId: 6,
      type: 'game-abyss-rhythm',
      title: '深渊太鼓',
      content: {
        questName: '四轨水潭共鸣',
        description: '在四条水脉轨道上演奏，坚持 60 秒且灵力护盾未破即通关。',
        unlockSpirit: '峡谷水灵',
        rewardLingyuan: 100,
        surviveSeconds: 60,
        targetScore: 2400,
      },
    },
  ],

  /** 当日支线任务 */
  sideQuests: [
    {
      questId: 'day4-side-geomatch',
      type: 'game-match',
      title: '支线:地质时间胶囊',
      description:
        '在主栈道旁找到官方地质科普解说牌，完成 3 项远古化石图形匹配小游戏。',
      matchData: {
        left: [
          {
            id: 'keichousaurus',
            label: '贵州龙',
            sublabel: '峡谷化石层',
            imageUrl: '/assets/fossil-keichousaurus.png',
          },
          {
            id: 'copper-chariot',
            label: '铜车马',
            sublabel: '夜郎遗存',
            imageUrl: '/assets/puzzle-copper-chariot.png',
          },
          {
            id: 'canyon-strata',
            label: '峡谷层理',
            sublabel: '流水侵蚀面',
          },
        ],
        right: [
          {
            id: 'canyon-strata',
            label: '第四纪',
            sublabel: '喀斯特深切期',
          },
          {
            id: 'keichousaurus',
            label: '三叠纪',
            sublabel: '浅海爬行动物',
          },
          {
            id: 'copper-chariot',
            label: '汉代',
            sublabel: '青铜文化高峰',
          },
        ],
      },
      rewardLingyuan: 40,
      isCompleted: false,
    },
    {
      questId: 'day4-side-photo',
      type: 'game-photo',
      title: '支线：峡谷绝佳视界',
      description: '在悬崖观景桥上，拍下一张峡谷对峙、飞瀑直下的视觉大片。',
      rewardLingyuan: 30,
      isCompleted: false,
    },
  ],
}

export default day4Config
