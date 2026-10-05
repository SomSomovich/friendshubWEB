import { useEffect, useState } from 'react'
import { loadAttachment } from '../attachments/load'
import type { AttachmentMime } from '../attachments/mime'
import { getExistingAccountStore } from '../state/accountRegistry'
import { getAttachment } from '../storage/attachments'

/**
 * One attachment's bytes, fetched the first time something draws it.
 *
 * Nothing is downloaded until a component asks for it, so opening a conversation
 * full of photos costs nothing until they are actually on screen.
 */

export type AttachmentState =
  | { status: 'loading' }
  | { status: 'ready'; url: string; mime: AttachmentMime; size: number; fileName: string | null }
  | { status: 'error'; message: string }

export function useAttachment(
  accountId: string,
  attachmentId: string | null,
): AttachmentState {
  const [state, setState] = useState<AttachmentState>({ status: 'loading' })

  useEffect(() => {
    if (attachmentId === null) {
      return
    }

    let cancelled = false

    void (async () => {
      // Read from the registry rather than closing over the account object: it
      // changes identity on every account edit, and depending on it would
      // re-download the file for an unrelated avatar upload.
      const account = getExistingAccountStore(accountId)?.getState().account
      if (account === undefined) {
        return
      }

      const record = await getAttachment(accountId, attachmentId)
      if (record === null || record.keyHex === null) {
        // No record means the key envelope has not arrived, or the message names
        // something this device was never sent; either way there is nothing to
        // draw yet.
        if (!cancelled) {
          setState({ status: 'error', message: record === null ? 'unknown' : 'no-key' })
        }
        return
      }

      const loaded = await loadAttachment(account, record)
      if (!cancelled) {
        setState({
          status: 'ready',
          url: loaded.url,
          mime: loaded.mime,
          size: record.totalSize,
          fileName: record.fileName ?? null,
        })
      }
    })().catch((error: unknown) => {
      console.error('[attachments] could not load one', error)
      if (!cancelled) {
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        })
      }
    })

    return () => {
      cancelled = true
    }
  }, [accountId, attachmentId])

  // Derived rather than written into state by the effect: "there is no
  // attachment to load" is a fact about this render, not an event.
  if (attachmentId === null) {
    return { status: 'error', message: 'no-attachment' }
  }
  return state
}
