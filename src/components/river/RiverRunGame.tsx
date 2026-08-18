import { motion } from 'framer-motion'
import { ChevronLeft, Heart, Sparkles } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { FPSCounter } from '../debug/FPSCounter'
import { ModalOverlay } from '../ui/ModalOverlay'
import { useGameStore } from '../../store/gameStore'
import { createCooldownGate } from '../../utils/touchInteraction'

const LANE_SWITCH_COOLDOWN_MS = 85
/** 连点左/右时最多缓冲的换道次数 */
const LANE_INPUT_BUFFER_MAX = 2
/** 小船横向跟随速度（越大越灵敏） */
const PADDLE_LANE_LERP = 38

const DEFAULT_SURVIVE_SEC = 45
const DEFAULT_MAX_HITS = 3
const DEFAULT_AFFINITY = '御水亲和'

const LANE_COUNT = 4
const PADDLE_W = 54
const PADDLE_H = 132
/** 碰撞盒小于贴图可视区域，贴图 contain + 透明边不参与判定 */
const PADDLE_HIT_W = PADDLE_W * 0.34
const PADDLE_HIT_H = PADDLE_H * 0.48
const PADDLE_HIT_BOTTOM_GAP = 8
const BASE_SPEED = 155
const INVULN_MS = 1000
const COLLECT_SCORE = 10
const RUSH_LAST_SEC = 15
const RIVER_SCROLL_NORMAL_SEC = 3
const RIVER_SCROLL_RUSH_SEC = 1.5
const PADDLE_BOTTOM_RATIO = 0.14

/** 音效类型 */
type SfxType = 'move' | 'hit' | 'collect'

/** 预置音效对象池（模块级单例，避免重复实例化） */
const SOUNDS: Record<SfxType, HTMLAudioElement> | null =
  typeof Audio !== 'undefined'
    ? {
        move: new Audio('/sounds/move.mp3'),
        hit: new Audio('/sounds/hit.mp3'),
        collect: new Audio('/sounds/collect.mp3'),
      }
    : null

if (SOUNDS) {
  for (const audio of Object.values(SOUNDS)) {
    audio.preload = 'auto'
  }
}

/** iOS / Safari 须由用户手势解锁后方可播放 */
const audioUnlockedRef = { current: false }

/**
 * 移动端音频静默解锁 — 须在「开启御水试炼」等真实点击回调内同步调用
 */
function unlockRiverRunAudio() {
  if (!SOUNDS) return
  for (const type of Object.keys(SOUNDS) as SfxType[]) {
    const audio = SOUNDS[type]
    audio.volume = 0
    const playPromise = audio.play()
    audio.pause()
    audio.volume = 1
    audio.currentTime = 0
    void playPromise?.catch(() => {})
  }
  audioUnlockedRef.current = true
}

/** 并发播放 — cloneNode 避免快速连击时切断上一段音效 */
function playSFX(type: SfxType) {
  if (!audioUnlockedRef.current || !SOUNDS?.[type]) return
  const soundClone = SOUNDS[type].cloneNode() as HTMLAudioElement
  soundClone.volume = 1
  void soundClone.play().catch(() => {})
}

/** 激流躲避 · 精灵贴图（public/assets/river） */
export const RIVER_SPRITE_URLS = {
  paddle: '/assets/river/river-paddle.png',
  droplet: '/assets/river/river-droplet.png',
  log: '/assets/river/river-log.png',
  reef: '/assets/river/river-reef.png',
} as const

type EntityKind = 'log' | 'reef' | 'droplet'
type GameStatus = 'playing' | 'won' | 'lost'

interface Entity {
  id: number
  lane: number
  y: number
  kind: EntityKind
  w: number
  h: number
}

interface FloatText {
  id: number
  x: number
  y: number
  born: number
}

interface GameWorld {
  w: number
  h: number
  laneCenters: number[]
  playerLane: number
  playerX: number
  playerY: number
  entities: Entity[]
  floatTexts: FloatText[]
  elapsed: number
  score: number
  hearts: number
  status: GameStatus
  lastFrame: number
  nextEntityId: number
  nextFloatId: number
  spawnTimer: number
  nextSpawnMs: number
  invulnUntil: number
  surviveSeconds: number
  maxHits: number
  affinityReward: string
  onSuccess?: () => void
  successFired: boolean
  onHit?: () => void
  waterScroll: number
}

export interface RiverRunGameProps {
  surviveSeconds?: number
  targetScore?: number
  maxHits?: number
  affinityReward?: string
  onSuccess?: () => void
  /** 全局退出 — 退回主界面，准备期亦可触发 */
  onExit?: () => void
}

function randBetween(a: number, b: number) {
  return a + Math.random() * (b - a)
}

