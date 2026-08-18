/** 将拼图原图按 grid×grid 切成独立 Blob URL（兼容 Safari 真机） */
export async function sliceImageToPieces(
  imageUrl: string,
  grid: number,
): Promise<{ pieceUrls: string[]; aspect: number }> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.decoding = 'async'
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error(`拼图原图加载失败: ${imageUrl}`))
    el.src = imageUrl
  })

  if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
    throw new Error('拼图原图尺寸无效')
  }

  const sw = Math.floor(img.naturalWidth / grid)
  const sh = Math.floor(img.naturalHeight / grid)
  const pieceUrls: string[] = []

  for (let row = 0; row < grid; row++) {
    for (let col = 0; col < grid; col++) {
      const pieceId = row * grid + col
      const canvas = document.createElement('canvas')
      canvas.width = sw
      canvas.height = sh
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas 2D 不可用')

      ctx.drawImage(img, col * sw, row * sh, sw, sh, 0, 0, sw, sh)

      const blob = await new Promise<Blob>((res, rej) => {
        canvas.toBlob(
          (b) => (b ? res(b) : rej(new Error('拼图切片失败'))),
          'image/jpeg',
          0.92,
        )
      })
      pieceUrls[pieceId] = URL.createObjectURL(blob)
    }
  }

  return { pieceUrls, aspect: img.naturalWidth / img.naturalHeight }
}

export function revokePieceUrls(urls: string[]) {
  for (const url of urls) {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url)
  }
}
