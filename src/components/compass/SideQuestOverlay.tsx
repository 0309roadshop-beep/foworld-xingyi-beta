import { CheckCircle2, X } from 'lucide-react'
import { StickerCamera } from '../camera/StickerCamera'
import { GeoMatch } from '../geo/GeoMatch'
import { ConstellationConnect } from '../constellation/ConstellationConnect'
import {
  DEFAULT_CONSTELLATION_BG,
  DEFAULT_SPIRIT_PLACEHOLDER,
  WEAVE_PATTERN_NODES,
} from '../../config/constellationPresets'
import { PipeConnect } from '../pipe/PipeConnect'
import { FossilScratch } from '../fossil/FossilScratch'
import { TimeSlider } from '../timeslider/TimeSlider'
import { PhotoUpload } from '../upload/PhotoUpload'
import { FeedbackForm } from '../feedback/FeedbackForm'
import { GlowButton } from '../ui/GlowButton'
import type { DaySideQuest } from '../../config/day1Types'
import { useGameStore } from '../../store/gameStore'

const STICKER_STORAGE_PREFIX = 'foworld-side-sticker-'
const PHOTO_STORAGE_PREFIX = 'foworld-side-photo-'

interface SideQuestOverlayProps {
  quest: DaySideQuest
  onClose: () => void
}

/**
 * 支线任务浮层 — 与主线完全隔离，关闭即销毁实例（key 由父级控制）
 */
export function SideQuestOverlay({ quest, onClose }: SideQuestOverlayProps) {
  const { addLingyuan, completeSideQuest, completedSideQuests } = useGameStore()
  const alreadyDone = completedSideQuests.includes(quest.questId)

  const settleSideQuest = () => {
    if (alreadyDone) {
      onClose()
      return
    }
    const reward = quest.rewardLingyuan ?? 50
    addLingyuan(reward)
    completeSideQuest(quest.questId)
    onClose()
  }

  const handleStickerSuccess = (base64Data: string) => {
    try {
      localStorage.setItem(`${STICKER_STORAGE_PREFIX}${quest.questId}`, base64Data)
    } catch {
      /* ignore */
    }
    settleSideQuest()
  }

  const handlePhotoSuccess = (base64Data: string) => {
    try {
      localStorage.setItem(`${PHOTO_STORAGE_PREFIX}${quest.questId}`, base64Data)
    } catch {
      /* ignore */
    }
    settleSideQuest()
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-void-950/98">
      <div className="flex shrink-0 items-center justify-between border-b border-void-600/60 px-3 py-2">
        <div className="min-w-0 flex-1 pr-2">
          <p className="truncate text-xs font-medium text-mist">{quest.title}</p>
          <p className="truncate text-[10px] text-mist-faint">{quest.description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full p-1.5 text-mist-muted active:bg-void-700/60"
          aria-label="关闭支线"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {alreadyDone ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <CheckCircle2 className="h-10 w-10 text-spirit" />
          <p className="text-sm text-mist">该支线已完成</p>
          <GlowButton onClick={onClose}>关闭</GlowButton>
        </div>
      ) : (
        <>
          {quest.type === 'game-sticker' && (
            <div className="min-h-0 flex-1">
              <StickerCamera
                key={quest.questId}
                overlayType={quest.overlayType}
                onSuccess={handleStickerSuccess}
                onCancel={onClose}
                onClose={onClose}
              />
            </div>
          )}

          {(quest.type === 'game-geo-match' || quest.type === 'game-match') && (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-none px-2 py-3 scrollbar-none">
              <GeoMatch
                key={quest.questId}
                matchData={quest.matchData}
                onSuccess={settleSideQuest}
              />
            </div>
          )}

          {quest.type === 'game-connect' && (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-none px-2 py-3 scrollbar-none">
              {quest.matchData ? (
                <GeoMatch
                  key={quest.questId}
                  matchData={quest.matchData}
                  onSuccess={settleSideQuest}
                />
              ) : (
                <ConstellationConnect
                  key={quest.questId}
                  nodes={
                    quest.title.includes('织锦') ? WEAVE_PATTERN_NODES : undefined
                  }
                  bgImage={DEFAULT_CONSTELLATION_BG}
                  spiritImage={DEFAULT_SPIRIT_PLACEHOLDER}
                  routeMode={quest.title.includes('织锦') ? 'coverage' : 'ordered'}
                  closeLoop={!quest.title.includes('织锦')}
                  duskOverlay={quest.title.includes('织锦')}
                  onSuccess={settleSideQuest}
                />
              )}
            </div>
          )}

          {quest.type === 'game-photo' && (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-none px-2 py-3 scrollbar-none">
              <PhotoUpload
                key={quest.questId}
                questTitle={quest.title}
                questDesc={quest.description}
                onSuccess={handlePhotoSuccess}
              />
            </div>
          )}

          {quest.type === 'game-slider' && (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-none px-2 py-3 scrollbar-none">
              <p className="mb-3 text-center text-xs text-mist-muted">{quest.description}</p>
              <TimeSlider key={quest.questId} onSuccess={settleSideQuest} />
            </div>
          )}

          {quest.type === 'game-scratch' && (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-none px-2 py-3 scrollbar-none">
              <FossilScratch key={quest.questId} onSuccess={settleSideQuest} />
            </div>
          )}

          {quest.type === 'game-pipe' && (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-none px-2 py-3 scrollbar-none">
              <PipeConnect key={quest.questId} onSuccess={settleSideQuest} />
            </div>
          )}

          {quest.type === 'game-form' && (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-none px-2 py-3 scrollbar-none">
              <FeedbackForm
                key={quest.questId}
                title={quest.title}
                description={quest.description}
                onSuccess={settleSideQuest}
              />
            </div>
          )}

          <div className="shrink-0 border-t border-void-600/60 px-3 py-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg border border-void-600/80 py-2 text-xs text-mist-muted active:bg-void-800/60"
            >
              暂不进行 · 返回
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default SideQuestOverlay
