/**
 * Day 1 流程配置
 * 主线 mainQuests：按 stepId 线性推进
 * 支线 sideQuests：独立触发、独立结算（完成状态由 gameStore 记录）
 */

import { DAY1_MUSEUM_ARTIFACTS } from './day1ArtifactScanData'

/** @type {import('./day1Types').DayConfig} */
export const day1Config = {
  day: 1,
  dayTitle: '古国遗梦, 唤灵觉醒',
  compassHint: '罗盘指针正隐隐指向：黔西南州博物馆...',

  /** 主线任务：必须按 stepId 线性顺序完成 */
  mainQuests: [
    {
      stepId: 0,
      type: 'lbs',
      title: '前序契约',
      content: {
        targetName: '亚朵公会基地',
        coords: { lat: 25.09, lng: 104.89 },
        description: '抵达指定灵域节点后，罗盘灵才会为你开启第一段剧情。',
      },
    },
    {
      stepId: 1,
      type: 'story',
      title: '身份激活',
      content: {
        dialogues: [
          {
            speaker: '罗盘灵',
            text: '山河会老，文物不朽。那些史书里模糊的夜郎往事，都藏在纹路的褶皱里。',
          },
        ],
      },
    },
    {
      stepId: 2,
      type: 'game-puzzle',
      title: '解密九宫格残卷',
      content: {
        imageUrl: '/assets/puzzle-copper-chariot.png',
        imageAspect: 1024 / 753,
        gridSize: 3,
        description: '将打乱的铜车马图块复原，唤醒残卷中的灵纹。',
      },
    },
    {
      stepId: 3,
      type: 'game-scan',
      title: '古国器韵寻踪',
      content: {
        questName: '文物图谱扫描验证',
        description:
          '根据唤灵师寻踪线索与馆藏编号找到文物，点击「灵纹扫描」取景锁定后，输入展牌上的 3 位数灵感校验码解除封印，方可解锁文物真名与图谱。',
        targetCount: 6,
        artifacts: DAY1_MUSEUM_ARTIFACTS,
        unlockSpirit: '夜郎铜兽',
        rewardLingyuan: 50,
      },
    },
    {
      stepId: 4,
      type: 'lbs',
      title: '御水之契 · 抵坝盘',
      content: {
        targetName: '坝盘桨板体验点',
        coords: { lat: 25.0882, lng: 104.8978 },
        description:
          '博物馆巡礼已毕。请前往坝盘河畔完成桨板体验——以肉身亲证水流之律，方可开启御水试炼。',
      },
    },
    {
      stepId: 5,
      type: 'story',
      title: '御水之契 · 灵纹应召',
      content: {
        dialogues: [
          {
            speaker: '罗盘灵',
            text: '水已记住你的体温与平衡。接下来，于意念中御波顺流——躲开浮木与暗礁，御水印记自会烙下。',
          },
        ],
      },
    },
    {
      stepId: 6,
      type: 'game-river-run',
      title: '御水之契',
      content: {
        questName: '江河御波试炼',
        description: '点击画面左右切换航道，在顺流中躲避浮木与暗礁。',
        surviveSeconds: 45,
        targetScore: 200,
        maxHits: 3,
        rewardLingyuan: 50,
      },
    },
    {
      stepId: 7,
      type: 'game-water-affinity',
      title: '元素亲和',
      content: {
        questName: '御水亲和觉醒',
        description: '静水试炼圆满，地脉将为你烙下御水印记。',
        affinityReward: '御水亲和',
        rewardLingyuan: 20,
      },
    },
    {
      stepId: 8,
      type: 'story',
      title: '首日落幕',
      content: {
        storyVariant: 'day1-ending',
        endOfDay: true,
        dialogues: [
          {
            speaker: '罗盘灵',
            text: '呼……今天干得漂亮！这枚徽章可是个好东西，以后遇到大瀑布你就知道它的厉害了。第一天的试炼圆满结束，肉体凡胎也该累了，赶紧回酒店休息吧，明天我们去爬山！',
          },
        ],
        rewardLingyuan: 15,
      },
    },
  ],

  /** 当日支线任务：可随时打开，独立结算 */
  sideQuests: [
    {
      questId: 'day1-side-meme',
      type: 'game-sticker',
      title: '支线：文物「显眼包」捕捉',
      description: '为馆内文物拍一张魔性趣味特写，一键生成限定表情包。',
      overlayType: 'meme',
      rewardLingyuan: 50,
      isCompleted: false,
    },
    {
      questId: 'day1-side-totem',
      type: 'game-connect',
      title: '支线:图腾解密',
      description: '将 3 个夜郎神秘符号与现代布依族民俗含义进行一笔连线对齐。',
      matchData: {
        left: [
          { id: 'sun-spiral', label: '日轮螺旋纹', sublabel: '夜郎祭祀符号' },
          { id: 'bronze-beast', label: '铜兽面纹', sublabel: '青铜器图腾' },
          { id: 'water-wave', label: '水波回纹', sublabel: '河谷文明印记' },
        ],
        right: [
          { id: 'water-wave', label: '祈雨丰年', sublabel: '布依水神崇拜' },
          { id: 'sun-spiral', label: '太阳祈福', sublabel: '布依年节礼俗' },
          { id: 'bronze-beast', label: '护寨平安', sublabel: '布依图腾信仰' },
        ],
      },
      rewardLingyuan: 50,
      isCompleted: false,
    },
  ],
}

export default day1Config
