import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { getSpiritByName } from '../../config/spiritCatalog'
import { ModalOverlay } from '../ui/ModalOverlay'

const LANE_COUNT = 4
const GAME_DURATION_SEC = 60
const MAX_HP = 100
const MISS_HP_COST = 15
const GOOD_HP_HEAL = 2
const PERFECT_HP_HEAL = 5
const NOTE_SPEED = 220
const PERFECT_PX = 30
const GOOD_PX = 60
const SPAWN_INTERVAL_MS = 520
const NOTE_SIZE = 28

type Judgment = 'perfect' | 'good' | 'miss'
type GameStatus = 'idle' | 'playing' | 'won' | 'lost'
type DropTone = 'tap' | 'perfect' | 'good' | 'miss'

/** 预留：正式 BGM 资源路径 */
const ABYSS_BGM_SRC = '/assets/audio/abyss_bgm.mp3'
/** 接入实体 BGM 后改为 true */
const USE_REAL_BGM = false

interface Note {
  id: number
  lane: number
  y: number
}

interface FloatLabel {
  id: number
  lane: number
  text: string
  tone: Judgment
  born: number
}

interface GameWorld {
  w: number
  h: number
  hitLineY: number
  notes: Note[]
  labels: FloatLabel[]
  elapsed: number
  score: number
  combo: number
  maxCombo: number
  hp: number
  status: GameStatus
  lastFrame: number
  nextNoteId: number
  nextLabelId: number
  spawnTimer: number
  onWin?: () => void
  onLose?: () => void
  winFired: boolean
  loseFired: boolean
}

export interface AbyssRhythmGameProps {
  spiritName?: string
  surviveSeconds?: number
  /** @deprecated 胜利条件已改为倒计时结束且 HP > 0 */
  targetScore?: number
  onComplete?: () => void
}

/** 四轨中心线：lane 0→12.5%, 1→37.5%, 2→62.5%, 3→87.5% */
function laneLeftPercent(lane: number): number {
  return lane * 25 + 12.5
}

function laneCenterX(lane: number, arenaWidth: number): number {
  return (arenaWidth * laneLeftPercent(lane)) / 100
}

function initWorld(
  w: number,
  h: number,
  props: { onWin?: () => void; onLose?: () => void; status?: GameStatus },
): GameWorld {
  return {
    w,
    h,
    hitLineY: h * 0.82,
    notes: [],
    labels: [],
    elapsed: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    hp: MAX_HP,
    status: props.status ?? 'idle',
    lastFrame: performance.now(),
    nextNoteId: 1,
    nextLabelId: 1,
    spawnTimer: 0,
    onWin: props.onWin,
    onLose: props.onLose,
    winFired: false,
    loseFired: false,
  }
}

function healHp(world: GameWorld, amount: number) {
  world.hp = Math.min(MAX_HP, world.hp + amount)
}

function triggerLose(world: GameWorld) {
  if (world.status !== 'playing' || world.loseFired) return
  world.status = 'lost'
  world.loseFired = true
  world.notes = []
  world.onLose?.()
}

function registerMiss(world: GameWorld, lane: number, now: number) {
  world.combo = 0
  world.hp = Math.max(0, world.hp - MISS_HP_COST)
  addLabel(world, lane, 'Miss', 'miss', now)
  if (world.hp <= 0) triggerLose(world)
}

function spawnNote(world: GameWorld) {
  const lane = Math.floor(Math.random() * LANE_COUNT)
  world.notes.push({
    id: world.nextNoteId++,
    lane,
    y: -NOTE_SIZE,
  })
}

function addLabel(world: GameWorld, lane: number, text: string, tone: Judgment, now: number) {
  world.labels.push({
    id: world.nextLabelId++,
    lane,
    text,
    tone,
    born: now,
  })
}

function laneFromClientX(clientX: number, arenaRect: DOMRect): number {
  const relativeX = clientX - arenaRect.left
  const laneWidth = arenaRect.width / LANE_COUNT
  return clamp(Math.floor(relativeX / laneWidth), 0, LANE_COUNT - 1)
}

/** 单轨内最靠近判定线（y 最大）的可击中音符 */
function findBottomHittableNote(
  world: GameWorld,
  lane: number,
): { note: Note; judgment: Judgment } | null {
  let best: { note: Note; judgment: Judgment } | null = null
  for (const note of world.notes) {
    if (note.lane !== lane) continue
    const judgment = judgeNote(world, note)
    if (judgment === 'miss') continue
    if (!best || note.y > best.note.y) {
      best = { note, judgment }
    }
  }
  return best
}

