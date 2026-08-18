import { motion } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { ModalOverlay } from '../ui/ModalOverlay'
import {
  type BgCache,
  type Vec2,
  CULL_PAD,
  compactTimed,
  ensureBgCache,
  isInViewport,
} from '../../utils/canvasPerf'
// ─── 物理常量 ───────────────────────────────────────────────────────────────

const DEG = Math.PI / 180
const SWING_MIN = -75 * DEG
const SWING_MAX = 75 * DEG
const SWING_SPEED = 1.28

const REST_ROPE_LEN = 34
const CLAW_RADIUS = 11
const EXTEND_SPEED = 310
const RETRACT_EMPTY_SPEED = 500

const GAME_DURATION_SEC = 60
const TARGET_PERCENT = 55

type ItemKind = 'essence_amber' | 'essence_gold' | 'dead_rock'
type ClawMode = 'swing' | 'extend' | 'retract_empty' | 'retract_item'
type GameStatus = 'playing' | 'finished'

interface MinerItem {
  id: number
  kind: ItemKind
  x: number
  y: number
  radius: number
  value: number
  weight: number
  collected: boolean
  /** 息壤块不规则多边形顶点偏移 */
  facets: number[]
}

interface ClawState {
  mode: ClawMode
  angle: number
  swingDir: 1 | -1
  ropeLen: number
  hookedItemId: number | null
}

interface FloatText {
  id: number
  x: number
  y: number
  text: string
  color: string
  born: number
  life: number
}

interface GameWorld {
  w: number
  h: number
  dpr: number
  pivotX: number
  pivotY: number
  groundY: number
  maxRopeLen: number
  claw: ClawState
  items: MinerItem[]
  floats: FloatText[]
  score: number
  timeLeft: number
  status: GameStatus
  lastFrame: number
  nextFloatId: number
  nextItemId: number
  finishedFired: boolean
  bgCache: BgCache | null
}

const SCRATCH_TIP: Vec2 = { x: 0, y: 0 }

export interface CrystalMinerGameProps {
  onComplete?: () => void
  introText?: string
}

const ITEM_TEMPLATES: {
  kind: ItemKind
  radius: number
  value: number
  weight: number
  count: number
}[] = [
  { kind: 'essence_amber', radius: 15, value: 70, weight: 0.55, count: 5 },
  { kind: 'essence_gold', radius: 13, value: 90, weight: 0.48, count: 4 },
  { kind: 'dead_rock', radius: 38, value: 0, weight: 4.2, count: 4 },
  { kind: 'dead_rock', radius: 28, value: 0, weight: 3.0, count: 3 },
]

const MAX_ESSENCE_SCORE = ITEM_TEMPLATES.reduce(
  (sum, t) => sum + (t.kind !== 'dead_rock' ? t.value * t.count : 0),
  0,
)

const DEFAULT_INTRO =
  '提取出的阵核碎片极度排斥彼此！必须深入地层，汲取高密度的【地脉精髓】作为融合的媒介。'

function essencePercent(score: number) {
  return Math.min(100, Math.round((score / MAX_ESSENCE_SCORE) * 100))
}

function randBetween(a: number, b: number) {
  return a + Math.random() * (b - a)
}

function makeFacets(seed: number): number[] {
  const count = 5 + (seed % 3)
  return Array.from({ length: count }, (_, i) => 0.65 + ((seed * (i + 3)) % 7) * 0.05)
}

function spawnItems(world: GameWorld): MinerItem[] {
  const items: MinerItem[] = []
  const padX = 22
  const minY = world.groundY + 24
  const maxY = world.h - 24

  for (const tpl of ITEM_TEMPLATES) {
    for (let i = 0; i < tpl.count; i++) {
      for (let attempt = 0; attempt < 45; attempt++) {
        const x = randBetween(padX + tpl.radius, world.w - padX - tpl.radius)
        const y = randBetween(minY + tpl.radius, maxY - tpl.radius)
        const overlap = items.some(
          (it) => Math.hypot(it.x - x, it.y - y) < it.radius + tpl.radius + 10,
        )
        if (!overlap) {
          items.push({
            id: world.nextItemId++,
            kind: tpl.kind,
            x,
            y,
            radius: tpl.radius * randBetween(0.88, 1.08),
            value: tpl.value,
            weight: tpl.weight,
            collected: false,
            facets: tpl.kind === 'dead_rock' ? [] : makeFacets(world.nextItemId),
          })
          break
        }
      }
    }
  }
  return items
}

