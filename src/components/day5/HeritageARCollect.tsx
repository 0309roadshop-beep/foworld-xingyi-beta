import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useState } from 'react'
import { ScanLine, Sparkles } from 'lucide-react'

const HERITAGE_ITEMS = [
  {
    id: 'wax',
    title: '蜡染',
    subtitle: '蓝白灵纹',
    desc: '布依蜡染以蜂蜡防染，冰裂纹路如地脉图谱，承载水寨千年记忆。',
  },
  {
    id: 'music',
    title: '八音坐唱',
    subtitle: '竹木和鸣',
    desc: '牛腿琴、月琴、马骨胡等八音齐奏，是布依族口传心授的活态非遗。',
  },
  {
    id: 'weave',
    title: '织锦',
    subtitle: '经纬织梦',
    desc: '彩线穿梭吊脚楼黄昏，几何纹样是灯火与河流的抽象诗。',
  },
] as const

export interface HeritageARCollectProps {
  onComplete?: () => void
}

/** 寻遗织梦 — 非遗 AR 扫描收集与科普卡片 */
export function HeritageARCollect({ onComplete }: HeritageARCollectProps) {
  const [collected, setCollected] = useState<Set<string>>(new Set())
  const [scanning, setScanning] = useState<string | null>(null)
  const [activeCard, setActiveCard] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleScan = useCallback(
    (id: string) => {
      if (collected.has(id) || scanning || done) return
      setScanning(id)
      window.setTimeout(() => {
        setScanning(null)
        setCollected((prev) => {
          const next = new Set(prev)
          next.add(id)
          if (next.size >= HERITAGE_ITEMS.length) {
            setDone(true)
            window.setTimeout(() => onComplete?.(), 1400)
          }
          return next
        })
        setActiveCard(id)
      }, 1200)
    },
    [collected, scanning, done, onComplete],
  )

  return (
    <div className="w-full">
      <p className="mb-3 text-center text-xs text-mist-muted">
        对准工坊灵纹印记，轻触扫描收集非遗残片（{collected.size}/{HERITAGE_ITEMS.length}）
      </p>

      <div className="space-y-3">
        {HERITAGE_ITEMS.map((item) => {
          const isCollected = collected.has(item.id)
          const isScanning = scanning === item.id
          const isOpen = activeCard === item.id

          return (
            <div
              key={item.id}
              className={`rounded-xl border p-3 transition-colors ${
                isCollected
                  ? 'border-gold-muted/40 bg-gold-muted/5'
                  : 'border-teal-muted/25 bg-[#0a1f1f]/60'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-mist">{item.title}</p>
                  <p className="text-[10px] tracking-widest text-gold-muted">{item.subtitle}</p>
                </div>
                {!isCollected ? (
                  <button
                    type="button"
                    onClick={() => handleScan(item.id)}
                    disabled={!!scanning}
                    className="flex min-h-[3rem] min-w-[5.5rem] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-sky-bright/40 bg-sky-deep/20 px-4 py-2 text-xs text-sky-bright active:bg-sky-deep/35 disabled:opacity-50"
                  >
                    <ScanLine className="h-4 w-4" />
                    AR 扫描
                  </button>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-gold-bright">
                    <Sparkles className="h-3.5 w-3.5" />
                    已收录
                  </span>
                )}
              </div>

              <AnimatePresence>
                {isScanning && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="relative mt-3 h-16 overflow-hidden rounded-lg border border-sky-bright/30 bg-void-950"
                  >
                    <div className="scan-sweep-track">
                      <div
                        className="scan-sweep-line scan-sweep-line--tight left-0 right-0"
                        style={{ animationDuration: '1.1s' }}
                      >
                        <div className="scan-sweep-line__bar h-0.5 bg-sky-bright shadow-[0_0_12px_rgba(56,189,248,0.8)]" />
                      </div>
                    </div>
                    <p className="flex h-full items-center justify-center text-[11px] text-sky-bright/80">
                      灵纹识别中…
                    </p>
                  </motion.div>
                )}
                {isCollected && isOpen && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2 text-[11px] leading-relaxed text-mist-faint"
                  >
                    {item.desc}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {done && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-center text-sm text-spirit"
        >
          非遗地脉残片已织入灵册，织梦之门开启…
        </motion.p>
      )}
    </div>
  )
}

export default HeritageARCollect
