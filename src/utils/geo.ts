const R = Math.PI / 180

/** 计算两点间方位角（度，正北为 0，顺时针） */
export function getBearing(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const lat1 = from.latitude * R
  const lat2 = to.latitude * R
  const dLng = (to.longitude - from.longitude) * R

  const y = Math.sin(dLng) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

/** 计算两点间距离（米） */
export function getDistanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const lat1 = from.latitude * R
  const lat2 = to.latitude * R
  const dLat = (to.latitude - from.latitude) * R
  const dLng = (to.longitude - from.longitude) * R

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `约 ${Math.round(meters)} m`
  return `约 ${(meters / 1000).toFixed(1)} km`
}
