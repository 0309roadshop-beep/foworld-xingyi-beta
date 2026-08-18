export async function captureVideoFrame(
  video: HTMLVideoElement,
  overlay?: HTMLElement | null,
): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth || window.innerWidth
  canvas.height = video.videoHeight || window.innerHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

  if (overlay) {
    const overlayCanvas = await htmlToCanvas(overlay, canvas.width, canvas.height)
    ctx.drawImage(overlayCanvas, 0, 0, canvas.width, canvas.height)
  }

  return canvas.toDataURL('image/jpeg', 0.92)
}

async function htmlToCanvas(
  element: HTMLElement,
  width: number,
  height: number,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  const svgData = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">
        ${new XMLSerializer().serializeToString(element.cloneNode(true) as Node)}
      </foreignObject>
    </svg>`

  const img = new Image()
  const blob = new Blob([svgData], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
    img.src = url
  })

  ctx.drawImage(img, 0, 0, width, height)
  URL.revokeObjectURL(url)
  return canvas
}
