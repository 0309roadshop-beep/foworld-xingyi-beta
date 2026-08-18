import { useNavigate } from 'react-router-dom'
import { WindRiding } from '../components/transition/WindRiding'
import { useGameStore } from '../store/gameStore'

/** 独立调试页 — 追风骑行过渡 */
export default function WindRidingPage() {
  const navigate = useNavigate()
  const { unlockAffinity } = useGameStore()

  return (
    <div className="flex min-h-dvh flex-col bg-void-950 px-3 py-4">
      <h1 className="mb-3 text-center text-sm font-medium text-mist">追风骑行 · 迎风旅途</h1>
      <WindRiding
        onComplete={() => {
          unlockAffinity('乘风亲和')
          navigate(-1)
        }}
      />
    </div>
  )
}