function laneWidth(w: number) {
  return w / LANE_COUNT
}

function laneCentersForWidth(w: number): number[] {
  const lw = laneWidth(w)
  return Array.from({ length: LANE_COUNT }, (_, i) => lw * (i + 0.5))
}

function laneBounds(_laneCenters: number[], w: number) {
  const lw = laneWidth(w)
  return Array.from({ length: LANE_COUNT }, (_, i) => ({
    left: i * lw,
    width: lw,
  }))
}

function clampLane(lane: number) {
  return Math.min(LANE_COUNT - 1, Math.max(0, lane))
}

function buildLaneGuides(layer: HTMLDivElement, world: GameWorld) {
  layer.innerHTML = ''
  const bounds = laneBounds(world.laneCenters, world.w)

  bounds.forEach((b, i) => {
    const strip = document.createElement('div')
    strip.className = `river-lane-strip${i % 2 === 1 ? ' river-lane-strip--alt' : ''}`
    strip.style.left = `${b.left}px`
    strip.style.width = `${b.width}px`
    layer.appendChild(strip)
  })
}

function paddleBottomY(h: number) {
  return h - PADDLE_H - h * PADDLE_BOTTOM_RATIO
}

function speedMultiplier(elapsed: number, surviveSeconds: number): number {
  const progress = Math.min(1, elapsed / surviveSeconds)
  let mult = 1 + progress * 1.15
  const timeLeft = surviveSeconds - elapsed
  if (timeLeft <= RUSH_LAST_SEC) {
    mult += 0.4 * (1 - Math.max(0, timeLeft) / RUSH_LAST_SEC)
  }
  return mult
}

function spawnIntervalMs(elapsed: number, surviveSeconds: number): number {
  const timeLeft = surviveSeconds - elapsed
  if (timeLeft <= RUSH_LAST_SEC) return randBetween(380, 680)
  const progress = elapsed / surviveSeconds
  return randBetween(720 - progress * 280, 1300 - progress * 420)
}

const SPAWN_ENTITY_GAP = 14
const SPAWN_MIXED_GAP = 40

function buildEntity(world: GameWorld, lane: number, kind?: EntityKind): Entity {
  const laneW = world.w / LANE_COUNT
  const resolvedKind: EntityKind =
    kind ?? (Math.random() < 0.28 ? 'droplet' : Math.random() < 0.5 ? 'log' : 'reef')

  if (resolvedKind === 'droplet') {
    const size = laneW * 0.36
    return {
      id: world.nextEntityId++,
      lane,
      y: -randBetween(40, 80),
      kind: 'droplet',
      w: size,
      h: size,
    }
  }

  if (resolvedKind === 'log') {
    return {
      id: world.nextEntityId++,
      lane,
      y: -randBetween(55, 100),
      kind: 'log',
      w: laneW * 1.02,
      h: laneW * 0.48,
    }
  }

  return {
    id: world.nextEntityId++,
    lane,
    y: -randBetween(60, 110),
    kind: 'reef',
    w: laneW * 0.78,
    h: laneW * 0.72,
  }
}

function entitiesConflict(world: GameWorld, a: Entity, b: Entity): boolean {
  const isMixed =
    (a.kind === 'droplet' && b.kind !== 'droplet') ||
    (b.kind === 'droplet' && a.kind !== 'droplet')
  const gap = isMixed ? SPAWN_MIXED_GAP : SPAWN_ENTITY_GAP
  const aCx = world.laneCenters[a.lane]
  const bCx = world.laneCenters[b.lane]
  return rectsOverlap(
    aCx - a.w / 2 - gap,
    a.y - gap,
    a.w + gap * 2,
    a.h + gap * 2,
    bCx - b.w / 2,
    b.y,
    b.w,
    b.h,
  )
}

function candidateConflicts(world: GameWorld, candidate: Entity): boolean {
  return world.entities.some((ent) => entitiesConflict(world, candidate, ent))
}

/** 尝试生成不与其他实体重叠的物件，失败则跳过本次生成 */
function trySpawnEntity(world: GameWorld, avoidLanes: number[] = []): number | null {
  const maxAttempts = 18
  const blocked = new Set(avoidLanes)

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const lanes = Array.from({ length: LANE_COUNT }, (_, i) => i).filter(
      (lane) => !blocked.has(lane),
    )
    const pool = lanes.length > 0 ? lanes : Array.from({ length: LANE_COUNT }, (_, i) => i)
    const lane = pool[Math.floor(Math.random() * pool.length)]
    const candidate = buildEntity(world, lane)
    candidate.y -= attempt * 42

    if (!candidateConflicts(world, candidate)) {
      world.entities.push(candidate)
      return lane
    }
  }

  return null
}

