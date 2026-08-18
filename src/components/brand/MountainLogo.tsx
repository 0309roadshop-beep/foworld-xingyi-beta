import { motion } from 'framer-motion'

interface MountainLogoProps {
  size?: number
  animated?: boolean
  className?: string
}

export function MountainLogo({
  size = 112,
  animated = true,
  className = '',
}: MountainLogoProps) {
  const Wrapper = animated ? motion.div : 'div'
  const wrapperProps = animated
    ? {
        animate: { y: [0, -2, 0], scale: [1, 1.015, 1] },
        transition: { duration: 5.5, repeat: Infinity, ease: 'easeInOut' as const },
      }
    : {}

  return (
    <Wrapper
      {...wrapperProps}
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {animated && (
        <motion.div
          animate={{ opacity: [0.18, 0.38, 0.18], scale: [0.92, 1.04, 0.92] }}
          transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-[8%] rounded-full bg-gold-muted/15 blur-2xl"
        />
      )}

      <img
        src="/assets/generated/foworld-spirit-seal-v2.png"
        alt="FOWORLD 万峰林灵印"
        className="relative z-10 h-full w-full object-contain drop-shadow-[0_8px_22px_rgba(0,0,0,0.36)]"
        draggable={false}
      />
    </Wrapper>
  )
}

export const SpiritLogo = MountainLogo
