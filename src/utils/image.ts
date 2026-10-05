/**
 * Turning a picked picture into WebP, in the browser.
 *
 * The avatar endpoint checks the WebP magic bytes and refuses anything else, so
 * the conversion has to happen here — and doing it here is also what keeps a
 * 4 MB phone photo from being uploaded whole for a 64-pixel circle, or a 12 MP
 * photo from being sent at full size into a chat.
 */

/** Avatars are drawn at 40–80 px; 512 leaves room for a retina profile page. */
export const AVATAR_IMAGE = { maxDimension: 512, quality: 0.9 } as const

/**
 * A picture sent as a message. Larger than an avatar, and lossier: it is looked
 * at on a screen rather than at 100%, and the difference at 1600 px is hard to
 * see while the size difference is not.
 */
export const MESSAGE_IMAGE = { maxDimension: 1_600, quality: 0.85 } as const

export type WebpOptions = {
  maxDimension: number
  quality: number
}

export async function fileToWebp(
  file: File,
  options: WebpOptions = AVATAR_IMAGE,
): Promise<Uint8Array> {
  // `createImageBitmap` is the only decoder that applies the EXIF orientation
  // flag; an `<img>` would silently rotate portrait photos by 90 degrees.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })

  try {
    const scale = Math.min(1, options.maxDimension / Math.max(bitmap.width, bitmap.height))
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
      canvas.toBlob(resolve, 'image/webp', options.quality)
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
