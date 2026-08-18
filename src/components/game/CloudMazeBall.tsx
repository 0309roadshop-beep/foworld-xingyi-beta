import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Compass, RefreshCw, Sparkles, Wind } from 'lucide-react'
import { CLOUD_MAZE_DEFAULTS } from '../../config/cloudMazeConfig'
import {
  generateSolvableMaze,
  type MazeCell,
} from '../../utils/cloudMazeEngine'
import {
  attachTiltListeners,
  detectOrientationPlatform,
  hasOrientationApi,
  invokeIosOrientationPermissionInGesture,
  isSecureContext,
  needsIosOrientationPermission,
  resetTiltSample,
  waitForSensorSignal,
  type TiltSample,
} from '../../utils/windBalanceOrientation'

type GamePhase = 'permission' | 'playing' | 'win'

interface WallRect {
  x: number
  y: number
  w: number
  h: number
  kind: 'cloud' | 'rock'
}

interface WallSegment {
  x1: number
  y1: number
  x2: number
  y2: number
  kind: 'cloud' | 'rock'
}

export type CloudMazeGoalTarget = 'spirit' | 'ladder'

export interface CloudMazeBallProps {
  cols?: number
  rows?: number
  backgroundImage?: string
  /** 终点目标：云梯入口（穿雾）或云灵图腾（旧版） */
  goalTarget?: CloudMazeGoalTarget
  onComplete?: () => void
}

const IOS_HTTPS_HINT =
  '陀螺仪需 https:// 访问。请用终端显示的 https 局域网地址在手机浏览器打开。'

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function buildWallRects(
  cells: MazeCell[][],
  cols: number,
  rows: number,
  cellSize: number,
  originX: number,
  originY: number,
): WallRect[] {
  const thick = Math.max(6, cellSize * 0.34)
  const rects: WallRect[] = []
  const mazeW = cols * cellSize
  const mazeH = rows * cellSize

  rects.push({
    x: originX - thick,
    y: originY - thick,
    w: mazeW + thick * 2,
    h: thick,
    kind: 'rock',
  })
  rects.push({
    x: originX - thick,
    y: originY + mazeH,
    w: mazeW + thick * 2,
    h: thick,
    kind: 'rock',
  })
  rects.push({
    x: originX - thick,
    y: originY,
    w: thick,
    h: mazeH,
    kind: 'rock',
  })
  rects.push({
    x: originX + mazeW,
    y: originY,
    w: thick,
    h: mazeH,
    kind: 'rock',
  })

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = originX + col * cellSize
      const y = originY + row * cellSize
      const cell = cells[row][col]
      const kind: WallRect['kind'] = (col + row) % 2 === 0 ? 'cloud' : 'rock'

      if (cell.walls.top) {
        rects.push({ x, y: y - thick / 2, w: cellSize, h: thick, kind })
      }
      if (cell.walls.right) {
        rects.push({ x: x + cellSize - thick / 2, y, w: thick, h: cellSize, kind })
      }
      if (cell.walls.bottom) {
        rects.push({ x, y: y + cellSize - thick / 2, w: cellSize, h: thick, kind })
      }
      if (cell.walls.left) {
        rects.push({ x: x - thick / 2, y, w: thick, h: cellSize, kind })
      }
    }
  }

  return rects
}

function buildWallSegments(
  cells: MazeCell[][],
  cols: number,
  rows: number,
  cellSize: number,
  originX: number,
  originY: number,
): WallSegment[] {
  const segments: WallSegment[] = []
  const mazeW = cols * cellSize
  const mazeH = rows * cellSize

  segments.push({
    x1: originX,
    y1: originY,
    x2: originX + mazeW,
    y2: originY,
    kind: 'rock',
  })
  segments.push({
    x1: originX + mazeW,
    y1: originY,
    x2: originX + mazeW,
    y2: originY + mazeH,
    kind: 'rock',
  })
  segments.push({
    x1: originX + mazeW,
    y1: originY + mazeH,
    x2: originX,
    y2: originY + mazeH,
    kind: 'rock',
  })
  segments.push({
    x1: originX,
    y1: originY + mazeH,
    x2: originX,
    y2: originY,
    kind: 'rock',
  })

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = originX + col * cellSize
      const y = originY + row * cellSize
      const cell = cells[row][col]
      const kind: WallSegment['kind'] = (col + row) % 2 === 0 ? 'cloud' : 'rock'

      if (cell.walls.top) {
        segments.push({ x1: x, y1: y, x2: x + cellSize, y2: y, kind })
      }
      if (cell.walls.right) {
        segments.push({ x1: x + cellSize, y1: y, x2: x + cellSize, y2: y + cellSize, kind })
      }
      if (cell.walls.bottom) {
        segments.push({
          x1: x + cellSize,
          y1: y + cellSize,
          x2: x,
          y2: y + cellSize,
          kind,
        })
      }
      if (cell.walls.left) {
        segments.push({ x1: x, y1: y + cellSize, x2: x, y2: y, kind })
      }
    }
  }

  return segments
}

