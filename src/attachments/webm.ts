const EBML_HEADER = [0x1a, 0x45, 0xdf, 0xa3]
const SEGMENT = 0x18538067
const TRACKS = 0x1654ae6b
const TRACK_ENTRY = 0xae
const TRACK_TYPE = 0x83
const VIDEO = 0xe0
const PIXEL_WIDTH = 0xb0
const PIXEL_HEIGHT = 0xba
const TAGS = 0x1254c367
const TAG = 0x7373
const SIMPLE_TAG = 0x67c8
const TAG_NAME = 0x45a3
const TAG_STRING = 0x4487
const VIDEO_CIRCLE_TAG = 'FRIENDSHUB_VIDEO_CIRCLE'
const VIDEO_CIRCLE_TAG_VALUE = '1'

type EbmlElement = {
  id: number
  idStart: number
  sizeOffset: number
  sizeLength: number
  dataStart: number
  dataEnd: number
  size: number | null
}

export type WebmVideoDimensions = { width: number | null; height: number | null }

/** Reads dimensions from the first video track, when its header is available. */
export function webmVideoDimensions(bytes: Uint8Array): WebmVideoDimensions | null {
  const tracks = webmChildren(bytes, 0, bytes.length)
    .filter((element) => element.id === SEGMENT)
    .flatMap((segment) => webmChildren(bytes, segment.dataStart, segment.dataEnd))
    .find((element) => element.id === TRACKS)
  if (tracks === undefined) return null

  for (const entry of webmChildren(bytes, tracks.dataStart, tracks.dataEnd)) {
    if (entry.id !== TRACK_ENTRY) continue
    const fields = webmChildren(bytes, entry.dataStart, entry.dataEnd)
    const kind = fields.find((field) => field.id === TRACK_TYPE)
    if (kind === undefined || ebmlUnsigned(bytes, kind) !== 1) continue
    const video = fields.find((field) => field.id === VIDEO)
    if (video === undefined) return { width: null, height: null }
    const videoFields = webmChildren(bytes, video.dataStart, video.dataEnd)
    const width = videoFields.find((field) => field.id === PIXEL_WIDTH)
    const height = videoFields.find((field) => field.id === PIXEL_HEIGHT)
    return {
      width: width === undefined ? null : ebmlUnsigned(bytes, width),
      height: height === undefined ? null : ebmlUnsigned(bytes, height),
    }
  }

  return null
}

/** A circle must have both the application tag and the square 360×360 track. */
export function isVideoCircleWebm(bytes: Uint8Array): boolean {
  if (!startsWith(bytes, EBML_HEADER)) return false
  const dimensions = webmVideoDimensions(bytes)
  if (dimensions?.width !== 360 || dimensions.height !== 360) return false

  for (const segment of webmChildren(bytes, 0, bytes.length)) {
    if (segment.id !== SEGMENT) continue
    for (const element of webmChildren(bytes, segment.dataStart, segment.dataEnd)) {
      if (element.id !== TAGS) continue
      for (const tag of webmChildren(bytes, element.dataStart, element.dataEnd)) {
        if (tag.id !== TAG) continue
        for (const simpleTag of webmChildren(bytes, tag.dataStart, tag.dataEnd)) {
          if (simpleTag.id !== SIMPLE_TAG) continue
          const fields = webmChildren(bytes, simpleTag.dataStart, simpleTag.dataEnd)
          const name = fields.find((field) => field.id === TAG_NAME)
          const value = fields.find((field) => field.id === TAG_STRING)
          if (
            name !== undefined &&
            value !== undefined &&
            decodeUtf8(bytes.subarray(name.dataStart, name.dataEnd)) === VIDEO_CIRCLE_TAG &&
            decodeUtf8(bytes.subarray(value.dataStart, value.dataEnd)) === VIDEO_CIRCLE_TAG_VALUE
          ) {
            return true
          }
        }
      }
    }
  }
  return false
}

