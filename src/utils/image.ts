/**
 * Turning a picked picture into the one format the avatar endpoint accepts.
 *
 * The server checks the WebP magic bytes, so the conversion has to happen here —
 * and doing it in the browser is also what keeps a 4 MB phone photo from being
 * uploaded whole for a 64-pixel circle.
 */

/** Avatars are drawn at 40–80 px; 512 leaves room for a retina profile page. */
const MAX_DIMENSION = 512
const WEBP_QUALITY = 0.9

export async function fileToWebp(file: File): Promise<Uint8Array> {
  // `createImageBitmap` is the only decoder that applies the EXIF orientation
  // flag; an `<img>` would silently rotate portrait photos by 90 degrees.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })

  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (context === null) {
      throw new Error('[image] this browser has no 2D canvas context')
    }
    context.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY)
    })
    if (blob === null) {
      throw new Error('[image] this browser cannot encode WebP')
    }

    return new Uint8Array(await blob.arrayBuffer())
  } finally {
    bitmap.close()
  }
}

/** True for a file the avatar endpoint will accept before we decode it. */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}
