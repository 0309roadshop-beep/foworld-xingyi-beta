/**
 * Day 3 流程配置
 * 云海破晓 · 玉皇顶 → 湖心吉隆堡 → 虚实闭环
 *
 * type 映射：
 *   lbs              → GeoController
 *   story            → StoryPlayer
 *   game-cloud-maze  → CloudMazeBall（云端迷宫穿雾）
 *   game-cloud-leap  → CloudLeapGame（登云踏雾收服云灵）
 *   game-camera      → AlignCamera (questType: castle)
 *   game-matrix      → MatrixPuzzle
 *   game-sticker     → StickerCamera（支线）
 *   game-pipe        → PipeConnect（支线）
 *   game-photo       → PhotoUpload（支线）
 */

/** @type {import('./day1Types').DayConfig} */
export const day3Config = {
  day: 3,
  dayTitle: '云海破晓, 湖心蜃楼',
  compassHint: '罗盘指针正隐隐指向：玉皇顶...',

  /** 主线任务：线性流转 */
  mainQuests: [
    {
      stepId: 0,
      type: 'lbs',
      title: '登顶追光',
      content: {
        targetName: '玉皇顶最高处',
        coords: { lat: 25.01, lng: 104.91 },
        description: '在破晓时分登顶，云海翻涌处即是今日灵域起点。',
      },
    },
    {
      stepId: 1,
      type: 'story',
      title: '云海秘境',
      content: {
        dialogues: [
          {
            speaker: '罗盘灵',
            text: '清晨的云海翻涌，山间晨雾是神仙留存的仙气。',
          },
          {
            speaker: '罗盘灵',
            text: '浓雾封锁了云顶，先穿过云端迷宫找到云梯，再追上逃向高空的玉皇云灵吧。',
          },
        ],
      },
    },
    {
      stepId: 2,
      type: 'game-cloud-maze',
      title: '云海迷宫试炼',
      content: {
        questName: '穿雾迷宫',
        description: '倾斜手机穿越浓雾，循灵力流光找到云梯入口。',
        cols: 9,
        rows: 11,
        goalTarget: 'ladder',
        backgroundImage: '/assets/silhouette-castle-lake.png',
        rewardLingyuan: 30,
      },
    },
    {
      stepId: 3,
      type: 'story',
      title: '迷雾尽散',
      content: {
        dialogues: [
          {
            speaker: '罗盘灵',
            text: '呼，终于穿过这片迷雾了！看上面，玉皇云灵在云层顶端调皮呢，快，借着风的浮力追上它！',
          },
        ],
      },
    },
    {
      stepId: 4,
      type: 'game-cloud-leap',
      title: '追云擒灵',
      content: {
        questName: '登云踏雾',
        description: '踏着云朵向上攀登，在千仞云巅捕获玉皇云灵。',
        milestoneM: 1000,
        spiritImage: '/assets/silhouette-castle-lake.png',
        unlockSpirit: '玉皇云灵',
        rewardLingyuan: 50,
      },
    },
    {
      stepId: 5,
      type: 'lbs',
      title: '湖畔幻境',
      content: {
        targetName: '万峰湖畔/吉隆堡',
        coords: { lat: 24.95, lng: 104.98 },
        description: '循罗盘指引，前往湖心古堡所在的幻境节点。',
      },
    },
    {
      stepId: 6,
      type: 'game-camera',
      title: '梦幻相框·城堡定格',
      content: {
        questType: 'castle',
        questName: '梦幻相框对齐',
        description: '将取景框对准湖心古堡实景，与全息城堡灵纹精准叠合后快门定格。',
      },
    },
    {
      stepId: 7,
      type: 'game-matrix',
      title: '城堡实景矩阵还原',
      content: {
        questName: '重组城堡碎片',
        imageUrl: '/assets/silhouette-castle-lake.png',
        unlockSpirit: '湖心蜃灵',
        rewardLingyuan: 100,
      },
    },
    {
      stepId: 8,
      type: 'story',
      title: '虚实闭环',
      content: {
        dialogues: [
          {
            speaker: '罗盘灵',
            text: '云海藏星河，湖岛纳幻境。山河能容纳天地辽阔，也能安放人间乡愁。',
          },
          {
            speaker: '罗盘灵',
            text: '玉皇云灵与湖心蜃灵已唤醒，虚实之间，皆是心底向往的秘境。',
          },
        ],
      },
    },
  ],

  /** 当日支线任务：平铺在下拉列表，独立结算 */
  sideQuests: [
    {
      questId: 'day3-side-coffee',
      type: 'game-sticker',
      title: '支线：城堡之眼·咖香掠影',
      description: '将咖啡杯与窗外吉隆堡同框，拍下一张电影胶片感大片。',
      overlayType: 'film',
      rewardLingyuan: 40,
      isCompleted: false,
    },
    {
      questId: 'day3-side-pipe',
      type: 'game-pipe',
      title: '支线：水流轨迹',
      description: '接通古老水管引流，完成连线小游戏。',
      rewardLingyuan: 40,
      isCompleted: false,
    },
    {
      questId: 'day3-side-boat',
      type: 'game-photo',
      title: '支线：航线大片',
      description: '乘坐游船时，根据三分法构图拍下高级感大片。',
      rewardLingyuan: 30,
      isCompleted: false,
    },
  ],
}

export default day3Config
