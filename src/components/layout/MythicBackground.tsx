import { motion } from 'framer-motion'

export function MythicBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* 天蓝光晕 — 远山晨雾 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(56,189,248,0.14)_0%,transparent_55%)]" />
      {/* 翠绿光晕 — 万峰林 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(45,212,168,0.1)_0%,transparent_45%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_60%,rgba(16,185,129,0.08)_0%,transparent_40%)]" />

      {/* 网格 — 蓝绿科技线 */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(56,189,248,0.6) 1px, transparent 1px),
            linear-gradient(90deg, rgba(45,212,168,0.4) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* 浮动光球 */}
      <motion.div
        animate={{ x: [0, 30, 0], y: [0, -20, 0], opacity: [0.2, 0.45, 0.2] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -left-20 top-1/4 h-64 w-64 rounded-full bg-sky/10 blur-3xl"
      />
      <motion.div
        animate={{ x: [0, -25, 0], y: [0, 15, 0], opacity: [0.15, 0.4, 0.15] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute -right-16 top-1/2 h-48 w-48 rounded-full bg-jade/10 blur-3xl"
      />
      <motion.div
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-jade/40 to-transparent"
      />

      {/* 灵尘粒子 */}
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.div
          key={i}
          className={`absolute h-0.5 w-0.5 rounded-full ${i % 3 === 0 ? 'bg-gold-bright/70' : 'bg-sky-bright/60'}`}
          style={{
            left: `${(i * 17 + 7) % 100}%`,
            top: `${(i * 23 + 11) % 100}%`,
          }}
          animate={{ opacity: [0.2, 0.9, 0.2], scale: [1, 1.5, 1] }}
          transition={{
            duration: 2 + (i % 3),
            repeat: Infinity,
            delay: i * 0.3,
          }}
        />
      ))}

      <div className="scan-sweep-track">
        <div className="scan-sweep-line scan-sweep-line--mythic">
          <div className="scan-sweep-line__bar bg-gradient-to-r from-transparent via-sky/15 to-transparent" />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-jade/25 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-void-950/90 to-transparent" />
    </div>
  )
}
