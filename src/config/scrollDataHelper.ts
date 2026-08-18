import { getSpiritAssetUrl } from './spiritCatalog'

/** 百灵绘卷默认照片（不足 7 张时补齐） */
const DEFAULT_SCROLL_PHOTOS = [
  '/assets/puzzle-copper-chariot.png',
  '/assets/fossil-keichousaurus.png',
  '/assets/silhouette-castle-lake.png',
  '/assets/puzzle-copper-chariot.png',
  '/assets/fossil-keichousaurus.png',
  '/assets/silhouette-castle-lake.png',
  '/assets/puzzle-copper-chariot.png',
] as const

const PHOTO_STORAGE_PREFIXES = [
  'foworld-side-photo-',
  'foworld-side-sticker-',
  'foworld-day1-sticker',
] as const

const SCROLL_RESULT_KEY = 'foworld-day7-scroll'

/** 从 localStorage 收集玩家上传/拍摄的照片 Base64 或 URL */
export function collectScrollPhotos(): string[] {
  const photos: string[] = []

  if (typeof window !== 'undefined') {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      const matched = PHOTO_STORAGE_PREFIXES.some(
        (prefix) => key === prefix || key.startsWith(prefix),
      )
      if (!matched) continue
      const value = localStorage.getItem(key)
      if (value && (value.startsWith('data:image') || value.startsWith('/'))) {
        photos.push(value)
      }
    }
  }

  const result: string[] = []
  for (let i = 0; i < 7; i++) {
    result.push(photos[i] ?? DEFAULT_SCROLL_PHOTOS[i])
  }
  return result
}

/** 根据 store.collectedSpirits 映射幻兽 PNG，不足 7 只时用默认素材补齐 */
export function collectScrollSpirits(collectedSpirits: string[]): string[] {
  const mapped = collectedSpirits.map((name) => getSpiritAssetUrl(name))

  const result: string[] = []
  for (let i = 0; i < 7; i++) {
    result.push(mapped[i] ?? DEFAULT_SCROLL_PHOTOS[i % DEFAULT_SCROLL_PHOTOS.length])
  }
  return result
}

/** 持久化终章长卷 Base64 */
export function saveScrollResult(base64: string) {
  try {
    localStorage.setItem(SCROLL_RESULT_KEY, base64)
  } catch {
    /* ignore */
  }
}

export { SCROLL_RESULT_KEY }

const FEEDBACK_STORAGE_KEY = 'foworld-day7-feedback'

/** 清除支线照片、贴纸、绘卷、反馈等本地素材（清档重玩） */
export function clearScrollProgressAssets() {
  if (typeof window === 'undefined') return

  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key) continue
    const matched =
      PHOTO_STORAGE_PREFIXES.some((prefix) => key === prefix || key.startsWith(prefix)) ||
      key === SCROLL_RESULT_KEY ||
      key === FEEDBACK_STORAGE_KEY
    if (matched) keysToRemove.push(key)
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key))
}
