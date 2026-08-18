import {
  STAR_PENTAGRAM_NODES,
  type ConstellationNode,
} from '../../config/constellationPresets'
import {
  ConstellationConnect,
  type ConstellationRouteMode,
} from '../constellation/ConstellationConnect'

/** @deprecated 请使用 ConstellationNode */
export type OneStrokeNode = ConstellationNode

interface OneStrokeConnectProps {
  nodes?: ConstellationNode[]
  onSuccess?: () => void
  bgImage?: string
  spiritImage?: string
  routeMode?: ConstellationRouteMode
  closeLoop?: boolean
  duskOverlay?: boolean
}

/** 兼容旧接口：默认五芒星序连闭合 */
export function OneStrokeConnect({
  nodes = STAR_PENTAGRAM_NODES,
  onSuccess,
  bgImage,
  spiritImage,
  routeMode = 'ordered',
  closeLoop = true,
  duskOverlay = false,
}: OneStrokeConnectProps) {
  return (
    <ConstellationConnect
      nodes={nodes}
      bgImage={bgImage}
      spiritImage={spiritImage}
      routeMode={routeMode}
      closeLoop={closeLoop}
      duskOverlay={duskOverlay}
      onSuccess={onSuccess}
    />
  )
}

export default OneStrokeConnect
