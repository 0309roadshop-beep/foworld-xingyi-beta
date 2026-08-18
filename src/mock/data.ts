import type { CollectionRecord, Fragment, Player, Task } from '../types'

export const MOCK_PLAYER: Player = {
  id: '001',
  title: '001号唤灵师',
  nickname: '寻灵者',
  spiritPath: 'earth',
  spiritDrops: 150,
}

export const MOCK_FRAGMENTS: Fragment[] = [
  {
    id: 'frag-001',
    name: '地脉碎屑',
    description: '万峰林地脉溢出的微量灵源结晶，触之微温。',
    rarity: 'common',
    emoji: '🪨',
    quantity: 3,
    source: '万峰林八卦田',
  },
  {
    id: 'frag-002',
    name: '罗盘残片',
    description: '古罗盘上的青铜碎片，仍残留一丝指向性灵力。',
    rarity: 'rare',
    emoji: '🧭',
    quantity: 1,
    source: 'AR 扫描采集',
  },
  {
    id: 'frag-003',
    name: '八卦符印',
    description: '八卦田阵眼处的符印拓片，八卦纹路清晰可辨。',
    rarity: 'rare',
    emoji: '✨',
    quantity: 1,
    source: '万峰林八卦田',
  },
  {
    id: 'frag-004',
    name: '唤灵师凭证',
    description: '实体卡激活后凝聚的身份印记，证明唤灵师资格。',
    rarity: 'legendary',
    emoji: '📜',
    quantity: 1,
    source: '身份激活',
  },
]

export const MOCK_RECORDS: CollectionRecord[] = [
  {
    id: 'rec-001',
    type: 'fragment_obtained',
    title: '获得「唤灵师凭证」',
    location: '身份激活',
    timestamp: '2026-05-25 09:12',
    detail: '专属实体卡验证通过，唤灵师身份已觉醒',
  },
  {
    id: 'rec-002',
    type: 'task_complete',
    title: '接取主线任务',
    location: '贵州兴义 · 万峰林景区',
    timestamp: '2026-05-25 09:15',
    detail: '前往万峰林八卦田',
  },
  {
    id: 'rec-003',
    type: 'ar_scan',
    title: 'AR 罗盘扫描',
    location: '万峰林八卦田',
    timestamp: '2026-05-25 10:03',
    detail: '在八卦田实景中完成灵源定位扫描',
  },
  {
    id: 'rec-004',
    type: 'fragment_obtained',
    title: '获得「地脉碎屑」×2',
    location: '万峰林八卦田',
    timestamp: '2026-05-25 10:03',
    detail: '扫描采集时同步获取',
  },
]

export const PUZZLE_IMAGE_URL = '/assets/puzzle-copper-chariot.png'
/** 拼图原图宽高比（1024×753 东汉铜车马） */
export const PUZZLE_IMAGE_ASPECT = 1024 / 753

export const SILHOUETTE_IMAGE_URL = '/assets/silhouette-castle-lake.png'
/** 视差剪影原图宽高比（1024×682 古堡湖景） */
export const SILHOUETTE_IMAGE_ASPECT = 1024 / 682

export const FOSSIL_IMAGE_URL = '/assets/fossil-keichousaurus.png'
/** 化石刮刮乐原图宽高比（1024×770） */
export const FOSSIL_IMAGE_ASPECT = 1024 / 770

/** 3×4 矩阵拼图测试图（古堡湖景实景） */
export const MATRIX_PUZZLE_IMAGE_URL = SILHOUETTE_IMAGE_URL
export const MATRIX_PUZZLE_IMAGE_ASPECT = SILHOUETTE_IMAGE_ASPECT

/** 一笔画节点坐标（容器内百分比） — 见 constellationPresets */
export type { ConstellationNode as OneStrokeNode } from '../config/constellationPresets'
export { STAR_PENTAGRAM_NODES as ONE_STROKE_NODES } from '../config/constellationPresets'

