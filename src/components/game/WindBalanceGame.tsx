import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ModalOverlay } from '../ui/ModalOverlay'
import { Compass, RefreshCw, Sparkles, Wind } from 'lucide-react'
import {
  WIND_BALANCE_BALL_RADIUS,
  WIND_BALANCE_DEFAULTS,
  WIND_BALANCE_TARGET_RADIUS,
  WIND_BALANCE_TRAP_RADIUS,
} from '../../config/windBalanceConfig'
import {
  attachTiltListeners,
  detectOrientationPlatform,
  hasMotionApi,
  hasOrientationApi,
  isSecureContext,
  needsIosOrientationPermission,
  resetTiltSample,
  waitForSensorSignal,
  type TiltSample,
} from '../../utils/windBalanceOrientation'

type DeviceOrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied' | 'default'>
}

type GamePhase = 'permission' | 'playing' | 'burst' | 'win' | 'completed'

interface BallState {
  x: number
  y: number
  vx: number
  vy: number
  captured: boolean
  startX: number
  startY: number
}

interface TrapState {
  x: number
  y: number
}

const ACC_SCALE = 1.65
const FRICTION = 0.95
const RESTITUTION = 0.55
const CAPTURE_DIST = WIND_BALANCE_TARGET_RADIUS + WIND_BALANCE_BALL_RADIUS * 0.55
const BALL_R = WIND_BALANCE_BALL_RADIUS
const TRAP_R = WIND_BALANCE_TRAP_RADIUS
/** iOS 权限被拒/拦截时提示（iOS 13+ 已无全局「动作与方向」开关，勿引导去系统设置） */
const IOS_PERMISSION_BLOCKED_HINT =
  '灵能感知受到磁场拦截！请尝试使用浏览器的【无痕/隐私模式】重新打开网页，或复制链接到微信中打开重试。'

const IOS_REQUIRE_HTTPS_HINT = [
  'iPhone 陀螺仪必须用 https:// 访问（http:// 会触发 2b 拦截）。',
  '',
  '请按以下步骤操作：',
  '① 电脑终端 Ctrl+C 停止 dev，重新运行 npm run dev',
  '② 看终端 Network 行，必须是 https://192.168.x.x:5173',
  '③ 手机 Safari 打开该 https 地址（扫码面板选 HTTPS）',
  '④ 首次打开点「显示详细信息」→「访问此网站」接受证书',
  '⑤ 再回到本页点击授权',
].join('\n')

function dist(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2
  const dy = y1 - y2
  return Math.sqrt(dx * dx + dy * dy)
}

function generateTraps(
  count: number,
  boardRadius: number,
  balls: BallState[],
): TrapState[] {
  const traps: TrapState[] = []
  const minCenterDist = 55
  const minBallDist = 48
  const minTrapDist = 56
  let attempts = 0

  while (traps.length < count && attempts < 200) {
    attempts += 1
    const angle = Math.random() * Math.PI * 2
    const r = boardRadius * (0.28 + Math.random() * 0.42)
    const x = Math.cos(angle) * r
    const y = Math.sin(angle) * r

    if (dist(x, y, 0, 0) < minCenterDist) continue
    if (balls.some((b) => dist(x, y, b.startX, b.startY) < minBallDist)) continue
    if (traps.some((t) => dist(x, y, t.x, t.y) < minTrapDist)) continue

    traps.push({ x, y })
  }

  while (traps.length < count) {
    const angle = (traps.length * 2.1 + 0.8) % (Math.PI * 2)
    traps.push({
      x: Math.cos(angle) * boardRadius * 0.45,
      y: Math.sin(angle) * boardRadius * 0.45,
    })
  }

  return traps
}

function createBalls(boardRadius: number, count: number): BallState[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (i * (Math.PI * 2)) / count + 0.35
    const r = boardRadius * (0.58 + (i % 2) * 0.08)
    const x = Math.cos(angle) * r
    const y = Math.sin(angle) * r
    return { x, y, vx: 0, vy: 0, captured: false, startX: x, startY: y }
  })
}

export interface WindBalanceGameProps {
  boardSize?: number
  ballCount?: number
  trapCount?: number
  backgroundImage?: string
  onComplete?: () => void
}

