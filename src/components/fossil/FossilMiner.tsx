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

// ─────────────────────────────────────────────────────────────────────────────
// 游戏常量 — 可按需调整难度
// ─────────────────────────────────────────────────────────────────────────────

const DEG = Math.PI / 180
const SWING_MIN = -70 * DEG
const SWING_MAX = 70 * DEG
const SWING_SPEED = 1.35 // rad/s 钟摆角速度

const REST_ROPE_LEN = 36 // 绞盘下方静止绳长（逻辑像素）
const CLAW_RADIUS = 14
const EXTEND_SPEED = 300 // px/s 伸出速度
const RETRACT_EMPTY_SPEED = 480 // px/s 空钩快速收回

const GAME_DURATION_SEC = 60
const DEFAULT_TARGET_SCORE = 280

/** 素材替换点：填入 PNG 路径后会在 preload 阶段加载，drawItem 内优先 drawImage */
const ITEM_SPRITES: Record<ItemKind, string | null> = {
  fossil: '/assets/fossil-keichousaurus.png',
  rock: null, // TODO: '/assets/rock-gray.png'
  mystery: null, // TODO: '/assets/mystery-box.png'
}

// ─────────────────────────────────────────────────────────────────────────────
// 类型与内部数据结构（全部存 ref，不进 React state）
// ─────────────────────────────────────────────────────────────────────────────

type ItemKind = 'fossil' | 'rock' | 'mystery'
type ClawMode = 'swing' | 'extend' | 'retract_empty' | 'retract_item'

interface MinerItem {
  id: number
  kind: ItemKind
  x: number
  y: number
  radius: number
  value: number
  /** 越大收回越慢 */
  weight: number
  collected: boolean
}

interface ClawState {
  mode: ClawMode
  angle: number
  swingDir: 1 | -1
  ropeLen: number
  hookedItemId: number | null
}

/** 收顶时的飘字（Canvas 内绘制，不走 setState） */
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
  status: 'playing' | 'won' | 'lost'
  lastFrame: number
  nextFloatId: number
  nextItemId: number
  sprites: Partial<Record<ItemKind, HTMLImageElement>>
  onSuccess?: () => void
  targetScore: number
  successFired: boolean
  bgCache: BgCache | null
}

const SCRATCH_TIP: Vec2 = { x: 0, y: 0 }

