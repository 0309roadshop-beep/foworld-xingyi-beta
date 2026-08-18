/** 抽象岩石剪影 */
export function RockSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 140" className={className} fill="currentColor" aria-hidden>
      <path d="M20 120 L35 75 L55 90 L70 50 L95 70 L105 120 Z" opacity="0.85" />
      <path d="M30 120 L50 95 L65 110 L80 80 L100 120 Z" opacity="0.45" />
    </svg>
  )
}

/** 海狮形剪影 */
export function SeaLionSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 140" className={className} fill="currentColor" aria-hidden>
      <path d="M20 120 L30 95 L45 88 Q70 55 88 70 Q100 78 95 95 L105 120 Z" opacity="0.9" />
      <ellipse cx="78" cy="72" rx="10" ry="8" opacity="0.35" />
      <path
        d="M42 88 Q55 75 68 82"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.3"
      />
    </svg>
  )
}
