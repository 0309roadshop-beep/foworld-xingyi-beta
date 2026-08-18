/** 开发者快捷入口 — 与玩家模式新增组件保持同步 */
export interface DevShortcut {
  label: string
  path: string
  /** 分组标签，便于调试台分区展示 */
  group?: 'flow' | 'day1' | 'camera' | 'legacy'
}

export const DEV_SHORTCUTS: DevShortcut[] = [
  { label: '任务详情（全组件面板）', path: '/tasks', group: 'legacy' },
  { label: '独立 Day1 流程页', path: '/day1', group: 'flow' },
  { label: '御水之契 · 江河试炼', path: '/river-run', group: 'day1' },
  { label: '古国器韵 · 文物扫描', path: '/artifact-scan', group: 'day1' },
  { label: '贴纸相机 · 显眼包', path: '/sticker-camera?type=meme', group: 'camera' },
  { label: '贴纸相机 · 大片', path: '/sticker-camera?type=film', group: 'camera' },
  { label: 'AR 对齐 · 八卦', path: '/camera?quest=bagua', group: 'camera' },
  { label: 'AR 对齐 · 树王', path: '/camera?quest=tree', group: 'camera' },
  { label: '众星捧月 · 灵韵共鸣', path: '/zhongxing-ar', group: 'camera' },
  { label: '日月田 · 灵纹描摹', path: '/riyue-tracing', group: 'camera' },
  { label: '八卦田 · 八门三才', path: '/bagua-puzzle', group: 'day1' },
  { label: '罗盘异动 · 灵韵找茬', path: '/compass-anomaly', group: 'camera' },
  { label: '追风骑行 · 迎风旅途', path: '/wind-riding', group: 'camera' },
  { label: '地脉消消乐 · 汇聚木灵', path: '/leyline-match3', group: 'day1' },
  { label: '云端迷宫 · 灵力滚球', path: '/wind-balance', group: 'day1' },
  { label: '御风引气 · 手机试玩(免登录)', path: '/test/wind-balance', group: 'flow' },
  { label: '红尘摸金 · 手机试玩(免登录)', path: '/test/red-dust-scanner', group: 'flow' },
  { label: '登云踏雾 · 云海跳跃', path: '/cloud-leap', group: 'day1' },
  { label: '登云踏雾 · 试玩(免登录)', path: '/test/cloud-leap', group: 'flow' },
]

/** Day 1 主线进度快跳（stepId 对应 day1Config.mainQuests） */
export const DAY1_DEBUG_JUMPS = [
  { stepId: 0, label: 'Step 0 · 前序契约' },
  { stepId: 3, label: 'Step 3 · 博物馆扫描' },
  { stepId: 4, label: 'Step 4 · 抵坝盘' },
  { stepId: 6, label: 'Step 6 · 御水之契' },
] as const
