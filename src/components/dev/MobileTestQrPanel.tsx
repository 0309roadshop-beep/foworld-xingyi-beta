import QRCode from 'qrcode'
import { AlertTriangle, Copy, RefreshCw, Smartphone, Wifi } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { detectLocalNetworkIp } from '../../utils/detectLocalIp'

const STORAGE_PREFIX = 'foworld-mobile-test-base:'
const DEFAULT_PORT = '5173'

type DevProtocol = 'http' | 'https'

function isLocalHost(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return host === 'localhost' || host === '127.0.0.1'
  } catch {
    return url.includes('localhost') || url.includes('127.0.0.1')
  }
}

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

function getCurrentDevProtocol(): DevProtocol {
  if (typeof window === 'undefined') return 'https'
  return window.location.protocol === 'https:' ? 'https' : 'http'
}

function buildLanBase(ip: string, port = DEFAULT_PORT, protocol: DevProtocol = 'https'): string {
  return `${protocol}://${ip}:${port}`
}

function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '')
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function preferHttpsUrl(url: string): string {
  if (!url || isLocalHost(url)) return url
  return url.replace(/^http:/i, 'https:')
}

export interface MobileTestQrPanelProps {
  /** 测试路由，建议使用免登录的 /test/... */
  path?: string
  title?: string
}

/**
 * 桌面端展示扫码面板；手机打开游戏页时自动隐藏。
 */
