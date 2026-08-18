import { Camera, CheckCircle2, Gem, Ticket, UserPlus } from 'lucide-react'
import { motion } from 'framer-motion'
import type { CollectionRecord } from '../../types'

const RECORD_ICON = {
  task_complete: CheckCircle2,
  ar_scan: Camera,
  fragment_obtained: Gem,
  redemption: Ticket,
  register: UserPlus,
} as const

const RECORD_COLOR = {
  task_complete: 'text-spirit border-spirit/30 bg-spirit-dim/30',
  ar_scan: 'text-sky-bright border-sky/30 bg-sky-deep/20',
  fragment_obtained: 'text-jade-bright border-jade/30 bg-jade-deep/30',
  redemption: 'text-gold-bright border-gold-muted/40 bg-gold-muted/10',
  register: 'text-sky-bright border-sky/30 bg-sky-deep/20',
} as const

interface RecordItemProps {
  record: CollectionRecord
  index?: number
  isLast?: boolean
}

export function RecordItem({ record, index = 0, isLast = false }: RecordItemProps) {
  const Icon = RECORD_ICON[record.type]

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className="flex gap-3"
    >
      <div className="flex flex-col items-center">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${RECORD_COLOR[record.type]}`}
        >
          <Icon className="h-4 w-4" />
        </div>
        {!isLast && <div className="mt-1 w-px flex-1 bg-void-600/60" />}
      </div>

      <div className="min-w-0 flex-1 pb-5">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium text-mist">{record.title}</h4>
          <time className="shrink-0 text-[10px] text-mist-faint">
            {record.timestamp}
          </time>
        </div>
        <p className="mb-1 text-xs text-jade-bright">{record.location}</p>
        {record.detail && (
          <p className="text-xs leading-relaxed text-mist-faint">{record.detail}</p>
        )}
      </div>
    </motion.div>
  )
}
