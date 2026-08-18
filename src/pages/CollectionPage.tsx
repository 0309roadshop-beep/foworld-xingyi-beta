import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SpiritCard } from '../components/collection/SpiritCard'
import { SpiritDetailSheet } from '../components/collection/SpiritDetailSheet'
import { SpiritCollectionIcon } from '../components/brand/SpiritCollectionIcon'
import { PageHeader } from '../components/layout/PageHeader'
import { MobileShell } from '../components/layout/MobileShell'
import { SPIRIT_CATALOG, type SpiritCatalogEntry } from '../config/spiritCatalog'
import { useGameStore } from '../store/gameStore'

export default function CollectionPage() {
  const navigate = useNavigate()
  const { collectedSpirits } = useGameStore()
  const [selectedSpirit, setSelectedSpirit] = useState<SpiritCatalogEntry | null>(null)

  const unlockedSet = useMemo(() => new Set(collectedSpirits), [collectedSpirits])
  const unlockedCount = SPIRIT_CATALOG.filter((s) => unlockedSet.has(s.name)).length
  const progressPct = Math.round((unlockedCount / SPIRIT_CATALOG.length) * 100)

  return (
    <MobileShell className="collection-shell flex flex-col">
      <PageHeader
        title="百灵收藏"
        subtitle="七日幻兽图鉴 · 灵影已收录"
        onBack={() => navigate(-1)}
        right={
          <div className="collection-emblem-frame flex h-11 w-11 items-center justify-center rounded-xl">
            <SpiritCollectionIcon className="h-8 w-8" />
          </div>
        }
      />

      <div className="relative z-10 flex-1 overflow-y-auto overscroll-none px-4 pb-8 scrollbar-none">
        {/* 收集进度 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel mb-5 overflow-hidden p-4"
        >
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-[10px] tracking-[0.3em] text-mist-muted">七日召唤进度</p>
              <p className="mt-1 text-2xl font-medium text-gold-bright">
                {unlockedCount}
                <span className="text-base text-mist-muted"> / {SPIRIT_CATALOG.length}</span>
              </p>
            </div>
            <span className="text-sm text-spirit">{progressPct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-void-700/80">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-jade-deep to-spirit"
            />
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-mist-faint">
            七张幻兽灵影已预先收录。即使尚未召唤，也可以点击卡片查看完整灵影；完成对应主线后将解锁真名与传说。
          </p>
        </motion.div>

        {/* 七日灵影图鉴 — 展示槽位与实际任务解锁日解耦 */}
        <section className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-gold-muted/30 to-transparent" />
            <span className="text-xs tracking-widest text-gold-muted">七日灵影 · Day 1—7</span>
            <div className="h-px flex-1 bg-gradient-to-l from-gold-muted/30 to-transparent" />
          </div>
          <div className="spirit-catalog-grid grid grid-cols-2 gap-3">
            {SPIRIT_CATALOG.map((spirit, index) => (
              <SpiritCard
                key={spirit.id}
                spirit={spirit}
                unlocked={unlockedSet.has(spirit.name)}
                index={index}
                onSelect={setSelectedSpirit}
              />
            ))}
          </div>
        </section>

        {unlockedCount === 0 && (
          <div className="flex flex-col items-center py-8 text-center text-mist-faint">
            <Sparkles className="mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm">七道灵影已经归档</p>
            <p className="mt-1 max-w-xs text-xs">尚无幻兽正式苏醒，前往罗盘完成关键任务即可开始召唤</p>
            <button
              type="button"
              onClick={() => navigate('/compass')}
              className="btn-primary mt-4 px-6 py-2 text-sm"
            >
              继续寻灵
            </button>
          </div>
        )}
      </div>

      <SpiritDetailSheet
        spirit={selectedSpirit}
        unlocked={selectedSpirit ? unlockedSet.has(selectedSpirit.name) : false}
        onClose={() => setSelectedSpirit(null)}
      />
    </MobileShell>
  )
}
