import { create } from 'zustand'

/**
 * Voice notes being uploaded or retained for an in-session retry.
 *
 * A recording is a local file until its upload finishes, and the transcript has
 * to be able to draw it in the meantime — so the blob lives here, under the
 * placeholder id the message names, and the bubble reads it from here instead of
 * downloading it from a server that does not have it yet.
 *
 * One store rather than one per account, unlike everything else in `src/state/`:
 * an upload is a fact about this tab rather than about an account, it exists for
 * seconds, and the bubble that draws it would otherwise have to reach into a
 * per-account registry during render.
 */

export type PendingVoiceNote = {
  /** An object URL of the recording itself, playable before it is anywhere else. */
  url: string
  /** The original recording, kept for a retry while this page session is alive. */
  blob: Blob
  name: string
  /** Reuse the uploaded file if only sending its message envelope failed. */
  attachmentId: string | null
  /** 0..1, as the upload reports it. */
  progress: number
  /** A sentence once it has given up, `null` while it is still trying. */
  error: string | null
}

export type PendingVoiceState = {
  notes: Record<string, PendingVoiceNote>
  add: (id: string, url: string, blob: Blob, name: string) => PendingVoiceNote
  setProgress: (id: string, progress: number) => void
  setAttachmentId: (id: string, attachmentId: string) => void
  fail: (id: string, error: string) => void
  /** Clears the previous error and claims an eligible note for one retry. */
  beginRetry: (id: string) => PendingVoiceNote | null
  /** Forgets one; the caller owns its object URL and revokes it. */
  remove: (id: string) => void
  clear: () => void
}

export const usePendingVoiceStore = create<PendingVoiceState>((set, get) => ({
  notes: {},

  add: (id, url, blob, name) => {
    const note = { url, blob, name, attachmentId: null, progress: 0, error: null }
    set({ notes: { ...get().notes, [id]: note } })
    return note
  },

  setProgress: (id, progress) => {
    const note = get().notes[id]
    // A progress frame that arrives after the note was failed or finished must
    // not resurrect it: the upload reports from its own timeline.
    if (note === undefined || note.error !== null) {
      return
    }
    set({ notes: { ...get().notes, [id]: { ...note, progress } } })
  },

  setAttachmentId: (id, attachmentId) => {
    const note = get().notes[id]
    if (note === undefined) {
      return
    }
    set({ notes: { ...get().notes, [id]: { ...note, attachmentId } } })
  },

  fail: (id, error) => {
    const note = get().notes[id]
    if (note === undefined) {
      return
    }
    set({ notes: { ...get().notes, [id]: { ...note, error } } })
  },

  beginRetry: (id) => {
    const note = get().notes[id]
    if (note === undefined || note.error === null) {
      return null
    }
    const retrying = { ...note, progress: 0, error: null }
    set({ notes: { ...get().notes, [id]: retrying } })
    return retrying
  },

  remove: (id) => {
    const { [id]: removed, ...rest } = get().notes
    if (removed === undefined) {
      return
    }
    set({ notes: rest })
  },

  clear: () => {
    for (const note of Object.values(get().notes)) {
      URL.revokeObjectURL(note.url)
    }
    set({ notes: {} })
  },
}))
