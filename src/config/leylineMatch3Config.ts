/** 地脉消消乐 — Day 2 古榕地脉解密 */
export const LEYLINE_MATCH3_DEFAULTS = {
  gridSize: 7,
  maxMoves: 20,
  targetWood: 15,
  targetStone: 15,
  backgroundImage: '/assets/silhouette-castle-lake.png',
  unlockSpirit: '古榕木灵',
  rewardLingyuan: 50,
} as const

export const LEYLINE_ELEMENT_META = {
  wood: {
    emoji: '🌿',
    label: '纯净木灵',
    cellClass: 'leyline-cell--wood',
  },
  stone: {
    emoji: '🪨',
    label: '顽石杂质',
    cellClass: 'leyline-cell--stone',
  },
  deadwood: {
    emoji: '🪵',
    label: '枯木杂质',
    cellClass: 'leyline-cell--deadwood',
  },
  muddy: {
    emoji: '💧',
    label: '浊水杂质',
    cellClass: 'leyline-cell--muddy',
  },
  fire: {
    emoji: '🔥',
    label: '地火',
    cellClass: 'leyline-cell--fire',
  },
} as const
