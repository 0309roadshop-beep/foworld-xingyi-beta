import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  AR_SCAN_DROPS,
  MOCK_FRAGMENTS,
  MOCK_PLAYER,
  MOCK_RECORDS,
  getMerchantById,
  getProductById,
} from '../mock/data'
import type { CollectionRecord, Fragment, Player, RedeemedVoucher, SpiritPath } from '../types'

function nowTimestamp() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function generateVoucherCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'FW-'
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

interface PlayerContextValue {
  player: Player
  inventory: Fragment[]
  records: CollectionRecord[]
  vouchers: RedeemedVoucher[]
  isActivated: boolean
  register: (form: {
    nickname: string
    phone?: string
    spiritPath: SpiritPath
    cardCode: string
  }) => void
  addSpiritDrops: (amount: number) => void
  addFragment: (fragment: Omit<Fragment, 'quantity'>, quantity?: number) => void
  addRecord: (record: Omit<CollectionRecord, 'id' | 'timestamp'>) => void
  collectFromAR: (location?: string) => Fragment
  redeemProduct: (productId: string) => RedeemedVoucher | null
}

const PlayerContext = createContext<PlayerContextValue | null>(null)

const ACTIVATION_STORAGE_KEY = 'foworld-player-activated'

function readActivatedFromSession(): boolean {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem(ACTIVATION_STORAGE_KEY) === '1'
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player>(MOCK_PLAYER)
  const [inventory, setInventory] = useState<Fragment[]>(MOCK_FRAGMENTS)
  const [records, setRecords] = useState<CollectionRecord[]>(MOCK_RECORDS)
  const [vouchers, setVouchers] = useState<RedeemedVoucher[]>([])
  const [isActivated, setIsActivated] = useState(readActivatedFromSession)

  const addSpiritDrops = useCallback((amount: number) => {
    setPlayer((prev) => ({
      ...prev,
      spiritDrops: prev.spiritDrops + amount,
    }))
  }, [])

  const addFragment = useCallback(
    (fragment: Omit<Fragment, 'quantity'>, quantity = 1) => {
      setInventory((prev) => {
        const existing = prev.find((f) => f.id === fragment.id)
        if (existing) {
          return prev.map((f) =>
            f.id === fragment.id
              ? { ...f, quantity: f.quantity + quantity }
              : f,
          )
        }
        return [...prev, { ...fragment, quantity }]
      })
    },
    [],
  )

  const addRecord = useCallback(
    (record: Omit<CollectionRecord, 'id' | 'timestamp'>) => {
      setRecords((prev) => [
        {
          ...record,
          id: uid('rec'),
          timestamp: nowTimestamp(),
        },
        ...prev,
      ])
    },
    [],
  )

  const register = useCallback(
    (form: {
      nickname: string
      phone?: string
      spiritPath: SpiritPath
      cardCode: string
    }) => {
      const id = String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')
      setPlayer({
        id,
        title: `${id}号唤灵师`,
        nickname: form.nickname,
        phone: form.phone,
        spiritPath: form.spiritPath,
        spiritDrops: 150,
      })
      setIsActivated(true)
      sessionStorage.setItem(ACTIVATION_STORAGE_KEY, '1')
      addRecord({
        type: 'register',
        title: `「${form.nickname}」完成唤灵师注册`,
        location: 'FOWORLD 灵域',
        detail: `实体卡 ${form.cardCode} 验证通过 · 灵系觉醒`,
      })
    },
    [addRecord],
  )

  const collectFromAR = useCallback(
    (location = '万峰林八卦田') => {
      const drop =
        AR_SCAN_DROPS[Math.floor(Math.random() * AR_SCAN_DROPS.length)]
      addFragment(drop, 1)
      addSpiritDrops(10)
      addRecord({
        type: 'ar_scan',
        title: 'AR 罗盘扫描',
        location,
        detail: '在实景中完成灵源定位扫描',
      })
      addRecord({
        type: 'fragment_obtained',
        title: `获得「${drop.name}」`,
        location,
        detail: '扫描采集时同步获取',
      })
      return { ...drop, quantity: 1 }
    },
    [addFragment, addRecord, addSpiritDrops],
  )

  const redeemProduct = useCallback(
    (productId: string): RedeemedVoucher | null => {
      const product = getProductById(productId)
      if (!product || product.stock <= 0) return null

      const merchant = getMerchantById(product.merchantId)
      if (!merchant) return null

      if (player.spiritDrops < product.price) return null

      setPlayer((prev) => ({
        ...prev,
        spiritDrops: prev.spiritDrops - product.price,
      }))

      const voucher: RedeemedVoucher = {
        id: uid('voucher'),
        productId: product.id,
        productName: product.name,
        merchantName: merchant.name,
        code: generateVoucherCode(),
        redeemedAt: nowTimestamp(),
        used: false,
      }

      setVouchers((prev) => [voucher, ...prev])

      addRecord({
        type: 'redemption',
        title: `兑换「${product.name}」`,
        location: merchant.name,
        detail: `消耗 ${product.price} 灵源滴 · 兑换码 ${voucher.code}`,
      })

      return voucher
    },
    [player.spiritDrops, addRecord],
  )

  const value = useMemo(
    () => ({
      player,
      inventory,
      records,
      vouchers,
      isActivated,
      register,
      addSpiritDrops,
      addFragment,
      addRecord,
      collectFromAR,
      redeemProduct,
    }),
    [
      player,
      inventory,
      records,
      vouchers,
      isActivated,
      register,
      addSpiritDrops,
      addFragment,
      addRecord,
      collectFromAR,
      redeemProduct,
    ],
  )

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  )
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) {
    throw new Error('usePlayer must be used within PlayerProvider')
  }
  return ctx
}
