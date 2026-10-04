import { useEffect, useState } from 'react'

/**
 * Whether the browser thinks it has a network.
 *
 * A coarse signal — it stays true behind a captive portal that accepts nothing —
 * so nothing treats it as a guarantee. What a send does with it is queue and
 * retry, which is the right answer whether the guess was right or wrong.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const goOnline = (): void => {
      setOnline(true)
    }
    const goOffline = (): void => {
      setOnline(false)
    }

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return online
}