export const MOCK_TASKS: Task[] = [
  {
    id: 'main-001',
    type: 'main',
    title: '前往万峰林八卦田',
    location: '贵州兴义 · 万峰林景区',
    description: '循罗盘指引，在八卦田实景中采集灵源，唤醒沉睡的地脉之灵。',
    lore: '相传明代风水师在此布下八卦阵，万峰林的地脉之气汇聚于田心。唯有持唤灵师卡者，方可在实景中感应灵源流动。',
    objectives: [
      '抵达万峰林八卦田定位点（半径 50m 内）',
      '开启 AR 罗盘，对准田心方位',
      '完成灵源定格采集',
    ],
    reward: { spiritDrops: 50, label: '地脉灵核 ×1' },
    status: 'in_progress',
    distance: '约 1.2 km',
    coords: { latitude: 25.0012, longitude: 104.9128 },
  },
  {
    id: 'side-001',
    type: 'side',
    title: '马岭河峡谷 · 水灵感应',
    location: '贵州兴义 · 马岭河峡谷',
    description: '在峡谷栈道附近感应水元素灵源，拍摄一张带有瀑布的实景。',
    objectives: [
      '到达马岭河峡谷入口',
      '在瀑布观景位完成 AR 扫描',
      '旋转同心星盘，使三环对齐正上方',
    ],
    reward: { spiritDrops: 20, label: '水灵碎片 ×1' },
    status: 'available',
    distance: '约 8.5 km',
    coords: { latitude: 25.1167, longitude: 104.9333 },
  },
  {
    id: 'side-002',
    type: 'side',
    title: '吉隆堡 · 古堡秘符',
    location: '贵州兴义 · 吉隆堡',
    description: '在欧式古堡前寻找隐藏的秘符刻印，用罗盘解码其方位。',
    objectives: ['找到古堡正门前广场', '使用罗盘扫描秘符位置', '对齐三层视差剪影完成解密'],
    reward: { spiritDrops: 15, label: '秘符拓片 ×1' },
    status: 'available',
    distance: '约 5.3 km',
    coords: { latitude: 25.0567, longitude: 104.9250 },
  },
  {
    id: 'side-003',
    type: 'side',
    title: '南龙古寨 · 化石修复',
    location: '贵州兴义 · 南龙古寨',
    description: '在古寨地质展示点发现一块被泥土覆盖的化石板，刮开泥土复原完整化石。',
    objectives: [
      '进入南龙古寨景区',
      '找到地质展示点化石板',
      '刮开泥土层，显露 80% 以上化石',
    ],
    reward: { spiritDrops: 25, label: '贵州龙化石拓片 ×1' },
    status: 'available',
    distance: '约 12 km',
    coords: { latitude: 25.0833, longitude: 104.8833 },
  },
  {
    id: 'side-004',
    type: 'side',
    title: '吉隆堡 · 实景矩阵',
    location: '贵州兴义 · 吉隆堡',
    description: '将 AR 采集或上传的实景照片切成 4×4 共 16 块，从碎片池逐块放置到空白画布完成复原。',
    objectives: [
      '在古堡观景位完成实景拍摄或上传照片',
      '等待后台自动切割为 16 块碎片',
      '从碎片池点选，放置到空白画布直至拼满',
    ],
    reward: { spiritDrops: 20, label: '实景矩阵晶片 ×1' },
    status: 'available',
    distance: '约 5.3 km',
    coords: { latitude: 25.0567, longitude: 104.9250 },
  },
  {
    id: 'side-005',
    type: 'side',
    title: '万峰林 · 灵纹一笔画',
    location: '贵州兴义 · 万峰林景区',
    description: '地脉灵纹散落各处，需以一笔连贯连线，按序激活所有节点并回到起点闭合。',
    objectives: [
      '抵达万峰林灵纹阵眼',
      '从起点按住滑动连线',
      '依次连通全部节点并闭合回路',
    ],
    reward: { spiritDrops: 18, label: '灵纹回路 ×1' },
    status: 'available',
    distance: '约 1.5 km',
    coords: { latitude: 25.002, longitude: 104.914 },
  },
  {
    id: 'side-006',
    type: 'side',
    title: '地脉工坊 · 齿轮组装',
    location: '贵州兴义 · 万峰林景区',
    description: '将大、中、小三种齿轮拖入对应锚点，三件装填完毕后可启动机械联动。',
    objectives: [
      '进入地脉工坊机关区',
      '拖拽齿轮至尺寸匹配的锚点',
      '三件装填完毕，启动齿轮联动',
    ],
    reward: { spiritDrops: 20, label: '地脉齿轮组 ×1' },
    status: 'available',
    distance: '约 1.8 km',
    coords: { latitude: 25.003, longitude: 104.916 },
  },
  {
    id: 'side-007',
    type: 'side',
    title: '飞瀑灵泉 · 集音',
    location: '贵州兴义 · 马岭河峡谷',
    description: '飞瀑化作水滴气泡坠落，在限时内点破足够数量即可收录灵泉之音。',
    objectives: [
      '抵达飞瀑观测点',
      '30 秒内点破 15 个水滴气泡',
      '完成灵泉集音收录',
    ],
    reward: { spiritDrops: 18, label: '飞瀑灵音 ×1' },
    status: 'available',
    distance: '约 2.2 km',
    coords: { latitude: 25.006, longitude: 104.920 },
  },
  {
    id: 'side-008',
    type: 'side',
    title: '灵泉石台 · 五音重奏',
    location: '贵州兴义 · 万峰湖',
    description: '聆听水灵奏响的五音序列，凭记忆复奏宫商角徵羽，音律完全一致方可通关。',
    objectives: [
      '抵达灵泉石台',
      '点击「聆听水灵之声」记住序列',
      '按相同顺序复奏五个音符',
    ],
    reward: { spiritDrops: 20, label: '五音灵契 ×1' },
    status: 'available',
    distance: '约 2.5 km',
    coords: { latitude: 25.008, longitude: 104.922 },
  },
  {
    id: 'side-009',
    type: 'side',
    title: '地脉水渠 · 管路拼接',
    location: '贵州兴义 · 万峰林景区',
    description: '旋转散落的管段，将地脉灵泉从源点引至汇点，使水路完全贯通。',
    objectives: [
      '进入地脉水渠机关区',
      '点击水管顺时针旋转对齐接口',
      '接通源点至汇点的连续通路',
    ],
    reward: { spiritDrops: 18, label: '地脉水渠图 ×1' },
    status: 'available',
    distance: '约 1.6 km',
    coords: { latitude: 25.004, longitude: 104.915 },
  },
  {
    id: 'side-010',
    type: 'side',
    title: '地质纪年 · 时光回溯',
    location: '贵州兴义 · 贵州龙化石馆',
    description: '调节地壳运动、海水温度与大气压强三项参数，使地质纪年指针回溯至 2.5 亿年前古海洋。',
    objectives: [
      '进入地质纪年控制台',
      '拖动三项参数滑块至目标区间',
      '触发时光倒流，解锁神话短片',
    ],
    reward: { spiritDrops: 22, label: '古海洋纪年片 ×1' },
    status: 'available',
    distance: '约 2.0 km',
    coords: { latitude: 25.005, longitude: 104.918 },
  },
  {
    id: 'side-011',
    type: 'side',
    title: '地质化石 · 信息配对',
    location: '贵州兴义 · 黔西南州博物馆',
    description: '点击左列化石与右列地质时期进行配对连线，全部正确即可唤醒地脉记忆。',
    objectives: [
      '进入化石配对控制台',
      '先点左列化石，再点右列时期',
      '完成全部连线配对',
    ],
    reward: { spiritDrops: 20, label: '地脉记忆碎片 ×1' },
    status: 'available',
    distance: '约 1.2 km',
    coords: { latitude: 25.088, longitude: 104.895 },
  },
]

