import { motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Compass,
  MapPin,
  Sparkles,
  UserPlus,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MountainLogo } from '../components/brand/MountainLogo'
import { MobileShell } from '../components/layout/MobileShell'
import { DecorativePanel } from '../components/ui/DecorativePanel'
import { GlowButton } from '../components/ui/GlowButton'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <MobileShell variant="immersive" className="landing-shell items-center">
      <div className="scene-art scene-art-landing" aria-hidden="true" />
      <div className="scene-vignette" aria-hidden="true" />

      <div className="relative z-10 flex h-full w-full max-w-[430px] flex-col px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))]">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <span className="landing-kicker">
            <Compass className="h-3 w-3" />
            FOWORLD IMMERSIVE
          </span>
          <span className="landing-location-pill">
            <MapPin className="h-3 w-3" />
            贵州 · 兴义
          </span>
        </motion.div>

        {/* Logo 与品牌主标题 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="landing-brand-mark relative mt-7 self-center"
        >
          <MountainLogo size={100} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-3 text-center"
        >
          <p className="mb-2 text-[10px] tracking-[0.62em] text-mist-muted">F O W O R L D</p>
          <h1 className="brand-title mb-2 text-[3.25rem] font-medium leading-none">寻灵记</h1>
          <p className="text-sm font-medium tracking-[0.16em] text-mist/90">
            万峰成林 · 实景入境
          </p>
        </motion.div>

        <div className="min-h-10 flex-1" aria-hidden="true" />

        {/* 核心体验标签 */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-3 grid grid-cols-3 gap-2"
        >
          {[
            ['AR 实景', '山野入境'],
            ['七日旅程', '剧情探索'],
            ['百灵收集', '在地兑换'],
          ].map(([title, subtitle]) => (
            <div key={title} className="landing-feature-chip">
              <span>{title}</span>
              <small>{subtitle}</small>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="w-full space-y-3"
        >
          <GlowButton
            className="landing-primary-cta flex w-full items-center justify-center gap-2"
            onClick={() => navigate('/register')}
          >
            <UserPlus className="h-4 w-4" />
            开启寻灵旅程
            <ArrowRight className="h-4 w-4" />
          </GlowButton>

          <DecorativePanel className="landing-activation-card p-3.5">
            <button
              type="button"
              onClick={() => navigate('/register', { state: { cardOnly: true } })}
              className="flex w-full items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-muted/25 bg-gold-muted/10">
                  <CalendarDays className="h-4 w-4 text-gold-bright" />
                </div>
                <div>
                  <p className="text-sm font-medium text-mist">已有唤灵实体卡</p>
                  <p className="text-[11px] text-mist-muted">跳过建档 · 快速激活身份</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-mist-faint" />
            </button>
          </DecorativePanel>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-4 flex items-center justify-center gap-1.5 text-center text-[10px] tracking-[0.18em] text-mist-muted/70"
        >
          <Sparkles className="h-3 w-3 text-gold-muted/70" />
          一卡一旅程 · 七日沉浸寻灵
        </motion.p>
      </div>
    </MobileShell>
  )
}
