/**
 * Match_D5 · 千灯结缘 — 12 组图腾字典（24 图块 = 12 对）
 *
 * 与 Photo_D5 解耦：连连看仅读取本字典自闭环生成矩阵。
 * Photo_D5 仅从下列 12 组中选取 6 个代表性点位做 LBS 打卡。
 *
 * 后期美术替换：icon: '/assets/img/day5/totems/lantern.png'
 */

export interface MatchTileConfig {
  /** 消除配对 type，同 type 可消除 */
  type: string
  /** 占位 Emoji 或本地图片路径 */
  icon: string
  /** UI 短标签（中文） */
  label: string
  /** 英文策划备注 */
  nameEn: string
}

/** 4 列 × 6 行，共 24 格（移动端竖屏优先） */
export const MATCH_D5_GRID_COLS = 4
export const MATCH_D5_GRID_ROWS = 6
export const MATCH_D5_PAIR_COUNT = 12
export const MATCH_D5_TILE_COUNT = MATCH_D5_PAIR_COUNT * 2

/**
 * Photo_D5 LBS 打卡选用的 6 个核心图腾 type（其余 6 组仅出现在连连看）
 */
export const PHOTO_D5_TOTEM_TYPES = [
  'tie_dye',
  'eight_sounds',
  'bronze_drum',
  'silver',
  'bamboo_weave',
  'brocade',
] as const

export type PhotoD5TotemType = (typeof PHOTO_D5_TOTEM_TYPES)[number]

export const MATCH_D5_TILES: MatchTileConfig[] = [
  { type: 'lantern', icon: '🏮', label: '灯笼', nameEn: 'Lantern' },
  { type: 'tie_dye', icon: '🎨', label: '扎染', nameEn: 'Tie-dye' },
  { type: 'bamboo_weave', icon: '🎋', label: '竹编', nameEn: 'Bamboo weaving' },
  { type: 'batik', icon: '🌀', label: '蜡染', nameEn: 'Batik' },
  { type: 'leaf_blowing', icon: '🍃', label: '木叶', nameEn: 'Leaf blowing' },
  { type: 'eight_sounds', icon: '🎵', label: '八音', nameEn: 'Eight sounds' },
  { type: 'embroidery', icon: '🪡', label: '绣片', nameEn: 'Embroidery' },
  { type: 'pottery', icon: '🏺', label: '陶罐', nameEn: 'Pottery' },
  { type: 'rice_ear', icon: '🌾', label: '稻穗', nameEn: 'Rice ear' },
  { type: 'bronze_drum', icon: '🪘', label: '铜鼓', nameEn: 'Bronze drum' },
  { type: 'silver', icon: '💍', label: '银饰', nameEn: 'Silver jewelry' },
  { type: 'brocade', icon: '🧶', label: '织锦', nameEn: 'Brocade' },
]

export default MATCH_D5_TILES
