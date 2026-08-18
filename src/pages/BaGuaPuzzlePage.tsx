import { useNavigate } from 'react-router-dom'
import { BaGuaTianPuzzle } from '../components/puzzle/BaGuaTianPuzzle'

/** 独立调试页 — 八卦田双阶段解密 */
export function BaGuaPuzzlePage() {
  const navigate = useNavigate()

  return (
    <div className="realm-standalone-stage flex min-h-dvh flex-col bg-void-950 px-3 py-4">
      <h1 className="realm-standalone-title mb-3 text-center text-sm font-medium text-mist">
        八卦田 · 八门三才
      </h1>
      <BaGuaTianPuzzle
        spiritName="万峰山神"
        showAllClues
        onSuccess={() => navigate(-1)}
      />
    </div>
  )
}

export default BaGuaPuzzlePage