function drawGlowingWallSegments(
  ctx: CanvasRenderingContext2D,
  cloudSegs: WallSegment[],
  rockSegs: WallSegment[],
) {
  const strokeBatch = (
    batch: WallSegment[],
    glowColor: string,
    alpha: number,
    width: number,
    blur: number,
  ) => {
    if (batch.length === 0) return
    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.shadowBlur = blur
    ctx.shadowColor = glowColor
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`
    ctx.lineWidth = width
    ctx.beginPath()
    for (const seg of batch) {
      ctx.moveTo(seg.x1, seg.y1)
      ctx.lineTo(seg.x2, seg.y2)
    }
    ctx.stroke()
    ctx.restore()
  }

  strokeBatch(cloudSegs, '#00E5FF', 0.55, 3, 18)
  strokeBatch(rockSegs, '#FFFFFF', 0.45, 3, 14)
  strokeBatch(cloudSegs, '#00E5FF', 0.82, 2, 15)
  strokeBatch(rockSegs, '#E0F2FE', 0.75, 2, 12)
}

function resolveCircleRect(
  cx: number,
  cy: number,
  r: number,
  vx: number,
  vy: number,
  rect: WallRect,
) {
  const closestX = clamp(cx, rect.x, rect.x + rect.w)
  const closestY = clamp(cy, rect.y, rect.y + rect.h)
  const dx = cx - closestX
  const dy = cy - closestY
  const distSq = dx * dx + dy * dy
  if (distSq >= r * r) return { x: cx, y: cy, vx, vy }

  const dist = Math.sqrt(distSq) || 0.001
  const overlap = r - dist
  const nx = dx / dist
  const ny = dy / dist
  cx += nx * overlap
  cy += ny * overlap
  const vDot = vx * nx + vy * ny
  if (vDot < 0) {
    vx -= vDot * nx
    vy -= vDot * ny
  }
  return { x: cx, y: cy, vx, vy }
}

/** 云梯入口 — 旋风传送阵光晕 */
function drawVortexPortalGoal(
  ctx: CanvasRenderingContext2D,
  goal: { x: number; y: number; r: number },
  pulse: number,
  timeMs: number,
) {
  const { x, y, r } = goal
  const spin = timeMs * 0.0018

  for (let ring = 3; ring >= 0; ring -= 1) {
    const rr = r + ring * 7 * pulse
    ctx.beginPath()
    ctx.arc(x, y, rr, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(0, 229, 255, ${0.04 + ring * 0.035})`
    ctx.fill()
  }

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(spin)

  ctx.shadowBlur = 20
  ctx.shadowColor = '#00E5FF'
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'

  for (let arm = 0; arm < 3; arm += 1) {
    const start = arm * ((Math.PI * 2) / 3)
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.78, start, start + Math.PI * 0.82)
    ctx.stroke()
  }

  ctx.rotate(-spin * 1.4)
  ctx.lineWidth = 1.5
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)'
  for (let arm = 0; arm < 3; arm += 1) {
    const start = arm * ((Math.PI * 2) / 3) + Math.PI / 6
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.48, start, start + Math.PI * 0.55)
    ctx.stroke()
  }

  ctx.restore()

  ctx.beginPath()
  ctx.arc(x, y, r * 0.32, 0, Math.PI * 2)
  ctx.shadowBlur = 15
  ctx.shadowColor = '#00E5FF'
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.shadowBlur = 8
  ctx.shadowColor = '#7DD3FC'
  ctx.beginPath()
  ctx.arc(x, y, 3.5 * pulse, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
  ctx.fill()
  ctx.shadowBlur = 0
}

