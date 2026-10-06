/**
 * Best-effort output routing for the speaker toggle.
 *
 * The web has no notion of an earpiece: on a phone the operating system picks
 * the route and JavaScript cannot move it at all (iOS Safari in particular
 * exposes nothing). Where the platform does expose `HTMLMediaElement.setSinkId`
 * — Chromium on the desktop — the toggle really does select a different output
 * device, preferring the labelled "communications" sink when the toggle is off.
 *
 * Where it does not, the call screen still shows the toggle and its state; the
 * README documents that the switch is then a preference the platform ignores.
 */

type SinkCapable = HTMLMediaElement & { setSinkId?: (sinkId: string) => Promise<void> }

export async function applySpeakerOutput(
  element: HTMLMediaElement | null,
  speakerOn: boolean,
): Promise<void> {
  if (element === null) {
    return
  }
  const capable = element as SinkCapable
  if (typeof capable.setSinkId !== 'function') {
    return
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const outputs = devices.filter((device) => device.kind === 'audiooutput')
    // No labelled outputs means the browser does not offer a choice here.
    if (outputs.length === 0) {
      return
    }

    const target = speakerOn
      ? (outputs.find((device) => device.deviceId === 'default') ?? outputs[0])
      : (outputs.find((device) => device.deviceId === 'communications') ??
        outputs.find((device) => device.deviceId !== 'default') ??
        outputs[0])

    // An empty device id means "the system default", which is what `setSinkId`
    // is already on; calling it would be a no-op with a promise to await.
    if (target === undefined || target.deviceId === '') {
      return
    }
    await capable.setSinkId(target.deviceId)
  } catch (error) {
    // The platform refused the switch. The toggle stays as the user set it.
    console.warn('[calls] the output device could not be selected', error)
  }
}
