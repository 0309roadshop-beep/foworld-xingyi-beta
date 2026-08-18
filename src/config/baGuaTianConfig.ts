export const BAGUA_FIELD_BG = '/assets/bagua/bagua-field-bg.svg'

/** 八卦阵旗（八门） */
export const BAGUA_TRIGRAMS = ['乾', '坤', '震', '巽', '坎', '离', '艮', '兑'] as const
export type BaguaTrigram = (typeof BAGUA_TRIGRAMS)[number]

/** 阶段一通关顺序：正上乾，顺时针 巽→坎→艮→坤→震→离→兑 */
export const BAGUA_FLAG_TARGET_ORDER: readonly BaguaTrigram[] = [
  '乾',
  '巽',
  '坎',
  '艮',
  '坤',
  '震',
  '离',
  '兑',
]

/** 每次点击顺时针步进 45° */
export const BAGUA_STEP_DEG = 45

/** 阶段二初始角度（模 8 可解，最少 5 步） */
export const BAGUA_INITIAL_ANGLES = {
  outer: 135,
  middle: 270,
  inner: 135,
} as const

/** 双阶段线索库 */
export const BAGUA_CLUE_LIBRARY = [
  {
    id: 'bagua-xiantian',
    artifactName: '先天八卦残谱',
    hint: '天地定位（乾上坤下），山泽通气（艮左上兑右下），雷风相薄（震左下巽右上），水火不相射（坎左离右）。',
    puzzleHint: '正上为乾，顺时针依次为巽、坎、艮、坤、震、离、兑。',
  },
  {
    id: 'bagua-sancai',
    artifactName: '三才机括',
    hint: '天动人退，人动地退，地动天随。三才聚于天门（正上）方可破局。',
    puzzleHint:
      '点击外圈：外链 +45°、内环 −45°。点击中圈：中环 +45°、外链 +45°。点击内圈：内环 +45°、中环 −45°。',
  },
] as const