/** Adds a standards-compliant Matroska Tags element before the first Cluster. */
export async function markVideoCircleWebm(blob: Blob): Promise<Blob> {
  if (!blob.type.toLowerCase().includes('webm')) {
    throw new Error('The video-circle recorder did not produce WebM')
  }
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const dimensions = webmVideoDimensions(bytes)
  if (dimensions?.width !== 360 || dimensions.height !== 360) {
    throw new Error('The video-circle recording is not 360×360 WebM')
  }
  if (isVideoCircleWebm(bytes)) return blob

  const segment = webmChildren(bytes, 0, bytes.length).find((element) => element.id === SEGMENT)
  const tracks = segment === undefined
    ? undefined
    : webmChildren(bytes, segment.dataStart, segment.dataEnd).find((element) => element.id === TRACKS)
  if (segment === undefined || tracks === undefined || segment.sizeOffset < 0) {
    throw new Error('The WebM recording has no writable segment header')
  }

  const tags = createCircleTags()
  const insertionOffset = tracks.dataEnd
  if (segment.size === null) {
    const output = new Uint8Array(bytes.length + tags.length)
    output.set(bytes.subarray(0, insertionOffset), 0)
    output.set(tags, insertionOffset)
    output.set(bytes.subarray(insertionOffset), insertionOffset + tags.length)
    return new Blob([output], { type: 'video/webm' })
  }

  const newSegmentSize = segment.size + tags.length
  const encodedSize = encodeEbmlSize(newSegmentSize, segment.sizeLength)
  const output = new Uint8Array(bytes.length + tags.length + encodedSize.length - segment.sizeLength)
  let offset = 0
  output.set(bytes.subarray(0, segment.sizeOffset), offset)
  offset += segment.sizeOffset
  output.set(encodedSize, offset)
  offset += encodedSize.length
  output.set(bytes.subarray(segment.dataStart, insertionOffset), offset)
  offset += insertionOffset - segment.dataStart
  output.set(tags, offset)
  offset += tags.length
  output.set(bytes.subarray(insertionOffset, segment.dataEnd), offset)
  offset += segment.dataEnd - insertionOffset
  output.set(bytes.subarray(segment.dataEnd), offset)
  return new Blob([output], { type: 'video/webm' })
}

function createCircleTags(): Uint8Array {
  const encoder = new TextEncoder()
  const name = makeElement([0x45, 0xa3], encoder.encode(VIDEO_CIRCLE_TAG))
  const value = makeElement([0x44, 0x87], encoder.encode(VIDEO_CIRCLE_TAG_VALUE))
  const simpleTag = makeElement([0x67, 0xc8], concatenate(name, value))
  const tag = makeElement([0x73, 0x73], simpleTag)
  return makeElement([0x12, 0x54, 0xc3, 0x67], tag)
}

function makeElement(id: number[], data: Uint8Array): Uint8Array {
  return concatenate(new Uint8Array(id), encodeEbmlSize(data.length), data)
}

function encodeEbmlSize(size: number, minimumLength = 1): Uint8Array {
  const exactSize = BigInt(size)
  for (let length = minimumLength; length <= 8; length += 1) {
    const marker = 1n << BigInt(7 * length)
    const maximum = marker - 2n
    if (exactSize > maximum) continue
    let value = exactSize + marker
    const encoded = new Uint8Array(length)
    for (let index = length - 1; index >= 0; index -= 1) {
      encoded[index] = Number(value & 0xffn)
      value >>= 8n
    }
    return encoded
  }
  throw new Error('The WebM element is too large')
}

function concatenate(...parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((size, part) => size + part.length, 0))
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

function webmChildren(bytes: Uint8Array, start: number, end: number): EbmlElement[] {
  const children: EbmlElement[] = []
  let offset = start
  while (offset < end) {
    const element = readElement(bytes, offset, end)
    if (element === null || element.dataEnd <= offset) break
    children.push(element)
    offset = element.dataEnd
  }
  return children
}

function readElement(bytes: Uint8Array, offset: number, limit: number): EbmlElement | null {
  if (offset >= limit) return null
  const idLength = vintLength(bytes[offset] ?? 0)
  if (idLength === 0 || offset + idLength >= limit) return null
  let id = 0
  for (let index = 0; index < idLength; index += 1) {
    id = id * 256 + (bytes[offset + index] ?? 0)
  }

  const sizeOffset = offset + idLength
  const sizeLength = vintLength(bytes[sizeOffset] ?? 0)
  if (sizeLength === 0 || sizeOffset + sizeLength > limit) return null
  let size = (bytes[sizeOffset] ?? 0) & (0xff >>> sizeLength)
  let allValueBitsSet = size === (0xff >>> sizeLength)
  for (let index = 1; index < sizeLength; index += 1) {
    const byte = bytes[sizeOffset + index] ?? 0
    size = size * 256 + byte
    allValueBitsSet &&= byte === 0xff
  }

  const dataStart = sizeOffset + sizeLength
  const unknownSize = allValueBitsSet
  const dataEnd = unknownSize ? limit : Math.min(limit, dataStart + size)
  return {
    id,
    idStart: offset,
    sizeOffset,
    sizeLength,
    dataStart,
    dataEnd,
    size: unknownSize ? null : size,
  }
}

function vintLength(firstByte: number): number {
  for (let length = 1; length <= 8; length += 1) {
    if ((firstByte & (1 << (8 - length))) !== 0) return length
  }
  return 0
}

function ebmlUnsigned(bytes: Uint8Array, element: EbmlElement): number | null {
  const size = element.dataEnd - element.dataStart
  if (size < 1 || size > 4) return null
  let value = 0
  for (let offset = element.dataStart; offset < element.dataEnd; offset += 1) {
    value = value * 256 + (bytes[offset] ?? 0)
  }
  return value
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes)
}

function startsWith(bytes: Uint8Array, prefix: number[]): boolean {
  return prefix.every((byte, index) => bytes[index] === byte)
}
