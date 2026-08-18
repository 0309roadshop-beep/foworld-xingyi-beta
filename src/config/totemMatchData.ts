import type { GeoMatchData } from '../components/geo/GeoMatch'

/** Day 1 支线「图腾解密」— 夜郎符号 × 布依民俗含义 */
export const DAY1_TOTEM_MATCH_DATA: GeoMatchData = {
  left: [
    { id: 'sun-spiral', label: '日轮螺旋纹', sublabel: '夜郎祭祀符号' },
    { id: 'bronze-beast', label: '铜兽面纹', sublabel: '青铜器图腾' },
    { id: 'water-wave', label: '水波回纹', sublabel: '河谷文明印记' },
  ],
  right: [
    { id: 'water-wave', label: '祈雨丰年', sublabel: '布依水神崇拜' },
    { id: 'sun-spiral', label: '太阳祈福', sublabel: '布依年节礼俗' },
    { id: 'bronze-beast', label: '护寨平安', sublabel: '布依图腾信仰' },
  ],
}

export default DAY1_TOTEM_MATCH_DATA