export function MobileTestQrPanel({
  path = '/test/wind-balance',
  title = '手机真机试玩 · 御风引气',
}: MobileTestQrPanelProps) {
  const serverProtocol = useMemo(() => getCurrentDevProtocol(), [])
  const [protocol, setProtocol] = useState<DevProtocol>('https')
  const [baseUrl, setBaseUrl] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [detectedIp, setDetectedIp] = useState<string | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [detectError, setDetectError] = useState<string | null>(null)

  const testUrl = useMemo(() => {
    if (!baseUrl) return ''
    return `${baseUrl.replace(/\/$/, '')}${path}`
  }, [baseUrl, path])

  const qrBlocked = !baseUrl || isLocalHost(baseUrl)

  const usingHttpOnPhone =
    !qrBlocked && baseUrl.startsWith('http://')

  const devServerStillHttp =
    !qrBlocked && baseUrl.startsWith('https://') && serverProtocol === 'http'

  useEffect(() => {
    if (typeof window === 'undefined') return
    const origin = window.location.origin
    const saved = sessionStorage.getItem(`${STORAGE_PREFIX}${path}`)
    if (saved && !isLocalHost(saved)) {
      const url = preferHttpsUrl(saved)
      sessionStorage.setItem(`${STORAGE_PREFIX}${path}`, url)
      setBaseUrl(url)
      setProtocol('https')
      return
    }
    if (!isLocalHost(origin)) {
      const url = preferHttpsUrl(origin)
      setBaseUrl(url)
      setProtocol(url.startsWith('https://') ? 'https' : 'http')
    }
  }, [path])

  useEffect(() => {
    let cancelled = false
    setDetecting(true)
    detectLocalNetworkIp()
      .then((ip) => {
        if (!cancelled) {
          setDetectedIp(ip)
          setDetectError(ip ? null : '未能自动检测，请手动填写下方地址')
        }
      })
      .catch(() => {
        if (!cancelled) setDetectError('自动检测失败，请手动填写局域网 IP')
      })
      .finally(() => {
        if (!cancelled) setDetecting(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!testUrl || qrBlocked) {
      setQrDataUrl('')
      return
    }
    let cancelled = false
    QRCode.toDataURL(testUrl, {
      width: 200,
      margin: 2,
      color: { dark: '#0f172a', light: '#ecfeff' },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('')
      })
    return () => {
      cancelled = true
    }
  }, [testUrl, qrBlocked])

  const handleBaseChange = useCallback(
    (value: string) => {
      const normalized = normalizeBaseUrl(value)
      setBaseUrl(normalized)
      if (normalized) {
        setProtocol(normalized.startsWith('https://') ? 'https' : 'http')
        sessionStorage.setItem(`${STORAGE_PREFIX}${path}`, normalized)
      }
    },
    [path],
  )

  const applyDetectedIp = useCallback(() => {
    if (!detectedIp) return
    const port = (() => {
      try {
        return new URL(window.location.href).port || DEFAULT_PORT
      } catch {
        return DEFAULT_PORT
      }
    })()
    handleBaseChange(buildLanBase(detectedIp, port, protocol))
  }, [detectedIp, handleBaseChange, protocol])

  const switchProtocol = useCallback(
    (next: DevProtocol) => {
      setProtocol(next)
      if (!baseUrl || isLocalHost(baseUrl)) return
      try {
        const url = new URL(baseUrl)
        url.protocol = `${next}:`
        handleBaseChange(url.toString().replace(/\/$/, ''))
      } catch {
        /* 忽略 */
      }
    },
    [baseUrl, handleBaseChange],
  )

  const copyUrl = useCallback(async () => {
    if (!testUrl || qrBlocked) return
    try {
      await navigator.clipboard.writeText(testUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* 忽略 */
    }
  }, [testUrl, qrBlocked])

  if (isMobileDevice()) return null

  return (
    <div className="mb-4 rounded-xl border border-cyan-400/30 bg-cyan-950/30 px-4 py-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center gap-2">
        <Smartphone className="h-4 w-4 text-cyan-300" />
        <p className="text-xs font-medium tracking-wide text-cyan-100">{title}</p>
      </div>

      <ol className="mb-4 space-y-2 text-[11px] leading-relaxed text-mist-muted">
        <li>
          <span className="font-medium text-cyan-100">① 启动开发服务</span>
          <br />
          在项目文件夹打开终端，运行 <code className="text-cyan-200/90">npm run dev</code>
          ，保持窗口不要关闭。
        </li>
        <li>
          <span className="font-medium text-cyan-100">② 确认局域网地址与协议</span>
          <br />
          看终端 <strong className="text-mist">Network:</strong> 一行，必须是{' '}
          <code className="text-cyan-200/90">https://192.168.x.x:5173</code>。iPhone
          陀螺仪<strong className="text-mist">只能用 https</strong>（http 会报 2b）。若终端仍是
          http，请先 Ctrl+C 重启 <code>npm run dev</code>。
        </li>
        <li>
          <span className="font-medium text-cyan-100">③ 填入下方地址并生成二维码</span>
          <br />
          点击「填入检测到的 IP」或手动粘贴 Network 地址（只填到端口号，不带路径）。
        </li>
        <li>
          <span className="font-medium text-cyan-100">④ 手机扫码或复制链接</span>
          <br />
          手机与电脑连<strong className="text-mist">同一 Wi‑Fi</strong>。安卓请用{' '}
          <strong className="text-mist">Chrome</strong> 打开（微信内置浏览器常不可用）。
        </li>
        <li>
          <span className="font-medium text-cyan-100">⑤ 进入后点击开始</span>
          <br />
          iPhone 会弹出「动作与方向」授权；安卓无系统弹窗，点「开始」后直接倾斜手机。安卓重力感应需
          https 地址（重启 dev 后终端会显示 https://）。
        </li>
      </ol>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-mist-faint">链接协议</span>
        <button
          type="button"
          onClick={() => switchProtocol('http')}
          className={`rounded-md border px-2.5 py-1 text-[10px] ${
            protocol === 'http'
              ? 'border-cyan-300/50 bg-cyan-900/60 text-cyan-100'
              : 'border-white/15 text-mist-faint'
          }`}
        >
          HTTP
        </button>
        <button
          type="button"
          onClick={() => switchProtocol('https')}
          className={`rounded-md border px-2.5 py-1 text-[10px] ${
            protocol === 'https'
              ? 'border-cyan-300/50 bg-cyan-900/60 text-cyan-100'
              : 'border-white/15 text-mist-faint'
          }`}
        >
          HTTPS
        </button>
        <button
          type="button"
          disabled={!detectedIp || detecting}
          onClick={applyDetectedIp}
          className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/35 bg-cyan-950/50 px-2.5 py-1.5 text-[10px] text-cyan-100 disabled:opacity-40"
        >
          <Wifi className="h-3 w-3" />
          {detecting ? '正在检测局域网 IP…' : '填入检测到的 IP'}
        </button>
        {detectedIp && (
          <span className="text-[10px] text-mist-faint">检测到：{detectedIp}</span>
        )}
        {detectError && !detectedIp && (
          <span className="text-[10px] text-amber-200/80">{detectError}</span>
        )}
      </div>

      <label className="mb-1 block text-[10px] text-mist-faint">
        电脑局域网地址（示例：{protocol}://192.168.1.8:5173）
      </label>
      <input
        type="url"
        value={baseUrl}
        onChange={(e) => handleBaseChange(e.target.value)}
        placeholder={`${protocol}://192.168.1.100:${DEFAULT_PORT}`}
        className="mb-3 w-full rounded-lg border border-white/15 bg-black/40 px-2.5 py-2 text-xs text-mist outline-none ring-cyan-400/40 focus:ring-1"
      />

      {qrBlocked && (
        <div className="mb-3 flex gap-2 rounded-lg border border-amber-400/35 bg-amber-950/35 px-3 py-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <p className="text-[10px] leading-relaxed text-amber-100/95">
            当前地址是 localhost，手机无法访问。请改成终端 Network 里的局域网 IP 后，二维码才会生成。
            本测试走 <code className="text-amber-50">/test/wind-balance</code>{' '}
            免登录通道，扫码后不会跳到注册页。
          </p>
        </div>
      )}

      {devServerStillHttp && (
        <div className="mb-3 flex gap-2 rounded-lg border border-red-400/40 bg-red-950/35 px-3 py-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
          <p className="text-[10px] leading-relaxed text-red-100/95">
            二维码是 https://，但电脑当前 dev 服务仍是 http://，手机扫码会失败。
            请在终端 <strong>Ctrl+C</strong> 停止后重新运行 <code>npm run dev</code>，确认
            Network 行变为 https:// 后再生成二维码。
          </p>
        </div>
      )}

      {usingHttpOnPhone && (
        <div className="mb-3 flex gap-2 rounded-lg border border-red-400/40 bg-red-950/35 px-3 py-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
          <p className="text-[10px] leading-relaxed text-red-100/95">
            当前二维码是 <strong>http://</strong>，iPhone 会触发陀螺仪 2b 拦截。
            请点上方 <strong>HTTPS</strong>，重新填入 IP 并生成二维码。
          </p>
        </div>
      )}

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        {qrDataUrl && !qrBlocked ? (
          <img
            src={qrDataUrl}
            alt="手机试玩二维码"
            className="h-[200px] w-[200px] shrink-0 rounded-lg border border-white/15 bg-white p-1"
          />
        ) : (
          <div className="flex h-[200px] w-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-cyan-400/30 px-3 text-center text-[10px] leading-relaxed text-mist-faint">
            <RefreshCw className="h-5 w-5 text-cyan-400/50" />
            填写有效局域网地址后
            <br />
            自动生成二维码
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[10px] font-medium text-mist">完整试玩链接</p>
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/35 px-2.5 py-2">
            <p className="min-w-0 flex-1 break-all text-[11px] text-cyan-100/90">
              {testUrl || '（待生成）'}
            </p>
            <button
              type="button"
              disabled={qrBlocked}
              onClick={() => void copyUrl()}
              className="shrink-0 rounded-md border border-cyan-400/30 px-2 py-1 text-[10px] text-cyan-200 disabled:opacity-40"
            >
              <Copy className="mr-1 inline h-3 w-3" />
              {copied ? '已复制' : '复制'}
            </button>
          </div>

          <details className="rounded-lg border border-white/10 bg-black/25 px-2.5 py-2">
            <summary className="cursor-pointer text-[10px] text-mist-faint">
              打不开？常见原因排查
            </summary>
            <ul className="mt-2 space-y-1.5 pl-3 text-[10px] leading-relaxed text-mist-faint">
              <li>· 二维码协议与 dev 服务不一致（http 服务却扫了 https 码）</li>
              <li>· 手机和电脑不在同一 Wi‑Fi，或手机开了蜂窝/VPN</li>
              <li>· 地址仍写成 localhost / 127.0.0.1（仅本机可访问）</li>
              <li>· 电脑防火墙拦截了 5173 端口（可暂时允许 Node/Vite）</li>
              <li>· 用了需登录的 /wind-balance；请用免登录的 /test/wind-balance</li>
              <li>· 红尘摸金试玩请用免登录 /test/red-dust-scanner</li>
              <li>· iPhone 首次打开 https 自签证书：高级 → 继续访问 / 信任此网站</li>
              <li>· 切勿使用 http:// 地址，本项目 dev 仅支持 https://</li>
              <li>· 微信内置浏览器常限制传感器，安卓请复制链接到 Chrome 打开</li>
              <li>· 终端没有 Network 行：确认 vite.config 中 host 为 true 后重启 dev</li>
            </ul>
          </details>
        </div>
      </div>
    </div>
  )
}

export default MobileTestQrPanel
