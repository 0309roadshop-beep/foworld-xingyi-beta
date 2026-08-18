import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Cloud, LogOut, RefreshCw, Sparkles } from 'lucide-react'
import { ModalOverlay } from '../ui/ModalOverlay'
import { preventGhostActivation } from '../../utils/touchInteraction'
import { CLOUD_LEAP_DEFAULTS, CLOUD_LEAP_FRAGILE_WIDTH_RATIO, CLOUD_LEAP_PLATFORM_HITBOX, CLOUD_LEAP_PLATFORM_SPRITE_W, CLOUD_LEAP_PLATFORM_SURFACE_DEPTH, CLOUD_LEAP_PLAYER_FOOT_W, CLOUD_LEAP_PLAYER_IMAGE, CLOUD_LEAP_PLAYER_SPRITE_H, CLOUD_LEAP_PLAYER_SPRITE_W } from '../../config/cloudLeapConfig'

/** 逻辑视口（非响应式物理坐标系） */
const SCREEN_WIDTH = 375
const SCREEN_HEIGHT = 600
const CLOUD_WIDTH = 70
const PLATFORM_SPRITE_H = 42
const PLATFORM_SURFACE_FROM_BOTTOM = 12
const GRAVITY = 0.28
const JUMP_VELOCITY = -9.5

const PLAYER_W = CLOUD_LEAP_PLAYER_SPRITE_W
const PLAYER_H = CLOUD_LEAP_PLAYER_SPRITE_H
const PLAYER_FOOT_W = CLOUD_LEAP_PLAYER_FOOT_W
const PLATFORM_HITBOX_SCALE = CLOUD_WIDTH / CLOUD_LEAP_PLATFORM_SPRITE_W
const GAP_Y_MIN = 70
const GAP_Y_MAX = 110
const MAX_OFFSET_X = 120
const FRAGILE_CHANCE = 0.2
const FRAGILE_KICK_Y = 99999
const INITIAL_CLOUD_COUNT = 100
const EXTEND_BATCH = 20
const FIRST_PLATFORM_Y = SCREEN_HEIGHT - 120

type GameState = 'START' | 'PLAYING' | 'GAMEOVER' | 'VICTORY'

interface Platform {
  id: number
  /** 云朵中心 X */
  x: number
  y: number
  type: 'normal' | 'fragile'
  isStepped: boolean
}

