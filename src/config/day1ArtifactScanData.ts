import type { DayScanArtifact } from './day1Types'

/**
 * Day 1 黔西南州博物馆 — 6 件贵州出土青铜文物
 * 验证前：编号 + 线索；取景锁定后输入展牌【灵感校验码】；正确则解锁名称与现场实拍图谱
 */
export const DAY1_MUSEUM_ARTIFACTS: DayScanArtifact[] = [
  {
    id: 'han-baiji-copper-boiler',
    catalogNo: '236 (2-26)',
    label: '汉代百戏铜釜',
    inspirationCode: '073',
    clue:
      '看似寻常的古人炊具，却承载着千年前的百戏狂欢。鼎沸的不仅是水，还有汉代浓郁的人间烟火。',
  },
  {
    id: 'western-han-curved-spear',
    catalogNo: '986 (2-11)',
    label: '西汉曲刃铜矛',
    inspirationCode: '059',
    clue:
      '它曾是破阵的利刃，独特的曲刃设计见证了古西南夷武将的喋血沙场，历经千年依然寒芒毕露。',
  },
  {
    id: 'western-han-t-sword',
    catalogNo: 'AL-AW·68 (3-1)',
    label: '西汉T形柄一字格铜剑',
    inspirationCode: '101',
    clue:
      '独特的T形握柄与一字型剑格，它是夜郎勇士的贴身信仰，彰显着这片土地独有的兵器美学。',
  },
  {
    id: 'eastern-han-gilt-door-knocker',
    catalogNo: '172 (5-3)',
    label: '东汉鎏金铜铺首',
    inspirationCode: '201',
    clue:
      '怒目圆睁的兽面，曾衔着沉重的门环。它守护过两汉时期的高门大户，鎏金虽已斑驳，威严却分毫未减。',
  },
  {
    id: 'eastern-han-money-tree',
    catalogNo: '117 (5-17)',
    label: '东汉摇钱树',
    inspirationCode: '215',
    clue:
      '陶制底座之上，青铜铸造的枝叶交错纵横。它虽未结出果实，却挂满了古人对财富与羽化升仙的终极渴望。',
  },
  {
    id: 'eastern-han-seal',
    catalogNo: '95 (6-26)',
    label: '东汉「巴郡守丞」鎏金铜印',
    inspirationCode: '286',
    clue:
      '方寸之间，刻着权力的印记。这枚小巧的私印，是汉代地方官吏身份与威望的绝对证明。',
  },
]

export default DAY1_MUSEUM_ARTIFACTS