/** AR 扫描随机掉落池 */
export const AR_SCAN_DROPS: Omit<Fragment, 'quantity'>[] = [
  {
    id: 'frag-001',
    name: '地脉碎屑',
    description: '万峰林地脉溢出的微量灵源结晶，触之微温。',
    rarity: 'common',
    emoji: '🪨',
    source: 'AR 扫描采集',
  },
  {
    id: 'frag-002',
    name: '罗盘残片',
    description: '古罗盘上的青铜碎片，仍残留一丝指向性灵力。',
    rarity: 'rare',
    emoji: '🧭',
    source: 'AR 扫描采集',
  },
  {
    id: 'frag-005',
    name: '灵源微滴',
    description: '实景中捕获的稀薄灵源，需进一步炼化。',
    rarity: 'common',
    emoji: '💧',
    source: 'AR 扫描采集',
  },
]

export const MOCK_TASK = MOCK_TASKS.find((t) => t.type === 'main')!

export function getTaskById(id: string): Task | undefined {
  return MOCK_TASKS.find((t) => t.id === id)
}

export const MOCK_COORDS = {
  latitude: 25.0012,
  longitude: 104.9128,
  accuracy: null as number | null,
}

export const MOCK_MERCHANTS = [
  {
    id: 'merchant-bar',
    name: '0309公路商店酒吧',
    tagline: '公路上的微醺驿站',
    emoji: '🍺',
    category: 'bar' as const,
    address: '兴义市 · 0309公路商店',
  },
  {
    id: 'merchant-chicken',
    name: '公路炸鸡',
    tagline: '酥脆公路风味',
    emoji: '🍗',
    category: 'food' as const,
    address: '兴义市 · 0309公路商店旁',
  },
]

