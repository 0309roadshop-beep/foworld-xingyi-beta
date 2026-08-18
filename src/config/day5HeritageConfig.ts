/**
 * Photo_D5 · 寻遗织梦 — 6 个核心非遗元素
 *
 * 从 Match_D5 的 12 组图腾中选取：扎染、八音、铜鼓、银饰、竹编、织锦
 * 每项上传对应实景照片 → 弹出 InfoCard 科普 → 收录
 */

import { MATCH_D5_TILES, PHOTO_D5_TOTEM_TYPES, type PhotoD5TotemType } from './lanternMatchConfig'

export interface HeritagePhotoItem {
  id: string
  totemType: PhotoD5TotemType
  title: string
  subtitle: string
  /** 上传引导文案 */
  photoHint: string
  lore: string
}

const TOTEM_LABEL: Record<string, string> = Object.fromEntries(
  MATCH_D5_TILES.map((t) => [t.type, t.label]),
)

const PHOTO_ITEM_META: Record<
  PhotoD5TotemType,
  { subtitle: string; photoHint: string; lore: string }
> = {
  tie_dye: {
    subtitle: '绞缬草木，盲盒花纹',
    photoHint: '扎染工坊、染布过程或成品纹样',
    lore:
      '布依扎染以线扎紧坯布，浸以板蓝根、茜草等植物染料，绞缬处留白成纹。每一拆封都是独一无二的「草木盲盒」，是穿在身上的山水记忆。',
  },
  eight_sounds: {
    subtitle: '千年前的顶级 Livehouse',
    photoHint: '八音坐唱表演、乐器或戏台场景',
    lore:
      '布依八音坐唱以牛骨胡、葫芦琴、笛子等八件乐器相和，坐唱古歌、叙事与情歌。无扩音、无伴奏带，全凭老艺人一嗓一弦，把寨子里的故事唱给星空听。',
  },
  bronze_drum: {
    subtitle: '铜声震谷，祭礼之魂',
    photoHint: '铜鼓陈列、敲击表演或广场仪式',
    lore:
      '黔西南铜鼓是族群仪式与节庆的核心礼器，鼓面太阳纹、晕圈纹象征天地光明。鼓声一起，寨老便知岁时祭典将至，百戏将随铜声开场。',
  },
  silver: {
    subtitle: '行走的山峦与月光',
    photoHint: '银饰匠人铺、银饰成品或佩戴展示',
    lore:
      '苗族银饰以锤揲、錾刻、焊接见长，冠、项圈、压襟层层叠叠，既是盛装亦是护佑。叮当声里，银光与灯火交相辉映。',
  },
  bamboo_weave: {
    subtitle: '竹丝为骨，巧手成器',
    photoHint: '竹编手艺坊、竹编器物或编织过程',
    lore:
      '布依竹编以当地慈竹劈丝，编筐、编席、编篓，纹路细密而韧。日常农具与节庆器物皆出自竹丝之间，是山居生活的智慧结晶。',
  },
  brocade: {
    subtitle: '经纬之间织就的山河',
    photoHint: '织锦馆、织机或织锦成品纹样',
    lore:
      '花堂布织锦以多色纬线提花，常见八角星、凤鸟与回纹。一匹锦需经纺、染、织、整数十道工序，是布依人家嫁娶与节庆的贵重礼俗。',
  },
}

export const D5_HERITAGE_ITEMS: HeritagePhotoItem[] = PHOTO_D5_TOTEM_TYPES.map((totemType) => {
  const meta = PHOTO_ITEM_META[totemType]
  return {
    id: totemType,
    totemType,
    title: TOTEM_LABEL[totemType] ?? totemType,
    subtitle: meta.subtitle,
    photoHint: meta.photoHint,
    lore: meta.lore,
  }
})

/** @deprecated 使用 D5_HERITAGE_ITEMS */
export type HeritageCheckInPoint = HeritagePhotoItem
/** @deprecated 使用 D5_HERITAGE_ITEMS */
export const D5_HERITAGE_CHECKINS = D5_HERITAGE_ITEMS

export const PHOTO_D5_ITEM_COUNT = D5_HERITAGE_ITEMS.length

export default D5_HERITAGE_ITEMS
