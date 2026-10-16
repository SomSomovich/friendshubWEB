/** A brief whole-app shake and a best-effort mobile vibration. */
let animationTimer: ReturnType<typeof setTimeout> | null = null

export function triggerNudgeEffect(): void {
  const root = document.getElementById('root')
  if (root !== null) {
    if (animationTimer !== null) {
      clearTimeout(animationTimer)
    }
    root.classList.remove('fh-nudge-shake')
    // Restart the short keyframe when two nudges arrive close together.
    void root.offsetWidth
    root.classList.add('fh-nudge-shake')
    animationTimer = setTimeout(() => {
      root.classList.remove('fh-nudge-shake')
      animationTimer = null
    }, 500)
  }

  try {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate([70, 35, 70])
    }
  } catch (error) {
    // Vibration is optional and some browsers reject it outside an active tab.
    console.debug('[nudge] vibration is unavailable', error)
  }
}