export function WindBalanceGame({
  boardSize = WIND_BALANCE_DEFAULTS.boardSize,
  ballCount = WIND_BALANCE_DEFAULTS.ballCount,
  trapCount = WIND_BALANCE_DEFAULTS.trapCount,
  backgroundImage = WIND_BALANCE_DEFAULTS.backgroundImage,
  onComplete,
}: WindBalanceGameProps) {
  const platform = useMemo(() => detectOrientationPlatform(), [])
  const iosPermission = useMemo(() => needsIosOrientationPermission(), [])

  const [phase, setPhase] = useState<GamePhase>('permission')
  const [permError, setPermError] = useState<string | null>(null)
  const capturedCountRef = useRef(0)
  const capturedCountElRef = useRef<HTMLSpanElement>(null)
  const [displayTraps, setDisplayTraps] = useState<TrapState[]>([])
  const [roundKey, setRoundKey] = useState(0)
  const [sensorLive, setSensorLive] = useState(false)
  const [starting, setStarting] = useState(false)

  const boardRadius = boardSize / 2 - BALL_R - 4

  const tiltRef = useRef<TiltSample>({ ax: 0, ay: 0, lastAt: 0, active: false })
  const ballsRef = useRef<BallState[]>(createBalls(boardRadius, ballCount))
  const trapsRef = useRef<TrapState[]>([])
  const ballElsRef = useRef<(HTMLDivElement | null)[]>([])
  const rafRef = useRef<number | null>(null)
  const wonRef = useRef(false)
  const doneRef = useRef(false)
  const capturedRef = useRef(0)
  const detachSensorsRef = useRef<(() => void) | null>(null)
  const sensorPollRef = useRef<number | null>(null)
  const startingRef = useRef(false)

  const stopLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const detachSensors = useCallback(() => {
    detachSensorsRef.current?.()
    detachSensorsRef.current = null
    if (sensorPollRef.current != null) {
      window.clearInterval(sensorPollRef.current)
      sensorPollRef.current = null
    }
  }, [])

  const resetBall = useCallback((ball: BallState) => {
    ball.x = ball.startX
    ball.y = ball.startY
    ball.vx = 0
    ball.vy = 0
  }, [])

  const captureBall = useCallback((ball: BallState, index: number) => {
    ball.captured = true
    ball.vx = 0
    ball.vy = 0
    const slotAngle = (index * (Math.PI * 2)) / ballCount
    ball.x = Math.cos(slotAngle) * 10
    ball.y = Math.sin(slotAngle) * 10
    capturedRef.current += 1
    capturedCountRef.current = capturedRef.current
    if (capturedCountElRef.current) {
      capturedCountElRef.current.textContent = String(capturedCountRef.current)
    }
  }, [ballCount])

  const triggerWin = useCallback(() => {
    if (wonRef.current) return
    wonRef.current = true
    stopLoop()
    setPhase('burst')
    window.setTimeout(() => setPhase('win'), 900)
  }, [stopLoop])

  const tick = useCallback(() => {
    const { ax, ay } = tiltRef.current
    const balls = ballsRef.current
    const traps = trapsRef.current
    const maxDist = boardRadius

    for (let i = 0; i < balls.length; i++) {
      const ball = balls[i]
      if (ball.captured) {
        const el = ballElsRef.current[i]
        if (el) {
          el.style.transform = `translate3d(${ball.x}px, ${ball.y}px, 0)`
          el.classList.add('wind-balance-ball--captured')
        }
        continue
      }

      ball.vx += ax * ACC_SCALE
      ball.vy += ay * ACC_SCALE
      ball.vx *= FRICTION
      ball.vy *= FRICTION
      ball.x += ball.vx
      ball.y += ball.vy

      const d = dist(ball.x, ball.y, 0, 0)
      if (d > maxDist) {
        const nx = ball.x / d
        const ny = ball.y / d
        ball.x = nx * maxDist
        ball.y = ny * maxDist
        const dot = ball.vx * nx + ball.vy * ny
        ball.vx = (ball.vx - 2 * dot * nx) * RESTITUTION
        ball.vy = (ball.vy - 2 * dot * ny) * RESTITUTION
      }

      for (const trap of traps) {
        if (dist(ball.x, ball.y, trap.x, trap.y) < TRAP_R + BALL_R) {
          resetBall(ball)
          if (typeof navigator.vibrate === 'function') {
            navigator.vibrate(120)
          }
          break
        }
      }

      if (!ball.captured && dist(ball.x, ball.y, 0, 0) < CAPTURE_DIST) {
        captureBall(ball, i)
      }

      const el = ballElsRef.current[i]
      if (el) {
        el.style.transform = `translate3d(${ball.x}px, ${ball.y}px, 0)`
      }
    }

    if (capturedRef.current >= ballCount) {
      triggerWin()
      return
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [ballCount, boardRadius, captureBall, resetBall, triggerWin])

  const startSensorPolling = useCallback(() => {
    if (sensorPollRef.current != null) {
      window.clearInterval(sensorPollRef.current)
    }
    sensorPollRef.current = window.setInterval(() => {
      const live = tiltRef.current.active && Date.now() - tiltRef.current.lastAt < 600
      setSensorLive(live)
    }, 400)
  }, [])

  const startGameLoop = useCallback(() => {
    stopLoop()
    rafRef.current = requestAnimationFrame(tick)
  }, [stopLoop, tick])

  const initRound = useCallback(() => {
    const balls = createBalls(boardRadius, ballCount)
    ballsRef.current = balls
    trapsRef.current = generateTraps(trapCount, boardRadius, balls)
    capturedRef.current = 0
    wonRef.current = false
    capturedCountRef.current = 0
    if (capturedCountElRef.current) capturedCountElRef.current.textContent = '0'
    setDisplayTraps([...trapsRef.current])
    setRoundKey((k) => k + 1)
    // 仅归零倾斜读数；勿替换对象或清空 active/lastAt（监听器仍绑定原引用）
    tiltRef.current.ax = 0
    tiltRef.current.ay = 0
  }, [ballCount, boardRadius, trapCount])

  const beginPlaying = useCallback(() => {
    initRound()
    setPhase('playing')
    startSensorPolling()
    startGameLoop()
  }, [initRound, startGameLoop, startSensorPolling])

  const sensorFailureHint = useCallback(() => {
    if (platform === 'android') {
      return [
        '未检测到重力数据。安卓请确认：',
        '① 使用 Chrome 浏览器打开（微信内置浏览器常不可用）',
        '② 地址为 https:// 或局域网 IP（非 localhost）',
        '③ 设置 → 网站设置 → 运动传感器 → 允许',
        '④ 关闭省电模式后重试',
      ].join('\n')
    }
    return IOS_PERMISSION_BLOCKED_HINT
  }, [platform])

  const attachSensors = useCallback(() => {
    detachSensors()
    resetTiltSample(tiltRef.current)
    detachSensorsRef.current = attachTiltListeners(tiltRef.current)
  }, [detachSensors])

  const waitForSensorsAndPlay = useCallback(
    async (timeoutMs = platform === 'ios' ? 4000 : 2500) => {
      const gotSignal = await waitForSensorSignal(tiltRef.current, timeoutMs)
      if (!gotSignal) {
        detachSensors()
        setPermError(sensorFailureHint())
        return false
      }

      beginPlaying()
      setPermError(null)
      return true
    },
    [beginPlaying, detachSensors, platform, sensorFailureHint],
  )

  const probeSensorsAfterPermission = useCallback(
    async (timeoutMs = 1800) => {
      attachSensors()
      return waitForSensorSignal(tiltRef.current, timeoutMs)
    },
    [attachSensors],
  )

  const finishPermissionFlow = useCallback(() => {
    startingRef.current = false
    setStarting(false)
  }, [])

  /** 授权通过后：挂载传感器并进入游戏 */
  const startGame = useCallback(async () => {
    if (!hasMotionApi() && !hasOrientationApi()) {
      setPermError('当前浏览器不支持重力/方向传感器')
      return
    }

    if (!isSecureContext() && platform === 'android') {
      setPermError(
        '当前为 HTTP 连接。安卓 Chrome 会禁用重力传感器，请改用 https:// 局域网地址。',
      )
    }

    startingRef.current = true
    setPermError(null)
    setStarting(true)

    try {
      attachSensors()
      await waitForSensorsAndPlay()
    } finally {
      finishPermissionFlow()
    }
  }, [attachSensors, finishPermissionFlow, platform, waitForSensorsAndPlay])

  /** React onClick 同步触发 iOS requestPermission */
  const handleAuth = useCallback(() => {
    if (startingRef.current) return

    if (typeof DeviceOrientationEvent === 'undefined') {
      setPermError('当前设备或环境不支持陀螺仪 API')
      return
    }

    const DOE = DeviceOrientationEvent as DeviceOrientationEventWithPermission

    if (typeof DOE.requestPermission === 'function') {
      if (!isSecureContext()) {
        setPermError(IOS_REQUIRE_HTTPS_HINT)
        return
      }

      startingRef.current = true
      setPermError(null)
      setStarting(true)

      DOE.requestPermission()
        .then(async (permissionState) => {
          if (permissionState === 'granted') {
            await startGame()
            return
          }

          setPermError('正在检测传感器…请轻微倾斜手机')
          const probed = await probeSensorsAfterPermission(4000)
          if (probed) {
            await waitForSensorsAndPlay(3500)
            return
          }

          setPermError(IOS_PERMISSION_BLOCKED_HINT)
        })
        .catch(() => {
          setPermError(IOS_PERMISSION_BLOCKED_HINT)
        })
        .finally(finishPermissionFlow)
      return
    }

    void startGame()
  }, [
    finishPermissionFlow,
    probeSensorsAfterPermission,
    startGame,
    waitForSensorsAndPlay,
  ])

  /** 不请求权限，仅探测传感器（无痕模式/换浏览器后重试） */
  const runSensorProbeOnly = useCallback(() => {
    if (startingRef.current) return
    startingRef.current = true
    setPermError('正在检测传感器…请轻微倾斜手机')
    setStarting(true)

    void probeSensorsAfterPermission(4000)
      .then(async (probed) => {
        if (probed) {
          await waitForSensorsAndPlay(3500)
          return
        }
        setPermError(IOS_PERMISSION_BLOCKED_HINT)
      })
      .finally(finishPermissionFlow)
  }, [finishPermissionFlow, probeSensorsAfterPermission, waitForSensorsAndPlay])

  const finishQuest = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    stopLoop()
    detachSensors()
    setPhase('completed')
    onComplete?.()
  }, [detachSensors, onComplete, stopLoop])

  useEffect(() => {
    return () => {
      stopLoop()
      detachSensors()
    }
  }, [detachSensors, stopLoop])

  const startButtonLabel = useMemo(() => {
    if (starting) return '正在连接传感器…'
    if (iosPermission) return '点击授权罗盘感知'
    return '点击开始 · 启用重力感应'
  }, [iosPermission, starting])

  const permissionHint = useMemo(() => {
    if (platform === 'android') {
      return '安卓不会弹出 iOS 式权限窗。点击开始后，请用 Chrome 打开本页，并在系统设置中允许「运动传感器」。倾斜手机即可驱动光球。'
    }
    if (iosPermission) {
      return '倾斜手机，引导风灵光球滚入阵眼。iOS 会弹出「动作与方向」授权，请务必点允许。'
    }
    return '倾斜手机，引导风灵光球滚入阵眼锁灵槽。'
  }, [iosPermission, platform])

  return (
    <div
      className="interactive-area wind-balance relative mx-auto flex w-full max-w-[min(100%,22rem)] flex-col overflow-hidden rounded-xl border border-cyan-400/25 bg-void-950"
      style={{ minHeight: 'min(72dvh, 640px)' }}
    >
      <div
        className="wind-balance-bg absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-void-950/70 via-sky-950/40 to-void-950/85" />

      {phase === 'playing' && (
        <div className="relative z-20 space-y-2 px-4 pt-3">
          <div className="rounded-xl border border-white/12 bg-black/50 px-3 py-2 text-center backdrop-blur-sm">
            <p className="text-[10px] tracking-widest text-cyan-200/80">御风引气 · 重力平衡盘</p>
            <p className="mt-1 text-xs text-mist">
              已锁灵{' '}
              <span ref={capturedCountElRef} className="font-semibold text-cyan-200">
                0
              </span>{' '}
              /{' '}
              {ballCount}
            </p>
          </div>
          <p
            className={`text-center text-[10px] ${
              sensorLive ? 'text-emerald-300/90' : 'text-amber-200/90'
            }`}
          >
            {sensorLive ? '● 重力感应已连接' : '○ 未检测到传感器，请检查浏览器权限'}
          </p>
        </div>
      )}

      <div className="relative z-20 flex flex-1 flex-col items-center justify-center px-4 py-6">
        {phase === 'permission' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full max-w-xs flex-col items-center gap-3 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-cyan-400/35 bg-cyan-950/45">
              <Compass className="h-8 w-8 text-cyan-200" />
            </div>
            <p className="text-sm leading-relaxed text-mist">{permissionHint}</p>

            {!isSecureContext() && (
              <p className="whitespace-pre-line rounded-lg border border-red-400/40 bg-red-950/40 px-3 py-2 text-left text-[11px] leading-relaxed text-red-100/95">
                {platform === 'ios' ? IOS_REQUIRE_HTTPS_HINT : '当前非 HTTPS。安卓 Chrome 也需 https:// 才能读取重力传感器。'}
              </p>
            )}

            <button
              type="button"
              onClick={handleAuth}
              disabled={starting}
              className="w-full rounded-2xl border border-cyan-300/40 bg-cyan-950/55 px-5 py-4 text-sm font-medium text-cyan-100 backdrop-blur-md disabled:opacity-60"
            >
              {iosPermission ? '点击授权罗盘感知' : startButtonLabel}
            </button>

            {permError && (
              <p className="whitespace-pre-line text-left text-[11px] leading-relaxed text-amber-200/90">
                {permError}
              </p>
            )}

            {iosPermission && (
              <button
                type="button"
                onClick={runSensorProbeOnly}
                disabled={starting}
                className="text-[10px] text-cyan-200/80 underline disabled:opacity-50"
              >
                灵能仍无响应？重新检测
              </button>
            )}
          </motion.div>
        )}

        {(phase === 'playing' || phase === 'burst') && (
          <div
            className={`wind-balance-board relative rounded-full border-4 border-amber-700/70 bg-black/35 shadow-[inset_0_0_40px_rgba(0,0,0,0.5),0_0_24px_rgba(180,83,9,0.2)] backdrop-blur-sm ${
              phase === 'burst' ? 'wind-balance-board--burst' : ''
            }`}
            style={{ width: boardSize, height: boardSize }}
          >
            <div
              className={`wind-balance-target absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-300/60 bg-cyan-400/25 shadow-[0_0_20px_rgba(34,211,238,0.55)] ${
                phase === 'burst' ? 'wind-balance-target--burst' : ''
              }`}
              style={{
                width: WIND_BALANCE_TARGET_RADIUS * 2,
                height: WIND_BALANCE_TARGET_RADIUS * 2,
              }}
            />

            {displayTraps.map((trap, i) => (
              <div
                key={`trap-${roundKey}-${i}`}
                className="wind-balance-trap absolute rounded-full"
                style={{
                  width: TRAP_R * 2,
                  height: TRAP_R * 2,
                  left: `calc(50% + ${trap.x}px - ${TRAP_R}px)`,
                  top: `calc(50% + ${trap.y}px - ${TRAP_R}px)`,
                }}
              />
            ))}

            {ballsRef.current.map((ball, i) => (
              <div
                key={`ball-${roundKey}-${i}`}
                ref={(el) => {
                  ballElsRef.current[i] = el
                }}
                className="wind-balance-ball absolute left-1/2 top-1/2"
                style={{
                  width: BALL_R * 2,
                  height: BALL_R * 2,
                  marginLeft: -BALL_R,
                  marginTop: -BALL_R,
                  transform: `translate3d(${ball.x}px, ${ball.y}px, 0)`,
                }}
              />
            ))}
          </div>
        )}

        {phase === 'playing' && !sensorLive && (
          <button
            type="button"
            onClick={() => {
              detachSensors()
              setPhase('permission')
              setPermError(null)
            }}
            className="mt-3 inline-flex items-center gap-1 text-[10px] text-cyan-200/80 underline"
          >
            <RefreshCw className="h-3 w-3" />
            传感器无响应？返回重新连接
          </button>
        )}

        {phase === 'playing' && (
          <p className="mt-3 text-center text-[10px] leading-relaxed text-mist-faint">
            倾斜手机控制重力 · 避开红色乱流 · 将光球送入中央锁灵槽
          </p>
        )}
      </div>

      <AnimatePresence>
        {phase === 'burst' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="wind-balance-victory-burst pointer-events-none absolute inset-0 z-40"
          />
        )}
      </AnimatePresence>

      <ModalOverlay open={phase === 'win'}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="w-full rounded-2xl border border-cyan-400/45 bg-void-900/96 p-5 shadow-[0_0_56px_rgba(34,211,238,0.28)]"
        >
          <div className="mb-4 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-cyan-300/45 bg-cyan-950/50">
              <Wind className="h-7 w-7 text-cyan-300" />
            </div>
            <p className="text-base font-medium leading-relaxed text-cyan-100">
              御风法阵激活！云海之门已开，请登云踏雾继续寻灵
            </p>
          </div>
          <button
            type="button"
            onClick={() => finishQuest()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600/85 to-teal-600/85 py-3.5 text-sm font-medium text-white ring-1 ring-cyan-300/35"
          >
            <Sparkles className="h-4 w-4" />
            登云踏雾
          </button>
        </motion.div>
      </ModalOverlay>
    </div>
  )
}

export default WindBalanceGame
