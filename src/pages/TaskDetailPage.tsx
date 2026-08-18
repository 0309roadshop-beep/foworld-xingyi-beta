import { motion } from 'framer-motion'
import {
  ArrowLeft,
  BookOpen,
  Camera,
  CheckCircle2,
  Circle,
  Compass,
  Cog,
  Droplets,
  Gift,
  Grid3x3,
  Layers,
  MapPin,
  Music2,
  Pickaxe,
  Puzzle,
  Route,
  Scroll,
  Workflow,
  History,
  GitBranch,
  Waves,
  ScanSearch,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GearPuzzle } from '../components/gear/GearPuzzle'
import { AudioCatcher } from '../components/audiocatcher/AudioCatcher'
import { PentatonicSimon } from '../components/simon/PentatonicSimon'
import { PipeConnect } from '../components/pipe/PipeConnect'
import { TimeSlider } from '../components/timeslider/TimeSlider'
import { GeoMatch } from '../components/geo/GeoMatch'
import { OneStrokeConnect } from '../components/onestroke/OneStrokeConnect'
import { FossilScratch } from '../components/fossil/FossilScratch'
import { SilhouetteSlider } from '../components/silhouette/SilhouetteSlider'
import { Astrolabe } from '../components/astrolabe/Astrolabe'
import { MobileShell } from '../components/layout/MobileShell'
import { MatrixPuzzle } from '../components/puzzle/MatrixPuzzle'
import { PuzzleGrid } from '../components/puzzle/PuzzleGrid'
import { DecorativePanel } from '../components/ui/DecorativePanel'
import { GlowButton } from '../components/ui/GlowButton'
import { TaskListItem } from '../components/ui/TaskListItem'
import { usePlayer } from '../context/PlayerContext'
import { MOCK_TASKS, MATRIX_PUZZLE_IMAGE_URL, PUZZLE_IMAGE_ASPECT, PUZZLE_IMAGE_URL } from '../mock/data'
import { DAY1_GEO_MATCH_DATA } from '../config/geoMatchData'
import { DAY1_MUSEUM_ARTIFACTS } from '../config/day1ArtifactScanData'
import { ArtifactScan } from '../components/scan/ArtifactScan'
import { RiverRunGame } from '../components/river/RiverRunGame'
import type { Task } from '../types'

const STATUS_LABEL: Record<Task['status'], string> = {
  locked: '未解锁',
  available: '可接取',
  in_progress: '进行中',
  completed: '已完成',
}

