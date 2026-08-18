<script setup lang="ts">
/**
 * PhotoUpload.vue — 通用照片上传与模拟核验
 * Vue 3 Composition API + Tailwind CSS
 */
import { computed, onBeforeUnmount, ref } from 'vue'

/* ── Props / Emits ── */
const props = defineProps<{
  /** 任务标题，如「地道风味补给」 */
  questTitle: string
  /** 任务描述，如「请上传一张与蛋炒饭的合影…」 */
  questDesc: string
}>()

const emit = defineEmits<{
  /** 核验成功后抛出压缩后的 JPEG Base64 */
  success: [base64Data: string]
}>()

/* ── 状态机：idle → preview → verifying → success ── */
type Phase = 'idle' | 'preview' | 'verifying' | 'success'
const phase = ref<Phase>('idle')
const previewUrl = ref<string>('')
const compressedBase64 = ref<string>('')
const verifyProgress = ref(0)
const verifyMessage = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

/** 核验阶段文案序列（总时长约 2s） */
const VERIFY_STEPS: { at: number; text: string }[] = [
  { at: 0, text: '正在连接罗盘...' },
  { at: 35, text: 'AI 视觉特征提取中...' },
  { at: 75, text: '灵纹特征比对中...' },
  { at: 100, text: '核验通过！' },
]

let verifyTimer: ReturnType<typeof setInterval> | null = null
let verifyStart = 0

const isUploadVisible = computed(() => phase.value === 'idle')
const isPreviewVisible = computed(() =>
  ['preview', 'verifying', 'success'].includes(phase.value),
)
const isSubmitDisabled = computed(() => phase.value !== 'preview')
const showScanOverlay = computed(() => phase.value === 'verifying')
const showSuccessFx = computed(() => phase.value === 'success')

/* ── 唤起原生相机 / 相册 ── */
function onUploadPointerDown(e: PointerEvent) {
  e.preventDefault()
  fileInputRef.value?.click()
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !file.type.startsWith('image/')) return
  compressImage(file)
    .then((base64) => {
      compressedBase64.value = base64
      previewUrl.value = base64
      phase.value = 'preview'
    })
    .catch((err) => {
      console.error('[PhotoUpload] 压缩失败', err)
    })
}

/**
 * Canvas 等比压缩核心算法
 * - 最大宽度 1080px
 * - JPEG quality 0.8
 * - 避免 iOS 原图 Base64 内存溢出
 */
function compressImage(file: File): Promise<string> {
  const MAX_WIDTH = 1080
  const QUALITY = 0.8

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error('FileReader 读取失败'))

    reader.onload = () => {
      const img = new Image()

      img.onerror = () => reject(new Error('图片解码失败'))

      img.onload = () => {
        let { width, height } = img

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width)
          width = MAX_WIDTH
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas 2D 上下文不可用'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        const base64 = canvas.toDataURL('image/jpeg', QUALITY)
        resolve(base64)
      }

      img.src = reader.result as string
    }

    reader.readAsDataURL(file)
  })
}

/* ── 提交灵源核验（模拟进度条状态机，约 2s） ── */
function onSubmitPointerDown(e: PointerEvent) {
  e.preventDefault()
  if (phase.value !== 'preview' || !compressedBase64.value) return

  phase.value = 'verifying'
  verifyProgress.value = 0
  verifyMessage.value = VERIFY_STEPS[0].text
  verifyStart = Date.now()
  const DURATION = 2000

  clearVerifyTimer()

  verifyTimer = setInterval(() => {
    const elapsed = Date.now() - verifyStart
    const pct = Math.min(100, Math.round((elapsed / DURATION) * 100))
    verifyProgress.value = pct

    const step = [...VERIFY_STEPS].reverse().find((s) => pct >= s.at)
    if (step) verifyMessage.value = step.text

    if (elapsed >= DURATION) {
      clearVerifyTimer()
      phase.value = 'success'
      setTimeout(() => {
        emit('success', compressedBase64.value)
      }, 600)
    }
  }, 50)
}

function clearVerifyTimer() {
  if (verifyTimer) {
    clearInterval(verifyTimer)
    verifyTimer = null
  }
}

onBeforeUnmount(clearVerifyTimer)
</script>

