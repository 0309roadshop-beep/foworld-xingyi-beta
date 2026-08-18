import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface GlowButtonProps {
  children: ReactNode
  loading?: boolean
  disabled?: boolean
  className?: string
  onClick?: () => void
}

export function GlowButton({
  children,
  loading = false,
  disabled,
  className = '',
  onClick,
}: GlowButtonProps) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: disabled || loading ? 1 : 0.96 }}
      className={`btn-primary ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-mist/30 border-t-gold-bright" />
          激活中...
        </span>
      ) : (
        children
      )}
    </motion.button>
  )
}