function drawSpiritGoal(
  ctx: CanvasRenderingContext2D,
  goal: { x: number; y: number; r: number },
  pulse: number,
) {
  const { x, y, r } = goal
  ctx.beginPath()
  ctx.arc(x, y, r + 6 * pulse, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(253,230,138,${0.12 + pulse * 0.1})`
  ctx.fill()

  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  const totem = ctx.createRadialGradient(x, y - 4, 2, x, y, r)
  totem.addColorStop(0, '#fde68a')
  totem.addColorStop(0.55, '#f59e0b')
  totem.addColorStop(1, '#b45309')
  ctx.fillStyle = totem
  ctx.fill()
  ctx.strokeStyle = 'rgba(253,230,138,0.85)'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = '#fef3c7'
  ctx.font = 'bold 11px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('云灵', x, y)
}

export function CloudMazeBall({
  cols = CLOUD_MAZE_DEFAULTS.cols,
  rows = CLOUD_MAZE_DEFAULTS.rows,
  backgroundImage = CLOUD_MAZE_DEFAULTS.backgroundImage,
  goalTarget = 'ladder',
  onComplete,
}: CloudMazeBallProps) {
  const platform = useMemo(() => detectOrientationPlatform(), [])
  const iosPermission = useMemo(() => needsIosOrientationPermission(), [])

  const [phase, setPhase] = useState<GamePhase>('permission')
  const [permError, setPermError] = useState<string | null>(null)
  const [sensorLive, setSensorLive] = useState(false)
  const [starting, setStarting] = useState(false)
  const [roundKey, setRoundKey] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const ballElRef = useRef<HTMLDivElement>(null)
  const tiltRef = useRef<TiltSample>({ ax: 0, ay: 0, lastAt: 0, active: false })
  const smoothTiltRef = useRef({ ax: 0, ay: 0 })
  const ballRef = useRef({ x: 0, y: 0, vx: 0, vy: 0 })
  const wallsRef = useRef<WallRect[]>([])
  const wallSegmentsRef = useRef<WallSegment[]>([])
  const cloudSegmentsRef = useRef<WallSegment[]>([])
  const rockSegmentsRef = useRef<WallSegment[]>([])
  const goalRef = useRef({ x: 0, y: 0, r: CLOUD_MAZE_DEFAULTS.goalRadius })
  const layoutRef = useRef({ cellSize: 24, originX: 0, originY: 0, width: 0, height: 0 })
  const rafRef = useRef<number | null>(null)
  const wonRef = useRef(false)
  const detachTiltRef = useRef<(() => void) | null>(null)

  const ballR = CLOUD_MAZE_DEFAULTS.ballRadius
  const friction = CLOUD_MAZE_DEFAULTS.friction
  const accelScale = CLOUD_MAZE_DEFAULTS.accelScale
  const tiltSmoothing = CLOUD_MAZE_DEFAULTS.tiltSmoothing
  const maxSpeed = CLOUD_MAZE_DEFAULTS.maxSpeed

  const initMaze = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const viewW = container.clientWidth
    const viewH = Math.min(container.clientWidth * 1.35, 420)
    canvas.width = Math.floor(viewW * dpr)
    canvas.height = Math.floor(viewH * dpr)
    canvas.style.width = `${viewW}px`
    canvas.style.height = `${viewH}px`

    const pad = 16
    const cellSize = Math.floor(
      Math.min((viewW - pad * 2) / cols, (viewH - pad * 2) / rows),
    )
    const mazeW = cols * cellSize
    const mazeH = rows * cellSize
    const originX = (viewW - mazeW) / 2
    const originY = (viewH - mazeH) / 2

    const cells = generateSolvableMaze(cols, rows)
    wallsRef.current = buildWallRects(cells, cols, rows, cellSize, originX, originY)
    const segments = buildWallSegments(cells, cols, rows, cellSize, originX, originY)
    wallSegmentsRef.current = segments
    const cloudBatch: WallSegment[] = []
    const rockBatch: WallSegment[] = []
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]!
      if (seg.kind === 'cloud') cloudBatch.push(seg)
      else rockBatch.push(seg)
    }
    cloudSegmentsRef.current = cloudBatch
    rockSegmentsRef.current = rockBatch

    const startX = originX + cellSize * 0.5
    const startY = originY + cellSize * 0.5
    const goalX = originX + (cols - 0.5) * cellSize
    const goalY = originY + (rows - 0.5) * cellSize

    ballRef.current = { x: startX, y: startY, vx: 0, vy: 0 }
    goalRef.current = { x: goalX, y: goalY, r: CLOUD_MAZE_DEFAULTS.goalRadius }
    layoutRef.current = { cellSize, originX, originY, width: viewW, height: viewH }
    wonRef.current = false

    requestAnimationFrame(() => {
      const el = ballElRef.current
      if (!el) return
      el.style.transform = `translate3d(${startX - ballR}px, ${startY - ballR}px, 0)`
    })
  }, [cols, rows, ballR])

  const drawScene = useCallback(
    (ctx: CanvasRenderingContext2D, dpr: number) => {
      const { width, height } = layoutRef.current
      const goal = goalRef.current
      const now = Date.now()

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)

      drawGlowingWallSegments(ctx, cloudSegmentsRef.current, rockSegmentsRef.current)

      const pulse = 0.65 + Math.sin(now / 420) * 0.35
      if (goalTarget === 'ladder') {
        drawVortexPortalGoal(ctx, goal, pulse, now)
      } else {
        drawSpiritGoal(ctx, goal, pulse)
      }
    },
    [goalTarget],
  )

  const syncBallTransform = useCallback(() => {
    const el = ballElRef.current
    if (!el) return
    const ball = ballRef.current
    const x = ball.x - ballR
    const y = ball.y - ballR
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`
  }, [ballR])

  const isLadderGoal = goalTarget === 'ladder'

  const stepPhysics = useCallback(() => {
    const tilt = tiltRef.current
    const smooth = smoothTiltRef.current
    smooth.ax += (tilt.ax - smooth.ax) * tiltSmoothing
    smooth.ay += (tilt.ay - smooth.ay) * tiltSmoothing

    const ball = ballRef.current
    ball.vx += smooth.ax * accelScale
    ball.vy += smooth.ay * accelScale
    ball.vx *= friction
    ball.vy *= friction

    const speed = Math.hypot(ball.vx, ball.vy)
    if (speed > maxSpeed) {
      ball.vx = (ball.vx / speed) * maxSpeed
      ball.vy = (ball.vy / speed) * maxSpeed
    }

    ball.x += ball.vx
    ball.y += ball.vy

    for (const wall of wallsRef.current) {
      const resolved = resolveCircleRect(ball.x, ball.y, ballR, ball.vx, ball.vy, wall)
      ball.x = resolved.x
      ball.y = resolved.y
      ball.vx = resolved.vx
      ball.vy = resolved.vy
    }

    const goal = goalRef.current
    const dist = Math.hypot(ball.x - goal.x, ball.y - goal.y)
    if (!wonRef.current && dist < goal.r + ballR * 0.45) {
      wonRef.current = true
      setPhase('win')
      window.setTimeout(() => {
        onComplete?.()
      }, 1400)
    }
  }, [accelScale, ballR, friction, maxSpeed, onComplete, tiltSmoothing])

  const loop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (phase === 'playing') stepPhysics()

    syncBallTransform()

    const dpr = canvas.width / (layoutRef.current.width || 1)
    drawScene(ctx, dpr)
    rafRef.current = requestAnimationFrame(loop)
  }, [drawScene, phase, stepPhysics, syncBallTransform])

  useEffect(() => {
    initMaze()
  }, [initMaze, roundKey])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [loop])

  const stopSensors = useCallback(() => {
    detachTiltRef.current?.()
    detachTiltRef.current = null
    resetTiltSample(tiltRef.current)
    smoothTiltRef.current = { ax: 0, ay: 0 }
    setSensorLive(false)
  }, [])

  const beginPlaying = useCallback(async () => {
    resetTiltSample(tiltRef.current)
    detachTiltRef.current?.()
    detachTiltRef.current = attachTiltListeners(tiltRef.current)
    const ok = await waitForSensorSignal(tiltRef.current, 1800)
    setSensorLive(ok)
    setPhase('playing')
    setStarting(false)
  }, [])

  const handleStart = useCallback(async () => {
    setPermError(null)
    setStarting(true)

    if (!hasOrientationApi()) {
      setPermError('当前浏览器不支持方向传感器，请换用手机浏览器体验。')
      setStarting(false)
      return
    }

    if (!isSecureContext() && platform !== 'other') {
      setPermError(IOS_HTTPS_HINT)
      setStarting(false)
      return
    }

    if (iosPermission) {
      const perm = invokeIosOrientationPermissionInGesture()
      if (perm.required) {
        try {
          const state = await perm.promise
          if (state !== 'granted') {
            setPermError('未获得方向传感器权限，请允许后重试。')
            setStarting(false)
            return
          }
        } catch {
          setPermError('方向传感器授权失败，请刷新后重试。')
          setStarting(false)
          return
        }
      }
    }

    wonRef.current = false
    initMaze()
    await beginPlaying()
  }, [beginPlaying, initMaze, iosPermission, platform])

  useEffect(() => {
    return () => stopSensors()
  }, [stopSensors])

  const handleRetry = useCallback(() => {
    stopSensors()
    wonRef.current = false
    setPhase('permission')
    setPermError(null)
    setRoundKey((k) => k + 1)
  }, [stopSensors])

  const startLabel = starting
    ? '正在连接灵能感应…'
    : iosPermission
      ? '点击开始 · 授权倾斜感应'
      : '点击开始 · 倾斜手机滚球'

  return (
    <div className="interactive-area w-full overflow-hidden rounded-xl border border-white/10 bg-void-950/40 shadow-[inset_0_0_40px_rgba(0,229,255,0.04)]">
      <div className="border-b border-white/8 px-3 py-2 text-center backdrop-blur-sm">
        <p className="text-[10px] tracking-[0.22em] text-cyan-100/90">
          云端迷宫 · {isLadderGoal ? '云梯入口' : '玉皇云灵'}
        </p>
        <p className="mt-0.5 text-[10px] text-white/45">
          {phase === 'playing'
            ? sensorLive
              ? isLadderGoal
                ? '倾斜手机，将灵力球滚入旋风传送阵'
                : '倾斜手机，将灵力球滚入金色图腾'
              : '未检测到传感器，可尝试倾斜或换用 HTTPS'
            : isLadderGoal
              ? '穿越浓雾，循灵力流光找到云梯入口'
              : '穿越云墙与山岩，抵达迷宫终点'}
        </p>
      </div>

      <div
        ref={containerRef}
        className="relative mx-auto w-full max-w-md overflow-hidden"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <canvas
          ref={canvasRef}
          className="block w-full touch-none"
          style={{ touchAction: 'none', background: 'transparent' }}
        />
        <div
          ref={ballElRef}
          className="cloud-maze-ball pointer-events-none absolute left-0 top-0"
          style={{
            width: ballR * 2,
            height: ballR * 2,
            willChange: 'transform',
          }}
          aria-hidden
        />

        {phase === 'permission' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/72 px-5 text-center backdrop-blur-md">
            <Wind className="mb-3 h-9 w-9 text-cyan-200 drop-shadow-[0_0_12px_rgba(0,229,255,0.55)]" />
            <p className="mb-2 text-sm font-medium text-white/90">云海迷宫试炼</p>
            <p className="mb-4 text-[11px] leading-relaxed text-white/55">
              {isLadderGoal
                ? '浓雾中唯有灵力流光指引方向。倾斜设备滚入旋风传送阵，穿出迷雾。'
                : '倾斜设备控制灵力球，循发光云墙穿行，滚入玉皇云灵图腾。'}
            </p>
            {permError && (
              <p className="mb-3 text-[11px] leading-relaxed text-amber-300/90">{permError}</p>
            )}
            <button
              type="button"
              disabled={starting}
              onClick={() => void handleStart()}
              className="rounded-xl border border-cyan-300/35 bg-cyan-950/50 px-6 py-3 text-sm font-medium text-cyan-100 shadow-[0_0_20px_rgba(0,229,255,0.15)] disabled:opacity-50"
            >
              {startLabel}
            </button>
          </div>
        )}

        {phase === 'win' && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-[2px]">
            <Sparkles className="mb-2 h-10 w-10 text-cyan-100 drop-shadow-[0_0_20px_rgba(0,229,255,0.7)]" />
            <p className="text-sm font-medium text-cyan-50">
              {isLadderGoal ? '穿出浓雾！云梯入口已现' : '云灵共鸣成功！'}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-white/8 px-3 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 text-[10px] text-white/40">
          <Compass className="h-3.5 w-3.5 text-cyan-300/70" />
          {sensorLive ? '陀螺仪已连接' : '待连接'}
        </div>
        {phase !== 'permission' && (
          <button
            type="button"
            onClick={handleRetry}
            className="flex items-center gap-1 rounded-lg border border-void-600/70 px-2.5 py-1 text-[10px] text-mist-muted"
          >
            <RefreshCw className="h-3 w-3" />
            重开迷宫
          </button>
        )}
      </div>
    </div>
  )
}

export default CloudMazeBall
