<script setup lang="ts">
/**
 * GeoMatch.vue — 两列信息匹配连线小游戏
 * Vue 3 Composition API + Tailwind CSS
 *
 * 交互：先点左列 → 再点右列，正确则锁定并画线，错误则抖动还原
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

/* ── 类型定义 ── */
export interface GeoMatchItem {
  /** 配对唯一 id — 左右列相同 id 即为正确匹配 */
  id: string
  /** 主文案（化石名 / 地质时期等） */
  label: string
  /** 副文案（可选） */
  sublabel?: string
  /** 左列可选配图 */
  imageUrl?: string
}

export interface GeoMatchData {
  left: GeoMatchItem[]
  right: GeoMatchItem[]
}

interface ConnectionLine {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
}

/* ── Props / Emits ── */
const props = defineProps<{
  matchData: GeoMatchData
}>()

const emit = defineEmits<{
  success: []
}>()

/* ── DOM Refs ── */
const boardRef = ref<HTMLElement | null>(null)
const leftCardRefs = ref<Record<string, HTMLElement | null>>({})
const rightCardRefs = ref<Record<string, HTMLElement | null>>({})

const setLeftRef = (id: string, el: HTMLElement | null) => {
  leftCardRefs.value[id] = el
}
const setRightRef = (id: string, el: HTMLElement | null) => {
  rightCardRefs.value[id] = el
}

/* ── 游戏状态 ── */
const selectedLeftId = ref<string | null>(null)
/** 已成功匹配的 id 集合 */
const matchedIds = ref<Set<string>>(new Set())
/** SVG 连线坐标 */
const connections = ref<ConnectionLine[]>([])
/** 错误抖动中的卡片 id */
const shakeLeftId = ref<string | null>(null)
const shakeRightId = ref<string | null>(null)
/** 通关动效 */
const isVictory = ref(false)
const victoryEmitted = ref(false)

const totalPairs = computed(() => props.matchData.left.length)
const isAllMatched = computed(() => matchedIds.value.size >= totalPairs.value)

/* ── 计算卡片中心点（相对 board 容器） ── */
function getCenterRelative(
  el: HTMLElement,
  container: HTMLElement,
): { x: number; y: number } {
  const elRect = el.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  return {
    x: elRect.left + elRect.width / 2 - containerRect.left,
    y: elRect.top + elRect.height / 2 - containerRect.top,
  }
}

/** 根据已匹配 id 重算所有连线坐标 */
async function recalcConnections() {
  await nextTick()
  const board = boardRef.value
  if (!board) return

  const lines: ConnectionLine[] = []

  for (const id of matchedIds.value) {
    const leftEl = leftCardRefs.value[id]
    const rightEl = rightCardRefs.value[id]
    if (!leftEl || !rightEl) continue

    const p1 = getCenterRelative(leftEl, board)
    const p2 = getCenterRelative(rightEl, board)

    lines.push({ id, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y })
  }

  connections.value = lines
}

/* ── 左列点击（pointerdown 消除 iOS 300ms 延迟） ── */
function onLeftPointerDown(e: PointerEvent, item: GeoMatchItem) {
  e.preventDefault()
  if (isVictory.value || matchedIds.value.has(item.id)) return
  selectedLeftId.value = item.id
}

/* ── 右列点击 ── */
function onRightPointerDown(e: PointerEvent, item: GeoMatchItem) {
  e.preventDefault()
  if (isVictory.value || matchedIds.value.has(item.id)) return
  if (!selectedLeftId.value) return

  const leftId = selectedLeftId.value

  if (leftId === item.id) {
    /* 匹配正确 */
    matchedIds.value = new Set([...matchedIds.value, item.id])
    selectedLeftId.value = null
    recalcConnections()
    checkVictory()
  } else {
    /* 匹配错误 — 抖动后还原 */
    shakeLeftId.value = leftId
    shakeRightId.value = item.id
    selectedLeftId.value = null

    window.setTimeout(() => {
      shakeLeftId.value = null
      shakeRightId.value = null
    }, 520)
  }
}