function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

function getPaddleBox(world: GameWorld) {
  const bottom = world.playerY + PADDLE_H - PADDLE_HIT_BOTTOM_GAP
  return {
    x: world.playerX - PADDLE_HIT_W / 2,
    y: bottom - PADDLE_HIT_H,
    w: PADDLE_HIT_W,
    h: PADDLE_HIT_H,
  }
}

function getEntityBox(world: GameWorld, ent: Entity) {
  const cx = world.laneCenters[ent.lane]
  const pad = ent.kind === 'droplet' ? 2 : 4
  return {
    x: cx - ent.w / 2 + pad,
    y: ent.y + pad,
    w: ent.w - pad * 2,
    h: ent.h - pad * 2,
    cx,
  }
}

function initWorld(
  w: number,
  h: number,
  props: {
    surviveSeconds: number
    maxHits: number
    affinityReward: string
    onSuccess?: () => void
    onHit?: () => void
  },
): GameWorld {
  const centers = laneCentersForWidth(w)
  const playerY = paddleBottomY(h)
  return {
    w,
    h,
    laneCenters: centers,
    playerLane: 1,
    playerX: centers[1],
    playerY,
    entities: [],
    floatTexts: [],
    elapsed: 0,
    score: 0,
    hearts: props.maxHits,
    status: 'playing',
    lastFrame: performance.now(),
    nextEntityId: 1,
    nextFloatId: 1,
    spawnTimer: 0,
    nextSpawnMs: spawnIntervalMs(0, props.surviveSeconds),
    invulnUntil: 0,
    surviveSeconds: props.surviveSeconds,
    maxHits: props.maxHits,
    affinityReward: props.affinityReward,
    onSuccess: props.onSuccess,
    successFired: false,
    onHit: props.onHit,
    waterScroll: 0,
  }
}

/** 逐帧推进水面位移，急流仅加速不重置动画相位 */
function stepWaterScroll(world: GameWorld, dt: number) {
  if (world.status !== 'playing') return
  const timeLeft = world.surviveSeconds - world.elapsed
  const secPerTile =
    timeLeft <= RUSH_LAST_SEC ? RIVER_SCROLL_RUSH_SEC : RIVER_SCROLL_NORMAL_SEC
  world.waterScroll = (world.waterScroll + (world.w / secPerTile) * dt) % world.w
}

/** 缓冲队列写入 currentLane ref — 零 React 延迟 */
function flushLaneBuffer(
  currentLane: MutableRefObject<number>,
  buffer: number[],
  cooldown: ReturnType<typeof createCooldownGate>,
  isPlaying: boolean,
) {
  if (!isPlaying || buffer.length === 0) return
  if (!cooldown.tryPass()) return
  const prev = currentLane.current
  currentLane.current = clampLane(currentLane.current + buffer.shift()!)
  if (currentLane.current !== prev) playSFX('move')
}

function syncWaterBg(waterLayer: HTMLDivElement | null, world: GameWorld) {
  if (!waterLayer) return
  waterLayer.style.backgroundPosition = `center ${world.waterScroll}px`
}

/** 碰撞 + 物理步进 — playerLane 由外部 ref 驱动 */
function stepWorld(world: GameWorld, dt: number, now: number, playerLane: number) {
  if (world.status !== 'playing') return

  world.elapsed += dt
  const mult = speedMultiplier(world.elapsed, world.surviveSeconds)
  const scrollSpeed = BASE_SPEED * mult

  world.playerLane = playerLane
  const targetX = world.laneCenters[world.playerLane]
  const dx = targetX - world.playerX
  if (Math.abs(dx) < 2) {
    world.playerX = targetX
  } else {
    world.playerX += dx * Math.min(1, dt * PADDLE_LANE_LERP)
  }
  world.playerY = paddleBottomY(world.h)

  world.spawnTimer += dt * 1000
  if (world.spawnTimer >= world.nextSpawnMs) {
    world.spawnTimer = 0
    world.nextSpawnMs = spawnIntervalMs(world.elapsed, world.surviveSeconds)
    const firstLane = trySpawnEntity(world)
    if (
      world.surviveSeconds - world.elapsed <= RUSH_LAST_SEC &&
      Math.random() < 0.38
    ) {
      trySpawnEntity(world, firstLane != null ? [firstLane] : [])
    }
  }

  for (const ent of world.entities) {
    ent.y += scrollSpeed * dt
  }

  const paddle = getPaddleBox(world)
  const toRemove = new Set<number>()

  for (const ent of world.entities) {
    const box = getEntityBox(world, ent)
    if (
      !rectsOverlap(paddle.x, paddle.y, paddle.w, paddle.h, box.x, box.y, box.w, box.h)
    ) {
      continue
    }

    if (ent.kind === 'droplet') {
      world.score += COLLECT_SCORE
      world.floatTexts.push({
        id: world.nextFloatId++,
        x: box.cx,
        y: ent.y + ent.h * 0.35,
        born: now,
      })
      toRemove.add(ent.id)
      playSFX('collect')
      continue
    }

    if (now >= world.invulnUntil) {
      world.hearts -= 1
      world.invulnUntil = now + INVULN_MS
      world.onHit?.()
      playSFX('hit')
      toRemove.add(ent.id)
      if (world.hearts <= 0) {
        world.status = 'lost'
      }
    }
  }

  if (toRemove.size > 0) {
    world.entities = world.entities.filter((e) => !toRemove.has(e.id))
  }

  world.entities = world.entities.filter((e) => e.y < world.h + 160)
  world.floatTexts = world.floatTexts.filter((f) => now - f.born < 900)

  if (world.status === 'playing' && world.elapsed >= world.surviveSeconds) {
    world.status = 'won'
    if (!world.successFired) {
      world.successFired = true
      world.onSuccess?.()
    }
  }
}

