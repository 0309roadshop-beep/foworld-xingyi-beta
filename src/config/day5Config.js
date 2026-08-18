/**
 * Day 5 流程配置 — 峰林布依 · 千灯水寨非遗织梦
 *
 * 尾声状态机（严格 A → B → C → D）：
 *   A 打铁花观演 + 浴火亲和（step 4–6，不触发 endDay）
 *   B 终极指引剧情（step 7）
 *   C 千灯结印 QianDengJieYin（step 8，最后可交互节点）
 *   D 唤醒布依千灯灵 + 灵源结算 + endDay（step 8 onComplete）
 *
 * 完整顺序：
 *   0 霓裳入局 → 1 引流溯源 → 2 寻遗织梦 → 3 千灯结缘
 *   4 地脉连通剧情 → 5 观演确认 → 6 浴火亲和
 *   7 千灯指引剧情 → 8 千灯结印
 */

/** @type {import('./day1Types').DayConfig} */
export const day5Config = {
  day: 5,
  dayTitle: '千灯水寨, 非遗织梦',
  compassHint: '罗盘指针正隐隐指向：峰林布依景区...',

  mainQuests: [
    {
      stepId: 0,
      type: 'game-camera',
      title: '霓裳入局',
      content: {
        cameraMode: 'costume',
        questName: '布依换装打卡',
        description: '穿上布依族传统服饰，融入当地风土。',
        rewardLingyuan: 20,
      },
    },
    {
      stepId: 1,
      type: 'game-pipe-connect',
      title: '引流溯源',
      content: {
        questName: '接通水寨地脉',
        description: '旋转管段，将源头灵流引至水车阵眼，重启非遗动力大阵。',
        rewardLingyuan: 30,
      },
    },
    {
      stepId: 2,
      type: 'game-heritage-gallery',
      title: '寻遗织梦',
      content: {
        questName: '非遗图鉴留影',
        description:
          '为扎染、八音、铜鼓、银饰、竹编、织锦六项非遗各上传一张实景照片，收录科普图鉴。',
        rewardLingyuan: 40,
      },
    },
    {
      stepId: 3,
      type: 'game-lantern-match',
      title: '千灯结缘',
      content: {
        questName: '灯笼连连看',
        description:
          '餐厅小憩，以 12 组非遗图腾自闭环生成 4×6 阵图（24 图块）。需完成寻遗织梦六项留影后方可入场。',
        unlockAfterType: 'game-heritage-gallery',
        rewardLingyuan: 40,
      },
    },
    {
      stepId: 4,
      type: 'story',
      title: '地脉连通',
      content: {
        storyVariant: 'iron-flower',
        dialogues: [],
        rewardLingyuan: 20,
      },
    },
    {
      stepId: 5,
      type: 'game-iron-flower-confirm',
      title: '非遗打铁花',
      content: {
        questName: '观演汲取灵火',
        description: '在水寨中心露台静观非遗打铁花表演，表演结束后汲取灵火。',
        watchCooldownSeconds: 8,
        rewardLingyuan: 20,
      },
    },
    {
      stepId: 6,
      type: 'game-fire-affinity',
      title: '浴火亲和',
      content: {
        questName: '浴火亲和觉醒',
        description: '观演确认后解锁【浴火亲和】，前方仍有千灯结印待完成。',
        affinityReward: '浴火亲和',
        rewardLingyuan: 30,
      },
    },
    {
      stepId: 7,
      type: 'story',
      title: '千灯共鸣',
      content: {
        storyVariant: 'day5-lantern-guide',
        dialogues: [],
        rewardLingyuan: 10,
      },
    },
    {
      stepId: 8,
      type: 'game-one-stroke',
      title: '千灯结印',
      content: {
        questName: 'QianDengJieYin',
        description: '在峰林布依万家灯火实景上按序串联灯笼，结下最终阵印并唤醒布依千灯灵。',
        unlockSpirit: '布依千灯灵',
        rewardLingyuan: 100,
        endOfDay: true,
      },
    },
  ],

  sideQuests: [
    {
      questId: 'day5-side-craft',
      type: 'game-photo',
      title: '支线：非遗寻踪·匠人残片',
      description: '在水寨内寻访手工坊，向传承人出示线索获取非遗文创并拍照上传。',
      rewardLingyuan: 50,
      isCompleted: false,
    },
    {
      questId: 'day5-side-opera',
      type: 'game-photo',
      title: '支线：水寨百戏',
      description: '寻访并拍摄布依族八音坐唱或其他传统景区民俗表演。',
      rewardLingyuan: 40,
      isCompleted: false,
    },
  ],
}

export default day5Config
