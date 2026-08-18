export const SPIRIT_PATHS = [
  {
    id: 'gold' as const,
    name: '金系',
    subtitle: '肃杀 · 锋芒',
    emoji: '⚔️',
    color: 'from-amber-600/30 to-yellow-700/20',
    border: 'border-amber-500/50',
    glow: 'shadow-[0_0_20px_rgba(251,191,36,0.25)]',
  },
  {
    id: 'wood' as const,
    name: '木系',
    subtitle: '生机 · 疗愈',
    emoji: '🌿',
    color: 'from-emerald-600/30 to-green-800/20',
    border: 'border-emerald-500/50',
    glow: 'shadow-[0_0_20px_rgba(52,211,153,0.25)]',
  },
  {
    id: 'water' as const,
    name: '水系',
    subtitle: '流动 · 感知',
    emoji: '💧',
    color: 'from-cyan-600/30 to-blue-800/20',
    border: 'border-cyan-500/50',
    glow: 'shadow-[0_0_20px_rgba(34,211,238,0.25)]',
  },
  {
    id: 'fire' as const,
    name: '火系',
    subtitle: '炽烈 · 破障',
    emoji: '🔥',
    color: 'from-orange-600/30 to-red-800/20',
    border: 'border-orange-500/50',
    glow: 'shadow-[0_0_20px_rgba(251,146,60,0.25)]',
  },
  {
    id: 'earth' as const,
    name: '土系',
    subtitle: '厚重 · 守御',
    emoji: '🏔️',
    color: 'from-jade-deep/40 to-sky-deep/30',
    border: 'border-jade/50',
    glow: 'shadow-[0_0_20px_rgba(205,127,50,0.25)]',
  },
]

export function getSpiritPathLabel(id: string) {
  return SPIRIT_PATHS.find((p) => p.id === id)?.name ?? '未知'
}