function TaskDetailPanel({ task }: { task: Task }) {
  const isMain = task.type === 'main'

  return (
    <motion.div
      key={task.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`glass-panel overflow-hidden ${isMain ? 'border-gold-muted/30' : ''}`}
    >
      {/* 顶部标签 */}
      <div
        className={`px-4 py-2.5 text-center text-xs tracking-[0.4em] ${
          isMain
            ? 'bg-gradient-to-r from-jade-deep/80 via-jade-muted/50 to-sky-deep/60 text-gold-bright'
            : 'bg-void-700/60 text-mist-muted'
        }`}
      >
        {isMain ? '主 线 任 务' : '支 线 任 务'}
      </div>

      <div className="p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-xl font-medium leading-snug text-mist">{task.title}</h2>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] ${
              task.status === 'in_progress'
                ? 'border-gold-muted/40 text-gold-bright'
                : task.status === 'locked'
                  ? 'border-mist-faint/20 text-mist-faint'
                  : 'border-spirit/30 text-spirit'
            }`}
          >
            {STATUS_LABEL[task.status]}
          </span>
        </div>

        <div className="mb-4 flex items-center gap-1.5 text-sm text-mist-muted">
          <MapPin className="h-4 w-4 shrink-0 text-bronze" />
          <span>{task.location}</span>
          {task.distance && (
            <span className="ml-auto text-xs text-mist-faint">{task.distance}</span>
          )}
        </div>

        <p className="mb-4 text-sm leading-relaxed text-mist-muted">{task.description}</p>

        {task.lore && (
          <div className="mb-4 rounded-xl border border-jade/20 bg-jade-deep/20 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs tracking-widest text-jade-bright">
              <BookOpen className="h-3.5 w-3.5" />
              <span>任务背景</span>
            </div>
            <p className="text-xs leading-relaxed text-mist-faint">{task.lore}</p>
          </div>
        )}

        {/* 目标列表 */}
        <div className="mb-4">
          <div className="mb-2.5 flex items-center gap-1.5 text-xs tracking-widest text-gold-muted">
            <Scroll className="h-3.5 w-3.5" />
            <span>任务目标</span>
          </div>
          <ul className="space-y-2">
            {task.objectives.map((obj, i) => {
              const done = task.status === 'completed' || (task.status === 'in_progress' && i === 0)
              return (
                <li key={obj} className="flex items-start gap-2.5 text-sm">
                  {done ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-spirit" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-mist-faint" />
                  )}
                  <span className={done ? 'text-mist-muted line-through decoration-mist-faint/50' : 'text-mist-muted'}>
                    {obj}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        {/* 奖励 */}
        <div className="flex items-center gap-3 rounded-xl border border-spirit/20 bg-spirit-dim/20 p-3">
          <Gift className="h-5 w-5 shrink-0 text-spirit" />
          <div>
            <p className="text-xs text-mist-muted">完成奖励</p>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-sm font-medium text-spirit">
                <Droplets className="h-3.5 w-3.5" />
                +{task.reward.spiritDrops} 灵源滴
              </span>
              {task.reward.label && (
                <span className="text-xs text-mist-faint">· {task.reward.label}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function TaskDetailPage() {
  const navigate = useNavigate()
  const { addSpiritDrops, addRecord } = usePlayer()
  const mainTask = MOCK_TASKS.find((t) => t.type === 'main')!
  const sideTasks = MOCK_TASKS.filter((t) => t.type === 'side')

  const [selectedTask, setSelectedTask] = useState<Task>(mainTask)
  const [puzzleDone, setPuzzleDone] = useState(false)
  const [astrolabeDone, setAstrolabeDone] = useState(false)
  const [silhouetteDone, setSilhouetteDone] = useState(false)
  const [fossilDone, setFossilDone] = useState(false)
  const [matrixDone, setMatrixDone] = useState(false)
  const [oneStrokeDone, setOneStrokeDone] = useState(false)
  const [gearDone, setGearDone] = useState(false)
  const [audioCatcherDone, setAudioCatcherDone] = useState(false)
  const [simonDone, setSimonDone] = useState(false)
  const [pipeDone, setPipeDone] = useState(false)
  const [timeSliderDone, setTimeSliderDone] = useState(false)
  const [geoMatchDone, setGeoMatchDone] = useState(false)
  const [artifactScanDone, setArtifactScanDone] = useState(false)
  const [riverRunDone, setRiverRunDone] = useState(false)

  const side001 = sideTasks.find((t) => t.id === 'side-001')!
  const side002 = sideTasks.find((t) => t.id === 'side-002')!
  const side003 = sideTasks.find((t) => t.id === 'side-003')!
  const side004 = sideTasks.find((t) => t.id === 'side-004')!
  const side005 = sideTasks.find((t) => t.id === 'side-005')!
  const side006 = sideTasks.find((t) => t.id === 'side-006')!
  const side007 = sideTasks.find((t) => t.id === 'side-007')!
  const side008 = sideTasks.find((t) => t.id === 'side-008')!
  const side009 = sideTasks.find((t) => t.id === 'side-009')!
  const side010 = sideTasks.find((t) => t.id === 'side-010')!
  const side011 = sideTasks.find((t) => t.id === 'side-011')!

  const canStartAR =
    selectedTask.status === 'in_progress' || selectedTask.status === 'available'

  const showPuzzle =
    selectedTask.type === 'main' && selectedTask.status !== 'locked'

  const showAstrolabe =
    selectedTask.id === 'side-001' && selectedTask.status !== 'locked'

  const showSilhouette =
    selectedTask.id === 'side-002' && selectedTask.status !== 'locked'

  const showFossil =
    selectedTask.id === 'side-003' && selectedTask.status !== 'locked'

  const showMatrix =
    selectedTask.id === 'side-004' && selectedTask.status !== 'locked'

  const showOneStroke =
    selectedTask.id === 'side-005' && selectedTask.status !== 'locked'

  const showGear =
    selectedTask.id === 'side-006' && selectedTask.status !== 'locked'

  const showAudioCatcher =
    selectedTask.id === 'side-007' && selectedTask.status !== 'locked'

  const showSimon =
    selectedTask.id === 'side-008' && selectedTask.status !== 'locked'

  const showPipe =
    selectedTask.id === 'side-009' && selectedTask.status !== 'locked'

  const showTimeSlider =
    selectedTask.id === 'side-010' && selectedTask.status !== 'locked'

  const showGeoMatch =
    selectedTask.id === 'side-011' && selectedTask.status !== 'locked'

  const handlePuzzleSuccess = () => {
    if (puzzleDone) return
    setPuzzleDone(true)
    addSpiritDrops(20)
    addRecord({
      type: 'task_complete',
      title: '完成九宫格灵纹拼图',
      location: selectedTask.location,
      detail: '复原东汉铜车马碎片 · +20 灵源滴',
    })
  }

  const handleAstrolabeSuccess = () => {
    if (astrolabeDone) return
    setAstrolabeDone(true)
    addSpiritDrops(15)
    addRecord({
      type: 'task_complete',
      title: '完成同心星盘对齐',
      location: side001.location,
      detail: '三环同心锁定 · +15 灵源滴',
    })
  }

  const handleSilhouetteSuccess = () => {
    if (silhouetteDone) return
    setSilhouetteDone(true)
    addSpiritDrops(15)
    addRecord({
      type: 'task_complete',
      title: '完成视差剪影解密',
      location: side002.location,
      detail: '三层剪影对齐 · +15 灵源滴',
    })
  }

  const handleFossilSuccess = () => {
    if (fossilDone) return
    setFossilDone(true)
    addSpiritDrops(25)
    addRecord({
      type: 'task_complete',
      title: '完成化石刮刮乐修复',
      location: side003.location,
      detail: '贵州龙化石显露 · +25 灵源滴',
    })
  }

  const handleMatrixSuccess = () => {
    if (matrixDone) return
    setMatrixDone(true)
    addSpiritDrops(20)
    addRecord({
      type: 'task_complete',
      title: '完成实景矩阵拼图',
      location: side004.location,
      detail: '3×4 矩阵复原 · +20 灵源滴',
    })
  }

  const handleOneStrokeSuccess = () => {
    if (oneStrokeDone) return
    setOneStrokeDone(true)
    addSpiritDrops(18)
    addRecord({
      type: 'task_complete',
      title: '完成灵纹一笔画',
      location: side005.location,
      detail: '节点回路闭合 · +18 灵源滴',
    })
  }

  const handleGearSuccess = () => {
    if (gearDone) return
    setGearDone(true)
    addSpiritDrops(20)
    addRecord({
      type: 'task_complete',
      title: '完成机械齿轮组装',
      location: side006.location,
      detail: '齿轮联动启动 · +20 灵源滴',
    })
  }

  const handleAudioCatcherSuccess = () => {
    if (audioCatcherDone) return
    setAudioCatcherDone(true)
    addSpiritDrops(18)
    addRecord({
      type: 'task_complete',
      title: '完成飞瀑集音',
      location: side007.location,
      detail: '灵泉共鸣收录 · +18 灵源滴',
    })
  }

  const handleSimonSuccess = () => {
    if (simonDone) return
    setSimonDone(true)
    addSpiritDrops(20)
    addRecord({
      type: 'task_complete',
      title: '完成五音记忆重奏',
      location: side008.location,
      detail: '五音归位 · +20 灵源滴',
    })
  }

  const handlePipeSuccess = () => {
    if (pipeDone) return
    setPipeDone(true)
    addSpiritDrops(18)
    addRecord({
      type: 'task_complete',
      title: '完成地脉管路拼接',
      location: side009.location,
      detail: '水路贯通 · +18 灵源滴',
    })
  }

  const handleTimeSliderSuccess = () => {
    if (timeSliderDone) return
    setTimeSliderDone(true)
    addSpiritDrops(22)
    addRecord({
      type: 'task_complete',
      title: '完成地质纪年回溯',
      location: side010.location,
      detail: '时光定格 2.5 亿年前 · +22 灵源滴',
    })
  }

  const handleGeoMatchSuccess = () => {
    if (geoMatchDone) return
    setGeoMatchDone(true)
    addSpiritDrops(20)
    addRecord({
      type: 'task_complete',
      title: '完成地质化石配对',
      location: side011.location,
      detail: '化石与地质时期全部连线 · +20 灵源滴',
    })
  }

  const handleArtifactScanSuccess = () => {
    if (artifactScanDone) return
    setArtifactScanDone(true)
    addSpiritDrops(50)
    addRecord({
      type: 'task_complete',
      title: '完成古国器韵寻踪',
      location: mainTask.location,
      detail: '6 件青铜文物扫描验证 · +50 灵源滴',
    })
  }

  const handleRiverRunSuccess = () => {
    if (riverRunDone) return
    setRiverRunDone(true)
    addSpiritDrops(50)
    addRecord({
      type: 'task_complete',
      title: '完成御水之契',
      location: '坝盘桨板体验点',
      detail: '获得元素属性：御水亲和 · +50 灵源滴',
    })
  }

  return (
    <MobileShell className="quest-catalog-shell flex flex-col">
      {/* 固定顶栏 */}
      <header className="relative z-10 flex shrink-0 items-center gap-3 px-4 py-4">
        <button
          type="button"
          onClick={() => navigate('/compass')}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-muted/20 bg-void-800/80 transition-colors active:bg-void-700"
        >
          <ArrowLeft className="h-4 w-4 text-mist" />
        </button>
        <div>
          <h1 className="text-base font-medium text-mist">任务详情</h1>
          <p className="text-[11px] text-mist-faint">主线与支线一览</p>
        </div>
      </header>

      {/* 可滚动内容区 */}
      <div className="scroll-root quest-flow-host relative z-10 flex-1 overflow-y-auto overscroll-none px-4 pb-6 scrollbar-none">
        {/* 主线区块 */}
        <section className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-gold-muted/40 to-transparent" />
            <span className="text-xs tracking-[0.3em] text-gold-muted">主线任务</span>
            <div className="h-px flex-1 bg-gradient-to-l from-gold-muted/40 to-transparent" />
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedTask(mainTask)
              setPuzzleDone(false)
            }}
            className="w-full text-left"
          >
            <TaskDetailPanel task={mainTask} />
          </button>

          {/* 九宫格拼图任务 */}
          {showPuzzle && (
            <DecorativePanel glow className="mt-4 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Puzzle className="h-4 w-4 text-jade-bright" />
                  <span className="text-sm font-medium text-mist">灵纹拼图</span>
                </div>
                {puzzleDone && (
                  <span className="flex items-center gap-1 text-xs text-spirit">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    已完成
                  </span>
                )}
              </div>
              <p className="mb-4 text-xs leading-relaxed text-mist-faint">
                将打乱的铜车马图块还原，即可完成支线挑战并获得灵源滴奖励。
              </p>
              <PuzzleGrid
                imageUrl={PUZZLE_IMAGE_URL}
                imageAspect={PUZZLE_IMAGE_ASPECT}
                onSuccess={handlePuzzleSuccess}
              />
            </DecorativePanel>
          )}

          {/* Day 1 · 文物图谱扫描 */}
          <DecorativePanel glow className="mt-4 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ScanSearch className="h-4 w-4 text-gold-bright" />
                <span className="text-sm font-medium text-mist">古国器韵寻踪</span>
              </div>
              {artifactScanDone && (
                <span className="flex items-center gap-1 text-xs text-spirit">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  已完成
                </span>
              )}
            </div>
            <p className="mb-4 text-xs leading-relaxed text-mist-faint">
              Day 1 主线：取景锁定后输入展牌灵感校验码，验证 6 件青铜文物。
            </p>
            <ArtifactScan
              artifacts={DAY1_MUSEUM_ARTIFACTS}
              targetCount={6}
              onSuccess={handleArtifactScanSuccess}
            />
          </DecorativePanel>

          {/* Day 1 · 御水之契江河试炼 */}
          <DecorativePanel glow className="mt-4 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Waves className="h-4 w-4 text-sky-bright" />
                <span className="text-sm font-medium text-mist">御水之契 · 江河试炼</span>
              </div>
              {riverRunDone && (
                <span className="flex items-center gap-1 text-xs text-spirit">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  已完成
                </span>
              )}
            </div>
            <p className="mb-4 text-xs leading-relaxed text-mist-faint">
              Day 1 结尾主线：坝盘桨板体验后的 H5 顺流躲避小游戏。
            </p>
            <RiverRunGame
              affinityReward="御水亲和"
              surviveSeconds={45}
              targetScore={200}
              maxHits={3}
              onSuccess={handleRiverRunSuccess}
            />
          </DecorativePanel>
        </section>

        {/* 支线区块 */}
        <section className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-mist-faint/30 to-transparent" />
            <span className="text-xs tracking-[0.3em] text-mist-muted">支线任务</span>
            <div className="h-px flex-1 bg-gradient-to-l from-mist-faint/30 to-transparent" />
          </div>

          <div className="mb-4 space-y-2">
            {sideTasks.map((task) => (
              <TaskListItem
                key={task.id}
                task={task}
                selected={selectedTask.id === task.id}
                onClick={() => {
                  setSelectedTask(task)
                  if (task.id !== 'side-001') setAstrolabeDone(false)
                  if (task.id !== 'side-002') setSilhouetteDone(false)
                  if (task.id !== 'side-003') setFossilDone(false)
                  if (task.id !== 'side-004') setMatrixDone(false)
                  if (task.id !== 'side-005') setOneStrokeDone(false)
                  if (task.id !== 'side-006') setGearDone(false)
                  if (task.id !== 'side-007') setAudioCatcherDone(false)
                  if (task.id !== 'side-008') setSimonDone(false)
                  if (task.id !== 'side-009') setPipeDone(false)
                  if (task.id !== 'side-010') setTimeSliderDone(false)
                  if (task.id !== 'side-011') setGeoMatchDone(false)
                }}
              />
            ))}
          </div>

          {selectedTask.type === 'side' && (
            <TaskDetailPanel task={selectedTask} />
          )}

          {/* 同心星盘旋转对齐 — 支线 side-001 */}
          {showAstrolabe && (
            <DecorativePanel glow className="mt-4 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass className="h-4 w-4 text-sky-bright" />
                  <span className="text-sm font-medium text-mist">同心星盘</span>
                </div>
                {astrolabeDone && (
                  <span className="flex items-center gap-1 text-xs text-spirit">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    已完成
                  </span>
                )}
              </div>
              <p className="mb-4 text-xs leading-relaxed text-mist-faint">
                滑动旋转外、中、内三环，使各环顶部的三角标记同时指向正上方，星盘即可锁定。
              </p>
              <Astrolabe onSuccess={handleAstrolabeSuccess} />
            </DecorativePanel>
          )}

          {/* 视差剪影滑块解密 — 支线 side-002 */}
          {showSilhouette && (
            <DecorativePanel glow className="mt-4 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-gold-bright" />
                  <span className="text-sm font-medium text-mist">视差剪影</span>
                </div>
                {silhouetteDone && (
                  <span className="flex items-center gap-1 text-xs text-spirit">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    已完成
                  </span>
                )}
              </div>
              <p className="mb-4 text-xs leading-relaxed text-mist-faint">
                拖动下方三个滑块，调整远、中、近景剪影的水平位移，使万峰林与古堡轮廓完美重叠。
              </p>
              <SilhouetteSlider onSuccess={handleSilhouetteSuccess} />
            </DecorativePanel>
          )}

          {/* 化石刮刮乐修复 — 支线 side-003 */}
          {showFossil && (
            <DecorativePanel glow className="mt-4 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pickaxe className="h-4 w-4 text-jade-bright" />
                  <span className="text-sm font-medium text-mist">化石修复</span>
                </div>
                {fossilDone && (
                  <span className="flex items-center gap-1 text-xs text-spirit">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    已完成
                  </span>
                )}
              </div>
              <p className="mb-4 text-xs leading-relaxed text-mist-faint">
                用手指刮开覆盖在化石板上的泥土层，当擦除面积超过 80% 时，化石将完整显露。
              </p>
              <FossilScratch onSuccess={handleFossilSuccess} />
            </DecorativePanel>
          )}

          {/* 实景矩阵触摸拼图 — 支线 side-004 */}
          {showMatrix && (
            <DecorativePanel glow className="mt-4 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Grid3x3 className="h-4 w-4 text-sky-bright" />
                  <span className="text-sm font-medium text-mist">实景矩阵</span>
                </div>
                {matrixDone && (
                  <span className="flex items-center gap-1 text-xs text-spirit">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    已完成
                  </span>
                )}
              </div>
              <p className="mb-4 text-xs leading-relaxed text-mist-faint">
                照片会被切成 4×4 共 16 块并打乱在碎片池。点选一块，再点上方空白格放置，逐步拼满画布。
              </p>
              <MatrixPuzzle
                imageUrl={MATRIX_PUZZLE_IMAGE_URL}
                allowUpload
                onSuccess={handleMatrixSuccess}
              />
            </DecorativePanel>
          )}

          {/* 一笔画连线解密 — 支线 side-005 */}
          {showOneStroke && (
            <DecorativePanel glow className="mt-4 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Route className="h-4 w-4 text-jade-bright" />
                  <span className="text-sm font-medium text-mist">灵纹一笔画</span>
                </div>
                {oneStrokeDone && (
                  <span className="flex items-center gap-1 text-xs text-spirit">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    已完成
                  </span>
                )}
              </div>
              <p className="mb-4 text-xs leading-relaxed text-mist-faint">
                从「起」点按住滑动，手指经过各节点时会吸附锁定，按 1→2→3→4→5 顺序连完并回到起点即成功。
              </p>
              <OneStrokeConnect onSuccess={handleOneStrokeSuccess} />
            </DecorativePanel>
          )}

          {/* 机械齿轮拖拽组装 — 支线 side-006 */}
          {showGear && (
            <DecorativePanel glow className="mt-4 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cog className="h-4 w-4 text-gold-bright" />
                  <span className="text-sm font-medium text-mist">齿轮组装</span>
                </div>
                {gearDone && (
                  <span className="flex items-center gap-1 text-xs text-spirit">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    已完成
                  </span>
                )}
              </div>
              <p className="mb-4 text-xs leading-relaxed text-mist-faint">
                将底部大、中、小齿轮拖入对应虚线锚点，尺寸必须匹配；三件装填后齿轮将顺逆联动旋转。
              </p>
              <GearPuzzle onSuccess={handleGearSuccess} />
            </DecorativePanel>
          )}

          {/* 飞瀑集音气泡 — 支线 side-007 */}
          {showAudioCatcher && (
            <DecorativePanel glow className="mt-4 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-sky-bright" />
                  <span className="text-sm font-medium text-mist">飞瀑集音</span>
                </div>
                {audioCatcherDone && (
                  <span className="flex items-center gap-1 text-xs text-spirit">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    已完成
                  </span>
                )}
              </div>
              <p className="mb-4 text-xs leading-relaxed text-mist-faint">
                水滴气泡从飞瀑顶端落下，快速点破它们收录灵音；30 秒内集满 15 个即通关。
              </p>
              <AudioCatcher onSuccess={handleAudioCatcherSuccess} />
            </DecorativePanel>
          )}

          {/* 五音记忆重奏 — 支线 side-008 */}
          {showSimon && (
            <DecorativePanel glow className="mt-4 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Music2 className="h-4 w-4 text-jade-bright" />
                  <span className="text-sm font-medium text-mist">五音重奏</span>
                </div>
                {simonDone && (
                  <span className="flex items-center gap-1 text-xs text-spirit">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    已完成
                  </span>
                )}
              </div>
              <p className="mb-4 text-xs leading-relaxed text-mist-faint">
                先点击「聆听水灵之声」记住五音顺序，再按相同次序点按宫、商、角、徵、羽键复奏。
              </p>
              <PentatonicSimon onSuccess={handleSimonSuccess} />
            </DecorativePanel>
          )}

          {/* 水管拼接 — 支线 side-009 */}
          {showPipe && (
            <DecorativePanel glow className="mt-4 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Workflow className="h-4 w-4 text-sky-bright" />
                  <span className="text-sm font-medium text-mist">管路拼接</span>
                </div>
                {pipeDone && (
                  <span className="flex items-center gap-1 text-xs text-spirit">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    已完成
                  </span>
                )}
              </div>
              <p className="mb-4 text-xs leading-relaxed text-mist-faint">
                点击任意水管顺时针旋转，将左上角「源」与右下角「汇」之间的接口对齐，使灵泉贯通。
              </p>
              <PipeConnect onSuccess={handlePipeSuccess} />
            </DecorativePanel>
          )}

          {/* 多维参数时间滑块 — 支线 side-010 */}
          {showTimeSlider && (
            <DecorativePanel glow className="mt-4 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-gold-bright" />
                  <span className="text-sm font-medium text-mist">时光回溯</span>
                </div>
                {timeSliderDone && (
                  <span className="flex items-center gap-1 text-xs text-spirit">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    已完成
                  </span>
                )}
              </div>
              <p className="mb-4 text-xs leading-relaxed text-mist-faint">
                调节地壳运动、海水温度、大气压强，使纪年读数从「现代」回溯至 2.5 亿年前古海洋。
              </p>
              <TimeSlider onSuccess={handleTimeSliderSuccess} />
            </DecorativePanel>
          )}

          {/* 地质化石信息配对 — 支线 side-011 */}
          {showGeoMatch && (
            <DecorativePanel glow className="mt-4 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-jade-bright" />
                  <span className="text-sm font-medium text-mist">化石配对</span>
                </div>
                {geoMatchDone && (
                  <span className="flex items-center gap-1 text-xs text-spirit">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    已完成
                  </span>
                )}
              </div>
              <p className="mb-4 text-xs leading-relaxed text-mist-faint">
                先点击左列化石卡片，再点击右列地质时期；配对正确将自动画线锁定，全部完成即可通关。
              </p>
              <GeoMatch matchData={DAY1_GEO_MATCH_DATA} onSuccess={handleGeoMatchSuccess} />
            </DecorativePanel>
          )}
        </section>
      </div>

      {/* 底部操作栏 */}
      {canStartAR && selectedTask.status !== 'locked' && (
        <div className="relative z-10 shrink-0 border-t border-gold-muted/10 bg-void-900/80 px-4 py-4 backdrop-blur-md">
          <GlowButton
            className="flex w-full items-center justify-center gap-2"
            onClick={() => navigate('/camera')}
          >
            <Camera className="h-4 w-4" />
            {selectedTask.status === 'in_progress' ? '继续 AR 采集' : '开启 AR 罗盘'}
          </GlowButton>
        </div>
      )}
    </MobileShell>
  )
}