function processLaneHits(
  world: GameWorld,
  lanes: number[],
  now: number,
  onSound?: (tone: DropTone) => void,
): void {
  if (world.status !== 'playing' || lanes.length === 0) return

  const hitIds = new Set<number>()
  const outcomes: Array<
    | { kind: 'hit'; lane: number; noteId: number; judgment: Judgment }
    | { kind: 'miss'; lane: number }
  > = []

  for (const lane of lanes) {
    const best = findBottomHittableNote(world, lane)
    if (best && !hitIds.has(best.note.id)) {
      hitIds.add(best.note.id)
      outcomes.push({
        kind: 'hit',
        lane,
        noteId: best.note.id,
        judgment: best.judgment,
      })
    } else {
      outcomes.push({ kind: 'miss', lane })
    }
  }

  if (hitIds.size > 0) {
    world.notes = world.notes.filter((n) => !hitIds.has(n.id))
  }

  for (const outcome of outcomes) {
    if (world.status !== 'playing') break
    if (outcome.kind === 'hit') {
      applyJudgment(world, outcome.judgment, outcome.lane, now)
      onSound?.(outcome.judgment === 'perfect' ? 'perfect' : 'good')
    } else {
      registerMiss(world, outcome.lane, now)
      onSound?.('miss')
    }
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function judgeNote(world: GameWorld, note: Note): Judgment {
  const noteCenter = note.y + NOTE_SIZE / 2
  const delta = Math.abs(noteCenter - world.hitLineY)
  if (delta <= PERFECT_PX) return 'perfect'
  if (delta <= GOOD_PX) return 'good'
  return 'miss'
}

function applyJudgment(world: GameWorld, judgment: Judgment, lane: number, now: number) {
  if (judgment === 'perfect') {
    world.score += 100 + world.combo * 2
    world.combo += 1
    world.maxCombo = Math.max(world.maxCombo, world.combo)
    healHp(world, PERFECT_HP_HEAL)
    addLabel(world, lane, 'Perfect', 'perfect', now)
  } else if (judgment === 'good') {
    world.score += 50
    world.combo += 1
    world.maxCombo = Math.max(world.maxCombo, world.combo)
    healHp(world, GOOD_HP_HEAL)
    addLabel(world, lane, 'Good', 'good', now)
  } else {
    registerMiss(world, lane, now)
  }
}

function stepWorld(world: GameWorld, dt: number, now: number, surviveSeconds: number) {
  if (world.status !== 'playing') return

  world.elapsed += dt
  world.spawnTimer += dt * 1000
  const density = 1 + Math.min(0.6, world.elapsed / surviveSeconds)
  const interval = SPAWN_INTERVAL_MS / density

  while (world.spawnTimer >= interval) {
    world.spawnTimer -= interval
    spawnNote(world)
    if (Math.random() < 0.28) spawnNote(world)
  }

  const speed = NOTE_SPEED * (1 + (world.elapsed / surviveSeconds) * 0.35)
  for (const note of world.notes) {
    note.y += speed * dt
  }

  const missY = world.hitLineY + GOOD_PX + NOTE_SIZE
  const remaining: Note[] = []
  for (const note of world.notes) {
    if (note.y > missY) {
      registerMiss(world, note.lane, now)
      if (world.status !== 'playing') break
    } else {
      remaining.push(note)
    }
  }
  world.notes = remaining

  world.labels = world.labels.filter((l) => now - l.born < 700)

  if (world.status !== 'playing') return

  if (world.elapsed >= surviveSeconds && world.hp > 0) {
    world.status = 'won'
    world.notes = []
    if (!world.winFired) {
      world.winFired = true
      world.onWin?.()
    }
  }
}

function hpBarColor(ratio: number): string {
  if (ratio > 0.55) {
    return 'linear-gradient(90deg, #34d399, #5eead4)'
  }
  if (ratio > 0.3) {
    return 'linear-gradient(90deg, #fbbf24, #f97316)'
  }
  return 'linear-gradient(90deg, #f87171, #dc2626)'
}

function syncHud(
  world: GameWorld,
  refs: {
    time?: HTMLSpanElement | null
    score?: HTMLSpanElement | null
    combo?: HTMLSpanElement | null
    hpFill?: HTMLDivElement | null
    hpText?: HTMLSpanElement | null
  },
  surviveSeconds: number,
) {
  if (refs.time) {
    refs.time.textContent = `${Math.max(0, Math.ceil(surviveSeconds - world.elapsed))}s`
  }
  if (refs.score) refs.score.textContent = String(world.score)
  if (refs.combo) refs.combo.textContent = `×${world.combo}`
  const hpRatio = world.hp / MAX_HP
  if (refs.hpFill) {
    refs.hpFill.style.width = `${hpRatio * 100}%`
    refs.hpFill.style.background = hpBarColor(hpRatio)
  }
  if (refs.hpText) refs.hpText.textContent = `${Math.max(0, Math.ceil(world.hp))}`
}

function syncVisuals(
  world: GameWorld,
  notesLayer: HTMLDivElement | null,
  labelsLayer: HTMLDivElement | null,
  notePool: Map<number, HTMLDivElement>,
) {
  if (!notesLayer) return

  const activeIds = new Set(world.notes.map((n) => n.id))

  for (const [id, el] of notePool) {
    if (!activeIds.has(id)) {
      el.remove()
      notePool.delete(id)
    }
  }

  for (const note of world.notes) {
    let el = notePool.get(note.id)
    if (!el) {
      el = document.createElement('div')
      el.className = 'abyss-note pointer-events-none absolute z-[3]'
      el.style.width = `${NOTE_SIZE}px`
      el.style.height = `${NOTE_SIZE}px`
      notesLayer.appendChild(el)
      notePool.set(note.id, el)
    }
    const cx = laneCenterX(note.lane, world.w)
    el.style.transform = `translate3d(${cx}px, ${note.y}px, 0) translateX(-50%)`
  }

  if (!labelsLayer) return
  labelsLayer.innerHTML = ''
  const now = performance.now()
  for (const label of world.labels) {
    const el = document.createElement('div')
    const toneCls =
      label.tone === 'perfect'
        ? 'text-spirit'
        : label.tone === 'good'
          ? 'text-sky-bright'
          : 'text-red-300/90'
    el.className = `abyss-judgment ${toneCls}`
    const cx = laneCenterX(label.lane, world.w)
    const labelY = world.hitLineY - 36
    el.style.transform = `translate3d(${cx}px, ${labelY}px, 0) translateX(-50%)`
    el.style.opacity = String(1 - (now - label.born) / 700)
    el.textContent = label.text
    labelsLayer.appendChild(el)
  }
}

/**
 * 深渊太鼓 — 4 轨下落式节奏音游（rAF + transform，主循环无 setState）
 */
export function AbyssRhythmGame({
  spiritName = '峡谷水灵',
  surviveSeconds = GAME_DURATION_SEC,
  onComplete,
}: AbyssRhythmGameProps) {
  const arenaRef = useRef<HTMLDivElement>(null)
  const notesLayerRef = useRef<HTMLDivElement>(null)
  const labelsLayerRef = useRef<HTMLDivElement>(null)
  const notePoolRef = useRef(new Map<number, HTMLDivElement>())
  const worldRef = useRef<GameWorld | null>(null)
  const rafRef = useRef(0)
  const hudRefs = useRef<{
    time: HTMLSpanElement | null
    score: HTMLSpanElement | null
    combo: HTMLSpanElement | null
    hpFill: HTMLDivElement | null
    hpText: HTMLSpanElement | null
  }>({
    time: null,
    score: null,
    combo: null,
    hpFill: null,
    hpText: null,
  })
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const gameStartedRef = useRef(false)

  const [showVictory, setShowVictory] = useState(false)
  const [showGameOver, setShowGameOver] = useState(false)
  const [finalScore, setFinalScore] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)
  const spiritEntry = getSpiritByName(spiritName)

  const clearNotePool = useCallback(() => {
    for (const el of notePoolRef.current.values()) el.remove()
    notePoolRef.current.clear()
  }, [])

  const initAudio = useCallback(async () => {
    if (!audioCtxRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (Ctx) audioCtxRef.current = new Ctx()
    }
    if (audioCtxRef.current?.state === 'suspended') {
      await audioCtxRef.current.resume()
    }
  }, [])

  const playWaterDropSound = useCallback((tone: DropTone = 'tap') => {
    const ctx = audioCtxRef.current
    if (!ctx) return

    const startFreq = tone === 'perfect' ? 920 : tone === 'good' ? 860 : 800
    const endFreq = tone === 'perfect' ? 1450 : tone === 'good' ? 1320 : 1200
    const peakGain = tone === 'perfect' ? 0.68 : tone === 'good' ? 0.58 : tone === 'miss' ? 0.32 : 0.5
    const duration = tone === 'perfect' ? 0.12 : 0.1

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const t = ctx.currentTime

    osc.type = 'sine'
    osc.frequency.setValueAtTime(startFreq, t)
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.05)

    gain.gain.setValueAtTime(peakGain, t)
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + duration)
  }, [])

  /** 预留：真实 BGM 播放（资源就绪后启用） */
  const playBgm = useCallback(async () => {
    const el = audioRef.current
    if (!el) return
    try {
      el.currentTime = 0
      await el.play()
    } catch {
      // 真机未解锁或文件缺失时静默降级为合成音效
    }
  }, [])

  const initGame = useCallback(
    (w: number, h: number, preserve?: GameWorld | null) => {
      const status: GameStatus =
        preserve?.status === 'playing'
          ? preserve.status
          : gameStartedRef.current
            ? 'playing'
            : 'idle'

      worldRef.current = initWorld(w, h, {
        onWin: () => {
          setFinalScore(worldRef.current?.score ?? 0)
          setShowVictory(true)
        },
        onLose: () => setShowGameOver(true),
        status,
      })

      if (preserve && preserve.status === 'playing') {
        const next = worldRef.current
        next.elapsed = preserve.elapsed
        next.score = preserve.score
        next.combo = preserve.combo
        next.maxCombo = preserve.maxCombo
        next.hp = preserve.hp
        next.notes = preserve.notes
        next.labels = preserve.labels
        next.spawnTimer = preserve.spawnTimer
      }

      syncHud(worldRef.current, hudRefs.current, surviveSeconds)
    },
    [surviveSeconds],
  )

  const measureArena = useCallback(() => {
    const arena = arenaRef.current
    if (!arena) return
    const rect = arena.getBoundingClientRect()
    initGame(Math.max(260, rect.width), Math.max(360, rect.height), worldRef.current)
  }, [initGame])

  const beginPlaying = useCallback(() => {
    clearNotePool()
    setShowGameOver(false)
    setShowVictory(false)

    const world = worldRef.current
    if (world) {
      world.status = 'playing'
      world.hp = MAX_HP
      world.score = 0
      world.combo = 0
      world.maxCombo = 0
      world.elapsed = 0
      world.notes = []
      world.labels = []
      world.spawnTimer = 0
      world.winFired = false
      world.loseFired = false
      world.lastFrame = performance.now()
      syncHud(world, hudRefs.current, surviveSeconds)
    }
  }, [clearNotePool, surviveSeconds])

  const startPerformance = useCallback(async () => {
    await initAudio()
    if (USE_REAL_BGM) await playBgm()
    gameStartedRef.current = true
    setGameStarted(true)
    beginPlaying()
  }, [initAudio, beginPlaying])

  const retryPerformance = useCallback(async () => {
    await initAudio()
    beginPlaying()
  }, [initAudio, beginPlaying])

  useEffect(() => {
    measureArena()
    const arena = arenaRef.current
    if (!arena) return
    const ro = new ResizeObserver(measureArena)
    ro.observe(arena)
    return () => ro.disconnect()
  }, [measureArena])

  useEffect(() => {
    let hudTick = 0
    const loop = (now: number) => {
      const world = worldRef.current
      if (world) {
        const dt = Math.min((now - world.lastFrame) / 1000, 0.05)
        world.lastFrame = now
        stepWorld(world, dt, now, surviveSeconds)
        syncVisuals(world, notesLayerRef.current, labelsLayerRef.current, notePoolRef.current)
        hudTick += dt
        if (hudTick >= 0.08 || world.status !== 'playing') {
          hudTick = 0
          syncHud(world, hudRefs.current, surviveSeconds)
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [surviveSeconds])

  const handleLaneTap = useCallback(
    (lane: number) => {
      const world = worldRef.current
      if (!world || world.status !== 'playing') return
      processLaneHits(world, [lane], performance.now(), playWaterDropSound)
    },
    [playWaterDropSound],
  )

  const handleMultiTouchStart = useCallback(
    (e: TouchEvent) => {
      const world = worldRef.current
      const arena = arenaRef.current
      if (!world || world.status !== 'playing' || !arena) return

      e.preventDefault()
      void initAudio()

      const rect = arena.getBoundingClientRect()
      const lanes: number[] = []
      const seen = new Set<number>()

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]!
        const lane = laneFromClientX(touch.clientX, rect)
        if (seen.has(lane)) continue
        seen.add(lane)
        lanes.push(lane)
      }

      if (lanes.length === 0) return
      processLaneHits(world, lanes, performance.now(), playWaterDropSound)
    },
    [initAudio, playWaterDropSound],
  )

  useEffect(() => {
    const arena = arenaRef.current
    if (!arena) return

    const onTouchStart = (e: TouchEvent) => handleMultiTouchStart(e)

    arena.addEventListener('touchstart', onTouchStart, { passive: false })
    return () => arena.removeEventListener('touchstart', onTouchStart)
  }, [handleMultiTouchStart])

  const onPoolPointerDown = useCallback(
    (lane: number, e: ReactPointerEvent<HTMLButtonElement>) => {
      if (e.pointerType === 'touch') return
      e.preventDefault()
      e.stopPropagation()
      void initAudio()
      handleLaneTap(lane)
    },
    [initAudio, handleLaneTap],
  )

  return (
    <div className="interactive-area w-full select-none">
      <audio ref={audioRef} src={ABYSS_BGM_SRC} preload="auto" loop className="hidden" />

      <p className="mb-3 text-center text-xs leading-relaxed text-mist-muted">
        四轨水潭共鸣 · 水滴落入判定圈时点击
        <br />
        坚持 {surviveSeconds} 秒且灵力护盾未破即可通关 · Miss 扣 15 HP
      </p>

      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
        <div className="rounded-full border border-sky-muted/30 bg-void-800/60 px-3 py-1 text-sky-bright">
          <span className="text-[10px] text-mist-muted">剩余 </span>
          <span ref={(el) => { hudRefs.current.time = el }} className="font-medium tabular-nums">
            {surviveSeconds}s
          </span>
        </div>
        <div className="rounded-full border border-spirit/30 bg-void-800/60 px-3 py-1 text-spirit">
          <span className="text-[10px] text-mist-muted">连击 </span>
          <span ref={(el) => { hudRefs.current.combo = el }} className="font-medium tabular-nums">
            ×0
          </span>
        </div>
        <div className="rounded-full border border-sky-muted/35 bg-void-800/60 px-3 py-1 text-sky-bright">
          <span className="text-[10px] text-mist-muted">积分 </span>
          <span ref={(el) => { hudRefs.current.score = el }} className="font-medium tabular-nums">
            0
          </span>
        </div>
      </div>

      <div className="mb-3 mx-auto w-full max-w-[min(100%,20rem)]">
        <div className="mb-1 flex items-center justify-between text-[10px]">
          <span className="text-mist-muted">灵力护盾</span>
          <span className="tabular-nums text-spirit">
            <span ref={(el) => { hudRefs.current.hpText = el }}>{MAX_HP}</span>
            <span className="text-mist-faint"> / {MAX_HP}</span>
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full border border-void-600/80 bg-void-800/80">
          <div
            ref={(el) => { hudRefs.current.hpFill = el }}
            className="h-full rounded-full transition-[width,background] duration-150"
            style={{ width: '100%', background: hpBarColor(1) }}
          />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[min(100%,20rem)]">
        <div
          ref={arenaRef}
          className="abyss-rhythm-arena relative aspect-[9/16] w-full overflow-hidden rounded-xl border border-sky-muted/25 touch-none"
          style={{ maxHeight: 'min(72dvh, 36rem)', userSelect: 'none', WebkitUserSelect: 'none' }}
        >
          <div className="abyss-lanes-grid absolute inset-0 z-[1] grid grid-cols-4" aria-hidden>
            {Array.from({ length: LANE_COUNT }, (_, i) => (
              <div
                key={i}
                className={`abyss-lane-strip h-full w-full${i % 2 === 1 ? ' abyss-lane-strip--alt' : ''}`}
              />
            ))}
          </div>
          <div ref={notesLayerRef} className="pointer-events-none absolute inset-0 z-[2]" />
          <div ref={labelsLayerRef} className="pointer-events-none absolute inset-0 z-[4]" />

          {gameStarted && !showGameOver && (
            <div className="abyss-pools-grid absolute inset-x-0 bottom-[12%] z-[5] grid grid-cols-4">
              {Array.from({ length: LANE_COUNT }, (_, lane) => (
                <button
                  key={lane}
                  type="button"
                  aria-label={`水潭轨道 ${lane + 1}`}
                  className="abyss-hit-pool abyss-hit-pool--interactive touch-manipulation"
                  onPointerDown={(e) => onPoolPointerDown(lane, e)}
                />
              ))}
            </div>
          )}

          {!gameStarted && (
            <div className="absolute inset-0 z-[20] flex flex-col items-center justify-center bg-void-950/55 px-6 backdrop-blur-[2px]">
              <p className="mb-1 text-[10px] tracking-[0.35em] text-sky-bright/80">深渊太鼓</p>
              <p className="mb-5 max-w-[14rem] text-center text-xs leading-relaxed text-mist-muted">
                点击开始后解锁音频与下落节拍，在四轨水潭上随水滴节奏演奏。
              </p>
              <button
                type="button"
                onClick={() => void startPerformance()}
                className="rounded-xl bg-gradient-to-r from-sky-muted to-sky-bright px-8 py-3 text-sm font-semibold text-void-950 shadow-[0_0_24px_rgba(56,189,248,0.35)] active:scale-[0.98]"
              >
                开始演奏
              </button>
            </div>
          )}
        </div>
      </div>

      <ModalOverlay open={showGameOver}>
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="w-full overflow-hidden rounded-2xl border border-red-400/35 bg-gradient-to-b from-void-800/95 to-void-950/98 shadow-[0_0_48px_rgba(248,113,113,0.15)]"
        >
          <div className="border-b border-red-400/20 bg-red-950/30 px-4 py-3 text-center">
            <h2 className="text-lg font-medium text-red-200">灵力护盾破裂</h2>
          </div>
          <div className="flex flex-col items-center px-5 py-6">
            <p className="mb-6 text-center text-sm leading-relaxed text-mist-muted">
              灵力护盾破裂，被狂暴水流吞噬…
            </p>
            <button
              type="button"
              onClick={() => void retryPerformance()}
              className="w-full rounded-xl bg-gradient-to-r from-red-400/80 to-red-500 py-3.5 text-sm font-semibold text-void-950 active:scale-[0.98]"
            >
              重新挑战
            </button>
          </div>
        </motion.div>
      </ModalOverlay>

      <ModalOverlay open={showVictory}>
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="w-full overflow-hidden rounded-2xl border border-sky-bright/35 bg-gradient-to-b from-void-800/95 to-void-950/98 shadow-[0_0_48px_rgba(56,189,248,0.2)]"
        >
          <div className="border-b border-sky-muted/20 bg-sky-deep/20 px-4 py-3 text-center">
            <div className="mb-1 flex items-center justify-center gap-1.5 text-[10px] tracking-[0.35em] text-sky-bright">
              <Sparkles className="h-3.5 w-3.5" />
              深渊回响
            </div>
            <h2 className="text-lg font-medium text-mist">【{spiritName}】已觉醒</h2>
          </div>

          <div className="flex flex-col items-center px-5 py-6">
            <div className="relative mb-4 flex h-40 w-40 items-center justify-center overflow-hidden rounded-2xl border border-sky-muted/35 bg-void-900/80">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_80%,rgba(56,189,248,0.25),transparent_60%)]" />
              <img
                src={spiritEntry?.assetUrl ?? '/assets/fossil-keichousaurus.png'}
                alt={spiritName}
                className="relative h-[85%] w-auto object-contain"
              />
            </div>
            <p className="mb-2 text-center text-sm tabular-nums text-sky-bright">
              总分 {finalScore}
            </p>
            <p className="mb-5 text-center text-sm leading-relaxed text-mist-muted">
              音律共鸣完美，狂暴之水重归宁静。
            </p>
            <button
              type="button"
              onClick={() => onCompleteRef.current?.()}
              className="w-full rounded-xl bg-gradient-to-r from-sky-muted to-sky-bright py-3.5 text-sm font-semibold text-void-950 active:scale-[0.98]"
            >
              收录图鉴 · 完成今日主线
            </button>
          </div>
        </motion.div>
      </ModalOverlay>
    </div>
  )
}

export default AbyssRhythmGame
