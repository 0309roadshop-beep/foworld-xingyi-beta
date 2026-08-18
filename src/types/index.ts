export type SpiritPath = 'gold' | 'wood' | 'water' | 'fire' | 'earth'

export interface Player {
  id: string
  title: string
  nickname: string
  phone?: string
  spiritPath: SpiritPath
  spiritDrops: number
}

export interface RegisterForm {
  nickname: string
  phone: string
  spiritPath: SpiritPath
  cardCode: string
}

export type TaskType = 'main' | 'side'
export type TaskStatus = 'locked' | 'available' | 'in_progress' | 'completed'

export interface TaskReward {
  spiritDrops: number
  label?: string
}

export interface Task {
  id: string
  type: TaskType
  title: string
  location: string
  description: string
  lore?: string
  objectives: string[]
  reward: TaskReward
  status: TaskStatus
  distance?: string
  coords: {
    latitude: number
    longitude: number
  }
}

export type FragmentRarity = 'common' | 'rare' | 'legendary'

export interface Fragment {
  id: string
  name: string
  description: string
  rarity: FragmentRarity
  emoji: string
  quantity: number
  source: string
}

export type RecordType =
  | 'task_complete'
  | 'ar_scan'
  | 'fragment_obtained'
  | 'redemption'
  | 'register'

export interface CollectionRecord {
  id: string
  type: RecordType
  title: string
  location: string
  timestamp: string
  detail?: string
}

export interface Merchant {
  id: string
  name: string
  tagline: string
  emoji: string
  category: 'bar' | 'food'
  address: string
}

export interface MerchantProduct {
  id: string
  merchantId: string
  name: string
  description: string
  price: number
  emoji: string
  stock: number
}

export interface RedeemedVoucher {
  id: string
  productId: string
  productName: string
  merchantName: string
  code: string
  redeemedAt: string
  used: boolean
}

export interface GeoCoords {
  latitude: number
  longitude: number
  accuracy: number | null
}

export type GeoStatus = 'idle' | 'loading' | 'success' | 'error'