/** 全部匹配成功 → 通关动效 → 1s 后 emit success */
function checkVictory() {
  if (!isAllMatched.value || victoryEmitted.value) return

  isVictory.value = true
  victoryEmitted.value = true

  window.setTimeout(() => {
    emit('success')
  }, 1000)
}

/* ── 卡片样式辅助 ── */
function leftCardClass(id: string) {
  if (matchedIds.value.has(id)) {
    return 'border-spirit/60 bg-spirit-dim/25 text-spirit shadow-[0_0_12px_rgba(52,211,153,0.25)]'
  }
  if (shakeLeftId.value === id) {
    return 'border-red-400/70 bg-red-950/30 text-red-200 animate-geo-shake'
  }
  if (selectedLeftId.value === id) {
    return 'border-gold-bright/70 bg-gold-muted/10 text-gold-bright shadow-[0_0_16px_rgba(212,175,55,0.2)]'
  }
  return 'border-void-600/80 bg-void-800/60 text-mist active:scale-95'
}

function rightCardClass(id: string) {
  if (matchedIds.value.has(id)) {
    return 'border-spirit/60 bg-spirit-dim/25 text-spirit shadow-[0_0_12px_rgba(52,211,153,0.25)]'
  }
  if (shakeRightId.value === id) {
    return 'border-red-400/70 bg-red-950/30 text-red-200 animate-geo-shake'
  }
  return 'border-void-600/80 bg-void-800/60 text-mist active:scale-95'
}

