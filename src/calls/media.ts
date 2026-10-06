/**
 * Microphone and camera access, and the camera switch behind it.
 *
 * Kept apart from the call state machine so the failure modes have one home:
 * every browser refusal — no permission, no device, no secure context, a device
 * already in use — arrives as a rejected promise from here, and the caller
 * decides what to say about it.
 */

/** Whether this browser exposes capture at all. Undefined outside a secure context. */
export function canCaptureMedia(): boolean {
  return typeof navigator !== 'undefined' && navigator.mediaDevices !== undefined
}

/**
 * Audio always; video only for a video call.
 *
 * The video constraints ask for a front camera at 720p but do not demand them:
 * `ideal` lets a phone with a single low-resolution camera still join, and
 * `facingMode: 'user'` is what makes a phone start with the selfie camera.
 */
export async function acquireLocalMedia(withVideo: boolean): Promise<MediaStream> {
  if (!canCaptureMedia()) {
    throw new Error('[calls] media capture is unavailable outside a secure context')
  }

  return navigator.mediaDevices.getUserMedia({
    audio: true,
    ...(withVideo
      ? { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } }
      : {}),
  })
}

/** Releases every track of a stream; a stopped track is what turns the LED off. */
export function stopStream(stream: MediaStream | null): void {
  if (stream === null) {
    return
  }
  for (const track of stream.getTracks()) {
    track.stop()
  }
}

export type CameraSwitch = {
  stream: MediaStream
  track: MediaStreamTrack
}

/**
 * The next camera in the device list, or `null` when there is only one.
 *
 * `null` rather than throwing: "this device has one camera" is an ordinary
 * answer, not an error — the caller turns it into a sentence, not a stack trace.
 * `currentDeviceId` names the camera in use so the switch cycles in the order
 * the browser lists them rather than always landing on the same one.
 */
export async function switchCameraStream(currentDeviceId: string | null): Promise<CameraSwitch | null> {
  if (!canCaptureMedia()) {
    return null
  }

  const devices = await navigator.mediaDevices.enumerateDevices()
  const cameras = devices.filter((device) => device.kind === 'videoinput')
  if (cameras.length <= 1) {
    return null
  }

  // An unknown or empty current id lands on the first camera, so the first tap
  // on a device that never reported its id still moves somewhere.
  const index = cameras.findIndex((camera) => camera.deviceId === currentDeviceId)
  const next = cameras[(index + 1 + cameras.length) % cameras.length]
  if (next === undefined) {
    return null
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { deviceId: { exact: next.deviceId } },
  })
  const track = stream.getVideoTracks()[0]
  if (track === undefined) {
    stopStream(stream)
    return null
  }
  return { stream, track }
}