function spriteClass(kind: EntityKind) {
  return `river-entity river-sprite-${kind}`
}

function applySpriteBg(el: HTMLElement, kind: EntityKind) {
  const url = RIVER_SPRITE_URLS[kind]
  el.classList.add('river-sprite--img')
  el.style.backgroundImage = `url(${url})`
  el.style.backgroundSize = 'contain'
  el.style.backgroundRepeat = 'no-repeat'
  el.style.backgroundPosition = 'center'
}

/** 每帧 imperative 同步 DOM — 避免 React state 滞后导致穿透 */
function syncVisuals(
  world: GameWorld,
  now: number,
  paddleEl: HTMLDivElement | null,
  entitiesLayer: HTMLDivElement | null,
  floatsLayer: HTMLDivElement | null,
  entityPool: Map<number, HTMLDivElement>,
  floatPool: HTMLDivElement[],
) {
  if (paddleEl) {
    paddleEl.style.width = `${PADDLE_W}px`
    paddleEl.style.height = `${PADDLE_H}px`
    paddleEl.style.transform = `translate3d(${world.playerX}px, ${world.playerY}px, 0) translateX(-50%)`
    paddleEl.classList.toggle('river-run-paddle--invuln', now < world.invulnUntil)
    paddleEl.style.backgroundImage = `url(${RIVER_SPRITE_URLS.paddle})`
    paddleEl.style.backgroundSize = 'contain'
    paddleEl.style.backgroundRepeat = 'no-repeat'
    paddleEl.style.backgroundPosition = 'center bottom'
  }

  if (!entitiesLayer) return

  const alive = new Set<number>()
  for (const ent of world.entities) {
    alive.add(ent.id)
    let el = entityPool.get(ent.id)
    if (!el) {
      el = document.createElement('div')
      el.className = spriteClass(ent.kind)
      applySpriteBg(el, ent.kind)
      entityPool.set(ent.id, el)
      entitiesLayer.appendChild(el)
    }
    const cx = world.laneCenters[ent.lane]
    el.style.width = `${ent.w}px`
    el.style.height = `${ent.h}px`
    el.style.transform = `translate3d(${cx}px, ${ent.y}px, 0) translateX(-50%)`
  }

  for (const [id, el] of entityPool) {
    if (!alive.has(id)) {
      el.remove()
      entityPool.delete(id)
    }
  }

  if (!floatsLayer) return

  const pool = floatPool
  for (let i = 0; i < world.floatTexts.length; i++) {
    const ft = world.floatTexts[i]!
    let el = pool[i]
    if (!el) {
      el = document.createElement('div')
      el.className = 'river-float-score'
      floatsLayer.appendChild(el)
      pool[i] = el
    }
    el.style.display = 'block'
    el.textContent = `+${COLLECT_SCORE}`
    el.style.setProperty('--river-float-x', `${ft.x}px`)
    el.style.setProperty('--river-float-y', `${ft.y}px`)
  }
  for (let i = world.floatTexts.length; i < pool.length; i++) {
    if (pool[i]) pool[i]!.style.display = 'none'
  }
}

