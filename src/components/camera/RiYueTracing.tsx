import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DAY2_CLUE_SANCAI } from '../../config/day2Clues'
import {
  RIYUE_HOLOGRAM_ZONES,
  RIYUE_PANORAMA_IMAGE,
  resolveHitboxSizePct,
  type RiYueHologramZone,
} from '../../config/riyuePanoramaConfig'
import { useGameStore } from '../../store/gameStore'

/** 全息 AR 投影参数校准仪 — 策划对齐后改为 false */
const isDebug = false

const TOAST_MS = 2200
const COMPLETE_DELAY_MS = 1000
const DEFAULT_BRIEFING =
  '梯田间隐匿着明代风水大阵的日月残影，请开启高维雷达进行定点锚定。'

type CalibratorZone = {
  id: number
  zoneKey: string
  name: string
  captureToast: string
  cx: number
  cy: number
  scale: number
  rotZ: number
}

function configToCalibratorZones(config: RiYueHologramZone[]): CalibratorZone[] {
  return config.map((z, i) => ({
    id: i + 1,
    zoneKey: z.id,
    name: z.label,
    captureToast: z.captureToast,
    cx: z.cx,
    cy: z.cy,
    scale: z.scale,
    rotZ: z.rotZ,
  }))
}

export interface RiYueTracingProps {
  onSuccess?: () => void
  onError?: (message: string) => void
  onCancel?: () => void
  onClose?: () => void
  questName?: string
  description?: string
  briefingText?: string
}

function playAnchorDing() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1046.5, now)
    osc.frequency.exponentialRampToValueAtTime(1568, now + 0.06)
    gain.gain.setValueAtTime(0.28, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.44)
    window.setTimeout(() => void ctx.close(), 480)
  } catch {
    /* 静默 */
  }
}

/** 多图层 SVG 图腾本体（透视/缩放/旋转由外层容器承担） */
function RiYueArTotemLayers({ entering }: { entering?: boolean }) {
  return (
    <div className={`relative h-32 w-32 ${entering ? 'riyue-ar-totem-enter' : ''}`}>
      <div className="absolute inset-0 rounded-full border-2 border-[#00F5FF] opacity-30 animate-ping" />

      <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
        <g className="riyue-radar-ring">
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="#00F5FF"
            strokeWidth="1.5"
            strokeDasharray="4 8"
            opacity="0.6"
          />
        </g>

        <circle cx="50" cy="50" r="35" fill="none" stroke="#00F5FF" strokeWidth="0.5" opacity="0.3" />

        <circle
          cx="50"
          cy="50"
          r="16"
          fill="#00F5FF"
          opacity="0.85"
          filter="drop-shadow(0 0 10px #00F5FF)"
        />

        <path
          d="M 50 18 A 32 32 0 1 1 18 50 A 42 42 0 0 0 50 18 Z"
          fill="#00F5FF"
          opacity="0.9"
          filter="drop-shadow(0 0 6px #00F5FF)"
        />
      </svg>
    </div>
  )
}

function HologramProjection({
  zone,
  preview,
  entering,
}: {
  zone: Pick<CalibratorZone, 'cx' | 'cy' | 'scale' | 'rotZ'>
  preview?: boolean
  entering?: boolean
}) {
  return (
    <div
      className={`absolute z-10 pointer-events-none ${preview ? 'opacity-90' : ''}`}
      style={{
        left: `${zone.cx}%`,
        top: `${zone.cy}%`,
        transform: `translate(-50%, -50%) perspective(500px) rotateX(65deg) rotateZ(${zone.rotZ}deg) scale(${zone.scale})`,
      }}
    >
      <RiYueArTotemLayers entering={entering} />
    </div>
  )
}

