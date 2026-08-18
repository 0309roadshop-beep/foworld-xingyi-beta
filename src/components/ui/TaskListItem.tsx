import { ChevronRight, Lock, MapPin } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Task } from '../../types'

const STATUS_LABEL: Record<Task['status'], string> = {
  locked: '未解锁',
  available: '可接取',
  in_progress: '进行中',
  completed: '已完成',
}

const STATUS_COLOR: Record<Task['status'], string> = {
  locked: 'text-mist-faint border-mist-faint/20',
  available: 'text-spirit border-spirit/30',
  in_progress: 'text-gold-bright border-gold-muted/40',
  completed: 'text-bronze-300 border-bronze/30',
}

interface TaskListItemProps {
  task: Task
  selected?: boolean
  onClick?: () => void
}

export function TaskListItem({ task, selected, onClick }: TaskListItemProps) {
  const isLocked = task.status === 'locked'

  return (
    <motion.button
      type="button"
      whileTap={isLocked ? undefined : { scale: 0.98 }}
      onClick={isLocked ? undefined : onClick}
      disabled={isLocked}
      className={`w-full rounded-xl border p-3.5 text-left transition-all ${
        selected
          ? 'border-gold-muted/50 bg-gold-muted/10 shadow-glow'
          : 'border-void-600/60 bg-void-800/40'
      } ${isLocked ? 'cursor-not-allowed opacity-50' : 'active:bg-void-700/40'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] tracking-wider ${STATUS_COLOR[task.status]}`}
            >
              {STATUS_LABEL[task.status]}
            </span>
            {task.distance && (
              <span className="text-[10px] text-mist-faint">{task.distance}</span>
            )}
          </div>
          <h4 className="truncate text-sm font-medium text-mist">{task.title}</h4>
          <div className="mt-1 flex items-center gap-1 text-xs text-mist-muted">
            <MapPin className="h-3 w-3 shrink-0 text-bronze" />
            <span className="truncate">{task.location}</span>
          </div>
        </div>
        {isLocked ? (
          <Lock className="mt-1 h-4 w-4 shrink-0 text-mist-faint" />
        ) : (
          <ChevronRight
            className={`mt-1 h-4 w-4 shrink-0 ${selected ? 'text-gold-bright' : 'text-mist-faint'}`}
          />
        )}
      </div>
    </motion.button>
  )
}
