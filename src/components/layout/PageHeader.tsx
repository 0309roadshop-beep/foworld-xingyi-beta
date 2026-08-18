import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  onBack?: () => void
  right?: ReactNode
}

export function PageHeader({ title, subtitle, onBack, right }: PageHeaderProps) {
  return (
    <header className="page-header-surface relative z-10 flex shrink-0 items-center gap-3 px-4 py-4">
      {onBack ? (
        <motion.button
          type="button"
          aria-label="返回上一页"
          whileTap={{ scale: 0.92 }}
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-muted/25 bg-void-800/70 backdrop-blur-sm"
        >
          <ArrowLeft className="h-4 w-4 text-mist" />
        </motion.button>
      ) : (
        <div className="w-10" />
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-medium tracking-wide text-mist">
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-[11px] text-mist-faint">{subtitle}</p>
        )}
      </div>
      {right ?? <div className="w-10" />}
    </header>
  )
}
