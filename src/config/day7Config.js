/**
 * Day 7 流程配置 — 终章百灵绘卷
 *
 * type 映射：
 *   lbs                    → GeoController
 *   game-core-placement    → GrandArrayActivation（阵核归位）
 *   game-spirit-array      → GrandArrayActivation（万灵归宗）
 *   story                  → EarthAwakeningStory（storyVariant: earth-awakening）
 *   game-scroll-synthesis  → ScrollSynthesis
 *   credits                → EndingCredits
 *   game-form              → FeedbackForm（支线）
 */

/** @type {import('./day1Types').DayConfig} */
export const day7Config = {
  day: 7,
  dayTitle: '百灵归巢, 绘卷飞升',
  compassHint: '罗盘指针正剧烈颤动，指向最初的起点...',

  mainQuests: [
    {
      stepId: 0,
      type: 'lbs',
      title: '阵眼现世',
      content: {
        targetName: '寻灵公会基地 · 终局阵眼',
        coords: { lat: 25.09, lng: 104.89 },
        description: '罗盘剧烈颤动，指向七日契约的起点。抵达阵眼，终局大阵即将现世。',
      },
    },
    {
      stepId: 1,
      type: 'game-core-placement',
      title: '阵核归位',
      content: {
        questName: '地脉阵核嵌入',
        description: '将 Day 6 重铸的【地脉阵核】拖入大阵中央的阵眼凹槽。',
        rewardLingyuan: 80,
      },
    },
    {
      stepId: 2,
      type: 'game-spirit-array',
      title: '万灵归宗',
      content: {
        questName: '七灵归位',
        description: '将七日寻灵所得的灵兽依次放入阵盘边缘的七座底座。',
        rewardLingyuan: 100,
      },
    },
    {
      stepId: 3,
      type: 'story',
      title: '地脉苏醒',
      content: {
        storyVariant: 'earth-awakening',
        dialogues: [
          {
            speaker: '地脉',
            text: '阵核与万灵同频……沉睡的地脉正在苏醒，喀斯特的山骨发出低沉的共鸣。',
          },
        ],
        rewardLingyuan: 50,
      },
    },
    {
      stepId: 4,
      type: 'game-scroll-synthesis',
      title: '百灵绘卷',
      content: {
        questName: '凝结七日灵韵',
        description: '将七日山河记忆凝聚为永恒的【百灵绘卷】长图。',
        rewardLingyuan: 200,
      },
    },
    {
      stepId: 5,
      type: 'credits',
      title: '终局落幕',
      content: {
        questName: '七日圆满',
        description: '罗盘的微光即将熄灭，但山河会记得你来过的痕迹。',
        rewardLingyuan: 30,
      },
    },
  ],

  sideQuests: [
    {
      questId: 'day7-side-feedback',
      type: 'game-form',
      title: '支线：寻灵感言',
      description: '分享你对这次内测之旅的真实感受，帮助 FOWORLD 进化。',
      rewardLingyuan: 100,
      isCompleted: false,
    },
  ],
}

export default day7Config