export interface CloudJumpGameProps {
  onComplete?: () => void
  onMilestone?: () => void
  onExit?: () => void
  milestoneScore?: number
  /** @deprecated 兼容旧配置，映射为 milestoneScore */
  milestoneM?: number
  pixelsPerMeter?: number
  spiritImage?: string
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function randBetween(a: number, b: number) {
  return a + Math.random() * (b - a)
}

function snap(n: number) {
  return Math.round(n)
}

interface PlayerBody {
  x: number
  y: number
  vx: number
  vy: number
  width: number
  height: number
}

/** 云朵贴图实体踩踏面 — 扣除透明 fluff 边距 */
function getPlatformWalkSurface(plat: Platform) {
  const visW =
    CLOUD_WIDTH * (plat.type === 'fragile' ? CLOUD_LEAP_FRAGILE_WIDTH_RATIO : 1)
  const padL = CLOUD_LEAP_PLATFORM_HITBOX.paddingLeft * PLATFORM_HITBOX_SCALE
  const padR = CLOUD_LEAP_PLATFORM_HITBOX.paddingRight * PLATFORM_HITBOX_SCALE
  const walkW = Math.max(16, visW - padL - padR)

  return {
    left: plat.x - walkW / 2,
    right: plat.x + walkW / 2,
    y: plat.y,
  }
}

/** 唤灵师脚底窄盒 — 忽略张开双臂造成的宽包围 */
function getPlayerFootHitbox(p: PlayerBody) {
  const centerX = p.x + p.width / 2
  const half = PLAYER_FOOT_W / 2

  return {
    left: centerX - half,
    right: centerX + half,
    bottom: p.y + p.height,
    centerX,
  }
}

function isLandingOnPlatform(
  foot: ReturnType<typeof getPlayerFootHitbox>,
  surface: ReturnType<typeof getPlatformWalkSurface>,
  vy: number,
) {
  if (vy <= 0) return false

  const overlap = Math.min(foot.right, surface.right) - Math.max(foot.left, surface.left)
  const minOverlap = PLAYER_FOOT_W * 0.55

  return (
    overlap >= minOverlap &&
    foot.centerX >= surface.left &&
    foot.centerX <= surface.right &&
    foot.bottom >= surface.y &&
    foot.bottom <= surface.y + CLOUD_LEAP_PLATFORM_SURFACE_DEPTH
  )
}

function placePlayerOnPlatform(player: PlayerBody, plat: Platform) {
  player.x = plat.x - player.width / 2
  player.y = plat.y - player.height
  player.vx = 0
  player.vy = 0
}

/** 一维线性生成轴：严格基于上一朵云的 Y 做安全增量 */
function appendChainedPlatform(list: Platform[], lastX: number): number {
  const prev = list[list.length - 1]!
  const gapY = randBetween(GAP_Y_MIN, GAP_Y_MAX)
  let curY = prev.y - gapY

  const minX = Math.max(CLOUD_WIDTH / 2, lastX - MAX_OFFSET_X)
  const maxX = Math.min(SCREEN_WIDTH - CLOUD_WIDTH / 2, lastX + MAX_OFFSET_X)
  const nextX = randBetween(minX, maxX)

  let type: Platform['type'] = Math.random() < FRAGILE_CHANCE ? 'fragile' : 'normal'
  if (prev.type === 'fragile') {
    type = 'normal'
    curY += gapY * 0.3
  }

  const id = list.length
  list.push({ id, x: nextX, y: curY, type, isStepped: false })
  return nextX
}

function buildPlatformLadder(): Platform[] {
  const list: Platform[] = []
  let curY = FIRST_PLATFORM_Y
  let lastX = SCREEN_WIDTH / 2

  list.push({ id: 0, x: lastX, y: curY, type: 'normal', isStepped: false })

  for (let i = 1; i < INITIAL_CLOUD_COUNT; i++) {
    lastX = appendChainedPlatform(list, lastX)
  }

  return list
}

function extendPlatformsIfNeeded(
  list: Platform[],
  cameraY: number,
  lastXRef: MutableRefObject<number>,
) {
  let topY = Infinity
  for (const p of list) {
    if (p.y >= FRAGILE_KICK_Y) continue
    if (p.y < topY) topY = p.y
  }

  const needMore = topY > cameraY - SCREEN_HEIGHT * 0.85
  if (!needMore) return

  let lastX = lastXRef.current
  const lastValid = [...list].reverse().find((p) => p.y < FRAGILE_KICK_Y)
  if (lastValid) lastX = lastValid.x

  for (let i = 0; i < EXTEND_BATCH; i++) {
    lastX = appendChainedPlatform(list, lastX)
  }
  lastXRef.current = lastX
}

export function CloudJumpGame({
  onComplete,
  onMilestone,
  onExit,
  milestoneScore,
  milestoneM,
  pixelsPerMeter: pixelsPerMeterProp,
  spiritImage = CLOUD_LEAP_DEFAULTS.spiritImage,
}: CloudJumpGameProps) {
  const pixelsPerMeter = pixelsPerMeterProp ?? CLOUD_LEAP_DEFAULTS.pixelsPerMeter
  const targetMilestoneM = milestoneM ?? milestoneScore ?? CLOUD_LEAP_DEFAULTS.milestoneM
  const [gameState, setGameState] = useState<GameState>('START')
  const [score, setScore] = useState(0)
  const [milestoneReached, setMilestoneReached] = useState(false)

  const gameStateRef = useRef<GameState>('START')
  const playerRef = useRef<PlayerBody>({
    x: SCREEN_WIDTH / 2 - PLAYER_W / 2,
    y: FIRST_PLATFORM_Y - PLAYER_H,
    vx: 0,
    vy: 0,
    width: PLAYER_W,
    height: PLAYER_H,
  })
  const platformsRef = useRef<Platform[]>([])
  const cameraYRef = useRef(0)
  const inputXRef = useRef(SCREEN_WIDTH / 2 - PLAYER_W / 2)
  const dragAnchorRef = useRef<{ clientX: number; inputX: number } | null>(null)
  const requestRef = useRef(0)
  const lastXRef = useRef(SCREEN_WIDTH / 2)
  const climbOriginYRef = useRef(FIRST_PLATFORM_Y - PLAYER_H)
  const milestoneFiredRef = useRef(false)
  const milestoneReachedRef = useRef(false)
  const platformPoolRef = useRef(new Map<number, HTMLDivElement>())
  const scoreRef = useRef(0)
  const maxHeightMRef = useRef(0)

  const arenaRef = useRef<HTMLDivElement>(null)
  const scalerRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const playerElRef = useRef<HTMLDivElement>(null)
  const platformsLayerRef = useRef<HTMLDivElement>(null)
  const bgRef = useRef<HTMLDivElement>(null)
  const scoreElRef = useRef<HTMLSpanElement>(null)

  const onCompleteRef = useRef(onComplete)
  const onMilestoneRef = useRef(onMilestone)
  const onExitRef = useRef(onExit)
  onCompleteRef.current = onComplete
  onMilestoneRef.current = onMilestone
  onExitRef.current = onExit

  gameStateRef.current = gameState
  milestoneReachedRef.current = milestoneReached

  const climbPxToMeters = useCallback(
    (climbPx: number) => Math.max(0, Math.floor(climbPx / pixelsPerMeter)),
    [pixelsPerMeter],
  )

  const syncScoreDisplay = useCallback((value: number) => {
    if (scoreElRef.current) scoreElRef.current.textContent = String(value)
  }, [])

  const initGame = useCallback(() => {
    platformsRef.current = buildPlatformLadder()
    const startPlat = platformsRef.current[0]!

    playerRef.current = {
      x: SCREEN_WIDTH / 2 - PLAYER_W / 2,
      y: FIRST_PLATFORM_Y - PLAYER_H,
      vx: 0,
      vy: 0,
      width: PLAYER_W,
      height: PLAYER_H,
    }
    placePlayerOnPlatform(playerRef.current, startPlat)
    climbOriginYRef.current = playerRef.current.y

    cameraYRef.current = 0
    inputXRef.current = playerRef.current.x
    dragAnchorRef.current = null
    lastXRef.current = startPlat.x
    milestoneFiredRef.current = false
    milestoneReachedRef.current = false
    maxHeightMRef.current = 0
    scoreRef.current = 0
    setScore(0)
    setMilestoneReached(false)
    syncScoreDisplay(0)

    for (const el of platformPoolRef.current.values()) el.remove()
    platformPoolRef.current.clear()
  }, [syncScoreDisplay])

  const syncVisuals = useCallback(() => {
    const cam = cameraYRef.current
    const p = playerRef.current

    if (worldRef.current) {
      worldRef.current.style.transform = `translate3d(0, ${snap(-cam)}px, 0)`
    }

    if (bgRef.current) {
      bgRef.current.style.backgroundPosition = `center ${snap(-cam * 0.22)}px`
    }

    if (playerElRef.current) {
      playerElRef.current.style.transform = `translate3d(${snap(p.x)}px, ${snap(p.y)}px, 0)`
    }

    const layer = platformsLayerRef.current
    if (!layer) return

    const alive = new Set<number>()
    for (const plat of platformsRef.current) {
      if (plat.y >= FRAGILE_KICK_Y) continue
      alive.add(plat.id)

      let el = platformPoolRef.current.get(plat.id)
      if (!el) {
        el = document.createElement('div')
        el.className = `cloud-jump-platform cloud-jump-platform--${plat.type}`
        el.style.width = `${CLOUD_WIDTH}px`
        el.style.height = `${PLATFORM_SPRITE_H}px`

        const img = document.createElement('img')
        img.className = 'cloud-jump-platform-img'
        img.src = CLOUD_LEAP_DEFAULTS.platformImage
        img.alt = ''
        img.draggable = false
        el.appendChild(img)

        platformPoolRef.current.set(plat.id, el)
        layer.appendChild(el)
      } else {
        el.className = `cloud-jump-platform cloud-jump-platform--${plat.type}`
      }

      const left = plat.x - CLOUD_WIDTH / 2
      const top = plat.y - (PLATFORM_SPRITE_H - PLATFORM_SURFACE_FROM_BOTTOM)
      el.style.transform = `translate3d(${snap(left)}px, ${snap(top)}px, 0)`
    }

    for (const [id, el] of platformPoolRef.current) {
      if (!alive.has(id)) {
        el.remove()
        platformPoolRef.current.delete(id)
      }
    }
  }, [])

  const stopLoop = useCallback(() => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current)
      requestRef.current = 0
    }
  }, [])

  const gameLoop = useCallback(() => {
    if (gameStateRef.current !== 'PLAYING') return

    const p = playerRef.current

    p.x += (inputXRef.current - p.x) * 0.2
    p.x = clamp(p.x, 0, SCREEN_WIDTH - p.width)

    p.vy += GRAVITY
    p.y += p.vy

    const targetCam = p.y - SCREEN_HEIGHT / 2
    if (p.y < SCREEN_HEIGHT / 2 + cameraYRef.current) {
      cameraYRef.current += (targetCam - cameraYRef.current) * 0.1
    }

    extendPlatformsIfNeeded(platformsRef.current, cameraYRef.current, lastXRef)

    const climbPx = Math.max(0, climbOriginYRef.current - p.y)
    const heightM = climbPxToMeters(climbPx)
    if (heightM > maxHeightMRef.current) {
      maxHeightMRef.current = heightM
      scoreRef.current = heightM
      setScore(heightM)
      syncScoreDisplay(heightM)

      if (!milestoneFiredRef.current && heightM >= targetMilestoneM) {
        milestoneFiredRef.current = true
        milestoneReachedRef.current = true
        setMilestoneReached(true)
        onMilestoneRef.current?.()
      }
    }

    if (p.vy > 0) {
      const foot = getPlayerFootHitbox(p)

      for (const plat of platformsRef.current) {
        if (plat.y >= FRAGILE_KICK_Y) continue

        const surface = getPlatformWalkSurface(plat)
        if (!isLandingOnPlatform(foot, surface, p.vy)) continue

        p.vy = JUMP_VELOCITY
        p.y = plat.y - p.height
        plat.isStepped = true

        if (plat.type === 'fragile') {
          plat.y = FRAGILE_KICK_Y
        }
        break
      }
    }

    if (p.y > SCREEN_HEIGHT + cameraYRef.current + 50) {
      stopLoop()
      syncVisuals()
      if (milestoneReachedRef.current) {
        gameStateRef.current = 'VICTORY'
        setGameState('VICTORY')
      } else {
        gameStateRef.current = 'GAMEOVER'
        setGameState('GAMEOVER')
      }
      return
    }

    syncVisuals()
    requestRef.current = requestAnimationFrame(gameLoop)
  }, [targetMilestoneM, climbPxToMeters, stopLoop, syncScoreDisplay, syncVisuals])

  const startPlaying = useCallback(() => {
    initGame()
    gameStateRef.current = 'PLAYING'
    setGameState('PLAYING')
    stopLoop()
    syncVisuals()
    requestRef.current = requestAnimationFrame(gameLoop)
  }, [gameLoop, initGame, stopLoop, syncVisuals])

  const applyDragDelta = useCallback((clientX: number) => {
    const anchor = dragAnchorRef.current
    const arena = arenaRef.current
    if (!anchor || !arena) return

    const rect = arena.getBoundingClientRect()
    const scale = rect.width / SCREEN_WIDTH
    const deltaX = (clientX - anchor.clientX) / scale
    inputXRef.current = clamp(anchor.inputX + deltaX, 0, SCREEN_WIDTH - PLAYER_W)
  }, [])

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (gameStateRef.current !== 'PLAYING') return
      preventGhostActivation(e)
      dragAnchorRef.current = {
        clientX: e.clientX,
        inputX: inputXRef.current,
      }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [],
  )

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (gameStateRef.current !== 'PLAYING') return
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
      if (!dragAnchorRef.current) return
      preventGhostActivation(e)
      applyDragDelta(e.clientX)
    },
    [applyDragDelta],
  )

  const handlePointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    dragAnchorRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
  }, [])

  useEffect(() => {
    const arena = arenaRef.current
    const scaler = scalerRef.current
    if (!arena || !scaler) return

    const applyScale = () => {
      const scale = arena.clientWidth / SCREEN_WIDTH
      scaler.style.transform = `scale(${scale})`
    }

    applyScale()
    const ro = new ResizeObserver(applyScale)
    ro.observe(arena)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    initGame()
    return () => stopLoop()
  }, [initGame, stopLoop])

  useEffect(() => {
    const arena = arenaRef.current
    if (!arena) return

    const blockScroll = (e: TouchEvent) => {
      if (gameStateRef.current === 'PLAYING') e.preventDefault()
    }
    arena.addEventListener('touchmove', blockScroll, { passive: false })
    return () => arena.removeEventListener('touchmove', blockScroll)
  }, [])

  const handleManualSettle = useCallback(() => {
    if (!milestoneReachedRef.current || gameStateRef.current !== 'PLAYING') return
    stopLoop()
    gameStateRef.current = 'VICTORY'
    setGameState('VICTORY')
    syncVisuals()
  }, [stopLoop, syncVisuals])

  const handleVictoryExit = useCallback(() => {
    onExitRef.current?.()
    onCompleteRef.current?.()
  }, [])

  return (
    <div className="interactive-area cloud-jump-root mx-auto w-full max-w-md">
      <div className="mb-2 flex items-center justify-between gap-2 px-1 text-[10px] text-mist-muted">
        <span className="flex shrink-0 items-center gap-1 text-cyan-200/90">
          <Cloud className="h-3.5 w-3.5" />
          登云踏雾
        </span>
        <span className="shrink-0">
          高度 <span ref={scoreElRef} className="font-medium text-cyan-100">0</span>m
          {targetMilestoneM > 0 ? ` / ${targetMilestoneM}m` : ''}
        </span>
        {milestoneReached && gameState === 'PLAYING' && (
          <button
            type="button"
            onClick={handleManualSettle}
            className="ml-auto flex shrink-0 items-center gap-1 rounded-lg border border-cyan-400/40 bg-cyan-950/55 px-2 py-1 text-[9px] font-medium text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.2)]"
          >
            <LogOut className="h-3 w-3" />
            退出结算
          </button>
        )}
      </div>

      <div
        ref={arenaRef}
        className="cloud-jump-arena relative mx-auto overflow-hidden rounded-xl border border-cyan-400/25 bg-[#7ec0e4] touch-none select-none"
        style={{
          width: '100%',
          aspectRatio: `${SCREEN_WIDTH} / ${SCREEN_HEIGHT}`,
          touchAction: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          ref={bgRef}
          className="cloud-jump-bg absolute inset-0"
          aria-hidden
        />
        <div className="cloud-jump-bg-veil pointer-events-none absolute inset-0" aria-hidden />

        {gameState === 'PLAYING' && milestoneReached && (
          <div
            className="cloud-jump-milestone-toast cloud-jump-milestone-toast--visible pointer-events-none absolute inset-x-2 top-2 z-30 rounded-xl border border-emerald-400/45 bg-emerald-950/75 px-3 py-2 text-center text-[10px] leading-snug text-emerald-100 shadow-[0_0_24px_rgba(52,211,153,0.35)] backdrop-blur-sm"
            role="status"
          >
            ✅ 目标 {targetMilestoneM}m 已达成！可随时退出结算，或继续挑战极限高度！
          </div>
        )}

        <div
          ref={scalerRef}
          className="absolute left-0 top-0 origin-top-left"
          style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
        >
          <div
            ref={worldRef}
            className="cloud-jump-world absolute left-0 top-0"
            style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, willChange: 'transform' }}
          >
            <div
              ref={platformsLayerRef}
              className="pointer-events-none absolute inset-0 z-[1]"
            />
            <div
              ref={playerElRef}
              className="cloud-jump-player absolute left-0 top-0 z-[2]"
              style={{ width: PLAYER_W, height: PLAYER_H, willChange: 'transform' }}
            >
              <img
                src={CLOUD_LEAP_PLAYER_IMAGE}
                alt=""
                className="cloud-jump-player-img"
                draggable={false}
              />
            </div>
          </div>
        </div>

        {gameState === 'START' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/55 px-6 text-center backdrop-blur-[2px]">
            <p className="mb-1 text-[10px] tracking-[0.35em] text-cyan-200/85">云海跳跃</p>
            <p className="mb-5 max-w-[14rem] text-xs leading-relaxed text-mist-muted">
              按住左右拖动，踩着云朵向上攀登。抵达 {targetMilestoneM}m 里程碑后可结算收服云灵，亦可继续无尽挑战。
            </p>
            <button
              type="button"
              onClick={startPlaying}
              className="rounded-xl bg-gradient-to-r from-cyan-500/90 to-sky-400/90 px-8 py-3 text-sm font-semibold text-void-950 shadow-[0_0_24px_rgba(34,211,238,0.35)]"
            >
              开始攀登
            </button>
          </div>
        )}

        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/60 px-6 text-center backdrop-blur-[2px]">
            <p className="mb-2 text-base font-medium text-red-200">坠入云海</p>
            <p className="mb-5 text-xs text-mist-muted">
              最高抵达 {score}m · 未达 {targetMilestoneM}m 里程碑，再试一次吧
            </p>
            <button
              type="button"
              onClick={startPlaying}
              className="flex items-center gap-2 rounded-xl border border-cyan-400/35 bg-cyan-950/50 px-6 py-3 text-sm text-cyan-100"
            >
              <RefreshCw className="h-4 w-4" />
              重新攀登
            </button>
          </div>
        )}
      </div>

      <ModalOverlay open={gameState === 'VICTORY'}>
        <div className="w-full rounded-2xl border border-cyan-400/40 bg-void-900/96 p-5 shadow-[0_0_48px_rgba(34,211,238,0.25)]">
          <div className="mb-4 text-center">
            <Sparkles className="mx-auto mb-2 h-8 w-8 text-cyan-200" />
            <p className="text-base font-medium text-cyan-50">千仞云巅，玉皇云灵已现！</p>
            <p className="mt-2 text-xs text-mist-faint">
              里程碑 {targetMilestoneM}m 已达成 · 本次最高 {score}m
            </p>
            {spiritImage && (
              <img
                src={spiritImage}
                alt=""
                className="mx-auto mt-4 h-24 w-auto object-contain opacity-90"
              />
            )}
          </div>
          <button
            type="button"
            onClick={handleVictoryExit}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500/85 to-sky-400/85 py-3.5 text-sm font-medium text-void-950"
          >
            收服云灵 · 继续旅程
          </button>
        </div>
      </ModalOverlay>
    </div>
  )
}

export default CloudJumpGame
