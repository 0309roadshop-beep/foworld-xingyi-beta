import { Camera } from 'lucide-react'
import { getCameraSupport } from '../../utils/cameraAccess'

interface CameraPermissionGateProps {
  title?: string
  error?: string | null
  loading?: boolean
  enableLabel?: string
  onEnable: () => void
  onCancel?: () => void
}

/** 相机授权引导 — 需在用户点击后请求权限（iOS Safari 要求） */
export function CameraPermissionGate({
  title = '开启相机取景',
  error = null,
  loading = false,
  enableLabel = '允许使用相机',
  onEnable,
  onCancel,
}: CameraPermissionGateProps) {
  const support = getCameraSupport()
  const blocked = !support.ok
  const message = error ?? (blocked ? support.message : null)
  const hint = blocked ? support.hint : null

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-void-950/96 px-6">
      <div className="max-w-xs text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gold-muted/30 bg-void-800/80">
          <Camera className="h-8 w-8 text-gold-muted" />
        </div>
        <h2 className="mb-2 text-base font-medium text-mist">
          {message ? '无法访问摄像头' : title}
        </h2>
        {message && (
          <p className="mb-3 text-sm leading-relaxed text-mist-muted">{message}</p>
        )}
        {hint && (
          <p className="mb-4 text-xs leading-relaxed text-gold-muted/90">{hint}</p>
        )}
        {!message && (
          <p className="mb-4 text-xs leading-relaxed text-mist-faint">
            点击下方按钮后，系统将请求相机权限
          </p>
        )}
        <ul className="mb-6 space-y-1.5 text-left text-xs text-mist-faint">
          <li>· 请使用 https:// 地址访问（手机局域网测试）</li>
          <li>· iPhone：设置 → Safari → 相机 → 允许</li>
          <li>· 关闭其他占用摄像头的应用</li>
        </ul>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={loading || blocked}
            onPointerDown={(e) => {
              e.preventDefault()
              if (!blocked) onEnable()
            }}
            className="rounded-full border border-jade-muted/40 bg-jade-deep/30 py-2.5 text-sm text-jade-bright disabled:opacity-50"
            style={{ touchAction: 'none' }}
          >
            {loading ? '正在启动…' : message ? '重新授权' : enableLabel}
          </button>
          {onCancel && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault()
                onCancel()
              }}
              className="rounded-full border border-mist-faint/20 py-2 text-xs text-mist-muted"
              style={{ touchAction: 'none' }}
            >
              返回
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
