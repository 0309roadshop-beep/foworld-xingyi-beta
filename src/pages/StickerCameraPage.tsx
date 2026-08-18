import { useNavigate, useSearchParams } from 'react-router-dom'
import { StickerCamera, type OverlayType } from '../components/camera/StickerCamera'
import { usePlayer } from '../context/PlayerContext'

const VALID_TYPES: OverlayType[] = ['meme', 'film']

function parseOverlayType(raw: string | null): OverlayType {
  if (raw && VALID_TYPES.includes(raw as OverlayType)) return raw as OverlayType
  return 'meme'
}

export default function StickerCameraPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { collectFromAR } = usePlayer()

  const overlayType = parseOverlayType(params.get('type'))

  const handleSuccess = (_base64: string) => {
    collectFromAR(overlayType === 'meme' ? '万峰林 · 文物显眼包' : '万峰林 · 咖啡大片')
  }

  return (
    <StickerCamera
      overlayType={overlayType}
      onSuccess={handleSuccess}
      onClose={() => navigate('/compass')}
    />
  )
}
