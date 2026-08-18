/** 云端迷宫 — Day 3 玉皇顶 */
export const CLOUD_MAZE_DEFAULTS = {
  cols: 9,
  rows: 11,
  ballRadius: 9,
  goalRadius: 16,
  friction: 0.91,
  accelScale: 0.38,
  tiltSmoothing: 0.14,
  maxSpeed: 4.2,
  backgroundImage: '/assets/silhouette-castle-lake.png',
  rewardLingyuan: 30,
} as const
