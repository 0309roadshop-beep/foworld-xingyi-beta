/** 千灯结印 — 实景连线唤灵 */

export const PLACEHOLDER_NIGHT_VIEW =
  '/assets/29a44b709649386ca0085dfb0ce938a8.jpg'

export const PLACEHOLDER_SPIRIT_CARD =
  '/assets/thousand-lantern-spirit-card.png'

/** 节点有效判定半径（px）— 移动端触控容错（下限） */
export const LANTERN_NODE_HIT_RADIUS = 36

/** 节点有效判定半径（容器短边百分比）— 随屏幕缩放 */
export const LANTERN_NODE_HIT_RADIUS_PERCENT = 10

/** 吸附当前节点时放大触控半径 */
export const LANTERN_NEXT_NODE_HIT_BOOST = 1.28

/** 根据容器尺寸计算触控半径 */
export function lanternHitRadiusPx(width: number, height: number, boost = 1): number {
  const minDim = Math.min(width, height)
  return Math.max(LANTERN_NODE_HIT_RADIUS, minDim * (LANTERN_NODE_HIT_RADIUS_PERCENT / 100)) * boost
}

/** 通关卡牌展示后回调延迟（ms） */
export const LANTERN_COMPLETE_DELAY_MS = 2500

/** 失败红线闪烁次数 */
export const LANTERN_FAIL_FLASH_COUNT = 3

/** 失败红线闪烁间隔（ms） */
export const LANTERN_FAIL_FLASH_INTERVAL_MS = 180

export interface ThousandLanternNode {
  id: number
  /** 相对屏幕宽高百分比 0–100 */
  x: number
  y: number
  label?: string
  part?: string
}

/**
 * 布依千灯灵 · 入门对称灯笼
 *
 * 8 节点（id 0–7 连续）· 8 条边 · 仅 0、7 为奇度
 * 参考解：0→1→2→4→5→3→1→6→7
 */
export const THOUSAND_LANTERN_NODES: ThousandLanternNode[] = [
  { id: 0, x: 50.0, y: 5.0, label: '始', part: '钩顶' },
  { id: 1, x: 50.0, y: 16.0, part: '顶盖' },
  { id: 2, x: 34.0, y: 28.0, part: '上左' },
  { id: 3, x: 66.0, y: 28.0, part: '上右' },
  { id: 4, x: 22.0, y: 42.0, part: '鼓左' },
  { id: 5, x: 78.0, y: 42.0, part: '鼓右' },
  { id: 6, x: 50.0, y: 58.0, part: '中轴' },
  { id: 7, x: 50.0, y: 82.0, label: '终', part: '穗尖' },
]

export const THOUSAND_LANTERN_EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [1, 3],
  [2, 4],
  [3, 5],
  [4, 5],
  [1, 6],
  [6, 7],
]

export function lanternEdgeKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

function buildLanternAdjacency() {
  const adj = new Map<number, number[]>()
  for (const [a, b] of THOUSAND_LANTERN_EDGES) {
    if (!adj.has(a)) adj.set(a, [])
    if (!adj.has(b)) adj.set(b, [])
    adj.get(a)!.push(b)
    adj.get(b)!.push(a)
  }
  return adj
}

export const LANTERN_ADJACENCY = buildLanternAdjacency()

export const LANTERN_TOTAL_EDGES = THOUSAND_LANTERN_EDGES.length

const MIRROR_NODE: Record<number, number> = {
  0: 0, 1: 1, 6: 6, 7: 7, 2: 3, 3: 2, 4: 5, 5: 4,
}

/** 开发校验：欧拉可解（0→7）+ 中心对称 + id 连续 */
export function verifyLanternGraph(): { ok: boolean; symmetric: boolean; oddCount: number } {
  THOUSAND_LANTERN_NODES.forEach((node, index) => {
    if (node.id !== index) {
      throw new Error(`[千灯结印] 节点 id 必须等于数组下标，发现 id=${node.id} @ index=${index}`)
    }
  })

  const deg = new Map<number, number>()
  for (const [a, b] of THOUSAND_LANTERN_EDGES) {
    deg.set(a, (deg.get(a) ?? 0) + 1)
    deg.set(b, (deg.get(b) ?? 0) + 1)
  }
  const oddNodes = [...deg.entries()].filter(([, d]) => d % 2 === 1).map(([n]) => n).sort((a, b) => a - b)
  const oddCount = oddNodes.length

  const edgeSet = new Set(
    THOUSAND_LANTERN_EDGES.map(([a, b]) => lanternEdgeKey(a, b)),
  )
  let symmetric = true
  for (const key of edgeSet) {
    const [a, b] = key.split('-').map(Number)
    const ma = MIRROR_NODE[a]!
    const mb = MIRROR_NODE[b]!
    const mk = lanternEdgeKey(ma, mb)
    if (!edgeSet.has(mk)) symmetric = false
  }

  const ok = oddNodes.join(',') === '0,7' && symmetric
  return { ok, symmetric, oddCount }
}

if (import.meta.env.DEV) {
  const v = verifyLanternGraph()
  if (!v.ok) {
    console.error('[千灯结印] 灯骨图校验失败', v)
  }
}
