/** 登云踏雾 · 垂直卷轴跳跃（无尽模式） */
export const CLOUD_LEAP_DEFAULTS = {
  milestoneM: 1000,
  pixelsPerMeter: 4,
  unlockSpirit: '玉皇云灵',
  rewardLingyuan: 50,
  spiritImage: '/assets/silhouette-castle-lake.png',
  platformImage: '/assets/cloud-leap-platform.png',
  backgroundImage: '/assets/cloud-leap-bg.png',
  playerImage: '/assets/cloud-jump-summoner.png',
} as const

export const CLOUD_LEAP_PLAYER_IMAGE = CLOUD_LEAP_DEFAULTS.playerImage
/** 唤灵师贴图尺寸（逻辑像素） */
export const CLOUD_LEAP_PLAYER_SPRITE_W = 60
export const CLOUD_LEAP_PLAYER_SPRITE_H = 64
/** 脚底窄碰撞盒 — 仅靴尖区域参与踩云判定 */
export const CLOUD_LEAP_PLAYER_FOOT_W = 22
export const CLOUD_LEAP_PLAYER_FOOT_DEPTH = 6
/** 云朵贴图表面可踩踏深度 */
export const CLOUD_LEAP_PLATFORM_SURFACE_DEPTH = 7

export const CLOUD_LEAP_PLAYER_W = 28
export const CLOUD_LEAP_PLAYER_H = 36
export const CLOUD_LEAP_PLATFORM_H = 14
export const CLOUD_LEAP_PLATFORM_SPRITE_H = 50
export const CLOUD_LEAP_PLATFORM_SPRITE_W = 100
export const CLOUD_LEAP_PLATFORM_SURFACE_OFFSET = 26
export const CLOUD_LEAP_PLATFORM_IMAGE = CLOUD_LEAP_DEFAULTS.platformImage
export const CLOUD_LEAP_BG_IMAGE = CLOUD_LEAP_DEFAULTS.backgroundImage

/** 起跳力度（踩云自动弹跳） */
export const CLOUD_LEAP_JUMP = 6.2
export const CLOUD_LEAP_GRAVITY = 0.19
/** 顶点滞空区更宽、重力更弱 */
export const CLOUD_LEAP_APEX_HANG_VY = 2.6
export const CLOUD_LEAP_APEX_GRAVITY_MULT = 0.28

export const CLOUD_LEAP_MOVE_SPEED = 1.85
export const CLOUD_LEAP_CAMERA_ANCHOR = 0.45
/** 背景随镜头线性滚动（repeat-y，禁止 modulo 跳变） */
export const CLOUD_LEAP_BG_SCROLL_RATIO = 0.22

/** 云朵贴图透明边距收缩 — 碰撞判定用实体包围盒 */
export const CLOUD_LEAP_PLATFORM_HITBOX = {
  paddingLeft: 15,
  paddingRight: 15,
  paddingTop: 10,
} as const

/** 云朵垂直间距硬约束（视口高度 20%，像素域 100–130px） */
export const CLOUD_LEAP_GAP_MIN_PX = 42
export const CLOUD_LEAP_GAP_MAX_SCREEN_RATIO = 0.2
export const CLOUD_LEAP_GAP_MAX_PX = 130
export const CLOUD_LEAP_GAP_MIN_HARD_PX = 100

/** 生成易碎云概率 */
export const CLOUD_LEAP_FRAGILE_CHANCE = 0.3

/** 易碎云踩碎后消散动画时长（ms） */
export const CLOUD_LEAP_FRAGILE_BREAK_MS = 450

/** 易碎云视觉宽度相对普通云的比例 */
export const CLOUD_LEAP_FRAGILE_WIDTH_RATIO = 0.8

/** 易碎云碎裂下落速度（px / 16ms 帧） */
export const CLOUD_LEAP_FRAGILE_FALL_SPEED = 2.8