export interface FossilMinerProps {
  /** 目标灵源滴 */
  targetScore?: number
  /** 倒计时秒数 */
  durationSec?: number
  onSuccess?: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// 物品模板 — 调整 radius / value / weight 即可改手感
// ─────────────────────────────────────────────────────────────────────────────

const ITEM_TEMPLATES: {
  kind: ItemKind
  radius: number
  value: number
  weight: number
  count: number
}[] = [
  { kind: 'fossil', radius: 22, value: 80, weight: 1, count: 5 },
  { kind: 'fossil', radius: 16, value: 50, weight: 0.7, count: 4 },
  { kind: 'rock', radius: 38, value: 25, weight: 3.2, count: 4 },
  { kind: 'rock', radius: 28, value: 15, weight: 2.2, count: 3 },
  { kind: 'mystery', radius: 24, value: 60, weight: 1.5, count: 3 },
]

function randBetween(a: number, b: number) {
  return a + Math.random() * (b - a)
}

/** 在底部矿区随机生成物品，简单排斥重叠 */
function spawnItems(world: GameWorld): MinerItem[] {
  const items: MinerItem[] = []
  const padX = 24
  const minY = world.groundY + 20
  const maxY = world.h - 28

  for (const tpl of ITEM_TEMPLATES) {
    for (let i = 0; i < tpl.count; i++) {
      let placed = false
      for (let attempt = 0; attempt < 40 && !placed; attempt++) {
        const x = randBetween(padX + tpl.radius, world.w - padX - tpl.radius)
        const y = randBetween(minY + tpl.radius, maxY - tpl.radius)
        const overlap = items.some(
          (it) => Math.hypot(it.x - x, it.y - y) < it.radius + tpl.radius + 8,
        )
        if (!overlap) {
          items.push({
            id: world.nextItemId++,
            kind: tpl.kind,
            x,
            y,
            radius: tpl.radius,
            value: tpl.kind === 'mystery' ? Math.round(randBetween(40, 120)) : tpl.value,
            weight: tpl.weight,
            collected: false,
          })
          placed = true
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
  // 重量越大越慢；小化石最快，大岩石极慢
  return Math.max(55, 220 / item.weight)
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
    life: 1200,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 更新逻辑（每帧调用）
// ─────────────────────────────────────────────────────────────────────────────

function updateWorld(world: GameWorld, dt: number, now: number) {
  if (world.status !== 'playing') return

  world.timeLeft = Math.max(0, world.timeLeft - dt)
  if (world.timeLeft <= 0) {
    world.status = world.score >= world.targetScore ? 'won' : 'lost'
    if (world.status === 'won' && !world.successFired) {
      world.successFired = true
      world.onSuccess?.()
    }
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

      // 边界：触达最大绳长或出界 → 空钩收回
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
              item.kind === 'fossil'
                ? `+${item.value} 灵源`
                : item.kind === 'mystery'
                  ? `盲盒 +${item.value}!`
                  : `+${item.value}`
            addFloat(world, world.pivotX, world.pivotY + 20, label, '#fde68a')
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

// ─────────────────────────────────────────────────────────────────────────────
// 渲染 — 素材替换主要在 drawItem / drawClaw
// ─────────────────────────────────────────────────────────────────────────────

function paintFossilMinerBackground(ctx: CanvasRenderingContext2D, w: number, h: number, groundY: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, groundY)
  sky.addColorStop(0, '#0a1628')
  sky.addColorStop(1, '#1a2e24')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, groundY)

  const soil = ctx.createLinearGradient(0, groundY, 0, h)
  soil.addColorStop(0, '#3d3428')
  soil.addColorStop(0.4, '#2a231c')
  soil.addColorStop(1, '#15110d')
  ctx.fillStyle = soil
  ctx.fillRect(0, groundY, w, h - groundY)

  ctx.strokeStyle = 'rgba(94, 236, 196, 0.06)'
  ctx.lineWidth = 1
  for (let i = 0; i < 6; i++) {
    const y = groundY + 30 + i * ((h - groundY) / 7)
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y + Math.sin(i) * 6)
    ctx.stroke()
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, world: GameWorld) {
  const { w, h, groundY } = world
  const cacheKey = Math.round(groundY)
  world.bgCache = ensureBgCache(w, h, cacheKey, world.bgCache, (c, width, height) => {
    paintFossilMinerBackground(c, width, height, groundY)
  })
  ctx.drawImage(world.bgCache.canvas, 0, 0, w, h)
}

function drawWinch(ctx: CanvasRenderingContext2D, world: GameWorld) {
  const { pivotX, pivotY } = world
  ctx.fillStyle = '#475569'
  ctx.fillRect(pivotX - 28, pivotY - 18, 56, 14)
  ctx.fillStyle = '#64748b'
  ctx.beginPath()
  ctx.arc(pivotX, pivotY - 4, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 2
  ctx.stroke()
}

/** 绘制地下物品 — 有 sprite 则 drawImage，否则矢量占位 */
function drawItem(
  ctx: CanvasRenderingContext2D,
  world: GameWorld,
  item: MinerItem,
  tip: Vec2,
) {
  if (item.collected) return

  const hooked = world.claw.hookedItemId === item.id
  const drawX = hooked ? tip.x : item.x
  const drawY = hooked ? tip.y + item.radius * 0.6 : item.y

  const sprite = world.sprites[item.kind]
  if (sprite && sprite.complete && sprite.naturalWidth > 0) {
    const size = item.radius * 2.2
    ctx.drawImage(sprite, drawX - size / 2, drawY - size / 2, size, size)
    return
  }

  // ── 矢量占位（后续替换 PNG 时可删除此段）──
  if (item.kind === 'fossil') {
    ctx.fillStyle = '#a8d4c8'
    ctx.strokeStyle = '#2dd4a8'
  } else if (item.kind === 'rock') {
    ctx.fillStyle = '#6b7280'
    ctx.strokeStyle = '#4b5563'
  } else {
    ctx.fillStyle = '#7c3aed'
    ctx.strokeStyle = '#fde68a'
  }

  ctx.lineWidth = 2
  ctx.beginPath()
  if (item.kind === 'rock') {
    ctx.moveTo(drawX - item.radius, drawY)
    ctx.lineTo(drawX - item.radius * 0.6, drawY - item.radius * 0.85)
    ctx.lineTo(drawX + item.radius * 0.5, drawY - item.radius * 0.9)
    ctx.lineTo(drawX + item.radius, drawY + item.radius * 0.2)
    ctx.lineTo(drawX + item.radius * 0.3, drawY + item.radius)
    ctx.closePath()
  } else if (item.kind === 'mystery') {
    ctx.roundRect(drawX - item.radius, drawY - item.radius, item.radius * 2, item.radius * 2, 6)
  } else {
    ctx.ellipse(drawX, drawY, item.radius, item.radius * 0.75, 0, 0, Math.PI * 2)
  }
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.font = `600 ${Math.max(9, item.radius * 0.45)}px system-ui`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const tag = item.kind === 'fossil' ? '化石' : item.kind === 'rock' ? '岩' : '?'
  ctx.fillText(tag, drawX, drawY)
}

function drawRopeAndClaw(ctx: CanvasRenderingContext2D, world: GameWorld, tip: Vec2) {
  const { pivotX, pivotY, claw } = world

  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(pivotX, pivotY)
  ctx.lineTo(tip.x, tip.y)
  ctx.stroke()

  // 钩爪 — TODO: 可替换 claw.png
  ctx.save()
  ctx.translate(tip.x, tip.y)
  ctx.rotate(claw.angle)
  ctx.fillStyle = '#94a3b8'
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(-10, 16)
  ctx.lineTo(0, 12)
  ctx.lineTo(10, 16)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

function drawFloats(ctx: CanvasRenderingContext2D, world: GameWorld, now: number) {
  for (const f of world.floats) {
    const t = (now - f.born) / f.life
    const alpha = 1 - t
    const yOff = t * 48
    const drawY = f.y - yOff
    if (drawY < -CULL_PAD || drawY > world.h + CULL_PAD) continue
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = f.color
    ctx.font = '600 14px system-ui'
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
  drawWinch(ctx, world)

  fillClawTip(world, SCRATCH_TIP)
  const hookedId = world.claw.hookedItemId
  for (const item of world.items) {
    if (item.collected && hookedId !== item.id) continue
    const drawX = hookedId === item.id ? SCRATCH_TIP.x : item.x
    const drawY =
      hookedId === item.id ? SCRATCH_TIP.y + item.radius * 0.6 : item.y
    if (!isInViewport(drawX, drawY, item.radius, world.w, world.h)) continue
    drawItem(ctx, world, item, SCRATCH_TIP)
  }

  drawRopeAndClaw(ctx, world, SCRATCH_TIP)
  drawFloats(ctx, world, now)

  if (world.status === 'won') {
    ctx.fillStyle = 'rgba(253, 230, 138, 0.15)'
    ctx.fillRect(0, 0, w, h)
  } else if (world.status === 'lost') {
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fillRect(0, 0, w, h)
  }
}

function initWorld(
  w: number,
  h: number,
  dpr: number,
  targetScore: number,
  durationSec: number,
  onSuccess?: () => void,
): GameWorld {
  const pivotX = w / 2
  const pivotY = 52
  const groundY = h * 0.38
  const maxRopeLen = Math.hypot(w * 0.48, h - pivotY - 16)

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
    timeLeft: durationSec,
    status: 'playing',
    lastFrame: performance.now(),
    nextFloatId: 1,
    nextItemId: 1,
    sprites: {},
    onSuccess,
    targetScore,
    successFired: false,
    bgCache: null,
  }
  world.items = spawnItems(world)
  return world
}

function loadSprites(world: GameWorld) {
  ;(Object.keys(ITEM_SPRITES) as ItemKind[]).forEach((kind) => {
    const src = ITEM_SPRITES[kind]
    if (!src) return
    const img = new Image()
    img.src = src
    img.onload = () => {
      world.sprites[kind] = img
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// React 组件 — UI 层仅用低频 setState 同步 HUD
// ─────────────────────────────────────────────────────────────────────────────

export function FossilMiner({
  targetScore = DEFAULT_TARGET_SCORE,
  durationSec = GAME_DURATION_SEC,
  onSuccess,
}: FossilMinerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worldRef = useRef<GameWorld | null>(null)
  const rafRef = useRef<number>(0)
  const hudTimerRef = useRef<number>(0)

  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing')
  const gameStatusRef = useRef<'playing' | 'won' | 'lost'>('playing')
  const resultScoreRef = useRef(0)
  const hudRefs = useRef({
    score: null as HTMLSpanElement | null,
    time: null as HTMLParagraphElement | null,
    progressBar: null as HTMLDivElement | null,
    failScore: null as HTMLSpanElement | null,
  })

  const syncHudFromWorld = useCallback((world: GameWorld, force = false) => {
    const now = performance.now()
    if (!force && now - hudTimerRef.current < 120) return
    hudTimerRef.current = now

    const timeLeft = Math.ceil(world.timeLeft)
    const progress = Math.min(100, (world.score / targetScore) * 100)
    const refs = hudRefs.current

    if (refs.score) refs.score.textContent = String(world.score)
    if (refs.time) {
      refs.time.textContent = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`
    }
    if (refs.progressBar) refs.progressBar.style.width = `${progress}%`

    if (world.status !== gameStatusRef.current) {
      gameStatusRef.current = world.status
      setGameStatus(world.status)
      resultScoreRef.current = world.score
      if (refs.failScore) refs.failScore.textContent = String(world.score)
    }
  }, [targetScore])

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
      prev.groundY = h * 0.38
      prev.maxRopeLen = Math.hypot(w * 0.48, h - prev.pivotY - 16)
    } else {
      worldRef.current = initWorld(w, h, dpr, targetScore, durationSec, onSuccess)
      loadSprites(worldRef.current)
    }
    return worldRef.current
  }, [targetScore, durationSec, onSuccess])

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

  const resetGame = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const w = Math.max(280, Math.floor(rect.width))
    const h = Math.max(360, Math.floor(rect.height))
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    worldRef.current = initWorld(w, h, dpr, targetScore, durationSec, onSuccess)
    loadSprites(worldRef.current)
    gameStatusRef.current = 'playing'
    setGameStatus('playing')
    syncHudFromWorld(worldRef.current, true)
  }, [targetScore, durationSec, onSuccess, syncHudFromWorld])

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
    <div className="w-full">
      <p className="mb-3 text-center text-xs leading-relaxed text-mist-muted">
        点击屏幕发射钩爪 — 抓取化石得分，避开沉重岩石。{durationSec} 秒内达到 {targetScore}{' '}
        灵源滴即通关。
      </p>

      <div
        ref={containerRef}
        className="relative mx-auto w-full overflow-hidden rounded-xl border border-jade/25 bg-void-950 shadow-glow"
        style={{ height: 'min(62dvh, 480px)', touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full touch-none select-none"
          style={{ touchAction: 'none' }}
          onPointerDown={handlePointerDown}
        />

        {/* HUD — 不参与每帧物理 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 px-3 py-2">
          <div className="rounded-lg border border-void-600/60 bg-void-950/75 px-2.5 py-1.5 backdrop-blur-sm">
            <p className="text-[9px] text-mist-faint">灵源</p>
            <p className="text-sm font-semibold text-gold-bright">
              <span
                ref={(el) => {
                  hudRefs.current.score = el
                }}
              >
                0
              </span>
              <span className="text-[10px] font-normal text-mist-muted"> / {targetScore}</span>
            </p>
          </div>
          <div className="rounded-lg border border-void-600/60 bg-void-950/75 px-2.5 py-1.5 text-center backdrop-blur-sm">
            <p className="text-[9px] text-mist-faint">剩余</p>
            <p
              ref={(el) => {
                hudRefs.current.time = el
              }}
              className="text-sm font-semibold tabular-nums text-jade-bright"
            >
              1:00
            </p>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-4 bottom-2 z-10">
          <div className="h-1.5 overflow-hidden rounded-full bg-void-800/80">
            <div
              ref={(el) => {
                hudRefs.current.progressBar = el
              }}
              className="h-full rounded-full bg-gradient-to-r from-jade-deep to-gold-bright"
              style={{ width: '0%' }}
            />
          </div>
        </div>

        {gameStatus === 'won' && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-void-950/40">
            <div className="rounded-2xl border border-gold-bright/50 bg-void-950/85 px-6 py-4 text-center shadow-glow-gold">
              <p className="text-base font-medium text-gold-bright">采矿圆满！</p>
              <p className="mt-1 text-xs text-jade-bright">灵源目标已达成</p>
            </div>
          </div>
        )}

      </div>

      <ModalOverlay open={gameStatus === 'lost'}>
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full rounded-2xl border border-sky-muted/30 bg-void-900/95 px-6 py-8 text-center"
        >
          <p className="text-sm text-mist">时间到，灵源不足</p>
          <p className="mt-2 text-xs text-mist-muted">
            当前 <span ref={(el) => { hudRefs.current.failScore = el }}>0</span> / {targetScore} 灵源滴
          </p>
          <button
            type="button"
            className="mt-5 w-full rounded-lg border border-sky/30 px-4 py-2.5 text-sm text-sky-bright active:bg-sky/10"
            onPointerDown={(e) => {
              e.preventDefault()
              resetGame()
            }}
          >
            再试一次
          </button>
        </motion.div>
      </ModalOverlay>

      <div className="mt-3 flex items-center justify-between text-[11px] text-mist-faint">
        <span>
          {gameStatus === 'playing'
            ? '钩爪摆动中 — 点击发射'
            : gameStatus === 'won'
              ? '任务完成'
              : '挑战失败'}
        </span>
        {gameStatus === 'playing' && (
          <button
            type="button"
            className="rounded-lg border border-sky/25 px-2.5 py-1 text-sky-bright active:bg-sky/10"
            onPointerDown={(e) => {
              e.preventDefault()
              resetGame()
            }}
          >
            重置关卡
          </button>
        )}
      </div>
    </div>
  )
}

export default FossilMiner
