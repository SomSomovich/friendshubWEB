/**
 * What a downloaded attachment actually is.
 *
 * The API never says. `AttachmentRecord` has no content type, the message
 * payload carries bare ids, and the download endpoint answers with sizes and
 * URLs — so a receiver has nothing but the bytes to go on, and the bytes are
 * what this reads.
 *
 * The one case magic numbers cannot settle is WebM: `MediaRecorder` produces the
 * same container for a voice note as for a camera recording, and the difference
 * is whether a video track exists. That is what `hasVideoTrack` looks for.
 */

export type AttachmentMime = {
  /** Best guess at a MIME type; `application/octet-stream` when nothing matches. */
  type: string
  /** Which renderer the UI should reach for. */
  family: 'image' | 'video' | 'audio' | 'file'
}

const SIGNATURES: ReadonlyArray<{ bytes: number[]; type: string; family: AttachmentMime['family'] }> = [
  { bytes: [0x52, 0x49, 0x46, 0x46], type: 'image/webp', family: 'image' }, // RIFF, refined below
  { bytes: [0xff, 0xd8, 0xff], type: 'image/jpeg', family: 'image' },
  { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], type: 'image/png', family: 'image' },
  { bytes: [0x47, 0x49, 0x46, 0x38], type: 'image/gif', family: 'image' },
  { bytes: [0x25, 0x50, 0x44, 0x46], type: 'application/pdf', family: 'file' },
]

/** EBML, the container both WebM and Matroska start with. */
const EBML_HEADER = [0x1a, 0x45, 0xdf, 0xa3]

export function detectMime(bytes: Uint8Array): AttachmentMime {
  for (const signature of SIGNATURES) {
    if (!startsWith(bytes, signature.bytes)) {
      continue
    }
    // RIFF is a container: only the four bytes after the size say what is in it.
    if (signature.type === 'image/webp' && !startsWithAt(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
      continue
    }
    return { type: signature.type, family: signature.family }
  }

  if (startsWith(bytes, EBML_HEADER)) {
    // WebM: audio or video depends on the tracks, which only the header knows.
    return hasVideoTrack(bytes)
      ? { type: 'video/webm', family: 'video' }
      : { type: 'audio/webm', family: 'audio' }
  }
  if (startsWithAt(bytes, [0x4f, 0x67, 0x67, 0x53], 0)) {
    return { type: 'audio/ogg', family: 'audio' }
  }
  if (startsWithAt(bytes, [0x66, 0x74, 0x79, 0x70], 4)) {
    // ISO base media: a brand of `M4A ` is audio, everything else is treated as
    // video, which is the safe way round — a video element plays an audio track
    // perfectly well, and an audio element given a video container does not.
    const brand = String.fromCharCode(...bytes.subarray(8, 12))
    return brand.startsWith('M4A')
      ? { type: 'audio/mp4', family: 'audio' }
      : { type: 'video/mp4', family: 'video' }
  }

  return { type: 'application/octet-stream', family: 'file' }
}

/**
 * Whether a WebM stream carries a video track.
 *
 * A heuristic, and deliberately a shallow one: Matroska's `TrackType` element
 * (id `0x83`, one byte long in every file a browser produces) sits in the header,
 * and the values are `0x01` for video and `0x02` for audio. Scanning the opening
 * kilobytes for it is enough to tell a camera recording from a voice note, and
 * getting it wrong costs a black rectangle above a working audio track — which
 * is exactly what a video element does with audio-only content.
 */
function hasVideoTrack(bytes: Uint8Array): boolean {
  const limit = Math.min(bytes.length, 4_096)
  for (let index = 0; index < limit - 2; index += 1) {
    if (bytes[index] === 0x83 && bytes[index + 1] === 0x81) {
      if (bytes[index + 2] === 0x01) {
        return true
      }
      if (bytes[index + 2] === 0x02) {
        return false
      }
    }
  }
  // Nothing conclusive: assume video, because a video element plays audio too.
  return true
}

function startsWith(bytes: Uint8Array, prefix: number[]): boolean {
  return startsWithAt(bytes, prefix, 0)
}

function startsWithAt(bytes: Uint8Array, prefix: number[], offset: number): boolean {
  if (bytes.length < offset + prefix.length) {
    return false
  }
  return prefix.every((byte, index) => bytes[offset + index] === byte)
}
