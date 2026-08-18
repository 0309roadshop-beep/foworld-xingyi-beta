export type SpiritRarity = 'common' | 'rare' | 'legendary'

export interface SpiritCatalogEntry {
  id: string
  name: string
  /** 七日图鉴中的展示槽位（与实际任务解锁日解耦） */
  catalogDay: number
  /** 实际完成召唤任务的进度日 */
  day: number
  assetUrl: string
  description: string
  lore: string
  unlockQuest: string
  rarity: SpiritRarity
  element: string
}

/** 七日主线可召唤幻兽图鉴 — 共 7 只（按解锁天数排序） */
export const SPIRIT_CATALOG: SpiritCatalogEntry[] = [
  {
    id: 'spirit-bronze-beast',
    name: '夜郎铜兽',
    catalogDay: 1,
    day: 1,
    assetUrl: '/assets/spirits/catalog/night-bronze-beast-v2.jpg',
    description: '青铜残影中苏醒的夜郎灵兽',
    lore: '博物馆铜车马拼图复原后，沉睡千年的器韵化作灵体。它记得战马嘶鸣与夜郎古国礼乐，是寻灵之旅的第一声铜鸣。',
    unlockQuest: '古国器韵寻踪',
    rarity: 'legendary',
    element: '金',
  },
  {
    id: 'spirit-ancient-tree',
    name: '古榕木灵',
    catalogDay: 2,
    day: 2,
    assetUrl: '/assets/spirits/catalog/ancient-banyan-spirit-v2.jpg',
    description: '万峰林千年古榕的树冠星芒',
    lore: '星芒连线穿透树冠，古榕深处传来木石共生的低语。它守护着山与树之间最原始的契约。',
    unlockQuest: '树冠星芒连线',
    rarity: 'rare',
    element: '木',
  },
  {
    id: 'spirit-wanfeng-god',
    name: '万峰山神',
    catalogDay: 3,
    day: 2,
    assetUrl: '/assets/spirits/catalog/wanfeng-mountain-god-v2.jpg',
    description: '八卦阵中觉醒的巨峰之灵',
    lore: '乾坤星盘三卦归位，万峰如列屏般在灵视中升起。它是这片土地最沉默也最长久的守望者。',
    unlockQuest: '乾坤星盘·巨灵觉醒',
    rarity: 'legendary',
    element: '土',
  },
  {
    id: 'spirit-jade-cloud',
    name: '玉皇云灵',
    catalogDay: 4,
    day: 3,
    assetUrl: '/assets/spirits/catalog/jade-cloud-spirit-v2.jpg',
    description: '御风法阵中凝形的云中之灵',
    lore: '倾斜御风，三颗光球归位阵眼。云海裂开一线天光，玉皇顶上的风被塑成灵，俯瞰整片喀斯特。',
    unlockQuest: '登云踏雾',
    rarity: 'rare',
    element: '风',
  },
  {
    id: 'spirit-lake-mirror',
    name: '湖心蜃灵',
    catalogDay: 5,
    day: 3,
    assetUrl: '/assets/spirits/catalog/lake-mirage-spirit-v2.jpg',
    description: '万峰湖上浮动的水中城堡',
    lore: '实景矩阵拼合完毕，湖面倒影与真实城堡重叠。蜃灵在涟漪间显形，真假难辨却美得令人屏息。',
    unlockQuest: '城堡实景矩阵还原',
    rarity: 'legendary',
    element: '水',
  },
  {
    id: 'spirit-canyon-water',
    name: '峡谷水灵',
    catalogDay: 6,
    day: 4,
    assetUrl: '/assets/spirits/catalog/canyon-water-spirit-v2.jpg',
    description: '深渊太鼓四轨共鸣中诞生',
    lore: '观景大桥的视觉残片、瀑布核心的灵韵主旋律与出谷时的四轨共鸣，让峡谷深处的水汽凝结成灵。它携带着瀑布的轰鸣与大地裂谷的记忆。',
    unlockQuest: '深渊太鼓',
    rarity: 'rare',
    element: '水',
  },
  {
    id: 'spirit-bouyei-lantern',
    name: '布依千灯灵',
    catalogDay: 7,
    day: 5,
    assetUrl: '/assets/spirits/catalog/bouyei-lantern-spirit-v2.jpg',
    description: '水寨千灯轮廓被点亮后的灯魂',
    lore: '齿轮咬合、渠水贯通、灯火连成一线，布依水寨的千盏灯同时亮起。千灯灵从光晕中浮现，温柔而明亮。',
    unlockQuest: '灯火连线·千灯唤灵',
    rarity: 'legendary',
    element: '火',
  },
]

/** 已下线的幻兽名称 — 读档时自动剔除 */
export const RETIRED_SPIRIT_NAMES = ['远古海龙灵'] as const

export function getSpiritByName(name: string): SpiritCatalogEntry | undefined {
  return SPIRIT_CATALOG.find((s) => s.name === name)
}

export function getSpiritAssetUrl(name: string): string {
  return getSpiritByName(name)?.assetUrl ?? SPIRIT_CATALOG[0].assetUrl
}