function fillClawTip(world: GameWorld, out: Vec2) {
  const { pivotX, pivotY, claw } = world
  out.x = pivotX + Math.sin(claw.angle) * claw.ropeLen
  out.y = pivotY + Math.cos(claw.angle) * claw.ropeLen
}

function retractSpeed(world: GameWorld): number {
  const { claw, items } = world
  if (claw.mode === 'retract_empty') return RETRACT_EMPTY_SPEED
  const item = items.find((it) => it.id === claw.hookedItemId)
  if (!item) return RETRACT_EMPTY_SPEED
  return Math.max(50, 240 / item.weight)
}

function circleHit(ax: number, ay: number, ar: number, bx: number, by: number, br: number) {
  return Math.hypot(ax - bx, ay - by) < ar + br
}

function addFloat(world: GameWorld, x: number, y: number, text: string, color: string) {
  world.floats.push({
    id: world.nextFloatId++,
    x,
    y,
    text,
    color,
    born: performance.now(),
    life: 1100,
  })
}

function updateWorld(world: GameWorld, dt: number, now: number) {
  if (world.status !== 'playing') return

  world.timeLeft = Math.max(0, world.timeLeft - dt)
  if (world.timeLeft <= 0) {
    world.status = 'finished'
    world.finishedFired = true
    return
  }

  const { claw } = world

  switch (claw.mode) {
    case 'swing': {
      claw.angle += SWING_SPEED * dt * claw.swingDir
      if (claw.angle >= SWING_MAX) {
        claw.angle = SWING_MAX
        claw.swingDir = -1
      } else if (claw.angle <= SWING_MIN) {
        claw.angle = SWING_MIN
        claw.swingDir = 1
      }
      break
    }

    case 'extend': {
      claw.ropeLen += EXTEND_SPEED * dt
      fillClawTip(world, SCRATCH_TIP)
      const tipNow = SCRATCH_TIP

      const hitBoundary =
        claw.ropeLen >= world.maxRopeLen ||
        tipNow.x < CLAW_RADIUS ||
        tipNow.x > world.w - CLAW_RADIUS ||
        tipNow.y >= world.h - CLAW_RADIUS

      if (!hitBoundary) {
        for (const item of world.items) {
          if (item.collected) continue
          if (circleHit(tipNow.x, tipNow.y, CLAW_RADIUS, item.x, item.y, item.radius)) {
            claw.hookedItemId = item.id
            claw.mode = 'retract_item'
            break
          }
        }
      }

      if (claw.mode === 'extend' && (hitBoundary || claw.ropeLen >= world.maxRopeLen)) {
        claw.mode = 'retract_empty'
      }
      break
    }

    case 'retract_empty':
    case 'retract_item': {
      const speed = retractSpeed(world)
      claw.ropeLen -= speed * dt

      if (claw.ropeLen <= REST_ROPE_LEN) {
        claw.ropeLen = REST_ROPE_LEN

        if (claw.mode === 'retract_item' && claw.hookedItemId !== null) {
          const item = world.items.find((it) => it.id === claw.hookedItemId)
          if (item && !item.collected) {
            item.collected = true
            world.score += item.value
            const label =
              item.value > 0 ? `+${item.value} 精髓` : '坚硬死岩…'
            addFloat(
              world,
              world.pivotX,
              world.pivotY + 18,
              label,
              item.value > 0 ? '#fcd34d' : '#94a3b8',
            )
          }
        }

        claw.hookedItemId = null
        claw.mode = 'swing'
      }
      break
    }
  }

  compactTimed(world.floats, now)
}

function paintCrystalMinerBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  groundY: number,
) {
  const sky = ctx.createLinearGradient(0, 0, 0, groundY)
  sky.addColorStop(0, '#0c1420')
  sky.addColorStop(1, '#1a2838')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, groundY)

  const soil = ctx.createLinearGradient(0, groundY, 0, h)
  soil.addColorStop(0, '#3d2e1a')
  soil.addColorStop(0.35, '#2a2018')
  soil.addColorStop(1, '#141008')
  ctx.fillStyle = soil
  ctx.fillRect(0, groundY, w, h - groundY)

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.07)'
  ctx.lineWidth = 1
  for (let i = 0; i < 7; i++) {
    const y = groundY + 22 + i * ((h - groundY) / 8)
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.bezierCurveTo(w * 0.25, y + 4, w * 0.75, y - 3, w, y + 2)
    ctx.stroke()
  }

  ctx.fillStyle = 'rgba(100, 116, 139, 0.04)'
  for (let i = 0; i < 12; i++) {
    const sx = (i * 97) % w
    const sy = groundY + 40 + ((i * 53) % (h - groundY - 60))
    ctx.beginPath()
    ctx.ellipse(sx, sy, 18 + (i % 4) * 6, 8, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, world: GameWorld) {
  const { w, h, groundY } = world
  const cacheKey = Math.round(groundY)
  world.bgCache = ensureBgCache(w, h, cacheKey, world.bgCache, (c, width, height) => {
    paintCrystalMinerBackground(c, width, height, groundY)
  })
  ctx.drawImage(world.bgCache.canvas, 0, 0, w, h)
}

function drawSemicircleBase(ctx: CanvasRenderingContext2D, world: GameWorld) {
  const { pivotX, pivotY } = world
  ctx.fillStyle = '#334155'
  ctx.beginPath()
  ctx.arc(pivotX, pivotY, 22, Math.PI, 0)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = 'rgba(148, 184, 200, 0.35)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(pivotX, pivotY, 22, Math.PI, 0)
  ctx.stroke()

  ctx.fillStyle = '#475569'
  ctx.fillRect(pivotX - 4, pivotY - 6, 8, 8)
}

function drawEssence(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  kind: 'essence_amber' | 'essence_gold',
  facets: number[],
) {
  const isGold = kind === 'essence_gold'
  const glow = isGold ? 'rgba(217,119,6,0.55)' : 'rgba(180,130,40,0.5)'
  const fill = isGold ? '#d97706' : '#b8860b'
  const stroke = isGold ? '#fde68a' : '#fcd34d'

  ctx.save()
  ctx.shadowColor = glow
  ctx.shadowBlur = 16
  ctx.fillStyle = fill
  ctx.strokeStyle = stroke
  ctx.lineWidth = 1.5
  ctx.beginPath()
  facets.forEach((f, i) => {
    const a = (i / facets.length) * Math.PI * 2 - Math.PI / 2
    const px = x + Math.cos(a) * radius * f
    const py = y + Math.sin(a) * radius * f
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  })
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // 内层土元素光晕
  ctx.shadowBlur = 8
  ctx.fillStyle = isGold ? 'rgba(251,191,36,0.35)' : 'rgba(217,169,56,0.3)'
  ctx.beginPath()
  facets.forEach((f, i) => {
    const a = (i / facets.length) * Math.PI * 2 - Math.PI / 2
    const px = x + Math.cos(a) * radius * f * 0.55
    const py = y + Math.sin(a) * radius * f * 0.55
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  })
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawDeadRock(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  ctx.fillStyle = '#3f3f46'
  ctx.strokeStyle = '#27272a'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.ellipse(x, y, radius, radius * 0.82, 0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.strokeStyle = 'rgba(24, 24, 27, 0.6)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x - radius * 0.4, y - radius * 0.1)
  ctx.lineTo(x + radius * 0.35, y + radius * 0.25)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x + radius * 0.1, y - radius * 0.35)
  ctx.lineTo(x - radius * 0.2, y + radius * 0.15)
  ctx.stroke()

  ctx.fillStyle = 'rgba(255,255,255,0.04)'
  ctx.beginPath()
  ctx.ellipse(x - radius * 0.25, y - radius * 0.2, radius * 0.35, radius * 0.2, -0.3, 0, Math.PI * 2)
  ctx.fill()
}

function drawItem(
  ctx: CanvasRenderingContext2D,
  world: GameWorld,
  item: MinerItem,
  tip: Vec2,
) {
  if (item.collected && world.claw.hookedItemId !== item.id) return

  const hooked = world.claw.hookedItemId === item.id
  const drawX = hooked ? tip.x : item.x
  const drawY = hooked ? tip.y + item.radius * 0.55 : item.y

  if (item.kind === 'dead_rock') {
    drawDeadRock(ctx, drawX, drawY, item.radius)
  } else {
    drawEssence(ctx, drawX, drawY, item.radius, item.kind, item.facets)
  }
}

function drawRopeAndClaw(ctx: CanvasRenderingContext2D, world: GameWorld, tip: Vec2) {
  const { pivotX, pivotY } = world

  ctx.strokeStyle = 'rgba(203, 213, 225, 0.55)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(pivotX, pivotY)
  ctx.lineTo(tip.x, tip.y)
  ctx.stroke()

  ctx.save()
  ctx.translate(tip.x, tip.y)
  ctx.rotate(45 * DEG)
  ctx.shadowColor = 'rgba(251, 191, 36, 0.55)'
  ctx.shadowBlur = 10
  ctx.fillStyle = '#fef3c7'
  ctx.strokeStyle = '#fbbf24'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(0, -9)
  ctx.lineTo(9, 0)
  ctx.lineTo(0, 9)
  ctx.lineTo(-9, 0)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

function drawFloats(ctx: CanvasRenderingContext2D, world: GameWorld, now: number) {
  for (const f of world.floats) {
    const t = (now - f.born) / f.life
    const drawY = f.y - t * 44
    if (drawY < -CULL_PAD || drawY > world.h + CULL_PAD) continue
    ctx.save()
    ctx.globalAlpha = 1 - t
    ctx.fillStyle = f.color
    ctx.font = '600 13px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText(f.text, f.x, drawY)
    ctx.restore()
  }
}

function renderFrame(ctx: CanvasRenderingContext2D, world: GameWorld, now: number) {
  const { w, h, dpr } = world
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  drawBackground(ctx, world)
  drawSemicircleBase(ctx, world)

  fillClawTip(world, SCRATCH_TIP)
  const hookedId = world.claw.hookedItemId
  for (const item of world.items) {
    if (item.collected && hookedId !== item.id) continue
    const drawX = hookedId === item.id ? SCRATCH_TIP.x : item.x
    const drawY =
      hookedId === item.id ? SCRATCH_TIP.y + item.radius * 0.55 : item.y
    if (!isInViewport(drawX, drawY, item.radius, world.w, world.h)) continue
    drawItem(ctx, world, item, SCRATCH_TIP)
  }

  drawRopeAndClaw(ctx, world, SCRATCH_TIP)
  drawFloats(ctx, world, now)

  if (world.status === 'finished') {
    ctx.fillStyle = 'rgba(12, 20, 32, 0.25)'
    ctx.fillRect(0, 0, w, h)
  }
}

function initWorld(w: number, h: number, dpr: number): GameWorld {
  const pivotX = w / 2
  const pivotY = 50
  const groundY = h * 0.36
  const maxRopeLen = Math.hypot(w * 0.48, h - pivotY - 12)

  const world: GameWorld = {
    w,
    h,
    dpr,
    pivotX,
    pivotY,
    groundY,
    maxRopeLen,
    claw: {
      mode: 'swing',
      angle: 0,
      swingDir: 1,
      ropeLen: REST_ROPE_LEN,
      hookedItemId: null,
    },
    items: [],
    floats: [],
    score: 0,
    timeLeft: GAME_DURATION_SEC,
    status: 'playing',
    lastFrame: performance.now(),
    nextFloatId: 1,
    nextItemId: 1,
    finishedFired: false,
    bgCache: null,
  }
  world.items = spawnItems(world)
  return world
}

/** 地脉精髓汲取 — 黄金矿工 */
export function CrystalMinerGame({
  onComplete,
  introText = DEFAULT_INTRO,
}: CrystalMinerGameProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worldRef = useRef<GameWorld | null>(null)
  const rafRef = useRef(0)
  const hudTimerRef = useRef(0)

  const [showResult, setShowResult] = useState(false)
  const [showFail, setShowFail] = useState(false)
  const resultHandledRef = useRef(false)
  const resultPctRef = useRef(0)
  const hudRefs = useRef({
    collectPct: null as HTMLParagraphElement | null,
    collectBar: null as HTMLDivElement | null,
    time: null as HTMLParagraphElement | null,
    resultPct: null as HTMLSpanElement | null,
    failPct: null as HTMLSpanElement | null,
  })

  const syncHudFromWorld = useCallback((world: GameWorld, force = false) => {
    const now = performance.now()
    if (!force && now - hudTimerRef.current < 120) return
    hudTimerRef.current = now

    const pct = essencePercent(world.score)
    const timeLeft = Math.ceil(world.timeLeft)
    const refs = hudRefs.current

    if (refs.collectPct) refs.collectPct.textContent = `${pct}%`
    if (refs.collectBar) refs.collectBar.style.width = `${pct}%`
    if (refs.time) {
      refs.time.textContent = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`
    }

    if (world.status === 'finished' && !resultHandledRef.current) {
      resultHandledRef.current = true
      resultPctRef.current = pct
      if (refs.resultPct) refs.resultPct.textContent = `${pct}%`
      if (refs.failPct) refs.failPct.textContent = `${pct}%`
      if (pct >= TARGET_PERCENT) {
        setShowResult(true)
      } else {
        setShowFail(true)
      }
    }
  }, [])

  const resizeCanvas = useCallback(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return null

    const rect = container.getBoundingClientRect()
    const w = Math.max(280, Math.floor(rect.width))
    const h = Math.max(360, Math.floor(rect.height))
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`

    const prev = worldRef.current
    if (prev) {
      prev.w = w
      prev.h = h
      prev.dpr = dpr
      prev.pivotX = w / 2
      prev.groundY = h * 0.36
      prev.maxRopeLen = Math.hypot(w * 0.48, h - prev.pivotY - 12)
    } else {
      worldRef.current = initWorld(w, h, dpr)
    }
    return worldRef.current
  }, [])

  const launchClaw = useCallback(() => {
    const world = worldRef.current
    if (!world || world.status !== 'playing') return
    if (world.claw.mode !== 'swing') return
    world.claw.mode = 'extend'
  }, [])

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      launchClaw()
    },
    [launchClaw],
  )

  const handleResultClose = useCallback(() => {
    onComplete?.()
  }, [onComplete])

  const resetGame = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const w = Math.max(280, Math.floor(rect.width))
    const h = Math.max(360, Math.floor(rect.height))
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    worldRef.current = initWorld(w, h, dpr)
    resultHandledRef.current = false
    setShowFail(false)
    resultPctRef.current = 0
    syncHudFromWorld(worldRef.current!, true)
  }, [syncHudFromWorld])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    resizeCanvas()

    const tick = (now: number) => {
      const world = worldRef.current
      if (world) {
        const dt = Math.min(0.05, (now - world.lastFrame) / 1000)
        world.lastFrame = now
        updateWorld(world, dt, now)
        renderFrame(ctx, world, now)
        syncHudFromWorld(world)
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    const ro = new ResizeObserver(() => resizeCanvas())
    if (containerRef.current) ro.observe(containerRef.current)

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [resizeCanvas, syncHudFromWorld])

  return (
    <div className="interactive-area w-full">
      <p className="mb-2 text-center text-xs leading-relaxed text-amber-100/75">{introText}</p>
      <p className="mb-3 text-center text-[11px] text-mist-muted">
        点击屏幕发射钩爪 — 采集【息壤块】汲取精髓，避开【坚硬死岩】
      </p>

      <div
        ref={containerRef}
        className="relative mx-auto w-full overflow-hidden rounded-xl border border-amber-900/35 bg-[#1a1208] shadow-[inset_0_0_40px_rgba(69,45,12,0.35)]"
        style={{ height: 'min(62dvh, 480px)', touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full touch-none select-none"
          style={{ touchAction: 'none' }}
          onPointerDown={handlePointerDown}
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 px-3 py-2">
          <div className="min-w-0 flex-1 rounded-lg border border-amber-800/40 bg-void-950/85 px-2.5 py-1.5 backdrop-blur-sm">
            <p className="text-[9px] text-amber-200/60">地脉精髓收集度</p>
            <p
              ref={(el) => {
                hudRefs.current.collectPct = el
              }}
              className="text-sm font-semibold tabular-nums text-amber-200"
            >
              0%
            </p>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-amber-950/80">
              <div
                ref={(el) => {
                  hudRefs.current.collectBar = el
                }}
                className="h-full rounded-full bg-gradient-to-r from-amber-700 to-amber-400"
                style={{ width: '0%' }}
              />
            </div>
          </div>
          <div className="rounded-lg border border-slate-600/40 bg-void-950/80 px-2.5 py-1.5 text-center backdrop-blur-sm">
            <p className="text-[9px] text-mist-faint">剩余</p>
            <p
              ref={(el) => {
                hudRefs.current.time = el
              }}
              className="text-sm font-semibold tabular-nums text-mist"
            >
              1:00
            </p>
          </div>
        </div>
      </div>

      <ModalOverlay open={showResult}>
        <motion.div
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          className="w-full rounded-2xl border border-amber-500/30 bg-void-950/95 p-5 text-center shadow-[0_0_32px_rgba(245,158,11,0.15)]"
        >
          <p className="mb-2 text-base font-medium text-amber-100">地脉精髓汲取完毕！</p>
          <p className="mb-4 text-sm leading-relaxed text-mist">
            高浓度的土元素涌入罗盘，你领悟了厚重的大地法则，获得被动增益【土元素亲和】！现在，用这份力量去镇压并融合阵核吧。
          </p>
          <p className="mb-4 text-[11px] text-mist-muted">
            收集度 <span ref={(el) => { hudRefs.current.resultPct = el }} className="text-amber-200">0%</span>（目标 {TARGET_PERCENT}%）
          </p>
          <button
            type="button"
            onClick={handleResultClose}
            className="w-full rounded-xl border border-gold-muted/40 bg-gold-muted/10 py-3 text-sm font-medium text-gold-bright active:bg-gold-muted/20"
          >
            前往阵核重铸
          </button>
        </motion.div>
      </ModalOverlay>

      <ModalOverlay open={showFail}>
        <motion.div
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full rounded-2xl border border-slate-600/40 bg-void-950/95 p-5 text-center"
        >
          <p className="mb-2 text-base font-medium text-mist">精髓浓度不足</p>
          <p className="mb-4 text-sm leading-relaxed text-mist-muted">
            地脉精髓收集度仅 <span ref={(el) => { hudRefs.current.failPct = el }}>0%</span>，需达到 {TARGET_PERCENT}% 才能作为融合媒介。继续钩取息壤块吧。
          </p>
          <button
            type="button"
            onClick={resetGame}
            className="w-full rounded-xl border border-amber-700/40 bg-amber-900/20 py-3 text-sm font-medium text-amber-200 active:bg-amber-900/35"
          >
            再次汲取
          </button>
        </motion.div>
      </ModalOverlay>
    </div>
  )
}

export default CrystalMinerGame