/* ── 窗口尺寸变化时重算连线 ── */
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (boardRef.value) {
    resizeObserver = new ResizeObserver(() => {
      if (matchedIds.value.size > 0) recalcConnections()
    })
    resizeObserver.observe(boardRef.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

/* matchData 变更时重置 */
watch(
  () => props.matchData,
  () => {
    selectedLeftId.value = null
    matchedIds.value = new Set()
    connections.value = []
    shakeLeftId.value = null
    shakeRightId.value = null
    isVictory.value = false
    victoryEmitted.value = false
  },
  { deep: true },
)
</script>

<template>
  <div class="geo-match relative w-full px-1 py-2">
    <!-- 标题提示 -->
    <p class="mb-3 text-center text-xs text-mist-muted">
      先点左列，再点右列，将化石与地质时期正确配对
    </p>

    <!-- 游戏主面板（9:16 容器内自适应，相对定位供 SVG 参考） -->
    <div
      ref="boardRef"
      class="relative w-full overflow-hidden rounded-2xl border border-void-600/60 bg-void-900/50 p-2"
      :class="{ 'victory-glow': isVictory }"
    >
      <!-- SVG 连线层 — 绝对定位覆盖两列区域底层 -->
      <svg
        class="pointer-events-none absolute inset-0 z-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="geo-match-line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="rgba(52,211,153,0.9)" />
            <stop offset="50%" stop-color="rgba(212,175,55,0.85)" />
            <stop offset="100%" stop-color="rgba(52,211,153,0.9)" />
          </linearGradient>
        </defs>

        <line
          v-for="line in connections"
          :key="line.id"
          :x1="line.x1"
          :y1="line.y1"
          :x2="line.x2"
          :y2="line.y2"
          stroke="url(#geo-match-line-grad)"
          stroke-width="2.5"
          stroke-linecap="round"
          class="connection-line"
        />
      </svg>

      <!-- 两列卡片布局 -->
      <div class="relative z-10 grid grid-cols-2 gap-2 sm:gap-3">
        <!-- 左列：远古化石 -->
        <div class="flex flex-col gap-2">
          <p class="text-center text-[10px] tracking-widest text-gold-muted">远古化石</p>
          <button
            v-for="item in matchData.left"
            :key="`left-${item.id}`"
            :ref="(el) => setLeftRef(item.id, el as HTMLElement | null)"
            type="button"
            class="flex min-h-[72px] w-full flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-center transition-transform"
            :class="leftCardClass(item.id)"
            :disabled="matchedIds.has(item.id) || isVictory"
            @pointerdown="(e) => onLeftPointerDown(e, item)"
          >
            <img
              v-if="item.imageUrl"
              :src="item.imageUrl"
              :alt="item.label"
              class="mb-1 h-10 w-10 rounded-lg object-cover"
            />
            <span class="text-xs font-medium leading-tight">{{ item.label }}</span>
            <span v-if="item.sublabel" class="text-[10px] opacity-70">{{ item.sublabel }}</span>
            <span
              v-if="matchedIds.has(item.id)"
              class="mt-0.5 text-[9px] tracking-wider text-spirit"
            >
              ✓ 已锁定
            </span>
          </button>
        </div>

        <!-- 右列：地质时期 -->
        <div class="flex flex-col gap-2">
          <p class="text-center text-[10px] tracking-widest text-gold-muted">地质时期</p>
          <button
            v-for="item in matchData.right"
            :key="`right-${item.id}`"
            :ref="(el) => setRightRef(item.id, el as HTMLElement | null)"
            type="button"
            class="flex min-h-[72px] w-full flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-center transition-transform"
            :class="rightCardClass(item.id)"
            :disabled="matchedIds.has(item.id) || isVictory"
            @pointerdown="(e) => onRightPointerDown(e, item)"
          >
            <span class="text-xs font-medium leading-tight">{{ item.label }}</span>
            <span v-if="item.sublabel" class="text-[10px] leading-snug opacity-70">
              {{ item.sublabel }}
            </span>
            <span
              v-if="matchedIds.has(item.id)"
              class="mt-0.5 text-[9px] tracking-wider text-spirit"
            >
              ✓ 已锁定
            </span>
          </button>
        </div>
      </div>

      <!-- 通关 overlay -->
      <Transition name="victory-fade">
        <div
          v-if="isVictory"
          class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-void-950/50 backdrop-blur-[2px]"
        >
          <div class="flex flex-col items-center gap-2">
            <div
              class="flex h-14 w-14 items-center justify-center rounded-full border-2 border-gold-bright bg-gold-muted/20 shadow-[0_0_24px_rgba(212,175,55,0.4)]"
            >
              <svg
                class="h-7 w-7 text-gold-bright"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p class="text-sm font-medium text-gold-bright">全部配对成功！</p>
          </div>
        </div>
      </Transition>
    </div>

    <!-- 进度指示 -->
    <p class="mt-2 text-center text-[10px] text-mist-faint">
      已完成 {{ matchedIds.size }} / {{ totalPairs }}
    </p>
  </div>
</template>

<style scoped>
/* 错误抖动 */
@keyframes geo-shake {
  0%,
  100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-6px);
  }
  40% {
    transform: translateX(6px);
  }
  60% {
    transform: translateX(-4px);
  }
  80% {
    transform: translateX(4px);
  }
}

.animate-geo-shake {
  animation: geo-shake 0.45s ease-in-out;
}

/* 连线绘制入场 */
.connection-line {
  animation: line-draw 0.35s ease-out forwards;
  stroke-dasharray: 400;
  stroke-dashoffset: 400;
}

@keyframes line-draw {
  to {
    stroke-dashoffset: 0;
  }
}

/* 通关面板发光 */
.victory-glow {
  animation: board-glow 1s ease-out forwards;
  box-shadow: 0 0 30px rgba(212, 175, 55, 0.25);
}

@keyframes board-glow {
  0% {
    box-shadow: 0 0 0 rgba(212, 175, 55, 0);
  }
  50% {
    box-shadow: 0 0 40px rgba(52, 211, 153, 0.35);
  }
  100% {
    box-shadow: 0 0 24px rgba(212, 175, 55, 0.2);
  }
}

.victory-fade-enter-active {
  transition: opacity 0.3s ease;
}
.victory-fade-enter-from {
  opacity: 0;
}
</style>
