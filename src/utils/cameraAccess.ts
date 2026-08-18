export type CameraSupport =
  | { ok: true }
  | { ok: false; message: string; hint?: string }

const CAMERA_TIMEOUT_MS = 12_000

/** 检测当前环境是否允许调用摄像头 */
export function getCameraSupport(): CameraSupport {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { ok: false, message: '当前环境不支持摄像头' }
  }

  if (!window.isSecureContext) {
    const host = window.location.hostname
    const isLan =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      /^192\.168\.\d+\.\d+$/.test(host) ||
      /^\d+\.\d+\.\d+\.\d+$/.test(host)

    return {
      ok: false,
      message: '手机访问需使用 HTTPS 安全连接才能调用相机',
      hint: isLan
        ? '请改用终端显示的 https:// 局域网地址（勿用 http://），首次打开需信任自签名证书'
        : '请通过 HTTPS 或 localhost 访问本页面',
    }
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return {
      ok: false,
      message: '当前浏览器不支持摄像头 API',
      hint: '请使用 Safari / Chrome 等现代浏览器',
    }
  }

  return { ok: true }
}

/** 将 getUserMedia 错误转为用户可读文案 */
export function describeCameraError(err: unknown): string {
  if (!(err instanceof Error)) return '无法启动摄像头'

  switch (err.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return '摄像头权限被拒绝。请在系统设置中允许浏览器使用相机后重试'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return '未检测到可用摄像头'
    case 'NotReadableError':
    case 'TrackStartError':
      return '摄像头被其他应用占用，请关闭后重试'
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return '摄像头参数不兼容，正在尝试通用模式'
    case 'AbortError':
      return '摄像头启动被中断，请重试'
    case 'SecurityError':
      return '安全限制阻止访问摄像头，请使用 HTTPS 访问'
    default:
      break
  }

  if (err.message.includes('拼图原图') || err.message.includes('HTTPS')) return err.message
  return err.message || '无法启动摄像头'
}

/** 依次尝试后置 → 前置/默认摄像头 */
export async function openCameraStream(
  preferRear = true,
  timeoutMs = CAMERA_TIMEOUT_MS,
): Promise<MediaStream> {
  const support = getCameraSupport()
  if (!support.ok) {
    throw new Error(support.hint ? `${support.message}（${support.hint}）` : support.message)
  }

  const attempts: MediaStreamConstraints[] = preferRear
    ? [
        {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        },
        {
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        },
        { video: { facingMode: { ideal: 'environment' } }, audio: false },
        { video: true, audio: false },
      ]
    : [{ video: true, audio: false }]

  let lastErr: unknown
  for (const constraints of attempts) {
    try {
      return await Promise.race<MediaStream>([
        navigator.mediaDevices.getUserMedia(constraints),
        new Promise<MediaStream>((_, reject) => {
          window.setTimeout(() => reject(new Error('摄像头启动超时，请重试')), timeoutMs)
        }),
      ])
    } catch (e) {
      lastErr = e
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('无法启动摄像头')
}

/** 将 MediaStream 绑定到 video 元素（iOS Safari 兼容） */
export async function bindStreamToVideo(
  video: HTMLVideoElement,
  stream: MediaStream,
): Promise<void> {
  video.srcObject = stream
  video.setAttribute('playsinline', 'true')
  video.setAttribute('webkit-playsinline', 'true')
  video.muted = true
  await video.play()
}

export function stopMediaStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((track) => track.stop())
}
