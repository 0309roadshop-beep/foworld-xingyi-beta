import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlignCamera, type QuestType } from '../components/camera/AlignCamera'
import { usePlayer } from '../context/PlayerContext'

const VALID_QUESTS: QuestType[] = ['tree', 'bagua', 'castle', 'bridge']

const QUEST_LABELS: Record<QuestType, string> = {
  tree: '树王',
  bagua: '八卦田',
  castle: '古堡',
  bridge: '观景大桥',
}

function parseQuestType(raw: string | null): QuestType {
  if (raw && VALID_QUESTS.includes(raw as QuestType)) {
    return raw as QuestType
  }
  return 'bagua'
}

export default function CameraPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { collectFromAR } = usePlayer()

  const questType = parseQuestType(params.get('quest'))

  const handleSuccess = () => {
    const location = `万峰林 · ${QUEST_LABELS[questType]}`
    collectFromAR(location)
    window.setTimeout(() => navigate('/compass'), 1600)
  }

  return (
    <AlignCamera
      questType={questType}
      onSuccess={handleSuccess}
      onClose={() => navigate('/compass')}
    />
  )
}
