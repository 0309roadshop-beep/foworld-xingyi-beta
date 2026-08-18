/**
 * Day 2 流程配置
 * 真实路线：半山观景台（八卦田）→ 古榕树群
 *
 * type 映射：
 *   lbs           → GeoController
 *   story         → StoryPlayer
 *   game-camera   → AlignCamera (questType: tree | bagua)
 *   game-connect  → OneStrokeConnect
 *   game-zhongxing-ar → ZhongXingAR
 *   game-riyue-tracing → RiYueTracing
 *   game-bagua-puzzle → BaGuaTianPuzzle
 *   game-compass-anomaly → CompassAnomaly
 *   game-wind-riding → WindRiding
 *   game-leyline-match3 → LeylineMatch3
 *   game-photo    → PhotoUpload（支线）
 */

/** @type {import('./day1Types').DayConfig} */
export const day2Config = {
  day: 2,
  dayTitle: '木石共生, 唤醒群山',
  compassHint: '罗盘指针正隐隐指向：万峰林半山观景台...',

  /** 主线任务：观景台八卦田段 → 古榕王段 */
  mainQuests: [
    {
      stepId: 0,
      type: 'lbs',
      title: '登临观景台',
      content: {
        targetName: '万峰林半山观景台',
        coords: { lat: 24.98, lng: 104.92 },
        description: '登高望远，八卦田全貌即将在你眼前展开。',
      },
    },
    {
      stepId: 1,
      type: 'story',
      title: '八卦田传说',
      content: {
        dialogues: [
          {
            speaker: '罗盘灵',
            text: '田心八卦，峰林为卦。明代风水师在此布阵，万峰林的地脉之气汇聚于田心。',
          },
          {
            speaker: '罗盘灵',
            text: '先与众星捧月地貌共鸣，再描摹日月田灵纹，最终破解八卦田八门三才阵，唤醒群山巨灵。',
          },
        ],
      },
    },
    {
      stepId: 2,
      type: 'game-zhongxing-ar',
      title: '众星捧月·灵韵共鸣',
      content: {
        questName: '观景台 AR 共鸣',
        description: '将取景框对准众星捧月地貌，长按完成灵韵共鸣，收录破阵线索。',
        rewardLingyuan: 30,
      },
    },
    {
      stepId: 3,
      type: 'story',
      title: '俯瞰日月',
      content: {
        dialogues: [
          {
            speaker: '罗盘灵',
            text: '共鸣成功。群山的地脉已经与你连通。',
          },
          {
            speaker: '罗盘灵',
            text: '现在，把视线往下移。看脚下那些布依族世代耕作的梯田——天地造化，将日与月的倒影刻在了这片大地上。',
          },
          {
            speaker: '罗盘灵',
            text: '去描摹那些「圆」与「弯」的轮廓，开启万峰林八卦阵的生门吧。',
          },
        ],
        rewardLingyuan: 10,
      },
    },
    {
      stepId: 4,
      type: 'game-riyue-tracing',
      title: '日月田·灵纹描摹',
      content: {
        questName: '观景台描摹',
        description: '以指为笔，描摹实景中三处「日月」梯田，感应梯田灵韵。',
        rewardLingyuan: 35,
      },
    },
    {
      stepId: 5,
      type: 'story',
      title: '阵眼浮现',
      content: {
        dialogues: [
          {
            speaker: '罗盘灵',
            text: '漂亮！这三处「日月同辉」的灵纹残影已被系统成功锚定。',
          },
          {
            speaker: '罗盘灵',
            text: '随着日月之力的注入，中央八卦田的能量阵列已经被激活。走吧，去解开那位明代风水师留下的「八门三才」连环阵。',
          },
        ],
        rewardLingyuan: 10,
      },
    },
    {
      stepId: 6,
      type: 'game-bagua-puzzle',
      title: '八卦田·八门三才',
      content: {
        questName: '天地人三才阵',
        description:
          '依已收录的【先天八卦残谱】【三才机括】线索，先八门归位，再三才连环联动破局。',
        unlockSpirit: '万峰山神',
        rewardLingyuan: 100,
      },
    },
    {
      stepId: 7,
      type: 'game-compass-anomaly',
      title: '罗盘异动·灵韵找茬',
      content: {
        questName: '磁场干扰净化',
        description: '罗盘捕捉到微弱生机信号。对比上下影像，在干扰图中找出并净化 5 处灵韵异常。',
        successTargetName: '跳花广场·千年古榕',
        timeLimitSeconds: 60,
        penaltySeconds: 3,
        targetCount: 5,
        rewardLingyuan: 40,
      },
    },
    {
      stepId: 8,
      type: 'game-wind-riding',
      title: '追风骑行·迎风旅途',
      content: {
        questName: '电瓶车迎风骑行',
        description: '骑行前往跳花广场，在真实旅途中感受万峰林山风。',
        toLocation: '跳花广场',
        affinityReward: '乘风亲和',
        rewardLingyuan: 30,
      },
    },
    {
      stepId: 9,
      type: 'story',
      title: '寻踪榕树王',
      content: {
        dialogues: [
          {
            speaker: '罗盘灵',
            text: '乘风抵达跳花广场。循罗盘指引，前方即是挂满红带的千年古榕——树王真踪，近在眼前。',
          },
          {
            speaker: '布依歌谣',
            text: '独木成林冠万峰，根深叶茂锁清风，祈福红带随风舞，历经百载现真踪。',
          },
          {
            speaker: '罗盘灵',
            text: '找到那棵挂满红色祈福带的树王，用罗盘将其灵脉坐标锁定。',
          },
        ],
      },
    },
    {
      stepId: 10,
      type: 'game-camera',
      title: '古榕树王对齐',
      content: { questType: 'tree' },
    },
    {
      stepId: 11,
      type: 'story',
      title: '地脉淤堵',
      content: {
        dialogues: [
          {
            speaker: '罗盘灵',
            text: '坐标锁定了！但情况不太妙，古榕木灵的沉睡之地被杂乱的地脉能量死死缠住了。',
          },
          {
            speaker: '罗盘灵',
            text: '必须手动进行高维能量疏导。把相同频段的地脉元素连在一起消除掉，打通灵脉，木灵才能苏醒！',
          },
        ],
        rewardLingyuan: 0,
      },
    },
    {
      stepId: 12,
      type: 'game-leyline-match3',
      title: '地脉消消乐',
      content: {
        questName: '剔除地脉杂质',
        description:
          '交换相邻元素破除藤蔓锁，汇聚木灵并击碎顽石，双目标达成方可疏通古榕地脉。',
        gridSize: 7,
        maxMoves: 25,
        targetWood: 25,
        targetStone: 15,
        unlockSpirit: '古榕木灵',
        rewardLingyuan: 50,
      },
    },
    {
      stepId: 13,
      type: 'story',
      title: '山岳守护',
      content: {
        dialogues: [
          {
            speaker: '罗盘灵',
            text: '树藏岁月，峰载苍生。布依人依峰而居、伴田而生，山水从来不是风景，而是世代相依的家人。',
          },
          {
            speaker: '罗盘灵',
            text: '万峰山神与古榕木灵已苏醒，今日寻灵圆满。',
          },
        ],
      },
    },
  ],

  /** 当日支线任务：平铺在下拉列表，独立结算 */
  sideQuests: [
    {
      questId: 'day2-side-weave',
      type: 'game-connect',
      title: '支线：布依织锦',
      description: '一笔连成布依族经典的织锦几何纹路。',
      rewardLingyuan: 40,
      isCompleted: false,
    },
    {
      questId: 'day2-side-food',
      type: 'game-photo',
      title: '支线：地道风味补给',
      description: '品尝本地特色蛋炒饭并上传合影。',
      rewardLingyuan: 30,
      isCompleted: false,
    },
    {
      questId: 'day2-side-frame',
      type: 'game-photo',
      title: '支线：几何框景',
      description: '寻找万峰林建筑中特有的方形或圆形窗框，将远山框入其中拍摄大片。',
      rewardLingyuan: 30,
      isCompleted: false,
    },
  ],
}

export default day2Config
