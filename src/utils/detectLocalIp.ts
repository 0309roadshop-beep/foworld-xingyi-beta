/** 通过 WebRTC 尝试获取本机局域网 IP（仅供开发试玩引导） */
export function detectLocalNetworkIp(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.RTCPeerConnection) {
      resolve(null)
      return
    }

    const ips = new Set<string>()
    const pc = new RTCPeerConnection({ iceServers: [] })
    const timer = window.setTimeout(() => {
      pc.close()
      resolve(pickLanIp(ips))
    }, 3200)

    pc.createDataChannel('ip-probe')
    pc.onicecandidate = (event) => {
      if (!event.candidate) {
        window.clearTimeout(timer)
        pc.close()
        resolve(pickLanIp(ips))
        return
      }
      const match = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/.exec(event.candidate.candidate)
      if (match) ips.add(match[1])
    }

    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .catch(() => {
        window.clearTimeout(timer)
        pc.close()
        resolve(null)
      })
  })
}

function pickLanIp(ips: Set<string>): string | null {
  const list = [...ips]
  const privateIp =
    list.find((ip) => ip.startsWith('192.168.')) ??
    list.find((ip) => ip.startsWith('10.')) ??
    list.find((ip) => /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip))
  return privateIp ?? list[0] ?? null
}