function PlayModeHitzone({
  zone,
  isFound,
  onAnchor,
}: {
  zone: CalibratorZone
  isFound: boolean
  onAnchor: (zone: CalibratorZone) => void
}) {
  const hitboxPct = resolveHitboxSizePct(zone.scale)
  const hitboxHalf = hitboxPct / 2

  return (
    <>
      {!isFound && (
        <div
          className="riyue-hotzone absolute z-10 active:opacity-80"
          style={{
            left: `${zone.cx - hitboxHalf}%`,
            top: `${zone.cy - hitboxHalf}%`,
            width: `${hitboxPct}%`,
            height: `${hitboxPct}%`,
          }}
          onClick={() => onAnchor(zone)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onAnchor(zone)
            }
          }}
          aria-label={zone.name}
          role="button"
          tabIndex={0}
        />
      )}
      {isFound && <HologramProjection zone={zone} entering />}
    </>
  )
}

type SliderRowProps = {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
}

function SliderRow({ label, value, min, max, step, format, onChange }: SliderRowProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] text-white/70">
        <span>{label}</span>
        <span className="font-mono text-[#00F5FF]">{format(value)}</span>
      </div>
      <input
        type="range"
        className="riyue-calibrator-slider w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  )
}

function HologramCalibratorPanel({
  zones,
  activeZone,
  onSelectZone,
  onPatchZone,
}: {
  zones: CalibratorZone[]
  activeZone: number
  onSelectZone: (index: number) => void
  onPatchZone: (patch: Partial<Pick<CalibratorZone, 'cx' | 'cy' | 'scale' | 'rotZ'>>) => void
}) {
  const current = zones[activeZone]
  if (!current) return null

  const jsonText = JSON.stringify(
    zones.map(({ id, name, cx, cy, scale, rotZ }) => ({ id, name, cx, cy, scale, rotZ })),
    null,
    2,
  )

  const handleCopy = () => {
    void navigator.clipboard.writeText(jsonText)
  }

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-50 border-t border-[#00F5FF]/25 bg-black/90 p-4 text-white backdrop-blur-md"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <p className="mb-2 text-center text-[11px] font-medium text-amber-300">全息 AR 投影参数校准仪</p>

      <div className="mb-3 flex gap-2">
        {zones.map((z, i) => (
          <button
            key={z.id}
            type="button"
            className={`flex-1 rounded-lg border py-1.5 text-[10px] transition-colors ${
              activeZone === i
                ? 'border-[#00F5FF]/60 bg-[#00F5FF]/15 text-[#00F5FF]'
                : 'border-white/20 bg-white/5 text-white/55'
            }`}
            onClick={() => onSelectZone(i)}
          >
            {z.name.replace('日月', '')}
          </button>
        ))}
      </div>

      <div className="mb-3 space-y-2.5">
        <SliderRow
          label="X轴 (cx)"
          value={current.cx}
          min={0}
          max={100}
          step={0.1}
          format={(v) => `${v.toFixed(1)}%`}
          onChange={(cx) => onPatchZone({ cx })}
        />
        <SliderRow
          label="Y轴 (cy)"
          value={current.cy}
          min={0}
          max={100}
          step={0.1}
          format={(v) => `${v.toFixed(1)}%`}
          onChange={(cy) => onPatchZone({ cy })}
        />
        <SliderRow
          label="缩放 (scale)"
          value={current.scale}
          min={0.2}
          max={2.5}
          step={0.05}
          format={(v) => `${v.toFixed(2)}×`}
          onChange={(scale) => onPatchZone({ scale })}
        />
        <SliderRow
          label="旋转 (rotZ)"
          value={current.rotZ}
          min={-90}
          max={90}
          step={1}
          format={(v) => `${v.toFixed(0)}°`}
          onChange={(rotZ) => onPatchZone({ rotZ })}
        />
      </div>

      <pre className="mb-2 max-h-24 overflow-auto rounded border border-green-500/30 bg-black/60 p-2 font-mono text-[9px] leading-relaxed text-green-400">
        {jsonText}
      </pre>

      <button
        type="button"
        className="w-full rounded-lg border border-green-500/50 py-2 text-xs text-green-300 active:bg-green-500/10"
        onClick={handleCopy}
      >
        复制 JSON 参数
      </button>
    </div>
  )
}

