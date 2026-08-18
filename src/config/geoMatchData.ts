import type { GeoMatchData } from '../components/geo/GeoMatch'

/** 贵州三叠纪博物馆 — 化石与科学释义配对（图片占位，后续可替换真实素材） */
export const TRIASSIC_MUSEUM_MATCH_DATA: GeoMatchData = {
  left: [
    {
      id: 'guizhou-dragon',
      label: '贵州龙',
      sublabel: '馆藏明星化石',
      imageUrl: '/assets/fossil-keichousaurus.png',
    },
    {
      id: 'crinoid',
      label: '海百合',
      sublabel: '棘皮动物门',
      imageUrl: '/assets/fossil-keichousaurus.png',
    },
    {
      id: 'phantom-dragon',
      label: '幻龙',
      sublabel: '海洋掠食者',
      imageUrl: '/assets/fossil-keichousaurus.png',
    },
  ],
  right: [
    {
      id: 'phantom-dragon',
      label: '三叠纪海洋顶级掠食者',
      sublabel: '两栖进化的奇迹',
    },
    {
      id: 'guizhou-dragon',
      label: '三叠纪海生爬行动物',
      sublabel: '沉睡 2.4 亿年的深海霸主',
    },
    {
      id: 'crinoid',
      label: '史前海洋棘皮动物',
      sublabel: '状如花朵的活化石',
    },
  ],
}

/** @deprecated 调试页默认数据 — 同 TRIASSIC_MUSEUM_MATCH_DATA */
export const DAY1_GEO_MATCH_DATA: GeoMatchData = TRIASSIC_MUSEUM_MATCH_DATA

export default TRIASSIC_MUSEUM_MATCH_DATA