<template>
  <div class="photo-upload w-full px-1 py-2">
    <!-- 任务标题区 -->
    <header class="mb-3 text-center">
      <h3 class="text-base font-medium text-mist">{{ props.questTitle }}</h3>
      <p class="mt-1 text-xs leading-relaxed text-mist-muted">{{ props.questDesc }}</p>
    </header>

    <!-- 虚线上传框（idle） -->
    <button
      v-if="isUploadVisible"
      type="button"
      class="group relative flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-jade-muted/40 bg-void-900/60 px-4 py-10 transition-transform active:scale-95"
      @pointerdown="onUploadPointerDown"
    >
      <!-- 科技感角标 -->
      <span
        class="pointer-events-none absolute left-3 top-3 h-3 w-3 border-l border-t border-sky/40"
      />
      <span
        class="pointer-events-none absolute right-3 top-3 h-3 w-3 border-r border-t border-sky/40"
      />
      <span
        class="pointer-events-none absolute bottom-3 left-3 h-3 w-3 border-b border-l border-sky/40"
      />
      <span
        class="pointer-events-none absolute bottom-3 right-3 h-3 w-3 border-b border-r border-sky/40"
      />

      <!-- 相机图标 -->
      <div
        class="flex h-14 w-14 items-center justify-center rounded-full border border-gold-muted/30 bg-void-800/80 shadow-[0_0_20px_rgba(56,189,248,0.12)] transition group-active:scale-95"
      >
        <svg
          class="h-7 w-7 text-gold-muted"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
          />
        </svg>
      </div>

      <p class="text-sm text-mist">点击唤起相机或相册</p>
      <p class="text-[10px] text-mist-faint">支持 JPG / PNG，自动压缩至 1080px</p>
    </button>

    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="onFileChange"
    />

    <!-- 预览 + 核验区 -->
    <div v-if="isPreviewVisible" class="relative w-full overflow-hidden rounded-2xl border border-void-600/70 bg-void-900/80">
      <div class="relative aspect-[4/3] w-full overflow-hidden bg-void-950">
        <img
          :src="previewUrl"
          alt="上传预览"
          class="h-full w-full object-cover"
        />

        <!-- 扫描线动画（verifying） -->
        <div
          v-if="showScanOverlay"
          class="pointer-events-none absolute inset-0 bg-void-950/45"
        >
          <div class="absolute inset-0">
            <div class="scan-line absolute inset-x-0 top-0 bottom-0">
              <div class="h-1 w-full bg-gradient-to-r from-transparent via-jade-bright to-transparent shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
            </div>
          </div>
          <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-void-950/90 to-transparent px-3 pb-3 pt-8">
            <p class="mb-1.5 text-center text-xs text-jade-bright">{{ verifyMessage }}</p>
            <div class="h-1.5 overflow-hidden rounded-full bg-void-700/80">
              <div
                class="h-full rounded-full bg-gradient-to-r from-jade-deep to-jade-bright transition-[width] duration-100"
                :style="{ width: `${verifyProgress}%` }"
              />
            </div>
          </div>
        </div>

        <!-- 成功发光 + 打钩（success） -->
        <div
          v-if="showSuccessFx"
          class="pointer-events-none absolute inset-0 flex items-center justify-center bg-jade-deep/20"
        >
          <div class="success-pulse absolute inset-0 bg-jade-bright/10" />
          <div class="relative flex flex-col items-center gap-2">
            <div class="flex h-16 w-16 items-center justify-center rounded-full border-2 border-spirit bg-spirit-dim/40 shadow-[0_0_30px_rgba(52,211,153,0.5)]">
              <svg class="h-8 w-8 text-spirit" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p class="text-sm font-medium text-spirit">灵源核验通过</p>
          </div>
        </div>
      </div>

      <!-- 提交按钮（preview 阶段可用） -->
      <div v-if="phase === 'preview'" class="p-3">
        <button
          type="button"
          class="flex w-full items-center justify-center gap-2 rounded-xl border border-jade-muted/40 bg-gradient-to-r from-jade-deep/80 to-jade-muted/30 py-3 text-sm font-medium text-mist transition-transform active:scale-95 disabled:opacity-50"
          :disabled="isSubmitDisabled"
          @pointerdown="onSubmitPointerDown"
        >
          <svg class="h-4 w-4 text-jade-bright" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          提交灵源核验
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 扫描线上下往复（GPU transform） */
.scan-line {
  will-change: transform, opacity;
  transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
  animation: scan-sweep 1.6s ease-in-out infinite;
}

@keyframes scan-sweep {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
    opacity: 0.6;
  }
  50% {
    transform: translate3d(0, calc(100% - 4px), 0);
    opacity: 1;
  }
}

/* 成功全屏发光脉冲 */
.success-pulse {
  animation: success-glow 0.6s ease-out forwards;
}

@keyframes success-glow {
  0% {
    opacity: 0;
    transform: scale(0.95);
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.85;
    transform: scale(1);
  }
}
</style>
