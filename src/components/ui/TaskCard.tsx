import { ChevronRight, MapPin, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Task } from '../../types'

interface TaskCardProps {
  task: Task
  onClick?: () => void
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="glass-panel w-full p-4 text-left transition-colors active:border-gold-muted/30"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs tracking-widest text-gold-muted">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{task.type === 'main' ? '主线任务' : '当前任务'}</span>
        </div>
        <ChevronRight className="h-4 w-4 text-mist-faint" />
      </div>
      <h3 className="mb-2 text-lg font-medium text-mist">{task.title}</h3>
      <div className="mb-2 flex items-center gap-1.5 text-sm text-mist-muted">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-bronze" />
        <span>{task.location}</span>
      </div>
      <p className="text-xs leading-relaxed text-mist-faint">{task.description}</p>
    </motion.button>
  )
}
