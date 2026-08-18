import { BAGUA_CLUE_LIBRARY } from './baGuaTianConfig'

/** Day 2 众星捧月 AR 完成后 — 先天八卦残谱 */
export const DAY2_CLUE_XIANTIAN = BAGUA_CLUE_LIBRARY[0]

/** Day 2 日月田描摹完成后 — 三才机括 */
export const DAY2_CLUE_SANCAI = BAGUA_CLUE_LIBRARY[1]

/** 众星捧月 AR（可选支线）— 星轨拓片 */
export const DAY2_CLUE_XINGGUI_TUOPIAN = {
  id: 'day2-xinggui-tuopian',
  artifactName: '星轨拓片',
  hint: '天之轨的密码，定格于正北方的「天枢」星纹。',
} as const

/** @deprecated 已由先天八卦残谱取代，保留 id 兼容旧存档 */
export const DAY2_CLUE_RIYUE_LUOPAN = {
  id: 'day2-riyue-luopan',
  artifactName: '日月罗盘',
  hint: '让「玄日」纹与天枢星纹相扣。',
} as const

export type Day2ClueId =
  | typeof DAY2_CLUE_XIANTIAN.id
  | typeof DAY2_CLUE_SANCAI.id
  | typeof DAY2_CLUE_XINGGUI_TUOPIAN.id
  | typeof DAY2_CLUE_RIYUE_LUOPAN.id

const DAY2_CLUE_MAP = {
  [DAY2_CLUE_XIANTIAN.id]: DAY2_CLUE_XIANTIAN,
  [DAY2_CLUE_SANCAI.id]: DAY2_CLUE_SANCAI,
  [DAY2_CLUE_XINGGUI_TUOPIAN.id]: DAY2_CLUE_XINGGUI_TUOPIAN,
  [DAY2_CLUE_RIYUE_LUOPAN.id]: DAY2_CLUE_RIYUE_LUOPAN,
} as const

/** 根据线索 id 读取文案 */
export function getDay2ClueById(clueId: string) {
  return DAY2_CLUE_MAP[clueId as Day2ClueId]
}
