import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  Phone,
  User,
} from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { SPIRIT_PATHS } from '../constants/spiritPaths'
import { MountainLogo } from '../components/brand/MountainLogo'
import { MobileShell } from '../components/layout/MobileShell'
import { PageHeader } from '../components/layout/PageHeader'
import { DecorativePanel } from '../components/ui/DecorativePanel'
import { GlowButton } from '../components/ui/GlowButton'
import { usePlayer } from '../context/PlayerContext'
import type { SpiritPath } from '../types'

const STEPS = ['灵师信息', '择灵系', '实体卡激活']

export default function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { register } = usePlayer()
  const cardOnly = (location.state as { cardOnly?: boolean } | null)?.cardOnly ?? false

  const [step, setStep] = useState(cardOnly ? 2 : 0)
  const [nickname, setNickname] = useState('')
  const [phone, setPhone] = useState('')
  const [spiritPath, setSpiritPath] = useState<SpiritPath>('earth')
  const [cardCode, setCardCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateStep = () => {
    const e: Record<string, string> = {}
    if (step === 0) {
      if (nickname.trim().length < 2) e.nickname = '昵称至少 2 个字'
      if (phone && !/^1\d{10}$/.test(phone)) e.phone = '请输入有效手机号'
    }
    if (step === 2) {
      if (!/^\d{4}$/.test(cardCode)) e.cardCode = '请输入 4 位数字验证码'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleNext = () => {
    if (!validateStep()) return
    if (step < 2) {
      setStep(step + 1)
      return
    }
    handleSubmit()
  }

  const handleSubmit = () => {
    if (!validateStep()) return
    setLoading(true)
    setTimeout(() => {
      register({
        nickname: nickname.trim() || '唤灵师',
        phone: phone || undefined,
        spiritPath,
        cardCode,
      })
      setLoading(false)
      setSuccess(true)
      setTimeout(() => navigate('/compass'), 1200)
    }, 800)
  }

  const slideVariants = {
    enter: { opacity: 0, x: 24 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -24 },
  }

  return (
    <MobileShell className="register-shell flex flex-col">
      <div className="scene-art scene-art-register" aria-hidden="true" />
      <div className="scene-vignette scene-vignette-register" aria-hidden="true" />

      <PageHeader
        title={cardOnly ? '实体卡激活' : '唤灵师注册'}
        subtitle={`步骤 ${step + 1} / 3 · ${STEPS[step]}`}
        onBack={() => (step > 0 && !cardOnly ? setStep(step - 1) : navigate('/'))}
      />

      {/* 三段式觉醒进度 */}
      <div className="relative z-10 px-5 pb-4">
        <div className="register-progress">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`register-progress-item ${i <= step ? 'register-progress-item-active' : ''}`}
            >
              <span className="register-progress-index">{i + 1}</span>
              <span className="register-progress-label">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-5 pb-8 scrollbar-none">
        <AnimatePresence mode="wait">
          {/* Step 1: 基本信息 */}
          {step === 0 && (
            <motion.div
              key="step0"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35 }}
            >
              <DecorativePanel glow className="register-panel mb-6 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <User className="h-4 w-4 text-gold-muted" />
                  <span className="text-sm font-medium text-mist">建立灵师档案</span>
                </div>
                <p className="mb-5 text-xs leading-relaxed text-mist-faint">
                  为你的唤灵师身份取一个名字，它将出现在罗盘与灵域地图中。
                </p>

                <label className="label-mythic" htmlFor="nickname">
                  唤灵师昵称
                </label>
                <input
                  id="nickname"
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value)
                    setErrors({})
                  }}
                  placeholder="如：云游子"
                  maxLength={12}
                  className="input-mythic mb-1"
                />
                {errors.nickname && (
                  <p className="mb-3 text-xs text-red-400/80">{errors.nickname}</p>
                )}

                <label className="label-mythic mt-4" htmlFor="phone">
                  手机号（选填）
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-faint" />
                  <input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))
                      setErrors({})
                    }}
                    placeholder="用于商户兑换核销"
                    className="input-mythic pl-10"
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-400/80">{errors.phone}</p>
                )}
              </DecorativePanel>
            </motion.div>
          )}

          {/* Step 2: 灵系选择 */}
          {step === 1 && (
            <motion.div
              key="step1"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35 }}
            >
              <DecorativePanel glow className="register-panel mb-4 p-5">
                <p className="mb-1 text-sm font-medium text-mist">选择你的灵系</p>
                <p className="mb-4 text-xs text-mist-faint">
                  灵系决定你在灵域中的感知倾向，注册后不可更改。
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  {SPIRIT_PATHS.map((path) => (
                    <button
                      key={path.id}
                      type="button"
                      onClick={() => setSpiritPath(path.id)}
                      className={`relative overflow-hidden rounded-xl border p-3 text-left transition-all active:scale-[0.98] ${
                        spiritPath === path.id
                          ? `${path.border} bg-gradient-to-br ${path.color} ${path.glow}`
                          : 'border-void-600/60 bg-void-900/40'
                      }`}
                    >
                      <span className="mb-2 block text-2xl">{path.emoji}</span>
                      <span
                        className={`block text-sm font-medium ${
                          spiritPath === path.id ? 'text-mist' : 'text-mist-muted'
                        }`}
                      >
                        {path.name}
                      </span>
                      <span className="text-[10px] text-mist-faint">{path.subtitle}</span>
                      {spiritPath === path.id && (
                        <motion.div
                          layoutId="spirit-ring"
                          className="absolute inset-0 rounded-xl border-2 border-gold-bright/30"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </DecorativePanel>

              <div className="rounded-xl border border-gold-muted/15 bg-void-900/40 p-3 text-center">
                <p className="text-[11px] text-mist-faint">
                  已选 ·{' '}
                  <span className="text-gold-bright">
                    {SPIRIT_PATHS.find((p) => p.id === spiritPath)?.name}
                  </span>
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 3: 实体卡 */}
          {step === 2 && (
            <motion.div
              key="step2"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35 }}
            >
              <DecorativePanel glow className="register-panel p-5">
                <div className="mb-4 flex flex-col items-center text-center">
                  <div className="mb-4">
                    <MountainLogo size={88} />
                  </div>
                  <p className="text-sm font-medium text-mist">实体卡验证</p>
                  <p className="mt-1 text-xs text-mist-faint">
                    输入 FOWORLD 实体卡背面 4 位验证码
                  </p>
                </div>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={cardCode}
                  onChange={(e) => {
                    setCardCode(e.target.value.replace(/\D/g, ''))
                    setErrors({})
                  }}
                  placeholder="· · · ·"
                  className="input-mythic-center mb-2"
                />
                {errors.cardCode && (
                  <p className="mb-2 text-center text-xs text-red-400/80">
                    {errors.cardCode}
                  </p>
                )}
                <p className="text-center text-[11px] text-mist-faint">
                  Demo：输入任意 4 位数字即可通过
                </p>
              </DecorativePanel>

              {!cardOnly && nickname && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-xl border border-spirit/20 bg-spirit-dim/15 p-3"
                >
                  <p className="text-center text-xs text-mist-muted">
                    即将觉醒 ·{' '}
                    <span className="font-medium text-spirit">{nickname}</span>
                    {' · '}
                    {SPIRIT_PATHS.find((p) => p.id === spiritPath)?.name}
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 底部按钮 */}
      {!success && (
        <div className="register-action-bar relative z-10 shrink-0 px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-4">
          <GlowButton
            className="register-next-button flex w-full items-center justify-center gap-2"
            loading={loading}
            disabled={step === 2 && !/^\d{4}$/.test(cardCode)}
            onClick={handleNext}
          >
            {step === 2 ? '完成觉醒' : '下一步'}
            {step < 2 && <ArrowRight className="h-4 w-4" />}
          </GlowButton>
        </div>
      )}

      {/* 成功动画 */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-void-950/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18 }}
              className="flex flex-col items-center gap-4 px-8 text-center"
            >
              <CheckCircle2 className="h-20 w-20 text-spirit drop-shadow-[0_0_24px_rgba(74,222,128,0.5)]" />
              <h2 className="brand-title text-2xl">觉醒成功</h2>
              <p className="text-sm text-mist-muted">欢迎进入万峰林灵域...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MobileShell>
  )
}
