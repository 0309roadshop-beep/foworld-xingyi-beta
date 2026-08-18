import { motion } from 'framer-motion'

interface CompassSpiritProps {
  headingActive: boolean
  headingLabel: string
  targetBearing: number
}
export function CompassSpirit({
  headingActive,
  headingLabel,
  targetBearing,
}: CompassSpiritProps) {
  const statusText = headingActive ? `${headingLabel}向已校准` : '等待方位感应'
  const normalizedBearing = Math.round((targetBearing + 360) % 360)

  return (
    <motion.aside
      initial={{ opacity: 0, x: 18, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay: 0.18, type: 'spring', stiffness: 120, damping: 16 }}
      className="realm-compass-spirit"
      aria-label={`罗盘灵，${statusText}，目标方位 ${normalizedBearing} 度`}
    >
      <div className="realm-spirit-dialogue">
        <span className={`realm-spirit-status-dot ${headingActive ? 'is-active' : ''}`} />
        <div>
          <p>罗盘灵</p>
          <span>{statusText}</span>
        </div>
      </div>

      <div className="realm-spirit-portrait">
        <div className="realm-spirit-aura" aria-hidden="true" />
        <motion.img
          src="/assets/generated/compass-spirit-v2.png"
          alt="玉石与古铜打造的罗盘灵"
          animate={{ y: [0, -5, 0], rotate: [0, 0.8, 0] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
          draggable={false}
        />
      </div>

      <div className="realm-spirit-bearing">
        <span>目标</span>
        <strong>{normalizedBearing}°</strong>
      </div>
    </motion.aside>
  )
}
