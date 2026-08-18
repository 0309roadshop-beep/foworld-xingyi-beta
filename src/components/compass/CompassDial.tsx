import { motion } from 'framer-motion'
import { CompassSpirit } from './CompassSpirit'

const DIRECTIONS = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'] as const

interface CompassDialProps {
  /** 设备朝向（度，正北为 0） */
  heading?: number
  /** 目标方位角（度） */
  targetBearing?: number
  /** 目标名称（兼容旧用法） */
  targetName?: string
  /** 当前天数罗盘文字提示 — 优先于 targetName 展示 */
  compassHint?: string
  /** 是否已获取设备朝向 */
  headingActive?: boolean
}

export function CompassDial({
  heading = 0,
  targetBearing = 0,
  targetName,
  compassHint,
  headingActive = false,
}: CompassDialProps) {
  const hintText = compassHint ?? (targetName ? `灵力指向 · ${targetName}` : undefined)
  const needleRotation = ((targetBearing - heading + 360) % 360) - 180
  const headingLabel = DIRECTIONS[Math.round(heading / 45) % 8]

  return (
    <div className="realm-compass-ensemble relative mx-auto h-[274px] w-full max-w-[340px]">
      <div className="realm-compass realm-compass-dial absolute left-1 top-6 h-[216px] w-[216px]">
        {/* 外发光 */}
        <div className="absolute inset-0 rounded-full bg-jade/8 blur-2xl" />
        <div className="realm-compass-art absolute inset-[12px] rounded-full" aria-hidden="true" />
        <div className="realm-compass-shade absolute inset-[12px] rounded-full" aria-hidden="true" />
        <div className="absolute inset-[15px] rounded-full border border-sky/15 shadow-[inset_0_0_36px_rgba(56,189,248,0.12)]" />

        {/* 固定方位标 */}
        {(
          [
            { label: '北', angle: 0, highlight: true },
            { label: '东', angle: 90, highlight: false },
            { label: '南', angle: 180, highlight: false },
            { label: '西', angle: 270, highlight: false },
          ] as const
        ).map(({ label, angle, highlight }) => {
          const rad = ((angle - 90) * Math.PI) / 180
          const r = 98
          const x = Math.cos(rad) * r
          const y = Math.sin(rad) * r
          return (
            <div
              key={label}
              className={`absolute left-1/2 top-1/2 z-20 text-[10px] font-medium tracking-wider ${
                highlight ? 'text-gold-bright' : 'text-mist-faint'
              }`}
              style={{
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
              }}
            >
              {label}
            </div>
          )
        })}

        <motion.div
          animate={{ rotate: -heading }}
          transition={{ type: 'spring', stiffness: 80, damping: 20 }}
          className="absolute inset-0"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-1 rounded-full border border-gold-muted/25"
          />
          {Array.from({ length: 36 }).map((_, i) => (
            <div
              key={i}
              className={`absolute left-1/2 top-1.5 w-px -translate-x-1/2 ${
                i % 9 === 0
                  ? 'h-3 bg-gold-muted/70'
                  : i % 3 === 0
                    ? 'h-2 bg-gold-muted/40'
                    : 'h-1 bg-gold-muted/20'
              }`}
              style={{
                transform: `rotate(${i * 10}deg)`,
                transformOrigin: '50% 102px',
              }}
            />
          ))}
        </motion.div>

        <motion.div
          animate={{ rotate: -heading }}
          transition={{ type: 'spring', stiffness: 80, damping: 20 }}
          className="absolute inset-0"
        >
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-6 rounded-full border border-dashed border-jade/30"
          >
            {['☰', '☱', '☲', '☳', '☴', '☵', '☶', '☷'].map((symbol, i) => (
              <span
                key={symbol}
                className="absolute text-[11px] text-gold-muted/60"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `rotate(${i * 45}deg) translate(-50%, -65px) rotate(${-i * 45}deg)`,
                }}
              >
                {symbol}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* 内盘 */}
        <div className="absolute inset-[51px] rounded-full border border-gold-bright/45 bg-void-900/74 shadow-glow backdrop-blur-sm" />

        {/* 灵力指针 - 指向最近任务 */}
        <motion.div
          animate={{ rotate: needleRotation }}
          transition={{ type: 'spring', stiffness: 60, damping: 15 }}
          className="absolute inset-0 z-10 flex items-center justify-center"
        >
          <div className="relative h-full w-full">
            <div
              className="absolute left-1/2 top-[29px] h-[68px] w-[3px] -translate-x-1/2 rounded-full bg-gradient-to-b from-gold-glow via-jade-bright to-transparent shadow-glow"
              style={{ clipPath: 'polygon(30% 0, 70% 0, 100% 100%, 0 100%)' }}
            />
            <div className="absolute left-1/2 top-[29px] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-gold-glow shadow-glow" />
          </div>
        </motion.div>

        {/* 中心 hub */}
        <div className="realm-compass-hub absolute left-1/2 top-1/2 z-20 flex h-[58px] w-[58px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-gold-muted/50 bg-void-950/95 shadow-glow">
          <span className="text-[8px] tracking-[0.2em] text-mist-faint">朝向</span>
          <span className="mt-0.5 font-mono text-[13px] font-medium text-gold-bright">
            {headingActive ? headingLabel : '待机'}
          </span>
          <span className="font-mono text-[9px] text-jade-bright/80">{Math.round(heading)}°</span>
        </div>

        <div className="realm-compass-signal absolute bottom-[17px] left-1/2 z-20 -translate-x-1/2">
          <span className={headingActive ? 'is-active' : ''} />
          {headingActive ? '灵脉已连接' : '方向未连接'}
        </div>
      </div>

      <CompassSpirit
        headingActive={headingActive}
        headingLabel={headingLabel}
        targetBearing={targetBearing}
      />

      {hintText && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="realm-compass-hint absolute inset-x-1 bottom-0 z-40"
        >
          <span>灵讯</span>
          <p>{hintText}</p>
        </motion.div>
      )}
    </div>
  )
}
