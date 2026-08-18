/** 安全释放 MediaStream 并停止所有 track */
export function releaseMediaStream(stream: MediaStream | null | undefined): void {
  if (!stream) return
  stream.getTracks().forEach((track) => track.stop())
}

/** 释放 video 元素绑定的流并清空 srcObject */
export function releaseVideoElement(video: HTMLVideoElement | null | undefined): void {
  if (!video) return
  const src = video.srcObject
  if (src instanceof MediaStream) {
    releaseMediaStream(src)
  }
  video.srcObject = null
}
