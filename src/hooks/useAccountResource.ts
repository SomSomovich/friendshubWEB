import { useCallback, useEffect, useState } from 'react'
import type { Account } from '../types'
import { describeCause } from '../utils/errors'

/** Remote panels never display another account's data while a new read is pending. */
export function useAccountResource<T>(account: Account, load: (account: Account) => Promise<T>) {
  const key = `${account.id}:${account.sessionToken}`
  const [result, setResult] = useState<{ key: string; data: T | null; error: string | null } | null>(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let cancelled = false
    void load(account).then((data) => {
      if (!cancelled) setResult({ key, data, error: null })
    }).catch((cause: unknown) => {
      if (!cancelled) setResult({ key, data: null, error: describeCause(cause) })
    })
    return () => { cancelled = true }
  }, [account, key, load, revision])
  const reload = useCallback(() => {
    setResult(null)
    setRevision((value) => value + 1)
  }, [])
  const replace = useCallback((data: T) => setResult({ key, data, error: null }), [key])
  return {
    data: result?.key === key ? result.data : null,
    error: result?.key === key ? result.error : null,
    reload,
    replace,
  }
}
