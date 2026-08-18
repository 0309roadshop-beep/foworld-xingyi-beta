import { motion } from 'framer-motion'
import { useCallback, useState } from 'react'
import { Camera, Sparkles } from 'lucide-react'
import {
  D5_HERITAGE_ITEMS,
  PHOTO_D5_ITEM_COUNT,
  type HeritagePhotoItem,
} from '../../config/day5HeritageConfig'
import { PhotoUpload } from '../upload/PhotoUpload'
import { ModalOverlay } from '../ui/ModalOverlay'
import { HeritageInfoCard } from './HeritageInfoCard'

export interface HeritageGalleryProps {
  onComplete?: () => void
}

/**
 * Photo_D5 · 寻遗织梦
 * 六项非遗各上传一张对应实景照片 → InfoCard 科普 → 收录
 */
export function HeritageGallery({ onComplete }: HeritageGalleryProps) {
  const [collected, setCollected] = useState<Set<string>>(new Set())
  const [uploadTarget, setUploadTarget] = useState<HeritagePhotoItem | null>(null)
  const [infoCardPoint, setInfoCardPoint] = useState<HeritagePhotoItem | null>(null)

  const handleUploadSuccess = useCallback(() => {
    if (!uploadTarget) return
    setInfoCardPoint(uploadTarget)
    setUploadTarget(null)
  }, [uploadTarget])

  const handleCollect = useCallback(() => {
    if (!infoCardPoint) return
    const id = infoCardPoint.id
    setCollected((prev) => {
      const next = new Set(prev)
      next.add(id)
      if (next.size >= PHOTO_D5_ITEM_COUNT) {
        window.setTimeout(() => onComplete?.(), 1200)
      }
      return next
    })
    setInfoCardPoint(null)
  }, [infoCardPoint, onComplete])

  const allDone = collected.size >= PHOTO_D5_ITEM_COUNT

  return (
    <>
      <div className="w-full">
        <p className="mb-3 text-center text-xs text-mist-muted">
          为六项非遗各上传一张实景照片，收录图鉴（{collected.size}/{PHOTO_D5_ITEM_COUNT}）
        </p>

        <div className="space-y-3">
          {D5_HERITAGE_ITEMS.map((item) => {
            const isCollected = collected.has(item.id)
            const isBusy = Boolean(uploadTarget || infoCardPoint)

            return (
              <div
                key={item.id}
                className={`rounded-xl border p-3 transition-colors ${
                  isCollected
                    ? 'border-gold-muted/40 bg-gold-muted/5'
                    : 'border-teal-muted/25 bg-[#0a1f1f]/60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-mist">{item.title}</p>
                    <p className="text-[10px] tracking-widest text-gold-muted">{item.subtitle}</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-mist-faint">
                      建议拍摄：{item.photoHint}
                    </p>
                  </div>

                  {isCollected ? (
                    <span className="flex shrink-0 items-center gap-1 text-xs text-gold-bright">
                      <Sparkles className="h-3.5 w-3.5" />
                      已收录
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setUploadTarget(item)}
                      disabled={isBusy}
                      className="flex min-h-[2.75rem] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-sky-bright/40 bg-sky-deep/20 px-3 py-2 text-xs text-sky-bright active:bg-sky-deep/35 disabled:opacity-40"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      上传照片
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {allDone && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-center text-sm text-spirit"
          >
            六项非遗图鉴齐备，千灯结缘阵图即将开启…
          </motion.p>
        )}
      </div>

      <ModalOverlay open={Boolean(uploadTarget)} lockScroll onBackdropClick={() => setUploadTarget(null)}>
        {uploadTarget && (
          <div className="mx-auto w-full max-w-sm rounded-2xl border border-white/10 bg-void-900/95 p-2 shadow-xl">
            <PhotoUpload
              key={uploadTarget.id}
              questTitle={`${uploadTarget.title} · 实景留影`}
              questDesc={`请上传一张与【${uploadTarget.title}】相关的实景照片（${uploadTarget.photoHint}）。`}
              onSuccess={handleUploadSuccess}
            />
            <button
              type="button"
              onClick={() => setUploadTarget(null)}
              className="mt-2 w-full rounded-lg py-2 text-xs text-mist-muted active:bg-white/5"
            >
              取消
            </button>
          </div>
        )}
      </ModalOverlay>

      <ModalOverlay open={Boolean(infoCardPoint)} lockScroll>
        {infoCardPoint && (
          <HeritageInfoCard point={infoCardPoint} onCollect={handleCollect} />
        )}
      </ModalOverlay>
    </>
  )
}

export default HeritageGallery
