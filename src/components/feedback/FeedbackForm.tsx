import { useState } from 'react'
import { GlowButton } from '../ui/GlowButton'

export interface FeedbackFormProps {
  title: string
  description: string
  onSuccess: () => void
}

const FEEDBACK_STORAGE_KEY = 'foworld-day7-feedback'

/**
 * 寻灵感言 — 简单反馈表单（支线 game-form）
 */
export function FeedbackForm({ title, description, onSuccess }: FeedbackFormProps) {
  const [text, setText] = useState('')
  const [rating, setRating] = useState(5)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = () => {
    if (!text.trim()) return
    try {
      localStorage.setItem(
        FEEDBACK_STORAGE_KEY,
        JSON.stringify({ text: text.trim(), rating, at: Date.now() }),
      )
    } catch {
      /* ignore */
    }
    setSubmitted(true)
    setTimeout(onSuccess, 800)
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
        <p className="text-sm text-spirit">感谢你的寻灵感言</p>
        <p className="mt-2 text-xs text-mist-faint">FOWORLD 因你而进化</p>
      </div>
    )
  }

  return (
    <div className="px-3 py-4">
      <h3 className="mb-1 text-center text-base font-medium text-mist">{title}</h3>
      <p className="mb-4 text-center text-xs text-mist-muted">{description}</p>

      <div className="mb-4 flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onPointerDown={(e) => {
              e.preventDefault()
              setRating(n)
            }}
            className={`h-9 w-9 rounded-full border text-sm transition-transform active:scale-95 ${
              n <= rating
                ? 'border-gold-bright/50 bg-gold-muted/20 text-gold-bright'
                : 'border-void-600/60 text-mist-faint'
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="写下你的内测感受、建议或难忘瞬间…"
        rows={5}
        className="mb-4 w-full resize-none rounded-xl border border-void-600/70 bg-void-900/80 px-3 py-2.5 text-sm text-mist placeholder:text-mist-faint focus:border-jade-muted/40 focus:outline-none"
      />

      <GlowButton className="w-full" onClick={handleSubmit} disabled={!text.trim()}>
        提交寻灵感言
      </GlowButton>
    </div>
  )
}

export default FeedbackForm
