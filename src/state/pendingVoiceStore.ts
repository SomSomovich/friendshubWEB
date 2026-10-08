import { create } from 'zustand'

/**
 * Voice notes that are still on their way to the server.
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
  /** 0..1, as the upload reports it. */
  progress: number
  /** A sentence once it has given up, `null` while it is still trying. */
  error: string | null
}

export type PendingVoiceState = {
  notes: Record<string, PendingVoiceNote>
  add: (id: string, url: string) => void
  setProgress: (id: string, progress: number) => void
  fail: (id: string, error: string) => void
  /** Forgets one; the caller owns its object URL and revokes it. */
  remove: (id: string) => void
  clear: () => void
}

export const usePendingVoiceStore = create<PendingVoiceState>((set, get) => ({
  notes: {},

  add: (id, url) => {
    set({ notes: { ...get().notes, [id]: { url, progress: 0, error: null } } })
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

  fail: (id, error) => {
    const note = get().notes[id]
    if (note === undefined) {
      return
    }
    set({ notes: { ...get().notes, [id]: { ...note, error } } })
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
