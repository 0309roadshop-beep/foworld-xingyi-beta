import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useRef, useState, type ChangeEvent } from 'react'
import { Camera, Sparkles } from 'lucide-react'
import { compressImageFile } from '../upload/PhotoUpload'
import { ModalOverlay } from '../ui/ModalOverlay'

const SLOT_COUNT = 3
const SCAN_MS = 2800

function CrystalFragmentIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 56" className={className} fill="currentColor" aria-hidden>
      <path
        d="M24 4 L38 22 L32 48 L16 52 L8 30 L14 12 Z"
        opacity="0.9"
        style={{ filter: 'drop-shadow(0 0 6px rgba(56,189,248,0.8))' }}
      />
      <path d="M20 18 L28 26 L22 38" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
    </svg>
  )
}

export interface FragmentScannerProps {
  onComplete?: () => void
}

type Phase = 'upload' | 'scanning' | 'revealed' | 'done'

/**
 * 阵核碎片扫描 — 上传洞内钟乳石照片并罗盘剥离灵力碎片
 */
export function FragmentScanner({ onComplete }: FragmentScannerProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [activeSlot, setActiveSlot] = useState<number | null>(null)
  const [photos, setPhotos] = useState<(string | null)[]>(Array(SLOT_COUNT).fill(null))
  const [phase, setPhase] = useState<Phase>('upload')
  const [showModal, setShowModal] = useState(false)
  const [scanKey, setScanKey] = useState(0)

  const filledCount = photos.filter(Boolean).length
  const allReady = filledCount === SLOT_COUNT

  const openSlot = useCallback((index: number) => {
    if (phase !== 'upload') return
    setActiveSlot(index)
    fileRef.current?.click()
  }, [phase])

  const onFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file?.type.startsWith('image/') || activeSlot == null) return
      try {
        const base64 = await compressImageFile(file)
        setPhotos((prev) => {
          const next = [...prev]
          next[activeSlot] = base64
          return next
        })
      } catch (err) {
        console.error('[FragmentScanner]', err)
      }
      setActiveSlot(null)
    },
    [activeSlot],
  )

  const startScan = useCallback(() => {
    if (!allReady || phase !== 'upload') return
    setPhase('scanning')
    setScanKey((k) => k + 1)
    window.setTimeout(() => {
      setPhase('revealed')
      setShowModal(true)
    }, SCAN_MS)
  }, [allReady, phase])

  const handleConfirm = useCallback(() => {
    setShowModal(false)
    setPhase('done')
    window.setTimeout(() => onComplete?.(), 600)
  }, [onComplete])

  return (
    <div className="w-full">
      <p className="mb-2 text-center text-xs text-mist-muted">
        重见天日后，上传洞内拍到的钟乳石影像，提取被封印的阵核碎片
      </p>
      <p className="mb-4 text-center text-[11px] text-sky-bright/70">
        已就位 {filledCount}/{SLOT_COUNT}
      </p>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFileChange}
      />

      <div className="relative mx-auto grid max-w-sm grid-cols-3 gap-2.5">
        {photos.map((url, i) => (
          <div key={i} className="relative">
            <button
              type="button"
              disabled={phase !== 'upload' || !!url}
              onClick={() => openSlot(i)}
              className={`relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-xl border transition-colors ${
                url
                  ? 'border-sky-bright/25 bg-void-900'
                  : 'border-dashed border-mist-faint/25 bg-void-950/80 active:bg-void-900'
              } ${phase === 'revealed' || phase === 'done' ? 'opacity-45' : ''}`}
            >
              {url ? (
                <img src={url} alt="" className="h-full w-full object-cover" />
              ) : (
                <>
                  <Camera className="mb-1 h-6 w-6 text-mist-muted/50" />
                  <span className="text-[9px] text-mist-faint">钟乳石 {i + 1}</span>
                </>
              )}

              {phase === 'scanning' && (
                <div className="pointer-events-none absolute inset-0 overflow-hidden bg-void-950/20">
                  <div key={scanKey} className="scan-sweep-track">
                    <div
                      className="scan-sweep-line scan-sweep-line--tight left-0 right-0"
                      style={{ animationDuration: '1.1s', animationIterationCount: 2 }}
                    >
                      <div className="scan-sweep-line__bar h-1 bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_16px_rgba(34,211,238,0.9)]" />
                    </div>
                  </div>
                </div>
              )}
            </button>

            <AnimatePresence>
              {(phase === 'revealed' || phase === 'done') && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.6 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.12, type: 'spring', stiffness: 280 }}
                  className="pointer-events-none absolute -top-3 left-1/2 z-10 -translate-x-1/2 text-cyan-200"
                >
                  <CrystalFragmentIcon className="h-10 w-10 drop-shadow-[0_0_12px_rgba(56,189,248,0.75)]" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {phase === 'scanning' && (
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-xl border border-cyan-400/30"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </div>

      {phase === 'upload' && allReady && (
        <motion.button
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          type="button"
          onClick={startScan}
          className="mx-auto mt-5 flex w-full max-w-sm items-center justify-center gap-2 rounded-xl border border-sky-bright/40 bg-sky-deep/20 py-3 text-sm font-medium text-sky-bright active:bg-sky-deep/35"
        >
          <Sparkles className="h-4 w-4" />
          开启罗盘扫描
        </motion.button>
      )}

      {phase === 'scanning' && (
        <p className="mt-4 text-center text-xs tracking-widest text-cyan-200/80">
          灵力扫描线剥离阵核…
        </p>
      )}

      <ModalOverlay open={showModal}>
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full rounded-2xl border border-cyan-400/30 bg-void-950 p-5 text-center shadow-[0_0_32px_rgba(34,211,238,0.15)]"
        >
          <p className="mb-3 text-sm leading-relaxed text-mist">
            已从钟乳石影像中剥离出 3 块【阵核碎片】！但它们极度排斥彼此，需要大地之力才能融合。
          </p>
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full rounded-xl border border-gold-muted/40 bg-gold-muted/10 py-3 text-sm font-medium text-gold-bright"
          >
            前往寻觅息壤
          </button>
        </motion.div>
      </ModalOverlay>
    </div>
  )
}

export default FragmentScanner