export function RiYueTracing({
  onSuccess,
  questName = '观景台描摹',
  description = '以指为笔，描摹实景中三处「日月」梯田，感应梯田灵韵。',
  briefingText = DEFAULT_BRIEFING,
}: RiYueTracingProps) {
  const { unlockClue } = useGameStore()
  const foundRef = useRef<Set<string>>(new Set())
  const successFiredRef = useRef(false)
  const sessionStartedRef = useRef(false)

  const [isGaming, setIsGaming] = useState(false)
  const [portalReady, setPortalReady] = useState(false)
  const [activeZone, setActiveZone] = useState(0)
  const [zones, setZones] = useState<CalibratorZone[]>(() =>
    configToCalibratorZones(RIYUE_HOLOGRAM_ZONES),
  )
  const [imageReady, setImageReady] = useState(false)
  const [foundIds, setFoundIds] = useState<string[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [showGlow, setShowGlow] = useState(false)

  const playZones = isDebug ? zones : configToCalibratorZones(RIYUE_HOLOGRAM_ZONES)
  const foundCount = foundIds.length
  const totalCount = playZones.length
  const progressPct = totalCount > 0 ? (foundCount / totalCount) * 100 : 0

  useEffect(() => {
    setPortalReady(true)
  }, [])

  /** 预加载底图，进入战场时避免闪烁重载 */
  useEffect(() => {
    const preload = new Image()
    preload.onload = () => setImageReady(true)
    preload.onerror = () => setImageReady(true)
    preload.src = RIYUE_PANORAMA_IMAGE
  }, [])

  const syncFound = useCallback(() => {
    setFoundIds([...foundRef.current])
  }, [])

  const handleAnchor = useCallback(
    (zone: CalibratorZone) => {
      if (!isGaming || isDebug || successFiredRef.current || foundRef.current.has(zone.zoneKey)) return
      foundRef.current.add(zone.zoneKey)
      syncFound()
      playAnchorDing()
      setToast(zone.captureToast)
      window.setTimeout(() => setToast(null), TOAST_MS)
    },
    [isGaming, syncFound],
  )

  const tryComplete = useCallback(() => {
    if (!isGaming || isDebug || successFiredRef.current || foundRef.current.size < totalCount) return
    successFiredRef.current = true
    setShowGlow(true)
    unlockClue(DAY2_CLUE_SANCAI.id)
    window.setTimeout(() => {
      setToast('日月同辉，灵韵汇聚')
      setIsGaming(false)
      onSuccess?.()
    }, COMPLETE_DELAY_MS)
  }, [isGaming, totalCount, unlockClue, onSuccess])

  useEffect(() => {
    if (isGaming && !isDebug && foundCount >= totalCount) tryComplete()
  }, [isGaming, foundCount, totalCount, tryComplete])

  const handleEnterBattle = useCallback(() => {
    sessionStartedRef.current = true
    setIsGaming(true)
  }, [])

  const handleExitBattle = useCallback(() => {
    setIsGaming(false)
  }, [])

  const handlePatchZone = useCallback(
    (patch: Partial<Pick<CalibratorZone, 'cx' | 'cy' | 'scale' | 'rotZ'>>) => {
      setZones((prev) =>
        prev.map((z, i) => (i === activeZone ? { ...z, ...patch } : z)),
      )
    },
    [activeZone],
  )

  const battleLayer = (
    <div className="fixed inset-0 z-50 flex h-[100dvh] w-full touch-none select-none flex-col overflow-hidden bg-slate-900">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#00F5FF]/20 bg-black/80 px-4 backdrop-blur-sm">
        <button
          type="button"
          className="rounded-lg border border-white/20 bg-black/40 px-3 py-1.5 text-xs text-white/85 active:scale-95"
          onClick={handleExitBattle}
        >
          ⏴ 退出
        </button>

        <p className="truncate px-2 text-center text-[11px] text-white/80">
          点击实景中三处「日月田」灵纹，完成高维雷达锚定
        </p>

        <div className="min-w-[3.5rem] text-right">
          <span className="font-mono text-sm text-[#00F5FF]">
            {foundCount}/{totalCount}
          </span>
          <div className="mt-1 h-1 w-14 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#00F5FF]/50 to-[#00F5FF]"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          </div>
        </div>
      </header>

      <main className="relative flex min-h-0 w-full flex-1 items-center justify-center bg-void-900 p-2">
        <div className="relative w-full max-w-lg">
          <div
            className={`relative w-full aspect-[3/4] overflow-hidden bg-void-900 ${isDebug ? 'mb-[22rem]' : ''}`}
          >
            <img
              src={RIYUE_PANORAMA_IMAGE}
              alt="万峰林日月田实景"
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
              onLoad={() => setImageReady(true)}
            />

            {imageReady && (
              <div className="absolute inset-0 z-10">
                {isDebug
                  ? zones.map((zone, i) => (
                      <HologramProjection
                        key={zone.id}
                        zone={zone}
                        preview
                        entering={i === activeZone}
                      />
                    ))
                  : playZones.map((zone) => (
                      <PlayModeHitzone
                        key={zone.zoneKey}
                        zone={zone}
                        isFound={foundIds.includes(zone.zoneKey)}
                        onAnchor={handleAnchor}
                      />
                    ))}
              </div>
            )}

            {!imageReady && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-void-900/90">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00F5FF]/30 border-t-[#00F5FF]" />
              </div>
            )}
          </div>

          {isDebug && (
            <HologramCalibratorPanel
              zones={zones}
              activeZone={activeZone}
              onSelectZone={setActiveZone}
              onPatchZone={handlePatchZone}
            />
          )}

          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.28 }}
                className="pointer-events-none absolute inset-x-4 top-[42%] z-40 flex justify-center"
              >
                <div className="rounded-full border border-[#00F5FF]/35 bg-black/70 px-4 py-2 text-center text-xs text-[#00F5FF] shadow-[0_0_18px_rgba(0,245,255,0.25)] backdrop-blur-sm">
                  {toast}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showGlow && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.75, 0.3] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
                className="pointer-events-none absolute inset-0 z-[25] bg-[radial-gradient(circle_at_50%_55%,rgba(0,245,255,0.35),rgba(0,245,255,0.08)_45%,transparent_72%)]"
              />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )

  /* ── 状态 1：任务简报（文档流） ── */
  if (!isGaming) {
    return (
      <div className="riyue-tracing-lobby interactive-area relative mx-auto w-full max-w-md rounded-xl border border-[#00F5FF]/25 bg-void-950/90 p-5 shadow-[0_0_24px_rgba(0,245,255,0.08)]">
        {questName && (
          <p className="mb-3 text-center text-[10px] tracking-[0.25em] text-gold-muted">{questName}</p>
        )}

        <div className="mb-4 rounded-lg border border-[#00F5FF]/20 bg-cyan-950/20 p-4">
          <p className="mb-1 text-[10px] font-medium tracking-wider text-[#00F5FF]/80">罗盘灵</p>
          <p className="text-sm leading-relaxed text-mist">{briefingText}</p>
          {description && (
            <p className="mt-2 text-[11px] leading-relaxed text-mist-faint">{description}</p>
          )}
        </div>

        <ul className="mb-6 space-y-1.5 text-[11px] leading-relaxed text-mist-faint">
          <li>· 在实景图中点击三处「日月田」灵纹完成锚定</li>
          <li>· 锚定成功后将浮现 3D 全息日月同辉图腾</li>
          <li>· 三处全部锚定即可汇聚灵韵，解锁阵眼线索</li>
        </ul>

        {sessionStartedRef.current && foundCount > 0 && foundCount < totalCount && (
          <p className="mb-3 text-center text-[11px] text-[#00F5FF]/90">
            进行中：已锚定 {foundCount}/{totalCount}
          </p>
        )}

        <button
          type="button"
          className="w-full rounded-xl border border-[#00F5FF]/50 bg-gradient-to-r from-cyan-900/60 to-jade-deep/50 px-6 py-3.5 text-sm font-medium tracking-wide text-cyan-100 shadow-[0_0_24px_rgba(0,245,255,0.25)] ring-1 ring-[#00F5FF]/30 active:scale-[0.98]"
          onClick={handleEnterBattle}
        >
          【 启动雷达锚定 】
        </button>
      </div>
    )
  }

  /* ── 状态 2：全屏实战（Portal） ── */
  if (!portalReady) return null
  return createPortal(battleLayer, document.body)
}

export default RiYueTracing