export function RiverRunGame({
  surviveSeconds = DEFAULT_SURVIVE_SEC,
  maxHits = DEFAULT_MAX_HITS,
  affinityReward = DEFAULT_AFFINITY,
  onSuccess,
  onExit,
}: RiverRunGameProps) {
  const arenaRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const paddleRef = useRef<HTMLDivElement>(null)
  const lanesLayerRef = useRef<HTMLDivElement>(null)
  const entitiesLayerRef = useRef<HTMLDivElement>(null)
  const floatsLayerRef = useRef<HTMLDivElement>(null)
  const waterLayerRef = useRef<HTMLDivElement>(null)
  const hitFlashRef = useRef<HTMLDivElement>(null)
  const floatPoolRef = useRef<HTMLDivElement[]>([])
  const laneBufferRef = useRef<number[]>([])
  const resizeTimerRef = useRef(0)
  const entityPoolRef = useRef(new Map<number, HTMLDivElement>())
  const worldRef = useRef<GameWorld | null>(null)
  const laneCooldownRef = useRef(createCooldownGate(LANE_SWITCH_COOLDOWN_MS))
  const fpsSamplerRef = useRef<((now: number) => void) | null>(null)
  const rafRef = useRef(0)
  const isGameStartedRef = useRef(false)
  /** 玩家航道 — 按钮只写 ref，rAF 只读 ref */
  const currentLaneRef = useRef(1)
  const { isDebugMode } = useGameStore()
  const showFps = isDebugMode || import.meta.env.DEV
  const onSuccessRef = useRef(onSuccess)
  onSuccessRef.current = onSuccess
  const onExitRef = useRef(onExit)
  onExitRef.current = onExit

  const [isGameStarted, setIsGameStarted] = useState(false)
  const [exited, setExited] = useState(false)
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing')
  const gameStatusRef = useRef<GameStatus>('playing')
  const lastHeartsRef = useRef(maxHits)
  const hudRefs = useRef({
    time: null as HTMLSpanElement | null,
    timeWrap: null as HTMLSpanElement | null,
    score: null as HTMLSpanElement | null,
    timeLabel: null as HTMLSpanElement | null,
    rushBanner: null as HTMLDivElement | null,
    victoryScore: null as HTMLParagraphElement | null,
    heartEls: [] as (HTMLSpanElement | null)[],
  })
  const leftBtnRef = useRef<HTMLButtonElement>(null)
  const rightBtnRef = useRef<HTMLButtonElement>(null)

  const triggerHitFlash = useCallback(() => {
    const el = hitFlashRef.current
    if (!el) return
    el.style.transition = 'none'
    el.style.opacity = '0.65'
    requestAnimationFrame(() => {
      el.style.transition = 'opacity 0.22s ease-out'
      el.style.opacity = '0'
    })
  }, [])

  /** HUD 走 DOM 直写，避免 rAF 内 setState */
  const syncHud = useCallback((world: GameWorld) => {
    const refs = hudRefs.current
    const timeLeft = Math.max(0, Math.ceil(world.surviveSeconds - world.elapsed))
    const isRush = timeLeft <= RUSH_LAST_SEC && world.status === 'playing'

    if (refs.time) refs.time.textContent = `${timeLeft}s`
    if (refs.score) refs.score.textContent = String(world.score)
    if (refs.timeLabel) refs.timeLabel.textContent = isRush ? '激流' : '顺流'

    const isUrgent = timeLeft <= 10 && isGameStartedRef.current && world.status === 'playing'
    if (refs.timeWrap) {
      refs.timeWrap.classList.toggle('text-red-500', isUrgent)
      refs.timeWrap.classList.toggle('text-white', !isUrgent)
    }

    if (refs.rushBanner) {
      refs.rushBanner.style.display = isRush && isGameStartedRef.current ? 'block' : 'none'
    }

    if (world.hearts !== lastHeartsRef.current) {
      lastHeartsRef.current = world.hearts
      refs.heartEls.forEach((el, i) => {
        if (!el) return
        el.textContent = i < world.hearts ? '❤️' : '🖤'
      })
    }

    if (world.status !== gameStatusRef.current) {
      gameStatusRef.current = world.status
      setGameStatus(world.status)
      if (world.status === 'won' && refs.victoryScore) {
        refs.victoryScore.textContent = String(world.score)
      }
    }
  }, [])

  /** 零 React 延迟换道 — 仅 onPointerDown + ref，杜绝 touch/mouse 双触发 */
  const handleLanePointerDown = (delta: number, e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isGameStartedRef.current) return
    const world = worldRef.current
    if (!world || world.status !== 'playing') return

    if (laneCooldownRef.current.tryPass()) {
      const prev = currentLaneRef.current
      currentLaneRef.current = clampLane(currentLaneRef.current + delta)
      if (currentLaneRef.current !== prev) playSFX('move')
    } else if (laneBufferRef.current.length < LANE_INPUT_BUFFER_MAX) {
      laneBufferRef.current.push(delta)
    }

    const btn = e.currentTarget
    btn.classList.add('river-ctrl-btn--pressed')
    window.setTimeout(() => btn.classList.remove('river-ctrl-btn--pressed'), 140)
  }

  const handleExit = useCallback(() => {
    isGameStartedRef.current = false
    if (onExitRef.current) {
      onExitRef.current()
    } else {
      setExited(true)
    }
  }, [])

  const initGame = useCallback(
    (w: number, h: number, preserve?: GameWorld | null) => {
      entityPoolRef.current.forEach((el) => el.remove())
      entityPoolRef.current.clear()
      floatPoolRef.current = []
      laneBufferRef.current = []
      laneCooldownRef.current.reset()
      if (floatsLayerRef.current) floatsLayerRef.current.innerHTML = ''

      worldRef.current = initWorld(w, h, {
        surviveSeconds,
        maxHits,
        affinityReward,
        onSuccess: () => onSuccessRef.current?.(),
        onHit: triggerHitFlash,
      })

      if (preserve && preserve.status === 'playing') {
        const next = worldRef.current
        currentLaneRef.current = preserve.playerLane
        next.playerLane = preserve.playerLane
        next.playerX = preserve.playerX
        next.score = preserve.score
        next.hearts = preserve.hearts
        next.elapsed = preserve.elapsed
        next.waterScroll = preserve.waterScroll
      } else {
        currentLaneRef.current = 1
      }

      if (lanesLayerRef.current && worldRef.current) {
        buildLaneGuides(lanesLayerRef.current, worldRef.current)
      }
      gameStatusRef.current = 'playing'
      setGameStatus('playing')
      lastHeartsRef.current = maxHits
      syncHud(worldRef.current)
    },
    [surviveSeconds, maxHits, affinityReward, triggerHitFlash, syncHud],
  )

  const measureArena = useCallback(() => {
    const arena = arenaRef.current
    if (!arena) return
    const rect = arena.getBoundingClientRect()
    const w = Math.max(240, rect.width)
    const h = Math.max(240, rect.height)

    if (waterLayerRef.current) {
      waterLayerRef.current.style.setProperty('--river-tile-h', `${w}px`)
    }
    if (arenaRef.current) {
      arenaRef.current.style.setProperty('--river-tile-h', `${w}px`)
    }

    const canvas = canvasRef.current
    if (canvas) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
    }

    if (worldRef.current) {
      syncWaterBg(waterLayerRef.current, worldRef.current)
    }

    const world = worldRef.current
    if (
      world &&
      world.status === 'playing' &&
      Math.abs(world.w - w) < 12 &&
      Math.abs(world.h - h) < 12
    ) {
      return
    }

    if (world && world.status === 'playing') {
      world.w = w
      world.h = h
      world.laneCenters = laneCentersForWidth(w)
      world.playerLane = currentLaneRef.current
      world.playerX = world.laneCenters[currentLaneRef.current]
      world.playerY = paddleBottomY(h)
      if (lanesLayerRef.current) buildLaneGuides(lanesLayerRef.current, world)
      return
    }

    initGame(w, h, world)
  }, [initGame])

  const startGame = useCallback(() => {
    unlockRiverRunAudio()
    const world = worldRef.current
    if (world) {
      world.lastFrame = performance.now()
    }
    isGameStartedRef.current = true
    setIsGameStarted(true)
  }, [])

  const restart = useCallback(() => {
    unlockRiverRunAudio()
    isGameStartedRef.current = true
    setIsGameStarted(true)
    measureArena()
  }, [measureArena])

  /** 物理锁滚动 — 规避 iOS 橡皮筋 */
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    const prevBodyOverscroll = body.style.overscrollBehavior
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    body.style.overscrollBehavior = 'none'
    return () => {
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
      body.style.overscrollBehavior = prevBodyOverscroll
    }
  }, [])

  useEffect(() => {
    measureArena()
    const arena = arenaRef.current
    if (!arena) return
    const ro = new ResizeObserver(() => {
      window.clearTimeout(resizeTimerRef.current)
      resizeTimerRef.current = window.setTimeout(measureArena, 160)
    })
    ro.observe(arena)
    return () => {
      ro.disconnect()
      window.clearTimeout(resizeTimerRef.current)
    }
  }, [measureArena])

  useEffect(() => {
    let hudTick = 0
    const loop = (now: number) => {
      const world = worldRef.current
      if (world) {
        const dt = Math.min((now - world.lastFrame) / 1000, 0.05)
        world.lastFrame = now

        if (isGameStartedRef.current) {
          flushLaneBuffer(
            currentLaneRef,
            laneBufferRef.current,
            laneCooldownRef.current,
            world.status === 'playing',
          )
          stepWaterScroll(world, dt)
          syncWaterBg(waterLayerRef.current, world)
          stepWorld(world, dt, now, currentLaneRef.current)
        } else {
          world.playerLane = currentLaneRef.current
          const targetX = world.laneCenters[world.playerLane]
          world.playerX = targetX
          world.playerY = paddleBottomY(world.h)
        }

        syncVisuals(
          world,
          now,
          paddleRef.current,
          entitiesLayerRef.current,
          floatsLayerRef.current,
          entityPoolRef.current,
          floatPoolRef.current,
        )

        hudTick += dt
        if (hudTick >= 0.1 || world.status !== 'playing') {
          hudTick = 0
          syncHud(world)
        }
        fpsSamplerRef.current?.(now)
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [syncHud])

  const showControls = isGameStarted && gameStatus === 'playing'

  if (exited) return null

  const gameShell = (
    <div
      className="fixed inset-0 z-[9990] flex h-[100dvh] w-full touch-none select-none flex-col overflow-hidden overscroll-none bg-slate-900"
      style={{ touchAction: 'none' }}
    >
      <FPSCounter active={showFps} samplerRef={fpsSamplerRef} />

      {/* ── Header HUD（z-60 常驻可点，高于准备层）── */}
      <header className="relative z-[60] flex h-16 shrink-0 flex-none items-center justify-between px-4">
        <button
          type="button"
          aria-label="退出试炼"
          onPointerDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleExit()
          }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-400/35 bg-[#0B131A]/80 text-cyan-300 shadow-[0_0_12px_rgba(0,245,255,0.12)] active:scale-95"
          style={{ touchAction: 'none' }}
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
        </button>

        <div className="flex min-w-0 flex-1 items-center justify-end">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2.5 backdrop-blur-md">
            <div className="flex flex-col items-center leading-none">
              <span
                ref={(el) => {
                  hudRefs.current.timeLabel = el
                }}
                className="mb-0.5 text-[9px] tracking-widest text-white/45"
              >
                顺流
              </span>
              <span
                ref={(el) => {
                  hudRefs.current.timeWrap = el
                }}
                className="text-xl font-bold font-mono tabular-nums text-white"
              >
                <span
                  ref={(el) => {
                    hudRefs.current.time = el
                  }}
                >
                  {surviveSeconds}s
                </span>
              </span>
            </div>

            <div className="h-8 w-px bg-white/10" aria-hidden />

            <div className="flex items-center gap-1 tracking-widest">
              {Array.from({ length: maxHits }).map((_, i) => (
                <span
                  key={i}
                  ref={(el) => {
                    hudRefs.current.heartEls[i] = el
                  }}
                  className="text-2xl leading-none"
                >
                  ❤️
                </span>
              ))}
            </div>

            <div className="h-8 w-px bg-white/10" aria-hidden />

            <div className="flex flex-col items-center leading-none">
              <span className="mb-0.5 text-[9px] tracking-widest text-white/45">积分</span>
              <span
                ref={(el) => {
                  hudRefs.current.score = el
                }}
                className="text-xl font-bold tabular-nums text-cyan-400"
              >
                0
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Canvas 游戏视口 ── */}
      <div className="relative min-h-0 w-full flex-1">
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 block h-full w-full"
          aria-hidden
        />

        <div
          ref={arenaRef}
          className="interactive-area river-run-track absolute inset-0 block h-full w-full overflow-hidden"
          style={
            {
              userSelect: 'none',
              WebkitUserSelect: 'none',
              '--river-tile-h': '320px',
            } as CSSProperties
          }
        >
          <div
            ref={waterLayerRef}
            className="river-water-scroll absolute inset-0 z-0"
            aria-hidden
          />

          <div
            ref={lanesLayerRef}
            className="river-lanes-layer absolute inset-0 z-[1]"
            aria-hidden
          />

          <div ref={entitiesLayerRef} className="pointer-events-none absolute inset-0 z-[2]" />
          <div ref={floatsLayerRef} className="pointer-events-none absolute inset-0 z-[14]" />

          <div
            ref={paddleRef}
            className="river-run-paddle river-run-paddle--img z-[12]"
            style={{
              left: 0,
              top: 0,
              transform: 'translateX(-50%)',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
            }}
          >
            <span className="river-paddle-ripple" />
            <span className="river-paddle-ripple river-paddle-ripple--delay" />
          </div>

          <div
            ref={hitFlashRef}
            className="pointer-events-none absolute inset-0 z-[15] bg-red-600/45 opacity-0"
          />

          <div
            ref={(el) => {
              hudRefs.current.rushBanner = el
            }}
            className="pointer-events-none absolute inset-x-0 top-2 z-[5] hidden text-center text-[9px] font-medium tracking-[0.35em] text-red-300/80"
          >
            急流段 · 障碍加剧
          </div>
        </div>
      </div>

      {/* ── Footer 操作区 ── */}
      <footer
        className={`flex h-24 shrink-0 flex-none items-center justify-center gap-3 border-t border-sky-muted/15 px-4 pb-[max(env(safe-area-inset-bottom),0px)] ${
          showControls ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <button
          ref={leftBtnRef}
          type="button"
          className="river-ctrl-btn h-14 min-h-[48px] flex-1 max-w-[10rem]"
          aria-label="左移"
          style={{ touchAction: 'none' }}
          onPointerDown={(e) => handleLanePointerDown(-1, e)}
        >
          ◀ 左移
        </button>
        <button
          ref={rightBtnRef}
          type="button"
          className="river-ctrl-btn h-14 min-h-[48px] flex-1 max-w-[10rem]"
          aria-label="右移"
          style={{ touchAction: 'none' }}
          onPointerDown={(e) => handleLanePointerDown(1, e)}
        >
          右移 ▶
        </button>
      </footer>

      {/* ── 悬浮准备层（自 Header 下方起，不遮挡退出按钮）── */}
      <div
        className={`absolute inset-x-0 bottom-0 top-16 z-50 flex flex-col bg-slate-900/95 backdrop-blur-md transition-all duration-500 ${
          isGameStarted
            ? 'pointer-events-none -translate-y-full opacity-0'
            : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <p className="mb-3 text-xs tracking-[0.4em] text-sky-bright/90">江河御波试炼</p>
          <p className="max-w-sm text-base leading-relaxed text-mist">
            点击底部【左移 / 右移】切换 4 条航道
          </p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-mist-muted">
            躲避浮木与暗礁，收集水灵滴
          </p>
          <p className="mt-4 text-xs text-mist-faint">
            坚持 {surviveSeconds} 秒即通关 · 最多 {maxHits} 颗爱心
          </p>
        </div>

        <div className="shrink-0 px-8 pb-[max(env(safe-area-inset-bottom,24px))]">
          <button
            type="button"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              startGame()
            }}
            className="w-full rounded-2xl border border-sky-bright/50 bg-sky-deep/50 py-4 text-base font-semibold tracking-wide text-sky-bright shadow-[0_0_28px_rgba(56,189,248,0.2)] active:bg-sky-deep/65"
          >
            开启御水试炼
          </button>
        </div>
      </div>

      <ModalOverlay open={gameStatus === 'won'}>
        <motion.div
          initial={{ scale: 0.88, y: 16 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="w-full overflow-hidden rounded-2xl border border-sky-bright/35 bg-gradient-to-b from-sky-deep/55 via-void-900/95 to-void-950 shadow-[0_0_48px_rgba(56,189,248,0.22)]"
        >
          <div className="flex justify-center pt-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-sky-bright/40 bg-sky-deep/40">
              <Sparkles className="h-7 w-7 text-sky-bright" />
            </div>
          </div>
          <div className="px-5 pb-6 pt-4 text-center">
            <p className="text-base font-semibold leading-relaxed text-sky-bright">
              激流试炼通过！
            </p>
            <p className="mt-2 text-sm leading-relaxed text-mist">
              获得被动增益：【{affinityReward}】
            </p>
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <p className="text-[10px] text-mist-muted">本局积分</p>
              <p
                ref={(el) => {
                  hudRefs.current.victoryScore = el
                }}
                className="text-lg font-medium tabular-nums text-jade-bright"
              >
                0
              </p>
            </div>
          </div>
        </motion.div>
      </ModalOverlay>

      <ModalOverlay open={gameStatus === 'lost'}>
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full rounded-2xl border border-sky-muted/30 bg-void-900/95 px-6 py-8 text-center"
        >
          <div className="mb-4 flex justify-center gap-1">
            {Array.from({ length: maxHits }).map((_, i) => (
              <Heart key={i} className="h-5 w-5 fill-void-600 text-void-600" />
            ))}
          </div>
          <p className="text-sm font-medium text-gold-bright">桨板倾覆，试炼中断</p>
          <p className="mt-2 text-center text-xs text-mist-muted">
            爱心耗尽，请更灵活地换道躲避障碍
          </p>
          <button
            type="button"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              restart()
            }}
            className="mt-5 w-full rounded-full border border-sky-muted/40 bg-sky-deep/30 px-5 py-2.5 text-sm text-sky-bright active:bg-sky-deep/50"
          >
            再试一次
          </button>
        </motion.div>
      </ModalOverlay>
    </div>
  )

  if (typeof document === 'undefined') return gameShell
  return createPortal(gameShell, document.body)
}

export default RiverRunGame
