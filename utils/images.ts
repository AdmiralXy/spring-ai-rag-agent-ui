/** Image types every supported provider accepts */
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
export const MAX_IMAGES = 10
/** Provider limit per image (Anthropic: 5 MB) */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
/** Longer side of a sent image; providers downscale larger images anyway, so this only saves tokens */
const MAX_SIDE = 2048

export function isImageFile(file: File): boolean {
  return IMAGE_TYPES.includes(file.type)
}

export function attachmentUrl(attachment: ChatAttachment): string {
  return `data:${attachment.mimeType};base64,${attachment.data}`
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read the image'))
    reader.readAsDataURL(blob)
  })
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Not a valid image'))
    image.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to encode the image'))),
      type,
      quality
    )
  })
}

/**
 * Turns a picked, pasted or dropped image into an attachment. Large screenshots are scaled down (longer side
 * 2048 px) and re-encoded when they exceed the size limit; animated GIFs are sent as they are.
 */
export async function toImageAttachment(file: File): Promise<ChatAttachment> {
  if (!isImageFile(file)) {
    throw new Error(`Unsupported image type: ${file.type || file.name}`)
  }
  const name = file.name || 'screenshot.png'
  let blob: Blob = file
  let mimeType = file.type

  if (file.type !== 'image/gif') {
    const original = await readAsDataUrl(file)
    const image = await loadImage(original)
    const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight))
    if (scale < 1 || file.size > MAX_IMAGE_BYTES) {
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
      canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
      // screenshots stay sharp as PNG; fall back to JPEG when that is still too big
      blob = await canvasToBlob(canvas, 'image/png')
      mimeType = 'image/png'
      if (blob.size > MAX_IMAGE_BYTES) {
        blob = await canvasToBlob(canvas, 'image/jpeg', 0.9)
        mimeType = 'image/jpeg'
      }
    }
  }

  if (blob.size > MAX_IMAGE_BYTES) {
    throw new Error(`${name} is larger than ${MAX_IMAGE_BYTES / (1024 * 1024)} MB`)
  }
  const dataUrl = await readAsDataUrl(blob)
  return { mimeType, data: dataUrl.slice(dataUrl.indexOf(',') + 1), name }
}