export const MOCK_PRODUCTS = [
  {
    id: 'prod-bar-01',
    merchantId: 'merchant-bar',
    name: '精酿啤酒一杯',
    description: '当日精酿任选，公路商店特供',
    price: 80,
    emoji: '🍺',
    stock: 99,
  },
  {
    id: 'prod-bar-02',
    merchantId: 'merchant-bar',
    name: '特调鸡尾酒',
    description: '调酒师推荐款，含无酒精选项',
    price: 120,
    emoji: '🍸',
    stock: 50,
  },
  {
    id: 'prod-bar-03',
    merchantId: 'merchant-bar',
    name: '公路小食拼盘',
    description: '薯条 + 鸡米花 + 洋葱圈组合',
    price: 100,
    emoji: '🍟',
    stock: 30,
  },
  {
    id: 'prod-chicken-01',
    merchantId: 'merchant-chicken',
    name: '招牌炸鸡套餐',
    description: '半只炸鸡 + 薯条 + 可乐',
    price: 90,
    emoji: '🍗',
    stock: 99,
  },
  {
    id: 'prod-chicken-02',
    merchantId: 'merchant-chicken',
    name: '炸鸡啤酒组合',
    description: '炸鸡套餐 + 0309酒吧精酿一杯',
    price: 150,
    emoji: '🍻',
    stock: 40,
  },
  {
    id: 'prod-chicken-03',
    merchantId: 'merchant-chicken',
    name: '香辣鸡翅（6只）',
    description: '经典公路炸鸡风味',
    price: 50,
    emoji: '🍖',
    stock: 99,
  },
]

export function getMerchantProducts(merchantId: string) {
  return MOCK_PRODUCTS.filter((p) => p.merchantId === merchantId)
}

export function getProductById(id: string) {
  return MOCK_PRODUCTS.find((p) => p.id === id)
}

export function getMerchantById(id: string) {
  return MOCK_MERCHANTS.find((m) => m.id === id)
}

/** 开场剧本对白 */
export const PROLOGUE_DIALOGUES = [
  {
    speaker: '罗盘灵',
    text: '你好，唤灵师。万峰林的灵脉在千年沉睡后，再次开始了低语。',
  },
  {
    speaker: '罗盘灵',
    text: '你手中的罗盘会指向最近的灵域节点——完成任务，收集灵源滴，唤醒沉睡的神话。',
  },
  {
    speaker: '罗盘灵',
    text: '当你抵达任务地点，开启 AR 罗盘，实景中的灵纹将为你显现。现在，向着第一处阵眼出发吧。',
  },
] as const
