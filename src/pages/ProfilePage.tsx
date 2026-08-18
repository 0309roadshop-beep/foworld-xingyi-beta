import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Backpack,
  Camera,
  CheckCircle2,
  Droplets,
  Gem,
  ScrollText,
  Store,
  Ticket,
  User,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MobileShell } from '../components/layout/MobileShell'
import { FragmentCard } from '../components/ui/FragmentCard'
import { RecordItem } from '../components/ui/RecordItem'
import { VoucherCard } from '../components/ui/VoucherCard'
import { usePlayer } from '../context/PlayerContext'
import { getSpiritPathLabel } from '../constants/spiritPaths'
import { SPIRIT_CATALOG } from '../config/spiritCatalog'
import { SpiritCollectionIcon } from '../components/brand/SpiritCollectionIcon'
import { useGameStore } from '../store/gameStore'

type Tab = 'backpack' | 'records' | 'vouchers'

export default function ProfilePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { player, inventory, records, vouchers } = usePlayer()
  const { collectedSpirits } = useGameStore()
  const [tab, setTab] = useState<Tab>('backpack')

  useEffect(() => {
    const state = location.state as { tab?: Tab } | null
    if (state?.tab) setTab(state.tab)
  }, [location.state])

  const totalFragments = inventory.reduce((sum, f) => sum + f.quantity, 0)
  const scanCount = records.filter((r) => r.type === 'ar_scan').length
  const taskCount = records.filter((r) => r.type === 'task_complete').length
  const spiritCount = collectedSpirits.length

  return (
    <MobileShell className="flex flex-col">
      {/* 顶栏 */}
      <header className="relative z-10 flex shrink-0 items-center gap-3 px-4 py-4">
        <button
          type="button"
          onClick={() => navigate('/compass')}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-muted/20 bg-void-800/80 transition-colors active:bg-void-700"
        >
          <ArrowLeft className="h-4 w-4 text-mist" />
        </button>
        <div>
          <h1 className="text-base font-medium text-mist">个人中心</h1>
          <p className="text-[11px] text-mist-faint">背包 · 历程 · 兑换券</p>
        </div>
      </header>

      <div className="relative z-10 flex-1 overflow-y-auto overscroll-none px-4 pb-6 scrollbar-none">
        {/* 玩家信息卡 */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel mb-5 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-jade-deep/50 via-void-800/60 to-sky-deep/40 px-4 py-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold-muted/40 bg-void-900/80 shadow-glow">
                <User className="h-8 w-8 text-gold-bright" />
              </div>
              <div>
                <p className="text-xs tracking-widest text-mist-muted">唤灵师编号</p>
                <h2 className="text-xl font-medium text-glow text-gold-bright">
                  {player.nickname || player.title}
                </h2>
                <p className="text-[11px] text-mist-faint">
                  {player.title} · {getSpiritPathLabel(player.spiritPath)}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Droplets className="h-3.5 w-3.5 text-spirit" />
                  <span className="text-sm font-medium text-spirit">
                    {player.spiritDrops}
                  </span>
                  <span className="text-xs text-mist-muted">灵源滴</span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/exchange')}
                  className="mt-2 flex items-center gap-1 rounded-full border border-spirit/30 bg-spirit-dim/30 px-2.5 py-1 text-[11px] text-spirit active:bg-spirit-dim/50"
                >
                  <Store className="h-3 w-3" />
                  灵源兑换
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/collection')}
                  className="mt-2 ml-2 inline-flex items-center gap-1 rounded-full border border-gold-muted/35 bg-gold-muted/10 px-2.5 py-1 text-[11px] text-gold-bright active:bg-gold-muted/20"
                >
                  <SpiritCollectionIcon className="h-4 w-4" />
                  百灵收藏
                  <span className="text-[10px] text-mist-muted">
                    {spiritCount}/{SPIRIT_CATALOG.length}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* 统计 */}
          <div className="grid grid-cols-3 divide-x divide-void-600/40 border-t border-void-600/40">
            {[
              { icon: Gem, value: totalFragments, label: '碎片总数' },
              { icon: Camera, value: scanCount, label: '扫描次数' },
              { icon: CheckCircle2, value: taskCount, label: '任务记录' },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex flex-col items-center py-3">
                <Icon className="mb-1 h-4 w-4 text-gold-muted" />
                <span className="text-lg font-medium text-mist">{value}</span>
                <span className="text-[10px] text-mist-faint">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* 幻兽收藏入口 */}
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onClick={() => navigate('/collection')}
          className="glass-panel mb-5 flex w-full items-center gap-4 p-4 text-left active:bg-void-800/60"
        >
          <div className="collection-emblem-frame flex h-14 w-14 shrink-0 items-center justify-center rounded-xl">
            <SpiritCollectionIcon className="h-10 w-10" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-mist">百灵收藏 · 幻兽图鉴</p>
            <p className="mt-0.5 text-[11px] text-mist-faint">
              已召唤 {spiritCount} / {SPIRIT_CATALOG.length} 只幻兽
            </p>
          </div>
          <span className="shrink-0 text-xs text-gold-muted">查看 →</span>
        </motion.button>

        {/* Tab 切换 */}
        <div className="mb-4 flex rounded-xl border border-void-600/60 bg-void-800/40 p-1">
          {(
            [
              { key: 'backpack' as Tab, icon: Backpack, label: '背包' },
              { key: 'records' as Tab, icon: ScrollText, label: '历程' },
              { key: 'vouchers' as Tab, icon: Ticket, label: '我的券' },
            ] as const
          ).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm transition-all ${
                tab === key
                  ? 'bg-gold-muted/15 font-medium text-gold-bright shadow-glow'
                  : 'text-mist-muted'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* 背包 */}
        {tab === 'backpack' && (
          <motion.section
            key="backpack"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs tracking-widest text-mist-muted">
                共 {inventory.length} 种 · {totalFragments} 件
              </span>
            </div>

            {inventory.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-mist-faint">
                <Backpack className="mb-3 h-10 w-10 opacity-40" />
                <p className="text-sm">背包空空如也</p>
                <p className="mt-1 text-xs">完成 AR 扫描或任务可获得碎片</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {inventory.map((frag, i) => (
                  <FragmentCard key={frag.id} fragment={frag} index={i} />
                ))}
              </div>
            )}
          </motion.section>
        )}

        {/* 收集历程 */}
        {tab === 'records' && (
          <motion.section
            key="records"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="mb-4 flex items-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-r from-gold-muted/30 to-transparent" />
              <span className="text-xs tracking-widest text-mist-muted">
                探索时间线
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-gold-muted/30 to-transparent" />
            </div>

            {records.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-mist-faint">
                <ScrollText className="mb-3 h-10 w-10 opacity-40" />
                <p className="text-sm">暂无收集记录</p>
              </div>
            ) : (
              <div>
                {records.map((record, i) => (
                  <RecordItem
                    key={record.id}
                    record={record}
                    index={i}
                    isLast={i === records.length - 1}
                  />
                ))}
              </div>
            )}
          </motion.section>
        )}

        {/* 我的券 */}
        {tab === 'vouchers' && (
          <motion.section
            key="vouchers"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs tracking-widest text-mist-muted">
                共 {vouchers.length} 张 ·{' '}
                {vouchers.filter((v) => !v.used).length} 张待核销
              </span>
              <button
                type="button"
                onClick={() => navigate('/exchange')}
                className="text-[11px] text-gold-muted active:text-gold-bright"
              >
                去兑换 →
              </button>
            </div>

            {vouchers.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-mist-faint">
                <Ticket className="mb-3 h-10 w-10 opacity-40" />
                <p className="text-sm">暂无兑换券</p>
                <p className="mt-1 text-xs">积累灵源滴后可兑换商户商品</p>
                <button
                  type="button"
                  onClick={() => navigate('/exchange')}
                  className="btn-primary mt-4 px-6 py-2 text-sm"
                >
                  前往灵源兑换
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {vouchers.map((voucher, i) => (
                  <VoucherCard key={voucher.id} voucher={voucher} index={i} />
                ))}
              </div>
            )}
          </motion.section>
        )}
      </div>
    </MobileShell>
  )
}
